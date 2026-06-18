"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  QuestionFeedbackCard,
  type FeedbackQuestion,
} from "@/components/question-feedback-card";
import { BRUCIAPELO_TIME_SECONDS } from "@/lib/domains";
import { cn } from "@/lib/utils";
import { Flame } from "lucide-react";

export function BruciapeloClient() {
  const [question, setQuestion] = useState<FeedbackQuestion | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [timedOut, setTimedOut] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(BRUCIAPELO_TIME_SECONDS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [started, setStarted] = useState(false);
  const [stats, setStats] = useState({ correct: 0, total: 0 });
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const recordAttempt = useCallback((q: FeedbackQuestion, answer: string | null) => {
    fetch("/api/attempt", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ questionId: q.id, answer }),
    }).catch(() => {});
  }, []);

  const fetchQuestion = useCallback(async () => {
    stopTimer();
    setLoading(true);
    setError(null);
    setSelected(null);
    setTimedOut(false);
    setQuestion(null);
    try {
      const res = await fetch("/api/question/bruciapelo", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Errore nel caricamento.");
        return;
      }
      setQuestion(data.question);
      setStarted(true);
      setSecondsLeft(BRUCIAPELO_TIME_SECONDS);
    } catch {
      setError("Errore di rete.");
    } finally {
      setLoading(false);
    }
  }, [stopTimer]);

  // Run countdown while a question is unanswered.
  useEffect(() => {
    if (!question || selected || timedOut) return;
    timerRef.current = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          stopTimer();
          setTimedOut(true);
          recordAttempt(question, null);
          setStats((st) => ({ correct: st.correct, total: st.total + 1 }));
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return stopTimer;
  }, [question, selected, timedOut, stopTimer, recordAttempt]);

  function handleSelect(letter: string) {
    if (!question || selected || timedOut) return;
    stopTimer();
    setSelected(letter);
    const isCorrect = letter === question.correctAnswer;
    setStats((s) => ({
      correct: s.correct + (isCorrect ? 1 : 0),
      total: s.total + 1,
    }));
    recordAttempt(question, letter);
  }

  const answered = selected !== null || timedOut;

  if (!started) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold">
            <Flame className="h-6 w-6 text-[var(--color-primary)]" />
            Bruciapelo
          </h1>
          <p className="text-sm text-[var(--color-muted-foreground)]">
            Una domanda casuale, 60 secondi per rispondere. Niente storico.
          </p>
        </div>
        {error && <p className="text-sm text-[var(--color-danger)]">{error}</p>}
        <div className="flex gap-3">
          <Button size="lg" onClick={fetchQuestion} disabled={loading}>
            {loading ? "Caricamento…" : "Sfida bruciapelo"}
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link href="/">Annulla</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="flex items-center gap-2 text-xl font-semibold">
          <Flame className="h-5 w-5 text-[var(--color-primary)]" />
          Bruciapelo
        </h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-[var(--color-muted-foreground)]">
            {stats.correct}/{stats.total}
          </span>
          <span
            className={cn(
              "rounded-full px-3 py-1 font-mono text-sm font-semibold tabular-nums",
              answered
                ? "bg-[var(--color-muted)] text-[var(--color-muted-foreground)]"
                : secondsLeft <= 10
                  ? "bg-[var(--color-danger-bg)] text-[var(--color-danger)]"
                  : "bg-[var(--color-accent)]"
            )}
          >
            {secondsLeft}s
          </span>
        </div>
      </div>

      {error && <p className="text-sm text-[var(--color-danger)]">{error}</p>}

      {question && (
        <QuestionFeedbackCard
          question={question}
          selected={selected}
          onSelect={handleSelect}
          disabled={timedOut}
        />
      )}

      <div className="flex flex-wrap gap-3">
        <Button onClick={fetchQuestion} disabled={loading || !answered}>
          {loading ? "Caricamento…" : "Altra bruciapelo"}
        </Button>
        <Button variant="outline" asChild>
          <Link href="/">Esci</Link>
        </Button>
      </div>
    </div>
  );
}
