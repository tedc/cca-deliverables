"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { ExamQuestion } from "@/lib/questions";
import { EXAM_QUESTION_COUNT } from "@/lib/domains";
import { cn } from "@/lib/utils";
import { Flag } from "lucide-react";

export interface ResumableExam {
  sessionId: string;
  status: "in_progress" | "suspended";
  questions: ExamQuestion[];
  currentIndex: number;
  answers: Record<string, string>;
  markedForReview: string[];
  elapsedSeconds: number;
  timeLimitSeconds: number;
}

type RunPayload = Omit<ResumableExam, "status">;

export function ExamClient({ resumable }: { resumable: ResumableExam | null }) {
  const [run, setRun] = useState<RunPayload | null>(null);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPrompt, setShowPrompt] = useState(Boolean(resumable));

  async function startNew() {
    setStarting(true);
    setError(null);
    try {
      const res = await fetch("/api/exam/start", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Errore nell'avvio dell'esame.");
        return;
      }
      setShowPrompt(false);
      setRun(data as RunPayload);
    } catch {
      setError("Errore di rete.");
    } finally {
      setStarting(false);
    }
  }

  async function resume() {
    if (!resumable) return;
    if (resumable.status === "suspended") {
      await fetch(`/api/exam/${resumable.sessionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ suspend: false }),
      }).catch(() => {});
    }
    setShowPrompt(false);
    const { status: _status, ...rest } = resumable;
    void _status;
    setRun(rest);
  }

  if (run) {
    return <ExamRunner key={run.sessionId} payload={run} />;
  }

  if (showPrompt && resumable) {
    const mins = Math.floor(resumable.elapsedSeconds / 60);
    const answered = Object.keys(resumable.answers).length;
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold">Esame</h1>
        <Card>
          <CardContent className="space-y-4 p-6">
            <h2 className="text-lg font-semibold">Hai un esame in sospeso</h2>
            <p className="text-sm text-[var(--color-muted-foreground)]">
              {mins} min trascorsi, {answered} risposte date. Vuoi continuarlo o
              iniziarne uno nuovo?
            </p>
            {error && (
              <p className="text-sm text-[var(--color-danger)]">{error}</p>
            )}
            <div className="flex flex-wrap gap-3">
              <Button onClick={resume}>Continua esame</Button>
              <Button
                variant="outline"
                onClick={startNew}
                disabled={starting}
              >
                {starting ? "Avvio…" : "Inizia nuovo"}
              </Button>
              <Button variant="ghost" asChild>
                <Link href="/">Torna alla home</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Esame</h1>
        <p className="text-sm text-[var(--color-muted-foreground)]">
          {EXAM_QUESTION_COUNT} domande, 120 minuti, distribuzione bilanciata per
          dominio. Puoi sospendere e riprendere.
        </p>
      </div>
      {error && <p className="text-sm text-[var(--color-danger)]">{error}</p>}
      <div className="flex gap-3">
        <Button size="lg" onClick={startNew} disabled={starting}>
          {starting ? "Avvio…" : "Inizia esame"}
        </Button>
        <Button size="lg" variant="outline" asChild>
          <Link href="/">Annulla</Link>
        </Button>
      </div>
    </div>
  );
}

const LETTERS = ["A", "B", "C", "D"] as const;

function formatTime(total: number): string {
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function ExamRunner({ payload }: { payload: RunPayload }) {
  const router = useRouter();
  const { sessionId, questions, timeLimitSeconds } = payload;

  const [index, setIndex] = useState(payload.currentIndex);
  const [answers, setAnswers] = useState<Record<string, string>>(
    payload.answers ?? {}
  );
  const [marked, setMarked] = useState<string[]>(payload.markedForReview ?? []);
  const [elapsed, setElapsed] = useState(payload.elapsedSeconds ?? 0);
  const [submitting, setSubmitting] = useState(false);
  const [showGrid, setShowGrid] = useState(false);

  // Keep latest values for the save/submit closures.
  const stateRef = useRef({ index, answers, marked, elapsed });
  stateRef.current = { index, answers, marked, elapsed };
  const submittedRef = useRef(false);

  const remaining = Math.max(0, timeLimitSeconds - elapsed);

  const save = useCallback(
    async (extra?: { suspend?: boolean }) => {
      const s = stateRef.current;
      await fetch(`/api/exam/${sessionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentIndex: s.index,
          answers: s.answers,
          markedForReview: s.marked,
          elapsedSeconds: s.elapsed,
          ...extra,
        }),
      }).catch(() => {});
    },
    [sessionId]
  );

  const submit = useCallback(async () => {
    if (submittedRef.current) return;
    submittedRef.current = true;
    setSubmitting(true);
    const s = stateRef.current;
    try {
      const res = await fetch(`/api/exam/${sessionId}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers: s.answers, elapsedSeconds: s.elapsed }),
      });
      const data = await res.json();
      if (res.ok && data.historyId) {
        router.push(`/history/${data.historyId}`);
        return;
      }
      submittedRef.current = false;
      setSubmitting(false);
    } catch {
      submittedRef.current = false;
      setSubmitting(false);
    }
  }, [router, sessionId]);

  // Tick every second.
  useEffect(() => {
    const t = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(t);
  }, []);

  // Auto-submit when time runs out.
  useEffect(() => {
    if (remaining <= 0 && !submittedRef.current) {
      submit();
    }
  }, [remaining, submit]);

  // Periodic autosave.
  useEffect(() => {
    const t = setInterval(() => {
      if (!submittedRef.current) save();
    }, 10000);
    return () => clearInterval(t);
  }, [save]);

  // Save on tab close / navigation away.
  useEffect(() => {
    const handler = () => {
      const s = stateRef.current;
      const body = JSON.stringify({
        currentIndex: s.index,
        answers: s.answers,
        markedForReview: s.marked,
        elapsedSeconds: s.elapsed,
      });
      navigator.sendBeacon?.(
        `/api/exam/${sessionId}`,
        new Blob([body], { type: "application/json" })
      );
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [sessionId]);

  const current = questions[index];
  const answeredCount = Object.keys(answers).length;

  function selectAnswer(letter: string) {
    setAnswers((a) => ({ ...a, [current.id]: letter }));
  }
  function toggleMark() {
    setMarked((m) =>
      m.includes(current.id)
        ? m.filter((x) => x !== current.id)
        : [...m, current.id]
    );
  }
  function go(to: number) {
    setIndex(Math.max(0, Math.min(questions.length - 1, to)));
  }

  async function handleSuspend() {
    await save({ suspend: true });
    router.push("/");
  }

  async function handleSubmit() {
    if (
      !window.confirm(
        `Confermi l'invio? Hai risposto a ${answeredCount}/${questions.length} domande.`
      )
    )
      return;
    await submit();
  }

  return (
    <div className="space-y-4">
      {/* Top bar: timer + progress */}
      <div className="sticky top-[57px] z-20 -mx-4 flex items-center justify-between gap-3 border-b bg-[var(--color-background)]/95 px-4 py-2 backdrop-blur">
        <div className="text-sm text-[var(--color-muted-foreground)]">
          Domanda {index + 1}/{questions.length} · {answeredCount} risposte
        </div>
        <div
          className={cn(
            "rounded-full px-3 py-1 font-mono text-sm font-semibold tabular-nums",
            remaining <= 300
              ? "bg-[var(--color-danger-bg)] text-[var(--color-danger)]"
              : "bg-[var(--color-accent)]"
          )}
        >
          {formatTime(remaining)}
        </div>
      </div>

      {/* Question */}
      <Card>
        <CardContent className="space-y-5 p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="rounded-full bg-[var(--color-accent)] px-2.5 py-1 font-medium">
                {current.domain}
              </span>
              <span className="rounded-full bg-[var(--color-muted)] px-2.5 py-1 text-[var(--color-muted-foreground)]">
                {current.scenario}
              </span>
            </div>
            <button
              onClick={toggleMark}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium",
                marked.includes(current.id)
                  ? "bg-[var(--color-primary)] text-[var(--color-primary-foreground)]"
                  : "border text-[var(--color-muted-foreground)] hover:bg-[var(--color-accent)]"
              )}
            >
              <Flag className="h-3.5 w-3.5" />
              {marked.includes(current.id) ? "Marcata" : "Marca per review"}
            </button>
          </div>

          <p className="text-base font-medium leading-relaxed sm:text-lg">
            {current.questionText}
          </p>

          <div className="flex flex-col gap-2.5">
            {LETTERS.map((letter) => {
              const selected = answers[current.id] === letter;
              return (
                <button
                  key={letter}
                  onClick={() => selectAnswer(letter)}
                  className={cn(
                    "flex w-full items-start gap-3 rounded-[var(--radius)] border p-3.5 text-left text-sm transition-colors sm:text-base",
                    selected
                      ? "border-[var(--color-primary)] bg-[var(--color-accent)]"
                      : "hover:border-[var(--color-primary)] hover:bg-[var(--color-accent)]"
                  )}
                >
                  <span
                    className={cn(
                      "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-semibold",
                      selected &&
                        "border-[var(--color-primary)] bg-[var(--color-primary)] text-[var(--color-primary-foreground)]"
                    )}
                  >
                    {letter}
                  </span>
                  <span className="flex-1">{current.options[letter]}</span>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex items-center justify-between gap-2">
        <Button
          variant="outline"
          onClick={() => go(index - 1)}
          disabled={index === 0}
        >
          Precedente
        </Button>
        <Button
          variant="ghost"
          onClick={() => setShowGrid((v) => !v)}
          className="text-sm"
        >
          {showGrid ? "Nascondi mappa" : "Mappa domande"}
        </Button>
        <Button
          variant="outline"
          onClick={() => go(index + 1)}
          disabled={index === questions.length - 1}
        >
          Successiva
        </Button>
      </div>

      {showGrid && (
        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-8 gap-2 sm:grid-cols-10">
              {questions.map((q, i) => {
                const isAnswered = Boolean(answers[q.id]);
                const isMarked = marked.includes(q.id);
                return (
                  <button
                    key={q.id}
                    onClick={() => {
                      go(i);
                      setShowGrid(false);
                    }}
                    className={cn(
                      "relative flex h-9 items-center justify-center rounded-md border text-xs font-medium",
                      i === index && "ring-2 ring-[var(--color-ring)]",
                      isAnswered
                        ? "bg-[var(--color-accent)]"
                        : "bg-[var(--color-card)] text-[var(--color-muted-foreground)]"
                    )}
                  >
                    {i + 1}
                    {isMarked && (
                      <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-[var(--color-primary)]" />
                    )}
                  </button>
                );
              })}
            </div>
            <div className="mt-3 flex flex-wrap gap-4 text-xs text-[var(--color-muted-foreground)]">
              <span className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded bg-[var(--color-accent)]" />
                Risposta data
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-[var(--color-primary)]" />
                Marcata
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
        <Button variant="ghost" onClick={handleSuspend} disabled={submitting}>
          Sospendi
        </Button>
        <Button onClick={handleSubmit} disabled={submitting}>
          {submitting ? "Invio…" : "Submit esame"}
        </Button>
      </div>
    </div>
  );
}
