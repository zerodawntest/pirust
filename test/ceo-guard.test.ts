// Tests for the lessons hook in .pi/extensions/ceo-guard.ts. Run with:
//   node --test test/ceo-guard.test.ts
// Plain `node` strips the types; the extension keeps only `node:` runtime imports,
// and reads factory/lessons.json + factory/runtime.md by a path relative to itself.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

import ceoGuard from "../.pi/extensions/ceo-guard.ts";

const here = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(here, "..");
const lessons: { fact: string; block?: string; msg?: string }[] = JSON.parse(
	readFileSync(resolve(REPO, "factory/lessons.json"), "utf8"),
);
const runtimeMd = readFileSync(resolve(REPO, "factory/runtime.md"), "utf8");

// Minimal ExtensionAPI stand-in: capture the handlers ceo-guard registers on `pi.on`.
function useGuard() {
	const handlers: Record<string, (e: any, ctx: any) => any> = {};
	const pi = {
		on: (event: string, fn: (e: any, ctx: any) => any) => {
			handlers[event] = fn;
		},
		registerTool: () => {},
		registerCommand: () => {},
		sendMessage: () => {},
		sendUserMessage: async () => {},
	};
	ceoGuard(pi as never);
	return handlers;
}

test("the guard injects the facts and runtime.md, byte-identical across two calls", async () => {
	const h = useGuard();
	const ctx = { cwd: REPO };
	await h.session_start({}, ctx);

	const evt = { type: "before_agent_start", prompt: "hi", systemPrompt: "BASE" };
	const a = await h.before_agent_start(evt, ctx);
	const b = await h.before_agent_start(evt, ctx);

	assert.ok(a.systemPrompt, "returns a systemPrompt");
	assert.equal(a.systemPrompt, b.systemPrompt, "prompt text is byte-identical across two calls");
	assert.ok(lessons.length > 0, "factory/lessons.json has entries");
	for (const l of lessons) assert.ok(a.systemPrompt.includes(l.fact), `fact injected: ${l.fact}`);
	assert.ok(a.systemPrompt.includes(runtimeMd), "factory/runtime.md is included verbatim");
	// The injected facts sit on top of the base prompt, in a stable sorted order.
	assert.ok(a.systemPrompt.startsWith("BASE"), "the original prompt is preserved as a prefix");
});

test("an entry with a block regex blocks a matching bash call", async () => {
	const h = useGuard();
	const ctx = { cwd: REPO };
	await h.session_start({}, ctx);

	// The pig lesson blocks launching the pig binary (rework of PR 101: agents run on pi now).
	const l = lessons.find((x) => x.block === "(^|[;&|]\\s*)pig\\s");
	assert.ok(l, "the pi-not-pig lesson has a block regex");

	const hit = await h.tool_call({ type: "tool_call", toolName: "bash", input: { command: "pig --model x" } }, ctx);
	assert.equal(hit.block, true, "a pig launch is blocked");
	assert.equal(hit.reason, l!.msg, "the block carries the lesson's msg");

	const miss = await h.tool_call({ type: "tool_call", toolName: "bash", input: { command: "ls -la" } }, ctx);
	assert.equal(miss, undefined, "a benign bash call is not blocked");
});

test("block patterns match executed commands only, not quoted text", async () => {
	const h = useGuard();
	const ctx = { cwd: REPO };
	await h.session_start({}, ctx);

	// The pig launch lives in the executed command, so it fires; a quoted mention is left
	// alone (ticket #92: match on executed commands only).
	const live = await h.tool_call({ type: "tool_call", toolName: "bash", input: { command: "echo hi && pig launch" } }, ctx);
	assert.equal(live.block, true, "an executed pig launch is blocked");

	const quoted = await h.tool_call({ type: "tool_call", toolName: "bash", input: { command: 'echo "do not pig launch"' } }, ctx);
	assert.equal(quoted, undefined, 'a quoted "pig launch" is not an executed command');

	const sub = await h.tool_call({ type: "tool_call", toolName: "bash", input: { command: 'echo "x" && pig launch' } }, ctx);
	assert.equal(sub.block, true, "a pig launch after a quoted literal is still executed and blocked");
});

test("common commands on pi are NOT blocked (rework of PR 101)", async () => {
	const h = useGuard();
	const ctx = { cwd: REPO };
	await h.session_start({}, ctx);

	// Paths under ~/.pig/ are not pig launches; landing a verified branch via git push is
	// allowed; `herdr-app` (ls/shot) is required evidence. None of these may be blocked.
	for (const command of ["cat ~/.pig/pirust-queue", "git push origin t/1:integration", "herdr-app ls"]) {
		const r = await h.tool_call({ type: "tool_call", toolName: "bash", input: { command } }, ctx);
		assert.equal(r, undefined, `not blocked: ${command}`);
	}
});

test("edit/write on a file in an In-progress ticket Files is blocked with its ticket", async () => {
	const h = useGuard();
	const ctx = { cwd: REPO };
	await h.session_start({}, ctx);

	// #91 owns factory/runtime.md; #92 owns .pi/extensions/ceo-guard.ts (this file).
	const r = await h.tool_call({ type: "tool_call", toolName: "write", input: { path: "factory/runtime.md", content: "x" } }, ctx);
	assert.equal(r.block, true, "writing factory/runtime.md is blocked");
	assert.match(r.reason, /#91/, "the block names the owning ticket #91");

	const g = await h.tool_call({ type: "tool_call", toolName: "edit", input: { path: ".pi/extensions/ceo-guard.ts", edits: [] } }, ctx);
	assert.equal(g.block, true, "editing .pi/extensions/ceo-guard.ts is blocked");
	assert.match(g.reason, /#92/, "the block names the owning ticket #92");
});

test("DOC_OK allows skill docs and blocks other code paths", async () => {
	const h = useGuard();
	const ctx = { cwd: REPO };
	await h.session_start({}, ctx);

	// Skills are docs (ticket #92 comment): a lead may edit a SKILL.md.
	const skill = await h.tool_call({ type: "tool_call", toolName: "edit", input: { path: ".agents/skills/x/SKILL.md", edits: [] } }, ctx);
	assert.equal(skill, undefined, "a SKILL.md is a doc the lead may edit");

	// A non-doc, non-locked path is still off-limits to the lead.
	const code = await h.tool_call({ type: "tool_call", toolName: "edit", input: { path: "tools/ticket", edits: [] } }, ctx);
	assert.equal(code.block, true, "editing tools/ticket is blocked");
});
