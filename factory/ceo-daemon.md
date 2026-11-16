# CEO daemon (replaces the long-lived orchestrator session)

Why: a long chat session crashes or reloads and loses events, its context grows (200k), and any wake more than 5 min apart re-pays the whole context because the cache has expired.

- **One process** `tools/factory.mjs`, run as `hc run --bg --keep` in the pirust herdr tab. It does not depend on any chat session. It contains:
  - the gh webhook stream, with reconnect and catch-up via the API since the last seen event;
  - the hc event stream, with reconciliation at startup;
  - the session-file monitor (loop, 5 min stall, budget);
  - the dispatcher (Ready → `tools/agent`, PR → reviewer, approve → ff-merge);
  - token logging per ticket.
- **CEO = stateless SDK wake:** `createAgentSession({ sessionManager: SessionManager.inMemory() })`, then one `prompt()`, then `dispose()`.
  - **Prompt order:** fixed CEO prompt first (a stable prefix, so it caches), then `factory/STATE.md`, then the event batch.
  - **Tools:** ticket and gh comment, kill/relaunch an agent, write `STATE.md`. No code edits; ceo-guard rules apply.
  - **Ending:** each wake rewrites `STATE.md` (≤15 lines) and exits.
- **Wake triggers:** immediately for Patrick's comments, reviews and assignments; failed agents and CI batched over ≤10 min. Routine events never wake it.
- **Chat with Patrick:** ticket comments, or `tools/ceo "msg"` in a herdr terminal, which runs one wake.
- **Measuring:** log tokens and cost per wake to `~/.pi/pirust-usage.log`.
- **Cutover:** run it alongside the old session. After 24h with no missed events, stop the orchestrator session.
