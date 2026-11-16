---
name: handoff
description: Write HANDOFF.md and stop when a coder session finishes, gets blocked, or hits its step limit. Use at the end of a ticket, on a forced handoff, or when told to hand off.
---

Write `HANDOFF.md`, then stop. It is the only handoff the next agent reads; keep it tiny (source: `factory/templates/coder.md`, `factory/lifecycle.md`).

- Call the `handoff` tool as your last action; the run ends on its tool result, so write nothing after it.
- `HANDOFF.md` is max 3 lines (`agent-tools.ts` caps at 5): `Status:`, `Done:`, `Next:`, and `Verified:` before `Next:`.
- `Status:` is `wip`, `done`, `blocked`, or `done` starting `BLOCKED:` when you could not finish.
- `Done:` what you did; `Next:` what the next agent does (for blocked, what unblocks it).
- `Verified:` commands you ran mapped to their result (see the `verify` skill).
- `handoff` is the only tool in a forced handoff (`setActiveTools(["handoff"])`); use it when the ticket's step limit is hit.

Source: `factory/templates/coder.md`, `factory/lifecycle.md`, `factory/extensions/agent-tools.ts` (schema + tests).
