// Liaison: the daemon between the agents and the orchestrator. Start it with:
//   hc run --bg --keep --name pirust-liaison --cwd ~/private/pirust node tools/liaison.mjs
// It owns what the old orchestrator session did with its own tokens: the GitHub webhook stream, the herdr
// agent stream, the session monitor (loop / stall / budget), and it calls tools/dispatch to launch and merge.
// Routine goes to ~/.pi/pirust-digest.log; only escalations (Patrick's comments/reviews/assignments, CI
// failures, blocked or killed agents, a review that asks for changes) reach the orchestrator, and the
// launch/merge is pure code: no tokens.
import { appendFileSync, existsSync, mkdirSync, readFileSync, readdirSync, unlinkSync, watch as fsWatch } from "node:fs";
import { spawn, execFile, execFileSync } from "node:child_process";
import { createServer } from "node:http";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { homedir } from "node:os";

const TOOLS = dirname(fileURLToPath(import.meta.url));
const REPO_DIR = `${homedir()}/private/pirust`;
const REPO = "zerodawntest/pirust";
const ORG = "zerodawntest";
const BOT = "pirust-bot[bot]";
const ADMIN = "Patrick-Kappen-SLTN"; // org admin; webhooks need admin rights
const DIGEST = `${homedir()}/.pi/pirust-digest.log`;
const ESCALATIONS = `${homedir()}/.pi/pirust-escalations.log`;
const log = (s) => { try { mkdirSync(`${homedir()}/.pi`, { recursive: true }); appendFileSync(`${homedir()}/.pi/pirust-liaison.log`, `${new Date().toISOString()} ${s}\n`); } catch {} };
const digest = (s) => appendFileSync(DIGEST, `${new Date().toISOString()} ${s}\n`);

const adminEnv = () => {
	try {
		return { ...process.env, GH_TOKEN: execFileSync("gh", ["auth", "token", "-u", ADMIN], { encoding: "utf8" }).trim() };
	} catch {
		return process.env;
	}
};
const REPO_EVENTS = "issues,issue_comment,pull_request,pull_request_review,pull_request_review_comment,check_suite,workflow_run";
const DEBOUNCE_MS = 10_000;

const kids = [];
const queue = [];
let timer;
const flush = () => {
	if (!queue.length) return;
	const lines = queue.splice(0);
	const text = `[gh] ${lines.length} event(s)\n${lines.join("\n")}`;
	// The orchestrator is woken in its own terminal; the file is the durable copy (survives a crash).
	appendFileSync(ESCALATIONS, `${new Date().toISOString()} ${text}\n`);
	for (const t of terminalNamesWith("role", "orchestrator")) {
		execFile("herdr", ["send", "--on", t, "--", text.replace(/\s+/g, " ")], (e) => {
			if (e) log(`send to ${t} failed: ${String(e).slice(0, 80)}`);
		});
	}
};
const terminalNamesWith = (label, value) => {
	try {
		return JSON.parse(readFileSync(`${homedir()}/.local/state/herdr-core/default/terminals.json`, "utf8")).terminals
			.filter((t) => t.labels?.[label] === value)
			.map((t) => t.name);
	} catch {
		return [];
	}
};

const gql = (id) =>
	new Promise((res) =>
		execFile("gh", ["api", "graphql", "-f", `query=query{node(id:"${id}"){...on Issue{number}...on PullRequest{number}}}`, "--jq", ".data.node.number"], (e, out) => res(e ? "?" : out.trim())),
	);

async function summarize(type, p) {
	const who = p.sender?.login;
	const t = (s) => (s ?? "").replace(/\s+/g, " ").slice(0, 100);
	switch (type) {
		case "issues":
			return `issue #${p.issue.number} ${p.action}${p.label ? ` ${p.label.name}` : ""}${p.assignee ? ` ${p.assignee.login}` : ""} by ${who}: ${t(p.issue.title)}`;
		case "issue_comment":
			return p.action === "created" ? `comment #${p.issue.number} by ${who}: ${t(p.comment.body)}` : undefined;
		case "pull_request":
			return `PR #${p.number} ${p.action}${p.pull_request.merged ? " (merged)" : ""} by ${who}: ${t(p.pull_request.title)}`;
		case "pull_request_review":
			return p.action === "submitted" ? `review PR #${p.pull_request.number} ${p.review.state} by ${who}: ${t(p.review.body)}` : undefined;
		case "pull_request_review_comment":
			return p.action === "created" ? `review comment PR #${p.pull_request.number} by ${who}: ${t(p.comment.body)}` : undefined;
		case "check_suite":
			return p.action === "completed" && p.check_suite.conclusion !== "success" ? `checks ${p.check_suite.conclusion} on ${p.check_suite.head_branch}` : undefined;
		case "workflow_run":
			return p.action === "completed" ? `workflow ${p.workflow_run.name} ${p.workflow_run.conclusion} on ${p.workflow_run.head_branch}` : undefined;
		case "projects_v2_item": {
			const f = p.changes?.field_value;
			if (p.action !== "edited" || !f) return undefined;
			const to = f.to?.name ?? f.to ?? "";
			return `board #${await gql(p.projects_v2_item.content_node_id)} ${f.field_name} -> ${typeof to === "string" ? to : JSON.stringify(to)} by ${who}`;
		}
	}
	return undefined;
}

const escalate = (msg) => {
	queue.push(msg);
	clearTimeout(timer);
	timer = setTimeout(flush, 1000);
};
const dispatch = (args, cb) =>
	execFile(`${TOOLS}/dispatch`, args, { env: { ...process.env, PIRUST_PARENT: process.env.HC_TERMINAL_ID ?? "" } }, (e, out, err) => {
		if (e) {
			queue.push(`dispatch ${args.join(" ")} failed: ${String(err || e).slice(-160)}`);
			clearTimeout(timer);
			timer = setTimeout(flush, 1000);
		}
		cb?.(!e, out);
	});

// Agents (templates run in tools/sandbox). On a coder finish: tools/wt finish creates the PR; the
// pull_request webhook then starts the review. On a reviewer finish: read REVIEW.md, merge or relaunch.
const handled = new Set();
const agents = new Map(); // terminal -> { ticket, role }
const busy = new Set();
const watch = new Map();
const mon = new Map(); // ticket -> { off, tok, cr, calls }
const SESS = `${homedir()}/.pig/sandbox/agent/sessions`;
const kill = (term, why) => {
	const a = agents.get(term);
	if (!a || handled.has(term)) return;
	queue.push(`agent #${a.ticket} killed: ${why}`);
	finishAgent(term, `killed (${why})`);
};
const onSession = (rel) => {
	const [dir, file] = rel.split("/");
	if (!file?.endsWith(".jsonl")) return;
	// The session dir is the worktree dir (named after the ticket); the file name carries it as a fallback.
	const ticket = /^\d+$/.test(dir) ? dir : (file.match(/-(\d+)--/)?.[1] ?? "");
	if (!ticket) return;
	const m = mon.get(ticket) ?? { off: 0, tok: 0, cr: 0, calls: [] };
	mon.set(ticket, m);
	let txt = "";
	try {
		const b = readFileSync(`${SESS}/${rel}`);
		txt = b.subarray(m.off).toString();
		m.off = b.length;
	} catch {
		return;
	}
	for (const line of txt.split("\n")) {
		try {
			const e = JSON.parse(line);
			if (e.type !== "message" || e.message?.role !== "assistant") continue;
			const u = e.message.usage ?? {};
			m.tok += (u.input ?? 0) + (u.output ?? 0);
			m.cr += u.cacheRead ?? 0;
			for (const c of e.message.content ?? []) if (c.type === "toolCall") m.calls.push(c.name + JSON.stringify(c.arguments));
		} catch {}
	}
	m.calls = m.calls.slice(-4);
	const term = [...agents].find(([, v]) => v.ticket === ticket)?.[0];
	clearTimeout(m.stall);
	if (m.calls.length === 4 && m.calls.every((c) => c === m.calls[0])) return kill(term, "loop: same tool call 4x");
	if (m.tok > 400_000 || m.cr > 3_000_000) return kill(term, `budget: ${m.tok} in+out, ${m.cr} cache`);
	m.stall = setTimeout(() => kill(term, "stalled 5 min"), 5 * 60_000);
};
const watchSessions = () => {
	try {
		const w = fsWatch(SESS, { recursive: true }, (_t, f) => f && onSession(String(f)));
		kids.push({ kill: () => w.close() });
		for (const d of readdirSync(SESS)) for (const f of readdirSync(`${SESS}/${d}`)) if (f.endsWith(".jsonl")) onSession(`${d}/${f}`);
	} catch (e) {
		log(`session watch failed ${e}`);
	}
};
const finishAgent = (term, why) => {
	const a = agents.get(term);
	if (!a?.ticket || handled.has(term)) return;
	const { ticket: n, role } = a;
	handled.add(term);
	const w = `${homedir()}/private/pirust-wt/${n}`;
	const retire = () => {
		clearTimeout(watch.get(term));
		execFile("herdr", ["kill", term], () => execFile("herdr", ["rm", term], () => dispatch(["launch"])));
	};
	if (role === "reviewer") {
		let rv = "";
		try {
			rv = readFileSync(`${w}/REVIEW.md`, "utf8");
			unlinkSync(`${w}/REVIEW.md`); // consumed: keep the worktree clean for the rebase
		} catch {}
		const first = rv.split("\n")[0] ?? "";
		if (!rv) escalate(`reviewer #${n} left no REVIEW.md`);
		else if (/^CHANGES\b/i.test(first)) dispatch(["relaunch", n], () => retire());
		else if (/^APPROVE\b/i.test(first)) dispatch(["merge", n], (ok) => { digest(`dispatch: ${ok ? `merged #${n}` : `merge of #${n} failed`}`); retire(); });
		else escalate(`reviewer #${n} wrote an unreadable REVIEW.md: ${first.slice(0, 80)}`);
		return;
	}
	execFile(`${TOOLS}/wt`, ["finish", n], { env: process.env }, (e, out, err) => {
		const msg = `agent #${n} ${why}: ${e ? `wt finish failed: ${String(err).trim().slice(-200)}` : out.trim()}`;
		retire();
		if (!e && why === "done") return digest(msg);
		escalate(msg);
	});
};
const watchAgents = () => {
	const k = spawn("hc", ["events", "--json", "--label", "project=pirust"], { stdio: ["ignore", "pipe", "pipe"] });
	k.on("error", (e) => log(`hc events spawn failed ${String(e).slice(0, 80)}`));
	kids.push(k);
	let buf = "";
	k.stdout.on("data", (d) => {
		buf += d;
		let i;
		while ((i = buf.indexOf("\n")) >= 0) {
			const line = buf.slice(0, i);
			buf = buf.slice(i + 1);
			try {
				const ev = JSON.parse(line)?.params;
				if (!ev) continue;
				const term = ev.terminal ?? ev.data?.address;
				const t = ev.data?.labels?.ticket;
				if (term && t) agents.set(term, { ticket: t, role: ev.data.labels.role ?? "coder" });
				if (ev.type !== "labels" && ev.type !== "foreground") log(`hc ${ev.type} ${term} ${JSON.stringify(ev.data).slice(0, 200)}`);
				const st = ev.data?.status?.state;
				if (term && agents.has(term) && !watch.has(term)) watch.set(term, setTimeout(() => kill(term, "hard cap 30 min"), 30 * 60_000));
				if (st === "working") busy.add(term);
				if (ev.type === "finished") finishAgent(term, `exited ${ev.data?.exit_code ?? ""}`);
				else if (st === "done" || (st === "idle" && busy.has(term))) finishAgent(term, "done");
				else if (["blocked", "error"].includes(st)) finishAgent(term, st);
			} catch {}
		}
	});
	k.on("exit", (c) => log(`hc events exit ${c}`));
};

// GitHub -> this process. No polling: gh webhook forward (websocket) -> local HTTP -> dispatch.
function startWebhooks() {
	const env = adminEnv();
	const run = (args) => {
		const url = `http://127.0.0.1:${server.address().port}/`;
		const k = spawn("gh", ["webhook", "forward", ...args, `--url=${url}`], { stdio: ["ignore", "ignore", "pipe"], env });
		k.on("error", (e) => log(`gh webhook spawn failed ${String(e).slice(0, 80)}`));
		k.on("exit", (c) => log(`gh exit ${c} ${args[0]}`));
		k.stderr?.on("data", (d) => log(`stderr ${String(d).trim()}`));
		kids.push(k);
	};
	const server = createServer((req, res) => {
		let body = "";
		req.on("data", (c) => (body += c));
		req.on("end", async () => {
			res.end("ok");
			try {
				const id = String(req.headers["x-github-delivery"] ?? "");
				if (id && seen.has(id)) return;
				if (id) seen.add(id);
				const p = JSON.parse(body);
				if (p.sender?.login === BOT) return; // own actions
				const type = String(req.headers["x-github-event"] ?? "");
				const line = await summarize(type, p);
				if (!line) return;
				const bad = type === "check_suite" || type === "workflow_run";
				if (!bad && !escalates(type, p)) {
					digest(line);
					return;
				}
				if (!queue.includes(line)) {
					queue.push(line);
					clearTimeout(timer);
					timer = setTimeout(flush, DEBOUNCE_MS);
				}
				handleEvents(type, p);
			} catch {}
		});
	});
	server.listen(0, "127.0.0.1", () => {
		// a stale `cli` hook from a previous forwarder blocks a new one (422)
		const clear = (path, then) =>
			execFile("gh", ["api", path, "--jq", '.[]|select(.name=="cli")|.id'], { env }, (_e, out) => {
				const ids = String(out).trim().split("\n").filter(Boolean);
				let left = ids.length;
				if (!left) return then();
				for (const id of ids) execFile("gh", ["api", "-X", "DELETE", `${path}/${id}`], { env }, () => --left || then());
			});
		clear(`repos/${REPO}/hooks`, () => run([`--repo=${REPO}`, `--events=${REPO_EVENTS}`]));
		clear(`orgs/${ORG}/hooks`, () => run([`--org=${ORG}`, "--events=projects_v2_item"]));
	});
	return server;
}

const seen = new Set();
const escalates = (type, p) =>
	p.sender?.type === "User" &&
	(["issue_comment", "pull_request_review", "pull_request_review_comment"].includes(type) ||
		(type === "issues" && ["opened", "reopened"].includes(p.action)) ||
		(type === "issues" && p.action === "assigned" && p.assignee?.login === BOT));

// Code handles these; the orchestrator is not in the loop.
const handleEvents = (type, p) => {
	const isInt = (b) => /^t\/\d+$/.test(String(b ?? ""));
	if (type === "pull_request" && p.action === "opened" && isInt(p.pull_request?.head_branch)) dispatch(["review", String(p.number)]);
	if (type === "pull_request_review" && p.action === "submitted" && isInt(p.pull_request?.head_branch)) {
		const n = String(p.pull_request.head_branch).slice(2);
		if (p.review?.state === "approved") digest(`dispatch: review approved #${n} (merge scheduled)`);
		else if (p.review?.state === "changes_requested") digest(`dispatch: review requested changes on #${n} (relaunch scheduled)`);
	}
	// Patrick approved a needs:patrick ticket by closing it: the planner creates the follow-up tickets.
	if (type === "issues" && p.action === "closed" && (p.issue?.labels ?? []).some((l) => l.name === "needs:patrick")) dispatch(["plan", String(p.issue.number)]);
	// A ticket moved to Ready: fill the free slots.
	if (type === "projects_v2_item" && p.action === "edited" && p.changes?.field_value) {
		const to = p.changes.field_value.to?.name ?? p.changes.field_value.to ?? "";
		if (to === "Ready") dispatch(["launch"]);
	}
};

if (process.argv[2] === "--check") {
	const d = `${homedir()}/.pig/sandbox/agent/sessions`;
	log(`check: sessions=${d} exists=${String(existsSync(d))}`);
}

startWebhooks();
watchAgents();
watchSessions();
dispatch(["launch"]); // on start: take the Ready tickets
digest("liaison: started (webhooks, agent watch, session monitor, dispatch)");
