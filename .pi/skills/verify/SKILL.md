---
name: verify
description: Verify a change with the narrowest local command (cargo test/clippy -p, shellcheck, node --test) before claiming done. Use before any "done" claim, HANDOFF.md, or PR.
---

Run the narrowest command that proves the change; do not wait for CI (source: `AGENTS.md` "No claim without evidence", `factory/templates/coder.md`).

- Pick the narrowest test for what you touched: `cargo test -p <crate>`, `cargo clippy -p <crate>`, `shellcheck <file>`, `node --test <file>`.
- Run it in the sandbox so it matches the agent env: `tools/sandbox <wt> <cmd>`.
- Fix what fails, re-run; a pass is not proof until you ran it and saw the result.
- Cite the check when reporting done: `command -> result` in `HANDOFF.md` (`Verified:`, see the `handoff` skill).
- Do not run the full CI, the full `cargo test`, `cargo build --workspace`, `git push`, `gh`, or an `hc` wait; a coder does not need a green PR to hand off.
- Do not trust claims in `HANDOFF.md`/`REVIEW.md`; run the narrowest command yourself.

Source: `AGENTS.md`, `factory/templates/coder.md`.
