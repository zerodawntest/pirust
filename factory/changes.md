# Changes: retros and decisions

Every process change starts here as a decision with the metric it must move. The hook ceo-flow
blocks the CEO from creating a ticket whose title is not in this file (escalations excepted), and
blocks the CEO from settling while an ended loop has no `## loop:<name> r<rows>` block here.

## loop:lifecycle r0
- Numbers: stage research r1, qwen38-flash-next medium, 35 turns, 617 bash calls, context grew to 157,616 of 163,840, stop `length`, no research.md, exit 3. 26,784 output tokens, 158,356 uncached input. Ledger empty (no row on exit 3). Log 7.0 MB, of which 10,860 of 11,438 lines are streaming deltas.
- Cause: an open research goal with no output budget on a 160k model: it kept reading and never wrote. The loop could not see the cost.
- Changes:
  1. Research, review and architect stages run on openai-codex/gpt-6.1-sol; usage and stop reason go in the ledger on every exit (#171). Metric: research stage writes its output in ≥ 90% of runs; tokens per stage visible in 100% of ledger rows.
  2. Loop logs keep only the final events (no `message_update` deltas). Metric: stage log size < 500 KB.
  3. The researcher writes research.md early and updates it (output first, then extend). Metric: no stage ends with `length` and no output.
- Decision: rerun only after #171 lands. Goal moves to Port phase 0 (loop p0); lifecycle goal is parked.

## Decision 2026-11-17: CEO flow is enforced by hook, not by rules
- Patrick asked for research > review > plan > break > continue > improve to be forced. `.pi/extensions/ceo-flow.ts` + `tools/loop-publish`.
- Metric: CEO-created tickets without a loop or a decision here = 0 (blocked); every ended loop has a retro block; Patrick-initiated process changes per day falling.
