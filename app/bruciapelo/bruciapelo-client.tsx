"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  QuestionFeedbackCard,
  type FeedbackQuestion,
} from "@/components/question-feedback-card";
import { Flame } from "lucide-react";

export function BruciapeloClient() {
  const [question, setQuestion] = useState<FeedbackQuestion | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [started, setStarted] = useState(false);
  const [stats, setStats] = useState({ correct: 0, total: 0 });

  const recordAttempt = useCallback(
    (q: FeedbackQuestion, answer: string | null) => {
      fetch("/api/attempt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionId: q.id, answer }),
      }).catch(() => {});
    },
    []
  );

  const fetchQuestion = useCallback(async () => {
    setLoading(true);
    setError(null);
    setSelected(null);
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
    } catch {
      setError("Errore di rete.");
    } finally {
      setLoading(false);
    }
  }, []);

  function handleSelect(letter: string) {
    if (!question || selected) return;
    setSelected(letter);
    const isCorrect = letter === question.correctAnswer;
    setStats((s) => ({
      correct: s.correct + (isCorrect ? 1 : 0),
      total: s.total + 1,
    }));
    recordAttempt(question, letter);
  }

  const answered = selected !== null;

  if (!started) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold">
            <Flame className="h-6 w-6 text-[var(--color-primary)]" />
            Bruciapelo
          </h1>
          <p className="text-sm text-[var(--color-muted-foreground)]">
            Una domanda casuale, senza limite di tempo. Niente storico.
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
        <span className="text-sm text-[var(--color-muted-foreground)]">
          {stats.correct}/{stats.total} corrette
        </span>
      </div>

      {error && <p className="text-sm text-[var(--color-danger)]">{error}</p>}

      {question && (
        <QuestionFeedbackCard
          question={question}
          selected={selected}
          onSelect={handleSelect}
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
