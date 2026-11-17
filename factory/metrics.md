# Measure, eval, improve (Patrick 2026-11-17)

No change to a skill, template, prompt, hook, model setting or ticket size lands on opinion. It lands on a measured delta.

## Ledger (script, every agent/lead session)
One JSONL row per agent step in `~/.pi/pirust-usage.jsonl`, written from the session file at exit (no AI):
ticket, step, role, model, thinking, skills loaded, template hash, input, output, cacheRead, cacheWrite, cost, turns, tool calls, tool errors, guard blocks, handoff status, finish result (merged / conflict / check-fail / crash), wall time.
Leads (CEO, driver): one row per hour.

## Numbers we steer on
| Metric | Why |
|---|---|
| cost and tokens per merged ticket | the goal: cheap |
| cache hit = cacheRead / (input + cacheRead) | cache breaks are the expensive part |
| input per turn, output per turn | context bloat, verbosity |
| handoffs per ticket, first-pass finish rate | ticket size, agent quality |
| tool errors, guard blocks (false/true) | bad tools or bad rules |
| lead wake-ups per merged ticket | lifecycle not scripted enough |

## Evals (skills, templates, prompts)
- `evals/<subject>/` has small fixed cases: prompt, worktree fixture, scorer script (exit 0 = pass, prints score).
- A runner script executes each case N times per variant (fresh sandboxed pi, JSON mode), records score + tokens to the ledger.
- Accept a change only if pass rate does not drop and tokens per pass do not rise > 10%. The PR cites the eval table.
- Skill quality = with-skill vs without-skill on the same cases: pass rate, tokens, wrong-API uses.
