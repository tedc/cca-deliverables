# Setup Instructions — CCA-F Trainer

Step-by-step per mettere in piedi l'app. Tempi reali stimati a fianco di ogni step.

## Step 1 — Account Neon (database Postgres)

Tempo: 2 minuti.

1. Vai su [neon.tech](https://neon.tech)
2. Clicca "Sign Up", usa GitHub o Google (più veloce)
3. Una volta dentro, "Create Project":
   - Project name: `cca-trainer`
   - Postgres version: lascia default
   - Region: scegli quella più vicina (Frankfurt per Italia)
4. Una volta creato, vedi una connection string in alto. Cliccaci sopra per copiarla.
5. Salva la connection string da qualche parte (la userai dopo). Avrà forma:
   ```
   postgresql://neondb_owner:abc123@ep-xyz.eu-central-1.aws.neon.tech/neondb?sslmode=require
   ```

## Step 2 — Account Vercel (deploy)

Tempo: 2 minuti.

Se ce l'hai già, salta. Altrimenti:

1. Vai su [vercel.com](https://vercel.com)
2. "Sign Up", usa GitHub (importante: con questo Vercel può deployare i tuoi repo automaticamente)
3. Sei dentro. Non serve fare altro adesso.

## Step 3 — Cartella locale e Claude Code

Tempo: 3 minuti.

1. Crea una cartella nuova sul Mac:
   ```bash
   mkdir ~/cca-trainer
   cd ~/cca-trainer
   ```

2. Estrai il file zip che ti ho dato in questa cartella. Dovresti vedere:
   ```
   ~/cca-trainer/
   ├── questions.json
   ├── documentazione.md
   ├── schema.sql
   ├── PROMPT_CLAUDE_CODE.md
   └── SETUP_INSTRUCTIONS.md  (questo file)
   ```

3. Inizializza un repo git (servirà dopo per deploy):
   ```bash
   git init
   ```

## Step 4 — Lancia Claude Code in automode

Tempo: 30-60 minuti (Claude Code lavora, tu fai altro).

1. Apri il terminale nella cartella `~/cca-trainer`

2. Lancia Claude Code:
   ```bash
   claude
   ```

3. Una volta dentro Claude Code, attiva la modalità auto (autonomous) con Shift+Tab, oppure scrivi il comando:
   ```
   /auto
   ```

4. Incolla il contenuto di `PROMPT_CLAUDE_CODE.md` come messaggio. Claude Code legge anche gli altri file della cartella (questions.json, documentazione.md, schema.sql).

5. Aspetta. Claude Code costruirà l'app autonomamente in 30-60 minuti. Tu nel frattempo puoi fare altro (lavorare, studiare la documentazione, dormire).

6. Quando Claude Code finisce, ti mostrerà un riepilogo. Dovresti avere:
   ```
   ~/cca-trainer/
   ├── (i file originali)
   ├── package.json
   ├── next.config.ts
   ├── app/
   ├── components/
   ├── lib/
   ├── db/
   └── ...
   ```

## Step 5 — Testa in locale

Tempo: 5 minuti.

1. Crea un file `.env.local` nella cartella `~/cca-trainer`:
   ```bash
   nano .env.local
   ```

2. Incolla queste righe (con i tuoi valori):
   ```env
   DATABASE_URL=postgresql://neondb_owner:abc123@ep-xyz.eu-central-1.aws.neon.tech/neondb?sslmode=require
   ADMIN_EMAIL=tuoemail@gmail.com
   ADMIN_PASSWORD=unaPasswordChePoiRicordi
   AUTH_SECRET=incolla-qui-una-stringa-random-di-32-caratteri
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   ```

   Per generare `AUTH_SECRET` random, esegui nel terminale:
   ```bash
   openssl rand -hex 32
   ```
   Copia l'output e incollalo come AUTH_SECRET.

3. Salva: `Ctrl+O`, Enter, `Ctrl+X`.

4. Installa le dipendenze:
   ```bash
   pnpm install
   ```
   (Se non hai pnpm: `npm install -g pnpm`)

5. Applica le migrazioni del DB:
   ```bash
   pnpm db:push
   ```
   (Claude Code dovrebbe aver creato questo script; se non c'è, usa `pnpm drizzle-kit push`)

6. Avvia in locale:
   ```bash
   pnpm dev
   ```

7. Apri il browser su `http://localhost:3000`

8. Logga con le credenziali ADMIN_EMAIL e ADMIN_PASSWORD che hai messo in `.env.local`

9. Prova le modalità: drill, exam mode, bruciapelo, documentazione. Se qualcosa non funziona, segnati il problema e dillo a Claude Code (nuovo prompt: "fix questo: [descrizione]"). Riprende dal punto dove era.

## Step 6 — Push su GitHub

Tempo: 3 minuti.

1. Crea un nuovo repo su GitHub (privato è meglio): vai su [github.com/new](https://github.com/new)
   - Repo name: `cca-trainer`
   - Privacy: Private
   - NON inizializzare con README

2. Nella cartella locale:
   ```bash
   git add .
   git commit -m "Initial commit: CCA-F trainer app"
   git branch -M main
   git remote add origin https://github.com/TUOUSERNAME/cca-trainer.git
   git push -u origin main
   ```

3. Verifica che `.env.local` NON sia stato committato (deve essere in `.gitignore`). Claude Code dovrebbe averlo già messo.

## Step 7 — Deploy su Vercel

Tempo: 5 minuti.

1. Vai su [vercel.com/new](https://vercel.com/new)

2. Clicca "Import" accanto al repo `cca-trainer` (Vercel mostra i tuoi repo GitHub)

3. Vercel rileva automaticamente Next.js. Lascia tutte le impostazioni di default.

4. Sezione "Environment Variables": aggiungi le stesse env vars che hai in `.env.local`:
   - `DATABASE_URL` → stessa connection string Neon
   - `ADMIN_EMAIL` → tua email
   - `ADMIN_PASSWORD` → password
   - `AUTH_SECRET` → stesso valore
   - `NEXT_PUBLIC_APP_URL` → metti il dominio Vercel quando lo sai (es. `https://cca-trainer-xyz.vercel.app`). Per ora puoi mettere un placeholder e aggiornare dopo il primo deploy.

5. Clicca "Deploy".

6. Aspetta 2-3 minuti. Vercel builda e deploya.

7. Quando finito, vedi un URL tipo `https://cca-trainer-xyz.vercel.app`. Cliccaci.

8. Logga con le tue credenziali admin. Dovresti vedere la dashboard.

9. (Opzionale) Aggiorna `NEXT_PUBLIC_APP_URL` con l'URL Vercel reale, redeploya.

## Troubleshooting comune

### "Cannot connect to database"

Verifica:
- DATABASE_URL include `?sslmode=require` in fondo
- La password nella connection string non ha caratteri speciali non escaped (se la copi da Neon dovrebbe già essere ok)
- Su Vercel le env vars sono settate per "Production" environment

### "Auth not working"

Verifica:
- AUTH_SECRET è la stessa stringa in locale e in Vercel
- ADMIN_EMAIL e ADMIN_PASSWORD non hanno spazi indesiderati
- Hai eseguito il seed script che crea l'utente admin nel DB

### Vercel build fails

Apri il build log su Vercel. Tipicamente:
- TypeScript errors: copia l'errore, dillo a Claude Code per fix
- Missing env vars: aggiungile su Vercel
- Drizzle migration not applied: esegui localmente `pnpm db:push` con DATABASE_URL della produzione

### Domande non appaiono dopo il login

Il seed script non è girato. Aggiungi questo passo al primo deploy:
1. Apri il terminale localmente con DATABASE_URL della produzione
2. Esegui: `pnpm db:seed` (script creato da Claude Code)

## Costi

Tutto gratis con i free tier:
- Neon free: 0.5 GB storage, basta abbondantemente per 130 domande + history
- Vercel free: bandwidth e build minutes generosi per single-user
- GitHub free: repo privati illimitati

Zero costi mensili. Se vuoi puoi anche cancellare tutto dopo l'esame.

## Quando hai l'app pronta

Vai sul tuo URL Vercel, logga, e iniziamo a usarla. Buon studio.
