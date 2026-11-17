// Enforces the orchestrator (CEO) rules on this session's own tool calls; the rules live in
// factory/ceo/RULES.md (ticket #68) and are injected into the system prompt of the lead sessions.
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { createHash } from "node:crypto";
import { readdirSync, readFileSync, realpathSync } from "node:fs";
import { homedir } from "node:os";

const ROOT = `${homedir()}/private/pirust`;

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
const PIG = /(^|[\s;&|(`/'"])pig(\s|$)/m;
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

export default function (pi: ExtensionAPI) {
	let on = false;
	pi.on("session_start", async (_e, ctx) => {
		try { on = realpathSync(ctx.cwd) === ROOT; } catch { on = false; }
	});

	// Only the orchestrator (cwd == repo root) carries the CEO rules; agents in a worktree do not.
	pi.on("before_agent_start", (e) => (on && ceoRules ? { ...e, systemPrompt: `${e.systemPrompt}\n\n${ceoRules}` } : undefined));

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
		if (e.toolName === "reload_runtime") {
			let stamp = "";
			try { stamp = readFileSync(EXT_PASS, "utf8"); } catch { /* no stamp yet: never checked */ }
			if (stamp !== fingerprint())
				return { block: true, reason: "Run tools/extcheck first: it loads every .pi/extensions/*.ts; reload_runtime is allowed once it exits 0." };
		}
		if (!on) return;
		const i = e.input ?? {};
		// #83: a lead never reloads the runtime mid-session (it breaks the prompt cache, and the
		// reload tool ends the turn). An edited extension applies when Patrick restarts this session.
		if (e.toolName === "reload_runtime") {
			return { block: true, reason: "A lead does not call reload_runtime. Run tools/extcheck on the edited extension, then ask Patrick to restart this session; the change applies then." };
		}
		if (e.toolName === "edit" || e.toolName === "write") {
			const text = JSON.stringify(i.edits ?? i.content ?? "").replace(/\\n/g, "\n");
			if (PIG.test(text)) return { block: true, reason: PIG_MSG };
			if (!DOC_OK.test(String(i.path ?? ""))) return { block: true, reason: "CEO does not write code. Create or update a ticket; the dispatcher assigns an agent." };
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
