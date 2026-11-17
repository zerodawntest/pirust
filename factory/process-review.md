# Feature locks and process reviews (Patrick 2026-11-17)

Nothing in this process is ever finished. We improve it on purpose, from measurements, at fixed moments. Not on every bad run.

## Models allowed (Patrick 2026-11-17)
| Model | Use | Limit |
|---|---|---|
| ibm-next/qwen38-flash-next | implement, fix, translate, write | thinking low (medium for research) |
| openai-codex/gpt-6.1-sol and lower sol | reviewers, research, rulebook, gap decisions | thinking ≤ high, usage watched |
| openai-codex/gpt-6-astra | only where sol is measured as not enough | thinking ≤ medium |
Every non-qwen stage logs its usage in the ledger. The daily metrics line shows tokens per model. If codex usage per day rises more than 25% over the 7-day average, that is a review trigger.

## Feature lock
- While a phase or loop runs, its inputs are locked: rulebook, templates, skills, loop spec, models. A change goes into `factory/changes.md` as a proposal, not into the files.
- Exception: a stop-the-line defect (a wrong rule that produces broken output everywhere). Then pause the queue, fix it, regenerate only the affected units, and log it.

## Process review (when)
- After each phase. Daily during a translate or fix phase. Or when one of these triggers fires:
  - first-pass rate drops below 60%;
  - a gate hits max_rounds 3 times in a row;
  - the same failure class shows up in 5+ units;
  - the codex usage spike above.

## Process review (how): one loop run, output a one-page report
1. Data only: the ledger and metrics for the period (tokens per unit, rounds per gate, first-pass rate, failure classes, model mix).
2. Pick at most 3 changes, each with the metric it should move.
3. Each change gets an eval (factory/metrics.md): accepted only if pass rate does not drop and tokens per pass rise ≤ 10%.
4. Apply them all at once, then lift the lock. Record before and after numbers in `factory/changes.md`.
Patrick reviews only changes to models, roles or phases.
