// Unit tests for the keepalive extension (.pi/extensions/keepalive.ts), run with:
//   node --test test/keepalive.test.ts
// pi is faked: the extension only uses `on`, `sendUserMessage`, and the `session_start` context.
// The driver watch is exercised with `hc` absent (spawn error must not throw).

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import keepalive from "../.pi/extensions/keepalive.ts";

const here = dirname(fileURLToPath(import.meta.url));
const CONTINUATION = "Compacted. Re-read factory/STATE.md and continue your last task.";

interface Sent {
  content: string;
  options?: Record<string, string>;
}

/** A pi stand-in: records the handlers it is given and every user message sent. */
function fakePi() {
  const handlers = new Map<string, (e: any, ctx: any) => Promise<void>>();
  const sent: Sent[] = [];
  const ctx = { cwd: `${process.env.HOME}/private/pirust`, ui: { notify: () => {}, setStatus: () => {} } };
  const pi = {
    on: (event: string, handler: (e: any, c: typeof ctx) => Promise<void>) => {
      handlers.set(event, handler);
    },
    sendUserMessage: (content: string, options?: Record<string, string>) => {
      sent.push({ content, options });
      return Promise.resolve();
    },
    sendMessage: () => {},
    registerTool: () => {},
    registerCommand: () => {},
  };
  return { pi, sent, ctx, fire: async (event: string, e: Record<string, unknown> = {}) => {
    await handlers.get(event)?.(e, ctx);
  }, has: (event: string) => handlers.has(event) };
}

test("compaction then settle sends exactly one followUp", async () => {
  const p = fakePi();
  keepalive(p.pi);
  assert.ok(p.has("session_compact") && p.has("agent_settled") && p.has("session_start"));
  assert.deepEqual(p.sent, [], "loading sends nothing");
  // The chat session installs the driver watch here (`hc` is absent in this sandbox: no throw).
  await p.fire("session_start");
  assert.deepEqual(p.sent, [], "session_start sends nothing");
  await p.fire("session_compact", { reason: "threshold", willRetry: false });
  assert.deepEqual(p.sent, [], "compaction alone sends nothing");
  await p.fire("agent_settled");
  assert.equal(p.sent.length, 1);
  assert.equal(p.sent[0].content, CONTINUATION);
  assert.deepEqual(p.sent[0].options, { deliverAs: "followUp" });
  await p.fire("agent_settled");
  assert.equal(p.sent.length, 1, "one wake per compaction");
});

test("no compaction sends none", async () => {
  const p = fakePi();
  keepalive(p.pi);
  await p.fire("agent_settled");
  await p.fire("agent_settled");
  assert.deepEqual(p.sent, []);
});

test("overflow recovery (willRetry true) needs no wake", async () => {
  const p = fakePi();
  keepalive(p.pi);
  await p.fire("session_compact", { reason: "overflow", willRetry: true });
  await p.fire("agent_settled");
  assert.deepEqual(p.sent, []);
});

test("the driver role loads and is woken the same way", async () => {
  process.env.PIRUST_ROLE = "driver";
  const { default: driver } = await import(new URL("../.pi/extensions/keepalive.ts?role=driver", import.meta.url).href);
  const p = fakePi();
  driver(p.pi);
  // The driver watches nothing; an idle stop with no work is a correct stop.
  await p.fire("session_start");
  assert.deepEqual(p.sent, [], "session_start sends nothing");
  await p.fire("session_compact", { reason: "threshold", willRetry: false });
  await p.fire("agent_settled");
  assert.equal(p.sent.length, 1);
  assert.equal(p.sent[0].content, CONTINUATION);
});

test("a coder worktree installs no driver watch", async () => {
  const p = fakePi();
  keepalive(p.pi);
  p.ctx.cwd = `${process.env.HOME}/private/pirust-wt/86`;
  await p.fire("session_start");
  await p.fire("agent_settled");
  assert.deepEqual(p.sent, []);
});

test("the extension is loadable by pi and imports nothing at runtime", () => {
  const src = readFileSync(resolve(here, "../.pi/extensions/keepalive.ts"), "utf8");
  const runtimeImports = [...src.matchAll(/^import (?!\{? ?type )[^;]+;$/gm)].map((m) => m[0]);
  assert.deepEqual(
    runtimeImports.filter((s) => !s.includes("node:")),
    [],
    "only node: imports at runtime, so pi and node --test both load it with no install",
  );
});
