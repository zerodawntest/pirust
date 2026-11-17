---
name: pi-sessions
description: "Pi session files and context: JSONL session format, tree/branching, compaction + branch summaries, and the JSON/RPC event stream. Use when parsing a session .jsonl, building a viewer, computing tokens/cost, reasoning about compaction, or resuming/branching a session."
---
Docs: `/nix/store/w3j2zc6sidwg028h4b1wqw6yillkf9jm-pi-1.5.1/libexec/pi/docs` (D).

## Where sessions live (D/sessions.md:58-62, D/session-format.md:8-14)
- Default store `~/.pi/agent/sessions/--<path>--/<timestamp>_<session-id>.jsonl`; `<path>` = working dir with leading `/` dropped and `/`,`\`,`:`→`-`. `<session-id>` = UUID, or a custom ID via `--session-id`/SDK. Delete a session by removing its `.jsonl`.
- One session = one working directory, never changed. `--resume`/`--session` run it in ITS dir; `--fork`/`--continue` run in the current dir (D/sessions.md:16-22).
- `--no-session` = ephemeral, cannot be resumed (D/sessions.md:62).

## File format (D/session-format.md)
- JSONL; each line is a JSON object with a `type`. `id`/`parentId` form a TREE, so returning to an earlier point does not erase the branch you leave (D/sessions.md:32, D/session-format.md:209).
- First line = `session` header (metadata only, no id/parentId). Versions 1 (linear) / 2 (tree) / 3 (renamed `hookMessage`→`custom`); older files auto-migrate to v3 on load (D/session-format.md:22-30).
- Entry `type`s: `message` (a `message` field = an AgentMessage; roles user/assistant/toolResult/system; assistant names the model+`thinkingLevel`), `model_change` (`provider`,`modelId`), `thinking_level_change`, `usage` (`kind`,`provider`,`model`,`usage` — off-context, counts in totals), `compaction`, `context_edit`, `branch_summary`, `custom` (extension state, NOT in LLM context), `custom_message` (extension message that IS in context), `label`, `session_info` (`name`) (D/session-format.md:78-207).
- Session entry timestamps are ISO 8601; the nested message timestamp is Unix ms (D/session-format.md:47).

## Context building (D/session-format.md:224-248, D/sessions.md:46-56)
- The model receives only the active branch (leaf→root), not every branch. `buildSessionContext()` walks leaf→root, honours compaction (summary replaces entries before `firstKeptEntryId`; keep from `firstKeptEntryId` onward), converts `custom_message`→message, `compaction`→system checkpoint+summary, `branch_summary`→context, `usage`/`custom`→no context message.
- `context_edit`: append-only; `replacement:null` omits the target from model context, non-null replaces only its content; latest edit on the active branch wins; branch-relative (D/session-format.md:139-147).

## Compaction + branch summaries (D/compaction.md, D/settings.md:69)
- Auto-compaction triggers when `contextTokens > contextWindow - reserveTokens` (`reserveTokens` default 16384; `keepRecentTokens` default 20000) (D/compaction.md:29-35).
- A `compaction` entry stores `summary`, required `firstKeptEntryId`, `tokensBefore`; `firstKeptEntryId` = its own id for retain-none (D/session-format.md:123-137). Summaries omit thinking; tool results truncated to 2000 chars when serialized (D/compaction.md:289-291).
- Branch summary (`branch_summary`, `fromId`) is created on `/tree` navigation to preserve the abandoned path (D/sessions.md:42, D/compaction.md:169).
- Per-model budgets via `compaction.modelOverrides` keyed by exact `provider/modelId` (D/settings.md:78, D/compaction.md:440).

## JSON/RPC event stream (D/json.md)
- JSON mode: header then events, one JSON object per LF-terminated line. Split records ONLY on LF; strip optional leading CR; do NOT use Node `readline` (it splits on Unicode separators valid inside JSON strings) (D/json.md:14-17). Read stdout continuously (a stalled reader stalls pi) (D/json.md:19).
- Key events: `agent_start`/`agent_end`/`agent_settled` (`agent_settled` = no more automatic work — the completion signal; see pi-drive), `turn_start`/`turn_end`, `message_start`/`message_update`/`message_end` (`message_end.message` is authoritative), `tool_execution_*` (correlate by `toolCallId`), `queue_update`, `compaction_start`/`compaction_end`, `auto_retry_*` (D/json.md:31-180).
