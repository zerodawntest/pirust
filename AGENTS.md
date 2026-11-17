# pirust — context for every agent

Rust port of pi (the coding agent `pi-coding-agent` and its SDK) and of `pi-durable-cloudflare`, as close to a clone as we can get.
You will meet bugs, mostly performance (handlers running six times, foreground waits, one MCP per session): the improvement wins over the clone.
The durable part matters as much as the plain port. Keep it close to pi, function for function.

## Work rules (all agents)

- One ticket per agent. Change only the files the ticket names; if others are needed, stop and say so in HANDOFF.md.
- No git, no GitHub, no new dependencies. You run sandboxed (`tools/sandbox <worktree> <cmd>`): no `~/.ssh`, no git/GitHub credentials, the `gh` and `hc` binaries are masked. The orchestrator handles git.
- Verify locally with the narrowest command (`cargo test -p <crate>`, `shellcheck <file>`). Do not wait for CI.
- Comments only where code is non-obvious. No docs unless the ticket asks; docs live in `docs/`, one file per topic, so a PR does not touch every doc.
- Model: `ibm-next/qwen38-flash-next`, `--thinking low` for coding. Everyone runs pi 1.5.1.
- Nothing blocking in the foreground: `hc run --bg --rm --no-notify --name pirust-<x> -- bash -c '<cmd>'`; the finish notification arrives as a message.
- `/` is tmpfs, `/tmp` is wiped on reboot. Anything that must survive goes in this repo, `~/.pig`, `~/Documents`, `~/.ssh`, `~/.config/gh`, `~/.config/herdr-*`, `~/.local/state/herdr-core`.
- Every commit is signed. Every "done" cites the command you ran and its result.
- Work only from the ticket and this file; do not read the history, and do not message the orchestrator — `HANDOFF.md` is the handoff.

## Handoff
`HANDOFF.md` in the worktree, max 3 lines: what changed; what you ran + result; open issue or "none". Start with `BLOCKED:` if you could not finish. Then stop.

## Load on demand
`factory/lifecycle.md` is the whole factory flow, and it is scripted: code runs it, an agent wakes only for a `BLOCKED:` handoff, a design, or a `needs:patrick` ticket.
The rules for your role are in your system prompt. `factory/ceo/RULES.md` is the orchestrator's, injected into its own sessions only — do not read it on a code ticket.
Skills (`.agents/skills/`): load `pi-extension-check` before shipping an extension, `pi-hooks` before designing a guard, `factory-ticket` before writing one, `factory-bg` before any long `hc` call.
