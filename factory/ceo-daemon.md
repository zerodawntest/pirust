# CEO daemon

Decision by Patrick (2026-11-16): the CEO is an SDK orchestrator on Opus 5.5. It runs alongside the chat session first, gets tuned on measurements, and then the chat session stops.

## Measured (chat session, 250 requests, $9.96)
- Cache reads: $4.86. An average context of ~97k tokens is re-read on every request. Lever: a small context, and fewer requests per wake.
- Output: $2.84, from the CEO writing code and scripts. Lever: the CEO doesn't write code (ceo-guard).
- Cache writes: $2.29, from 165k characters of tool output. Lever: cap tool output, and send short event messages.
- Cache misses (a gap of more than 5 min): 1 out of 250. Not a lever while the CEO is busy.

## Process `tools/factory.mjs` (hc run --bg --keep, pirust tab)
It runs the gh webhooks (reconnect, plus catch-up via the API), hc events (reconciled at startup), the agent monitor, the dispatcher, and the token log. It does not depend on any chat session.

## CEO session policy (start values; tune from `~/.pi/pirust-usage.log`)
- The SDK session uses Opus 5.5 with `PI_CACHE_RETENTION=long` (1h).
- The session stays warm while wakes come close together. Prompt order: a stable prefix (CEO prompt + rules), then a short tail of events.
- **Reset** rather than compact, by writing `STATE.md` (≤15 lines) and starting a new session, when:
  - the context is over 60k tokens;
  - it has been idle for more than 55 min;
  - or after 40 requests.
  - Compaction costs a full context read plus summary output; a reset only costs a STATE.md of ~5k tokens.
- Use `cache_warming_decision` to stop warming while idle, unless an agent finish is expected within the TTL.
- Wakes come immediately for Patrick. Failures are batched over ≤10 min. Routine events never wake the CEO.
- Measure per wake: requests, context size, cost split, and cache hit/miss. Tune the thresholds weekly.

## Event messages to the CEO
- One line per event, ≤160 characters, de-duplicated (kill + finish = 1 line), with no stderr/tool dumps. Detail goes to the digest, with a reference.
- Example: `#43 killed budget(183k io/3.0M cr), wt finish fail: shellcheck → digest:L120`

## Agents: reset and handoff
- **Soft limit** (weighted = in + out + 0.1·cacheRead > 250k, or context > 50%): steer the agent to "write progress to HANDOFF.md, commit WIP, stop". Then relaunch it fresh with HANDOFF.md + the ticket.
- **Hard kill** only for a loop (the same call 4×), a stall of more than 5 min, or weighted > 400k after a handoff request.
- After 2 handoffs on one ticket, the ticket is too big: the planner splits it (≤50 source files per ticket).
- A WIP commit happens on every handoff or kill, so the worktree never loses work.
