// Reviewer verdict (ticket #76). A reviewer agent ends its run by calling `verdict`, so the
// verdict costs no extra LLM turn and cannot be prose only: the host validates the parameters
// against `verdictParameters` before `execute`, `tools/review` validates the written file
// against the same schema (same key order and values), and GitHub gets one review.
//
// Type-only imports: an agent loads this file with `node`, which strips types and installs
// nothing, so it keeps no runtime import beyond `node:` builtins (see agent-tools.ts).
import type { AgentTool, ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { writeFileSync } from "node:fs";
import { join } from "node:path";

export interface VerdictComment {
	path: string;
	line: number;
	body: string;
}

export interface VerdictParams {
	verdict: "approve" | "changes";
	comments: VerdictComment[];
	summary: string;
}

/** Written by `verdict` in the reviewed PR's worktree; `tools/review` validates it, posts it, then moves it out. */
export const VERDICT_FILE = "verdict.json";

/** Hard cap, so a review cannot flood the ticket it sends back. */
export const MAX_VERDICT_COMMENTS = 5;

const verdictParameters = {
	$schema: "https://json-schema.org/draft/2020-12/schema",
	title: "review verdict",
	type: "object",
	additionalProperties: false,
	required: ["verdict", "comments", "summary"],
	properties: {
		verdict: {
			description: "approve to let the PR go, changes to send the ticket back to Ready",
			enum: ["approve", "changes"],
		},
		comments: {
			description: "blocking issues only, max 5",
			type: "array",
			maxItems: 5,
			items: {
				type: "object",
				additionalProperties: false,
				required: ["path", "line", "body"],
				properties: {
					path: { description: "changed file, relative to the repo root", type: "string", minLength: 1 },
					line: { description: "line in that file the comment is about", type: "integer", minimum: 1 },
					body: { description: "what to fix, and why", type: "string", minLength: 1, maxLength: 500 },
				},
			},
		},
		summary: {
			description: "one paragraph: what you checked and what matters",
			type: "string",
			minLength: 1,
			maxLength: 500,
		},
	},
} as const;

export const verdictTool: AgentTool<typeof verdictParameters, VerdictParams> = {
	name: "verdict",
	label: "Verdict",
	description:
		"Give the final review verdict. Use this as your last action, after reading the diff and the files it touches. Do not write the verdict in prose.",
	promptSnippet: "Give the final review verdict (ends the run)",
	promptGuidelines: [
		"Call verdict as your last action on a review; the tool result ends the run, so no follow-up turn.",
		"Only blocking issues go in comments (max 5). Nits, praise, and nice-to-haves go in the summary.",
	],
	parameters: verdictParameters,

	async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
		if (params.verdict !== "approve" && params.verdict !== "changes") {
			throw new Error(`verdict: verdict must be approve or changes, got ${JSON.stringify(params.verdict)}`);
		}
		if (params.comments.length > MAX_VERDICT_COMMENTS) {
			throw new Error(`verdict: ${params.comments.length} comments exceeds the cap of ${MAX_VERDICT_COMMENTS}`);
		}
		for (const comment of params.comments) {
			if (!Number.isInteger(comment.line) || comment.line < 1) throw new Error("verdict: comment line must be an integer >= 1");
			for (const field of ["path", "body"] as const) {
				const value = comment[field];
				if (typeof value !== "string" || value.trim() === "") throw new Error(`verdict: comment ${field} is required`);
			}
		}
		if (typeof params.summary !== "string" || params.summary.trim() === "") throw new Error("verdict: summary is required");

		writeFileSync(join(ctx.cwd, VERDICT_FILE), `${JSON.stringify(params)}\n`);
		return {
			content: [{ type: "text", text: `Verdict: ${params.verdict} (${params.comments.length} comment(s)). Run ends here.` }],
			details: params,
			terminate: true,
		};
	},
};

export default function (pi: ExtensionAPI) {
	pi.registerTool(verdictTool);
}
