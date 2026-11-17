# Feedback loop: measure, detect, improve (2026-11-17)

## Honest baseline (measured 2026-11-17 07:05)
- `~/.pi/pirust-usage.jsonl`: 1 row (a test row). 85 agent runs, 0 measured. `tools/usage` exists but nothing calls it.
- `evals/`: does not exist. No change so far was accepted on a measurement.
- 54 stopgap launches, 4 rejects/reverts, 2 idle-lead incidents; all found by reading, none by an alarm.
- Process changes: started by Patrick or by an incident. None came from the system itself.

## The loop (all code except step 4)
1. **Record** (script, every agent exit and every hour for leads): one ledger row per run (see metrics.md). Also a phase row per run of the port queue: files done, compile errors, tests passing, parity diffs.
2. **Score** (script, hourly): `tools/kpi` writes `~/.pig/kpi.jsonl` and one digest line. KPIs with targets:
   | KPI | Target |
   |---|---|
   | tokens and cost per merged ticket / per ported file | falling week over week |
   | cache hit | ≥ 90% |
   | first-pass rate (merged without fixer) | ≥ 70% |
   | rounds per gate | ≤ 2 |
   | lead time Ready → merged | falling |
   | agent idle slots (WIP < limit with Ready work) | 0 |
   | stray launches, guard false positives, reverts | 0 |
   | Patrick-initiated changes per week | falling |
3. **Detect** (script): a KPI outside its target for 2 runs, or a 25% jump over its 7-day average, opens one `process-review` ticket with the numbers and links to 3 sample runs. At most one open at a time. No AI reads raw logs.
4. **Diagnose and propose** (one fresh agent on sol, process-review template): reads only that ticket and the samples. It writes up to 3 experiments: hypothesis, change, KPI it should move, rollback.
5. **Eval** (script): `evals/` holds fixed replay cases (closed tickets with their worktree at the start commit, plus a scorer). Each experiment runs baseline vs variant N times. Accept rule from metrics.md. The result table goes on the ticket.
6. **Apply** at the next lock window (process-review.md). Record before/after in `changes.md`. A week later the KPI is checked again. If it did not move, the change is reverted.

## Cadence (Patrick: hours, not weeks)
| What | When | Cost |
|---|---|---|
| Record + score | every run / every 15 min | script, 0 tokens |
| Trigger check | every score | script |
| AI review (step 4) | on a trigger, else every 4h if ≥ 10 new runs since the last review | sol, input = KPI table + 3 samples (~20k) |
| Canary decision | after every 10 runs on the variant | script |
| Research | event: upstream pi/pi-durable commits (script `git fetch` hourly), or a failure class the review cannot explain; else every 12h | sol, bounded to 1 loop run |

## How data becomes a decision
- Sources, all read by scripts: pi session JSONL (provider token counts per message, stopReason, tool calls, tool errors), hc finish events (exit, duration), git/GitHub (merged, CI result, reverts, fixer rounds), loop ledger (gate scores), port counters (files, cargo errors, tests, parity diffs).
- Every run row carries `ver` = hash of the role template + skills + model + thinking. KPIs are grouped by `ver`, so each change is visible as its own column. Without `ver` no number can be tied to a change.
- Canary: a new `ver` runs on 1 of the 4 agent slots. After 10 runs, a script compares it with the current `ver` on the same window: promote if first-pass rate is not lower and median tokens per pass ≤ +10%; roll back if worse; else 10 more runs (max 30, then roll back).
- Noise: no decision on fewer than 10 runs. Medians, not means (one runaway agent must not decide). Replay evals (step 5) give the same tickets to both versions, for changes that cannot wait for live traffic.

## Research that turns into change
- Research output is proposals in the step 4 format. They go through canary or eval like everything else. Nothing is applied because it was read somewhere.

## Guardrails (so it cannot run wild)
- Budgets in code: tokens per day per model, max agents (4), max loop rounds, max open process-review tickets (1). The dispatcher refuses work past a budget and posts one digest line.
- Kill switch: `~/.pig/STOP` halts dispatch, loops and the watchdog.
- Stop the line: any KPI regression after a change → auto-revert proposal.
- Only Patrick approves changes to models, roles, phases or budgets.

## Build order (each is one ticket, each needs the one before)
1. Wire `tools/usage` into agent exit (wt finish/stopgap) and the loop. Prove: ledger rows = runs. (#174)
1b. `ver` + role on every row: `tools/agent` writes a run record, `tools/usage` joins it.
2. `tools/kpi` (grouped by `ver`) + 15-min timer + digest line.
2b. Canary slot in `tools/agent` + promote/rollback script.
3. Trigger → process-review ticket.
4. `evals/` runner + 5 replay cases from closed tickets.
5. process-review template + weekly research loop.
6. Budgets + STOP file in the dispatcher.
