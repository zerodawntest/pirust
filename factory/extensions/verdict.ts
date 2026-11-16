// Reviewer verdict (ticket #76). A reviewer agent ends its run by calling `verdict`, so the
// verdict costs no extra LLM turn and cannot be prose only: the host validates this schema
// before `execute`, `tools/review` validates the written file, and GitHub gets one review.
import { defineTool, type ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";
import { writeFileSync } from "node:fs";
import { join } from "node:path";

const Comment = Type.Object(
	{
		path: Type.String({ minLength: 1, description: "Changed file, relative to the repo root" }),
		line: Type.Integer({ minimum: 1, description: "Line in that file the comment is about" }),
		body: Type.String({ minLength: 1, maxLength: 500, description: "What to fix, and why" }),
	},
	{ additionalProperties: false },
);

// The JSON Schema of verdict.json. Keep in step with the schema `tools/review` checks (see `tools/review --schema`).
const Verdict = Type.Object(
	{
		verdict: Type.Union([Type.Literal("approve"), Type.Literal("changes")], {
			description: '"approve" to let the PR go, "changes" to send the ticket back to Ready',
		}),
		comments: Type.Array(Comment, {
			maxItems: 5,
			description: "Blocking issues only, max 5. Each is one comment on the PR and on the ticket.",
		}),
		summary: Type.String({
			minLength: 1,
			maxLength: 500,
			description: "One paragraph: what you checked and what matters. Nits and praise go here, not in comments.",
		}),
	},
	{ additionalProperties: false },
);

export default function (pi: ExtensionAPI) {
	pi.registerTool(
		defineTool({
			name: "verdict",
			label: "Verdict",
			description:
				"Give the final review verdict. Use this as your last action, after reading the diff and the files it touches. Do not write the verdict in prose.",
			promptSnippet: "Give the final review verdict (ends the run)",
			promptGuidelines: [
				"Call verdict as your last action on a review; the tool result ends the run, so no follow-up turn.",
				"Only blocking issues go in comments (max 5). Nits, praise, and nice-to-haves go in the summary.",
			],
			parameters: Verdict,
			async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
				// One file per reviewed PR; tools/review validates it, posts the review, then removes it.
				writeFileSync(join(ctx.cwd, "verdict.json"), `${JSON.stringify(params)}\n`);
				return {
					content: [{ type: "text", text: `Verdict: ${params.verdict} (${params.comments.length} comment(s))` }],
					details: params,
					terminate: true,
				};
			},
		}),
	);
}
