"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  QuestionFeedbackCard,
  type FeedbackQuestion,
} from "@/components/question-feedback-card";
import { DOMAINS, SCENARIOS, DIFFICULTIES } from "@/lib/domains";

const DIFF_LABEL: Record<string, string> = {
  easy: "Facile",
  medium: "Medio",
  hard: "Difficile",
};

type Filters = { domain: string; scenario: string; difficulty: string };

export function DrillClient() {
  const [filters, setFilters] = useState<Filters>({
    domain: "",
    scenario: "",
    difficulty: "",
  });
  const [started, setStarted] = useState(false);
  const [question, setQuestion] = useState<FeedbackQuestion | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({ correct: 0, total: 0 });

  async function fetchQuestion() {
    setLoading(true);
    setError(null);
    setSelected(null);
    setQuestion(null);
    try {
      const res = await fetch("/api/question/drill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          domain: filters.domain || null,
          scenario: filters.scenario || null,
          difficulty: filters.difficulty || null,
        }),
      });
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
  }

  async function handleSelect(letter: string) {
    if (!question || selected) return;
    setSelected(letter);
    const isCorrect = letter === question.correctAnswer;
    setStats((s) => ({
      correct: s.correct + (isCorrect ? 1 : 0),
      total: s.total + 1,
    }));
    // Record attempt (fire and forget, but await to surface errors silently).
    fetch("/api/attempt", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ questionId: question.id, answer: letter }),
    }).catch(() => {});
  }

  if (!started) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Drill</h1>
          <p className="text-sm text-[var(--color-muted-foreground)]">
            Allenamento libero con feedback immediato. Filtri opzionali.
          </p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Filtri (opzionali)</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-3">
            <Select
              label="Dominio"
              value={filters.domain}
              onChange={(v) => setFilters((f) => ({ ...f, domain: v }))}
              options={DOMAINS.map((d) => ({ value: d, label: d }))}
            />
            <Select
              label="Scenario"
              value={filters.scenario}
              onChange={(v) => setFilters((f) => ({ ...f, scenario: v }))}
              options={SCENARIOS.map((s) => ({ value: s, label: s }))}
            />
            <Select
              label="Difficoltà"
              value={filters.difficulty}
              onChange={(v) => setFilters((f) => ({ ...f, difficulty: v }))}
              options={DIFFICULTIES.map((d) => ({
                value: d,
                label: DIFF_LABEL[d],
              }))}
            />
          </CardContent>
        </Card>
        {error && <p className="text-sm text-[var(--color-danger)]">{error}</p>}
        <div className="flex gap-3">
          <Button size="lg" onClick={fetchQuestion} disabled={loading}>
            {loading ? "Caricamento…" : "Inizia drill"}
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
        <h1 className="text-xl font-semibold">Drill</h1>
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
        <Button onClick={fetchQuestion} disabled={loading || !selected}>
          {loading ? "Caricamento…" : "Prossima domanda"}
        </Button>
        <Button variant="outline" asChild>
          <Link href="/">Esci dal drill</Link>
        </Button>
      </div>
    </div>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 rounded-[var(--radius)] border bg-[var(--color-card)] px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]"
      >
        <option value="">Tutti</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}
