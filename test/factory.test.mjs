// Unit tests for the factory daemon (tools/factory.mjs) and the CEO sessions (tools/ceo-wake.mjs).
// Run with:  node --test test/factory*.test.*
// Fixtures: real pig agent session files, a real `hc ls --json` and a real `next-ready` output.
// Every external command is injected, so these tests start no process and touch no network.

import { test } from "node:test";
import assert from "node:assert/strict";
import { appendFileSync, copyFileSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createAgentMonitor, summarize, escalates, resolveBoardRef, relaunchTarget, closesTicket } from "../tools/factory.mjs";
import { buildWakePrompt, needsReset, RESET_REQUESTS, STALL_MS } from "../tools/ceo-wake.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const fixture = (name) => readFileSync(resolve(here, "fixtures", name), "utf8");

/**
 * A monitor over `files` (session files, as the agent writes them) with canned command answers.
 * `calls` records `[command, ...args, opts]`; `files` keys are relative to the monitor's
 * sessionsDir, so a test can write more lines to one and call `onSession` again.
 */
function harness({ files = {}, commands = {}, maxInflight = 3 } = {}) {
  const dir = mkdtempSync(join(tmpdir(), "pig-factory-"));
  const abs = {};
  for (const [name, content] of Object.entries(files)) {
    mkdirSync(join(dir, dirname(name)), { recursive: true });
    if (typeof content === "string") writeFileSync(join(dir, name), content);
    else copyFileSync(content.src, join(dir, name));
    abs[name] = join(dir, name);
  }
  const calls = [];
  const logs = [];
  const enqueued = [];
  const m = createAgentMonitor({
    sessionsDir: dir,
    maxInflight,
    runCmd: (file, args = [], opts = {}) => {
      const key = basename(file);
      calls.push([key, ...args, opts]);
      const c = commands[key];
      if (c) return typeof c === "function" ? c(args) : c;
      return { code: 0, out: "", err: "" };
    },
    log: (s) => logs.push(s),
    enqueue: (lines, immediate = false) => enqueued.push({ lines, immediate }),
  });
  const of = (cmd) => calls.filter((c) => c[0] === cmd);
  return { dir, abs, m, calls, logs, enqueued, of };
}

// ---- event messages: one line, ≤160 chars, no newlines, no tool or stderr dumps ----

test("a Patrick comment is one line with the body cut to 100 chars", () => {
  const line = summarize("issue_comment", {
    action: "created",
    issue: { number: 43 },
    sender: { login: "Patrick-Kappen", type: "User" },
    comment: { body: `please fix ${"x".repeat(500)}\nand build it` },
  });
  assert.match(line, /^comment #43 by Patrick-Kappen: please fix x{100}$/);
  assert.ok(line.length <= 160, `event message is ${line.length} chars`);
  assert.ok(!line.includes("\n"), "one line");
});

test("Patrick's comment wakes the CEO now; a board move and a bot do not wake it", () => {
  assert.equal(escalates("issue_comment", { sender: { login: "Patrick-Kappen", type: "User" }, action: "created" }), true);
  assert.equal(escalates("issue_comment", { sender: { login: "dependabot[bot]", type: "Bot" }, action: "created" }), false);
  assert.equal(escalates("projects_v2_item", { sender: { login: "Patrick-Kappen", type: "User" }, action: "edited" }), true);
  assert.equal(escalates("issues", { action: "assigned", assignee: { login: "pi" }, sender: { login: "github-actions[bot]", type: "Bot" } }), false);
  assert.equal(escalates("issues", { action: "assigned", assignee: { login: "pi" }, sender: { login: "Patrick-Kappen", type: "User" } }), true);
  assert.equal(escalates("pull_request", { action: "synchronize", sender: { login: "x", type: "User" } }), false);
});

test("a board event names its card by a node id; the daemon resolves it to a ticket", () => {
  assert.equal(resolveBoardRef("board #I_kwDOabc Status -> Ready by bob", () => "77"), "#77 Status -> Ready by bob");
  assert.equal(resolveBoardRef("board #I_kwDOabc Status -> Ready by bob", () => "?"), "#? Status -> Ready by bob");
  assert.equal(resolveBoardRef("comment #43 by x: hi", () => "77"), "comment #43 by x: hi");
});

test("relaunch and review requests are parsed from the ticket and PR bodies", () => {
  assert.deepEqual(relaunchTarget("## Relaunch\n- ticket: 12\n- notes: fix the CLI\n"), { ticket: "12", notes: "fix the CLI" });
  assert.equal(relaunchTarget("no relaunch here"), undefined);
  assert.equal(closesTicket("Fixes stuff\n\nCloses #39"), "39");
  assert.equal(closesTicket("no link"), undefined);
});

// ---- dispatch ----

test("launch passes PIRUST_PARENT so the agent reports to this process", () => {
  const h = harness();
  assert.equal(h.m.launch("77", "reviewer").code, 0);
  assert.deepEqual(h.calls[0].slice(0, 3), ["agent", "77", "reviewer"]);
  assert.equal(h.calls[0][3].env.PIRUST_PARENT, process.env.HC_TERMINAL_ID ?? "");
  assert.ok(h.m.launched.has("77") && h.m.inflight.has("77"));
});

test("three tickets in flight is the cap: the fourth waits", () => {
  const h = harness({ commands: { "next-ready": { code: 0, out: "101\n", err: "" } } });
  for (const n of ["77", "78", "79"]) h.m.launch(n, "coder");
  h.m.launchNext();
  assert.equal(h.of("agent").length, 3, "no launch while 3 are in flight");
  assert.deepEqual(h.of("next-ready"), [], "no query either");
});

test("an agent that calls the same thing 4x is killed and the work goes back to the CEO", () => {
  const h = harness({
    files: { "--home-x-pirust-wt-88--/a.jsonl": { src: resolve(here, "fixtures", "agent-session-loop.jsonl") } },
    commands: { "next-ready": { code: 0, out: "99\n", err: "" } },
  });
  h.m.tickets.set("t88", "88");
  h.m.onSession("--home-x-pirust-wt-88--/a.jsonl");
  assert.deepEqual(h.of("hc").map((c) => c.slice(0, 3)), [["hc", "kill", "t88"], ["hc", "rm", "t88"]]);
  assert.deepEqual(h.of("wt")[0].slice(0, 2), ["wt", "finish"]);
  assert.deepEqual(h.enqueued.at(-1).lines, ["agent #88 killed: loop: same tool call 4x"]);
  assert.equal(h.enqueued.at(-1).immediate, false, "a failed agent is batched, not sent at once");
  assert.equal(h.of("agent").length, 1, "the freed slot takes the next Ready ticket");
  assert.deepEqual(h.of("agent")[0].slice(0, 3), ["agent", "99", "coder"]);
  assert.equal(h.of("next-ready").length, 1);
});

test("reconcile adopts a running agent and finishes one that ended while we were down", () => {
  const h = harness({ commands: { hc: { code: 0, out: fixture("hc-ls.json"), err: "" }, "next-ready": { code: 0, out: "101\n", err: "" } } });
  h.m.reconcile();
  assert.deepEqual([...h.m.tickets], [
    ["socket:/home/zerodawn/.local/state/herdr-core/t/pirust-77.sock", "77"],
    ["socket:/home/zerodawn/.local/state/herdr-core/t/pirust-78.sock", "78"],
  ], "the other project is left alone");
  assert.ok(h.m.inflight.has("77") && h.m.launched.has("77"));
  assert.ok(h.m.handled.has("socket:/home/zerodawn/.local/state/herdr-core/t/pirust-78.sock"));
  assert.deepEqual(h.of("wt").map((c) => c.slice(0, 3)), [["wt", "finish", "78"], ["wt", "finish", "101"]]);
  assert.deepEqual(h.of("agent").at(-1).slice(0, 3), ["agent", "101", "coder"]);
  assert.match(h.logs.find((l) => l.startsWith("ticket 78 usage")), /^ticket 78 usage req=\d+ io=\d+ cache_read=\d+ cache_write=\d+ cost=\d\.\d{4} ctx=\d+$/);
});

// ---- budget: the monitor uses tools/agent-budget.mjs, so it steers before it kills ----

test("a relaunch on the same worktree starts on a fresh budget", () => {
  const h = harness({
    files: {
      "--home-x-pirust-wt-77--/s1.jsonl": { src: resolve(here, "fixtures", "agent-session.jsonl") },
      "--home-x-pirust-wt-77--/s2.jsonl": { src: resolve(here, "fixtures", "agent-session-midturn.jsonl") },
    },
  });
  for (const f of ["--home-x-pirust-wt-77--/s1.jsonl", "--home-x-pirust-wt-77--/s2.jsonl"]) h.m.onSession(f);
  assert.equal(h.m.mon.get("--home-x-pirust-wt-77--/s1.jsonl").input, 31347);
  assert.equal(h.m.mon.get("--home-x-pirust-wt-77--/s2.jsonl").input, 4402, "one key per launch");
});

const turn = (cmd, input, output, cacheRead) => `${JSON.stringify({ type: "message", message: { role: "assistant", content: [{ type: "toolCall", name: "bash", arguments: { command: cmd } }], usage: { input, output, cacheRead, cacheWrite: 0, cost: { input: input / 1e6, output: output / 1e6, cacheRead: cacheRead / 1e6, cacheWrite: 0, total: (input + output + cacheRead / 10) / 1e6 } } }\n`;

test("the soft limit steers; the hard kill comes only after a handoff was asked", () => {
  const h = harness();
  const rel = "--home-x-pirust-wt-77--/s1.jsonl";
  mkdirSync(join(h.dir, "--home-x-pirust-wt-77--"), { recursive: true });
  const f = join(h.dir, "--home-x-pirust-wt-77--", "s1.jsonl");
  h.m.tickets.set("t77", "77");
  h.m.onSession(rel);
  assert.deepEqual(h.calls, [], "nothing on disk yet: no read, no decision");
  writeFileSync(f, turn("cargo test", 130_000, 125_000, 0));
  h.m.onSession(rel);
  assert.deepEqual(h.calls[0].slice(0, 2), ["hc", "send"]);
  assert.equal(h.calls[0][3].replace(/at \d+k \(in \d+k out \d+k cacheRead \d+k\)/, "at 255k (in 130k out 125k cacheRead 0k)"), `soft limit: at 255k (in 130k out 125k cacheRead 0k). Write HANDOFF.md (Status: wip, Done:, Next:, ≤5 lines), commit WIP, stop; a fresh session continues.`, "the steering message is what the agent gets");
  assert.equal(h.m.mon.get(rel).steered, true);
  assert.ok(h.logs.some((l) => l.startsWith("77 steered: soft limit: at 255k")), "the steering is logged");
  appendFileSync(f, turn("cargo build", 130_000, 125_000, 2_000_000));
  h.m.onSession(rel);
  assert.deepEqual(h.of("wt").map((c) => c.slice(0, 3)), [["wt", "finish", "77"]], "the killed agent's work is committed");
  assert.deepEqual(h.of("hc").map((c) => c.slice(0, 3)).slice(-2), [["hc", "kill", "t77"], ["hc", "rm", "t77"]]);
  assert.match(h.enqueued.at(-1).lines[0], /^agent #77 killed: budget 710k\/400k \(in 260k out 250k cacheRead 2000k\)$/);
});

// ---- the CEO session (tools/ceo-wake.mjs) ----

test("the warm session is reset at 60k context, 55 min idle, or 40 requests", () => {
  const now = Date.now();
  assert.equal(needsReset({ requests: 39, lastEnd: now, ctx: 59_000 }, now), null);
  assert.equal(needsReset({ requests: 40, lastEnd: now, ctx: 1000 }, now), `requests=${RESET_REQUESTS}`);
  assert.equal(needsReset({ requests: 1, lastEnd: now - 56 * 60_000, ctx: 1000 }, now), "idle 56 min");
  assert.equal(needsReset({ requests: 1, lastEnd: now, ctx: 61_000 }, now), "context 61k > 60k");
  assert.equal(STALL_MS, 5 * 60_000);
});

test("a wake sends the fixed prefix first, then STATE.md, then the events", () => {
  const first = buildWakePrompt({ state: "S", events: "E1", first: true, stateChanged: false });
  assert.ok(first.startsWith("# CEO wake (stateless)"), "the prefix is first, so it caches");
  assert.ok(first.indexOf("## State") > first.indexOf("# CEO wake"), "STATE.md comes after the prefix");
  assert.ok(first.indexOf("## Events") > first.indexOf("## State"), "the events come last");
  assert.equal(buildWakePrompt({ state: "S", events: "E2", first: false, stateChanged: false }), "## Events\nE2\n", "a warm wake sends only the new events");
  const s2 = buildWakePrompt({ state: "S2", events: "E3", first: false, stateChanged: true });
  assert.ok(s2.startsWith("## State"), "a state written by another session is sent again");
});
