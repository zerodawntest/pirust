# Durable sessions, Chord, and the SDK: an inventory (for the Rust port)

Status: completed source-backed inventory; proposed Rust pieces are explicitly marked NEEDED, not claimed as built.

Scope: the three sources the ticket names — `pi-durable-cloudflare` (the Cloudflare Durable Object app, 18 files, 4,215
lines), `chord` (315 files, 66,954 lines), and the SDK (`packages/coding-agent/src/core/sdk.ts` + `docs/sdk.md` +
`examples/sdk/*`, inside coding-agent's 265 files / 78,772 lines) — and how a durable session maps onto pi core
(`packages/agent` = `@earendil-works/pi-agent-core`, 6 files / 2,548 lines, plus `packages/ai` = `@earendil-works/pi-ai`,
211 files / 29,110 lines). All pi packages are version 1.5.2; `pi-durable-cloudflare` pins `1.5.2` of
`@earendil-works/{chord,pi-ai,pi-durable,pi-schema}` and is the only complete, tested durable app in the sources.

Evidence notation: `D` = `packages/durable/src`, `DD` = `packages/durable/docs/spec.md` (7,296 lines, normative),
`C` = `packages/chord/src`, `CD` = `packages/chord/docs/design.md`, `S` = `packages/coding-agent/src/core`,
`SD` = `packages/coding-agent/docs/sdk.md`, `SE` = `packages/coding-agent/src/core/extensions/types.ts` (2,358 lines),
`CF` = `pi-durable-cloudflare/src`. `EXISTS-*` names a working mechanism in the TypeScript sources; `NEEDED` is a
missing Rust seam; `RUST` = the Rust crate that must own it.

## 1. Conclusion before the inventory

1. **Two session stacks, not one.** The SDK's session (`S/agent-session.ts`, 4,578 lines) is pi core's
   `Agent` (in-memory `AgentMessage[]`, `prompt()` blocks until the run ends) plus `SessionManager` (JSONL, tree with an
   active leaf, `S/session-manager.ts:995+`, `CURRENT_SESSION_VERSION = 3`). The durable stack (`D`) replaces that loop
   with `Harness` + `Conversation` + Chord; it does not import `pi-agent-core` (its only reference is a comment,
   `D/harness/generation.ts:839`). So "durable session" is not an add-on to pi core: it is a second implementation of
   the same loop where every step is committed before it is observed. The port must pick the durable stack as the
   session runtime and re-expose the SDK surface (`prompt/steer/followUp/abort/waitForIdle/compact`) over it. The Rust
   `Agent` handle is then stateless: `Conversation { id }` owns nothing; the session line owns the state.
2. **The transcript types are compatible.** pi core exchanges `Message` (pi-ai); durable stores entries whose
   `model: readonly Message[]` field carries exactly those messages (`D/entries.ts`, `CF/client/session-state.ts`). The
   mapping is therefore one-directional and cheap: pi core's in-memory array becomes an append-only entry line, and the
   SDK's `state.messages` is a projection of it.
3. **Chord is far bigger than durable needs.** Durable uses a narrow slice: typed contracts and `Context`, documents
   (`C/documents`), the transactional JSON tracker and op stream (`C/delta`), the store (`C/store`), links
   (`C/link`), and `watch` (`C/watch.ts`). Chord's `src/node/*` (14,620 lines: the app kit, surfaces, plugin
   install/reload, workers, HTTP) and `src/react`, `src/tui`, `src/surfaces` are app machinery, not session semantics.
   The port should implement the durable slice first (documents, store, delta, watch, context, links ≈ 21k TS lines)
   and keep the surfaces behind it.
4. **Only the Cloudflare app proves the loop end to end.** It is the reference for restart recovery, the view protocol
   (`conversation.watch()` → ops → `ConversationTranscript`), scheduled instructions, and search across conversations;
   its 11 test files (2,769 lines) are the acceptance suite for the Rust port (`test/recovery.test.ts` is the closest
   thing to a contract for "crash mid-turn").
5. **Nothing durable exists in Rust yet.** Every row below marked NEEDED is a real gap: the port has no session
   storage, no task runtime, no watch protocol, and no view projection.

## 2. What is in the three sources

### 2.1 pi-durable (the durable session runtime)

| ID | Piece | Where | Rust |
| --- | --- | --- | --- |
| D-SESSION | `Session`: one mutation line; `createSession()`, `commit(tx)`, `scanConversations`/`scanEntries`/`scanTasks`/`scanSubmissions`/`scanDocuments`, `observeCommits`, `close` | `D/session/session.ts` (2,105), `D/session/transaction.ts` (1,344) | NEEDED (`crates/pi-durable/src/session`) |
| D-RECORDS | records: `ConversationRecord`, `EntryRecord` (`{id, conversationId, kind, model?: Message[], data}`), `TaskRecord`, `SubmissionRecord`, `DocumentRecord`; ids are branded numbers; `ROOT_CONVERSATION_ID = 1` | `D/types.ts:979-1314`, `DD` §2 | NEEDED |
| D-DOCDEF | `defineDoc`/`defineDocFamily` (typed JSON docs, `scope: "session" \| "conversation" \| "task"`, `initial`, `checkpointWhen`, `initialOnly`) | `D/documents.ts` (208) | NEEDED |
| D-ENTRYDEF | `defineEntry`, `UserEntry`/`AssistantEntry`/`ToolResultEntry`/`SystemEntry`/`ResetEntry`/`CompactionEntry`, `TypedEntry.is()` | `D/entries.ts` (34) | NEEDED |
| D-CONV | `Conversation`: `submit(draft, ctx)`, `entries(query, limit, cursor, ctx)`, `watch(ctx)`, `abort`, `reset(handoff)`, `compact` | `D/session/session.ts`, `DD` §6, §8 | NEEDED |
| D-SUBMIT | `SubmissionDraft`: `input` (`content`, `requestId`, `whenBusy: steer\|followUp\|reject`, `whenIdle: "reject"`, `onAbort`, `entry: {kind, data}`), `write`, `continue` | `D/harness/types.ts:78-133` | NEEDED |
| D-SUBMISSION | `Submission`: `id`, `status(ctx)`, `wait(ctx) → {status: "done" \| "unanswered"}`, `abort(ctx)` | `D/harness/types.ts:135-142` | NEEDED |
| D-TASKS | `defineTask`: a durable state machine `{phase: string}` with `run` phases, checkpoints, `restartLimit`, `trace`; `tasks.resume()` | `D/tasks.ts`, `D/harness/scheduler.ts` (3,375) | NEEDED |
| D-GEN | built-in `pi.generation` task: one request → assistant entry → tool calls → next turn; owns its `pi.tool` children | `D/harness/generation.ts` (1,369) | NEEDED |
| D-TOOL | `ToolRegistration` (`{name, description, parameters: Schema, execute, replay: "safe" \| "unsafe", deferred, structuredOutputSchema, control, render}`); `pi.tool` task; nested calls via `api.executeTool` | `D/harness/types.ts:426`, `D/harness/tool.ts` (1,497) | NEEDED |
| D-EXT | `defineExtension` (tools + sections + hooks + wraps + tasks), `createRegistry`, `registry.install`, `registryReader` | `D/harness/define.ts`, `D/harness/registry.ts` | NEEDED |
| D-HOOKS | hooks: `beforeRequest`, `beforeProviderRequest`, `afterResponse`, `onYield`, `afterTools`, `afterRun`, `beforeTool` (blocks/sleeps → parks), `afterTool`, `beforeCompact`; `HookApi.memo`, `hookTask` | `D/harness/types.ts:1090-1240`, `D/harness/parks.ts` | NEEDED |
| D-AGENT | per-conversation `AgentState` (`extensions`, `tools`, `modelTools`, `model`, `thinkingLevel`, `instructions`, `cwd`, `maxTurns`, `compaction`), `configure(tx, id, agent)`, `pi.agent` doc, `section()`, `wrapSection`/`wrapTool` | `D/harness/agent.ts` (391) | NEEDED |
| D-VIEW | `ConversationView` (run, streamed answer, tool progress, queue, agent, usage) + `ConversationTranscript` (client-side rebuild); `watch()` returns `WatchHandle<ConversationView>`; paged `entries` | `D/harness/view.ts` (393), `D/harness/transcript.ts` (285) | NEEDED |
| D-WAKE | `Harness.wake(): {active, at?}`, `onWake`; the harness owns no timer: the host arms the platform timer | `D/harness/types.ts`, `CF/src/session.ts:640` | NEEDED |
| D-STORE | storage adapters: `MemoryStorage`, `openNodeSqliteStorage`, `openDurableObjectSqliteStorage` (both over `chord/sqlite`), JSONL, IndexedDB | `D/storage/*`, `C/sqlite/*` | NEEDED |
| D-USAGE | `pi.usage` doc, `Harness.usage()`, `UsageState` | `D/harness/usage.ts` | NEEDED |
| D-SIGNALS | `defineSignal`, `SignalKey`, `SignalState`, `SubmissionSettled` (durable inter-task signals) | `D/signals.ts` (313) | NEEDED |
| D-CODEMODE | code mode and `tool_search` as extensions | `D/codemode/*`, `D/tool-search/*` | NEEDED (later) |

### 2.2 Chord (the substrate a durable session runs on)

| ID | Piece | Where | Rust |
| --- | --- | --- | --- |
| C-CTX | `Context` carries `abortSignal`, `telemetry`, and typed values; `BACKGROUND_CONTEXT`, `withTelemetry`, `traceIn`, `awaitWithContext`; every async call takes it | `C/context/index.ts` | NEEDED |
| C-CONTRACTS | typed contracts: `local`/`remote`, `method`, `obj`/`str`/`int`/`opt` builders, fingerprints, evolution | `C/contracts/*` (2,409) | NEEDED (partial: only what durable uses) |
| C-DELTA | transactional tracker `track()`, `beginChange/prepare/adopt`, structural diff, `applyImmutable(base, ops)`, `PendingOps` folding; the wire encoder for op batches | `C/delta/*` (3,969) | NEEDED |
| C-DOCS | document runtime: addresses, residency, keyed slots, fences, `materializeDocument`, persistence hooks | `C/documents/*` (2,467) | NEEDED |
| C-WATCH | `Watch<T>`/`NativeWatch<T>`, one asynchronous listener per handle, coalescing (10,000-op cap → one root replacement), `WatchEnd {stopped, aborted, ended, listener_error, failed}`, `retired` | `C/watch.ts` | NEEDED |
| C-LINK | links: `memoryLinkPair`, `ipcLink`, `webSocketLink`; a reference is live, works locally and across links, and keeps its object alive | `C/link/*` (2,235) | NEEDED |
| C-STORE | store: tables, indexes, one writer per host, outbox, snapshots, restore from archive | `C/store/*` (9,403) | NEEDED |
| C-SYNC | `uploadSession`/`pullSession`/`foldSession`, `FlushScheduler`, directory-backed `SyncFileSystem` (dev/test) | `C/sync/*` (1,283) | NEEDED (defer; no Rust consumer yet) |
| C-REG | registries: one contribution per contributor, `compose`, writable contributions | `C/registries/*` (901) | NEEDED |
| C-HTTP | `Http` registry (routes, wraps by phase, `sockets`, `relays`, `framers`, `csp`, `bytes` with ranges), `Authenticators`, Node listener | `C/node/http/*`, `CD` §23 | NEEDED (later) |
| C-WORKERS | `createWorkers` (fork per address, start on demand, idle stop), `workerMain`, `processLock` | `C/node/workers/*` | NEEDED (later) |
| C-PLUGINS | discovery, esbuild builds, `buildFacet`, watcher, rollouts, `installPlugin`, `testPlugin` | `C/node/plugins/*` | NEEDED (later) |
| C-SURFACES | `webSurface`, `tuiSurface`, React hooks (`useHold`, `useWatch`, `useRegistry`, `usePageState`), TUI launcher and sandbox | `C/surfaces/*`, `C/react/*`, `C/tui/*` | NEEDED (later) |
| C-SQLITE | `SqliteDatabase`/`SqliteExecutor`, `applySqliteMigrations`, `DurableObjectSqliteDatabase` | `C/sqlite/*` (520) | NEEDED |
| C-OUT | `OutputBuffer` (head/tail window, `OutputLimits`, `OutputSkip`), `boundOutput`, `sanitizeOutput`, `Progress` | `C/output.ts` | NEEDED |
| C-TEL | telemetry contracts and the SQLite adapter (buffered spans, metric intervals, retention) | `C/telemetry-sqlite/*`, `packages/telemetry` | NEEDED (later) |

### 2.3 The SDK (in-process embedding; the surface the port must reproduce)

| ID | Piece | Where | Rust |
| --- | --- | --- | --- |
| S-CREATE | `createAgentSession(options)` → `{session, extensionsResult, modelFallbackMessage}`; wires `ModelRuntime`, `SettingsManager`, `SessionManager`, `DefaultResourceLoader`, default tools | `S/sdk.ts:191-481`, `SD` | NEEDED |
| S-SESSION | `AgentSession`: `prompt` (blocks; throws if a run is active), `steer`, `followUp`, `sendUserMessage`, `clearQueue`, `getSteeringMessages`/`getFollowUpMessages`, `abort`, `waitForIdle`, `setModel`/`cycleModel`, `setThinkingLevel`/`cycleThinkingLevel`/`getAvailableThinkingLevels`/`supportsThinking`, `compact`/`abortCompaction`/`abortBranchSummary`/`setAutoCompactionEnabled`, `bindExtensions`, `reload`, `abortRetry`/`setAutoRetryEnabled`, `executeBash`/`recordBashResult`/`abortBash`, `setSessionName`, `navigateTree`, `getUserMessagesForForking`, `getSessionStats`, `getContextUsage`, `exportToHtml`/`exportToJsonl`, `getLastAssistantText`, `createReplacedSessionContext`, `hasExtensionHandlers`, `getActiveToolNames`/`getCallableToolNames`/`getAllTools`/`getToolDefinition`/`setActiveToolsByName`, `dispose` | `S/agent-session.ts` (4,578) | NEEDED |
| S-SESSMGR | `SessionManager`: JSONL entries, tree with active leaf, `getBranch`, `buildSessionContext` (authoritative for the model context), `projectContextEntry`, `buildSessionProjection`, `migrateSessionEntries`, `parseSessionEntries`, `findMostRecentSession`, `SessionManager.inMemory()` | `S/session-manager.ts` (2,036), `S/../docs/session-format.md` | NEEDED |
| S-TOOLS | `createBashTool`, `createReadTool`, `createEditTool` (+`edit-diff`), `createWriteTool`, `createFindTool`, `createGrepTool`, `createLsTool`, `createPowerShellTool`, `createReadOnlyTools`, `withFileMutationQueue`; renderers in `tools/renderers/*` | `S/tools/*` (17 files) | NEEDED |
| S-EXT | extension API: `ExtensionAPI`, `ExtensionFactory`, `InlineExtension` (`replaceable`, `builtin`), `ToolDefinition`, plus the 30+ event names (`project_trust`, `resources_discover`, `mcp_servers_change`, `session_*`, `context`, `provider_request`, `agent_start/end/settled`, `turn_start/end`, `message_*`, `tool_execution_*`, `tool_call`, `tool_result`, `model_select`, `user_bash`, `input`, `ui_prompt_*`, `cache_warming_decision`) | `S/extensions/types.ts` (2,358), `S/../docs/extensions.md` | NEEDED |
| S-RES | `DefaultResourceLoader`: extensions, skills, prompt templates, themes, context files; `ResourceLoader` swap for hosts that own discovery | `S/resource-loader.ts` | NEEDED |
| S-MCP | MCP servers as an extension (connect on `session_start`, so `bindExtensions()`); codemode and `tool_search` are loaded by the CLI only, not by SDK sessions | `S/mcp-servers.ts`, `SD`, `examples/sdk/14-codemode-mcp.ts` | NEEDED (later) |
| S-EXAMPLES | `examples/sdk/01…14.ts`, all typechecked in CI | `packages/coding-agent/examples/sdk/` | the port's conformance list |

## 3. How a durable session maps onto pi core

`pi core` = `@earendil-works/pi-agent-core` (`Agent`, the agent loop, `AgentMessage`) on `@earendil-works/pi-ai`
(`Models`, `Message`, `Tool`). `RUST-CORE` = the Rust crates that must carry it.

| pi core (TypeScript) | durable replacement | Consequence for the Rust port |
| --- | --- | --- |
| `Agent` — one conversation, in memory, created per call | `Session` + `Harness` — one storage, many conversations (`CF/src/session.ts:167`) | The Rust `Agent` handle becomes stateless: `Conversation { id }` owns nothing; the session line owns the state. |
| `Agent.state.messages: AgentMessage[]` | the conversation's entry line (`D/entries.ts`); `entry.model: readonly Message[]` is the messages pi core kept in RAM | Messages are not stored in a flat array. `state.messages` in Rust is a computed view over entries since the newest `pi.reset`. |
| `AgentState {systemPrompt, model, thinkingLevel, tools, messages}` (in RAM) | the `pi.agent` document, one per conversation, with `AgentState {model, thinkingLevel, extensions, tools, modelTools, instructions, cwd, maxTurns, compaction}`, written by `configure(tx, conversationId, agent)` | In durable, `model` is `ModelRef {provider, modelId}` and `tools`/`extensions` are names resolved against the `Registry` at each use, so a Rust session restores without live provider objects; `instructions` replaces pi core's `systemPrompt` (sections supply it); `cwd` rides with the conversation. |
| `agentLoop()` (`D`-free, `packages/agent/src/agent-loop.ts`) | `pi.generation` task, owning `pi.tool` child tasks | The loop is a task with a checkpoint per phase. A restart re-runs the phase; a model request that keeps killing the process ends after `settings.restartLimit`. |
| `Tool {name, description, parameters, execute}` | `ToolRegistration` (adds `replay: "safe" \| "unsafe"`, `deferred`, `structuredOutputSchema`, `render`, `control`) | Rust tools must be pure enough to replay; `replay: "unsafe"` means the result is only ever what was stored. Nested calls go through `api.executeTool`, whose result is replayed from its stored record. |
| `prompt()` (resolves when the run ends) | `conversation.submit(draft, ctx)` + `submission.wait(ctx)` | `prompt()` = `submit({type: "input", ...})` then `wait`. `steer`/`followUp` = the same call with `whenBusy` set; a queued item is an entry in the `pi.inbox` document, so a queue survives a restart. |
| `Agent.abort()` / `waitForIdle()` | `conversation.abort(...)`, `pi.inbox` drains; idle = no running generation task | `abort` must settle queued submissions (`onAbort: "withdraw" \| "keep"`), which the in-memory core does with a queue clear. |
| `Agent.subscribe(listener)` on `AgentEvent` (`agent_start`, `turn_start/end`, `message_start/update/end`, `tool_execution_start/update/end`) | `conversation.watch()` → `WatchHandle<ConversationView>`; `harness.observeCommits(...)`; `pi.live` holds the run, streamed answer, and tool progress | The Rust port ships no event bus: a client gets the view's first value, then delta ops (`CF/src/client/usePiSession.ts:1-60`), and rebuilds the transcript with `ConversationTranscript`. `agent_settled` maps to "the run's last submission settled", derived from the graph, not from an event. |
| `convertToLlm` / `transformContext` | `beforeRequest` hook (per attempt), `InputEntry {kind, data}` for a display entry whose model message is unchanged | Context edits are entries, not callbacks; a Rust `transformContext` must be replayable, since the request is rebuilt from entries. |
| `SessionManager` (JSONL tree, active leaf, compaction, branch summaries, `CURRENT_SESSION_VERSION = 3`) | no JSONL: entries and documents go to one SQLite-backed session; `tx.forkConversation(parent, at)` makes a new conversation (`CF/src/session.ts:441`) | SDK's tree-in-one-file becomes a forest in one store. Rust must keep both: the JSONL format for SDK parity, the durable store for sessions. |
| `AgentSession.getSessionStats()`, `getContextUsage()` | `pi.usage` doc, `Harness.usage()`, `UsageState` | `usage` moves from call sites to the record: each entry carries its own `model` usage. |
| `AgentSession.compact()`, `compact` hooks | `CompactionTask`, `beforeCompact` (decline / supply the summary), `CompactionEntry` | The summary is an entry; the compacted range stays. Rust: `firstKept` is an `EntryId`. |
| SDK extensions (`SE`) | `defineExtension` + `createRegistry` + `install`, selected per conversation in `pi.agent.extensions` | One extension bundle covers tools, sections, hooks, wraps, tasks; the per-part registries the pi inventory asked for (NEEDED there) are the Rust port's chance to define them once. |
| Cloudflare specifics: `Session` DO (668), `usePiSession` (387), `session-state.ts` (455), `Transcript.tsx` (369), `tools.ts` (259), `schedule.ts` (285), `search.ts` (203), tests (2,769) | — | The whole app is one file set of ~4,200 lines; the Rust port's `pi-durable` + a thin gateway must reproduce it. Its 11 test files are the acceptance suite. |

## 4. Use cases that pin the mapping

Each entry: **Experience** (what the user sees), **Build** (who does what), **Needs** (piece IDs; `EXISTS` in the
sources, `NEEDED` for Rust).

**U1. Restart recovery.** A container dies mid-turn; reopening the storage resumes the run and the queue.
*Build:* the host opens the `Session`, arms the recovery alarm, then calls `resume()`, which restarts running tasks from
their checkpoints (`CF/src/session.ts:167-216`, `test/recovery.test.ts`). *Needs:* D-SESSION, D-TASKS, D-GEN, D-STORE
(EXISTS); NEEDED: the Rust task scheduler with the `restartLimit` and the `interrupted`/`missing_result` diagnostics,
and the view restore on open (`CF/src/session.ts:578`).

**U2. Multiplayer view of one conversation.** Two browsers watch one conversation; each sees the streamed answer, tool
progress, and the queue, and both can send. *Build:* each socket takes `conversation.watch()`; the server sends
`view.value` then ops; a client with a gap pages `conversation.entries` (`CF/src/session.ts:540-576`,
`client/usePiSession.ts`). *Needs:* D-VIEW, C-WATCH, C-DELTA (EXISTS); NEEDED: the Rust gateway with the same framing,
the per-connection `command-outbox` (idempotent commands after a reconnect, `client/command-outbox.ts`), and
`requestId`-keyed receipts (see U3).

**U3. Send while a run is busy.** A second person sends during a running turn; the message queues and is answered after.
*Build:* `submit({type: "input", content, requestId, whenBusy: "followUp"})` (`CF/src/session.ts:473`); the queue is the
`pi.inbox` document, so a restart keeps it. *Needs:* D-SUBMIT, D-SUBMISSION, D-RECORDS (EXISTS); NEEDED: the Rust
`submit` and the `pi.inbox`/`pi.agent` documents; `requestId` idempotency is real in the sources
(`ConversationCommandReceipts`, a doc family keyed by request id, `CF/src/session.ts:62`) and is the only guard against
a resent prompt after a reconnect.

**U4. Scheduled follow-up.** "In 10 minutes, remind me to …" works with no process alive; the reminder arrives as a
normal message with a display name. *Build:* the `schedule` tool creates a task whose first phase writes a
`ScheduleIntent` doc and a due-dated submission; the DO's alarm is the only timer; `onWake` arms it and `resume()` runs
the due task (`CF/src/tools.ts:38-90`, `src/schedule.ts`, `test/schedule.test.ts`). *Needs:* D-TASKS, D-WAKE, D-DOCDEF
(EXISTS); NEEDED: the Rust `wake`/`arm` bridge — the harness keeps no timer, so a Rust port that keeps one will not
survive an instance eviction.

**U5. Search across conversations.** "What did we decide about X last week?" reads other conversations' entries.
*Build:* a tool task scans entry pages (`minEntryId`/`maxEntryId`, `limit`), matches in the `model` messages, and
returns snippets with `conversationId` + `entryId` links (`CF/src/search.ts`, `test/search.test.ts`). *Needs:*
D-CONV (`entries` paging), D-RECORDS (EXISTS); NEEDED: nothing new in core, but the port must keep the paged scan
public — an index would be a plugin; the sources have no full-text search, so a Rust port that adds one invents a piece.

**U6. Subagents.** A tool starts a second conversation with its own model and tools; it survives a restart, and its
report comes back. *Build:* a task creates the child conversation with `ownership: {kind: "task", taskId}` and submits
to it; `conversationCreated` (in `HarnessOptions`) configures it; the parent's tool task waits on the submission
(`CF/src/chat.ts:44`, `src/tools.ts`). *Needs:* D-CONV, D-SUBMISSION, D-AGENT (EXISTS); NEEDED: the Rust
`conversationCreated` hook and the ownership rule (a task-owned conversation is stopped with the task).

**U7. Fork from an earlier message.** Clicking "fork" on a message makes a new conversation that starts there; both
keep working. *Build:* `tx.forkConversation(parentConversationId, entryId, {ownership})` inside one commit, plus a
receipt doc for idempotency, then a watch for the new conversation (`CF/src/session.ts:435-471`). *Needs:*
D-SESSION, D-RECORDS (EXISTS); NEEDED: the Rust `fork` and the rule that a fork's context is the parent's entries up to
`entryId` (the SDK's tree-with-active-leaf, `S/session-manager.ts`, is a different model; do not implement both).

**U8. Durable approval gate.** An expensive tool waits for a person; the process stops; someone approves; it runs.
*Build:* a `beforeTool` hook returns `{sleep: {until, signals}}`; the call is parked; each wake re-runs the whole
`call` phase (`D/harness/types.ts:1180-1215`, `docs/suspendable/book.md`). *Needs:* D-HOOKS, D-SIGNALS, D-TASKS
(EXISTS, in the package); NEEDED: nothing in the Rust plan beyond the hooks and the park, but no Rust code exists, and
the sources' note is explicit: an approval is not exactly-once for an external side effect.

## 5. What the Rust port must supply, ranked

| Rank | Piece | Rust crate | Why it is first |
| --- | --- | --- | --- |
| 1 | Records, ids, and the one-line `Session` commit (`D-SESSION`, `D-RECORDS`) | `pi-durable` | Every other piece is defined on these; `D/spec.md` §1's eight invariants are the tests. |
| 2 | `defineDoc` + `defineTask` + scheduler (`D-DOCDEF`, `D-TASKS`, `D-GEN`, `D-TOOL`) | `pi-durable` | Without tasks there is no restart recovery, and the SDK surface cannot be built over pi core. |
| 3 | `defineExtension`, `createRegistry`, hooks, wraps (`D-EXT`, `D-HOOKS`) | `pi-durable` | The extension model is the port's main compatibility promise to `SE`. |
| 4 | `ConversationView`, `ConversationTranscript`, `watch` (`D-VIEW`, `C-WATCH`, `C-DELTA`) | `pi-durable`, `chord` | The client protocol; the app's tests are the only spec. |
| 5 | Storage adapters (`D-STORE`, `C-SQLITE`) | `pi-durable`, `chord-sqlite` | Needed to run U1; a Rust port on a single SQLite file is a legitimate first cut. |
| 6 | Chord contracts, links, registries (`C-CONTRACTS`, `C-LINK`, `C-REG`) | `chord` | Only needed when a second process joins; the first cut can keep them single-host, and must say so. |
| 7 | SDK surface over durable sessions (`S-CREATE`, `S-SESSION`, `S-TOOLS`, `S-RES`) | `pi-coding-agent` | The `examples/sdk/*` list is the conformance checklist; port `01`, `05`, `11`, `12` first. |
| 8 | Cloudflare gateway and React client (`CF/*`) | `pi-durable-cloudflare` | The Rust binary that replaces it needs `fetch`, `alarm`, `webSocketMessage/Close/Error`; port last, after U1–U3. |
| 9 | `C-HTTP`, `C-WORKERS`, `C-PLUGINS`, `C-SURFACES`, `C-SYNC`, `C-TEL`, `D-CODEMODE` | `chord`, `pi-*` | Real, but nothing in this ticket needs them; do not port in this slice. |

## 6. Cut or merge

- **MERGE the two session stacks.** One session runtime in Rust: the durable one. The SDK's `prompt/steer/followUp/
  abort/waitForIdle/compact/getLastAssistantText` become a thin facade over `submit`/`wait`/`abort`; do not keep an
  in-memory `Agent` with its own `messages` array beside it.
- **CUT `SessionManager`'s JSONL as a second source of truth.** Port it as an export/import format for SDK parity
  (`exportToJsonl`), not as a storage backend for durable sessions.
- **CUT the `AgentEvent` bus.** The durable view is the contract; a Rust `subscribe` that re-derives
  `message_start`/`tool_execution_update` from a view is fine, one that stores events is not.
- **CUT Chord's surfaces and plugin loader from this slice** (`src/react`, `src/tui`, `src/surfaces`,
  `src/node/plugins`, esbuild, `ws`). Nothing in U1–U8 needs them; they are ≈6.1k TS lines of UI and packaging.
- **CUT an SDK `ui-context` god object.** `SE`'s `ExtensionContext` bundles UI, model, and files; the port's
  `ToolExecutionApi` and `HookApi` are the narrow shapes.
- **KEEP `requestId` idempotency and the alarm-arms-before-work order.** Both are small, easy to lose, and each
  prevents a real bug (double prompt after a reconnect; a stranded run after an eviction).

## 7. Open questions

1. **Two clocks.** `wake.at` is on the harness clock (`Date.now`), and Cloudflare alarms are at-least-once. Rust
   durable time: one `Instant`-style clock per session, and who owns it.
2. **`replay: "safe"` and external effects.** A Rust tool that sends mail cannot replay safely. Decide the convention
   now (idempotency key in the tool input, or an explicit non-replayable class), not after the first integration.
3. **`beforeTool` parks.** The sources park a call before it runs; `afterResponse` is notify-only. Keep both, and do
   not promise a `turn_end`/`agent_before_settle` boundary the sources do not have.
4. **`pi.` prefix.** Rust custom kinds must not start with `pi.`; is the prefix check a runtime rule in `pi-durable`?
5. **Sessions and ownership.** A task-owned conversation is stopped with its task. Who may list, open, fork, or delete
   an owned conversation once a gateway exists — nothing in the sources enforces it (`CF/README.md`: no auth).
6. **JSONL parity.** Keep the SDK's `SessionEntry` tree format byte-compatible, or declare it superseded by durable
   records and only read it? Affects the `--resume` and `/import` work.
7. **Search and stats.** The sources' search is a brute-force scan of entry pages. A Rust index is a new piece; the
   first to need it must state the invalidation rule.
8. **Chord's contracts.** `C-CONTRACTS` carries the runtime type checks that make "an SDK extension is just TS"
   safe. Rust types replace them at compile time; the wire still needs a schema identity for cross-language clients.
