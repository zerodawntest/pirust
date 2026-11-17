// Forced handoff for a coder step (ticket #106; factory/design.md rows "Agent too long",
// "Bad handoff"; templates/coder.md loads it through `tools/sandbox`, which copies this
// directory into `<worktree>/.pi/extensions/`).
//
// A coder step ends at 20 tool calls, 40% of the model's context window, or 120k weighted
// tokens (`in + out + 0.1*cacheRead`, see factory/design.md "Budgets"). At the limit:
//
// 1. `pi.setActiveTools(["handoff"])` leaves the model one tool; `tool_call` blocks every
//    other name (belt and braces, the model cannot leave the handoff).
// 2. A text-only reply there is edited out of the context and a hidden "Call handoff now"
//    is injected, twice. On the third miss this file writes HANDOFF.md itself.
// 3. A valid handoff resets the context in process (no LLM summary): the `turn_end` after the
//    handoff appends a `compaction` entry (summary = ticket + HANDOFF.md, `firstKeptEntryId` =
//    the handoff turn, `tokensBefore` = the pre-reset context) and returns `continue: true`, so
//    the same agent keeps working on a fresh context (pi-hooks: Reset context in process). The
//    cap resets per step; `refreshes` counts the in-process resets, capped at `MAX_REFRESHES`.
//    `session_before_compact` supplies the same summary, so pi's own compaction never pays for
//    an LLM summary.
//
// Type-only imports: an agent loads this file with `node`, which strips types and installs
// nothing, so it must keep no runtime import beyond `node:` builtins and ./agent-tools.ts.
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import agentTools, { HANDOFF_FILE, MAX_HANDOFF_FIELD, MAX_HANDOFF_LINES, type HandoffParams, type VerifiedCommand } from "./agent-tools.ts";

export const LIMIT_CALLS = 20;
export const LIMIT_CONTEXT_RATIO = 0.4;
export const LIMIT_WEIGHTED_TOKENS = 120_000;
export const CACHE_WEIGHT = 0.1;
/** Text-only replies at the limit; the third one loses the step (the extension hands off). */
export const MAX_TEXT_ONLY_REPLIES = 2;
/** In-process context resets per agent; past this the step is left to the runner (needs:split). */
export const MAX_REFRESHES = 3;
/** Tool results in the `context` hook are cut to `TRIM_CHARS` from the first 300 chars. */
export const TRIM_KEEP_TURNS = 3;
export const TRIM_CHARS = 300;
/** Relative, so a sandboxed agent (only its worktree is writable) can write it; name matches `~/.pi/pirust-usage.log`. */
export const USAGE_LOG = ".pi/pirust-usage.log";

/** Content parts of a session message (agent-tools.ts / session-format.md). */
type Part = { type: string; text?: string; id?: string; name?: string; arguments?: Record<string, unknown> };
interface Msg {
	role?: string;
	content?: Part[];
	usage?: { input?: number; output?: number; cacheRead?: number };
}
interface Entry {
	type: string;
	message?: Msg;
}

/** Collapse whitespace runs so a field stays on one HANDOFF.md line. */
const oneLine = (value: string) => value.replace(/\s+/g, " ").trim();
const textOf = (message: Msg) => (message.content ?? []).filter((p) => p.type === "text").map((p) => p.text ?? "").join(" ").trim();
const toolCallsOf = (message: Msg) => (message.content ?? []).filter((p) => p.type === "toolCall");

let stepCalls = 0;
let stepWeighted = 0;
let textReplies = 0;
let atLimit = false;
/** In-process context resets so far (the `reset in process` cap); capped at MAX_REFRESHES. */
let refreshes = 0;
let stepNo = 1;
let ticket = "0";
/** First user message: "Ticket #N <body>" (tools/agent), i.e. the ticket plus the HANDOFF note. */
let taskText = "";
let wroteFallback = false;

export function stepState() {
	return { stepCalls, stepWeighted, textReplies, atLimit, refreshes, stepNo, ticket, wroteFallback };
}

/** The in-process reset entry (no LLM): the whole run is summarized as ticket + HANDOFF.md, and
 *  the context is kept from `firstKeptEntryId` (the handoff turn) on, so `continue` starts fresh. */
function compactionEntry(ctx: { getContextUsage?: () => { tokens?: number } | undefined }, firstKeptEntryId: string) {
	return {
		type: "compaction",
		summary: `${taskText}\n\n${readFileSync(HANDOFF_FILE, "utf8")}`,
		firstKeptEntryId,
		tokensBefore: ctx.getContextUsage?.()?.tokens ?? 0,
	};
}

/** The step is over: one line to the usage log; `refreshes` counts the in-process context resets. */
function endStep(ctx: { shutdown?: () => void }, forced: string) {
	refreshes += 1;
	const path = join(process.cwd(), USAGE_LOG);
	mkdirSync(dirname(path), { recursive: true });
	appendFileSync(path, `${ticket} ${stepNo} ${stepCalls} ${Math.round(stepWeighted)} ${refreshes} ${forced}\n`);
	stepCalls = 0;
	stepWeighted = 0;
	textReplies = 0;
	atLimit = false;
	stepNo += 1;
}

export default function (pi: ExtensionAPI) {
	// Installs the `handoff` tool and binds its `pi.exec` (it re-runs the verified commands).
	agentTools(pi);

	pi.on("message_start", (event) => {
		const message = (event as { message?: Msg }).message;
		if (message?.role !== "user") return;
		const text = textOf(message);
		if (!taskText) taskText = text;
		const match = /Ticket #(\d+)/.exec(text);
		if (match) ticket = match[1];
	});

	pi.on("tool_call", (event) => {
		const call = event as { toolName?: string };
		if (atLimit && call.toolName && call.toolName !== "handoff") {
			return { block: true, reason: "step limit reached: call handoff now" };
		}
	});

	// Tool results are the bulk of a coder session; keep the last 3 turns whole, trim the rest.
	pi.on("context", (event) => {
		const messages = ((event as { messages?: Msg[] }).messages ?? []).map((m) => ({ ...m }));
		const assistantAt: number[] = [];
		messages.forEach((m, i) => {
			if (m.role === "assistant") assistantAt.push(i);
		});
		if (assistantAt.length <= TRIM_KEEP_TURNS) return { messages };
		const cut = assistantAt[assistantAt.length - TRIM_KEEP_TURNS];
		return {
			messages: messages.map((m, i) => {
				if (m.role !== "toolResult" || i >= cut || !Array.isArray(m.content)) return m;
				return {
					...m,
					content: m.content.map((p) =>
						p.type === "text" && (p.text?.length ?? 0) > TRIM_CHARS ? { ...p, text: `${p.text!.slice(0, TRIM_CHARS)} [trimmed]` } : p,
					),
				};
			}),
		};
	});

	pi.on("turn_end", (event, ctx) => {
		const message = (event as { message?: Msg }).message;
		if (message?.role !== "assistant") return;

		const calls = toolCallsOf(message);
		stepCalls += calls.length;
		stepWeighted += (message.usage?.input ?? 0) + (message.usage?.output ?? 0) + CACHE_WEIGHT * (message.usage?.cacheRead ?? 0);

		if (!atLimit) {
			const used = ctx.getContextUsage?.()?.tokens ?? 0;
			const cap = (ctx.model?.contextWindow ?? Number.POSITIVE_INFINITY) * LIMIT_CONTEXT_RATIO;
			if (stepCalls >= LIMIT_CALLS || stepWeighted >= LIMIT_WEIGHTED_TOKENS || used >= cap) {
				atLimit = true;
				// The model has one tool left: it cannot leave the handoff.
				pi.setActiveTools(["handoff"]);
			}
		}
		if (!atLimit) return;
		// A step past the in-process reset cap is not guarded: the runner starts a fresh agent.
		if (refreshes >= MAX_REFRESHES) return;

		// The model has one tool left. A text reply is not a handoff: drop it and ask again.
		if (calls.length === 0) {
			textReplies += 1;
			if (textReplies <= MAX_TEXT_ONLY_REPLIES) {
				const entries = (event as { entries?: unknown[] }).entries ?? [];
				return {
					entries: [
						...entries,
						{ type: "context_edit", targetId: (event as { messageEntryId?: string }).messageEntryId, replacement: null },
						{ type: "custom_message", customType: "agent-guard", content: "Call handoff now.", display: false },
					],
					continue: true,
				};
			}
			// Third miss: hand off for the model, from the session's own record.
			const firstKeptEntryId = (event as { messageEntryId?: string }).messageEntryId!;
			const files = new Set<string>();
			let lastText = "";
			for (const entry of ctx.sessionManager?.getEntries() ?? []) {
				if (entry.type !== "message" || entry.message?.role !== "assistant") continue;
				const text = textOf(entry.message);
				if (text) lastText = text;
				for (const call of toolCallsOf(entry.message)) {
					if (call.name !== "write" && call.name !== "edit" && call.name !== "multiedit") continue;
					const target = call.arguments?.path ?? call.arguments?.file_path;
					if (typeof target === "string") files.add(target);
				}
			}
			const lines = [
				"Status: wip",
				`Done: ${oneLine(lastText).slice(0, MAX_HANDOFF_FIELD)}`,
				`Files: ${[...files].join(", ")}`,
				"Next: a fresh agent continues from Files and the reply above",
			];
			writeFileSync(HANDOFF_FILE, `${lines.slice(0, MAX_HANDOFF_LINES).join("\n")}\n`);
			wroteFallback = true;
			endStep(ctx, "fallback");
			// Same in-process reset as a valid handoff: the model was text-only, so this step
			// writes no code; a `continue` on the reset context is a fresh agent in this process.
			return {
				entries: [...((event as { entries?: unknown[] }).entries ?? []), compactionEntry(ctx, firstKeptEntryId)],
				continue: true,
			};
		}

		if (calls.some((c) => c.name === "handoff")) {
			// `handoff` wrote HANDOFF.md; reset the context in process (no LLM summary): the
			// compaction entry summarizes the whole run as ticket + HANDOFF.md, so the same agent
			// keeps working on a fresh context. The run no longer ends on the tool's `terminate`.
			endStep(ctx, String(textReplies));
			return {
				entries: [...((event as { entries?: unknown[] }).entries ?? []), compactionEntry(ctx, (event as { messageEntryId?: string }).messageEntryId!)],
				continue: true,
			};
		}
	});

	// pi's own compaction costs no LLM call: the summary is the ticket plus HANDOFF.md.
	pi.on("session_before_compact", (event) => {
		if (!existsSync(HANDOFF_FILE)) return;
		const preparation = (event as { preparation?: { firstKeptEntryId?: string; tokensBefore?: number } }).preparation;
		return {
			compaction: {
				summary: `${taskText}\n\n${readFileSync(HANDOFF_FILE, "utf8")}`,
				firstKeptEntryId: preparation?.firstKeptEntryId,
				tokensBefore: preparation?.tokensBefore,
			},
		};
	});
}

export type { HandoffParams, VerifiedCommand };
export { HANDOFF_FILE, MAX_HANDOFF_FIELD, MAX_HANDOFF_LINES, handoffTool } from "./agent-tools.ts";
