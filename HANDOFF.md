# Handoff — CCA-F Trainer

> Stato del progetto per riprendere il lavoro dopo un `/clear`. Aggiornato: 2026-06-24.

## Cos'è

App web single-user per prepararsi all'esame **Claude Certified Architect – Foundations (CCA-F)**.
Modalità: Drill, Esame (60 domande / 2h), Bruciapelo, Documentazione, Storico. Utente: Edo.

## Stack

Next.js **15.5.19** (App Router, TS strict) · Node **22** · Neon Postgres + Drizzle ORM · Better Auth (email/password, single-user, no signup pubblico) · Tailwind 4 · pnpm.

## Repo / Git

- Remote: `git@github.com:tedc/cca-deliverables.git` (SSH), branch `main`.
- Config locale: `user.name=tedc`, `user.email=egrandinetti@gmail.com`.
- Ultimo commit: `1e6112d` (quality: bias di lunghezza + italiese).
- Storia recente: feat app → bump Next 15.5.19/Node22 → rigenerazione domande v2.1 (allineata guida) → bruciapelo senza timer → v2.2 (anti-bias + italiese).

## Stato attuale (cosa è fatto)

- **App completa e funzionante**, `pnpm build` verde, tutte le pagine testate (login, dashboard, drill, esame con suspend/resume, bruciapelo, docs, history).
- **`questions.json` v2.3 — 140 domande**: 130 originali scenario-based + 10 aggiunte per coprire topic della guida ufficiale (Task/allowedTools, fork_session/--resume, tool_choice, errorCategory/isRetryable, @import, /memory, /compact, confidence calibration).
  - Domini: Agentic 38 · Claude Code 28 · Prompt 27 · Tool 25 · Context 22.
  - Difficoltà: easy 42 · medium 70 · hard 28 (~30/50/20).
  - **Overhaul qualità v2.3 (2026-06-24)**: rifatti i 3 distrattori di ogni domanda come trappole forti (≥2 plausibili per domanda, errori canonici: overengineering, soft vs hard enforcement, prompt-fix vs cambio architetturale, fine-tuning fuori scope, tier superiore, hook a valle che maschera). **Bias di lunghezza azzerato**: la corretta non è mai l'unica opzione più lunga né più corta (rank 1/4 solo in pareggio), spread opzioni ≤18% in tutte, lettere corrette 34/34/37/35. Spiegazioni riscritte in italiano vero con accenti tipografici reali (corretti anche i 5 residui `continuerà`/`sbaglierà`/`lì` di v2.2).
  - Ogni domanda ha `explanation` + `wrongAnswerExplanations` (le 3 sbagliate) in italiano.
- **`documentazione.md`**: riscritta in italiano scorrevole (italiese rimosso), allineata alla guida ufficiale (sezione finale "Allineamento alla guida ufficiale CCA-F" + in/out-of-scope). 35 titoli, tabelle preservate.
- **Bruciapelo**: nessun timer. **Esame**: countdown unico globale 2h per tutte le 60 domande (NON 2 min/domanda).
- Guida ufficiale PDF: **esclusa dal repo** (`*.pdf` in .gitignore — è "Confidential Need to Know").

## Ambiente locale (IMPORTANTE)

- **Dev server gira sulla porta 3001** (la 3000 è occupata da un altro processo Node dell'utente). Avvio usato:
  `NEXT_PUBLIC_APP_URL=http://localhost:3001 npx next dev -p 3001`
- **DB di test = Docker** usa-e-getta: container `cca-pg`, `postgresql://user:pass@localhost:55432/cca?sslmode=disable`. Seed/migrate locali lanciati con `DATABASE_URL` override su questo.
- `.env.local` contiene la **connection string Neon reale** (impostata dall'utente) + `ADMIN_EMAIL=egrandinetti@gmail.com`. Per i test locali ho fatto override verso il Docker.
- Login locale (Docker DB): `egrandinetti@gmail.com` / la password in `.env.local` (placeholder `changeme-strong-password` salvo modifiche). Nel Docker esiste anche un vecchio utente `edo@example.com`.

## Pending / prossimi passi

1. **Deploy del pool su Neon**: con `DATABASE_URL` Neon in `.env.local`, lanciare `pnpm db:migrate && pnpm db:seed` (idempotente: aggiorna le 140 domande per id).
2. **Reset admin su Neon** (era rimasto in sospeso): se l'admin è sbagliato, `DELETE FROM "user";` nel SQL Editor Neon, poi `pnpm db:seed`.
3. **Vercel**: settare env vars (`DATABASE_URL`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `AUTH_SECRET`, `NEXT_PUBLIC_APP_URL`), poi deploy via push.
4. **Opzionale — verifica avversariale** delle risposte: agenti che provano a confutare ogni risposta corretta per stanare ambiguità introdotte nella riscrittura distractor.
5. **Opzionale — UI**: `wrongAnswerExplanations` esiste nel JSON ma l'app non lo mostra. Si potrebbe mostrare "perché le altre sono sbagliate" nel feedback di drill/esame e nella review storico.

## Comandi utili

```bash
pnpm dev                 # dev (occhio: usa 3001 se la 3000 è occupata)
pnpm build               # build produzione (NON lanciarlo mentre 'next dev' gira: corrompe .next)
pnpm db:migrate          # applica migrazioni Drizzle
pnpm db:seed             # crea admin + carica/aggiorna le 140 domande (idempotente)
# DB test docker:
docker start cca-pg
DATABASE_URL="postgresql://user:pass@localhost:55432/cca?sslmode=disable" npx tsx db/seed.ts
```

## Gotcha / lezioni

- **pnpm ignored-builds**: se `sharp`/`esbuild` vengono segnalati come "ignored" (succede dopo bump di dipendenze), fare `rm node_modules/.modules.yaml && pnpm install`. C'è `pnpm.onlyBuiltDependencies=[esbuild,sharp]` in package.json.
- **Accenti**: gli agenti tendono a scrivere accenti in ASCII (`e'`, `perche'`, `puo'`). Esistono script di normalizzazione usati in `/tmp/qgen` e `/tmp/qrev` (potrebbero non esserci più dopo un riavvio). Dopo qualsiasi rigenerazione, ricontrollare con un grep per `\b[a-z]+'(?![A-Za-zÀ-ÿ])`.
- **Non** committare il PDF della guida (confidenziale).
- L'esame pesca 60 domande per peso di dominio, quindi un pool di 140 va benissimo.

## File chiave

- `questions.json` (pool), `documentazione.md` (studio, renderizzato in /docs)
- `db/schema.ts`, `db/seed.ts`, `lib/questions.ts` (selezione/sampling), `lib/scoring.ts`
- `app/exam/exam-client.tsx` (runner esame), `app/bruciapelo/bruciapelo-client.tsx`
- `GENERATE_QUESTIONS_INSTRUCTION.md` (spec generazione domande)
- `ClaudeCertifiedArchitect_FoundationsCertificationExamGuide.pdf` (guida ufficiale, NON in git)
