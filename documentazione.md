# CCA-F — Documentazione di studio

Questo è un documento sintetico per il ripasso pre-esame. Raccoglie i pattern decisionali, le lezioni cristallizzate e le mappe per dominio.

## Status di partenza

Il punteggio ottenuto nel Practice Exam ufficiale Anthropic è 816/1000. La soglia di passaggio è 720, quindi il margine attuale è di +96 punti. Lo score corrente su Cyberskill è 920.

## Il framework decisionale principale

### Lettura del verbo della domanda

Prima di tutto, leggi il verbo della domanda e applica i filtri grammaticali corrispondenti:

**Root cause / most likely cause** → Cerca le opzioni formulate come diagnosi (per esempio "X creates Y", "the system contains Z"). Scarta invece le opzioni prescrittive (per esempio "model requires X", "descriptions need Y", "should be fine-tuned"): le prescrittive sono fix mascherate da diagnosi e vanno eliminate a priori.

**Most effective approach / best way to** → Valuta la proporzionalità, cioè il minimal change che risolve il problema. Scarta l'overengineering quando la capability esiste già.

**Primary technical constraint / why does this not work** → Cerca un'impossibilità strutturale, non semplicemente il "concern principale". Per esempio, la Batch API è asynchronous e fire-and-forget, e questo impedisce la tool execution mid-request.

**First step / initial diagnostic action** → Cerca la prima azione tattica più leggera. Spesso è "review tool descriptions" prima di "redesign architecture".

**Most maintainable approach** → Premia la facilità di manutenzione: meno componenti custom e più centralizzazione.

### Gerarchia Cyberskill di proporzionalità della fix

Le opzioni sono elencate in ordine, dalla più leggera alla più pesante. Per impostazione predefinita, scegli l'opzione più in alto nella lista che risolve il problema dichiarato.

1. **Prompt-level guidance / istruzione** — Il modello ha già la capability, gli manca solo il pattern. È il caso, per esempio, del parallel tool use, del batching o dei criteri di escalation.

2. **Tool description rewrite** — La selezione è ambigua tra tool simili.

3. **Few-shot examples** — C'è un pattern recognition gap su scenari prevedibili. Questa fix insegna la struttura, la sequenza e i criteri di decisione.

4. **Self-critique con checklist esplicita** — Serve un completeness check su criteri enumerabili (per esempio policy, timeline, next steps) che variano case-by-case.

5. **Tool scope restriction** — Un tool generale viene abusato. Lo sostituisci con un tool scoped.

6. **Hook architettonico (Pre/PostToolUse)** — Serve una hard rule deterministica, come un authorization threshold, un prerequisite check o una format normalization.

7. **Decomposition pre-execution** — Da usare solo quando la single-X accuracy è bassa oppure quando il multi-X è catastrofico (un drop superiore a 30 punti). Non usarla mai se la single-X è ≥ 90%.

8. **Composite tools / structural redesign** — È l'ultima risorsa ed è quasi mai la risposta giusta.

## Le tre cause di comportamento sbagliato del modello

Quando una domanda chiede la root cause di un pattern systematic, devi distinguere tra tre famiglie di cause diverse.

### Causa 1 — Training prior del modello

**Cosa significa:** Durante il training del modello, sono stati instillati comportamenti cauti su certe categorie di dato. Per esempio il modello è stato addestrato ad essere prudente su transazioni finanziarie ad alto importo, su informazioni mediche, su decisioni che coinvolgono soldi importanti. Questi comportamenti sono dentro il modello, indipendenti dal prompt.

**Come si comporta il modello:** Applica un'azione prudente in modo sistematico ogni volta che incontra quella categoria di dato. Lo fa anche se il prompt dice esplicitamente di procedere senza prudenza extra. Il bias del training prevale sull'istruzione esplicita del prompt.

**Come lo riconosci nello scenario:**
- Il pattern è legato a un attributo intrinseco del dato (importo monetario, sensibilità, gravità, valuta straniera, demografia)
- Lo scenario dichiara esplicitamente che prompt e tool descriptions sono chiari
- Il comportamento sbagliato è un'azione conservativa: "verifies unnecessarily", "escalates inappropriately", "asks for additional confirmation systematically"

**Esempio:** Per un refund sopra i $200, l'agent verifica la purchase_history nel 73% dei casi anche se la policy dice di farlo "solo sopra $500". La combinazione di attributo intrinseco (l'importo), prompt chiaro e comportamento conservativo sistematico indica un training prior.

### Causa 2 — Regola esplicita nel prompt che produce side effect

**Cosa significa:** Nel system prompt c'è scritta una regola esplicita del tipo "quando l'utente dice X, fai Y". Quella regola viene applicata letteralmente dal modello, ma produce comportamenti indesiderati in casi che chi ha scritto la regola non aveva previsto.

**Come si comporta il modello:** Applica con precisione la regola scritta nel prompt ogni volta che vede il trigger. Il comportamento è coerente e sistematico, non esitante. È preciso e ripetibile.

**Come lo riconosci nello scenario:**
- Il pattern è attivato da una parola specifica nel messaggio dell'utente
- Il pattern è binario e sistematico, con percentuali precise (per esempio "78% delle volte quando è presente 'account', 93% quando è assente")
- Il comportamento è sicuro e ripetibile, non esitante

**Esempio:** Con la terminologia "account", l'agent chiama get_customer nel 78% dei casi quando l'utente scrive "account", e ricorre a lookup_order nel 93% dei casi quando non lo scrive. La combinazione di keyword nel messaggio utente, pattern binario e comportamento sicuro indica una regola esplicita nel prompt.

### Causa 3 — Mancanza di guidance nel prompt

**Cosa significa:** Nel system prompt non c'è scritto cosa il modello deve fare in un certo caso. Non c'è una regola per quel caso, non c'è un esempio. È uno spazio vuoto nelle istruzioni.

**Come si comporta il modello:** Quando incontra il caso non coperto, non sa come decidere, quindi sceglie un comportamento di sicurezza generico. Tipicamente chiede chiarimenti all'utente, oppure ripiega sul comportamento più comune che conosce.

**Come lo riconosci nello scenario:**
- Nel testo compaiono parole come "asks for clarification", "defaults to X", "uncertain how to proceed"
- Il modello mostra esitazione, non sicurezza sbagliata
- Negli altri casi simili, il modello funziona bene

**Esempio:** Di fronte a una multi-order request ("my orders from last week have issues"), l'agent chiama get_customer nel 41% dei casi e chiede chiarimenti. Dato che il caso single-order è ben gestito (96%), mentre il multi-order non è coperto, si tratta di un guidance gap.

### Tabella riassuntiva delle tre cause

| Trigger del pattern | Causa | Comportamento del modello | Esempio |
|---|---|---|---|
| Attributo intrinseco del dato | Training prior | Cautious / conservative systematic | Refund $500+ → over-verification |
| Keyword specifica nel messaggio utente | Regola esplicita nel prompt | Sicuro ma sbagliato in modo specifico | "account" → get_customer 78% |
| Caso ambiguo non coperto nel prompt | Guidance gap | Chiede chiarimenti / default fallback | Multi-order → asks clarification |

## Quando usare few-shot vs altre fix

I few-shot examples sono indicati per cinque casi canonical:

1. **Length** — controllano la lunghezza dell'output
2. **Style** — controllano il tono, il registro e la voce
3. **Format** — controllano la struttura, il layout e il posizionamento (per esempio le inline citations)
4. **Edge cases** — gestiscono i pattern atipici che il modello altrimenti non gestisce
5. **Pattern compositivo** — è il caso più ricorrente nelle domande Cyberskill

### Quando NON usare few-shot

I few-shot non risolvono il problema quando al modello manca l'informazione necessaria a runtime per applicare il pattern. Per esempio:

- Un tool ritorna una lista di documenti senza distinguere quelli critical da quelli optional, e tu chiedi al modello di "decidere se procedere o escalare". Il modello non ha l'informazione: serve un tool interface fix, non i few-shot.
- Il modello fabbrica dati assenti perché lo schema richiede quel campo. In questo caso serve un nullable schema, non i few-shot.

### Few-shot vs decomposition pre-execution

| Drop magnitudo | Pattern errore | Fix |
|---|---|---|
| Single-X alto + drop moderato (5-15 punti) | Pattern recognition gap | Few-shot |
| Single-X alto + drop catastrofico (30+) su long context | Tracking/state gap | Decomposition con structured intermediate |
| Single-X basso | Capability gap | Decomposition pre-execution |

### Numero di esempi few-shot

- **3-4 esempi:** è lo standard canonical per la maggior parte dei casi.
- **4-6 esempi:** quando insegni "ambiguous scenarios con reasoning" oppure il decision boundary tra opzioni.
- **5-6+ esempi:** spesso è un anti-pattern (overkill). Verifica se sei davvero in uno scenario di "comprehensive coverage" o se stai semplicemente facendo bloating.

## Self-critique vs Dual-instance review

| Tipo di problema | Pattern |
|---|---|
| Omissione di elementi noti (checklist verificabile) | Self-critique con criteri espliciti |
| Errore di giudizio su decisione complessa | Independent reviewer (dual-instance) |

**Il self-critique funziona quando:**
- I criteri sono enumerabili e verificabili (la policy è presente? la timeline è presente? i next steps sono presenti?)
- Serve una verifica meccanica di presenza/assenza, non una rivalutazione cognitiva
- Le variabili cambiano case-by-case (il signal tipico è "gaps vary by case")

**Il self-critique fallisce quando:**
- Si tratta di decisioni sostantive complesse che richiedono una rivalutazione del reasoning
- Lo stesso context produce gli stessi blind spots
- In questo caso la fix è un'independent instance, senza accesso al reasoning del generator

## Vincoli espliciti dello scenario come hard rule

Le frasi del tipo "stakeholders rejected X", "X is well-configured" o "cannot modify Y" sono regole assolute. Eliminano tutte le opzioni che le violano, anche quelle più sofisticate.

Alcuni esempi pratici:
- "stakeholders rejected filtering" → esclude qualunque forma di suppression, anche quella pattern-based
- "tool descriptions are well-written and unambiguous" → esclude le opzioni che assumono le descriptions come problema
- "developers cannot modify upstream agents" → esclude qualunque fix at the source
- "must maintain thoroughness" → esclude qualunque trade-off che sacrifichi l'analisi

## Mappe per dominio

### Multi-Agent Research System (Domain 1 — 27% peso esame)

**Hub-and-spoke vs Direct A2A:** L'architettura hub-and-spoke vince sempre, perché garantisce observability, consistent error handling e un controllo granulare. Non far mai parlare i subagent direttamente tra loro.

**Error propagation:** Esegui il recovery locale per i transient failures e propaga al coordinator solo ciò che non può essere risolto localmente, sempre con un contesto strutturato che includa il failure type, l'azione tentata, i partial results e gli approcci alternativi.

**Task partitioning:** Il coordinator partiziona il research space prima della delegation, assegnando a ciascun agent distinti subtopics o source types.

**Tool distribution (principle of least privilege):** Il synthesis agent ottiene un verify_fact scoped per i simple lookups, mentre i casi complessi passano attraverso il coordinator.

**Long context position effects:** Quando l'aggregated input è lungo, metti il summary dei key findings all'inizio (per sfruttare l'effetto primacy) e usa section headers per facilitare la navigazione.

**Coverage annotation:** Quando un subagent ritorna risultati parziali, il synthesis output struttura i findings con una coverage annotation che distingue ciò che è well-supported dalle gaps.

**Conflict handling:** Quando l'analisi di un documento trova due fonti contraddittorie, completa l'analisi includendo entrambe, annota il conflict con la source attribution e lascia la decisione di reconciliation al coordinator.

**Access failure vs valid empty:** Un timeout (access failure) e un risultato "0 results" (valid empty) sono semanticamente distinti. Il coordinator deve distinguerli per applicare la fix appropriata.

### Customer Support Resolution Agent (Domain 1+2 mix)

**Tool selection reliability — gerarchia diagnostica:**
1. Le tool descriptions sono chiare e distinguono il purpose? In caso contrario, espandile con input formats, example queries, edge cases e boundaries.
2. Le descriptions sono chiare ma la confusion persiste? Allora usa few-shot con 4-6 esempi che mirano agli ambiguous scenarios, accompagnati dal reasoning.
3. C'è un systematic keyword-triggered pattern? Allora rivedi il system prompt alla ricerca di una routing logic implicita.

**Multi-step workflow enforcement:** Quando c'è un hard sequence requirement, usa un PreToolUse hook con un prerequisite check, in modo programmatico e deterministico.

**Format normalization da MCP tools:** Usa un PostToolUse hook che intercetta i tool results e applica le trasformazioni.

**Conversation context management:** La progressive summarization è lossy per i dettagli precisi. Estrai quindi i transactional facts (amounts, dates, order numbers) in un blocco persistente di "case facts".

**Ambiguous result handling:** Quando get_customer ritorna multiple matches, chiedi un additional identifier (email, phone o order number).

**Escalation decisions:** L'escalation è legittima quando la policy è silente, ma non quando la policy esiste ed è semplicemente scomoda.

**Multi-concern (94% single → 58% multi):** Una single-X accuracy alta indica che la capability è presente. Il drop sul multi è quindi un pattern recognition gap. I few-shot insegnano il pattern compositivo.

**Self-critique evaluator-optimizer:** Usalo quando i criteri di completeness sono enumerabili (policy, timeline, next steps) e le gap variano case-by-case.

**Agentic loop fundamentals:** Quando stop_reason è "tool_use" devi continuare; quando stop_reason è "end_turn" devi terminare. Non fare mai il parsing del content.

### Claude Code for CI (Domain 3)

**Batch API vs synchronous:**
- La Batch API arriva fino a 24h, non ha SLA, garantisce un 50% di cost saving ed è async fire-and-forget. È adatta al technical debt overnight, ai weekly security audits e alla nightly test generation.
- L'approccio sync è adatto ai pre-merge checks, ai PR style checks e ai blocking developer workflows.
- Il primary technical constraint della Batch API nei workflow iterativi è che il modello asynchronous impedisce la tool execution mid-request.

**CLI per CI/CD:** Usa il flag -p (--print) per la modalità non-interactive. Per lo structured output, usa --output-format json insieme a --json-schema.

**False positive reduction:**
- Se "filtering rejected" è esplicito, includi reasoning e confidence assessment inline per ciascun finding.
- Se invece il filtering è permesso, disabilita temporaneamente le categorie high-FP e mantieni quelle high-precision.

**Task decomposition per code review:** Una PR con 14+ file causa attention dilution. Suddividila quindi in focused per-file passes, più un separate integration pass per il cross-file data flow.

**Multi-instance verification:** Una same-instance self-review ha lo stesso blind spot. Serve quindi una second independent instance, senza accesso al reasoning del generator.

**Incremental review (post-fix push):** Includi i prior review findings nel context e istruisci il modello a riportare solo i new or unaddressed issues.

### Code Generation with Claude Code (Domain 3+4)

**Configurazione hierarchy:**
- `~/.claude/CLAUDE.md` è il livello user, personale.
- `&lt;project&gt;/.claude/CLAUDE.md` è il livello project, version-controlled.
- Per la team-wide consistency, usa sempre il livello project.

**CLAUDE.md vs Skills vs Rules:**
- CLAUDE.md fornisce un universal context sempre caricato, adatto a coding standards e testing conventions.
- Le Skills (`.claude/skills/SKILL.md`) sono caricate on-demand in base al task type tramite trigger keywords, ed è il caso di PR review, deployment e migration.
- Le Rules (`.claude/rules/*.md`) sono condizionali in base al file path tramite glob pattern, per esempio le React conventions per i `.tsx` e le API conventions per `src/api/**`.

**Skill frontmatter — 3 feature chiave:**
- `argument-hint`: richiede i required parameters al momento dell'invocazione.
- `context: fork`: isola l'execution in un subagent context.
- `allowed-tools`: restringe il tool access.

**Slash command location:**
- Project-scoped: in `.claude/commands/` nel repo (version-controlled e automatico).
- Personal: in `~/.claude/skills/`, con un nome diverso se esiste già a livello project.

**Plan mode vs direct execution:**
- Usa il plan mode per complex architectural restructuring, requirements ambigui o quando esistono multiple valid approaches.
- Usa la direct execution quando il change è ben definito, lo scope è chiaro e non c'è ambiguità.

**Subagent delegation strategy:** Usa un Explore subagent per la fase di discovery verbosa, in modo da isolare l'output e ritornare solo un summary al main context.

**MCP server integration:** Usa un `.mcp.json` project-scoped, con environment variable expansion (per esempio `${GITHUB_TOKEN}`) e docs nel README.

**Iterative refinement per ambiguità:** Quando il modello misinterpreta una prose description, fornisci 2-3 concrete input-output examples. Il JSON schema valida la forma, ma non insegna la trasformazione.

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
1. Usa Grep per trovare l'entry point.
2. Usa Read sul file trovato per capirne la struttura.
3. Usa Glob solo per enumerare i file per tipo.
4. Itera.

**Edit fallback pattern:** Quando Edit fallisce con "no unique match", usa Read seguito da una Write integrale.

**Anti-pattern principale:** Leggere TUTTI i file upfront esaurisce il context senza alcun beneficio.

**Distinzione Grep vs Glob:**
- Glob risponde alla domanda "dove sono i file con questo nome o estensione?".
- Grep risponde alla domanda "in quali file appare questo testo?".

## Checklist mentale durante l'esame

Per ogni domanda, procedi in quest'ordine:

1. Leggi il verbo della domanda: root cause, best approach, first step, primary constraint o most maintainable.
2. Identifica i vincoli espliciti dello scenario ("stakeholders rejected X", "X is well-configured", numeri specifici come una single-X accuracy del 94%).
3. Elimina le opzioni che violano i vincoli espliciti, anche se sofisticate.
4. Se è una root cause question, elimina le opzioni formulate come prescrizioni ("requires X", "needs Y").
5. Tra le opzioni rimanenti, applica la gerarchia di proporzionalità: il prompt-level sta sopra lo structural change quando la capability esiste già.
6. Se la scelta è ancora ambigua, valuta quale fix è la più preventiva e robusta.
7. Fidati del tuo istinto se hai usato i signal specifici.

## Anti-pattern di reasoning da evitare

- Concludere "Multi-X = decomposition automatico" senza controllare la single-X accuracy.
- Concludere "l'hook è sempre meglio del prompt" senza controllare se il modello ha già la capability.
- Scegliere "composite tools per workflow ricorrente" quando il parallel tool use risolve gratis.
- Applicare "architectural fix > prompt fix" come pattern automatico: Cyberskill premia il contrario.
- Confondere le feature di CLAUDE.md (CLAUDE.md, `.claude/commands/`, `.mcp.json`) con le feature della Claude API (tool_use, tool_choice, stop_reason, hooks dell'Agent SDK).
- Confondere i "training data examples" (fine-tuning, fuori scope) con i "few-shot examples" (prompt-level, ampiamente in scope).
- Quando "fine-tune" appare come opzione, è quasi sempre un distractor sbagliato (è fuori scope CCA-F).

## Gestione tempo all'esame

- Hai 120 minuti per 60 domande, quindi una media di 2 minuti per domanda.
- Se una domanda ti tiene fermo per più di 3 minuti, marcala per la review e vai avanti.
- Lascia 10 minuti finali per la review delle domande marcate.
- Non cambiare le risposte già date, a meno di un errore evidente: la prima intuizione è spesso quella corretta.
- Fidati del tuo primo istinto quando hai applicato il reasoning in modo corretto.

## Allineamento alla guida ufficiale CCA-F

Questa sezione integra i contenuti sopra con i dettagli della *Claude Certified Architect – Foundations Certification Exam Guide* ufficiale (v0.1). I domini e i pesi coincidono con quanto già usato; qui si aggiungono i topic specifici che la guida testa esplicitamente.

### Domini e pesi ufficiali

- Domain 1 — Agentic Architecture & Orchestration (27%)
- Domain 2 — Tool Design & MCP Integration (18%)
- Domain 3 — Claude Code Configuration & Workflows (20%)
- Domain 4 — Prompt Engineering & Structured Output (20%)
- Domain 5 — Context Management & Reliability (15%)

All'esame vengono presentati 4 scenari su 6, scelti a caso. I sei scenari ufficiali: Customer Support Resolution Agent; Code Generation with Claude Code; Multi-Agent Research System; Developer Productivity with Claude; Claude Code for CI/CD; Structured Data Extraction. (Nel pool dell'app "Document Processing" copre lo scenario di Structured Data Extraction e "General"/"Code Generation" coprono Developer Productivity.)

### Subagent spawning e gestione sessione (Agent SDK)

- **Task tool + allowedTools:** per spawnare un subagent, il coordinator DEVE avere `"Task"` nei suoi `allowedTools`. Se manca, il modello ripiega facendo tutto da solo.
- **AgentDefinition:** la descrizione, il system prompt e le tool restrictions di ogni subagent si configurano nel codice dell'Agent SDK (non in CLAUDE.md).
- **Contesto esplicito:** i subagent NON ereditano la conversation history del coordinator; il contesto va passato esplicitamente nel prompt. Per il passaggio tra agenti, separa il content dai metadata (source URL, nomi documento, date) per preservare l'attribuzione.
- **Parallel spawning:** spawnare più subagent in parallelo significa emettere più `Task` tool call in una singola response del coordinator, non in turni separati.
- **`--resume <session-name>`:** riprende una sessione nominata quando il contesto precedente è in gran parte valido; informa esplicitamente l'agente dei file cambiati per una rianalisi mirata.
- **`fork_session`:** crea rami indipendenti da una baseline condivisa per esplorare approcci divergenti (per esempio due strategie di refactoring) senza contaminazione.
- **Resume vs nuova sessione:** se i tool result precedenti sono ormai stale, conviene una nuova sessione con un summary iniettato, invece di riprendere con risultati obsoleti.

### tool_choice (API)

- `"auto"`: il modello può chiamare un tool oppure rispondere con testo.
- `"any"`: il modello DEVE chiamare un tool (ma sceglie quale); usalo per garantire un output strutturato.
- Forced selection `{"type": "tool", "name": "..."}`: forza un tool specifico (per esempio `extract_metadata` prima degli enrichment tool), per poi tornare a `"any"` nei turni successivi.

### Errori strutturati MCP (oltre `isError`)

Ritorna metadata strutturati: `errorCategory` (transient / validation / business / permission), un boolean `isRetryable` e un messaggio human-readable. In questo modo l'agente ritenta solo i transient, comunica le business rule (per esempio un refund oltre il limite diventa `isRetryable: false`) e non spreca retry su input non validi. Gli errori generici ("Operation failed") nascondono il contesto e impediscono un recovery intelligente.

### Structured output con tool_use

- L'uso di `tool_use` con un JSON schema rigoroso produce un output schema-compliant ed elimina gli errori di **sintassi** JSON.
- Lo schema NON previene gli errori **semantici** (per esempio dei line item che non sommano correttamente): per questi serve la self-correction (estrai `calculated_total` accanto a `stated_total` e aggiungi `conflict_detected`).
- Schema design: distingui i campi `required` da quelli `optional`, usa campi `nullable` per le informazioni che potrebbero mancare (così previeni le hallucination), usa enum con un valore `"other"` più un campo detail per le categorie estensibili, e un enum `"unclear"` per i casi ambigui.
- Retry-with-error-feedback: rimanda il documento insieme all'estrazione fallita e all'errore di validazione specifico. I retry NON aiutano se l'informazione è assente dal documento (a differenza degli errori di formato o struttura).

### CLAUDE.md, comandi e contesto (Claude Code)

- **`@import`:** referenzia file esterni per tenere CLAUDE.md modulare (ogni package importa solo gli standard rilevanti).
- **`/memory`:** verifica quali file di memoria/CLAUDE.md sono effettivamente caricati, per diagnosticare i problemi di config loading.
- **`/compact`:** riduce l'uso del contesto durante le sessioni lunghe, quando la finestra si riempie di output verboso (la context degradation non si auto-corregge).
- **Scratchpad files:** persistono i key findings tra i confini di contesto, per contrastare la degradation nelle sessioni estese.

### Batch processing (Domain 4)

- La Message Batches API offre un 50% di risparmio, una finestra fino a 24h, nessuna SLA di latenza e un `custom_id` per correlare richiesta e risposta. NON supporta il tool calling multi-turn in una singola richiesta.
- È adatta a report overnight, audit settimanali e generazione test notturna. Non è adatta ai check pre-merge bloccanti.
- Gestione fallimenti: ri-sottometti solo i documenti falliti (identificati dal `custom_id`), eventualmente con modifiche (per esempio il chunking dei documenti troppo grandi). Calibra la frequenza di sottomissione sulla SLA.

### Affidabilità e human review (Domain 5)

- **Confidence calibration:** calibra i confidence a livello di campo su un validation set etichettato e analizza l'accuratezza segmentata per tipo di documento e per campo (una metrica aggregata, per esempio il 97%, può mascherare segmenti deboli).
- **Stratified random sampling:** campiona le estrazioni high-confidence per misurare nel tempo l'error rate e intercettare i pattern di errore nuovi prima di ridurre la revisione umana.
- **Multi-instance verification:** un'istanza indipendente (senza il reasoning del generatore) è più efficace del self-review per individuare i problemi sottili.
- **Escalation:** è legittima quando il cliente la chiede esplicitamente, quando la policy è silente o ha gap, o quando l'agente non riesce a progredire. Il sentiment e la confidence auto-dichiarata sono proxy inaffidabili della complessità del caso. Di fronte a match multipli, chiedi un identificatore aggiuntivo.

### In-scope (ribadito) e Out-of-scope (distractor tipici)

**In-scope:** agentic loop con `stop_reason`, orchestrazione coordinator-subagent, context passing esplicito, tool interface design, MCP (server, tool, resource, `isError`, `.mcp.json`, env var expansion), error handling strutturato, escalation, CLAUDE.md hierarchy + `@import` + `.claude/rules/` glob, slash commands e skills (`context: fork`, `allowed-tools`, `argument-hint`), plan mode, iterative refinement, structured output via `tool_use`/`tool_choice`, few-shot, batch processing, context window management, human review/confidence calibration, information provenance.

**Out-of-scope (se appaiono come opzione, sono quasi sempre distractor):** fine-tuning o training di modelli custom; autenticazione/billing/account API; deploy/hosting di MCP server (infra, networking, container); architettura interna/training/pesi del modello; Constitutional AI, RLHF; embedding/vector DB; computer use e analisi immagini/vision; streaming/SSE; rate limit/quote/pricing; OAuth/rotazione chiavi; config cloud specifiche (AWS/GCP/Azure); benchmarking; dettagli implementativi del prompt caching; algoritmi di tokenizzazione. Nota ricorrente: **fine-tuning** e **higher-tier model** come "fix" sono quasi sempre risposte sbagliate nel framework CCA-F.
