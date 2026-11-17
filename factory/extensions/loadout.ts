// Per-role tool loadout for the sandboxed fleet (spec: factory/automation.md rows 4-6,
// docs/extensions.md "Tool Exposure" + prepareLoadout, examples/extensions/preset.ts).
//
// Two jobs, both aimed at the first request's input tokens:
//  1. Trim the active tool set per role (a coder stops seeing grep/find/ls; a reviewer
//     has no edit) via pi.setActiveTools() in before_agent_start.
//  2. Replace every declared tool's model-facing description with a short one via the
//     `loadout` tool's prepareLoadout hook, so a request declares them in far fewer tokens.
//
// Output is capped with a `tool_result` hook (it can rewrite a result's `content`) rather
// than by replacing the built-in `read`/`bash` tools, so their behaviour (images, streaming,
// env injection, renderers) is left intact:
//  - read: at most 300 lines per call (the model pages the rest with offset).
//  - bash: keep the last 4 KB of combined stdout+stderr.
//
// Type-only imports: an agent loads this file with `node`, which strips types and
// installs nothing, so it keeps no runtime import beyond `node:` builtins.
import type {
	AgentTool,
	ExtensionAPI,
	ImageContent,
	TextContent,
	ToolResultEvent,
	ToolResultEventResult,
	ToolDefinition,
} from "@earendil-works/pi-coding-agent";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/** Roles defined by roles.json. Each maps to its active tools; `descriptions` is shared. */
export type Role = "coder" | "reviewer" | "planner" | "ceo";

export interface RoleLoadout {
	/** Tool names active for this role; replaces the default set. */
	tools: string[];
}

export interface RolesFile {
	/** Short model-facing description per tool, applied to every role. */
	descriptions: Record<string, string>;
	roles: Record<Role, RoleLoadout>;
}

const rolesPath = join(
	typeof import.meta.dirname === "string" ? import.meta.dirname : dirname(fileURLToPath(import.meta.url)),
	"..",
	"roles.json",
);
const rolesConfig: RolesFile = JSON.parse(readFileSync(rolesPath, "utf8"));

/** Short description per tool name; applied to every declared tool via prepareLoadout. */
export const shortDescriptions: Record<string, string> = rolesConfig.descriptions;

/** Active tool set per role, straight from roles.json. */
export const roleTools: Record<Role, string[]> = Object.fromEntries(
	Object.entries(rolesConfig.roles).map(([role, loadout]) => [role, loadout.tools]),
) as Record<Role, string[]>;

/** A role is named in its template's first line, e.g. "You are a pirust coder (Rust port of pi).". */
const ROLE_RE = /^You are a pirust (coder|reviewer|planner|ceo)\b/i;

export function detectRole(systemPrompt: string): Role | undefined {
	return ROLE_RE.exec(systemPrompt)?.[1] as Role | undefined;
}

/** Hard cap on lines a single `read` returns; the model pages the rest with offset. */
export const MAX_READ_LINES = 300;

/** Cap on combined stdout+stderr a single `bash` returns; the tail is kept. */
export const MAX_BASH_OUTPUT_BYTES = 4096;

const loadoutParameters = {
	type: "object",
	additionalProperties: false,
	properties: {},
} as const;

export interface LoadoutDetails {
	role?: Role;
	tools: string[];
}

/**
 * The only tool this extension registers. It exists to carry `prepareLoadout`, which
 * runs whenever the active tools change and shortens every declared tool's description.
 * Registered `direct` (and active by default) so its `prepareLoadout` applies; each role's
 * tool list in roles.json includes it so it stays active for every role.
 */
export const loadoutTool: ToolDefinition<typeof loadoutParameters, LoadoutDetails> = {
	name: "loadout",
	label: "loadout",
	description: shortDescriptions.loadout,
	promptSnippet: "List this role's active tools and output caps.",
	promptGuidelines: [
		`read returns at most ${MAX_READ_LINES} lines; use offset to continue a longer file.`,
		`bash returns only the last ${MAX_BASH_OUTPUT_BYTES} bytes of stdout+stderr; redirect bulky output to a file and read it in pages.`,
	],
	parameters: loadoutParameters,

	async execute(_toolCallId, _params, _signal, _onUpdate, _ctx) {
		const tools = currentRole ? roleTools[currentRole] : [];
		const text =
			`Active tools: ${tools.join(", ") || "none"}. ` +
			`read caps at ${MAX_READ_LINES} lines; bash keeps the last ${MAX_BASH_OUTPUT_BYTES} bytes.`;
		return { content: [{ type: "text", text }], details: { role: currentRole, tools } };
	},

	// Shorten every declared tool's description. Runs whenever the active tools change.
	prepareLoadout(loadout) {
		const descriptions: Record<string, string> = {};
		for (const tool of loadout.declared) {
			const short = shortDescriptions[tool.name];
			if (short !== undefined) descriptions[tool.name] = short;
		}
		return { descriptions };
	},
};

/** The role detected on the most recent `before_agent_start`; drives the `loadout` tool. */
let currentRole: Role | undefined;

/** Keep the first `maxLines` lines of every text item; leave images untouched. */
function capReadContent(content: (TextContent | ImageContent)[]): (TextContent | ImageContent)[] {
	let changed = false;
	const next = content.map((item) => {
		if (item.type !== "text") return item;
		const lines = item.text.split("\n");
		if (lines.length <= MAX_READ_LINES) return item;
		changed = true;
		const kept = lines.slice(0, MAX_READ_LINES);
		kept.push(`[read: showing first ${MAX_READ_LINES} of ${lines.length} lines; ${lines.length - MAX_READ_LINES} omitted. Use offset=${MAX_READ_LINES + 1} to continue.]`);
		return { ...item, text: kept.join("\n") };
	});
	return changed ? next : content;
}

/** Keep the last `MAX_BASH_OUTPUT_BYTES` bytes of every text item; leave images untouched. */
function capBashContent(content: (TextContent | ImageContent)[]): (TextContent | ImageContent)[] {
	let changed = false;
	const next = content.map((item) => {
		if (item.type !== "text") return item;
		const bytes = Buffer.byteLength(item.text, "utf8");
		if (bytes <= MAX_BASH_OUTPUT_BYTES) return item;
		changed = true;
		// Tail-slice on raw bytes; a partial multibyte char at the cut decodes to U+FFFD.
		const tail = Buffer.from(item.text, "utf8").subarray(bytes - MAX_BASH_OUTPUT_BYTES).toString("utf8");
		return { ...item, text: `[bash: output truncated; showing last ${MAX_BASH_OUTPUT_BYTES} of ${bytes} bytes.]\n${tail}` };
	});
	return changed ? next : content;
}

export default function (pi: ExtensionAPI) {
	// Carries `prepareLoadout` (short descriptions) and is active for every role.
	pi.registerTool(loadoutTool);

	// Cap output on the built-in `read` and `bash` without replacing them.
	pi.on("tool_result", (event): ToolResultEventResult | undefined => {
		if (event.toolName === "read") return { content: capReadContent(event.content) };
		if (event.toolName === "bash") return { content: capBashContent(event.content) };
		return undefined;
	});

	// Trim the active tool set to the role's list. Done in before_agent_start so the
	// first request already carries the reduced set and the short descriptions.
	pi.on("before_agent_start", (event) => {
		const role = detectRole(event.systemPrompt);
		currentRole = role;
		if (!role) return {};
		const known = new Set(pi.getAllTools().map((tool) => tool.name));
		const active = roleTools[role].filter((name) => known.has(name));
		if (active.length > 0) pi.setActiveTools(active);
		return {};
	});
}
