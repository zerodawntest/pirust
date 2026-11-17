# Roles: model, skills, prompt (Patrick 2026-11-17)

Every role starts with `--no-skills` and loads only its own skills with `--skill .agents/skills/<name>` (relative to the worktree, so the skill matches the branch).
Proof that this works: `pi --mode rpc --no-session -ne --no-skills --skill .agents/skills/factory-ticket` lists only `skill:factory-ticket`.

| Role | Thinking | Skills | Prompt (template body) |
|---|---|---|---|
| coder | low | none; by ticket label: `area:ext` adds pi-hooks, pi-extension-check | one ticket, named files only, narrowest check, HANDOFF |
| reviewer | medium | same label skills as the coder | read-only, check Files and Verify lines, REVIEW.md |
| planner | medium | factory-ticket | output tickets in the factory-ticket body format |
| architect | high | pi-hooks, pi-drive | one ADR, proposed |
| driver (lead) | per Patrick | factory-bg, factory-merge, factory-recover, factory-ticket, pi-extension-check | factory/driver.md |
| CEO (lead) | per Patrick | factory-bg, factory-ticket, pi-hooks, pi-drive | AGENTS.md |

HANDOFF (coder, every step, overwritten, max 5 lines):
`Status: done|wip|blocked` / `Done:` / `Next:` / `Files:` / `Verified: <cmd> -> <result>`.

A new skill gets a row here before any role loads it, and an eval case (factory/metrics.md) before it counts as good.
Leads' launch lines change only on restart: `needs:patrick` ticket.
