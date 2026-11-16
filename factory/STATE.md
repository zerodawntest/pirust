# Orchestrator state (resume here)
- Driver brief: factory/driver.md. Liaison/dispatcher in t1nm (gh-events.ts) stalled ~23:00 → driver dispatched/finished by hand; #86 keepalive fixes it.
- ff-merge recipe: hc run --bg bash fn `ff PR TICKET CHECK` (rebase on integration in ~/.pig/cache/merge-N, %G? check, push t/N + integration). Logged as `PRnn ...` in digest.
- 2026-11-17 00:05 merged + Done: 80 66 77 64 59 85 88 89 90.
- Stopgap dispatcher: hc terminal pirust-stopgap (bash loop 30s: finish done agents, launch queue 91 92 then next-ready, max 5). Kill it when #91 watchdog lands.
- Rejected → Ready: 67/#46 (actionlint top-level fail-fast), 71/#61 (test creates real issue), 87/#68 (RULES_PATH ../ → ../../), 51/#40 (conflict tools/wt).
- Running: 76 86 52 60 83 (parent t1nm, --outlive-parent). Queue: 91 92, then 84 drills (after 52), then P1 Ready 55 57 58 65 69 75 78 79 81.
- #52 PR 82 must absorb 62 (#39) + 70 (#49), then close 62/70. Then #78 durable spike → CEO-on-durable ticket.
- Waiting on Patrick: #4 #5 #6 #28 #32
