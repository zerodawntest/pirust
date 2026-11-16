#!/usr/bin/env node
// Factory daemon (#52): the one process the factory runs on. No chat session is involved.
// Start: hc run --bg --keep --name pirust-factory -- <this file>
// Owns: the gh webhook stream (reconnect + API catch-up), the hc event stream (reconciled at
// startup), the agent session monitor (loop, 5 min stall, budget), the dispatcher, the token
// log, and the CEO wakes (see ceo-wake.mjs). This file replaces the .pi/extensions/gh-events.ts
// liaison: one implementation, so the agent guard and the monitor cannot drift apart.
//
// Everything a test needs is exported and takes its commands and paths as arguments, so
// `node --test test/factory*.test.*` runs with fixtures, no child process and no network.
import { appendFileSync, mkdirSync, readFileSync, readdirSync, writeFileSync, watch as fsWatch } from "node:fs";
import { spawn, spawnSync } from "node:child_process";
import { createServer } from "node:http";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { addSessionLines, budget, isBusy, newTotals } from "./agent-budget.mjs";
import { createCeoSession, IS_MAIN, STALL_MS } from "./ceo-wake.mjs";

const TOOLS = dirname(process.realpathSync(import.meta.filename));
const REPO = dirname(TOOLS);
const HOME = homedir();
const GH = join(TOOLS, "gh-bot");
const TICKET = join(TOOLS, "ticket");
const AGENT = join(TOOLS, "agent");
const WAKE = join(TOOLS, "ceo-wake.mjs");
const REPO_NAME = "zerodawntest/pirust";
const ORG = "zerodawntest";
const BOT_USER = "pi";
const BOT = `${BOT_USER}[bot]`;
const ADMIN = "Patrick-Kappen-SLTN";
const DIGEST = join(HOME, ".pi/pirust-digest.log");
const USAGE = join(HOME, ".pi/pirust-usage.log");
const SPIN = join(HOME, ".pi/pirust-factory.json");
const SESS = join(HOME, ".pig/sandbox/agent/sessions");
const REPO_EVENTS = "issues,issue_comment,pull_request,pull_request_review,pull_request_review_comment,check_suite,workflow_run";
const DEBOUNCE_MS = 10_000;
const BATCH_MAX = 30;
const OUT_CAP = 4000;
const MAX_INFLIGHT = 3;
const isPatrick = (l) => l === "Patrick-Kappen" || l === "Patrick-Kappen-SLTN";

const ts = () => new Date().toISOString();
const append = (f, s) => {
	try {
		appendFileSync(f, s);
	} catch (e) {
		console.error(`append ${f}: ${e?.message ?? e}`);
	}
};
const log = (s) => append(DIGEST, `${ts()} ${s}\n`);
const cut = (s, n = 100) => (s ?? "").replace(/\s+/g, " ").trim().slice(0, n);
const run = (file, args = [], opts = {}) => {
	const r = spawnSync(file, args, { encoding: "utf8", maxBuffer: 8 << 20, ...opts });
	if (r.error) return { code: 1, out: "", err: cut(r.error.message, OUT_CAP) };
	return { code: r.status ?? 1, out: cut(r.stdout, OUT_CAP), err: cut(r.stderr, OUT_CAP) };
};
const ghApi = (path, args = []) => run(GH, ["api", path, ...args]);
const getJson = (path) => {
	const r = ghApi(path);
	if (r.code) {
		log(`GET ${path.split("?")[0]} failed: ${cut(r.err, 200)}`);
		return [];
	}
	try {
		return JSON.parse(r.out);
	} catch {
		return [];
	}
};

// ---- state that must survive a restart: /tmp is wiped, ~/.pi is not ----
let saved = {};
try {
	saved = JSON.parse(readFileSync(SPIN, "utf8"));
} catch {
	saved = {};
}
const seen = new Set(Array.isArray(saved.seen) ? saved.seen.slice(-5000) : []);
const queue = new Set(Array.isArray(saved.queue) ? saved.queue.slice(-BATCH_MAX) : []);
const launched = new Set(Array.isArray(saved.launched) ? saved.launched : []);
const reviewed = new Set(Array.isArray(saved.reviewed) ? saved.reviewed : []);
let lastSeen = typeof saved.lastSeen === "string" ? saved.lastSeen : new Date(Date.now() - 30 * 60_000).toISOString();
function persist() {
	try {
		writeFileSync(SPIN, JSON.stringify({ lastSeen, queue: [...queue], seen: [...seen].slice(-5000), launched: [...launched], reviewed: [...reviewed] }));
	} catch (e) {
		console.error(`save: ${e?.message ?? e}`);
	}
}

// ---- events: one line each, ≤160 chars, no tool or stderr dumps ----
export function summarize(type, p) {
	const who = p.sender?.login;
	const t = (s) => cut(s, 100);
	const n = (v) => v?.number ?? String(v?.url ?? "").match(/\/(?:issues|pull)\/(\d+)/)?.[1] ?? "?";
	switch (type) {
		case "issues":
			return `issue #${n(p.issue)} ${p.action}${p.label ? ` ${p.label.name}` : ""}${p.assignee ? ` ${p.assignee.login}` : ""} by ${who}: ${t(p.issue.title)}`;
		case "issue_comment":
			return p.action === "created" ? `comment #${n(p.issue)} by ${who}: ${t(p.comment.body)}` : undefined;
		case "pull_request":
			return `PR #${n(p.pull_request)} ${p.action}${p.pull_request.merged ? " (merged)" : ""} by ${who}: ${t(p.pull_request.title)}`;
		case "pull_request_review":
			return p.action === "submitted" ? `review PR #${n(p.pull_request)} ${p.review.state} by ${who}: ${t(p.review.body)}` : undefined;
		case "pull_request_review_comment":
			return p.action === "created" ? `review comment PR #${n(p.pull_request)} by ${who}: ${t(p.comment.body)}` : undefined;
		case "check_suite":
			return p.action === "completed" && p.check_suite.conclusion !== "success" ? `checks ${p.check_suite.conclusion} on ${p.check_suite.head_branch}` : undefined;
		case "workflow_run":
			return p.action === "completed" ? `workflow ${p.workflow_run.name} ${p.workflow_run.conclusion} on ${p.workflow_run.head_branch}` : undefined;
		case "projects_v2_item": {
			const f = p.changes?.field_value;
			if (p.action !== "edited" || !f) return undefined;
			const to = f.to?.name ?? f.to ?? "";
			return `board #${p.projects_v2_item?.content_node_id ?? "?"} ${f.field_name} -> ${typeof to === "string" ? to : JSON.stringify(to)} by ${who}`;
		}
	}
}

// A board event names its card by a GraphQL node id, not by a ticket number. `lookup` is
// injected so the tests stay offline; it returns the ticket number, or "?" if unknown.
export function resolveBoardRef(line, lookup) {
	const m = line.match(/^board #(\S+) (.*)$/);
	if (!m) return line;
	return `#${lookup(m[1])} ${m[2]}`;
}

function ticketOfNode(nodeId) {
	const r = ghApi("graphql", ["-f", `query=query{node(id:"${nodeId}"){...on Issue{number}...on PullRequest{number}}}`, "--jq", ".data.node.number"]);
	return r.code ? "?" : r.out.trim() || "?";
}

// Who must be answered now; everything else goes to the digest.
export function escalates(type, p) {
	if (p.sender?.type !== "User") return false;
	if (isPatrick(p.sender?.login)) return true;
	if (type === "issues" && ["opened", "reopened"].includes(p.action)) return true;
	return type === "issues" && p.action === "assigned" && p.assignee?.login === BOT_USER;
}

/** The `## Relaunch` block a CEO writes on a ticket to get a coder started; pure, so it is testable. */
export function relaunchTarget(body) {
	const m = String(body ?? "").match(/^## Relaunch\s*\n[\s\S]*?\bticket:\s*(\d+)/);
	if (!m) return undefined;
	return { ticket: m[1], notes: cut(String(body).match(/notes:\s*(.+)/)?.[1], 80) };
}

/** `Closes #12` in a PR body: the ticket whose reviewer to launch. Pure, so it is testable. */
export function closesTicket(body) {
	return String(body ?? "").match(/Closes #(\d+)/)?.[1];
}

/**
 * Dispatch (Ready → coder, PR → reviewer, approve → ff-merge) and the session-file monitor
 * (loop, 5 min stall, budget). The budget math is tools/agent-budget.mjs, the same module the
 * agents load, so one implementation. `runCmd` and `log`/`enqueue` are injectable.
 */
export function createAgentMonitor(options = {}) {
	const o = {
		runCmd: run,
		log,
		enqueue,
		sessionsDir: SESS,
		agentScript: AGENT,
		wtScript: join(TOOLS, "wt"),
		nextReadyScript: join(TOOLS, "next-ready"),
		maxInflight: MAX_INFLIGHT,
		relaunchEnv: { ...process.env, PIRUST_PARENT: process.env.HC_TERMINAL_ID ?? "" },
		tickets: new Map(),
		busy: new Set(),
		mon: new Map(),
		hardCap: new Map(),
		handled: new Set(),
		launched: new Set(),
		inflight: new Set(),
		...options,
	};
	const { tickets, busy, mon, hardCap, handled, launched, inflight } = o;
	const termOf = (n) => [...tickets].find(([, v]) => v === n)?.[0];
	const sessionTicket = (f) => f.match(/pirust-wt-(\d+)--/)?.[1];

	function onSession(file) {
		const n = sessionTicket(file);
		if (!n) return;
		const m = mon.get(file) ?? newTotals();
		mon.set(file, m);
		let txt = "";
		try {
			const b = readFileSync(join(o.sessionsDir, file));
			txt = b.subarray(m.off).toString();
			m.off = b.length;
		} catch {
			return;
		}
		addSessionLines(m, txt);
		const term = termOf(n);
		const d = budget(m);
		if (d.action === "kill") return kill(term, d.reason);
		if (d.action === "steer" && term) {
			o.runCmd("hc", ["send", term, d.reason]);
			o.log(`${n} steered: ${d.reason}`);
		}
		clearTimeout(m.stall);
		// An agent whose last message is text with no tool call is finished: sitting idle is then normal.
		if (isBusy(m)) m.stall = setTimeout(() => kill(termOf(n), "stalled 5 min"), STALL_MS);
	}

	function launch(n, role = "coder") {
		const r = o.runCmd(o.agentScript, [String(n), role], { env: { ...o.relaunchEnv } });
		if (r.code) return (o.enqueue([`launch #${n} ${role} failed: ${cut(r.err || r.out, 200)}`]), r);
		launched.add(String(n));
		inflight.add(String(n));
		o.log(`launch: ${role} on #${n}`);
		return r;
	}

	function relaunch(n, notes) {
		const l = launch(n, "coder");
		if (l.code) return l;
		o.log(`relaunch: coder on #${n}${notes ? ` (${cut(notes, 80)})` : ""}`);
		return l;
	}

	function launchNext() {
		if (inflight.size >= o.maxInflight) return;
		const r = o.runCmd(o.nextReadyScript);
		const n = r.out.trim().split("\n")[0];
		if (r.code || !n) {
			o.log(`dispatch: no Ready ticket${r.code ? ` (error ${cut(r.err, 120)})` : ""}`);
			return;
		}
		const l = launch(n, "coder");
		if (l.code) o.enqueue([`dispatch: launching #${n} failed: ${cut(l.err || l.out, 200)}`]);
	}

	function mergeApproved(pr) {
		const n = String(pr.number);
		const m = o.runCmd("git", ["-C", REPO, "merge", "--ff-only", `origin/${pr.head.ref}`]);
		if (m.code) return o.enqueue([`merge #${n}: not a fast-forward (${cut(m.err || m.out, 120)}) → rebase needed on #${n}`]);
		const push = o.runCmd("git", ["-C", REPO, "push", "origin", `origin/${pr.head.ref}:integration`]);
		if (push.code) return o.enqueue([`merge #${n}: push failed: ${cut(push.err || push.out, 200)}`]);
		const c = o.runCmd(GH, ["pr", "comment", n, "-b", "Merged by the factory daemon (ff to integration)."]);
		if (c.code) o.log(`merge #${n}: PR comment failed: ${cut(c.err, 120)}`);
		const t = o.runCmd(TICKET, ["set", n, "-s", "Integration"]);
		if (t.code) o.log(`merge #${n}: ticket set failed: ${cut(t.err, 120)}`);
		launched.delete(n);
		inflight.delete(n);
		launchNext();
	}

	function finish(term, why) {
		const n = tickets.get(term);
		if (!n || handled.has(term)) return;
		handled.add(term);
		const r = o.runCmd(o.wtScript, ["finish", n]);
		const msg = `agent #${n} ${why}: ${r.code ? `wt finish failed: ${cut(r.err, 200)}` : r.out}`;
		o.runCmd("hc", ["kill", term]);
		o.runCmd("hc", ["rm", term]);
		for (const [f, u] of [...mon]) {
			if (sessionTicket(f) !== n) continue;
			o.log(`ticket ${n} usage req=${u.requests} io=${u.input + u.output} cache_read=${u.cacheRead} cache_write=${u.cacheWrite} cost=${u.cost.toFixed(4)} ctx=${u.input + u.output + u.cacheRead}`);
			clearTimeout(u.stall);
			mon.delete(f);
		}
		inflight.delete(n);
		launchNext();
		if (r.code === 0 && why === "done") o.log(msg);
		else o.enqueue([msg]);
	}

	function kill(term, why) {
		if (!term || handled.has(term)) return;
		o.enqueue([`agent #${tickets.get(term)} killed: ${why}`]);
		finish(term, `killed (${why})`);
	}

	function watchSessions() {
		mkdirSync(o.sessionsDir, { recursive: true });
		try {
			fsWatch(o.sessionsDir, { recursive: true }, (_t, f) => f && String(f).endsWith(".jsonl") && onSession(String(f)));
			for (const d of readdirSync(o.sessionsDir)) for (const f of readdirSync(join(o.sessionsDir, d))) if (f.endsWith(".jsonl")) onSession(`${d}/${f}`);
		} catch (e) {
			o.log(`session watch failed ${e}`);
		}
	}

	function watchAgentEvents() {
		const k = spawn("hc", ["events", "--json", "--label", "project=pirust"], { stdio: ["ignore", "pipe", "pipe"] });
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
					if (term && t) tickets.set(term, t);
					if (ev.type !== "labels" && ev.type !== "foreground") o.log(`hc ${ev.type} ${term} ${JSON.stringify(ev.data).slice(0, 200)}`);
					const st = ev.data?.status?.state;
					if (term && tickets.has(term) && !hardCap.has(term)) hardCap.set(term, setTimeout(() => kill(term, "hard cap 30 min"), 30 * 60_000));
					if (st === "working") busy.add(term);
					if (ev.type === "finished") finish(term, `exited ${ev.data?.exit_code ?? ""}`);
					else if (st === "done" || (st === "idle" && busy.has(term))) finish(term, "done");
					else if (["blocked", "error"].includes(st)) finish(term, st);
				} catch {}
			}
		});
		k.on("exit", (c) => {
			o.log(`hc events exit ${c}; restart in 30s`);
			setTimeout(() => {
				catchUp(lastSeen);
				watchAgentEvents();
				lastSeen = new Date().toISOString();
				persist();
			}, 30_000);
		});
	}

	// Agents that finished while no process was listening: adopt the running ones, finish the rest.
	function reconcile() {
		const r = o.runCmd("hc", ["ls", "--json"]);
		if (r.code) {
			o.log(`reconcile: hc ls failed: ${cut(r.err, 200)}`);
			return [];
		}
		let list = [];
		try {
			list = JSON.parse(r.out)?.terminals ?? [];
		} catch {
			o.log("reconcile: bad hc ls json");
			return [];
		}
		for (const t of list) {
			const l = t.labels ?? {};
			if (l.project !== "pirust" || !l.ticket) continue;
			const n = String(l.ticket);
			tickets.set(t.address, n);
			if (t.status?.state === "working") {
				busy.add(t.address);
				inflight.add(n);
				launched.add(n);
			}
			if (t.status?.state === "exited") {
				if (t.status.exit_code === 0) finish(t.address, "exited 0 (reconciled)");
				else o.enqueue([`agent #${n} exited ${t.status.exit_code} (reconciled)`]);
			}
		}
		return list;
	}

	return { options: o, tickets, busy, mon, hardCap, handled, launched, inflight, onSession, launch, relaunch, launchNext, mergeApproved, finish, kill, watchSessions, watchAgentEvents, reconcile, termOf };
}

// ---- agents: one monitor for the whole factory; session files are the heartbeat ----
const agents = createAgentMonitor({ launched, });

// ---- CEO: one SDK session kept warm; a wake is one request (see ceo-wake.mjs) ----
let ceo;
let wakeChain = Promise.resolve();
function enqueue(lines, immediate = false) {
	for (const l of lines) queue.add(l);
	if (queue.size > BATCH_MAX) queue.delete(queue.values().next().value);
	clearTimeout(flushTimer);
	if (immediate) flush();
	else flushTimer = setTimeout(flush, DEBOUNCE_MS);
	persist();
}

function flush() {
	clearTimeout(flushTimer);
	const lines = [...queue];
	queue.clear();
	persist();
	if (!lines.length) return;
	wakeChain = wakeChain.then(() => wakeCeo(lines)).catch((e) => {
		const msg = `CEO wake failed (no answer; handle by hand): ${cut(e?.stack ?? e, 400)}`;
		log(msg);
		console.error(msg);
	});
}

async function wakeCeo(lines) {
	ceo ??= await createCeoSession();
	const r = await ceo.wake(lines.join("\n"));
	if (r.text) log(`CEO: ${cut(r.text, 400)}`);
	return r;
}

// ---- GitHub: push first, API catch-up for the gaps ----
function catchUp(since) {
	const s = since.replace(/\.\d{3}Z$/, "Z");
	const lines = [];
	const fresh = (k) => !seen.has(k) && (seen.add(k), true);
	for (const c of getJson(`repos/${REPO_NAME}/issues/comments?since=${s}&per_page=100`)) {
		if (c.user?.login === BOT || !fresh(`c:${c.id}`)) continue;
		const line = `comment #${c.issue_number} by ${c.user?.login}: ${cut(c.body, 100)}`;
		if (isPatrick(c.user?.login)) lines.push(line);
		else log(line);
	}
	for (const c of getJson(`repos/${REPO_NAME}/pulls/comments?since=${s}&per_page=100`)) {
		if (c.user?.login === BOT || !fresh(`rc:${c.id}`)) continue;
		const pr = String(c.pull_request_url ?? "").match(/\/pull\/(\d+)/)?.[1] ?? "?";
		const line = `review comment PR #${pr} by ${c.user?.login}: ${cut(c.body, 100)}`;
		if (isPatrick(c.user?.login)) lines.push(line);
		else log(line);
	}
	for (const i of getJson(`repos/${REPO_NAME}/issues?state=open&since=${s}&per_page=100`)) {
		if (!fresh(`i:${i.id}`)) continue;
		const n = String(i.number);
		const rl = relaunchTarget(i.body);
		if (rl) agents.relaunch(rl.ticket, rl.notes);
		const assigned = (i.assignees ?? []).some((a) => a.login === BOT_USER);
		if (assigned && !launched.has(n) && !agents.inflight.has(n)) {
			launched.add(n);
			agents.inflight.add(n);
			const r = agents.launch(n, "coder");
			lines.push(r.code ? `issue #${n} assigned ${BOT_USER}; launch failed: ${cut(r.err || r.out, 120)}` : `issue #${n} assigned ${BOT_USER}; launched coder`);
			persist();
		}
	}
	for (const pr of getJson(`repos/${REPO_NAME}/pulls?state=open&sort=updated&direction=desc&per_page=50`)) {
		if (String(pr.updated_at) < s || !fresh(`pr:${pr.id}`)) continue;
		const t = closesTicket(pr.body);
		if (t && !reviewed.has(t)) {
			reviewed.add(t);
			const r = agents.launch(t, "reviewer");
			lines.push(r.code ? `PR #${pr.number}: launch reviewer for #${t} failed: ${cut(r.err || r.out, 120)}` : `PR #${pr.number} ready for review on #${t}`);
			persist();
		}
	}
	if (lines.length) {
		for (const l of lines) queue.add(l);
		clearTimeout(flushTimer);
		flush();
	}
	return lines;
}

function startWebhooks() {
	const url = "http://127.0.0.1:3127/";
	const fwLog = join(HOME, ".pi/pirust-fw.log");
	const server = createServer((req, res) => {
		let body = "";
		req.on("data", (c) => (body += c));
		req.on("end", () => {
			res.writeHead(200, { "content-type": "text/plain" });
			res.end("ok");
			try {
				const id = String(req.headers["x-github-delivery"] ?? "");
				if (id && seen.has(id)) return;
				if (id) seen.add(id);
				const p = JSON.parse(body);
				if (p.sender?.login === BOT) return;
				const type = String(req.headers["x-github-event"] ?? "");
				let line = summarize(type, p);
				if (!line) return;
				line = resolveBoardRef(line, ticketOfNode);
				const rl = relaunchTarget(p.issue?.body);
				if (type === "issues" && p.action === "opened" && rl) agents.relaunch(rl.ticket, rl.notes);
				const t = closesTicket(p.pull_request?.body);
				if (type === "pull_request" && p.action === "opened" && t && !reviewed.has(t)) {
					reviewed.add(t);
					const r = agents.launch(t, "reviewer");
					log(r.code ? `PR #${p.pull_request.number}: launch reviewer for #${t} failed: ${cut(r.err || r.out, 120)}` : `PR #${p.pull_request.number}: launched reviewer for #${t}`);
					persist();
				}
				if (type === "pull_request_review" && p.review?.state === "approved" && p.pull_request?.base?.ref === "integration") agents.mergeApproved(p.pull_request);
				const bad = type === "check_suite" || type === "workflow_run";
				if (!bad && !escalates(type, p)) return log(line);
				if (queue.has(line)) return;
				// Patrick is answered now; a failed agent or a CI red goes out in the next batch.
				enqueue([line], isPatrick(p.sender?.login));
			} catch (e) {
				log(`webhook handle failed: ${cut(e?.stack ?? e, 400)}`);
			}
		});
	});
	server.listen(3127, "127.0.0.1", () => {
		const env = { ...process.env, GH_TOKEN: run(GH, ["auth", "token", "-u", ADMIN]).out.trim() };
		const start = (args) => {
			const kid = spawn("gh", ["webhook", "forward", ...args, `--url=${url}`], { stdio: ["ignore", "ignore", "pipe"], env });
			kid.on("exit", (c) => {
				append(fwLog, `${ts()} forward ${args[0]} exit ${c}`);
				setTimeout(() => {
					catchUp(lastSeen);
					start(args);
				}, 30_000);
			});
			kid.stderr?.on("data", (d) => append(fwLog, `${ts()} stderr ${cut(d, OUT_CAP)}`));
		};
		// A stale `cli` hook from a previous forwarder blocks a new one (422).
		const clear = (path, then) => {
			const r = ghApi(path, ["--jq", '.[]|select(.name=="cli")|.id']);
			const ids = r.code ? [] : r.out.split("\n").filter(Boolean);
			let left = ids.length;
			if (!left) return then();
			for (const id of ids) {
				ghApi(`${path}/${id}`, ["-X", "DELETE"]);
				if (--left === 0) then();
			}
		};
		clear(`repos/${REPO_NAME}/hooks`, () => start([`--repo=${REPO_NAME}`, `--events=${REPO_EVENTS}`]));
		clear(`orgs/${ORG}/hooks`, () => start([`--org=${ORG}`, "--events=projects_v2_item"]));
	});
}

// ---- start ----
if (IS_MAIN) {
	agents.reconcile();
	catchUp(lastSeen);
	agents.watchAgentEvents();
	agents.watchSessions();
	startWebhooks();
	agents.launchNext();
}
