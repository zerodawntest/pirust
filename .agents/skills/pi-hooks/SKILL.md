---
name: pi-hooks
description: Map each pi 1.5.1 extension hook to what it can block, modify, or continue, with exact doc lines. Use before designing any guard, gate, forced handoff, steer, or token-saving measure; pick the hook here instead of a text steer.
---

A text steer is only a request: force behaviour with a hook return value. Docs root `D` = `/nix/store/w3j2zc6sidwg028h4b1wqw6yillkf9jm-pi-1.5.1/libexec/pi` (cited as `docs/...`). Factory problems each row solves: **stop-early**, **forced-handoff**, **steer-ignored**, **token-waste**.

| Event | When | Can (block / modify / continue) | Return shape | Solves | Doc |
|---|---|---|---|---|---|
| `tool_call` | before a tool runs, after `tool_execution_start` | block; mutate `event.input` in place (no re-validation) | `{block:true, reason?, terminate?}`; `terminate` only with a block, and the run stops early only when every finalized result in the batch terminates | stop-early, forced-handoff | docs/extensions.md:973 |
| `tool_result` | after a tool runs, before `tool_execution_end` | modify result (partial patch, fields chain across handlers) | `{content?, details?, isError?, usage?}`; replacing `content` without `structuredContent` drops the structured content | token-waste (shrink a big tool output) | docs/extensions.md:1040 |
| `input` | on user input, before skill/template expansion | handle (skip LLM), transform, block | `{action:"continue"|"transform"|"handled", text?, images?}`; transforms chain | steer-ignored (rewrite the ignored instruction), token-waste (`handled` skips the LLM) | docs/extensions.md:1112 |
| `before_agent_start` | before a run, after input + expansion | modify: inject `message`, replace `systemPrompt`, set active tools | `{message?, systemPrompt?}`; prefer editing `systemPromptOptions.sections`/`selectedTools` (keeps cache); `pi.setActiveTools()` inside has same effect | forced-handoff (`setActiveTools(["handoff"])`), token-waste | docs/extensions.md:615 |
| `turn_end` | after each turn (1 reply + tool calls), before the next request | modify entries, request one continuation | `{entries?, continue?}`; allowed draft types `custom`,`custom_message`,`context_edit`,`compaction` | steer-ignored (`context_edit` the ignored reply + `custom_message` + `continue:true`), token-waste (`compaction` draft) | docs/extensions.md:715 |
| `agent_before_settle` | final actionable boundary before the run goes idle | append entries, request one continuation | `{entries?, continue?}`; an aborted run suppresses `continue` | forced-handoff, steer-ignored (force a re-answer) | docs/extensions.md:663 |
| `context` | before each LLM call | modify `messages` (deep copy, no system messages) | `{messages}`; Pi re-adds prompt + tool declarations | token-waste (trim/window the conversation each request) | docs/extensions.md:815 |
| `context_with_system` | before each LLM call, after every `context` handler | replace the full transcript, incl. the leading system message | `{messages}`; keep a system message at index 0 | token-waste (drop a prefix, edit the prompt) | docs/extensions.md:829 |
| `before_provider_request` | after the provider payload is built, before send | replace the payload | return a new payload object (`undefined` = unchanged); not reflected by `ctx.getSystemPrompt()` | token-waste (force low `temperature`, smaller payload) | docs/extensions.md:864 |
| `before_provider_headers` | after outgoing HTTP headers are assembled | mutate `event.headers` in place (string = add/override, `null` = delete) | (in-place, no return) | token-waste, cost attribution | docs/extensions.md:846 |
| `session_before_compact` | on compaction (manual / threshold / overflow) | cancel, or supply the summary | `{cancel:true}` or `{compaction:{summary, firstKeptEntryId, tokensBefore}}` | token-waste (own the summary) | docs/extensions.md:534 |
| `cache_warming_decision` | before each prompt-cache refresh | override warm/stop (last handler that returns wins) | `{action:"warm"|"stop"}` | token-waste (`stop` ends warming) | docs/extensions.md:912 |
| `user_bash` | on a `!` / `!!` command | intercept: supply `operations` backend, or a `result` | `{operations}` / `{result}`; `undefined` = pass to next, then local | (not a factory problem) | docs/extensions.md:1078 |
| `session_before_switch` / `session_before_fork` | before /new, /resume, /fork, /clone | cancel | `{cancel:true}` | (not a factory problem) | docs/extensions.md:496, docs/extensions.md:515 |
| `project_trust` | before Pi decides to trust a project (`.pi`, `.agents/skills`) | decide trust (first yes/no wins; `remember:true` persists) | `{trusted:"yes"|"no"|"undecided", remember?}` | (not a factory problem) | docs/extensions.md:429 |

Probe run: `cd "$(mktemp -d)" && printf 'import{isToolCallEventType}from"@earendil-works/pi-coding-agent";export default(p)=>{p.on("tool_call",async e=>isToolCallEventType("bash",e)?(e.input.command="echo BLOCKED",{block:true,reason:"no bash",terminate:true}):undefined);p.on("input",async e=>e.text==="ping"?{action:"handled"}:{action:"continue"});};\n' >p.ts && echo ping | pi -ne -e ./p.ts` -> exit 0, extension loaded, `input:handled` suppressed the LLM. `factory/extensions/agent-tools.ts:90` ships the `tool_call` `terminate:true` + `setActiveTools` pattern.

Guards on the facts above:
- `turn_end` drafts are validated then appended in list order after ALL handlers run; an unconditional `continue:true` re-fires every turn -> endless loop, so gate it with a counter (docs/extensions.md:715).
- `context_edit` (`replacement:null`) drops one old entry's content durably; `compaction` keeps entries from `firstKeptEntryId` (docs/session-format.md:123) — use it, not `ctx.compact()`/`ctx.newSession()` inside an event (not awaited / can deadlock; docs/extensions.md:1288, docs/extensions.md:1350).
- `message_end` can replace the finalized message only if the `role` is unchanged (docs/extensions.md:752); `before_provider_headers` reuses headers on retry (docs/extensions.md:846).
