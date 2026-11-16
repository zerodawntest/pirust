// Agent session budget: pure math over a session jsonl (no imports, no I/O) so it is unit-testable.
// One session file = one launch, so totals reset when tools/agent relaunches an agent on the same worktree.
// See factory/ceo-daemon.md (Agents: reset and handoff) and ticket #53.

export const SOFT_LIMIT = 250_000; // steer the agent to hand off
export const HARD_LIMIT = 400_000; // kill, and only after a handoff was requested
export const CACHE_READ_WEIGHT = 0.1; // a cache read costs ~10% of an input token

/**
 * Totals for one agent session file. `off` is the byte offset already read.
 * @typedef {Object} SessionTotals
 * @property {number} off
 * @property {number} input
 * @property {number} output
 * @property {number} cacheRead
 * @property {string[]} calls Last 4 tool calls (`name` + JSON args), for loop detection.
 * @property {number} openCalls Tool calls with no result yet.
 * @property {string} lastRole
 * @property {number} lastCalls Tool calls in the last assistant message.
 * @property {boolean} steered A handoff was requested.
 * @property {ReturnType<typeof setTimeout> | undefined} stall
 */

/** @returns {SessionTotals} */
export function newTotals() {
  return { off: 0, input: 0, output: 0, cacheRead: 0, calls: [], openCalls: 0, lastRole: "", lastCalls: 0, steered: false, stall: undefined };
}

/** Append the lines a session file gained since `t.off`. Mutates and returns `t`. */
export function addSessionLines(t, text) {
  for (const line of text.split("\n")) {
    if (!line.trim()) continue;
    let e;
    try {
      e = JSON.parse(line);
    } catch {
      continue;
    }
    if (e.type !== "message" || typeof e.message?.role !== "string") continue;
    const m = e.message;
    t.input += m.usage?.input ?? 0;
    t.output += m.usage?.output ?? 0;
    t.cacheRead += m.usage?.cacheRead ?? 0;
    let calls = 0;
    for (const c of m.content ?? []) {
      if (c.type === "toolCall") {
        t.calls.push(c.name + JSON.stringify(c.arguments));
        calls++;
      }
    }
    t.calls = t.calls.slice(-4);
    if (m.role === "assistant") t.openCalls += calls;
    else if (m.role === "toolResult") t.openCalls = Math.max(0, t.openCalls - 1);
    if (m.role === "assistant") t.lastCalls = calls;
    t.lastRole = m.role;
  }
  return t;
}

/** Weighted tokens: cache reads count 10%, they are not a new full context. */
export function weighted(t) {
  return t.input + t.output + CACHE_READ_WEIGHT * t.cacheRead;
}

/** The agent's last message is text with no tool call: it is done, and idle is not a stall. */
export function isFinished(t) {
  return t.lastRole === "assistant" && t.lastCalls === 0;
}

/** A tool call is open, or a turn is running: the stall timer applies. */
export function isBusy(t) {
  return t.openCalls > 0 || !isFinished(t);
}

/** The same tool call 4x in a row. */
export function isLoop(t) {
  return t.calls.length === 4 && t.calls.every((c) => c === t.calls[0]);
}

const k = (n) => `${Math.round(n / 1000)}k`;
const breakdown = (t) => `${k(t.input + t.output + CACHE_READ_WEIGHT * t.cacheRead)}/${k(HARD_LIMIT)} (in ${k(t.input)} out ${k(t.output)} cacheRead ${k(t.cacheRead)})`;

/**
 * Budget decision for a session. Sets `steered` when asking for a handoff.
 * @returns {{ action: "kill" | "steer" | "none", reason?: string }}
 */
export function budget(t) {
  const w = t.input + t.output + CACHE_READ_WEIGHT * t.cacheRead;
  if (isLoop(t)) return { action: "kill", reason: "loop: same tool call 4x" };
  if (t.steered && w > HARD_LIMIT) return { action: "kill", reason: `budget ${breakdown(t)}` };
  if (!t.steered && w > SOFT_LIMIT) {
    t.steered = true;
    return { action: "steer", reason: `soft limit: at ${k(w)} (in ${k(t.input)} out ${k(t.output)} cacheRead ${k(t.cacheRead)}). Write HANDOFF.md (Status: wip, Done:, Next:, ≤5 lines), commit WIP, stop; a fresh session continues.` };
  }
  return { action: "none" };
}
