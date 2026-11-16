# Runtime facts (verified 2026-11-17; injected into lead sessions)

- Everyone runs on **pi** 1.5.1 (Patrick, 2026-11-17). pig (fork, 0.7.0+1.5.0) is being removed from the agent launch (ticket "agents on pi").
- pi docs: /nix/store/w3j2zc6sidwg028h4b1wqw6yillkf9jm-pi-1.5.1/libexec/pi/docs. Read the relevant doc fully before acting.
- CEO t1nm and pirust-driver sessions: ~/.pi/agent/sessions/--home-zerodawn-private-pirust--/. Agents (today): ~/.pig/sandbox/agent/sessions/.
- t1nm loads .pi/extensions/*; the driver runs `-ne -e .pi/extensions/ceo-guard.ts`.
- hc children end with their parent unless `--outlive-parent` (hc --skill l.11).
- Extension load check: `echo '{"type":"get_state"}' | pi --mode rpc --no-session -e <ext>`; failure prints "Failed to load extension".
- Pi does not continue after compaction by itself; ceo-guard's own compact (agent_end, 100k) has no onComplete.
- Persistent: ~/.pi, ~/.pig, ~/private, ~/Documents. Wiped: /tmp, ~/.cache.
- Never call reload_runtime from a lead; extcheck first, then Patrick-visible restart.
