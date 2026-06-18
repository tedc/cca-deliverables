/**
 * Idempotent seed:
 *  1. Creates the admin user (credentials from env vars) if missing.
 *  2. Populates the `questions` table from questions.json (upsert by id).
 *
 * Run with: pnpm db:seed
 */
import { config } from "dotenv";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

// Load env BEFORE importing modules that read process.env at import time.
config({ path: ".env.local" });
config({ path: ".env" });

const __dirname = dirname(fileURLToPath(import.meta.url));

interface RawQuestion {
  id: string;
  domain: string;
  scenario: string;
  subdomain?: string;
  difficulty: string;
  source?: string;
  question: string;
  options: { A: string; B: string; C: string; D: string };
  correctAnswer: string;
  explanation: string;
  tags?: string[];
}

async function main() {
  // Dynamic imports so dotenv runs first.
  const { db } = await import("./index");
  const schema = await import("./schema");
  const { questions, user } = schema;
  const { sql } = await import("drizzle-orm");
  const { betterAuth } = await import("better-auth");
  const { drizzleAdapter } = await import("better-auth/adapters/drizzle");

  // Seed-scoped auth instance with sign-up enabled (the app instance disables it).
  const seedAuth = betterAuth({
    secret: process.env.AUTH_SECRET,
    baseURL: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
    database: drizzleAdapter(db, {
      provider: "pg",
      schema: {
        user: schema.user,
        session: schema.session,
        account: schema.account,
        verification: schema.verification,
      },
    }),
    emailAndPassword: { enabled: true, disableSignUp: false },
  });

  // --- Admin user ---
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME || "Edo";
  if (!email || !password) {
    throw new Error("ADMIN_EMAIL and ADMIN_PASSWORD must be set");
  }

  const existing = await db
    .select({ id: user.id })
    .from(user)
    .where(sql`lower(${user.email}) = lower(${email})`)
    .limit(1);

  if (existing.length > 0) {
    console.log(`✓ Admin user already exists (${email})`);
  } else {
    await seedAuth.api.signUpEmail({ body: { email, password, name } });
    console.log(`✓ Created admin user (${email})`);
  }

  // --- Questions ---
  const raw = JSON.parse(
    readFileSync(join(__dirname, "..", "questions.json"), "utf-8")
  ) as { questions: RawQuestion[] };

  const rows = raw.questions.map((q) => ({
    id: q.id,
    domain: q.domain,
    scenario: q.scenario,
    subdomain: q.subdomain ?? null,
    difficulty: q.difficulty,
    source: q.source ?? null,
    questionText: q.question,
    options: q.options,
    correctAnswer: q.correctAnswer,
    explanation: q.explanation,
    tags: q.tags ?? [],
  }));

  for (const r of rows) {
    await db
      .insert(questions)
      .values(r)
      .onConflictDoUpdate({
        target: questions.id,
        set: {
          domain: r.domain,
          scenario: r.scenario,
          subdomain: r.subdomain,
          difficulty: r.difficulty,
          source: r.source,
          questionText: r.questionText,
          options: r.options,
          correctAnswer: r.correctAnswer,
          explanation: r.explanation,
          tags: r.tags,
        },
      });
  }
  console.log(`✓ Seeded ${rows.length} questions`);
  console.log("✅ Seed complete");
  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
