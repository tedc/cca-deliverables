import { requireUser } from "@/lib/session";
import { SiteHeader } from "@/components/site-header";
import { db } from "@/db";
import { examSessions } from "@/db/schema";
import { and, desc, eq, inArray } from "drizzle-orm";
import { getQuestionsByIds, toExamQuestion } from "@/lib/questions";
import { EXAM_TIME_SECONDS } from "@/lib/domains";
import { ExamClient, type ResumableExam } from "./exam-client";

export const dynamic = "force-dynamic";

export default async function ExamPage() {
  const user = await requireUser();

  const [active] = await db
    .select()
    .from(examSessions)
    .where(
      and(
        eq(examSessions.userId, user.id),
        eq(examSessions.mode, "exam"),
        inArray(examSessions.status, ["in_progress", "suspended"])
      )
    )
    .orderBy(desc(examSessions.startedAt))
    .limit(1);

  let resumable: ResumableExam | null = null;
  if (active) {
    const ordered = await getQuestionsByIds(active.questionIds);
    resumable = {
      sessionId: active.id,
      status: active.status as "in_progress" | "suspended",
      questions: ordered.map(toExamQuestion),
      currentIndex: active.currentIndex,
      answers: active.answers,
      markedForReview: active.markedForReview,
      elapsedSeconds: active.elapsedSeconds,
      timeLimitSeconds: active.timeLimitSeconds ?? EXAM_TIME_SECONDS,
    };
  }

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-6">
        <ExamClient resumable={resumable} />
      </main>
    </>
  );
}
