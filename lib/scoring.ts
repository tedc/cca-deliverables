import type { Question } from "@/db/schema";
import type { ScoreBreakdown } from "@/db/schema";
import { DOMAINS, PASSING_SCORE } from "./domains";

/** Score scaled 0..1000 = round(1000 * correct / total). Passing threshold 720. */
export function computeScore(correct: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((1000 * correct) / total);
}

export function isPassing(score: number): boolean {
  return score >= PASSING_SCORE;
}

export interface GradedResult {
  correctCount: number;
  total: number;
  score: number;
  passed: boolean;
  breakdown: ScoreBreakdown;
  wrong: {
    question: Question;
    userAnswer: string | null;
  }[];
}

export function gradeExam(
  questions: Question[],
  answers: Record<string, string>
): GradedResult {
  const breakdown: ScoreBreakdown = {};
  for (const d of DOMAINS) breakdown[d] = { correct: 0, total: 0 };

  let correctCount = 0;
  const wrong: GradedResult["wrong"] = [];

  for (const q of questions) {
    const bucket =
      breakdown[q.domain] ?? (breakdown[q.domain] = { correct: 0, total: 0 });
    bucket.total += 1;
    const userAnswer = answers[q.id] ?? null;
    const correct = userAnswer === q.correctAnswer;
    if (correct) {
      bucket.correct += 1;
      correctCount += 1;
    } else {
      wrong.push({ question: q, userAnswer });
    }
  }

  return {
    correctCount,
    total: questions.length,
    score: computeScore(correctCount, questions.length),
    passed: isPassing(computeScore(correctCount, questions.length)),
    breakdown,
    wrong,
  };
}
