# Istruzioni per Claude Code — Sistemare il pool di domande CCA-F

Ciao Claude Code. Edo ha già un pool di 130 domande in `questions.json` ma sono di qualità mista. Devi rigenerare il file da zero con domande migliori, seguendo le regole sotto.

L'esame è il Claude Certified Architect Foundations (CCA-F). Edo lo fa tra 2 giorni.

## Contesto disponibile

- `documentazione.md` — sintesi dei pattern principali. Usala per capire quali pattern sono Anthropic-canonical.
- `questions.json` (esistente) — pool attuale, da sovrascrivere.

## Output atteso

Sovrascrivi `questions.json` con 130 domande nuove. La struttura del file resta quella esistente (metadata + questions array). Ogni domanda ha:

```json
{
  "id": "Q001",
  "domain": "Agentic Architecture",
  "scenario": "Customer Support",
  "subdomain": "...",
  "difficulty": "easy|medium|hard",
  "source": "Original",
  "question": "...",
  "options": {"A": "...", "B": "...", "C": "...", "D": "..."},
  "correctAnswer": "B",
  "explanation": "...",
  "wrongAnswerExplanations": {
    "A": "...",
    "C": "...",
    "D": "..."
  },
  "tags": ["..."]
}
```

## Distribuzione domande

- Agentic Architecture: 35 domande (27%)
- Tool Design & MCP: 23 domande (18%)
- Claude Code Configuration: 26 domande (20%)
- Prompt Engineering: 26 domande (20%)
- Context Management: 20 domande (15%)

## Scenari

Distribuisci attraverso tutti i 6 scenari ufficiali in modo equo:
- Customer Support Resolution Agent
- Multi-Agent Research System
- Code Generation with Claude Code
- Claude Code for CI/CD
- Document Processing
- Developer Productivity

## Regole vincolanti sulla scrittura delle domande

### Regola 1 — Lunghezza scenario

Scenario tra 60 e 100 parole. Mai oltre 110. Conta le parole.

### Regola 2 — Opzioni di lunghezza simile

Le 4 opzioni devono avere lunghezza simile. Differenza massima tra la più corta e la più lunga: 30%. Se l'opzione corretta è 40 parole, le altre non possono essere di 15 o 20 parole. Calibratura uniforme è obbligatoria.

Questo è importante: nelle domande del vero esame Anthropic, l'opzione corretta non si distingue per essere visibilmente più lunga. Se tu generi opzioni con la corretta sempre più lunga, crei un bias visivo che falsa l'allenamento.

### Regola 3 — Nessuna conoscenza esterna richiesta

Le domande NON devono richiedere conoscenze fuori dallo scope CCA-F. Vietato usare come trappole:
- Terminologia specifica di dominio (DST, leap seconds, PCI compliance dettagliata, HIPAA, GDPR articoli specifici, OAuth flows, ecc.)
- Concetti di infrastructure (Postgres vs MongoDB, time-series DB, Prometheus, Datadog)
- Librerie specifiche (pytest, Jest, Vitest, Mocha)
- Algoritmi non Anthropic (consensus algorithms, distributed systems theory)
- Cognitive science / accademia (episodic memory, semantic memory)
- Protocolli di rete (TCP, SSE specifico, WebSocket)

Tutti i signal nello scenario devono essere espressi in linguaggio naturale comprensibile senza pre-requisiti. Se il pattern richiede di distinguere "bug interconnessi" vs "bug indipendenti", esplicitalo nello scenario in linguaggio piano (es. "30 fail sono causati dalla stessa logica condivisa, 20 sono indipendenti tra loro"), non con vocabolario tecnico assunto.

### Regola 4 — Pattern Anthropic-canonical

Ogni domanda deve testare un pattern del syllabus ufficiale CCA-F. Lista dei pattern da coprire (distribuiti tra le 130 domande):

**Domain 1 — Agentic Architecture (35 domande)**
- Agentic loop e stop_reason
- Hub-and-spoke vs direct A2A communication
- Task decomposition del coordinator
- Coordinator partition per evitare duplicate work
- Subagent context isolation
- Error propagation strutturato (failure type + attempted + partial results)
- Local recovery nel subagent vs propagation al coordinator
- Access failures vs valid empty results
- Conflict handling in document analysis
- Coverage annotation in synthesis output
- Conditional branching nel coordinator per high-severity cases

**Domain 2 — Tool Design & MCP (23 domande)**
- Tool descriptions clarity ed expansion
- Tool naming per evitare semantic overlap
- Scoped tools vs general-purpose (capability removal)
- Tool schema design (nullable, enum, required)
- PreToolUse hooks per hard rule enforcement
- PostToolUse hooks per format normalization
- MCP server con .mcp.json project-scoped + env var
- MCP isError flag e structured error responses
- MCP primitives (tool vs resource vs prompt): model-controlled vs application/user-controlled

**Domain 3 — Claude Code Configuration (26 domande)**
- CLAUDE.md hierarchy (user/project/directory)
- .claude/rules/ con glob frontmatter per path-specific conventions
- Skills vs CLAUDE.md vs Rules — when to use each
- Skill frontmatter (context: fork, allowed-tools, argument-hint)
- Slash commands project-scoped vs user-scoped
- Plan mode vs direct execution
- Built-in tools (Read, Write, Edit, Bash, Grep, Glob) usage patterns
- Edit fallback pattern (Read + Write quando no unique match)
- CLI flags per CI/CD (-p, --output-format json, --json-schema)
- Permissions configuration in .claude/settings.json (allow/deny rules)

**Domain 4 — Prompt Engineering (26 domande)**
- Few-shot per pattern recognition gap
- Few-shot per format consistency
- Few-shot per ambiguous scenarios con reasoning
- Le 3 cause di comportamento sbagliato del modello (training prior, prompt routing, guidance gap) — 6 domande, 2 per causa
- Structured output con nullable schemas
- Self-critique con checklist esplicita
- Interview pattern per requirement ambigui
- Concrete input-output examples vs prose descriptions
- Sequential vs parallel issue resolution (failures che condividono root cause vs indipendenti)

**Domain 5 — Context Management (20 domande)**
- Lost-in-the-middle / position effects
- Persistent facts blocks (case facts, structured data)
- Progressive summarization e limiti
- Context degradation in long sessions
- Subagent delegation per fasi verbose (Explore subagent)
- Information provenance e claim-source pairing
- Trimming verbose tool outputs
- Multi-instance verification (independent reviewer)

### Regola 5 — Stile delle spiegazioni

Le spiegazioni (`explanation` e `wrongAnswerExplanations`) devono essere scritte in italiano leggibile vero. Regole:

1. **Frasi normali italiane**: soggetto, verbo, complemento. Niente sintassi telegrafica.
2. **Termini tecnici inglesi solo quando obbligatori** (PreToolUse hook, stop_reason, tool_use, ecc.) e sempre dentro una frase italiana ben costruita.
3. **Vietato il "italiese"**: niente frasi tipo "Modello supporta nativamente parallel tool use (multiple tool_use block in singolo response). Comportamento sequenziale è prompt issue, non architetturale." Quello è illeggibile. Usa frasi italiane vere.
4. **Lunghezza**: explanation principale 80-150 parole. wrongAnswerExplanations 30-60 parole ciascuna.
5. **Spiega il ragionamento**: perché la risposta corretta è giusta secondo il pattern Anthropic-canonical, e perché le altre violano il pattern.

Esempio di explanation in italiano CORRETTO:

> "La risposta corretta è B. Il modello Claude supporta nativamente l'esecuzione parallela dei tool nello stesso turno: nella risposta può emettere più blocchi tool_use che vengono eseguiti tutti, e i risultati ritornano insieme nel turno successivo. Quando un agente fa chiamate sequenziali separate invece di parallele, il problema è quasi sempre a livello di prompt: non gli è stato detto di batchare le richieste. Aggiungere un'istruzione nel system prompt che invita Claude a chiamare tutti i tool indipendenti nello stesso turno risolve a costo zero. Creare composite tools (opzione A) è overengineering: aggiunge un nuovo tool da mantenere per ogni combinazione, mentre la capability c'è già nativamente."

Esempio di explanation SBAGLIATO (non scrivere così):

> "Risposta B. Parallel tool use nativo. Sequential = prompt issue non architetturale. Composite = overengineering, maintenance burden."

### Regola 6 — Distractor plausibili ma discriminabili

Le 3 opzioni sbagliate devono essere:
- Plausibili a prima lettura (non ovviamente assurde)
- Discriminabili via reasoning sui pattern del syllabus
- Errori comuni che fa chi ha studiato solo superficialmente

Errori tipici da usare come distractor:
- Overengineering (proporre decomposition quando capability esiste)
- Soft enforcement quando serve hard enforcement
- Architectural change quando prompt-level fix basta
- Fine-tuning come opzione (sempre sbagliata, fuori scope CCA-F)
- Higher-tier model (raramente la risposta corretta)
- Capability removal eccessiva

Non mettere mai distractor ovviamente sbagliati tipo "delete the entire system" o opzioni che violano vincoli espliciti dichiarati nello scenario.

### Regola 7 — Calibrazione difficoltà

Distribuzione difficoltà:
- easy: 30% (39 domande)
- medium: 50% (65 domande)
- hard: 20% (26 domande)

Le easy testano un pattern singolo con scenario diretto.
Le medium richiedono di combinare 2 signal o riconoscere quale pattern applicare.
Le hard hanno vincoli espliciti multipli da rispettare, distractor sottili, e richiedono reasoning a più step.

### Regola 8 — Lingua

- Question text e options: inglese (è la lingua dell'esame)
- Explanation e wrongAnswerExplanations: italiano leggibile vero

### Regola 9 — Niente Practice Exam

Edo ha già memorizzato le 60 domande del Practice Exam ufficiale Anthropic. Non includere domande che siano copia o variante minima di domande del Practice Exam ufficiale. Tutte le 130 devono essere materiale nuovo.

### Regola 10 — Verifica finale prima di salvare

Prima di sovrascrivere questions.json, fai questi controlli:

1. Conta le domande per dominio e verifica distribuzione 35/23/26/26/20
2. Conta le difficoltà 39/65/26
3. Per ogni domanda, verifica che lunghezza scenario sia tra 60 e 100 parole
4. Per ogni domanda, verifica che la differenza tra opzione più lunga e più corta sia max 30%
5. Per ogni domanda, verifica che explanation sia in italiano corrente (no italiese)
6. Per ogni domanda, verifica che wrongAnswerExplanations copra tutte e 3 le opzioni sbagliate
7. Per ogni domanda, verifica che non richieda conoscenze fuori scope CCA-F

Se uno di questi controlli fallisce su qualche domanda, riscrivi quella domanda prima di salvare.

## Output

Salva il risultato in `questions.json` nella cartella corrente, sovrascrivendo il file esistente. Aggiorna anche il campo `metadata.version` portandolo a "3.0" e `metadata.totalQuestions` a 130.

Quando hai finito, produci un breve report che indichi:
- Numero domande per dominio (per verifica distribuzione)
- Numero domande per difficoltà
- Numero domande per scenario
- Esempi di 2-3 domande "before/after" se hai mantenuto qualcosa dal pool precedente

Non chiedere conferme. Procedi a generare e salvare.
