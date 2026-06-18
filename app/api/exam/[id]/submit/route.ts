import { NextResponse } from "next/server";
import { z } from "zod";
import { getUserOrNull } from "@/lib/session";
import { db } from "@/db";
import { examSessions, examHistory, questionAttempts } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { getQuestionsByIds } from "@/lib/questions";
import { gradeExam } from "@/lib/scoring";
import { generateId } from "@/lib/utils";

const schema = z.object({
  answers: z.record(z.enum(["A", "B", "C", "D"])).optional(),
  elapsedSeconds: z.number().int().nonnegative().optional(),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUserOrNull();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const [sess] = await db
    .select()
    .from(examSessions)
    .where(and(eq(examSessions.id, id), eq(examSessions.userId, user.id)))
    .limit(1);

  if (!sess) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // If already submitted, return its existing history record (idempotent-ish).
  if (sess.status === "completed") {
    const [h] = await db
      .select({ id: examHistory.id })
      .from(examHistory)
      .where(eq(examHistory.sessionId, id))
      .limit(1);
    if (h) return NextResponse.json({ historyId: h.id });
  }

  // Merge persisted answers with the final payload (payload wins).
  const answers = { ...sess.answers, ...(parsed.data.answers ?? {}) };
  const elapsed = parsed.data.elapsedSeconds ?? sess.elapsedSeconds;

  const questions = await getQuestionsByIds(sess.questionIds);
  const result = gradeExam(questions, answers);

  const historyId = generateId();

  // Persist attempts for analytics / recency.
  const attemptRows = questions.map((q) => ({
    id: generateId(),
    userId: user.id,
    questionId: q.id,
    sessionId: sess.id,
    userAnswer: answers[q.id] ?? null,
    isCorrect: answers[q.id] === q.correctAnswer,
    timeTakenSeconds: null,
  }));

  await db.transaction(async (tx) => {
    await tx
      .update(examSessions)
      .set({
        status: "completed",
        completedAt: new Date(),
        answers,
        elapsedSeconds: elapsed,
      })
      .where(eq(examSessions.id, id));

    if (attemptRows.length > 0) {
      await tx.insert(questionAttempts).values(attemptRows);
    }

    await tx.insert(examHistory).values({
      id: historyId,
      userId: user.id,
      sessionId: sess.id,
      mode: "exam",
      totalQuestions: result.total,
      correctAnswers: result.correctCount,
      score: result.score,
      scoreBreakdown: result.breakdown,
      durationSeconds: elapsed,
    });
  });

  return NextResponse.json({ historyId, score: result.score });
}
