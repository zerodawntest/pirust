// Unit tests for the stop gate (ticket #97): leads (t1nm, driver) cannot end a turn with work
// left. The gate runs `tools/next-work`; non-empty output returns a hidden custom message +
// `continue: true`, max 3 per user turn. pi is faked: the extension only uses `on`,
// `sendUserMessage`, and the `session_start` context; `NEXT_WORK` is pointed at a fixture so the
// check runs offline. Run: node --test test/stop-gate.test.ts

import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const REPO = `${process.env.HOME}/private/pirust`;

interface Sent {
	content: string;
	options?: Record<string, string>;
}
interface Settled {
	entries: { type: string; customType?: string; content?: string; display?: boolean }[];
	continue?: boolean;
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
	return {
		pi,
		sent,
		ctx,
		fire: async (event: string, e: Record<string, unknown> = {}): Promise<Settled | undefined> => await handlers.get(event)?.(e, ctx),
		has: (event: string) => handlers.has(event),
	};
}

/** Load a fresh copy of the extension with NEXT_WORK pointed at `fixture` (captured at import). */
async function load(fixture: string, opts: { role?: string; cwd?: string } = {}) {
	process.env.NEXT_WORK = resolve(here, "fixtures", fixture);
	if (opts.role) process.env.PIRUST_ROLE = opts.role;
	const mod = await import(new URL(`../.pi/extensions/keepalive.ts?sg=${fixture}${opts.role ?? ""}${Math.random()}`, import.meta.url).href);
	const p = fakePi();
	if (opts.cwd) p.ctx.cwd = opts.cwd;
	(mod.default as (pi: ReturnType<typeof fakePi>["pi"]) => void)(p.pi);
	return p;
}

test("agent_before_settle and before_agent_start are registered", async () => {
	const p = await load("next-work-lines.sh");
	assert.ok(p.has("agent_before_settle"), "stop gate registered");
	assert.ok(p.has("before_agent_start"), "user-turn reset registered");
});

test("non-empty next-work continues a lead with a hidden message", async () => {
	const p = await load("next-work-lines.sh");
	await p.fire("session_start");
	await p.fire("before_agent_start", { messageType: "user" });
	const r = await p.fire("agent_before_settle", { entries: [] });
	assert.equal(r?.continue, true);
	assert.equal(r?.entries.length, 1);
	assert.equal(r!.entries[0].type, "custom_message");
	assert.equal(r!.entries[0].customType, "stop-gate");
	assert.equal(r!.entries[0].display, false, "hidden: not shown to the user");
	assert.match(r!.entries[0].content!, /Ready: 2 unclaimed ticket\(s\): P1 x2/);
	assert.match(r!.entries[0].content!, /PRs without a review verdict: 1 \(#100\)/);
});

test("empty next-work settles (no continue)", async () => {
	const p = await load("next-work-empty.sh");
	await p.fire("session_start");
	await p.fire("before_agent_start", { messageType: "user" });
	const r = await p.fire("agent_before_settle", { entries: [] });
	assert.ok(!r?.continue, "nothing left: the lead may stop");
});

test("max 3 continues per user turn, the 4th is suppressed", async () => {
	const p = await load("next-work-lines.sh");
	await p.fire("session_start");
	await p.fire("before_agent_start", { messageType: "user" });
	for (const i of [1, 2, 3]) assert.equal((await p.fire("agent_before_settle", { entries: [] }))?.continue, true, `continue ${i}`);
	assert.ok(!(await p.fire("agent_before_settle", { entries: [] }))?.continue, "4th continue suppressed");
	// a new user turn resets the gate
	await p.fire("before_agent_start", { messageType: "user" });
	assert.equal((await p.fire("agent_before_settle", { entries: [] }))?.continue, true, "new user turn resets the gate");
});

test("only leads gate: a coder worktree fires no continue", async () => {
	const p = await load("next-work-lines.sh", { cwd: `${process.env.HOME}/private/pirust-wt/97` });
	await p.fire("before_agent_start", { messageType: "user" });
	assert.ok(!(await p.fire("agent_before_settle", { entries: [] }))?.continue, "a coder agent is allowed to stop");
});

test("tools/next-work runs in under 3s", () => {
	const out = execFileSync(resolve(here, "../tools/next-work"), [], { encoding: "utf8", timeout: 3000, stdio: ["ignore", "pipe", "pipe"] });
	assert.equal(typeof out, "string");
});

test("the extension imports nothing at runtime beyond node:", () => {
	const src = readFileSync(resolve(here, "../.pi/extensions/keepalive.ts"), "utf8");
	const runtimeImports = [...src.matchAll(/^import (?!\{? ?type )[^;]+;$/gm)].map((m) => m[0]);
	assert.deepEqual(
		runtimeImports.filter((s) => !s.includes("node:")),
		[],
		"only node: imports at runtime, so pi and node --test both load it with no install",
	);
});
