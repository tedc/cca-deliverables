import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/session";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { db } from "@/db";
import { examHistory, examSessions } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { getQuestionsByIds } from "@/lib/questions";
import { DOMAINS, PASSING_SCORE } from "@/lib/domains";
import type { Question, ScoreBreakdown } from "@/db/schema";
import { cn } from "@/lib/utils";
import { ArrowLeft, CheckCircle2, XCircle } from "lucide-react";

export const dynamic = "force-dynamic";

const LETTERS = ["A", "B", "C", "D"] as const;

export default async function HistoryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;

  const [exam] = await db
    .select()
    .from(examHistory)
    .where(and(eq(examHistory.id, id), eq(examHistory.userId, user.id)))
    .limit(1);

  if (!exam) notFound();

  const [sess] = exam.sessionId
    ? await db
        .select()
        .from(examSessions)
        .where(eq(examSessions.id, exam.sessionId))
        .limit(1)
    : [undefined];

  const questionIds = sess?.questionIds ?? [];
  const answers = sess?.answers ?? {};
  const questions = await getQuestionsByIds(questionIds);
  const breakdown = exam.scoreBreakdown as ScoreBreakdown;

  const wrong = questions.filter((q) => answers[q.id] !== q.correctAnswer);
  const passed = exam.score >= PASSING_SCORE;

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-8">
        <Link
          href="/history"
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]"
        >
          <ArrowLeft className="h-4 w-4" />
          Storico
        </Link>

        {/* Score header */}
        <Card>
          <CardContent className="flex flex-wrap items-center justify-between gap-4 p-6">
            <div>
              <p className="text-sm text-[var(--color-muted-foreground)]">
                {new Date(exam.completedAt).toLocaleString("it-IT", {
                  dateStyle: "long",
                  timeStyle: "short",
                })}
              </p>
              <p className="mt-1 text-4xl font-bold">
                {exam.score}
                <span className="text-lg font-normal text-[var(--color-muted-foreground)]">
                  /1000
                </span>
              </p>
              <p
                className={cn(
                  "text-sm font-semibold",
                  passed
                    ? "text-[var(--color-success)]"
                    : "text-[var(--color-danger)]"
                )}
              >
                {passed ? "Superato" : "Non superato"} · soglia {PASSING_SCORE}
              </p>
            </div>
            <div className="text-right text-sm text-[var(--color-muted-foreground)]">
              <p>
                {exam.correctAnswers}/{exam.totalQuestions} corrette
              </p>
              <p>{Math.round(exam.durationSeconds / 60)} min impiegati</p>
            </div>
          </CardContent>
        </Card>

        {/* Breakdown per domain */}
        <h2 className="mt-8 text-lg font-semibold">Punteggio per dominio</h2>
        <div className="mt-3 space-y-2.5">
          {DOMAINS.filter((d) => breakdown[d]?.total).map((d) => {
            const b = breakdown[d];
            const pct = b.total > 0 ? Math.round((b.correct / b.total) * 100) : 0;
            return (
              <div key={d}>
                <div className="flex justify-between text-sm">
                  <span>{d}</span>
                  <span className="text-[var(--color-muted-foreground)]">
                    {b.correct}/{b.total} ({pct}%)
                  </span>
                </div>
                <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-[var(--color-muted)]">
                  <div
                    className={cn(
                      "h-full",
                      pct >= 70
                        ? "bg-[var(--color-success)]"
                        : "bg-[var(--color-primary)]"
                    )}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Wrong questions */}
        <h2 className="mt-8 text-lg font-semibold">
          Domande sbagliate ({wrong.length})
        </h2>
        {wrong.length === 0 ? (
          <p className="mt-2 text-sm text-[var(--color-success)]">
            Nessun errore. Perfetto!
          </p>
        ) : (
          <div className="mt-3 space-y-4">
            {wrong.map((q) => (
              <ReviewQuestion
                key={q.id}
                question={q}
                userAnswer={answers[q.id] ?? null}
              />
            ))}
          </div>
        )}

        {/* All questions (collapsible) */}
        {questions.length > 0 && (
          <details className="mt-8">
            <summary className="cursor-pointer text-lg font-semibold">
              Tutte le domande ({questions.length})
            </summary>
            <div className="mt-3 space-y-4">
              {questions.map((q) => (
                <ReviewQuestion
                  key={q.id}
                  question={q}
                  userAnswer={answers[q.id] ?? null}
                />
              ))}
            </div>
          </details>
        )}

        <div className="mt-8 flex gap-3">
          <Button asChild>
            <Link href="/exam">Nuovo esame</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/history">Torna allo storico</Link>
          </Button>
        </div>
      </main>
    </>
  );
}

function ReviewQuestion({
  question,
  userAnswer,
}: {
  question: Question;
  userAnswer: string | null;
}) {
  const correct = userAnswer === question.correctAnswer;
  return (
    <Card>
      <CardContent className="space-y-3 p-5">
        <div className="flex items-start justify-between gap-3">
          <p className="font-medium leading-relaxed">{question.questionText}</p>
          {correct ? (
            <CheckCircle2 className="h-5 w-5 shrink-0 text-[var(--color-success)]" />
          ) : (
            <XCircle className="h-5 w-5 shrink-0 text-[var(--color-danger)]" />
          )}
        </div>
        <div className="space-y-1.5">
          {LETTERS.map((letter) => {
            const isCorrect = letter === question.correctAnswer;
            const isUser = letter === userAnswer;
            return (
              <div
                key={letter}
                className={cn(
                  "flex gap-2 rounded-md border p-2.5 text-sm",
                  isCorrect &&
                    "border-[var(--color-success)] bg-[var(--color-success-bg)]",
                  isUser &&
                    !isCorrect &&
                    "border-[var(--color-danger)] bg-[var(--color-danger-bg)]"
                )}
              >
                <span className="font-semibold">{letter}.</span>
                <span className="flex-1">{question.options[letter]}</span>
                {isUser && (
                  <span className="shrink-0 text-xs text-[var(--color-muted-foreground)]">
                    {isCorrect ? "tua risposta ✓" : "tua risposta"}
                  </span>
                )}
                {isCorrect && !isUser && (
                  <span className="shrink-0 text-xs text-[var(--color-success)]">
                    corretta
                  </span>
                )}
              </div>
            );
          })}
        </div>
        <div className="rounded-md bg-[var(--color-muted)]/40 p-3 text-sm">
          <span className="font-semibold">Spiegazione: </span>
          {question.explanation}
        </div>
      </CardContent>
    </Card>
  );
}
