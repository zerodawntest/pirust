// Per-role tool loadout for the sandboxed fleet (spec: factory/automation.md rows 4-6,
// docs/extensions.md "Tool Exposure" + prepareLoadout, examples/extensions/preset.ts).
//
// Two jobs, both aimed at the first request's input tokens:
//  1. Trim the active tool set per role (a coder stops seeing grep/find/ls; a reviewer
//     has no edit/write) via pi.setActiveTools() in before_agent_start.
//  2. Replace the surviving tools' model-facing descriptions with short ones via the
//     prepareLoadout hook, so a request declares them in far fewer tokens.
//
// It also overrides the built-in `read` and `bash` with hard caps, so long reads and
// long command output cannot bloat later turns:
//  - read: at most 300 lines per call (page the rest with offset/limit).
//  - bash: keep the last 4 KB of combined stdout+stderr.
//
// Type-only imports: an agent loads this file with `node`, which strips types and
// installs nothing, so it keeps no runtime import beyond `node:` builtins.
import type { AgentTool, ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { execFileSync } from "node:child_process";
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

/** Short description per tool name; used for the tool definitions and prepareLoadout. */
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

// --- Overridden built-ins: `read` (300-line cap) and `bash` (4 KB tail cap). ---

const readParameters = {
	type: "object",
	additionalProperties: false,
	required: ["path"],
	properties: {
		path: { type: "string", description: "Path to the file to read (relative or absolute)" },
		offset: { type: "number", description: "Line number to start reading from (1-indexed)" },
		limit: { type: "number", description: "Maximum number of lines to read" },
	},
} as const;

export interface ReadDetails {
	lines: number;
	shown: number;
	truncated: boolean;
}

/** Hard cap on lines a single `read` returns; the model pages the rest with offset. */
export const MAX_READ_LINES = 300;

/** Cap on combined stdout+stderr a single `bash` returns; the tail is kept. */
export const MAX_BASH_OUTPUT_BYTES = 4096;

const IMAGE_EXT_RE = /\.(jpg|jpeg|png|gif|webp|bmp)$/i;

export const cappedReadTool: AgentTool<typeof readParameters, ReadDetails> = {
	name: "read",
	label: "read",
	description: shortDescriptions.read,
	promptSnippet: "Read a file (max 300 lines; page with offset).",
	promptGuidelines: ["Read returns at most 300 lines; use offset to continue a longer file."],
	parameters: readParameters,

	async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
		const base = ctx?.cwd ?? process.cwd();
		const abs = params.path.startsWith("/") ? params.path : join(base, params.path);
		if (IMAGE_EXT_RE.test(abs)) {
			return {
				content: [{ type: "text", text: `Read image file: ${params.path} (images are not shown in this role).` }],
				details: { lines: 0, shown: 0, truncated: false },
			};
		}
		const all = readFileSync(abs, "utf8").split("\n");
		const start = params.offset ? Math.max(0, params.offset - 1) : 0;
		if (start >= all.length) throw new Error(`Offset ${params.offset} is beyond end of file (${all.length} lines)`);
		const want = params.limit === undefined ? all.length : Math.min(all.length, start + params.limit);
		const end = Math.min(want, start + MAX_READ_LINES);
		const shown = all.slice(start, end);
		const truncated = end < all.length;
		let text = shown.join("\n");
		if (truncated) text += `\n[Showing lines ${start + 1}-${end} of ${all.length}. Use offset=${end + 1} to continue.]`;
		return { content: [{ type: "text", text }], details: { lines: all.length, shown: shown.length, truncated } };
	},

	// Shorten every declared tool's description, including this one's.
	prepareLoadout(loadout) {
		const descriptions: Record<string, string> = {};
		for (const tool of loadout.declared) {
			const short = shortDescriptions[tool.name];
			if (short !== undefined) descriptions[tool.name] = short;
		}
		return { descriptions };
	},
};

const bashParameters = {
	type: "object",
	additionalProperties: false,
	required: ["command"],
	properties: {
		command: { type: "string", description: "Shell command to execute" },
		timeout: { type: "number", description: "Timeout in seconds (optional, no default timeout)" },
	},
} as const;

export interface BashDetails {
	output: string;
	truncated: boolean;
	exitCode: number;
}

export const cappedBashTool: AgentTool<typeof bashParameters, BashDetails> = {
	name: "bash",
	label: "bash",
	description: shortDescriptions.bash,
	promptSnippet: "Run a bash command (output capped to the last 4 KB).",
	promptGuidelines: ["Bash returns only the last 4 KB of stdout+stderr; redirect bulky output to a file and read it in pages."],
	parameters: bashParameters,

	async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
		const cwd = ctx?.cwd ?? process.cwd();
		let out = "";
		let err = "";
		let code = 0;
		let timedOut = false;
		try {
			const res = execFileSync("/bin/bash", ["-c", params.command], {
				cwd,
				encoding: "utf8",
				maxBuffer: 8 * 1024 * 1024,
				timeout: params.timeout ? Math.floor(params.timeout * 1000) : undefined,
			});
			out = res.stdout;
			err = res.stderr ?? "";
			code = res.status ?? 0;
		} catch (error) {
			const e = error as { stdout?: string; stderr?: string; status?: number; signal?: string; code?: string };
			out = e.stdout ?? "";
			err = e.stderr ?? "";
			code = e.status ?? 1;
			timedOut = e.code === "ETIMEDOUT" || e.signal === "SIGTERM";
		}

		const combined = out + (err ? `${out ? "\n" : ""}${err}` : "");
		let text = combined;
		let truncated = false;
		const bytes = Buffer.byteLength(combined, "utf8");
		if (bytes > MAX_BASH_OUTPUT_BYTES) {
			text = Buffer.from(combined, "utf8").subarray(bytes - MAX_BASH_OUTPUT_BYTES).toString("utf8");
			truncated = true;
		}
		const notes: string[] = [];
		if (truncated) notes.push(`output truncated: showing last ${MAX_BASH_OUTPUT_BYTES} of ${bytes} bytes`);
		if (timedOut) notes.push(`timed out after ${params.timeout}s`);
		if (code !== 0) notes.push(`exit code: ${code}`);
		if (notes.length > 0) text += `\n[${notes.join("; ")}]`;
		return { content: [{ type: "text", text }], details: { output: text, truncated, exitCode: code } };
	},
};

export default function (pi: ExtensionAPI) {
	pi.registerTool(cappedReadTool);
	pi.registerTool(cappedBashTool);

	// Trim the active tool set to the role's list. Done in before_agent_start so the
	// first request already carries the reduced set and the short descriptions.
	pi.on("before_agent_start", (event) => {
		const role = detectRole(event.systemPrompt);
		if (!role) return {};
		const known = new Set(pi.getAllTools().map((tool) => tool.name));
		const active = roleTools[role].filter((name) => known.has(name));
		if (active.length > 0) pi.setActiveTools(active);
		return {};
	});
}
