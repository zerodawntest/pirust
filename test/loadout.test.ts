// Tests for factory/extensions/loadout.ts. Run: node --test test/loadout.test.ts
// Runs on plain `node` (types are stripped, no packages are installed): pi is faked.

import { test } from "node:test";
import assert from "node:assert/strict";

import loadout, {
	loadoutTool,
	roleTools,
	shortDescriptions,
	detectRole,
	MAX_READ_LINES,
	MAX_BASH_OUTPUT_BYTES,
} from "../factory/extensions/loadout.ts";

/** Tool names a real pi session has: the built-ins plus the two factory tools. */
const ALL_TOOLS = ["read", "bash", "edit", "write", "grep", "find", "ls", "handoff", "loadout"];

interface RegisteredTool {
	name: string;
	description: string;
	prepareLoadout?: (loadout: { declared: { name: string }[]; callable: { name: string }[] }) => {
		descriptions: Record<string, string>;
	};
}

/** A pi stand-in: records registered tools, the active-set calls, and event handlers. */
function fakePi(allTools: string[] = ALL_TOOLS) {
	const handlers = new Map<string, (e: any, c: Record<string, unknown>) => unknown>();
	const registered: RegisteredTool[] = [];
	const activeCalls: string[][] = [];
	const ctx = { cwd: process.cwd() };
	const pi = {
		registerTool: (tool: RegisteredTool) => {
			registered.push(tool);
		},
		setActiveTools: (names: string[]) => {
			activeCalls.push([...names]);
		},
		getActiveTools: () => (activeCalls.length ? [...activeCalls.at(-1)!] : []),
		getAllTools: () => allTools.map((name) => ({ name })),
		on: (event: string, handler: (e: any, c: Record<string, unknown>) => unknown) => {
			handlers.set(event, handler);
		},
	};
	return {
		pi,
		registered,
		activeCalls,
		fire: async (event: string, e: Record<string, unknown> = {}) => (await handlers.get(event)?.(e, ctx)) as any,
		has: (event: string) => handlers.has(event),
	};
}

test("loading registers the loadout tool and the read/bash caps + role switch", () => {
	const p = fakePi();
	loadout(p.pi);
	assert.deepEqual(
		p.registered.map((t) => t.name),
		["loadout"],
		"keeps the built-in read and bash: registers only `loadout`",
	);
	assert.ok(p.has("tool_result") && p.has("before_agent_start"), "caps and role switch are registered");
});

test("reviewer session has no edit; coder session has edit and write", async () => {
	const p = fakePi();
	loadout(p.pi);

	await p.fire("before_agent_start", { systemPrompt: "You are a pirust reviewer. Reviews one ticket's diff." });
	const reviewer = p.activeCalls.at(-1);
	assert.ok(reviewer, "reviewer set the active tools");
	assert.ok(!reviewer.includes("edit"), "reviewer must have no `edit`");
	assert.ok(reviewer.includes("write"), "reviewer must be able to write REVIEW.md");
	assert.ok(reviewer.includes("read") && reviewer.includes("bash"), "reviewer keeps read and bash");
	// roles.json: reviewer is exactly read, bash, write, handoff, loadout.
	assert.deepEqual(reviewer, ["read", "bash", "write", "handoff", "loadout"]);

	await p.fire("before_agent_start", { systemPrompt: "You are a pirust coder (Rust port of pi)." });
	const coder = p.activeCalls.at(-1);
	assert.ok(coder.includes("edit") && coder.includes("write"), "coder gets edit and write");
	assert.ok(!coder.includes("grep") && !coder.includes("ls"), "coder drops grep/find/ls");
});

test("prepareLoadout returns the short description for read (and every declared tool)", () => {
	const p = fakePi();
	loadout(p.pi);
	const tool = p.registered.find((t) => t.name === "loadout");
	assert.ok(tool?.prepareLoadout, "the loadout tool carries prepareLoadout");
	const declared = ALL_TOOLS.map((name) => ({ name }));
	const out = tool!.prepareLoadout!({ declared, callable: declared });
	assert.equal(out.descriptions.read, shortDescriptions.read, "read gets its short description");
	assert.equal(out.descriptions.bash, shortDescriptions.bash);
	// The short `read` description states the 300-line cap the tool_result hook enforces.
	assert.match(out.descriptions.read, /300 lines/);
	assert.deepEqual(Object.keys(out.descriptions).sort(), [...ALL_TOOLS].sort(), "every declared tool is shortened");
});

test("detectRole reads the role from the system prompt's first line", () => {
	assert.equal(detectRole("You are a pirust coder (Rust port of pi)."), "coder");
	assert.equal(detectRole("You are a pirust reviewer. Reviews one ticket's diff."), "reviewer");
	assert.equal(detectRole("You are a pirust planner."), "planner");
	assert.equal(detectRole("You are a pirust ceo."), "ceo");
	assert.equal(detectRole("You are a plain assistant."), undefined, "no role for an unmatched prompt");
});

test("a read result is capped to the first 300 lines with a paging note", async () => {
	const p = fakePi();
	loadout(p.pi);
	const lines = Array.from({ length: 500 }, (_unused, i) => `line ${i + 1}`);
	const result = await p.fire("tool_result", {
		toolName: "read",
		content: [{ type: "text", text: lines.join("\n") }],
		details: {},
		isError: false,
	});
	const shown = result.content[0].text.split("\n");
	assert.ok(shown.length <= MAX_READ_LINES + 1, `read capped at ${MAX_READ_LINES} lines`);
	assert.ok(shown[0] === "line 1" && shown[299] === "line 300", "keeps the first 300 lines");
	assert.ok(result.content[0].text.includes("Use offset=301 to continue"), "tells the model to page");
});

test("a read result at the cap and image items are left intact", async () => {
	const p = fakePi();
	loadout(p.pi);
	const text = Array.from({ length: MAX_READ_LINES }, (_unused, i) => `line ${i + 1}`).join("\n");
	const result = await p.fire("tool_result", {
		toolName: "read",
		content: [
			{ type: "text", text },
			{ type: "image", data: "AAA", mimeType: "image/png" },
		],
		isError: false,
	});
	assert.equal(result.content[0].text, text, "a read within the 300-line cap is left intact");
	assert.deepEqual(result.content[1], { type: "image", data: "AAA", mimeType: "image/png" }, "images are untouched");
});

test("a bash result is capped to the last 4 KB (tail) with a note", async () => {
	const p = fakePi();
	loadout(p.pi);
	const big = `${"x".repeat(9000)}TAIL-MARKER`;
	const result = await p.fire("tool_result", {
		toolName: "bash",
		content: [{ type: "text", text: big }],
		details: {},
		isError: false,
	});
	const text: string = result.content[0].text;
	assert.ok(text.endsWith("TAIL-MARKER"), "keeps the tail");
	assert.ok(text.startsWith("[bash: output truncated;"), "notes the truncation");
	assert.ok(Buffer.byteLength(text, "utf8") <= MAX_BASH_OUTPUT_BYTES + text.split("]\n", 1)[0].length + 2 + 40);
});

test("tools other than read and bash are left untouched", async () => {
	const p = fakePi();
	loadout(p.pi);
	const result = await p.fire("tool_result", {
		toolName: "edit",
		content: [{ type: "text", text: "line-1\nline-2\n" }],
		isError: false,
	});
	assert.equal(result, undefined, "edit result is not capped");
});
