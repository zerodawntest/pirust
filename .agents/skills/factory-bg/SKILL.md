---
name: factory-bg
description: Run anything slower than 5s (builds, tests, git push, gh loops, merges) in the background with herdr. Use before any long command.
---
- `hc run --bg --rm --no-notify --name pirust-<x> -- bash -c '<cmd>; echo "$(date -Is) <x>: <result>" >> ~/.pi/pirust-digest.log'`
- Need the result as a message: drop `--no-notify`. Must survive t1nm: add `--outlive-parent`.
- No foreground waiting, sleeping, polling or repeated `hc read`. Read the digest line once when notified.
- Proof of state: `hc ls` (terminals), `herdr-app ls` (sub_agents, panes).
