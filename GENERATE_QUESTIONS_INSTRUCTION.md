# Istruzioni per Claude Code — Generazione pool domande CCA-F

Ciao Claude Code. Devi generare un pool di 130 domande per la preparazione all'esame Claude Certified Architect Foundations (CCA-F). L'utente è Edo, professionista italiano che sostiene l'esame tra 2 giorni.

## File di contesto disponibili nella cartella

- `documentazione.md` — pattern decisionali, mappe per dominio, le 3 cause di comportamento sbagliato del modello, anti-pattern. Usa questo come fonte autorevole sui pattern da testare.
- `schema.sql` — schema database (ti serve solo per capire la struttura del campo questions)

## Output atteso

Un file `questions.json` con esattamente 130 domande, struttura:

```json
{
  "metadata": {
    "version": "2.0",
    "totalQuestions": 130,
    "createdFor": "Edo - CCA-F Exam Preparation",
    "domainWeights": {
      "Agentic Architecture": 0.27,
      "Tool Design & MCP": 0.18,
      "Claude Code Configuration": 0.20,
      "Prompt Engineering": 0.20,
      "Context Management": 0.15
    }
  },
  "questions": [
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
        "A": "perché A è sbagliata in italiano leggibile",
        "C": "perché C è sbagliata in italiano leggibile",
        "D": "perché D è sbagliata in italiano leggibile"
      },
      "tags": ["pattern-name-1", "pattern-name-2"]
    }
  ]
}
```

## Distribuzione domande (vincolante)

- Agentic Architecture: 35 domande (27%)
- Tool Design & MCP: 23 domande (18%)
- Claude Code Configuration: 26 domande (20%)
- Prompt Engineering: 26 domande (20%)
- Context Management: 20 domande (15%)

## Scenari (distribuire equamente attraverso i domini)

- Customer Support Resolution Agent
- Multi-Agent Research System
- Code Generation with Claude Code
- Claude Code for CI/CD
- Document Processing
- General (quando lo scenario è agnostico)

## Specifiche di scrittura — IMPORTANTI

### Stile delle domande

Le domande devono essere scenario-based narrative, NON stripped-down. Stile di riferimento: il Practice Exam ufficiale Anthropic. Caratteristiche:

1. **Contesto narrativo iniziale**: descrivi il sistema, l'agente, le sue tool, l'ambiente di produzione
2. **Tool specs concreti**: quando rilevante, elenca i tool dell'agente con i loro nomi (es. `get_customer`, `lookup_order`, `process_refund`)
3. **Dati di produzione specifici**: percentuali, conteggi, dati misurati ("94% accuracy", "12% delle volte", "23 violazioni in 3 mesi")
4. **Vincolo o requirement esplicito**: cosa lo stakeholder/team richiede ("compliance team requires", "stakeholders rejected filtering")
5. **Domanda finale precisa**: "What is the most effective approach?", "What is the most likely root cause?", "How should you enforce this?"

Esempio di stile CORRETTO (scenario-based narrative, lungo):

> "In production, you've configured your agent to handle simple refund requests autonomously while routing complex cases to human reviewers. The agent has tools `get_customer` (looks up customer info), `lookup_order` (retrieves order details), and `process_refund` (issues refunds with required parameters: customer_id, order_id, amount, reason). During testing, you observe that in 12% of cases, the agent skips calling `get_customer` entirely and proceeds with `lookup_order` or `process_refund` using only the customer name from the conversation. This leads to wrong-customer errors when names are similar. You need to enforce that `get_customer` is always called first, returning a verified customer_id, before any other tool can be invoked. How do you most reliably enforce this required tool sequence?"

Esempio di stile SBAGLIATO (stripped-down, non usare):

> "Refund agent must verify customer identity before process_refund. 8% of refunds proceed without verification. Best enforcement?"

Tutte le 130 domande devono seguire lo stile CORRETTO.

### Stile delle spiegazioni

Le spiegazioni (`explanation` e `wrongAnswerExplanations`) devono essere scritte in **italiano leggibile vero**, NON in italiese tecnico-burocratico. Regole:

1. **Frasi normali**: soggetto, verbo, complemento. Niente sintassi telegrafica.
2. **NO mescolanza italiano-inglese alla rinfusa**: i termini tecnici inglesi obbligatori (PreToolUse hook, stop_reason, tool_use) sono ammessi, ma devono essere collocati in una frase italiana ben costruita. NON usare frasi come "modello supporta nativamente parallel tool use (multiple tool_use block in singolo response)". USA invece: "Il modello Claude supporta nativamente l'esecuzione di tool multipli in un singolo turno: nella risposta può emettere più blocchi tool_use, e tu esegui i tool e ritorni i risultati insieme."
3. **Spiega il ragionamento, non solo la conclusione**: perché quella è la risposta giusta in termini di pattern Anthropic-canonical, e perché le altre violano il pattern.
4. **Lunghezza**: explanation principale 80-150 parole. wrongAnswerExplanations 30-60 parole ciascuna.

Esempio di stile CORRETTO per la explanation:

> "La risposta corretta è B. Quando il modello deve seguire una sequenza obbligatoria di tool e l'enforcement via prompt non è abbastanza affidabile (l'agente salta il primo step nel 12% dei casi nonostante le istruzioni), serve un meccanismo deterministico. Un PreToolUse hook sul tool `lookup_order` e `process_refund` può verificare lo stato della conversazione e bloccare la chiamata se `get_customer` non è ancora stato invocato con successo. Il pattern canonical di Anthropic per questo è: hard rule deterministica → architectural enforcement via hook, non soft enforcement via prompt. Il prompt instruction lascia comunque margine al modello di sbagliare; l'hook lo previene strutturalmente."

Esempio di stile SBAGLIATO (non scrivere così):

> "PreToolUse hook = deterministic guarantee. Hard sequence requirement va architetturale, non instruction-level. Soft enforcement failed 12%, serve hook."

### Esempio di wrongAnswerExplanation in italiano corretto

> "A è sbagliata perché rinforzare le istruzioni nel system prompt è già il meccanismo che ha fallito. Lo scenario dichiara che il problema persiste nonostante le istruzioni esistenti. Aggiungere più istruzioni o esempi few-shot riduce la probabilità di errore ma non la elimina. Per un requirement hard come questo (compliance), serve enforcement strutturale, non soft."

## Pattern da testare

Distribuisci le 130 domande coprendo questi pattern (sono i più ricorrenti nell'esame reale, secondo testimonianze e materiali ufficiali). Numero indicativo di domande per pattern:

### Pattern di Domain 1 — Agentic Architecture (35 domande totali)

- Agentic loop con stop_reason (4 domande)
- Hub-and-spoke coordinator vs direct A2A communication (3 domande)
- Task decomposition del coordinator (narrow vs broad scope, coverage gaps) (4 domande)
- Subagent context isolation (3 domande)
- Coordinator partition per task delegation (evitare duplicate work) (3 domande)
- Error propagation strutturato (failure type + attempted + partial results + alternatives) (4 domande)
- Local recovery nel subagent vs propagation al coordinator (3 domande)
- Distinguish access failures (timeout, retry) vs valid empty results (3 domande)
- Conflict handling in document analysis (preserve entrambi i datapoint, annotate, defer reconciliation) (2 domande)
- Coverage annotation in synthesis output (3 domande)
- Conditional branching nel coordinator per casi high-severity (3 domande)

### Pattern di Domain 2 — Tool Design & MCP (23 domande totali)

- Tool descriptions clarity e expansion (3 domande)
- Tool naming per evitare semantic overlap (2 domande)
- Scoped tools vs general-purpose (capability removal) (3 domande)
- Tool schema design (nullable fields, enum constraints, required parameters) (4 domande)
- PreToolUse hooks per hard rule enforcement (3 domande)
- PostToolUse hooks per format normalization e enrichment (3 domande)
- MCP server con .mcp.json project-scoped + env var expansion (2 domande)
- MCP isError flag e structured error responses (2 domande)
- MCP resources vs tools vs prompts primitives (1 domanda)

### Pattern di Domain 3 — Claude Code Configuration (26 domande totali)

- CLAUDE.md hierarchy (user/project/directory) (3 domande)
- .claude/rules/ con glob frontmatter per path-specific conventions (3 domande)
- Skills vs CLAUDE.md vs Rules — when to use each (3 domande)
- Skill frontmatter (context: fork, allowed-tools, argument-hint) (3 domande)
- Slash commands project-scoped (.claude/commands/) vs user-scoped (2 domande)
- Plan mode vs direct execution (3 domande)
- Built-in tools (Read, Write, Edit, Bash, Grep, Glob) usage patterns (3 domande)
- Edit fallback pattern (Read + Write quando no unique match) (1 domanda)
- CLI flags per CI/CD (-p, --output-format json, --json-schema) (3 domande)
- Permissions configuration in .claude/settings.json (allow/deny rules) (2 domande)

### Pattern di Domain 4 — Prompt Engineering (26 domande totali)

- Few-shot examples per pattern recognition gap (5 domande)
- Few-shot per format consistency (3 domande)
- Few-shot vs declarative criteria (3 domande)
- Le 3 cause di comportamento sbagliato (training prior / prompt routing / guidance gap) — 6 domande, 2 per ciascuna causa
- Structured output con nullable schemas per prevenire hallucination (3 domande)
- Self-critique con checklist esplicita (2 domande)
- Tool selection reliability (descriptions, examples, routing) (2 domande)
- Concrete input-output examples vs prose descriptions (2 domande)

### Pattern di Domain 5 — Context Management (20 domande totali)

- Lost-in-the-middle / position effects nel long context (3 domande)
- Persistent facts blocks (case facts, collected data) (3 domande)
- Progressive summarization e limiti (2 domande)
- Context degradation in long sessions (2 domande)
- Subagent delegation per fasi verbose (Explore subagent) (2 domande)
- Information provenance e claim-source pairing (2 domande)
- Decomposition pre-execution per long context tracking (3 domande)
- Coverage annotation per partial results (2 domande)
- Multi-instance verification (independent reviewer) (1 domanda)

## Anti-pattern e distractor

Per ogni domanda, le 4 opzioni devono essere:
- 1 risposta corretta
- 3 distractor plausibili ma sbagliati per ragioni discriminabili via reasoning

I distractor devono includere errori comuni come:
- Overengineering quando un fix più leggero risolverebbe (es. proporre decomposition quando capability esiste)
- Soft enforcement quando serve hard enforcement (es. system prompt instructions per compliance hard rule)
- Architectural change quando prompt-level fix è proporzionato
- Fine-tuning come opzione (sempre sbagliata, fuori scope CCA-F)
- Higher-tier model come fix (raramente la risposta corretta)
- Capability removal eccessiva (es. rimuovere Bash completamente quando deny rule basta)

NON mettere distractor ovviamente sbagliati. Devono essere plausibili a prima lettura, eliminabili solo con reasoning.

## Calibrazione difficoltà

- easy: 30% (39 domande)
- medium: 50% (65 domande)
- hard: 20% (26 domande)

Le hard devono richiedere multi-step reasoning, lettura attenta di vincoli espliciti, discriminazione fine tra opzioni plausibili.

## Lingua

- Question text e options: inglese (è la lingua dell'esame)
- Explanation e wrongAnswerExplanations: italiano leggibile vero (vedi specifiche sopra)

## Verifica finale

Prima di salvare il file:

1. Conta le domande per dominio e verifica che la distribuzione corrisponda ai target (35/23/26/26/20)
2. Verifica che la distribuzione di difficoltà sia 39/65/26
3. Verifica che ogni domanda abbia explanation + wrongAnswerExplanations per tutte e 3 le opzioni sbagliate
4. Verifica che le explanation siano in italiano leggibile (no italiese, no sintassi telegrafica)
5. Verifica che nessuna domanda sia copia diretta del Practice Exam ufficiale Anthropic
6. Verifica che le domande siano scenario-based narrative, non stripped-down

## Output

Salva il risultato in `questions.json` nella cartella corrente. Sovrascrivi il file esistente se presente.

Non chiedere conferme. Procedi a generare e salvare.
