import { NextResponse } from "next/server";
import { z } from "zod";
import { getUserOrNull } from "@/lib/session";
import { db } from "@/db";
import { questionAttempts, questions } from "@/db/schema";
import { eq } from "drizzle-orm";
import { generateId } from "@/lib/utils";

const schema = z.object({
  questionId: z.string(),
  answer: z.enum(["A", "B", "C", "D"]).nullable(),
  timeTakenSeconds: z.number().int().nonnegative().optional(),
});

export async function POST(req: Request) {
  const user = await getUserOrNull();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }
  const { questionId, answer, timeTakenSeconds } = parsed.data;

  const [q] = await db
    .select({ correct: questions.correctAnswer })
    .from(questions)
    .where(eq(questions.id, questionId))
    .limit(1);
  if (!q) {
    return NextResponse.json({ error: "Question not found" }, { status: 404 });
  }

  const isCorrect = answer !== null && answer === q.correct;

  await db.insert(questionAttempts).values({
    id: generateId(),
    userId: user.id,
    questionId,
    sessionId: null,
    userAnswer: answer,
    isCorrect,
    timeTakenSeconds: timeTakenSeconds ?? null,
  });

  return NextResponse.json({ isCorrect, correctAnswer: q.correct });
}
