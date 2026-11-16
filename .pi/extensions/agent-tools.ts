// Agent tools for the sandboxed fleet (spec: factory/automation.md row 1,
// examples/extensions/structured-output.ts).
//
// `handoff` writes HANDOFF.md and ends the run on its own tool result, so the
// agent pays for no extra LLM turn. agent-guard (#60) steers agents to call it.
//
// Type-only imports: an agent loads this file with `node`, which strips types and
// installs nothing, so it must keep no runtime import beyond `node:` builtins.
import type { AgentTool, ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { writeFileSync } from "node:fs";

export type HandoffStatus = "wip" | "done" | "blocked";

export interface HandoffParams {
	status: HandoffStatus;
	done: string;
	next: string;
	/** Commands the agent ran, mapped to their result, e.g. `{"cargo test -p x": "ok"}`. */
	verified?: Record<string, string>;
}

export type HandoffDetails = HandoffParams;

/** Written by `handoff`; `tools/wt` posts it to the ticket. Relative to the agent's cwd = its worktree. */
export const HANDOFF_FILE = "HANDOFF.md";

/** Hard cap on HANDOFF.md, so a handoff cannot bloat the next agent's context. */
export const MAX_HANDOFF_LINES = 5;

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
		done: { type: "string", description: "What you did, one short clause." },
		next: { type: "string", description: "What the next agent does; for blocked, what unblocks it." },
		verified: {
			type: "object",
			propertyNames: { type: "string" },
			additionalProperties: { type: "string" },
			description: 'Commands you ran mapped to their result, e.g. {"cargo test -p x": "ok"}.',
		},
	},
} as const;

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

	async execute(_toolCallId, params) {
		if (!["wip", "done", "blocked"].includes(params.status)) {
			throw new Error(`handoff: status must be wip, done, or blocked, got ${JSON.stringify(params.status)}`);
		}
		for (const field of ["done", "next"] as const) {
			const value = params[field];
			if (typeof value !== "string" || value.trim() === "") throw new Error(`handoff: ${field} is required`);
		}

		const verified = Object.entries(params.verified ?? {})
			.map(([command, result]) => `${oneLine(command)} -> ${oneLine(result)}`)
			.join("; ");
		const lines = [`Status: ${params.status}`, `Done: ${oneLine(params.done)}`, `Next: ${oneLine(params.next)}`];
		if (verified) lines.splice(2, 0, `Verified: ${verified}`);
		if (lines.length > MAX_HANDOFF_LINES) throw new Error(`handoff: ${lines.length} lines exceeds ${MAX_HANDOFF_LINES}`);

		writeFileSync(HANDOFF_FILE, `${lines.join("\n")}\n`);
		return {
			content: [{ type: "text", text: `Wrote ${HANDOFF_FILE} (${params.status}). Run ends here.` }],
			details: {
				status: params.status,
				done: oneLine(params.done),
				next: oneLine(params.next),
				...(verified ? { verified: params.verified } : {}),
			},
			terminate: true,
		};
	},
};

export default function (pi: ExtensionAPI) {
	pi.registerTool(handoffTool);
}
