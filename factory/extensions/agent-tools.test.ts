// Tests for factory/extensions/agent-tools.ts. Run: node --test factory/extensions/
// Runs on plain `node` (types are stripped, no packages are installed).
import { strict as assert } from "node:assert";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";

import { handoffTool, HANDOFF_FILE, MAX_HANDOFF_LINES, type HandoffParams } from "./agent-tools.ts";

/** Fresh worktree per test: `handoff` writes HANDOFF.md into the cwd, which is the agent's worktree. */
function enterWorktree(): string {
	const worktree = mkdtempSync(join(tmpdir(), "pirust-handoff-"));
	process.chdir(worktree);
	return worktree;
}

const handoffParams: HandoffParams = { status: "done", done: "shipped handoff", next: "load it in tools/agent" };

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
			verified: { "node --test factory/extensions/": "2 pass" },
		});

		assert.equal(result.terminate, true);
		assert.equal(result.content[0]?.text, "Wrote HANDOFF.md (done). Run ends here.");
		assert.deepEqual(result.details, {
			status: "done",
			done: "added the handoff tool",
			next: "wire it into tools/agent",
			verified: { "node --test factory/extensions/": "2 pass" },
		});
		assert.equal(
			readFileSync(join(worktree, HANDOFF_FILE), "utf8"),
			"Status: done\nDone: added the handoff tool\nVerified: node --test factory/extensions/ -> 2 pass\nNext: wire it into tools/agent\n",
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

	it("requires done, next and a known status", async () => {
		enterWorktree();
		await assert.rejects(() => handoff({ status: "done", next: "x" } as HandoffParams), /handoff: done is required/);
		await assert.rejects(() => handoff({ status: "done", done: "x" } as HandoffParams), /handoff: next is required/);
		await assert.rejects(() => handoff({ status: "wip", done: "x", next: " " } as HandoffParams), /handoff: next is required/);
		await assert.rejects(() => handoff({ status: "closed", done: "x", next: "y" } as HandoffParams), /status must be wip, done, or blocked/);
	});

	it("ends the agent session on the handoff tool result, with no assistant message after it", async () => {
		const worktree = enterWorktree();
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
		assert.equal(readFileSync(join(worktree, HANDOFF_FILE), "utf8"), "Status: done\nDone: shipped handoff\nNext: load it in tools/agent\n");
	});
});
