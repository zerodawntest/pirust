# Factory design (replaces pi-enforcement, automation, agent-guard, ceo-daemon)

Principle: the LLM only writes code and judges. Checks, dispatch, review routing, merge, ticket updates and recovery are code on events. Rules are enforced by hooks, not by text.

## Roles (all on pi 1.5.1)
| Role | Model | Loads |
|---|---|---|
| CEO chat t1nm | Opus 5.5 high | ceo-guard, keepalive, gh-events (until the daemon) |
| Driver | Opus 5.5 high | -ne, ceo-guard, keepalive |
| Coding agents | ibm-next/qwen38-flash-next, low | agent-guard, sandboxed (tools/sandbox) |
| Reviewer / planner / architect | qwen, medium; read-only tool set | role profile, verdict tool |

## Hooks (pi events)
| Failure | Hook |
|---|---|
| Lead stops with work left | `agent_before_settle` stop gate: runs `tools/next-work` (Ready, open PRs, idle slots, done agents unfinished); if non-empty returns a hidden message + `continue: true`, max 3 per turn ("Stop Hook Auto-Continue", agentic-patterns.com) |
| Idle after compaction | `ctx.compact({onComplete})` and `session_compact` → followUp "re-read STATE.md, continue" |
| Context grows | reset in process, no LLM summary: `turn_end` returns a `compaction` draft entry (summary = STATE.md or ticket+HANDOFF) + `continue: true`; `session_before_compact` returns the same summary for pi's own compactions (session-format.md, compaction.md) |
| Not reading docs | `before_agent_start` injects factory/runtime.md + lessons (deterministic text, cache-safe); `tool_call` blocks known mistakes (factory/lessons.json) |
| CEO writes code, foreground waits | ceo-guard `tool_call` block |
| Agent scope, git, loops | agent-guard: edits only in the ticket's `Files:`, git blocked, same call 3× blocked |
| Agent too long | #106: at the step limit `setActiveTools(["handoff"])` + `tool_call` block; strict handoff tool (`constrainedSampling`, lint in execute, throw on invalid); text reply → `context_edit` remove + continue (2×) → extension writes HANDOFF itself; then compaction reset in process. 3 refreshes → blocked, needs:split |
| Bad handoff | `agent_before_settle`: tools/check (tests, lint of touched files); fail → hidden message + continue, max 2; `Status: done` needs `Verified: cmd -> result` |
| Review | on finish: tools/review picks the area reviewer; verdict tool; nobody else is woken |
| Bad extension | tools/extcheck (`pi --mode rpc --no-session -e`) before any reload |

## Outside pi (when pi itself is down)
- `tools/watchdog`, systemd user timer, 2 min: lead gone / idle after compaction / driver idle while events grow / webhook forwarder down → relaunch, `hc send`, or ESCALATE line. No LLM.
- `tools/factory.mjs` daemon: webhooks with catch-up, hc events reconciled at start, agent monitor, dispatcher, token log. Proven by `tools/drill`.
- Launch with `--outlive-parent`: hc children end with their parent otherwise.

## Budgets
- Weighted tokens = in + out + 0.1·cacheRead. Agent soft 250k (handoff), hard 400k after the soft step. Loop 4×, stall 5 min.
- Measure per wake and per ticket in ~/.pi/pirust-usage.log; tune weekly.

## Durable (target runtime for the leads)
pi-durable: `Conversation.reset(handoff)`, checkpointed tasks, `Harness.wake()` timers, `pi.usage`, SQLite. Spike #78 decides; SDK `newSession` is the fallback.
