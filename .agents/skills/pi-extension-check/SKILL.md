---
name: pi-extension-check
description: Prove a pi extension loads before merge or reload. Use whenever .pi/extensions or factory/extensions change.
---
- `echo '{"type":"get_state"}' | timeout 25 pi --mode rpc --no-session -e <file>` from a cwd outside the repo; "Failed to load extension" = fail. Check the exit code before piping anywhere.
- Logic: `node --test <test file>`; cite pass/fail counts.
- Skills: quote the frontmatter description if it contains ": " (YAML), else the skill silently does not load. Check: echo {"type":"get_commands"} | pi --mode rpc --no-session -ne --skill <dir> shows skill:<name>.
- Leads never call reload_runtime; a changed extension applies at the next restart of that session.
