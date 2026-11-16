---
name: pi-drive
description: "Drive a pi agent from a script (RPC or SDK) instead of LLM steering or hc text sends: start, prompt, steer, measure, reset, stop. Use when building the dispatcher, a watchdog, or anything that hands work to an agent."
---
Docs: /nix/store/w3j2zc6sidwg028h4b1wqw6yillkf9jm-pi-1.5.1/libexec/pi/docs (D). Binary: pi, never pig.

Why: a script that owns the agent's stdin decides when it starts, what it gets next, and when it resets. No LLM reads logs, polls, or relays.

## RPC (agent in its own process, e.g. inside tools/sandbox)
- Start: `tools/sandbox <wt> pi --mode rpc --model ibm-next/qwen38-flash-next --thinking low ...`; JSONL on stdin/stdout, stderr is not protocol (D/rpc.md:12, 73).
- `{"id","type":"prompt","message"}` → response `data.disposition` started|queued|handled; that is acceptance, not completion (D/rpc.md:58, D/rpc-commands.md:7).
- Done = event `agent_settled` (not `agent_end`: retries/compaction/follow-ups can follow) (D/rpc.md:69).
- While running: `prompt` needs `streamingBehavior: "steer"|"followUp"`, or use `steer` / `follow_up` (D/rpc-commands.md:20, 46, 70).
- `abort` waits for idle; `clear_queue` before it drops queued messages (D/rpc-commands.md:94, 107).
- Reset without relaunch: `new_session` (cancellable by `session_before_switch`) then `prompt` with ticket + HANDOFF (D/rpc-commands.md:130).
- Measure: `get_session_stats` → tokens input/output/cacheRead/cacheWrite/total, cost, contextUsage.percent (D/rpc-commands.md:526).
- `compact`, `set_auto_compaction`, `set_auto_retry` (D/rpc-commands.md:367, 406, 421); `get_last_assistant_text` (:747).
- Stop: close stdin (orderly), SIGTERM ok; a second signal kills (D/rpc.md:91). `ctx.shutdown()` from an extension exits when idle (D/rpc.md:97).
- Subscribe before prompting; TS clients: exported `RpcClient` / `promptAndWait()` (D/rpc.md:71, 7).

## SDK (in-process Node host)
- `createAgentSession({cwd, sessionManager, resourceLoader, model, tools})`; `await session.prompt()` resolves when the run finishes (D/sdk.md:20, 62).
- `session.subscribe(ev)`; `agent_settled` = will not continue (D/sdk.md:72).
- `AgentSessionRuntime.newSession()/fork()` replaces the session from the host: no deadlock, unlike `ctx.newSession` in events; rebind subscriptions after (D/sdk.md:58).
- `SessionManager.inMemory()` for throwaway runs (D/sdk.md:42).
- Inline extensions via `DefaultResourceLoader` extensionFactories (D/sdk.md:110). CLI-only built-ins (codemode, MCP) must be added there.
- No process isolation: an SDK agent runs with the host's rights. For sandboxed coders use RPC inside tools/sandbox.

## Factory mapping
- Dispatcher = one host process per agent over RPC: prompt ticket → watch events/`get_session_stats` → at budget: `steer` handoff or let agent-guard force it → `new_session` + next prompt → on `agent_settled` with HANDOFF: run wt finish → next ticket. Replaces hc send, session-file watching and budget kills.
- Print mode (`-p`) only for one-shot probes.
