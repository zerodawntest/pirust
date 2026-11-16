# Rules inside pi (sources: docs/configuration.md, skills.md, extensions.md)

Problem: pi loads every `AGENTS.md` from the cwd and its parent directories. Each worktree carries the 2.4k-word orchestrator `AGENTS.md`, so every agent request carries ~3.2k tokens of CEO rules.

| Layer | Mechanism | Who | Content |
|---|---|---|---|
| Context | repo `AGENTS.md` | everyone | ≤40 lines: build/test commands, code style, handoff format, which skill to load when |
| Role prompt | `before_agent_start` → `systemPromptOptions.sections`, `promptGuidelines`, `toolGuidelines`, `contextFiles` (filter) | ceo-guard (cwd = repo root), agent-guard (worktree) | CEO rules from `factory/ceo/RULES.md` (Patrick edits goals here); agent rules per role |
| Knowledge on demand | `.pi/skills/<name>/SKILL.md` (only name and description in the prompt) | everyone | handoff, verify, port-ts-to-rust, inventory, herdr, ticket-writing; details under `references/` |
| Enforcement | `tool_call` block or mutate; `agent_end`; `ctx.newSession`; `ctx.shutdown` | guards | scope, no git, slow foreground, output cap, step limit, handoff, refresh, a Verified line |
| Tool set | `selectedTools` / `excludeTools` | guards | the CEO gets no `edit` on code; reviewers are read-only |

Cache rule: the injected prompt is deterministic (no timestamps or counters), so the prefix stays cached. Changing data goes into messages, never into the system prompt.
