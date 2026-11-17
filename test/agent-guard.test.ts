// Unit tests for the forced handoff in agent-guard (factory/extensions/agent-guard.ts), run with:
//   node --test test/agent-guard.test.ts
// pi is faked: the guard only uses `on`, `registerTool`, `setActiveTools` and `exec`, so the
// steps below feed it real pi event shapes (docs/extensions.md: turn_end, tool_call, context,
// session_before_compact) and real session entries. No LLM, no gateway, no network.
// Each step gets a fresh guard module (`?case=N`): its counters are module state, one per agent.

import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { MAX_HANDOFF_FIELD, MAX_HANDOFF_LINES, USAGE_LOG, type HandoffParams } from "../factory/extensions/agent-guard.ts";

const here = dirname(fileURLToPath(import.meta.url));

interface Guard {
  pi: Record<string, unknown>;
  entries: Record<string, unknown>[];
  tools: string[];
  shutdowns: string[];
  has: (event: string) => boolean;
  fire: (event: string, e?: Record<string, unknown>) => Record<string, unknown> | undefined;
  /** Record a message in the session and fire `message_start`, as pi does. */
  send: (message: Record<string, unknown>) => void;
  /** Fire a `turn_end` for one assistant turn and record it in the session, as pi does. */
  run: (message: Record<string, unknown>, extra?: Record<string, unknown>) => Record<string, unknown> | undefined;
  handoffTool: { execute: (id: string, params: HandoffParams, signal?: AbortSignal, a?: unknown, b?: unknown) => Promise<{ terminate?: boolean; content: { text: string }[] }> };
  stepState: () => Record<string, unknown>;
}

const assistantTurn = (text: string, calls: { id: string; name: string; arguments: unknown }[] = []) => ({
  role: "assistant",
  content: [...(text ? [{ type: "text", text }] : []), ...calls.map((c) => ({ type: "toolCall", ...c }))],
  usage: { input: 1_000, output: 200, cacheRead: 1_000 },
  timestamp: 1,
});

/** Fresh worktree per step: HANDOFF.md and the usage log are written into the cwd (the agent's worktree). */
function enterWorktree(): string {
  const worktree = mkdtempSync(join(tmpdir(), "pirust-guard-"));
  mkdirSync(join(worktree, ".pi"), { recursive: true });
  process.chdir(worktree);
  return worktree;
}

let caseNo = 0;

/** One coder step: a fresh guard (own counters and `exec`), its own worktree, a fake pi loaded with it. */
async function loadGuard(execCode = 0): Promise<Guard & { worktree: string }> {
  const mod = (await import(`../factory/extensions/agent-guard.ts?case=${++caseNo}`)) as unknown as Guard & {
    default: (pi: unknown) => void;
  };
  const worktree = enterWorktree();
  const handlers = new Map<string, (e: Record<string, unknown>, c: Record<string, unknown>) => Record<string, unknown> | undefined>();
  const entries: Record<string, unknown>[] = [];
  const shutdowns: string[] = [];
  const tools: string[] = [];
  const ctx = {
    cwd: process.cwd(),
    model: { provider: "ibm-next", id: "qwen38-flash-next", contextWindow: 200_000 },
    ui: { notify: () => {}, setStatus: () => {} },
    sessionManager: { getEntries: () => entries },
    getContextUsage: () => ({ tokens: 1_000 }),
    shutdown: () => shutdowns.push("shutdown"),
  };
  const pi = {
    on: (event: string, handler: (e: never, c: never) => Promise<void>) => {
      handlers.set(event, handler as never);
    },
    registerTool: (tool: { name: string }) => {
      tools.push(tool.name);
    },
    setActiveTools: (names: string[]) => {
      pi.activeTools = names;
    },
    getActiveTools: () => pi.activeTools,
    exec: async (command: string) => ({ code: execCode, stdout: command, stderr: "" }),
    activeTools: ["read", "bash", "edit", "write"] as string[],
  };
  mod.default(pi as never);
  const fire: Guard["fire"] = (event, e = {}) => handlers.get(event)?.(e, ctx);
  const send: Guard["send"] = (message) => {
    entries.push({ type: "message", message });
    handlers.get("message_start")?.({ message }, ctx);
  };
  const run: Guard["run"] = (message, extra = {}) => {
    entries.push({ type: "message", message });
    return handlers.get("turn_end")?.({ message, ...extra }, ctx);
  };
  return { ...mod, pi, entries, tools, shutdowns, has: (event: string) => handlers.has(event), fire, send, run, worktree };
}

const LIMIT_CALLS = 20;

test("at the call limit the model gets one tool: handoff", async () => {
  const p = await loadGuard();
  assert.deepEqual(p.tools, ["handoff"], "the guard installs the handoff tool");
  assert.ok(p.has("turn_end") && p.has("tool_call") && p.has("context") && p.has("session_before_compact"));
  assert.deepEqual(p.pi.activeTools, ["read", "bash", "edit", "write"], "before the limit the coder tools stand");

  for (let i = 0; i < LIMIT_CALLS; i++) void p.run(assistantTurn("", [{ id: `c${i}`, name: "bash", arguments: { command: `echo ${i}` } }]));
  assert.deepEqual(p.pi.activeTools, ["handoff"], "at the limit only handoff is active");

  // Belt and braces: any other tool is blocked, the handoff is not.
  assert.deepEqual(p.fire("tool_call", { toolName: "bash", toolCallId: "x", input: { command: "git push" } }), {
    block: true,
    reason: "step limit reached: call handoff now",
  });
  assert.equal(p.fire("tool_call", { toolName: "handoff", toolCallId: "y", input: {} }), undefined);
});

test("a text reply at the limit is edited out and the run continues", async () => {
  const p = await loadGuard();
  for (let i = 0; i < LIMIT_CALLS; i++) void p.run(assistantTurn("", [{ id: `c${i}`, name: "bash", arguments: {} }]));

  const r = p.run(assistantTurn("I am done, the tests pass."), { messageEntryId: "m1", entries: [] });
  assert.deepEqual(r!.entries, [
    { type: "context_edit", targetId: "m1", replacement: null },
    { type: "custom_message", customType: "agent-guard", content: "Call handoff now.", display: false },
  ]);
  assert.equal(r!.continue, true);
  assert.equal(p.stepState().textReplies, 1, "one text-only reply counted");
});

test("the third text-only reply writes the fallback HANDOFF.md and ends the step", async () => {
  const p = await loadGuard();
  // The guard learns the ticket from the first user message (tools/agent puts it there),
  // and the files of a step from the session's own write/edit calls.
  p.send({ role: "user", content: [{ type: "text", text: "Ticket #106 Forced handoff. HANDOFF: see Next." }] });
  for (let i = 0; i < LIMIT_CALLS; i++) void p.run(assistantTurn("", [{ id: `c${i}`, name: "bash", arguments: {} }]));
  p.send({ role: "assistant", content: [{ type: "toolCall", id: "w1", name: "write", arguments: { path: "src/a.rs" } }] });
  for (let i = 0; i < 3; i++) void p.run(assistantTurn(`I finished, no handoff (miss ${i}).`), { messageEntryId: `m${i}` });

  const handoff = readFileSync(join(p.worktree, "HANDOFF.md"), "utf8");
  assert.equal(handoff.split("\n").length - 1, 4, "the fallback handoff is 4 lines");
  assert.ok(handoff.startsWith("Status: wip\n"), "the fallback status is wip");
  assert.ok(handoff.includes("Done: I finished, no handoff (miss 2)."), "Done carries the last assistant text");
  assert.ok(handoff.includes("Files: src/a.rs"), "Files comes from the session's write calls");
  assert.equal(p.stepState().wroteFallback, true);
  assert.equal(p.stepState().stepCalls, 0, "the step is over: the counters reset for the next agent");
  assert.equal(p.shutdowns.length, 1, "the run ends: the runner starts a fresh agent");
  const log = readFileSync(join(p.worktree, USAGE_LOG), "utf8").trim().split("\n");
  assert.equal(log.length, 1, "one line per step");
  assert.equal(log[0], "106 1 20 29900 0 fallback", "ticket, step, calls, weighted tokens, refresh n, forced");
});

test("a valid handoff ends the step and compaction costs no LLM call", async () => {
  const p = await loadGuard();
  p.send({ role: "user", content: [{ type: "text", text: "Ticket #106 Forced handoff in agent-guard: see below." }] });
  for (let i = 0; i < LIMIT_CALLS; i++) void p.run(assistantTurn("", [{ id: `c${i}`, name: "bash", arguments: {} }]));

  const params: HandoffParams = {
    status: "done",
    done: "wrote agent-guard",
    next: "live run on ibm-next",
    verified: [{ cmd: "node --test test/agent-guard.test.ts", result: "ok" }],
  };
  // pi runs the tool, then reports the turn: the handoff is the run's last action.
  const result = await p.handoffTool.execute("c21", params, undefined, undefined, {} as never);
  assert.equal(result.terminate, true, "the handoff ends the run on its own tool result");
  const r = p.run(assistantTurn("", [{ id: "c21", name: "handoff", arguments: params }]), { messageEntryId: "c21" });
  assert.equal(r, undefined, "a valid handoff returns no entries");

  assert.equal(p.stepState().stepCalls, 0, "the step is over");
  assert.equal(p.shutdowns.length, 1, "the run ends; the runner starts a fresh agent");
  const compact = p.fire("session_before_compact", { preparation: { firstKeptEntryId: "e5", tokensBefore: 123_456 } });
  const summary = (compact!.compaction as { summary: string }).summary;
  assert.ok(summary.startsWith("Ticket #106 Forced handoff in agent-guard: see below."), "the summary starts with the ticket");
  assert.ok(summary.includes("\nStatus: done\nDone: wrote agent-guard"), "the summary carries HANDOFF.md");
  const c = compact!.compaction as { firstKeptEntryId: string; tokensBefore: number };
  assert.deepEqual({ firstKeptEntryId: c.firstKeptEntryId, tokensBefore: c.tokensBefore }, { firstKeptEntryId: "e5", tokensBefore: 123_456 });
  assert.equal(readFileSync(join(p.worktree, USAGE_LOG), "utf8").trim(), "106 1 21 27300 0 0", "one line: no text-only reply, no refresh");
});

test("a done handoff with no verified command is an error, so a false done cannot pass", async () => {
  const p = await loadGuard();
  await assert.rejects(
    () => p.handoffTool.execute("c1", { status: "done", done: "x", next: "y" } as HandoffParams, undefined, undefined, {} as never),
    /needs ≥1 verified command/,
  );
  // A `done` backed by a command that fails when the harness re-runs it.
  const failing = await loadGuard(1);
  await assert.rejects(
    () =>
      failing.handoffTool.execute("c2", { status: "done", done: "x", next: "y", verified: [{ cmd: "cargo test -p x", result: "ok" }] } as HandoffParams, undefined, undefined, {} as never),
    /verified command failed \(exit 1\): cargo test -p x/,
  );
});

test("tool results older than 3 turns are cut to 300 chars", async () => {
  const p = await loadGuard();
  const long = "x".repeat(900);
  const messages = [
    { role: "user", content: [{ type: "text", text: "Ticket #106" }] },
    { role: "assistant", content: [{ type: "toolCall", id: "c1", name: "bash", arguments: {} }] },
    { role: "toolResult", toolCallId: "c1", content: [{ type: "text", text: long }] },
    { role: "assistant", content: [{ type: "toolCall", id: "c2", name: "bash", arguments: {} }] },
    { role: "toolResult", toolCallId: "c2", content: [{ type: "text", text: long }] },
    { role: "assistant", content: [{ type: "toolCall", id: "c3", name: "bash", arguments: {} }] },
    { role: "toolResult", toolCallId: "c3", content: [{ type: "text", text: long }] },
    { role: "assistant", content: [{ type: "toolCall", id: "c4", name: "bash", arguments: {} }] },
    { role: "toolResult", toolCallId: "c4", content: [{ type: "text", text: long }] },
  ];
  const out = p.fire("context", { messages })!;
  const list = out.messages as { role: string; content: { type: string; text?: string }[] }[];
  assert.equal(list[2].content[0].text!.length, 300 + " [trimmed]".length, "the oldest tool result is cut");
  assert.equal(list[4].content[0].text!.length, long.length, "the last 3 turns stay whole");
  assert.equal(list[6].content[0].text!.length, long.length);
  assert.equal(list[8].content[0].text!.length, long.length);
});

test("the guard is loadable by pi and imports nothing at runtime", () => {
  const src = readFileSync(resolve(here, "../factory/extensions/agent-guard.ts"), "utf8");
  const runtimeImports = [...src.matchAll(/^import (?!\{? ?type )[^;]+;$/gm)].map((m) => m[0]);
  assert.deepEqual(
    runtimeImports.filter((s) => !s.includes("node:") && !s.includes('"./agent-tools.ts"')),
    [],
    "only node: builtins and ./agent-tools.ts, so pi and node --test both load it with no install",
  );
  assert.ok(readFileSync(resolve(here, "../factory/extensions/agent-tools.ts"), "utf8").includes("constrainedSampling"));
  assert.equal(MAX_HANDOFF_LINES, 5);
  assert.equal(MAX_HANDOFF_FIELD, 200);
  assert.ok(existsSync(resolve(here, "../factory/extensions/agent-tools.ts")));
});
