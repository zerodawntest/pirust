# Runtime facts (verified 2026-11-17; check before acting)

| Who | Runtime | Sessions | Extensions |
|---|---|---|---|
| CEO chat t1nm | pi 1.5.1 (not pig), Opus 5.5 high | ~/.pi/agent/sessions/--home-zerodawn-private-pirust--/ | all .pi/extensions/* (project) |
| Driver pirust-driver | pi, Opus 5.5 high | same dir | -ne, only -e .pi/extensions/ceo-guard.ts |
| Agents pirust-N | pig in tools/sandbox, qwen38-flash-next | ~/.pig/sandbox/agent/sessions/ | none from .pi/ |

- pi docs: /nix/store/*-pi-1.5.1/libexec/pi/docs. pig docs are not pi docs.
- hc children end with their parent unless `--outlive-parent` (hc --skill l.11). Today driver and agents are children of t1nm: t1nm dies → all die.
- `pi --mode rpc --no-session -e <ext>` with `{"type":"get_state"}` proves an extension loads (prints "Failed to load extension" otherwise).
- Persistent: ~/.pi and ~/.pig (both @persist). /tmp, ~/.cache wiped on reboot.
- Auto-compaction leaves pi idle; nothing continues it unless keepalive (#86) or the watchdog does.
