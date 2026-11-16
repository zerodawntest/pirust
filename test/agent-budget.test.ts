// Unit tests for the agent session budget (tools/agent-budget.mjs), run with:
//   node --test test/agent-budget.test.ts
// Fixtures are real pig agent session files (--home-...-pirust-wt-29--/...jsonl), trimmed as needed.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { addSessionLines, budget, isBusy, isFinished, isLoop, newTotals, weighted, SOFT_LIMIT, HARD_LIMIT } from "../tools/agent-budget.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const fixture = (name) => readFileSync(resolve(here, "fixtures", name), "utf8");

const read = (name) => {
  const t = newTotals();
  addSessionLines(t, fixture(name));
  return t;
};

test("totals and weighted cost from a real session file", () => {
  const t = read("agent-session.jsonl");
  assert.equal(t.input, 31347);
  assert.equal(t.output, 18151);
  assert.equal(t.cacheRead, 260416);
  assert.ok(Math.abs(weighted(t) - 75539.6) < 1e-6);
  assert.ok(isFinished(t), "last assistant message has no tool call");
  assert.ok(!isBusy(t));
  assert.equal(budget(t).action, "none");
});

test("a relaunch on the same worktree starts a fresh budget", () => {
  const text = fixture("agent-session-midturn.jsonl");
  const first = newTotals();
  addSessionLines(first, text);
  const second = newTotals();
  addSessionLines(second, text);
  // one entry per session file (the key is the file), so each launch has its own totals
  assert.equal(first.input, 4402);
  assert.equal(second.input, 4402);
  const shared = newTotals();
  addSessionLines(shared, text);
  addSessionLines(shared, text);
  assert.equal(shared.input, 8804, "one key for both launches doubles the budget");
});

test("stall timer only runs while a tool call is open or a turn is running", () => {
  const mid = read("agent-session-midturn.jsonl");
  assert.ok(isBusy(mid), "5 tool calls open, no results yet");
  assert.ok(!isFinished(mid));
  const done = read("agent-session.jsonl");
  assert.ok(!isBusy(done));
});

test("loop: same tool call 4x", () => {
  const t = read("agent-session-loop.jsonl");
  assert.ok(isLoop(t));
  const d = budget(t);
  assert.equal(d.action, "kill");
  assert.equal(d.reason, "loop: same tool call 4x");
});

test("the extension imports the budget module by a path that exists", () => {
  const ext = resolve(here, "../.pi/extensions/gh-events.ts");
  const spec = readFileSync(ext, "utf8").match(/from "([^"]+agent-budget\.mjs)"/)?.[1];
  assert.ok(spec, "gh-events.ts imports the budget module");
  assert.ok(existsSync(resolve(dirname(ext), spec!)), "the import path resolves");
});

test("soft limit steers to a handoff, hard kill only after it", () => {
  const t = newTotals();
  t.input = SOFT_LIMIT / 2;
  t.output = SOFT_LIMIT / 2;
  t.cacheRead = 0;
  assert.equal(budget(t).action, "none", "at the soft limit, not over it");
  t.input += 1000;
  const d1 = budget(t);
  assert.equal(d1.action, "steer");
  assert.match(d1.reason, /^soft limit: at 251k \(in 126k out 125k cacheRead 0k\)/);
  assert.equal(d1.reason, "soft limit: at 251k (in 126k out 125k cacheRead 0k). Write HANDOFF.md (Status: wip, Done:, Next:, ≤5 lines), commit WIP, stop; a fresh session continues.");
  assert.equal(t.steered, true);
  t.cacheRead = 2_000_000;
  const d2 = budget(t);
  assert.equal(d2.action, "kill");
  assert.equal(d2.reason, `budget ${Math.round(weighted(t) / 1000)}k/${HARD_LIMIT / 1000}k (in 126k out 125k cacheRead 2000k)`);
});
