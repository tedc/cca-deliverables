# CCA-F — Documentazione di studio

Documento sintetico per ripasso pre-esame. Pattern decisionali, lezioni cristallizzate, mappe per dominio.

## Status di partenza

Punteggio Practice Exam ufficiale Anthropic: 816/1000
Soglia di passaggio: 720
Margine: +96 punti
Score corrente Cyberskill: 920

## Il framework decisionale principale

### Lettura del verbo della domanda

Prima di tutto, leggi il verbo della domanda e applica filtri grammaticali:

**Root cause / most likely cause** → Cerca opzioni formulate come diagnosi (es. "X creates Y", "the system contains Z"). Scarta opzioni prescrittive (es. "model requires X", "descriptions need Y", "should be fine-tuned"). Le prescrittive sono fix mascherate da diagnosi e vanno eliminate a priori.

**Most effective approach / best way to** → Valuta proporzionalità: minimal change che risolve. Scarta overengineering quando capability già esiste.

**Primary technical constraint / why does this not work** → Cerca impossibilità strutturale, non "concern principale". Es. Batch API → asynchronous fire-and-forget impedisce mid-request tool execution.

**First step / initial diagnostic action** → Tactical first action più leggera. Spesso "review tool descriptions" prima di "redesign architecture".

**Most maintainable approach** → Premia ease of maintenance: meno componenti custom, più centralizzazione.

### Gerarchia Cyberskill di proporzionalità della fix

In ordine, dal più leggero al più pesante. Default scelta sull'opzione più in alto che risolve il problema dichiarato.

1. **Prompt-level guidance / istruzione** — Modello ha già la capability, manca solo il pattern. Es. parallel tool use, batching, escalation criteria.

2. **Tool description rewrite** — Selezione ambigua tra tool simili.

3. **Few-shot examples** — Pattern recognition gap su scenari prevedibili. Insegna struttura/sequenza/criteri di decisione.

4. **Self-critique con checklist esplicita** — Completeness check su criteri enumerabili (policy, timeline, next steps), variabili case-by-case.

5. **Tool scope restriction** — Tool generale viene abusato. Sostituisci con tool scoped.

6. **Hook architettonico (Pre/PostToolUse)** — Hard rule deterministica (authorization threshold, prerequisite check, format normalization).

7. **Decomposition pre-execution** — Solo quando single-X accuracy è bassa o multi-X catastrofico (>30 punti drop). Mai se single-X ≥ 90%.

8. **Composite tools / structural redesign** — Ultima risorsa. Quasi mai la risposta giusta.

## Le tre cause di comportamento sbagliato del modello

Quando una domanda chiede root cause su pattern systematic, devi distinguere tra tre famiglie di cause diverse.

### Causa 1 — Training prior del modello

**Cosa significa:** Durante il training del modello, sono stati instillati comportamenti cauti su certe categorie di dato. Per esempio il modello è stato addestrato ad essere prudente su transazioni finanziarie ad alto importo, su informazioni mediche, su decisioni che coinvolgono soldi importanti. Questi comportamenti sono dentro il modello, indipendenti dal prompt.

**Come si comporta il modello:** Applica un'azione prudente in modo sistematico ogni volta che incontra quella categoria di dato. Lo fa anche se il prompt dice esplicitamente di procedere senza prudenza extra. Il bias del training prevale sull'istruzione esplicita del prompt.

**Come lo riconosci nello scenario:**
- Il pattern è legato a un attributo intrinseco del dato (importo monetario, sensibilità, gravità, valuta straniera, demografia)
- Lo scenario dichiara esplicitamente che prompt e tool descriptions sono chiari
- Il comportamento sbagliato è un'azione conservativa: "verifies unnecessarily", "escalates inappropriately", "asks for additional confirmation systematically"

**Esempio:** Refund sopra $200 → agent verifica purchase_history 73% anche se policy dice "solo sopra $500". Attributo intrinseco (importo) + prompt clear + comportamento conservativo sistematico = training prior.

### Causa 2 — Regola esplicita nel prompt che produce side effect

**Cosa significa:** Nel system prompt c'è scritta una regola esplicita del tipo "quando l'utente dice X, fai Y". Quella regola viene applicata letteralmente dal modello, ma produce comportamenti indesiderati in casi che chi ha scritto la regola non aveva previsto.

**Come si comporta il modello:** Applica con precisione la regola scritta nel prompt ogni volta che vede il trigger. Il comportamento è coerente e sistematico, non esitante. È preciso e ripetibile.

**Come lo riconosci nello scenario:**
- Il pattern è attivato da una parola specifica nel messaggio dell'utente
- Pattern binario, sistematico, con percentuali precise (es. "78% delle volte quando 'account' presente, 93% quando assente")
- Comportamento sicuro e ripetibile, non esitante

**Esempio:** "Account" terminology → agent chiama get_customer 78% quando l'utente scrive "account", 93% lookup_order quando non lo scrive. Keyword nel messaggio utente + pattern binario + sicurezza = regola esplicita nel prompt.

### Causa 3 — Mancanza di guidance nel prompt

**Cosa significa:** Nel system prompt non c'è scritto cosa il modello deve fare in un certo caso. Non c'è una regola per quel caso, non c'è un esempio. È uno spazio vuoto nelle istruzioni.

**Come si comporta il modello:** Quando incontra il caso non coperto, non sa come decidere, quindi sceglie un comportamento di sicurezza generico. Tipicamente chiede chiarimenti all'utente, oppure ripiega sul comportamento più comune che conosce.

**Come lo riconosci nello scenario:**
- Nel testo compaiono parole come "asks for clarification", "defaults to X", "uncertain how to proceed"
- Il modello mostra esitazione, non sicurezza sbagliata
- Negli altri casi simili, il modello funziona bene

**Esempio:** Multi-order request ("my orders from last week have issues") → agent chiama get_customer 41% e chiede chiarimenti. Single-order ben gestito (96%), multi-order non coperto = guidance gap.

### Tabella riassuntiva delle tre cause

| Trigger del pattern | Causa | Comportamento del modello | Esempio |
|---|---|---|---|
| Attributo intrinseco del dato | Training prior | Cautious / conservative systematic | Refund $500+ → over-verification |
| Keyword specifica nel messaggio utente | Regola esplicita nel prompt | Sicuro ma sbagliato in modo specifico | "account" → get_customer 78% |
| Caso ambiguo non coperto nel prompt | Guidance gap | Chiede chiarimenti / default fallback | Multi-order → asks clarification |

## Quando usare few-shot vs altre fix

Few-shot examples sono indicati per cinque casi canonical:

1. **Length** — controlla la lunghezza dell'output
2. **Style** — tono, registro, voce
3. **Format** — struttura, layout, posizionamento (es. inline citations)
4. **Edge cases** — pattern atipici che il modello non gestisce
5. **Pattern compositivo** — il caso più ricorrente nelle domande Cyberskill

### Quando NON usare few-shot

Few-shot non risolve quando il modello manca dell'informazione necessaria runtime per applicare il pattern. Esempi:

- Tool ritorna lista di documenti senza distinguere critical/optional, e tu chiedi al modello di "decidere se procedere o escalare". Il modello non ha l'info: serve tool interface fix, non few-shot.
- Modello fabbrica dati assenti perché schema richiede campo. Serve nullable schema, non few-shot.

### Few-shot vs decomposition pre-execution

| Drop magnitudo | Pattern errore | Fix |
|---|---|---|
| Single-X alto + drop moderato (5-15 punti) | Pattern recognition gap | Few-shot |
| Single-X alto + drop catastrofico (30+) su long context | Tracking/state gap | Decomposition con structured intermediate |
| Single-X basso | Capability gap | Decomposition pre-execution |

### Numero di esempi few-shot

- **3-4 esempi:** standard canonical per la maggior parte dei casi
- **4-6 esempi:** quando insegni "ambiguous scenarios con reasoning" o decision boundary tra opzioni
- **5-6+ esempi:** spesso anti-pattern (overkill). Verifica se sei davvero in scenario "comprehensive coverage" o se stai bloating

## Self-critique vs Dual-instance review

| Tipo di problema | Pattern |
|---|---|
| Omissione di elementi noti (checklist verificabile) | Self-critique con criteri espliciti |
| Errore di giudizio su decisione complessa | Independent reviewer (dual-instance) |

**Self-critique funziona quando:**
- Criteri sono enumerabili e verificabili (policy presente? timeline presente? next steps presenti?)
- Verifica meccanica di presenza/assenza, non rivalutazione cognitiva
- Variabili case-by-case (signal: "gaps vary by case")

**Self-critique fallisce quando:**
- Decisioni sostantive complesse che richiedono rivalutazione del reasoning
- Same context = same blind spots
- Fix: independent instance senza access al reasoning del generator

## Vincoli espliciti dello scenario come hard rule

Frasi tipo "stakeholders rejected X", "X is well-configured", "cannot modify Y" sono regole assolute. Eliminano opzioni che le violano, anche sofisticate.

Esempi pratici:
- "stakeholders rejected filtering" → esclude qualunque forma di suppression, anche pattern-based
- "tool descriptions are well-written and unambiguous" → esclude opzioni che assumono descriptions come problema
- "developers cannot modify upstream agents" → esclude fix at the source
- "must maintain thoroughness" → esclude trade-off che sacrifichi analisi

## Mappe per dominio

### Multi-Agent Research System (Domain 1 — 27% peso esame)

**Hub-and-spoke vs Direct A2A:** Hub-and-spoke sempre vince per observability, consistent error handling, controllo granulare. Mai far parlare subagent direttamente tra loro.

**Error propagation:** Local recovery per transient failures, propagate to coordinator solo what cannot be resolved, sempre con structured context (failure type + attempted action + partial results + alternative approaches).

**Task partitioning:** Coordinator partiziona research space prima di delegation. Distinct subtopics o source types per ciascun agent.

**Tool distribution (principle of least privilege):** Synthesis agent ottiene scoped verify_fact per simple lookups, complex via coordinator.

**Long context position effects:** Aggregated input lungo → key findings summary all'inizio (primacy), section headers per navigazione.

**Coverage annotation:** Quando subagent ritorna parziale, synthesis output struttura findings con coverage annotation distinguendo well-supported da gaps.

**Conflict handling:** Document analysis trova due fonti contraddittorie → completa l'analisi includendo entrambe, annota il conflict con source attribution, lascia decisione di reconciliation al coordinator.

**Access failure vs valid empty:** Timeout (access failure) e "0 results" (valid empty) sono semanticamente distinti. Coordinator deve distinguerli per fix appropriata.

### Customer Support Resolution Agent (Domain 1+2 mix)

**Tool selection reliability — gerarchia diagnostica:**
1. Tool descriptions chiare distinguono purpose? Espandi con input formats, example queries, edge cases, boundaries.
2. Descriptions chiare ma confusion persiste? Few-shot 4-6 esempi targeting ambiguous scenarios con reasoning.
3. Systematic keyword-triggered pattern? Review system prompt per routing logic implicita.

**Multi-step workflow enforcement:** Hard sequence requirement = PreToolUse hook con prerequisite check. Programmatic, deterministic.

**Format normalization da MCP tools:** PostToolUse hook intercepting tool results, applying transformations.

**Conversation context management:** Progressive summarization è lossy per dettagli precisi. Estrai transactional facts (amounts, dates, order numbers) in persistent "case facts" block.

**Ambiguous result handling:** get_customer ritorna multiple matches → chiedi additional identifier (email, phone, order number).

**Escalation decisions:** Legittima quando policy è silente, non quando policy esiste ma è scomoda.

**Multi-concern (94% single → 58% multi):** Single-X alta = capability presente. Drop su multi = pattern recognition gap. Few-shot insegna pattern compositivo.

**Self-critique evaluator-optimizer:** Quando criteri di completeness sono enumerabili (policy, timeline, next steps) e gap variano case-by-case.

**Agentic loop fundamentals:** stop_reason = "tool_use" → continue. stop_reason = "end_turn" → terminate. Mai parsing del content.

### Claude Code for CI (Domain 3)

**Batch API vs synchronous:**
- Batch: up to 24h, no SLA, 50% cost saving, async fire-and-forget. Per overnight technical debt, weekly security audits, nightly test generation.
- Sync: pre-merge checks, PR style checks, blocking developer workflows.
- Primary technical constraint del Batch in workflow iterativi: asynchronous model impedisce tool execution mid-request.

**CLI per CI/CD:** Flag -p (--print) per non-interactive. --output-format json + --json-schema per structured output.

**False positive reduction:**
- Se "filtering rejected" è esplicito: include reasoning + confidence assessment inline per ciascun finding.
- Se filtering permesso: temporaneo disable high-FP categories, tieni high-precision.

**Task decomposition per code review:** PR con 14+ file = attention dilution. Split in focused per-file passes + separate integration pass per cross-file data flow.

**Multi-instance verification:** Same-instance self-review ha stesso blind spot. Second independent instance senza accesso al reasoning del generator.

**Incremental review (post-fix push):** Includere prior review findings nel context + istruire a riportare solo new or unaddressed issues.

### Code Generation with Claude Code (Domain 3+4)

**Configurazione hierarchy:**
- ~/.claude/CLAUDE.md = user-level, personale
- &lt;project&gt;/.claude/CLAUDE.md = project-level, version-controlled
- Per team-wide consistency: sempre project-level

**CLAUDE.md vs Skills vs Rules:**
- CLAUDE.md: always-loaded universal context. Coding standards, testing conventions
- Skills (.claude/skills/SKILL.md): on-demand by task type via trigger keywords. PR review, deployment, migration
- Rules (.claude/rules/*.md): conditional by file path via glob pattern. React conventions per .tsx, API conventions per src/api/**

**Skill frontmatter — 3 feature chiave:**
- argument-hint: prompt for required parameters at invocation
- context: fork: isolate execution in subagent context
- allowed-tools: restrict tool access

**Slash command location:**
- Project-scoped: .claude/commands/ in repo (version-controlled, automatic)
- Personal: ~/.claude/skills/ con nome diverso se esiste già project-level

**Plan mode vs direct execution:**
- Plan mode: complex architectural restructuring, ambiguous requirements, multiple valid approaches
- Direct execution: change ben definito, scope chiaro, no ambiguità

**Subagent delegation strategy:** Explore subagent per fase di discovery verbosa → isola output, ritorna summary al main context.

**MCP server integration:** Project-scoped .mcp.json + environment variable expansion (${GITHUB_TOKEN}) + README docs.

**Iterative refinement per ambiguità:** Misinterpretazione prose description = 2-3 concrete input-output examples. JSON schema valida la forma, non insegna la trasformazione.

### Built-in tools di Claude Code

| Tool | Scopo | Quando usarlo |
|---|---|---|
| Grep | Cerca CONTENUTO nei file | "Find all callers of X", "Locate error message" |
| Glob | Trova file per PATTERN PATH | "All .test.tsx files", "Tutti i file in src/api/" |
| Read | Carica contenuto di un file | Dopo Grep localizza, per seguire imports |
| Edit | Sostituzione targeted con unique text matching | Fix piccolo in file grande |
| Write | Sovrascrive INTERO file | Nuovo file, fallback quando Edit fails |
| Bash | Esegue comandi shell | npm test, git diff, build scripts |

**Workflow canonico di esplorazione codebase:**
1. Grep per trovare entry point
2. Read sul file trovato per capire struttura
3. Glob solo per enumerare file per tipo
4. Iterate

**Edit fallback pattern:** Quando Edit fallisce con "no unique match", usa Read + Write integrale.

**Anti-pattern principale:** Leggere TUTTI i file upfront esaurisce context senza beneficio.

**Distinzione Grep vs Glob:**
- Glob risponde "dove sono i file con questo nome/estensione?"
- Grep risponde "in quali file appare questo testo?"

## Checklist mentale durante l'esame

Per ogni domanda, in ordine:

1. Leggi il verbo della domanda: root cause / best approach / first step / primary constraint / most maintainable
2. Identifica vincoli espliciti dello scenario ("stakeholders rejected X", "X is well-configured", numeri specifici come 94% single-X accuracy)
3. Elimina opzioni che violano vincoli espliciti, anche se sofisticate
4. Se è root cause question, elimina opzioni formulate come prescrizioni ("requires X", "needs Y")
5. Tra le rimanenti, applica gerarchia di proporzionalità: prompt-level sopra structural change quando capability esiste
6. Se ancora ambiguo, peso quale fix è più preventiva e robusta
7. Fidati del tuo istinto se hai usato i signal specifici

## Anti-pattern di reasoning da evitare

- "Multi-X = decomposition automatico" senza controllare single-X accuracy
- "Hook è sempre meglio di prompt" senza controllare se il modello ha già la capability
- "Composite tools per workflow ricorrente" quando parallel tool use risolve gratis
- "Architectural fix > prompt fix" come pattern automatico. Cyberskill premia il contrario.
- Confondere CLAUDE.md feature (CLAUDE.md, .claude/commands/, .mcp.json) con Claude API feature (tool_use, tool_choice, stop_reason, hooks dell'Agent SDK)
- Confondere "training data examples" (fine-tuning, fuori scope) con "few-shot examples" (prompt-level, ampiamente in scope)
- Quando "fine-tune" appare come opzione, quasi sempre distractor sbagliato (fuori scope CCA-F)

## Gestione tempo all'esame

- 120 minuti per 60 domande = 2 min/domanda di media
- Se una domanda ti tiene fermo >3 min, marca per review e vai avanti
- Lascia 10 minuti finali per review delle marcate
- Non cambiare risposte già date a meno di errore evidente. Prima intuizione spesso è corretta
- Trust your first instinct when reasoning has been applied correctly
