# Prompt per Claude Code — CCA-F Trainer App

Sei in autonomous mode. Il tuo task è costruire un'applicazione web completa per la preparazione all'esame Claude Certified Architect Foundations (CCA-F). L'utente è Edo, l'unico utente dell'app (single-user).

Devi costruire l'app senza interruzioni, prendendo decisioni autonome sui dettagli implementativi non specificati. Quando hai dubbi, scegli sempre la soluzione più semplice e standard.

## Stack tecnologico (vincolante)

- **Framework:** Next.js 15 con App Router e TypeScript
- **Database:** Neon Postgres (connection string in DATABASE_URL env var)
- **ORM:** Drizzle ORM con drizzle-kit per migrazioni
- **Auth:** Better Auth con credentials provider (email + password da env vars)
- **Styling:** Tailwind CSS 4 + shadcn/ui per componenti
- **Deploy:** Vercel-ready (deve buildare e girare su Vercel free tier)
- **Package manager:** pnpm

## File forniti

Allego tre file nella cartella corrente:
1. `questions.json` — pool di 130 domande con metadata, opzioni, risposte corrette, spiegazioni, tag
2. `documentazione.md` — documento di studio in italiano con pattern, tabelle decisionali, mappe per dominio
3. `schema.sql` — schema Postgres pronto da applicare (reference, ma userai Drizzle per le migrazioni)

## Struttura del database

Userai Drizzle ORM. Tabelle (vedi schema.sql per dettagli):

- `users` — single user (creato automaticamente al primo deploy con credenziali da env vars)
- `questions` — popolata da questions.json al primo deploy
- `exam_sessions` — sessioni di esame (drill, exam mode, bruciapelo), include stato suspended
- `question_attempts` — singoli tentativi su domande
- `exam_history` — esami completati con score breakdown

## Funzionalità da implementare

### 1. Autenticazione

- Login page semplice con email + password
- Email e password admin letti da env vars: `ADMIN_EMAIL`, `ADMIN_PASSWORD`
- AUTH_SECRET da env var
- Nessuna registrazione pubblica: l'unico utente è quello configurato via env vars
- Al primo avvio, se l'utente admin non esiste nel DB, crealo automaticamente con le credenziali da env vars (password hashed)
- Sessione persistente con cookie

### 2. Modalità Drill

URL: `/drill`

Flusso:
- L'utente seleziona filtri opzionali: dominio (5 opzioni: Agentic Architecture, Tool Design & MCP, Claude Code Configuration, Prompt Engineering, Context Management), scenario (6 opzioni: Customer Support, Multi-Agent Research, Code Generation, CI/CD, Document Processing, General), difficoltà (easy/medium/hard)
- Click "Inizia drill"
- L'app pesca UNA domanda random dal pool filtrato, con priorità a quelle meno viste recentemente
- Mostra: question text, 4 opzioni (A B C D come bottoni)
- L'utente clicca un'opzione
- Feedback immediato: indica corretta/sbagliata, mostra opzione corretta, mostra explanation completa
- Bottone "Prossima domanda" pesca un'altra dal pool filtrato
- Bottone "Esci dal drill" torna alla home
- Tieni traccia in DB di tentativi (correct/wrong, timestamp)

### 3. Modalità Esame (Exam Mode)

URL: `/exam`

Flusso:
- Click "Inizia esame" pesca 60 domande random dal pool totale, rispettando una distribuzione bilanciata (cerca di avvicinarsi ai pesi target: Agentic 27%, Tool 18%, Claude Code 20%, Prompt 20%, Context 15%)
- Variabilità: tra esami consecutivi, NON ripetere le domande appena fatte. Algoritmo:
  - Se ci sono almeno 60 domande mai viste o viste solo molte sessioni fa, pesca preferibilmente da quelle
  - Se utente ha completato un esame e ne avvia un altro, escludi le 60 domande dell'esame appena fatto (a meno che il pool sia esaurito)
  - Track in DB quali domande sono state nell'ultimo esame
- Mostra una domanda alla volta con bottoni: Precedente, Successiva, Marca per review
- Timer countdown 120 minuti, sempre visibile in alto
- Bottone "Sospendi" salva lo stato corrente (current_index, answers, marked_for_review, elapsed_seconds, suspended=true). L'utente torna a home
- Se utente entra di nuovo in `/exam` con sessione sospesa: warning modal "Hai un esame sospeso (15 min trascorsi, 24 risposte). Continuare o iniziarne uno nuovo?"
- Se timer raggiunge 0 senza submit: auto-submit con risposte date finora
- Bottone "Submit esame" alla fine: calcola score (1000 * percentuale corrette), breakdown per dominio, salva in exam_history, mostra risultato
- Pagina risultato: score totale, per dominio, lista domande sbagliate con explanation, link "rivedi domanda"

### 4. Modalità Bruciapelo

URL: `/bruciapelo`

Flusso:
- Click "Sfida bruciapelo" pesca UNA domanda random dal pool (qualunque dominio)
- Timer countdown 60 secondi
- Mostra domanda + opzioni
- Utente clicca opzione, oppure timer scade
- Feedback immediato con explanation
- Bottone "Altra bruciapelo"
- NON salva in exam_history (è modalità casual)

### 5. Documentazione

URL: `/docs`

Pagina statica che renderizza il file `documentazione.md` come HTML (usa una libreria markdown render come `react-markdown` o simile).

Sidebar con TOC navigabile delle sezioni principali. Stile leggibile, font readable.

### 6. History

URL: `/history`

Lista degli esami completati con:
- Data
- Score totale
- Breakdown per dominio
- Bottone "Rivedi" che apre dettaglio: tutte le domande, risposta data, corretta, explanation

Mostra anche statistiche aggregate:
- Score medio
- Trend (ultimo esame vs media)
- Domande sbagliate più frequenti (cross-session)
- Domini in cui sbagli di più

### 7. Home / Dashboard

URL: `/` (dopo login)

- Saluto "Ciao Edo"
- Status compatto: ultimo esame fatto + score, domande totali in pool, domande mai viste
- 4 bottoni grandi: "Drill", "Esame (60 random)", "Bruciapelo", "Documentazione"
- Link a "Storico esami" in basso

Layout: card-based, sobrio, Tailwind base, no animazioni complicate. Focus sui contenuti.

## Variabilità domande tra sessioni

Importante: l'app deve evitare di ripetere sempre le stesse domande. Algoritmo:

```
function pickQuestionsForExam(allQuestions, lastExamQuestionIds, count=60) {
  const unused = allQuestions.filter(q => !lastExamQuestionIds.includes(q.id));
  if (unused.length >= count) {
    return weightedSample(unused, count);  // sample respecting domain weights
  } else {
    // pool exhausted, include some recent ones but prioritize unused
    return weightedSample([...unused, ...recentlyUsed].slice(0, count), count);
  }
}
```

Stessa logica per il drill: priorità a domande meno viste recentemente.

## Vincoli e dettagli implementativi

- L'app deve essere mobile-friendly (usabile da iPhone) ma desktop-first
- Niente animazioni complesse, niente dark mode toggle (sobrio è il focus)
- Tutti i testi UI in italiano. Le domande restano in inglese (è la lingua dell'esame)
- Domande devono essere visualizzate con question stem chiaro, opzioni come bottoni grandi e cliccabili
- Feedback colorato: verde per corretta, rosso per sbagliata, evidenzia anche la corretta quando user sbaglia
- Persistenza sessione esame: anche se utente chiude browser, può tornare e riprendere
- Build deve essere production-ready: niente console.log lasciati, niente errori TypeScript

## Inizializzazione del DB

Al primo deploy, creare uno script di seed che:
1. Crea l'utente admin con credenziali da env vars
2. Popola la tabella `questions` leggendo `questions.json`
3. Verifica che il seed sia idempotente (girarlo due volte non crea duplicati)

## Variabili d'ambiente richieste

Documenta nel README.md tutte le env vars necessarie:

```
DATABASE_URL=postgresql://user:pass@host/db
ADMIN_EMAIL=edo@example.com
ADMIN_PASSWORD=changeme-strong-password
AUTH_SECRET=random-32-char-string
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
```

## Output atteso

Una applicazione Next.js completa, deployabile su Vercel via `git push`, con:

- File README.md che spiega come fare il setup locale (`pnpm install`, `pnpm dev`)
- Istruzioni per deploy su Vercel (env vars da settare)
- Schema DB applicato via Drizzle migrations
- Seed script che popola le 130 domande al primo run
- Tutti i feature sopra descritti funzionanti

## Stile codice

- TypeScript strict mode
- File organizzazione: app/ per pages, components/ per shared, lib/ per utilities, db/ per Drizzle schema
- Server components dove possibile, client components solo dove necessario (interactive UI, timer, ecc)
- Validazione input con Zod
- Error boundaries per gestione errori graceful

## Decisioni autonome accettate

Se durante l'implementazione devi prendere decisioni non specificate:
- Scegli sempre la soluzione più standard e documentata
- Preferisci dipendenze well-maintained con molti download su npm
- Evita configurazioni esotiche
- Usa convenzioni Next.js 15 + App Router come da documentazione ufficiale
- Per UI components, parti da shadcn/ui defaults

## Test e verifica

Prima di considerare il task completato:
1. `pnpm install` succede senza errori
2. `pnpm build` succede senza errori TypeScript
3. `pnpm dev` avvia il server di sviluppo
4. Login funziona con credenziali da env vars
5. Drill mode permette di rispondere a domande
6. Exam mode pesca 60 domande, timer funziona, suspend/resume funziona
7. Bruciapelo funziona con timer 60s
8. Documentazione renderizzata correttamente
9. History mostra esami passati

Procedi. Costruisci tutto. Non fermarti per chiedere conferme.
