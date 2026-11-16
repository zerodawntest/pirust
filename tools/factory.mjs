#!/usr/bin/env node
// Factory daemon (#52): the one process the factory runs on. No chat session is involved.
// Start: hc run --bg --keep --name pirust-factory -- <this file>
// Owns: the gh webhook stream (reconnect + API catch-up), the hc event stream (reconciled at
// startup), the agent session monitor (loop, 5 min stall, budget), the dispatcher, the token
// log, and the stateless CEO wakes (see ceo-wake.mjs).
import { appendFileSync, mkdirSync, readFileSync, readdirSync, writeFileSync, watch as fsWatch } from "node:fs";
import { spawn, spawnSync } from "node:child_process";
import { createServer } from "node:http";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { ceoWake } from "./ceo-wake.mjs";

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
const run = (file, args = []) => {
	const r = spawnSync(file, args, { encoding: "utf8", maxBuffer: 8 << 20 });
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
const inflight = new Set(Array.isArray(saved.inflight) ? saved.inflight : []);
const tickets = new Map();
const busy = new Set();
const mon = new Map();
const hardCap = new Map();
const handled = new Set();
let lastSeen = typeof saved.lastSeen === "string" ? saved.lastSeen : new Date(Date.now() - 30 * 60_000).toISOString();
function persist() {
	try {
		writeFileSync(SPIN, JSON.stringify({ lastSeen, queue: [...queue], seen: [...seen].slice(-5000), launched: [...launched], reviewed: [...reviewed], inflight: [...inflight] }));
	} catch (e) {
		console.error(`save: ${e?.message ?? e}`);
	}
}

// ---- events: one line each, ≤160 chars, no tool or stderr dumps ----
function summarize(type, p) {
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
			return `board #${n(p.projects_v2_item?.content)} ${f.field_name} -> ${typeof to === "string" ? to : JSON.stringify(to)} by ${who}`;
		}
	}
}

// Who must be answered now; everything else goes to the digest.
function escalates(type, p) {
	if (isPatrick(p.sender?.login)) return true;
	if (type === "issues" && ["opened", "reopened"].includes(p.action)) return true;
	return type === "issues" && p.action === "assigned" && p.assignee?.login === BOT_USER;
}

// ---- CEO: one stateless SDK wake per batch ----
let flushTimer;
function enqueue(lines) {
	for (const l of lines) queue.add(l);
	if (queue.size > BATCH_MAX) queue.delete(queue.values().next().value);
	clearTimeout(flushTimer);
	flushTimer = setTimeout(flush, DEBOUNCE_MS);
	persist();
}
function flush() {
	clearTimeout(flushTimer);
	const lines = [...queue];
	queue.clear();
	persist();
	if (!lines.length) return;
	const r = run(process.execPath, [WAKE, lines.join("\n")]);
	if (r.code) {
		const msg = `CEO wake failed (no answer; handle by hand): ${cut(r.err || r.out, 400)}`;
		log(msg);
		console.error(msg);
		return;
	}
	if (r.out) console.log(r.out);
}

// ---- agents: session files are the heartbeat; a dead agent is found at startup ----
const ticketOf = (term) => tickets.get(term);
const termOf = (n) => [...tickets].find(([, v]) => v === n)?.[0];

function onSession(file) {
	const n = file.match(/pirust-wt-(\d+)--/)?.[1];
	if (!n) return;
	const m = mon.get(n) ?? { off: 0, req: 0, tok: 0, cr: 0, cw: 0, cost: 0, calls: [] };
	mon.set(n, m);
	let txt = "";
	try {
		const b = readFileSync(join(SESS, file));
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
			m.req += 1;
			m.tok += (u.input ?? 0) + (u.output ?? 0);
			m.cr += u.cacheRead ?? 0;
			m.cw += u.cacheWrite ?? 0;
			m.cost += u.cost?.total ?? 0;
			for (const c of e.message.content ?? []) if (c.type === "toolCall") m.calls.push(c.name + JSON.stringify(c.arguments));
		} catch {}
	}
	m.calls = m.calls.slice(-4);
	const term = termOf(n);
	clearTimeout(m.stall);
	if (m.calls.length === 4 && m.calls.every((c) => c === m.calls[0])) {
		log(`ticket ${n} usage req=${m.req} io=${m.tok} cache_read=${m.cr} cache_write=${m.cw} cost=${m.cost.toFixed(4)} (killed: loop)`);
		return kill(term, "loop: same tool call 4x");
	}
	if (m.tok > 400_000 || m.cr > 3_000_000) {
		log(`ticket ${n} usage req=${m.req} io=${m.tok} cache_read=${m.cr} cache_write=${m.cw} cost=${m.cost.toFixed(4)} (killed: budget)`);
		return kill(term, `budget: ${m.tok} io/${m.cr} cache`);
	}
	m.stall = setTimeout(() => kill(termOf(n), "stalled 5 min"), 5 * 60_000);
}

function watchSessions() {
	mkdirSync(SESS, { recursive: true });
	try {
		fsWatch(SESS, { recursive: true }, (_t, f) => f && String(f).endsWith(".jsonl") && onSession(String(f)));
		for (const d of readdirSync(SESS)) for (const f of readdirSync(join(SESS, d))) if (f.endsWith(".jsonl")) onSession(`${d}/${f}`);
	} catch (e) {
		log(`session watch failed ${e}`);
	}
}

function relaunchOne(n, notes) {
	const l = run(AGENT, [n, "coder"]);
	if (l.code) return enqueue([`relaunch #${n} failed: ${cut(l.err || l.out, 200)}`]);
	launched.add(n);
	inflight.add(n);
	persist();
	log(`relaunch: coder on #${n}${notes ? ` (${cut(notes, 80)})` : ""}`);
}

function launchNext() {
	if (inflight.size >= MAX_INFLIGHT) return;
	const r = run(join(TOOLS, "next-ready"));
	const n = r.out.trim();
	if (r.code || !n) {
		log(`dispatch: no Ready ticket${r.code ? ` (error ${cut(r.err, 120)})` : ""}`);
		return;
	}
	const l = run(AGENT, [n, "coder"]);
	if (l.code) return enqueue([`dispatch: launching #${n} failed: ${cut(l.err || l.out, 200)}`]);
	launched.add(n);
	inflight.add(n);
	persist();
	log(`dispatch: launched #${n}`);
}

function mergeApproved(pr) {
	const n = String(pr.number);
	const m = run("git", ["-C", REPO, "merge", "--ff-only", `origin/${pr.head.ref}`]);
	if (m.code) return enqueue([`merge #${n}: not a fast-forward (${cut(m.err || m.out, 120)}) → rebase needed on #${n}`]);
	const push = run("git", ["-C", REPO, "push", "origin", `origin/${pr.head.ref}:integration`]);
	if (push.code) return enqueue([`merge #${n}: push failed: ${cut(push.err || push.out, 200)}`]);
	const c = run(GH, ["pr", "comment", n, "-b", "Merged by the factory daemon (ff to integration)."]);
	if (c.code) log(`merge #${n}: PR comment failed: ${cut(c.err, 120)}`);
	const t = run(TICKET, ["set", n, "-s", "Integration"]);
	if (t.code) log(`merge #${n}: ticket set failed: ${cut(t.err, 120)}`);
	launched.delete(n);
	inflight.delete(n);
	launchNext();
}

function finishAgent(term, why) {
	const n = ticketOf(term);
	if (!n || handled.has(term)) return;
	handled.add(term);
	const r = run(join(TOOLS, "wt"), ["finish", n]);
	const msg = `agent #${n} ${why}: ${r.code ? `wt finish failed: ${cut(r.err, 200)}` : r.out}`;
	run("hc", ["kill", term]);
	run("hc", ["rm", term]);
	const u = mon.get(n);
	clearTimeout(u?.stall);
	if (u) log(`ticket ${n} usage req=${u.req} io=${u.tok} cache_read=${u.cr} cache_write=${u.cw} cost=${u.cost.toFixed(4)} ctx=${u.tok + u.cr}`);
	mon.delete(n);
	inflight.delete(n);
	launchNext();
	if (r.code === 0 && why === "done") log(msg);
	else enqueue([msg]);
}

function kill(term, why) {
	if (!term || handled.has(term)) return;
	const n = ticketOf(term);
	enqueue([`agent #${n} killed: ${why}`]);
	finishAgent(term, `killed (${why})`);
}

function watchAgents() {
	const k = spawnProcess("hc", ["events", "--json", "--label", "project=pirust"]);
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
				if (ev.type !== "labels" && ev.type !== "foreground") log(`hc ${ev.type} ${term} ${JSON.stringify(ev.data).slice(0, 200)}`);
				const st = ev.data?.status?.state;
				if (term && tickets.has(term) && !hardCap.has(term)) hardCap.set(term, setTimeout(() => kill(term, "hard cap 30 min"), 30 * 60_000));
				if (st === "working") busy.add(term);
				if (ev.type === "finished") finishAgent(term, `exited ${ev.data?.exit_code ?? ""}`);
				else if (st === "done" || (st === "idle" && busy.has(term))) finishAgent(term, "done");
				else if (["blocked", "error"].includes(st)) finishAgent(term, st);
			} catch {}
		}
	});
	k.on("exit", (c) => {
		log(`hc events exit ${c}; restart in 30s`);
		setTimeout(() => {
			catchUp(lastSeen);
			watchAgents();
			lastSeen = new Date().toISOString();
			persist();
		}, 30_000);
	});
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
		const rl = String(i.body ?? "").match(/^## Relaunch\s*\n[\s\S]*?\bticket:\s*(\d+)/);
		if (rl) relaunchOne(rl[1], cut(String(i.body).match(/notes:\s*(.+)/)?.[1], 80));
		const assigned = (i.assignees ?? []).some((a) => a.login === BOT_USER);
		if (assigned && !launched.has(n) && !inflight.has(n)) {
			launched.add(n);
			inflight.add(n);
			const r = run(AGENT, [n, "coder"]);
			lines.push(r.code ? `issue #${n} assigned ${BOT_USER}; launch failed: ${cut(r.err || r.out, 120)}` : `issue #${n} assigned ${BOT_USER}; launched coder`);
			persist();
		}
	}
	for (const pr of getJson(`repos/${REPO_NAME}/pulls?state=open&sort=updated&direction=desc&per_page=50`) ) {
		if (String(pr.updated_at) < s || !fresh(`pr:${pr.id}`)) continue;
		const t = String(pr.body ?? "").match(/Closes #(\d+)/)?.[1];
		if (t && !reviewed.has(t)) {
			reviewed.add(t);
			const r = run(AGENT, [t, "reviewer"]);
			lines.push(r.code ? `PR #${pr.number}: launch reviewer for #${t} failed: ${cut(r.err || r.out, 120)}` : `PR #${pr.number} ready for review on #${t}`);
			persist();
		}
	}
	if (lines.length) {
		lines.forEach((l) => queue.add(l));
		clearTimeout(flushTimer);
		flush();
	}
	return lines;
}

// Agents that finished while no process was listening: adopt the running ones, finish the rest.
function reconcile() {
	const r = run("hc", ["ls", "--json"]);
	if (r.code) {
		log(`reconcile: hc ls failed: ${cut(r.err, 200)}`);
		return;
	}
	let list = [];
	try {
		list = JSON.parse(r.out)?.terminals ?? [];
	} catch {
		log("reconcile: bad hc ls json");
		return;
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
			if (t.status.exit_code === 0) finishAgent(t.address, "exited 0 (reconciled)");
			else enqueue([`agent #${n} exited ${t.status.exit_code} (reconciled)`]);
		}
	}
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
				const line = summarize(type, p);
				if (!line) return;
				const rl = String(p.issue?.body ?? "").match(/^## Relaunch\s*\n[\s\S]*?\bticket:\s*(\d+)/);
				if (type === "issues" && p.action === "opened" && rl) relaunchOne(rl[1], cut(String(p.issue.body).match(/notes:\s*(.+)/)?.[1], 80));
				const t = String(p.pull_request?.body ?? "").match(/Closes #(\d+)/)?.[1];
				if (type === "pull_request" && p.action === "opened" && t && !reviewed.has(t)) {
					reviewed.add(t);
					const r = run(AGENT, [t, "reviewer"]);
					log(r.code ? `PR #${p.pull_request.number}: launch reviewer for #${t} failed: ${cut(r.err || r.out, 120)}` : `PR #${p.pull_request.number}: launched reviewer for #${t}`);
					persist();
				}
				if (type === "pull_request_review" && p.review?.state === "approved" && p.pull_request?.base?.ref === "integration") mergeApproved(p.pull_request);
				const bad = type === "check_suite" || type === "workflow_run";
				if (!bad && !escalates(type, p)) return log(line);
				if (queue.has(line)) return;
				enqueue([line]);
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
reconcile();
catchUp(lastSeen);
watchAgents();
watchSessions();
startWebhooks();
launchNext();
