# CCA-F Trainer

App web single-user per la preparazione all'esame **Claude Certified Architect Foundations (CCA-F)**.
Drill con feedback immediato, simulazione d'esame (60 domande / 120 minuti con sospendi-riprendi),
modalità "bruciapelo" a tempo, documentazione di studio e storico con statistiche.

> Per la guida passo-passo (creare il DB su Neon, deploy su Vercel) vedi **[SETUP_INSTRUCTIONS.md](./SETUP_INSTRUCTIONS.md)**.

## Stack

- **Next.js 15** (App Router, TypeScript strict)
- **Neon Postgres** + **Drizzle ORM** (migrazioni con drizzle-kit)
- **Better Auth** (email + password, single-user, niente registrazione pubblica)
- **Tailwind CSS 4** + componenti UI custom in stile shadcn
- **Zod** per la validazione, **react-markdown** per la documentazione
- Package manager: **pnpm**

## Variabili d'ambiente

Crea un file `.env.local` (vedi `.env.example`):

```bash
# Connection string Neon (usa la versione "pooled" per il serverless)
DATABASE_URL=postgresql://user:pass@host/db?sslmode=require

# Credenziali admin — l'unico utente dell'app
ADMIN_EMAIL=edo@example.com
ADMIN_PASSWORD=changeme-strong-password
ADMIN_NAME=Edo

# Secret di Better Auth (32+ caratteri: `openssl rand -base64 32`)
AUTH_SECRET=random-32-char-string

# URL pubblico dell'app
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Setup locale

```bash
pnpm install

# 1. Applica lo schema al database
pnpm db:migrate          # applica le migrazioni in db/migrations
#   (in alternativa, per prototipare:  pnpm db:push)

# 2. Crea l'utente admin e popola le 130 domande (idempotente)
pnpm db:seed

# 3. Avvia in sviluppo
pnpm dev                 # http://localhost:3000
```

Accedi con `ADMIN_EMAIL` / `ADMIN_PASSWORD`.

## Script disponibili

| Script | Descrizione |
|---|---|
| `pnpm dev` | Server di sviluppo |
| `pnpm build` | Build di produzione |
| `pnpm start` | Avvia la build di produzione |
| `pnpm db:generate` | Genera una migrazione Drizzle dallo schema |
| `pnpm db:migrate` | Applica le migrazioni al database |
| `pnpm db:push` | Sincronizza lo schema senza migrazioni (prototipo) |
| `pnpm db:seed` | Crea l'admin + carica le 130 domande (idempotente) |

## Deploy su Vercel

1. Push del repository su GitHub e import del progetto su Vercel.
2. Imposta le **Environment Variables** (le stesse di `.env.local`).
   `NEXT_PUBLIC_APP_URL` deve essere l'URL pubblico (es. `https://cca-trainer.vercel.app`).
3. Dopo il primo deploy, esegui una volta migrazioni + seed verso il DB Neon:
   ```bash
   DATABASE_URL="<neon-pooled-url>" ADMIN_EMAIL=... ADMIN_PASSWORD=... AUTH_SECRET=... \
     pnpm db:migrate && pnpm db:seed
   ```
   (oppure dalla tua macchina puntando alla connection string di produzione).

Il seed è idempotente: rieseguirlo non crea duplicati né reimposta l'utente.

## Funzionalità

- **`/` Dashboard** — saluto, ultimo esame e score, domande nel pool / mai viste, accesso rapido alle modalità.
- **`/drill`** — domande filtrabili per dominio / scenario / difficoltà, una alla volta, con feedback ed explanation immediati. Priorità alle domande viste meno di recente.
- **`/exam`** — 60 domande con distribuzione bilanciata per dominio (Agentic 27%, Tool 18%, Claude Code 20%, Prompt 20%, Context 15%), timer 120 min sempre visibile, navigazione + "marca per review", **sospendi/riprendi** (lo stato sopravvive alla chiusura del browser), auto-submit allo scadere del tempo, pagina risultato con breakdown per dominio ed errori commentati. Tra esami consecutivi le domande appena viste vengono evitate finché il pool lo consente.
- **`/bruciapelo`** — una domanda casuale, 60 secondi, feedback immediato. Non finisce nello storico.
- **`/docs`** — `documentazione.md` renderizzata con indice navigabile.
- **`/history`** — elenco esami completati con "Rivedi", più statistiche aggregate (score medio, trend, domini più sbagliati, domande sbagliate più spesso).

## Struttura del progetto

```
app/                 # pagine (App Router) + route handlers in app/api
components/           # UI condivisa (header, card domanda, primitive ui/)
db/                   # schema Drizzle, client, seed, migrazioni
lib/                  # auth, sessione, selezione domande, scoring, costanti dominio
documentazione.md    # materiale di studio (renderizzato in /docs)
questions.json       # pool delle 130 domande (caricato dal seed)
```

Tutti i testi dell'interfaccia sono in italiano; le domande restano in inglese (lingua dell'esame).
