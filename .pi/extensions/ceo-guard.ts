// Enforces orchestrator (CEO) rules from AGENTS.md on this session's own tool calls.
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { realpathSync } from "node:fs";
import { homedir } from "node:os";

const ROOT = `${homedir()}/private/pirust`;
const DOC_OK = /(^|\/)(AGENTS\.md|factory\/[^/]+\.md|docs\/adr\/[^/]+\.md)$/;
const SLOW = /\b(git clone|hc wait|sleep\s+([3-9]|\d\d)|cargo (build|test|nextest)|devenv shell|tools\/agent\b|watch\s)|for .*tools\/(ticket|gh-bot)/;
const CODE_WRITE = /(sed -i|python3? -|cat\s*>|tee\s|>\s*\S*(tools|\.pi|\.github|src|crates)\/)/;
const CODE_PATH = /(tools\/|\.pi\/|\.github\/|src\/|crates\/|devenv\.nix|devenv\.yaml)/;
const COMPACT_AT = 100_000;

export default function (pi: ExtensionAPI) {
	let on = false;
	pi.on("session_start", async (_e, ctx) => {
		try { on = realpathSync(ctx.cwd) === ROOT; } catch { on = false; }
	});

	pi.on("tool_call", async (e: any) => {
		if (!on) return;
		const i = e.input ?? {};
		if (e.toolName === "edit" || e.toolName === "write") {
			if (!DOC_OK.test(String(i.path ?? ""))) return { block: true, reason: "CEO does not write code. Create or update a ticket; the dispatcher assigns an agent." };
			return;
		}
		if (e.toolName !== "bash") return;
		const cmd = String(i.command ?? "");
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
