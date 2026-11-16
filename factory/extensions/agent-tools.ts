// Agent tools for the sandboxed fleet (spec: factory/automation.md row 1,
// examples/extensions/structured-output.ts).
//
// `handoff` writes HANDOFF.md and ends the run on its own tool result, so the
// agent pays for no extra LLM turn. agent-guard (#106) steers agents to call it.
//
// Type-only imports: an agent loads this file with `node`, which strips types and
// installs nothing, so it must keep no runtime import beyond `node:` builtins.
import type { AgentTool, ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { writeFileSync } from "node:fs";

export type HandoffStatus = "wip" | "done" | "blocked";

/** A command the agent claims to have run, with the result it saw. */
export interface VerifiedCommand {
	cmd: string;
	result: "ok" | "fail";
}

export interface HandoffParams {
	status: HandoffStatus;
	done: string;
	next: string;
	/** Commands the agent ran, each re-run on verify. `done` requires at least one. */
	verified?: VerifiedCommand[];
}

export type HandoffDetails = HandoffParams;

/** Written by `handoff`; `tools/wt` posts it to the ticket. Relative to the agent's cwd = its worktree. */
export const HANDOFF_FILE = "HANDOFF.md";

/** Hard cap on HANDOFF.md, so a handoff cannot bloat the next agent's context. */
export const MAX_HANDOFF_LINES = 5;

/** `done`/`next` hard cap (chars) so a handoff stays a few lines, per the coder template. */
export const MAX_HANDOFF_FIELD = 200;

const handoffParameters = {
	type: "object",
	additionalProperties: false,
	required: ["status", "done", "next"],
	properties: {
		status: {
			type: "string",
			enum: ["wip", "done", "blocked"],
			description: "wip = a new agent continues from this file, done = finished, blocked = stopped with the ticket unfinished.",
		},
		done: { type: "string", maxLength: MAX_HANDOFF_FIELD, description: "What you did, one short clause." },
		next: { type: "string", maxLength: MAX_HANDOFF_FIELD, description: "What the next agent does; for blocked, what unblocks it." },
		verified: {
			type: "array",
			description: 'Commands you ran, each re-run on verify; `done` needs ≥1. Each result is the result you saw.',
			items: {
				type: "object",
				additionalProperties: false,
				required: ["cmd", "result"],
				properties: {
					cmd: { type: "string", description: "Command you ran, e.g. cargo test -p x." },
					result: { type: "string", enum: ["ok", "fail"], description: "ok = exit 0, fail = nonzero." },
				},
			},
		},
	},
} as const;

/** `pi.exec(command, args, options)`; set by `registerTools` so `execute` can re-run verified commands. */
let exec: ((command: string, args: string[], options?: { signal?: AbortSignal }) => Promise<{ code: number; stdout: string; stderr: string }>) | undefined;

/** Collapse whitespace runs so a field stays on one HANDOFF.md line. */
const oneLine = (value: string) => value.replace(/\s+/g, " ").trim();

export const handoffTool: AgentTool<typeof handoffParameters, HandoffDetails> = {
	name: "handoff",
	label: "Handoff",
	description: "Write HANDOFF.md and stop. The last action of a step: the run ends on this tool result.",
	promptSnippet: "Write HANDOFF.md (status, done, next, verified) as your last action; the run ends there.",
	promptGuidelines: [
		"Call handoff as your final action when the ticket is done, blocked, or you hit a step limit in the ticket.",
		"Do not write a reply after handoff: the run ends on its tool result, so nothing you say after it is read.",
	],
	parameters: handoffParameters,
	// pi does the strict sampling; needs `compat.supportsStrictMode: true` on the model (models.json).
	constrainedSampling: { type: "json_schema", strict: "prefer" },

	async execute(_toolCallId, params, signal) {
		if (!["wip", "done", "blocked"].includes(params.status)) {
			throw new Error(`handoff: status must be wip, done, or blocked, got ${JSON.stringify(params.status)}`);
		}
		for (const field of ["done", "next"] as const) {
			const value = params[field];
			if (typeof value !== "string" || value.trim() === "") throw new Error(`handoff: ${field} is required`);
			if (value.length > MAX_HANDOFF_FIELD) throw new Error(`handoff: ${field} exceeds ${MAX_HANDOFF_FIELD} chars`);
		}

		const verified = params.verified ?? [];
		// A `done` claim must be backed by a command that the harness re-runs to exit 0, not by text.
		if (params.status === "done") {
			if (verified.length === 0) throw new Error("handoff: status done needs ≥1 verified command");
			for (const v of verified) {
				if (typeof v.cmd !== "string" || v.cmd.trim() === "") throw new Error("handoff: verified cmd is required");
				const res = await exec?.(v.cmd, [], { signal });
				if (!res) throw new Error(`handoff: cannot re-run verified command (${v.cmd}): exec unavailable`);
				if (res.code !== 0) throw new Error(`handoff: verified command failed (exit ${res.code}): ${v.cmd}`);
			}
		}
		const verifiedStr = verified.map((v) => `${oneLine(v.cmd)} -> ${oneLine(v.result)}`).join("; ");

		const lines = [`Status: ${params.status}`, `Done: ${oneLine(params.done)}`, `Next: ${oneLine(params.next)}`];
		if (verifiedStr) lines.splice(2, 0, `Verified: ${verifiedStr}`);
		if (lines.length > MAX_HANDOFF_LINES) throw new Error(`handoff: ${lines.length} lines exceeds ${MAX_HANDOFF_LINES}`);

		writeFileSync(HANDOFF_FILE, `${lines.join("\n")}\n`);
		return {
			content: [{ type: "text", text: `Wrote ${HANDOFF_FILE} (${params.status}). Run ends here.` }],
			details: {
				status: params.status,
				done: oneLine(params.done),
				next: oneLine(params.next),
				...(verified.length ? { verified: params.verified } : {}),
			},
			terminate: true,
		};
	},
};

export default function (pi: ExtensionAPI) {
	exec = (command, args, options) => pi.exec(command, args, options);
	pi.registerTool(handoffTool);
}
