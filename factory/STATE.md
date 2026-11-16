# Orchestrator state (resume here; skill factory-recover)
- 00:16 CEO: all on pi (Patrick). Docs: factory/README.md, runtime.md, design.md. Skills in .agents/skills. Baseline ~/.pi/pirust-usage.log. t1nm restart needed after 93 + stop gate (#97) land (Patrick-visible).
- Stopgap dispatcher: pirust-stopgap (no parent, outlive). 30s loop: finish done agents (wt finish, kill, rm); launch from ~/.pig/pirust-queue (edit to reorder), then tools/next-ready; max 5. t1nm gh-events also dispatches. Kill when #91 watchdog lands.
- Queue (CEO order): 99 97 | #52 split children 100 102 103 104 105 | 65 96 98, then 84. #52 Backlog (parent); close PR 62 70 82 when children merge.
- Parked (claim "parked:#99"): #40 (PR 51, tools/wt), #60 (tools/sandbox). After #99 merges: clear claim, relaunch.
- Merged + Done 2026-11-17: 80 66 77 64 59 85 88 89 90 93(#86); 67(#46) in flight.
- Rejected → Ready: 71/#61 test makes real issue; 87/#68 RULES_PATH; 95/#76 self-approve 422 + "In review" unquoted; 101/#92 lesson regexes block mentions (.pig, herdr, git push).
- Follow-ups to ticket: test/keepalive.test.ts hangs with hc on PATH; tools/sandbox copies agent-tools.ts into wt (git-excluded now); ~/.config/herdr-core/templates/coder.md must mirror factory/templates after #96.
- #96 absorbs #73 load fix: templates use -ne, so agent-tools/handoff never loads (evidence on #96).
- Waiting on Patrick: #4 #5 #6 #28 #32
