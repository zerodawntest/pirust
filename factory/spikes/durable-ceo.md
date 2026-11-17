# Spike #78 — CEO daemon on pi-durable

Findings from the smallest node prototype in `./spike.mjs` + `./run.sh`
(one conversation, a wake task, `reset(handoff)`, usage read).

## Works

- **One conversation** — `createAgentSession()` with `SessionManager.create(cwd, dir)`
  gives a persistent JSONL conversation; `prompt()` blocks until the run ends.
- **A wake task** — a scheduled instruction the host arms on a platform timer
  (a `setTimeout` that calls `prompt()`), matching inventory U4/D-WAKE. The
  `run.sh` log shows the scheduled prompt firing and being answered (`WAKE-OK`).
- **`reset(handoff)`** — a new conversation whose **first request carries only
  the handoff + the prompt**: `sendCustomMessage({content:handoff}, {triggerTurn:false})`
  appends the handoff without starting a turn, then `prompt()`; the first
  `provider_request` is exactly `["custom: HANDOFF…","user: What is 123 + 4…"]`
  (2 messages, no prior history) → acceptance 2 passes.
- **Usage read** — `getSessionStats().tokens` + `getContextUsage()` work
  (this run: `input 5880 / output 352 / cacheRead 10960 / total 17192`,
  context 5854/163840 ≈ 3.6%).
- **Restart recovery** — `run.sh` `kill -9`s the prototype mid-turn (during a
  `bash` tool call, `sleep 3 && ls`), restarts, and `run2.log` logs
  `recovered:`: the reopened conversation's last saved message is the
  unanswered user prompt, and the next request's history includes it →
  acceptance 1 passes.

## Gaps

- **The prototype does NOT run on pi-durable.** `@earendil-works/pi-durable`
  is **not installed** in this sandbox, so all four features run on the SDK
  stack (`createAgentSession` + JSONL `SessionManager`), the only session
  runtime present. `durable-inventory.md` §5/§7 confirms every durable piece is
  `NEEDED` in Rust: **no `Conversation`, `pi.generation`, `pi.inbox`,
  `pi.usage`, `defineTask`, `defineDoc`, or `openNodeSqliteStorage` exists to
  run**. The prototype implements the four features, it does not use them.
- `reset(handoff)` is **hand-rolled** (`sendCustomMessage` + `newSession`), not
  a `Conversation.reset`.
- **Cost is not recorded**: the provider (`ibm-next/qwen38-flash-next`) reports
  `cost:0` for every message, so "tokens" is the only cost signal we get.
- D-STORE node-sqlite (`openNodeSqliteStorage`) is **not exercised** — the
  prototype persists on JSONL, not the SQLite store the ticket names.

## Tokens

- `run.sh` runs end to end: `input 5880 / output 352 / cacheRead 10960 /
  total 17192` tokens, context 3.6%, cost 0 (see gap).
- One model round-trip (the `sleep 3 && ls` + `2+2` + handoff prompts) uses
  ~17k tokens.
