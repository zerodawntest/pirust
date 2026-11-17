// CEO flow gate (Patrick 2026-11-17: force research > review > plan > break > continue > improve).
// Work starts as a goal file run through tools/loop (research, write, review, architect, assess,
// break, verify, each a fresh agent with a gate). The CEO cannot shortcut that:
// - no `tools/ticket new` unless it is an escalation (needs:patrick) or its title is a decision
//   already written in factory/changes.md; loop tickets reach the board only via tools/loop-publish,
//   which refuses a loop whose verify gate did not pass;
// - no `ticket set -s Ready` (lint + publish or the driver set Ready);
// - no new factory/*.md docs except goal-<name>.md and changes.md;
// - a loop that ended (pass or fail) forces a retro block `## loop:<name> r<rows>` in
//   factory/changes.md before the CEO may settle (improve step);
// - each run starts with the flow board (loops, stage, scores, retro owed, last KPI) when it changed.
// CEO only: cwd = repo root and PIRUST_ROLE != driver.
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const LOOPS = process.env.PIRUST_LOOPS ?? `${homedir()}/.pig/loops`;
const CHANGES = `${ROOT}/factory/changes.md`;
const KPI = `${homedir()}/.pig/kpi.jsonl`;
const MAX_NUDGES = 2;
const ACTIVE_MS = 10 * 60_000;

export interface Loop { name: string; stage: string; round: number; scores: number[]; exit: number | null; running: boolean; ended: boolean; passed: boolean; key: string }

const read = (p: string) => { try { return readFileSync(p, "utf8"); } catch { return ""; } };
const jsonl = (p: string) => read(p).split("\n").filter(Boolean).flatMap((l) => { try { return [JSON.parse(l)]; } catch { return []; } });
const json = (p: string) => { try { return JSON.parse(read(p)); } catch { return null; } };

function liveLoops(): Set<string> {
	try {
		const j = JSON.parse(execFileSync("hc", ["ls", "--json"], { encoding: "utf8", timeout: 3000 }));
		const ts: any[] = Array.isArray(j) ? j : (j.terminals ?? []);
		return new Set(ts.map((t) => String(t.name ?? "")).filter((n) => n.startsWith("pirust-loop-")).map((n) => n.slice(12)));
	} catch {
		return new Set();
	}
}

// A loop counts as running when an hc terminal pirust-loop-<name> is live or a file in its dir
// changed in the last 10 min (a loop started under another terminal name).
export function scanLoops(dir = LOOPS, live: Set<string> = liveLoops(), now = Date.now()): Loop[] {
	let names: string[] = [];
	try { names = readdirSync(dir).filter((n) => statSync(`${dir}/${n}`).isDirectory()); } catch { return []; }
	return names.sort().map((name) => {
		const d = `${dir}/${name}`;
		const rows = jsonl(`${d}/ledger.jsonl`);
		const st = json(`${d}/state.json`);
		let fresh = false;
		try { fresh = readdirSync(d).some((f) => now - statSync(`${d}/${f}`).mtimeMs < ACTIVE_MS); } catch { /* gone */ }
		const last = rows[rows.length - 1];
		const running = live.has(name) || fresh;
		const passed = !st && last?.stage === "verify" && last?.exit === 0 && json(`${d}/review.json`)?.verdict === "pass";
		return {
			name,
			stage: st?.stage ?? "end",
			round: st?.round ?? last?.round ?? 0,
			scores: rows.map((r) => r.score).filter((s) => typeof s === "number"),
			exit: last?.exit ?? null,
			running,
			ended: !running && (rows.length > 0 || !!st),
			passed,
			key: `loop:${name} r${rows.length}`,
		};
	});
}

export const retroOwed = (loops: Loop[], changes = read(CHANGES)) => loops.filter((l) => l.ended && !changes.includes(`## ${l.key}`));

export function board(loops: Loop[], changes = read(CHANGES)): string {
	const owed = new Set(retroOwed(loops, changes).map((l) => l.name));
	const k = read(KPI).trim().split("\n").pop() ?? "";
	return [
		"# Flow board (ceo-flow)",
		"Flow: factory/goal-<name>.md > tools/loop (research..verify, gated) > retro in factory/changes.md > tools/loop-publish > driver > KPI > next loop.",
		...(loops.length ? loops.map((l) => `- ${l.name}: ${l.running ? "running" : l.passed ? "PASSED" : l.ended ? "ENDED" : "new"} at ${l.stage} r${l.round}, exit ${l.exit}, scores [${l.scores.join(",")}]${owed.has(l.name) ? ", RETRO OWED" : ""}`) : ["- no loops"]),
		`KPI: ${k || "none yet"}`,
	].join("\n");
}

function retroMsg(owed: Loop[]): string {
	return [
		`Improve step, before anything else. Ended loop(s): ${owed.map((l) => `${l.name} (${l.passed ? "passed" : `exit ${l.exit} at ${l.stage}`})`).join(", ")}.`,
		"1. Read only ~/.pig/loops/<name>/ledger.jsonl and review.json (the tail of the last *.log only if a stage wrote nothing).",
		`2. Append to factory/changes.md a block starting with the exact line ${owed.map((l) => `\`## ${l.key}\``).join(" / ")}: numbers, cause, at most 3 changes each with the metric it must move, decision (publish / rerun / stop).`,
		"3. Act on it: passed = tools/loop-publish <name> <parent#>; else fix the cause (a change ticket's title must appear in that block) and rerun the loop.",
	].join("\n");
}

const TICKET_NEW = /tools\/ticket\s+new\b/;
const READY = /tools\/ticket\s+set\b[^\n]*-s\s+["']?Ready/;
const PUBLISH = /tools\/loop-publish\s+([\w.-]+)/;
const TITLE = /-t\s+(?:"([^"]+)"|'([^']+)')/;
const NEW_DOC_OK = /\/factory\/(goal-[^/]+|changes|STATE)\.md$/;

export default function (pi: ExtensionAPI) {
	let on = false;
	let lastBoard = "";
	const nudged = new Map<string, number>();
	pi.on("session_start", async (_e, ctx) => {
		on = resolve(ctx.cwd) === ROOT && process.env.PIRUST_ROLE !== "driver";
	});

	pi.on("before_agent_start", () => {
		if (!on) return;
		const b = board(scanLoops());
		if (b === lastBoard) return;
		lastBoard = b;
		return { message: { customType: "ceo-flow", content: b, display: false } };
	});

	pi.on("tool_call", async (e: any) => {
		if (!on) return;
		const i = e.input ?? {};
		if (e.toolName === "write") {
			const p = resolve(ROOT, String(i.path ?? ""));
			if (/\/factory\/[^/]+\.md$/.test(p) && !existsSync(p) && !NEW_DOC_OK.test(p))
				return { block: true, reason: "ceo-flow: no new factory doc. Edit an existing one, or write a goal as factory/goal-<name>.md and run it through tools/loop." };
			return;
		}
		if (e.toolName !== "bash") return;
		const cmd = String(i.command ?? "");
		const pub = cmd.match(PUBLISH);
		if (pub) {
			const l = scanLoops().find((x) => x.name === pub[1]);
			if (!l?.passed) return { block: true, reason: `ceo-flow: loop ${pub[1]} has not passed its verify gate.` };
			if (retroOwed([l]).length) return { block: true, reason: `ceo-flow: write the retro block \`## ${l.key}\` in factory/changes.md first.` };
		}
		if (READY.test(cmd)) return { block: true, reason: "ceo-flow: the CEO does not set Ready. tools/loop-publish (lint) or the driver does." };
		if (TICKET_NEW.test(cmd) && !/needs:patrick/.test(cmd)) {
			const m = cmd.match(TITLE);
			const t = m?.[1] ?? m?.[2] ?? "";
			if (!t || !read(CHANGES).includes(t))
				return { block: true, reason: "ceo-flow: no ticket without a decision. Either run the work as a loop (factory/goal-<name>.md > tools/loop > tools/loop-publish), or write the change with its metric in factory/changes.md and use that exact title (-t \"...\"). Escalations: label needs:patrick." };
		}
	});

	pi.on("agent_before_settle", async (e: any) => {
		if (!on) return;
		const owed = retroOwed(scanLoops()).filter((l) => (nudged.get(l.key) ?? 0) < MAX_NUDGES);
		if (!owed.length) return;
		for (const l of owed) nudged.set(l.key, (nudged.get(l.key) ?? 0) + 1);
		return { entries: [...e.entries, { type: "custom_message", customType: "ceo-flow", content: retroMsg(owed), display: false }], continue: true };
	});
}
