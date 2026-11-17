# RFC-0004: Stateless, script-driven RFC pipeline (the factory's first loop)

Status: draft, for Patrick (CEO 2026-11-17). Not approved; nothing is built from it yet.

## Problem
- The CEO is one long session. Context and old plans pile up; after each compaction it resumes "keep moving" and adds tickets/docs instead of choosing.
- 100 agent launches -> 17 merges in one night. Nobody checks that the process is followed (e.g. #171/#174 relaunched and reported "done" 1 s later on the already rejected PR).
- Patrick repeats the same instructions; changes happen when he asks, not from the process.

## Proposal
1. **Every step is a fresh session.** A script (scheduler) starts one pi session with one role, one input set, one output file, then it exits. No session lives longer than one step. State lives only in files and the board.
2. **The CEO is a step too.** It wakes on a timer or event, reads at most 10 lines of state, routes the next step to the department that owns it, writes at most 5 lines, and exits.
3. **The RFC pipeline.** It is the only way work starts. One RFC dir per item; the scheduler moves it on.

   | # | Step | Output |
   |---|---|---|
   | 0 | Pick: index the open, highest-priority items; choose the one that delivers most now | `pick.md` (why, metric) |
   | 1 | Draft the RFC | `rfc.md` |
   | 2 | Reviews in parallel from different angles: scope and plan, architecture vs ADRs, cost/tokens, testability, security | `review-<angle>.json` |
   | 3 | Triage the feedback: accept or reject each point, with a reason | `open.md` |
   | 4 | Work the open items; research and POCs as separate sessions | new `rfc.md` |
   | 5 | Department manager checks the RFC against its rule set (accepted ADRs) | `rules.json` |
   | 6 | Patrick gate: summary plus open questions; his comments go back to step 3 | approved / changes |
   | 7 | Break down Epics > Features > Work items > Tasks; one review after each level | board items |
   | 8 | Build: agents and CI; integration runs the full suite; a green, written PR to main | PR |
   | 9 | Close: done only when merged to main; learnings and decisions become ADRs, then rules (lint/hook) | ADR, rules |

   Steps 2–4 repeat until nothing is open; after max rounds, escalate. Findings along the way go to the backlog, unless they block: then they attach to the blocked item.
4. **Departments.** Each area (process, CI, port-core, port-durable) has a manager role with its own rule file. The CEO only routes.
5. **Measurement per step:**
   - tokens, rounds and wall time;
   - per RFC: lead time and review rounds;
   - escapes, i.e. issues found after approval.
   
   The scheduler writes these; no AI reads raw logs.
6. **WIP and freeze.**
   - Start with 1 RFC in steps 0–6 at a time; raise only when measured.
   - `~/.pig/STOP` makes the scheduler start nothing new.

## Bootstrap (what exists vs missing)
- **Exists:** `tools/loop`. It runs stages as fresh agents with review gates that loop back, writes a ledger, and resumes from `state.json`.
- **Missing:**
  - step 0 (pick);
  - parallel multi-angle reviews;
  - triage;
  - manager rule check;
  - the Patrick gate;
  - breakdown with reviews per level;
  - "done = on main";
  - the CEO as a scheduled step;
  - STOP.
- **Conflict:** the keepalive hook tells the long CEO session to "keep the factory moving". In this model it is replaced by the scheduler.
- **First build slice (after approval):** scheduler + steps 0–3 + the CEO as a step, using `tools/loop`. Merged to main before anything else.

## Questions for Patrick
1. Is RFC-0004 itself the first item, with you as its reviewer, since the review steps do not exist yet?
2. Until step 1 is on main: what happens to the 4 open PRs (157, 175, 185, 186) and the driver/launcher: finish, or park?
3. Models: reviews and rule checks on gpt-6.1-sol; drafting, triage and build on qwen. Agree?
4. Departments to start with: only "process" and "CI", or the port as well?
