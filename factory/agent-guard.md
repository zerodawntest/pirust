# agent-guard (pi extension, loaded in every sandboxed agent)

The agent enforces small steps, handoff and refresh on itself. The external monitor is only a backstop.

- **Scope:** `tools/agent` passes `PIRUST_FILES` (from the ticket's `Files:` line). `edit`/`write` outside those paths is blocked, except `HANDOFF.md` and tests of those files. `git` is blocked.
- **Step:** one step is at most 20 tool calls, or context ≤ 40%, or weighted tokens (in + out + 0.1·cacheRead) ≤ 120k.
- **Handoff:** at the limit, steer: "Write HANDOFF.md (Status: wip|done|blocked, Done:, Next:, ≤5 lines) and stop."
- **Refresh:** on `agent_end`, if HANDOFF says `wip`, run `ctx.newSession` seeded with the ticket body + HANDOFF.md, then continue. The process and hc terminal stay the same.
- **Limits:** after 3 refreshes, `Status: blocked (too big)` and `ctx.shutdown()`; the dispatcher sends the ticket to the planner to split it. `done` or `blocked` means `ctx.shutdown()`, which is the finish signal (no false stalls).
- **Loop:** the same tool call 3× gets blocked with the reason "loop: change approach or hand off".
- **Output cap:** bash output is cut to its last 4k characters; file reads are capped at 300 lines per call.
- **Log:** one line per step to `~/.pig/sandbox/usage.log`: ticket, step, calls, tokens, cost.
