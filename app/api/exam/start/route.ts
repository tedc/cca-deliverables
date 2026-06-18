import { NextResponse } from "next/server";
import { getUserOrNull } from "@/lib/session";
import { db } from "@/db";
import { examSessions } from "@/db/schema";
import { and, eq, inArray } from "drizzle-orm";
import {
  pickExamQuestions,
  getQuestionsByIds,
  toExamQuestion,
} from "@/lib/questions";
import { EXAM_TIME_SECONDS } from "@/lib/domains";
import { generateId } from "@/lib/utils";

export async function POST() {
  const user = await getUserOrNull();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Expire any lingering open exam sessions for this user.
  await db
    .update(examSessions)
    .set({ status: "expired" })
    .where(
      and(
        eq(examSessions.userId, user.id),
        eq(examSessions.mode, "exam"),
        inArray(examSessions.status, ["in_progress", "suspended"])
      )
    );

  const picked = await pickExamQuestions(user.id);
  const ids = picked.map((q) => q.id);
  const id = generateId();

  await db.insert(examSessions).values({
    id,
    userId: user.id,
    mode: "exam",
    status: "in_progress",
    questionIds: ids,
    currentIndex: 0,
    answers: {},
    markedForReview: [],
    elapsedSeconds: 0,
    timeLimitSeconds: EXAM_TIME_SECONDS,
  });

  const ordered = await getQuestionsByIds(ids);

  return NextResponse.json({
    sessionId: id,
    questions: ordered.map(toExamQuestion),
    currentIndex: 0,
    answers: {},
    markedForReview: [],
    elapsedSeconds: 0,
    timeLimitSeconds: EXAM_TIME_SECONDS,
  });
}
