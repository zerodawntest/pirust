// Enforces the orchestrator (CEO) rules on this session's own tool calls; the rules live in
// factory/ceo/RULES.md (ticket #68) and are injected into the system prompt of the lead sessions.
// Also injects the lessons (factory/lessons.json) and factory/runtime.md into the CEO
// prompt, and blocks the tool calls those lessons forbid. Only t1nm and the driver
// load this file (both run at the repo root); agents are pig and load nothing from .pi/.
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { createHash } from "node:crypto";
import { readdirSync, readFileSync, realpathSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// A repeated CEO mistake: the fact to inject, an optional regex on the tool-call input
// to block, and the message shown when it blocks.
interface Lesson {
	fact: string;
	block?: string;
	msg?: string;
}

// The repo root is this module's own grandparent, so a worktree reads its own factory/.
// `resolve` (not realpath) is existence-safe: a worktree of the main checkout loads here.
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

// Gate reload_runtime on tools/extcheck: extensions must load clean before a reload. extcheck
// writes a stamp keyed by the extensions' content hashes; a reload is allowed only when the
// stamp matches the current files, so editing an extension blocks reload until extcheck passes.
const EXT_DIR = `${ROOT}/.pi/extensions`;
const EXT_PASS = `${ROOT}/.pi/.extcheck-pass`;
// Fingerprint = `sha256sum .pi/extensions/*.ts` (sorted, relative paths), byte-for-byte what
// tools/extcheck writes. Reading each file keeps this in sync with the shell's sha256sum.
const fingerprint = () => {
	let names: string[];
	try {
		names = readdirSync(EXT_DIR).filter((n) => n.endsWith(".ts")).sort();
	} catch {
		// This checkout has no .pi/extensions (fresh clone, another machine): nothing to reload.
		return "";
	}
	return names
		.map((n) => `${createHash("sha256").update(readFileSync(`${EXT_DIR}/${n}`)).digest("hex")}  .pi/extensions/${n}`)
		.join("\n") + "\n";
};
const DOC_OK = /(^|\/)(AGENTS\.md|factory\/[^/]+\.md|docs\/adr\/[^/]+\.md|\.agents\/skills\/[^/]+\/SKILL\.md)$/;
// Everyone runs on pi 1.5.1 (Patrick, 2026-11-17): no pig binary in commands, launch lines or docs.
// Match a pig LAUNCH only (start of a command, or after a `;`/`&`/`|` separator, then whitespace).
// A `pig` inside a path (e.g. `~/.pig/pirust-queue`) is not a launch and must not be blocked.
const PIG = /(^|[;&|]\s*)pig(\s|$)/;
const PIG_MSG = "Use pi, not pig (Patrick). Agents: tools/sandbox . pi --model ibm-next/qwen38-flash-next ...";
const SLOW = /\b(git clone|hc wait|sleep\s+([3-9]|\d\d)|cargo (build|test|nextest)|devenv shell|tools\/agent\b|watch\s)|for .*tools\/(ticket|gh-bot)/;
const CODE_WRITE = /(sed -i|python3? -|cat\s*>|tee\s|>\s*\S*(tools|\.pi|\.github|src|crates)\/)/;
const CODE_PATH = /(tools\/|\.pi\/|\.github\/|src\/|crates\/|devenv\.nix|devenv\.yaml)/;
const COMPACT_AT = 100_000;

// The orchestrator rules live in factory/ceo/RULES.md (ticket #68): every agent's context file
// (AGENTS.md) stays small, and these rules are injected into the system prompt of the sessions
// that need them. The text is read once and pasted verbatim, so the prompt prefix stays cached.
// import.meta.dirname is this file's dir (.pi/extensions), so the repo root is two levels up.
const RULES_PATH = `${import.meta.dirname}/../../factory/ceo/RULES.md`;
let ceoRules = "";
try {
	ceoRules = `## CEO rules (from ${RULES_PATH})\n\n${readFileSync(RULES_PATH, "utf8").trim()}\n`;
} catch {
	// Missing rules file: inject nothing (the rules are enforced only when present).
}

function loadLessons(path: string): Lesson[] {
	let arr: unknown;
	try {
		arr = JSON.parse(readFileSync(path, "utf8"));
	} catch {
		return [];
	}
	if (!Array.isArray(arr)) return [];
	// Sort by fact so the injected prefix is deterministic (independent of file order) and cache-stable.
	return (arr as Lesson[])
		.filter((l) => typeof l?.fact === "string" && l.fact !== "")
		.sort((a, b) => (a.fact < b.fact ? -1 : a.fact > b.fact ? 1 : 0));
}

const LESSONS = loadLessons(resolve(ROOT, "factory/lessons.json"));

// Runtime facts, read once verbatim; the file is unchanged, so this is byte-stable.
const RUNTIME_MD = (() => {
	try {
		return readFileSync(resolve(ROOT, "factory/runtime.md"), "utf8");
	} catch {
		return "";
	}
})();

// The text injected into every CEO prompt: lessons + runtime.md verbatim. Deterministic and
// computed once, so two `before_agent_start` calls return a byte-identical prompt (cache-safe).
const LESSONS_PROMPT = `# Lessons (injected facts)\n${LESSONS.map((l) => `- ${l.fact}`).join("\n")}\n\n# Runtime facts (verbatim)\n${RUNTIME_MD}`;

// Precompiled block rules: a tool call whose serialized input matches a lesson regex is blocked.
const LESSON_BLOCKS = LESSONS.filter((l) => l.block).map((l) => ({ re: new RegExp(l.block as string), msg: l.msg ?? l.fact }));

// Files a lead must not edit because each is listed in `Files:` of an In-progress ticket
// (lesson: leads must not edit a file owned by an In-progress ticket; the CEO broke #91 via
// factory/runtime.md). Maps a repo-relative path to the owning ticket. A lead editing one is
// blocked with that ticket's number. #92's own code file is locked (the lead is a coder on
// #92, so it may not hand-edit the extension); factory/lessons.json stays writable (leads add lessons).
const LOCKED_FILES: Record<string, string> = {
	"factory/runtime.md": "91",
	".pi/extensions/ceo-guard.ts": "92",
};

// Close a double-quoted string from the char after the opening quote; `\` escapes the next
// char. Returns the index of the closing quote, or -1 if unbalanced.
function closingDouble(s: string, from: number): number {
	for (let i = from; i < s.length; i++) {
		if (s[i] === "\\") i++;
		else if (s[i] === '"') return i;
	}
	return -1;
}

// Strip shell-quoted text so a block regex matches only the executed command, not quoted text
// (ticket #92: match on executed commands only). A single-quoted literal is dropped in full
// (not executed); a double-quoted literal is dropped except its `${…}`/`$(…)` substitutions,
// which are executed. Unbalanced quotes are left as-is — there is no reliable parse.
function stripQuotes(s: string): string {
	let out = "";
	let i = 0;
	while (i < s.length) {
		const c = s[i];
		if (c === "'") {
			const end = s.indexOf("'", i + 1);
			if (end < 0) { out += s.slice(i); break; }
			out += "''";
			i = end + 1;
		} else if (c === '"') {
			const end = closingDouble(s, i + 1);
			if (end < 0) { out += s.slice(i); break; }
			const subs = s.slice(i + 1, end).match(/\$\{[^}]*\}|\$\([^)]*\)/g)?.join(" ") ?? "";
			out += '"' + subs + '"';
			i = end + 1;
		} else {
			out += c;
			i += 1;
		}
	}
	return out;
}

export default function (pi: ExtensionAPI) {
	// true in the CEO sessions (t1nm and the driver): both run with cwd = repo root.
	let on = false;
	pi.on("session_start", async (_e, ctx) => {
		on = resolve(ctx.cwd) === ROOT;
	});

	// Inject the lessons facts and factory/runtime.md, then the CEO rules, into the prompt. Both
	// are computed once and pasted verbatim (no timestamps/counters), so the prefix stays cached.
	// A single handler carries the rules (ticket #68) and the lessons facts (ticket #92).
	pi.on("before_agent_start", (e) => {
		if (!on) return;
		const parts: string[] = [LESSONS_PROMPT];
		if (ceoRules) parts.push(ceoRules);
		return { ...e, systemPrompt: `${e.systemPrompt}\n\n${parts.join("\n\n")}` };
	});

	// Verify: /ceo-rules-check prints the rules and asserts the live system prompt carries them.
	pi.registerCommand("ceo-rules-check", {
		description: "Check that the CEO rules (factory/ceo/RULES.md) are in this session's system prompt",
		handler: async (_args, ctx) => {
			const sp = ctx.getSystemPrompt();
			const head = `## CEO rules (from ${RULES_PATH})`;
			const hasRules = ceoRules.length > 0 && sp.includes(head) && sp.includes(ceoRules.trim());
			ctx.ui.notify(
				`${hasRules ? "OK" : "MISSING"}: CEO rules ${hasRules ? "injected" : "not in"} the system prompt (rules file ${ceoRules.length ? "read" : "unreadable"}, ${ceoRules.length} chars, injected when cwd == ${ROOT}).`,
				hasRules ? "info" : "warning",
			);
		},
	});


	pi.on("tool_call", async (e: any) => {
		// #83: a lead never reloads the runtime mid-session (it breaks the prompt cache, and the
		// reload tool ends the turn). An edited extension applies when Patrick restarts this session.
		if (e.toolName === "reload_runtime") {
			return { block: true, reason: "A lead does not call reload_runtime. Run tools/extcheck on the edited extension, then ask Patrick to restart this session; the change applies then." };
		}
		if (e.toolName === "reload_runtime") {
			let stamp = "";
			try { stamp = readFileSync(EXT_PASS, "utf8"); } catch { /* no stamp yet: never checked */ }
			if (stamp !== fingerprint())
				return { block: true, reason: "Run tools/extcheck first: it loads every .pi/extensions/*.ts; reload_runtime is allowed once it exits 0." };
		}
		if (!on) return;
		const i = e.input ?? {};
		// only (shell-quoted text is stripped); for a write/edit, match the serialized call, since
		// the written content is executed as-is (not quoted). Other tools are not gated by lessons.
		let hay = "";
		if (e.toolName === "bash") hay = stripQuotes(String(i.command ?? ""));
		else if (e.toolName === "edit" || e.toolName === "write") hay = JSON.stringify({ tool: e.toolName, input: i });
		for (const b of LESSON_BLOCKS) if (b.re.test(hay)) return { block: true, reason: b.msg };
		if (e.toolName === "edit" || e.toolName === "write") {
			const path = String(i.path ?? "");
			const lock = LOCKED_FILES[path];
			if (lock) return { block: true, reason: `Blocked: ${path} is in the Files: of In-progress ticket #${lock}; leads do not edit a file owned by an in-progress ticket (see #${lock}).` };
			const text = JSON.stringify(i.edits ?? i.content ?? "").replace(/\\n/g, "\n");
			if (PIG.test(text)) return { block: true, reason: PIG_MSG };
			if (!DOC_OK.test(path)) return { block: true, reason: "CEO does not write code. Create or update a ticket; the dispatcher assigns an agent." };
			return;
		}
		if (e.toolName !== "bash") return;
		const cmd = String(i.command ?? "");
		if (PIG.test(cmd)) return { block: true, reason: PIG_MSG };
		const bg = /^\s*(PIRUST_PARENT=\S+\s+)?hc run --bg/.test(cmd);
		if (!bg && SLOW.test(cmd)) return { block: true, reason: "Slow/blocking in foreground. Use: hc run --bg --rm --no-notify --name pirust-<x> -- bash -c '...'" };
		if (!bg && CODE_WRITE.test(cmd) && CODE_PATH.test(cmd)) return { block: true, reason: "CEO does not write code (bash write into code path). Ticket it." };
		i.command = `{ ${cmd}\n} 2>&1 | tail -c 4000`;
	});

	pi.on("agent_end", async (_e, ctx) => {
		if (!on) return;
		const u = ctx.getContextUsage?.();
		if (!u?.tokens || u.tokens < COMPACT_AT) return;
		ctx.compact({ customInstructions: "Keep only: Patrick's last request, open decisions, running agents/tickets, rules broken and fixed. Rest is in factory/STATE.md, AGENTS.md, the board." });
	});
}
