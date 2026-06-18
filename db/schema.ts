import {
  pgTable,
  text,
  varchar,
  timestamp,
  boolean,
  integer,
  jsonb,
} from "drizzle-orm/pg-core";

// ============================================================
// Better Auth tables (property names must match Better Auth fields)
// ============================================================

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ============================================================
// App tables
// ============================================================

export type QuestionOptions = { A: string; B: string; C: string; D: string };

export const questions = pgTable("questions", {
  id: varchar("id", { length: 20 }).primaryKey(),
  domain: varchar("domain", { length: 50 }).notNull(),
  scenario: varchar("scenario", { length: 50 }).notNull(),
  subdomain: varchar("subdomain", { length: 100 }),
  difficulty: varchar("difficulty", { length: 20 }).notNull(),
  source: varchar("source", { length: 100 }),
  questionText: text("question_text").notNull(),
  options: jsonb("options").$type<QuestionOptions>().notNull(),
  correctAnswer: varchar("correct_answer", { length: 1 }).notNull(),
  explanation: text("explanation").notNull(),
  tags: jsonb("tags").$type<string[]>(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const examSessions = pgTable("exam_sessions", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  mode: varchar("mode", { length: 20 }).notNull(), // drill | exam | bruciapelo
  status: varchar("status", { length: 20 }).notNull(), // in_progress | suspended | completed | expired
  questionIds: jsonb("question_ids").$type<string[]>().notNull(),
  currentIndex: integer("current_index").notNull().default(0),
  answers: jsonb("answers").$type<Record<string, string>>().notNull().default({}),
  markedForReview: jsonb("marked_for_review").$type<string[]>().notNull().default([]),
  startedAt: timestamp("started_at").notNull().defaultNow(),
  suspendedAt: timestamp("suspended_at"),
  completedAt: timestamp("completed_at"),
  elapsedSeconds: integer("elapsed_seconds").notNull().default(0),
  timeLimitSeconds: integer("time_limit_seconds"),
  filters: jsonb("filters").$type<Record<string, string | null>>(),
});

export const questionAttempts = pgTable("question_attempts", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  questionId: varchar("question_id", { length: 20 })
    .notNull()
    .references(() => questions.id, { onDelete: "cascade" }),
  sessionId: text("session_id").references(() => examSessions.id, {
    onDelete: "set null",
  }),
  userAnswer: varchar("user_answer", { length: 1 }),
  isCorrect: boolean("is_correct").notNull(),
  timeTakenSeconds: integer("time_taken_seconds"),
  attemptedAt: timestamp("attempted_at").notNull().defaultNow(),
});

export type ScoreBreakdown = Record<string, { correct: number; total: number }>;

export const examHistory = pgTable("exam_history", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  sessionId: text("session_id")
    .unique()
    .references(() => examSessions.id, { onDelete: "cascade" }),
  mode: varchar("mode", { length: 20 }).notNull(),
  totalQuestions: integer("total_questions").notNull(),
  correctAnswers: integer("correct_answers").notNull(),
  score: integer("score").notNull(),
  scoreBreakdown: jsonb("score_breakdown").$type<ScoreBreakdown>().notNull(),
  durationSeconds: integer("duration_seconds").notNull(),
  completedAt: timestamp("completed_at").notNull().defaultNow(),
});

export type Question = typeof questions.$inferSelect;
export type ExamSession = typeof examSessions.$inferSelect;
export type ExamHistoryRow = typeof examHistory.$inferSelect;
