# Ticket lifecycle: script runs it, AI only does the work (Patrick 2026-11-17)

Every wake-up of an AI that a script could have handled burns tokens and adds a chance to go wrong.
Relaunching, checking, retrying and moving tickets are script work. No lead does them by hand.

| Step | Who | How |
|---|---|---|
| Ready → In progress | script | one dispatcher: queue order, WIP 4, claim, worktree |
| Start agent | script | one pi RPC process per agent (skill pi-drive), prompt = ticket body |
| Budget hit | hook | forced handoff + in-process compaction reset, same process (skill pi-hooks); no kill, no relaunch |
| Agent done (`agent_settled` + HANDOFF done) | script | wt finish: rebase, local checks, push, PR, merge ff |
| Good | script | ticket Done, `new_session` + next ticket in the same process |
| Conflict | script | markers back to the same agent as a prompt (#99) |
| Checks fail | script | failing output (tail) back to the same agent as a prompt |
| Crash / no-changes / killed | script | retry once from HANDOFF; then Blocked + `needs:split` |
| 3 resets or 2 failed finishes | script | Blocked + `needs:split`; digest line |
| Blocked, design choice, `needs:patrick` | AI | the only reasons a lead wakes |

Never: a lead relaunching, killing, steering by text, reading session logs or CI logs, or moving board fields for routine steps.
Leads never edit files listed in an In-progress ticket's `Files:` (caused the #91/#92/#96/#68 conflicts).
