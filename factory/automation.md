# Script it: what pi gives us (evidence: docs/extensions.md, examples/extensions)

| Need | pi mechanism | Example |
|---|---|---|
| End a step without an extra LLM turn | tool with `terminate: true` (a `handoff` tool writes HANDOFF.md) | structured-output.ts |
| Checks at handoff, agent unaware | `agent_before_settle`: run tools/check, on failure return a hidden custom_message + `continue: true` (max 2) | extensions.md §agent_before_settle |
| Fresh context instead of compacting | `ctx.newSession` seeded with handoff | handoff.ts |
| Smaller tool declarations | `prepareLoadout` → replacement `descriptions`, `hiddenDeclarations`; `exposure: codemode/deferred` | extensions.md §Tool Exposure |
| Role tool sets | `pi.setActiveTools`, `excludeTools`; presets per role | preset.ts |
| Capped output and guarded calls | override built-in `bash`/`read`, `tool_call` block | tool-override.ts, truncated-tool.ts, protected-paths.ts |
| Rules loaded on demand | skills (name and description only in the prompt) | claude-rules.ts, docs/skills.md |
| Structured verdicts from reviewers | `verdict` tool, schema, `terminate: true` | structured-output.ts |
| Task list without context bloat | state in tool result details | todo.ts |
| External input without polling | file-trigger, `pi.events` bus | file-trigger.ts, event-bus.ts |
| Scripted multi-agent chains | subagent processes with agent definitions | subagent/ |

Rule: the LLM only writes code and judges. Everything else (checks, review routing, merge, ticket updates, dispatch) is code that runs on events and wakes nobody.
