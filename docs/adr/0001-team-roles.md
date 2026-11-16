# ADR-0001: Team roles, models, isolation

Status: accepted (Patrick, #16, 2026-11-16)

- Orchestrator: Claude (pi session in repo root). Only role with GitHub (pirust-bot) and git.
- Coders: `ibm-next/qwen38-flash-next`, low thinking, one ticket each, stateless. Template `factory/templates/coder.md`.
- Reviewer/architect/planner: same model, higher thinking; added when needed. Model changes need Patrick + token data.
- Liaison and scrum are code, not LLMs: `.pi/extensions/gh-events.ts` batches GitHub + agent events.
- Isolation: `tools/sandbox` (bubblewrap): worktree rw, no .git, ssh, gh, keyring, hc. Network shared (gateway); egress filtering is a follow-up.
- Flow: `tools/agent N` -> agent writes HANDOFF.md and stops -> extension runs `tools/wt finish N` (signed commit, PR to integration, ticket In review).
