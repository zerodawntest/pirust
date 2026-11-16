# Orchestrator state (resume here)
- Liaison+monitor+stopgap dispatch: .pi/extensions/gh-events.ts. CEO rules: .pi/extensions/ceo-guard.ts. Digest ~/.pi/pirust-digest.log
- Designs: factory/ceo-daemon.md (Opus 5.5 SDK CEO, approved), factory/agent-guard.md
- P0 Ready: 60 agent-guard, 61 ticket validation, wt-finish bug, 53 monitor budget/handoff. Running: 46 49 50 52 (+1 dispatched)
- In review, no reviewer yet: PR 59 (#41), #39 PR, #38. Merge after reviewer/dispatcher ticket lands, or CEO ff-merges with CI green.
- Known: done state missed at liaison start (#40, #38). False stall kills on finished agents (fix in 53/60).
- Waiting on Patrick: #4 #5 #6 #28 #32
- Don't reload_runtime (it ends the turn) until #50 lands
