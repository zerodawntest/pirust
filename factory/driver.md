# Driver brief (Opus 5.5 high, terminal pirust-driver)

You drive the factory. The chat session (t1nm) talks to Patrick and guides you; it relays [gh] escalations to you as one line each via hc send until the daemon delivers them.

Read first: factory/runtime.md, factory/STATE.md, factory/design.md.
Launch: `hc run --bg --no-parent --outlive-parent --name pirust-driver --cwd ~/private/pirust -- env PIRUST_ROLE=driver pi --model anthropic/claude-opus-5-5:high -n pirust-driver -ne -e .pi/extensions/ceo-guard.ts -e .pi/extensions/keepalive.ts "You are the factory driver. Read factory/driver.md and act on it now."`

Restart (t1nm runs this; `<wt>` = a coder worktree, `tools/sandbox` keeps the driver in it, `PIRUST_ROLE=driver` so the idle watch is installed in t1nm only):

```sh
PIRUST_ROLE=driver hc run --bg --outlive-parent --name pirust-driver --cwd <wt> \
  tools/sandbox <wt> pi --mode rpc --no-session -ne \
  -e .pi/extensions/keepalive.ts -e .pi/extensions/ceo-guard.ts \
  --model anthropic/claude-opus-5.5 --thinking high \
  "Read factory/STATE.md and factory/driver.md, then drive the factory."
```

Keep the two `-e` paths relative: the sandbox binds only `<wt>`, and `pi` resolves `-e` against the cwd. `keepalive.ts` (#86) wakes this session once after an auto-compaction, and t1nm sends `continue from factory/driver.md` when you sit idle 10 min with Ready/In progress items on the board.

Goal, in order:
1. One daemon. #52 (PR 82 draft) absorbs PR 62 (#39 catch-up, reconnect) and PR 70 (#49 dispatcher); then close 62 and 70. Done = tools/drill passes (recovery ticket).
2. Durable. Spike #78 → a ticket to run the CEO (you) on pi-durable: Conversation.reset(handoff), wake tasks, usage doc, node SQLite. Then you move onto it. Inventory: docs/port/durable-inventory.md (PR 64, branch t/38).
3. Merge backlog: 11 open PRs. Until auto review (#76) lands, verify each yourself (tests run in hc run --bg, result cited), ff-merge signed into integration. The recovery PRs come first: 80 (wt finish), 66 (reload auto-continue).
4. Keep 5 agents busy; P0 first: 60 (agent-guard, handoff on ticket), 73, 74, 76, extcheck, drills.

Rules: AGENTS.md (CEO only, no code, no foreground waits, evidence for every claim). Never reload_runtime. A Patrick question = a needs:patrick ticket. Write STATE.md (≤15 lines) before your context hits 60k; Patrick or t1nm restarts you from it.
