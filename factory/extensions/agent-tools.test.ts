// Tests for factory/extensions/agent-tools.ts. Run: node --test factory/extensions/
// Runs on plain `node` (types are stripped, no packages are installed).
import { strict as assert } from "node:assert";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";

import agentTools, { handoffTool, HANDOFF_FILE, MAX_HANDOFF_LINES, type HandoffParams } from "./agent-tools.ts";

/** The handoff tool re-runs verified commands with `pi.exec`; give it a stand-in that always exits 0. */
const fakePi = { exec: async () => ({ code: 0, stdout: "", stderr: "" }), registerTool: () => {} };
agentTools(fakePi as never);

/** Fresh worktree per test: `handoff` writes HANDOFF.md into the cwd, which is the agent's worktree. */
function enterWorktree(): string {
	const worktree = mkdtempSync(join(tmpdir(), "pirust-handoff-"));
	process.chdir(worktree);
	return worktree;
}

const handoffParams: HandoffParams = {
	status: "done",
	done: "shipped handoff",
	next: "load it in tools/agent",
	verified: [{ cmd: "node --test test/", result: "ok" }],
};

function handoff(params: HandoffParams) {
	return handoffTool.execute("call-1", params, undefined, undefined, {} as never);
}

describe("handoff", () => {
	it("writes HANDOFF.md and terminates the run", async () => {
		const worktree = enterWorktree();
		const result = await handoff({
			status: "done",
			done: "added the handoff tool",
			next: "wire it into tools/agent",
			verified: [{ cmd: "node --test factory/extensions/", result: "ok" }],
		});

		assert.equal(result.terminate, true);
		assert.equal(result.content[0]?.text, "Wrote HANDOFF.md (done). Run ends here.");
		assert.deepEqual(result.details, {
			status: "done",
			done: "added the handoff tool",
			next: "wire it into tools/agent",
			verified: [{ cmd: "node --test factory/extensions/", result: "ok" }],
		});
		assert.equal(
			readFileSync(join(worktree, HANDOFF_FILE), "utf8"),
			"Status: done\nDone: added the handoff tool\nVerified: node --test factory/extensions/ -> ok\nNext: wire it into tools/agent\n",
		);
	});

	it("keeps HANDOFF.md at most 5 lines, one field per line", async () => {
		const worktree = enterWorktree();
		await handoff({
			status: "blocked",
			done: "wrote the tool\nsecond line of done",
			next: "needs the gateway key\nsecond line of next",
		});
		const content = readFileSync(join(worktree, HANDOFF_FILE), "utf8");
		assert.equal(content, "Status: blocked\nDone: wrote the tool second line of done\nNext: needs the gateway key second line of next\n");
		assert.ok(content.split("\n").length - 1 <= MAX_HANDOFF_LINES, "HANDOFF.md exceeds the line cap");
	});

	it("requires done, next, a known status, and a verified command for done", async () => {
		enterWorktree();
		await assert.rejects(() => handoff({ status: "done", next: "x" } as HandoffParams), /handoff: done is required/);
		await assert.rejects(() => handoff({ status: "done", done: "x" } as HandoffParams), /handoff: next is required/);
		await assert.rejects(() => handoff({ status: "wip", done: "x", next: " " } as HandoffParams), /handoff: next is required/);
		await assert.rejects(() => handoff({ status: "closed", done: "x", next: "y" } as HandoffParams), /status must be wip, done, or blocked/);
		// done claims success: it needs a command the harness re-runs to exit 0.
		await assert.rejects(() => handoff({ status: "done", done: "x", next: "y" } as HandoffParams), /needs ≥1 verified command/);
	});

	it("rejects a verified command that fails on re-run", async () => {
		const worktree = enterWorktree();
		// A false `done`: the harness re-runs the verified command and it exits nonzero.
		const failing = { exec: async () => ({ code: 1, stdout: "", stderr: "" }), registerTool: () => {} };
		agentTools(failing as never);
		await assert.rejects(
			() => handoff({ status: "done", done: "x", next: "y", verified: [{ cmd: "false", result: "ok" }] } as HandoffParams),
			/verified command failed \(exit 1\): false/,
		);
	});

	it("caps done and next at 200 chars", async () => {
		enterWorktree();
		const long = "x".repeat(201);
		await assert.rejects(() => handoff({ status: "wip", done: long, next: "y" } as HandoffParams), /handoff: done exceeds 200 chars/);
		await assert.rejects(() => handoff({ status: "wip", done: "x", next: long } as HandoffParams), /handoff: next exceeds 200 chars/);
	});

	it("ends the agent session on the handoff tool result, with no assistant message after it", async () => {
		const worktree = enterWorktree();
		agentTools(fakePi as never);
		const sessionPath = join(worktree, "session.jsonl");
		const messages: Record<string, unknown>[] = [
			{ role: "user", content: [{ type: "text", text: "Ticket #73: add the handoff tool." }], timestamp: 1 },
		];

		// One agent loop: ask the model, run its tool calls, stop when every result
		// terminates (packages/agent/src/agent-loop.ts). The model is a stub that would
		// answer again with a spurious assistant message if the loop kept going.
		let modelCalls = 0;
		for (let turn = 0; turn < 3; turn++) {
			modelCalls++;
			const args = turn === 0 ? handoffParams : { status: "done", done: `extra turn ${turn}`, next: "should not happen" };
			messages.push({
				role: "assistant",
				content: [{ type: "text", text: `Calling handoff (call ${turn}).` }, { type: "toolCall", id: `call-${turn}`, name: "handoff", arguments: args }],
				timestamp: 2 + turn,
			});
			const toolCalls = messages.at(-1)!.content as unknown as { type: string; id: string; name: string; arguments: HandoffParams }[];
			const results: { id: string; terminate?: boolean }[] = [];
			for (const call of toolCalls.filter((c) => c.type === "toolCall")) {
				const result = await handoffTool.execute(call.id, call.arguments, undefined, undefined, {} as never);
				results.push({ id: call.id, terminate: result.terminate });
				messages.push({
					role: "toolResult",
					toolCallId: call.id,
					toolName: call.name,
					content: result.content,
					details: result.details,
					isError: false,
					timestamp: 5 + call.id.length,
				});
			}
			if (results.length > 0 && results.every((r) => r.terminate === true)) break;
		}

		assert.equal(modelCalls, 1, "the run must not pay for an extra LLM turn after handoff");
		writeFileSync(sessionPath, messages.map((m, i) => JSON.stringify({ type: "message", id: `e${i}`, parentId: i ? `e${i - 1}` : null, message: m })).join("\n") + "\n");

		const entries = readFileSync(sessionPath, "utf8").trim().split("\n").map((line) => JSON.parse(line) as { message?: { role?: string } });
		assert.equal(entries.at(-1)?.message?.role, "toolResult", "session must end on the handoff tool result");
		assert.equal(entries.filter((e) => e.message?.role === "assistant").length, 1, "no assistant message after the tool result");
		assert.equal(
			readFileSync(join(worktree, HANDOFF_FILE), "utf8"),
			"Status: done\nDone: shipped handoff\nVerified: node --test test/ -> ok\nNext: load it in tools/agent\n",
		);
	});
});
