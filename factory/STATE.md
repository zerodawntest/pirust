# Orchestrator state (resume here)
- 2026-11-17 00:00: driver = pirust-driver (t1r4, Opus 5.5 high, -ne + ceo-guard, brief factory/driver.md). t1nm = Patrick chat + liaison host; relays escalations via hc send pirust-driver until the daemon (#52) delivers them. Restart the driver: same hc run, see driver.md.
- Liaison+monitor+stopgap dispatch: .pi/extensions/gh-events.ts. CEO rules: .pi/extensions/ceo-guard.ts. Digest ~/.pi/pirust-digest.log
- Designs: factory/ceo-daemon.md (Opus 5.5 high CEO, chat moves to a lower model later, pi-durable candidate), factory/agent-guard.md, factory/pi-enforcement.md, factory/automation.md (script it map)
- Running 2026-11-16 23:50: 52 53 60 63 68. New tickets: agent-tools handoff, handoff gate, loadout, auto review, durable spike, catalogue (numbers in digest)
- P0 Ready: 60 agent-guard, 61 ticket validation, wt-finish bug, 53 monitor budget/handoff. Running: 46 49 50 52 (+1 dispatched)
- In review, no reviewer yet: PR 59 (#41), #39 PR, #38. Merge after reviewer/dispatcher ticket lands, or CEO ff-merges with CI green.
- Known: done state missed at liaison start (#40, #38). False stall kills on finished agents (fix in 53/60).
- Waiting on Patrick: #4 #5 #6 #28 #32
- Don't reload_runtime (it ends the turn) until #50 lands
