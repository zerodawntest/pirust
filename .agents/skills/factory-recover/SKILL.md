---
name: factory-recover
description: Resume the factory after a crash, compaction, restart or stall of t1nm or the driver. Use at session start or when told to continue.
---
1. Read factory/runtime.md and factory/STATE.md.
2. `hc ls`: pirust-driver missing → relaunch with the line in factory/driver.md. Agents `done` but not finished → `tools/wt finish N` via factory-bg.
3. `tail -20 ~/.pi/pirust-digest.log` for events since STATE.md.
4. Board: Ready by priority; In progress without a terminal → Ready.
5. Continue Next work; overwrite STATE.md (≤15 lines).
