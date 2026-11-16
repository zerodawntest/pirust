---
name: pi-hooks
description: Which pi 1.5.1 extension hook forces which behaviour (block, rewrite, continue, reset, stop). Use before designing any guard, gate, handoff or token saving; pick a hook here instead of a text steer.
---
Docs: /nix/store/w3j2zc6sidwg028h4b1wqw6yillkf9jm-pi-1.5.1/libexec/pi/docs (D). Everyone runs pi, never pig.

Rule: a text steer is a request. Force behaviour with a hook return value or a tool set.

| Need | Hook / API | Return / effect | Doc |
|---|---|---|---|
| Block a tool call (also end the run) | `tool_call` | `{block:true, reason, terminate?}`; `event.input` mutable, no re-validation | D/extensions.md:973 |
| Rewrite a tool result | `tool_result` | `{content, details, isError, usage}` | D/extensions.md:1040 |
| Only some tools callable | `pi.setActiveTools(names)` | unknown names ignored; also inside `before_agent_start` | D/extensions.md:1908 |
| Model ignored the instruction / answered in text | `turn_end` | `{entries:[...event.entries, {type:"context_edit",targetId:event.messageEntryId,replacement:null}, {type:"custom_message",content,display:false}], continue:true}` | D/extensions.md:715 |
| Reset context in process, no LLM summary | `turn_end` or `agent_before_settle` | draft entry `{type:"compaction", summary, firstKeptEntryId, tokensBefore}` + `continue:true` | D/extensions.md:715, D/session-format.md:123 |
| Agent stops early | `agent_before_settle` | `{entries, continue:true}`; final actionable boundary; aborted runs never continue | D/extensions.md:663 |
| Own summary for pi's compaction | `session_before_compact` | `{compaction:{summary, firstKeptEntryId, tokensBefore}}` or `{cancel:true}` | D/extensions.md:534 |
| Trim context every request | `context` | `{messages}`; prompt + tools are re-added by pi | D/extensions.md:815 |
| Change prompt / tool set for a run | `before_agent_start` | `{message, systemPrompt}`; prefer editing `systemPromptOptions.sections/selectedTools` (cache kept) | D/extensions.md:615 |
| Rewrite the provider payload | `before_provider_request` | return new payload; not seen by `ctx.getSystemPrompt()` | D/extensions.md:864 |
| Intercept user input | `input` | `{action:"continue"|"transform"|"handled"}` | D/extensions.md:1112 |
| End after a structured answer | tool `execute` | `terminate:true` (only if every result in the batch terminates) | D/extensions.md:2289 |
| Strict JSON tool args | tool `constrainedSampling` | `{type:"json_schema", strict:"prefer"|"require"}`; needs model compat `supportsStrictMode` | D/extensions.md:2314 |
| Stop the process | `ctx.shutdown()` | interactive: after idle; RPC: right away when idle | D/extensions.md:1259 |
| Measure | `ctx.getContextUsage()`, `turn_end` `event.message.usage` | tokens | D/extensions.md:1277 |

Limits (checked):
- `turn_end` drafts allowed: `custom`, `custom_message`, `context_edit`, `compaction`; validated, appended after all handlers. Unconditional `continue:true` loops forever: always count. (extensions.md:746)
- `compaction` keeps entries from `firstKeptEntryId`; retain-none = its own id (session-format.md:131). Whether a draft can reference itself: unproven, probe before relying on it.
- `context_edit` with non-null `replacement` shrinks one old entry durably (e.g. a 20k tool output to its first lines); latest edit per target wins (session-format.md:140).
- `ctx.newSession/fork/switchSession/navigateTree` only from commands; from events they can deadlock. Use the `compaction` draft entry instead. (extensions.md:1322)
- `ctx.compact()` does not await: pass `onComplete` or the agent sits idle. (extensions.md:1288)
- Leads never call reload_runtime; changed extensions apply on restart. Prove load first (skill pi-extension-check).
