"use client";

import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, XCircle } from "lucide-react";

export interface FeedbackQuestion {
  id: string;
  domain: string;
  scenario: string;
  difficulty: string;
  questionText: string;
  options: { A: string; B: string; C: string; D: string };
  correctAnswer: string;
  explanation: string;
}

const LETTERS = ["A", "B", "C", "D"] as const;

const DIFF_LABEL: Record<string, string> = {
  easy: "Facile",
  medium: "Medio",
  hard: "Difficile",
};

export function QuestionFeedbackCard({
  question,
  selected,
  onSelect,
  disabled,
}: {
  question: FeedbackQuestion;
  selected: string | null;
  onSelect: (letter: string) => void;
  disabled?: boolean;
}) {
  const answered = selected !== null || disabled === true;

  return (
    <Card>
      <CardContent className="space-y-5 p-5 sm:p-6">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="rounded-full bg-[var(--color-accent)] px-2.5 py-1 font-medium">
            {question.domain}
          </span>
          <span className="rounded-full bg-[var(--color-muted)] px-2.5 py-1 text-[var(--color-muted-foreground)]">
            {question.scenario}
          </span>
          <span className="rounded-full bg-[var(--color-muted)] px-2.5 py-1 text-[var(--color-muted-foreground)]">
            {DIFF_LABEL[question.difficulty] ?? question.difficulty}
          </span>
        </div>

        <p className="text-base font-medium leading-relaxed sm:text-lg">
          {question.questionText}
        </p>

        <div className="flex flex-col gap-2.5">
          {LETTERS.map((letter) => {
            const isCorrect = letter === question.correctAnswer;
            const isSelected = letter === selected;
            const showCorrect = answered && isCorrect;
            const showWrong = answered && isSelected && !isCorrect;

            return (
              <button
                key={letter}
                disabled={answered}
                onClick={() => onSelect(letter)}
                className={cn(
                  "flex w-full items-start gap-3 rounded-[var(--radius)] border p-3.5 text-left text-sm transition-colors sm:text-base",
                  !answered &&
                    "hover:border-[var(--color-primary)] hover:bg-[var(--color-accent)]",
                  showCorrect &&
                    "border-[var(--color-success)] bg-[var(--color-success-bg)]",
                  showWrong &&
                    "border-[var(--color-danger)] bg-[var(--color-danger-bg)]",
                  answered &&
                    !showCorrect &&
                    !showWrong &&
                    "opacity-60"
                )}
              >
                <span
                  className={cn(
                    "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-semibold",
                    showCorrect &&
                      "border-[var(--color-success)] text-[var(--color-success)]",
                    showWrong &&
                      "border-[var(--color-danger)] text-[var(--color-danger)]"
                  )}
                >
                  {letter}
                </span>
                <span className="flex-1">{question.options[letter]}</span>
                {showCorrect && (
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-[var(--color-success)]" />
                )}
                {showWrong && (
                  <XCircle className="h-5 w-5 shrink-0 text-[var(--color-danger)]" />
                )}
              </button>
            );
          })}
        </div>

        {answered && (
          <div className="space-y-2 rounded-[var(--radius)] border bg-[var(--color-muted)]/40 p-4">
            <p
              className={cn(
                "text-sm font-semibold",
                selected === question.correctAnswer
                  ? "text-[var(--color-success)]"
                  : "text-[var(--color-danger)]"
              )}
            >
              {selected === question.correctAnswer
                ? "Corretta!"
                : selected === null
                  ? `Tempo scaduto — risposta corretta: ${question.correctAnswer}`
                  : `Sbagliata — risposta corretta: ${question.correctAnswer}`}
            </p>
            <p className="text-sm leading-relaxed text-[var(--color-foreground)]">
              {question.explanation}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
