import Link from "next/link";
import { requireUser } from "@/lib/session";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { db } from "@/db";
import { examHistory, questionAttempts, questions } from "@/db/schema";
import { and, count, desc, eq, sql } from "drizzle-orm";
import { PASSING_SCORE } from "@/lib/domains";
import { TrendingDown, TrendingUp } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function HistoryPage() {
  const user = await requireUser();

  const exams = await db
    .select()
    .from(examHistory)
    .where(eq(examHistory.userId, user.id))
    .orderBy(desc(examHistory.completedAt));

  const avgScore =
    exams.length > 0
      ? Math.round(exams.reduce((s, e) => s + e.score, 0) / exams.length)
      : 0;
  const lastScore = exams[0]?.score ?? 0;
  const trend = exams.length > 0 ? lastScore - avgScore : 0;

  const mostMissed = await db
    .select({
      id: questions.id,
      text: questions.questionText,
      domain: questions.domain,
      wrong: count(),
    })
    .from(questionAttempts)
    .innerJoin(questions, eq(questionAttempts.questionId, questions.id))
    .where(
      and(
        eq(questionAttempts.userId, user.id),
        eq(questionAttempts.isCorrect, false)
      )
    )
    .groupBy(questions.id, questions.questionText, questions.domain)
    .orderBy(desc(count()))
    .limit(5);

  const domainStats = await db
    .select({
      domain: questions.domain,
      total: sql<number>`count(*)::int`,
      wrong: sql<number>`sum(case when ${questionAttempts.isCorrect} = false then 1 else 0 end)::int`,
    })
    .from(questionAttempts)
    .innerJoin(questions, eq(questionAttempts.questionId, questions.id))
    .where(eq(questionAttempts.userId, user.id))
    .groupBy(questions.domain);

  const worstDomains = domainStats
    .map((d) => ({
      domain: d.domain,
      total: d.total,
      wrong: d.wrong,
      rate: d.total > 0 ? d.wrong / d.total : 0,
    }))
    .filter((d) => d.wrong > 0)
    .sort((a, b) => b.rate - a.rate);

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-4xl px-4 py-8">
        <h1 className="text-2xl font-semibold">Storico esami</h1>

        {/* Aggregate stats */}
        {exams.length > 0 && (
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <Card>
              <CardContent className="p-5">
                <p className="text-xs uppercase tracking-wide text-[var(--color-muted-foreground)]">
                  Score medio
                </p>
                <p className="mt-1 text-2xl font-semibold">{avgScore}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5">
                <p className="text-xs uppercase tracking-wide text-[var(--color-muted-foreground)]">
                  Trend (ultimo vs media)
                </p>
                <p
                  className={
                    "mt-1 flex items-center gap-1.5 text-2xl font-semibold " +
                    (trend >= 0
                      ? "text-[var(--color-success)]"
                      : "text-[var(--color-danger)]")
                  }
                >
                  {trend >= 0 ? (
                    <TrendingUp className="h-5 w-5" />
                  ) : (
                    <TrendingDown className="h-5 w-5" />
                  )}
                  {trend >= 0 ? "+" : ""}
                  {trend}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5">
                <p className="text-xs uppercase tracking-wide text-[var(--color-muted-foreground)]">
                  Esami completati
                </p>
                <p className="mt-1 text-2xl font-semibold">{exams.length}</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Weak spots */}
        {(worstDomains.length > 0 || mostMissed.length > 0) && (
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {worstDomains.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    Domini in cui sbagli di più
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2.5">
                  {worstDomains.map((d) => (
                    <div key={d.domain}>
                      <div className="flex justify-between text-sm">
                        <span>{d.domain}</span>
                        <span className="text-[var(--color-muted-foreground)]">
                          {d.wrong}/{d.total} ({Math.round(d.rate * 100)}%)
                        </span>
                      </div>
                      <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-[var(--color-muted)]">
                        <div
                          className="h-full bg-[var(--color-primary)]"
                          style={{ width: `${Math.round(d.rate * 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
            {mostMissed.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    Domande sbagliate più spesso
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2.5">
                  {mostMissed.map((q) => (
                    <div key={q.id} className="text-sm">
                      <span className="font-medium text-[var(--color-danger)]">
                        ×{q.wrong}
                      </span>{" "}
                      <span className="text-[var(--color-muted-foreground)]">
                        [{q.domain}]
                      </span>{" "}
                      {q.text.length > 90
                        ? q.text.slice(0, 90) + "…"
                        : q.text}
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Exam list */}
        <h2 className="mt-8 text-lg font-semibold">Esami</h2>
        {exams.length === 0 ? (
          <Card className="mt-3">
            <CardContent className="p-8 text-center text-[var(--color-muted-foreground)]">
              Nessun esame completato. Inizia il tuo primo esame!
              <div className="mt-4">
                <Button asChild>
                  <Link href="/exam">Inizia esame</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="mt-3 space-y-3">
            {exams.map((e) => (
              <Card key={e.id}>
                <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
                  <div>
                    <p className="font-medium">
                      {new Date(e.completedAt).toLocaleString("it-IT", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </p>
                    <p className="text-sm text-[var(--color-muted-foreground)]">
                      {e.correctAnswers}/{e.totalQuestions} corrette ·{" "}
                      {Math.round(e.durationSeconds / 60)} min
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p
                        className={
                          "text-xl font-semibold " +
                          (e.score >= PASSING_SCORE
                            ? "text-[var(--color-success)]"
                            : "text-[var(--color-danger)]")
                        }
                      >
                        {e.score}
                      </p>
                      <p className="text-xs text-[var(--color-muted-foreground)]">
                        {e.score >= PASSING_SCORE ? "Superato" : "Non superato"}
                      </p>
                    </div>
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/history/${e.id}`}>Rivedi</Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
