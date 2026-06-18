import Link from "next/link";
import { requireUser } from "@/lib/session";
import { SiteHeader } from "@/components/site-header";
import { Card, CardContent } from "@/components/ui/card";
import { db } from "@/db";
import { questions, questionAttempts, examHistory } from "@/db/schema";
import { countDistinct, desc, eq, sql } from "drizzle-orm";
import { PASSING_SCORE } from "@/lib/domains";
import {
  BookOpen,
  FileText,
  Flame,
  GraduationCap,
  Target,
} from "lucide-react";

export const dynamic = "force-dynamic";

const MODES = [
  {
    href: "/drill",
    title: "Drill",
    desc: "Allenamento libero con feedback immediato",
    icon: Target,
  },
  {
    href: "/exam",
    title: "Esame (60 random)",
    desc: "Simulazione completa, 120 minuti",
    icon: GraduationCap,
  },
  {
    href: "/bruciapelo",
    title: "Bruciapelo",
    desc: "Una domanda, 60 secondi",
    icon: Flame,
  },
  {
    href: "/docs",
    title: "Documentazione",
    desc: "Materiale di studio e pattern",
    icon: BookOpen,
  },
];

export default async function HomePage() {
  const user = await requireUser();

  const [{ total }] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(questions);

  const [{ seen }] = await db
    .select({ seen: countDistinct(questionAttempts.questionId) })
    .from(questionAttempts)
    .where(eq(questionAttempts.userId, user.id));

  const [lastExam] = await db
    .select()
    .from(examHistory)
    .where(eq(examHistory.userId, user.id))
    .orderBy(desc(examHistory.completedAt))
    .limit(1);

  const neverSeen = Math.max(0, total - (seen ?? 0));

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-4 py-8">
        <h1 className="text-3xl font-semibold tracking-tight">
          Ciao {user.name || "Edo"} 👋
        </h1>
        <p className="mt-1 text-[var(--color-muted-foreground)]">
          Pronto per ripassare per la CCA-F?
        </p>

        {/* Status row */}
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <Card>
            <CardContent className="p-5">
              <p className="text-xs uppercase tracking-wide text-[var(--color-muted-foreground)]">
                Ultimo esame
              </p>
              {lastExam ? (
                <>
                  <p className="mt-1 text-2xl font-semibold">
                    {lastExam.score}
                    <span className="text-sm font-normal text-[var(--color-muted-foreground)]">
                      /1000
                    </span>
                  </p>
                  <p
                    className={
                      lastExam.score >= PASSING_SCORE
                        ? "text-sm font-medium text-[var(--color-success)]"
                        : "text-sm font-medium text-[var(--color-danger)]"
                    }
                  >
                    {lastExam.score >= PASSING_SCORE ? "Superato" : "Sotto soglia"}{" "}
                    · {new Date(lastExam.completedAt).toLocaleDateString("it-IT")}
                  </p>
                </>
              ) : (
                <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
                  Nessun esame ancora
                </p>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <p className="text-xs uppercase tracking-wide text-[var(--color-muted-foreground)]">
                Domande nel pool
              </p>
              <p className="mt-1 text-2xl font-semibold">{total}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <p className="text-xs uppercase tracking-wide text-[var(--color-muted-foreground)]">
                Mai viste
              </p>
              <p className="mt-1 text-2xl font-semibold">{neverSeen}</p>
            </CardContent>
          </Card>
        </div>

        {/* Mode buttons */}
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {MODES.map((m) => {
            const Icon = m.icon;
            return (
              <Link key={m.href} href={m.href} className="group">
                <Card className="h-full transition-colors group-hover:border-[var(--color-primary)]">
                  <CardContent className="flex items-center gap-4 p-6">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[var(--color-accent)] text-[var(--color-primary)]">
                      <Icon className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="text-lg font-semibold">{m.title}</p>
                      <p className="text-sm text-[var(--color-muted-foreground)]">
                        {m.desc}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>

        <div className="mt-8 text-center">
          <Link
            href="/history"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--color-primary)] hover:underline"
          >
            <FileText className="h-4 w-4" />
            Storico esami
          </Link>
        </div>
      </main>
    </>
  );
}
