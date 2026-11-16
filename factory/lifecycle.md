# Ticket lifecycle: script runs it, AI only does the work (Patrick 2026-11-17)

Every wake-up of an AI that a script could have handled burns tokens and adds a chance to go wrong.
Relaunching, checking, retrying and moving tickets are script work. No lead does them by hand.

Every step is a fresh agent with almost no context: ticket + HANDOFF note (+ failure tail). Never reuse an agent.
The note carries everything; the next agent reads nothing else. Scope per agent = one small step, few files.

| Step | Who | How |
|---|---|---|
| Ready → In progress | script | one dispatcher: queue order, WIP 4, claim, worktree auto-created (reused by later steps) |
| Start agent | script | fresh pi process in the worktree; prompt = ticket body + HANDOFF if present |
| Budget hit | hook | forced handoff (note), agent exits; script starts a fresh agent on the note |
| Agent done (HANDOFF `done`) | script | wt finish: rebase, local checks, push, PR, merge ff; ticket Done; next ticket |
| Conflict | script | conflict files + markers summary into HANDOFF; fresh agent resolves only that |
| Checks fail | script | failing check + output tail into HANDOFF; fresh agent fixes only that |
| Crash / no-changes | script | one fresh retry on the note; then Blocked + `needs:split` |
| 3 handoffs or 2 failed finishes | script | Blocked + `needs:split` (scope too big); digest line |
| Blocked, design choice, `needs:patrick` | AI | the only reasons a lead wakes |

HANDOFF (≤5 lines, overwritten each step): Status, done so far, next step, files, verified cmd → result.
Never: a lead relaunching, killing, steering by text, reading session logs or CI logs, or moving board fields for routine steps.
Leads never edit files listed in an In-progress ticket's `Files:` (caused the #91/#92/#96/#68 conflicts).
