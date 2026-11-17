// Keepalive, ticket #86. Two stalls, both fixed in code so no LLM polls:
// (1) after an auto-compaction (reason threshold, willRetry false) pi goes idle with its task
//     unfinished -> wake it on `agent_settled` with one follow-up line;
// (2) nobody watches the leads: when the driver terminal has been idle 10 min and the board still
//     has Ready / In progress items, `hc send` it the one line telling it to continue.
// Loaded by the driver (`-e`) and by the Patrick chat session (`.pi/extensions` discovery); coder
// worktrees load this file too, so the driver watch (2) is gated by cwd and role.
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { execFile, spawn } from "node:child_process";
import { appendFileSync, realpathSync } from "node:fs";
import { homedir } from "node:os";

const REPO = `${homedir()}/private/pirust`;
const DRIVER = "pirust-driver";
const DRIVER_IDLE_MS = 10 * 60_000;
const DRIVER_CONTINUATION = "continue from factory/driver.md";
const log = (s: string) => {
	try {
		appendFileSync(`${homedir()}/.pi/keepalive.log`, `${new Date().toISOString()} ${s}\n`);
	} catch {
		/* log is best effort: a read-only HOME must not break the session */
	}
};

// Open tickets a stopped driver should take up. `tools/next-ready` covers Ready only; a driver that
// stopped mid-flight leaves its items In progress, so both statuses are counted in one query.
const BOARD_QUERY =
	'query{organization(login:"zerodawntest"){projectV2(number:2){items(first:100){nodes{content{...on Issue{state}} s:fieldValueByName(name:"Status"){...on ProjectV2ItemFieldSingleSelectValue{name}}}}}}}';
const BOARD_JQ =
	'[.data.organization.projectV2.items.nodes[]|select(.content.state=="OPEN" and (.s.name=="Ready" or .s.name=="In progress"))]|length';

function openTickets(): Promise<number> {
	return new Promise((res) =>
		execFile(`${REPO}/tools/gh-bot`, ["api", "graphql", "-f", `query=${BOARD_QUERY}`, "--jq", BOARD_JQ], (e, out) =>
			res(e ? -1 : Number(out.trim())),
		),
	);
}

export default function (pi: ExtensionAPI) {
	const isDriver = process.env.PIRUST_ROLE === "driver";
	let compacted = false; // the turn ended on a compaction, so nobody continues the task
	let watching = false;
	let isLead = false; // true for a lead (t1nm chat, driver), set in session_start before any settle
	let stopgate = 0; // stop-gate continues issued in the current user turn (max MAX_STOPGATE)

	// A real user prompt is a new user turn: reset the stop-gate budget. Runs started by a
	// custom_message (the gate's own continuation, item 2) carry messageType "custom" and do not reset.
	pi.on("before_agent_start", (e: any) => {
		if (e.messageType === "user") stopgate = 0;
	});

	// Stop gate: a lead cannot end a turn while `next-work` shows open items. Non-empty output is
	// fed back as one hidden user message and forces one more provider request (continue: true).
	pi.on("agent_before_settle", (event: any) => {
		if (!isLead) return;
		let out = "";
		try {
			out = execFileSync(NEXT_WORK, [], { encoding: "utf8" }).trim();
		} catch {
			/* next-work is best-effort: a missing tool must not block the settle */
		}
		if (!out || stopgate >= MAX_STOPGATE) return;
		stopgate++;
		try {
			appendFileSync(USAGE, `${new Date().toISOString()} stopgate=${stopgate}\n`);
		} catch {
			/* usage log is best effort: a read-only HOME must not break the session */
		}
		return {
			entries: [...(event.entries ?? []), { type: "custom_message", customType: "stop-gate", content: out, display: false }],
			continue: true,
		};
	});

	pi.on("session_compact", async (e: any) => {
		// `willRetry` true = overflow recovery, pi re-runs the turn itself, so it needs no wake.
		if (!e.willRetry) compacted = true;
	});

	pi.on("agent_settled", async () => {
		if (!compacted) return;
		compacted = false;
		await pi.sendUserMessage("Compacted. Re-read factory/STATE.md and continue your last task.", { deliverAs: "followUp" });
	});

	// The driver needs nothing here: an `agent_settled` with no pending work is a correct stop.
	pi.on("session_start", async (_e, ctx) => {
		let cwd = "";
		try {
			cwd = realpathSync(ctx.cwd);
		} catch {
			/* unresolvable cwd: not the chat session */
		}
		if (isDriver) return;
		if (cwd !== REPO || watching) return; // only the Patrick chat watches the leads
		isLead = true;
		watching = true;
		const k = spawn("hc", ["events", "--json"], { stdio: ["ignore", "pipe", "pipe"] });
		let buf = "";
		let idle: ReturnType<typeof setTimeout> | undefined;
		k.on("error", (e) => log(`driver watch: hc events spawn failed ${String(e).slice(0, 80)}`));
		k.stdout!.on("data", (d) => {
			buf += d;
			let i;
			while ((i = buf.indexOf("\n")) >= 0) {
				const line = buf.slice(0, i);
				buf = buf.slice(i + 1);
				try {
					const ev = JSON.parse(line)?.params;
					if (!ev) continue;
					const term = ev.terminal ?? ev.data?.address;
					if (term !== DRIVER) continue;
					const st = ev.data?.status?.state;
					if (st === "working") {
						clearTimeout(idle);
						idle = undefined;
					} else if (st === "idle" && !idle) {
						idle = setTimeout(() => {
							idle = undefined;
							void openTickets().then((n) => {
								if (n < 0) return log("driver watch: board query failed");
								// Idle with nothing on the board is right; idle with work is a stall.
								if (n === 0) return;
								execFile("hc", ["send", DRIVER, DRIVER_CONTINUATION], (e2) =>
									log(e2 ? `driver ${n} open ticket(s), send failed ${String(e2).slice(0, 80)}` : `driver woken: ${n} open ticket(s)`),
								);
							});
						}, DRIVER_IDLE_MS);
					}
				} catch {
					/* one malformed event line must not stop the watch */
				}
			}
		});
		k.stderr?.on("data", (d) => log(`driver watch: ${String(d).trim().slice(0, 200)}`));
		k.on("exit", (c) => log(`driver watch: hc events exit ${c}`));
	});
}
