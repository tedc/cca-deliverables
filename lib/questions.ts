import { db } from "@/db";
import {
  questions as questionsTable,
  questionAttempts,
  examSessions,
  type Question,
} from "@/db/schema";
import { and, desc, eq, inArray, max } from "drizzle-orm";
import {
  DOMAINS,
  DOMAIN_WEIGHTS,
  EXAM_QUESTION_COUNT,
  type Difficulty,
  type Domain,
} from "./domains";

export interface DrillFilters {
  domain?: string | null;
  scenario?: string | null;
  difficulty?: string | null;
}

/** Map questionId -> last-attempt epoch ms (0 = never seen, sorts first). */
export async function getRecencyMap(userId: string): Promise<Map<string, number>> {
  const rows = await db
    .select({
      questionId: questionAttempts.questionId,
      last: max(questionAttempts.attemptedAt),
    })
    .from(questionAttempts)
    .where(eq(questionAttempts.userId, userId))
    .groupBy(questionAttempts.questionId);

  const m = new Map<string, number>();
  for (const r of rows) {
    m.set(r.questionId, r.last ? new Date(r.last).getTime() : 0);
  }
  return m;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Sort least-recently-seen first, with a random tiebreak for variability. */
function rankByRecency(pool: Question[], recency: Map<string, number>): Question[] {
  return shuffle(pool).sort((a, b) => {
    const ra = recency.get(a.id) ?? 0;
    const rb = recency.get(b.id) ?? 0;
    return ra - rb;
  });
}

export async function getAllQuestions(): Promise<Question[]> {
  return db.select().from(questionsTable);
}

/** Load questions by id, preserving the order of `ids`. */
export async function getQuestionsByIds(ids: string[]): Promise<Question[]> {
  if (ids.length === 0) return [];
  const rows = await db
    .select()
    .from(questionsTable)
    .where(inArray(questionsTable.id, ids));
  const map = new Map(rows.map((r) => [r.id, r]));
  return ids.map((id) => map.get(id)).filter((q): q is Question => Boolean(q));
}

/** Safe shape sent to the client during an exam (no correct answer/explanation). */
export type ExamQuestion = {
  id: string;
  domain: string;
  scenario: string;
  difficulty: string;
  questionText: string;
  options: Question["options"];
};

export function toExamQuestion(q: Question): ExamQuestion {
  return {
    id: q.id,
    domain: q.domain,
    scenario: q.scenario,
    difficulty: q.difficulty,
    questionText: q.questionText,
    options: q.options,
  };
}

/** Pick one question for drill, honoring filters, prioritizing least-seen. */
export async function pickDrillQuestion(
  userId: string,
  filters: DrillFilters
): Promise<Question | null> {
  const all = await getAllQuestions();
  const pool = all.filter((q) => {
    if (filters.domain && q.domain !== filters.domain) return false;
    if (filters.scenario && q.scenario !== filters.scenario) return false;
    if (filters.difficulty && q.difficulty !== filters.difficulty) return false;
    return true;
  });
  if (pool.length === 0) return null;

  const recency = await getRecencyMap(userId);
  const ranked = rankByRecency(pool, recency);
  // Pick randomly among the least-recently-seen window to avoid determinism.
  const window = ranked.slice(0, Math.min(8, ranked.length));
  return window[Math.floor(Math.random() * window.length)];
}

export async function pickBruciapeloQuestion(
  userId: string
): Promise<Question | null> {
  return pickDrillQuestion(userId, {});
}

/** Get the question ids of the user's most recent completed/expired exam. */
export async function getLastExamQuestionIds(userId: string): Promise<string[]> {
  const rows = await db
    .select({ questionIds: examSessions.questionIds })
    .from(examSessions)
    .where(and(eq(examSessions.userId, userId), eq(examSessions.mode, "exam")))
    .orderBy(desc(examSessions.startedAt))
    .limit(1);
  return rows[0]?.questionIds ?? [];
}

/** Compute per-domain target counts that sum exactly to `count`. */
function domainTargets(count: number): Map<string, number> {
  const targets = new Map<string, number>();
  const fractional: { domain: string; frac: number }[] = [];
  let assigned = 0;
  for (const d of DOMAINS) {
    const exact = (DOMAIN_WEIGHTS[d as Domain] ?? 0) * count;
    const base = Math.floor(exact);
    targets.set(d, base);
    fractional.push({ domain: d, frac: exact - base });
    assigned += base;
  }
  fractional.sort((a, b) => b.frac - a.frac);
  let leftover = count - assigned;
  for (const f of fractional) {
    if (leftover <= 0) break;
    targets.set(f.domain, (targets.get(f.domain) ?? 0) + 1);
    leftover--;
  }
  return targets;
}

/**
 * Pick `count` questions for an exam with a balanced domain distribution.
 *
 * Within each domain we order candidates "unused-first" (questions NOT in the
 * last exam) and then least-recently-seen. This keeps the per-domain weights on
 * target across consecutive exams while still avoiding repeats: a domain only
 * reuses recent questions once its fresh ones are exhausted. Any rounding/short
 * domain deficit is filled from the remaining pool, also unused-first.
 */
export async function pickExamQuestions(
  userId: string,
  count = EXAM_QUESTION_COUNT
): Promise<Question[]> {
  const all = await getAllQuestions();
  if (all.length <= count) return shuffle(all);

  const recency = await getRecencyMap(userId);
  const lastIds = new Set(await getLastExamQuestionIds(userId));

  const rankFresh = (qs: Question[]): Question[] =>
    shuffle(qs).sort((a, b) => {
      const ua = lastIds.has(a.id) ? 1 : 0;
      const ub = lastIds.has(b.id) ? 1 : 0;
      if (ua !== ub) return ua - ub; // unused first
      const ra = recency.get(a.id) ?? 0;
      const rb = recency.get(b.id) ?? 0;
      return ra - rb; // then least-recently-seen
    });

  const byDomain = new Map<string, Question[]>();
  for (const q of all) {
    if (!byDomain.has(q.domain)) byDomain.set(q.domain, []);
    byDomain.get(q.domain)!.push(q);
  }

  const targets = domainTargets(count);
  const selected: Question[] = [];
  const used = new Set<string>();

  for (const d of DOMAINS) {
    const want = targets.get(d) ?? 0;
    const ranked = rankFresh(byDomain.get(d) ?? []);
    for (const q of ranked.slice(0, want)) {
      selected.push(q);
      used.add(q.id);
    }
  }

  // Fill any shortfall (a domain with fewer questions than its target).
  if (selected.length < count) {
    const rest = rankFresh(all.filter((q) => !used.has(q.id)));
    for (const q of rest) {
      if (selected.length >= count) break;
      selected.push(q);
      used.add(q.id);
    }
  }

  return shuffle(selected.slice(0, count));
}
