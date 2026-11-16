#!/usr/bin/env node
// Liaison daemon: GitHub webhook forwarding, hc agent events, wt finish, digest, agent watchdog.
// Runs as an hc terminal (name `pirust-liaison`, --outlive-parent) so it survives the orchestrator;
// .pi/extensions/gh-events.ts starts it and fs.watch-es the escalation file.
// Routine events -> ~/.pi/pirust-digest.log. Escalations -> ~/.pi/pirust-escalations.jsonl
// (one JSON per line: {at, content}); the extension forwards each line as one pi.sendMessage.
import { execFile, execFileSync, spawn } from "node:child_process";
import { createServer } from "node:http";
import { appendFileSync, existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";

const REPO = "zerodawntest/pirust";
const ORG = "zerodawntest";
const BOT = "pirust-bot[bot]";
const ADMIN = "Patrick-Kappen-SLTN"; // org admin; webhooks need admin rights
const adminEnv = () => {
	try {
		return { ...process.env, GH_TOKEN: execFileSync("gh", ["auth", "token", "-u", ADMIN], { encoding: "utf8" }).trim() };
	} catch {
		return process.env;
	}
};
const REPO_EVENTS = "issues,issue_comment,pull_request,pull_request_review,pull_request_review_comment,check_suite,workflow_run";
const DEBOUNCE_MS = 10_000;
const REPO_DIR = `${process.env.HOME}/private/pirust`;
const DIGEST = `${process.env.HOME}/.pi/pirust-digest.log`;
const ESCALATIONS = `${process.env.HOME}/.pi/pirust-escalations.jsonl`;
const SEEN = `${process.env.HOME}/.pi/pirust-liaison-seen.txt`;
const AGENT_MAX_MS = 45 * 60_000;
const AGENT_MAX_TOKENS = 2_000_000;
const SESSIONS = `${process.env.HOME}/.pig/agent/sessions`;
const log = (s) => {
	try {
		appendFileSync(`${process.env.HOME}/.pi/gh-events.log`, `${new Date().toISOString()} ${s}\n`);
	} catch {}
};
const digest = (s) => {
	try {
		appendFileSync(DIGEST, `${new Date().toISOString()} ${s}\n`);
	} catch {}
};
const escalate = (s) => {
	try {
		appendFileSync(ESCALATIONS, JSON.stringify({ at: new Date().toISOString(), content: s }) + "\n");
	} catch {}
};

const escalates = (type, p) =>
	p.sender?.type === "User" &&
	(["issue_comment", "pull_request_review", "pull_request_review_comment"].includes(type) ||
		(type === "issues" && ["opened", "reopened"].includes(p.action)) ||
		(type === "issues" && p.action === "assigned" && p.assignee?.login === BOT));

const gql = (id) =>
	new Promise((res) =>
		execFile("gh", ["api", "graphql", "-f", `query=query{node(id:"${id}"){...on Issue{number}...on PullRequest{number}}}`, "--jq", ".data.node.number"], (e, out) =>
			res(e ? "?" : out.trim()),
		),
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

// Escalation batches: one queued batch = one jsonl line = one pi.sendMessage in the extension.
const queue = [];
let timer;
const flush = () => {
	if (!queue.length) return;
	const lines = queue.splice(0);
	try {
		appendFileSync(ESCALATIONS, JSON.stringify({ content: `[gh] ${lines.length} event(s)\n${lines.join("\n")}` }) + "\n");
	} catch {}
};

// Shared dedup key `${type}:${payload.id}`: REST catch-up and webhooks carry the same payload ids.
const seen = new Set();

async function processEvent(type, p) {
	if (p.sender?.login === BOT) return; // own actions
	const line = await summarize(type, p);
	if (!line) return;
	const bad = type === "check_suite" || type === "workflow_run";
	if (!bad && !escalates(type, p)) return digest(line);
	if (queue.includes(line)) return;
	queue.push(line);
	clearTimeout(timer);
	timer = setTimeout(flush, DEBOUNCE_MS);
}

// Catch-up on start: one fetch of events since last seen (replaces #31), for events missed while the
// daemon was down. The REST feed lags ~5 min, so a live-only window (last-seen, now] is covered by
// the forwarders started right after; the `seen` keys dedup the overlap.
{
	let last = 0;
	try {
		last = Date.parse(readFileSync(SEEN, "utf8").trim()) || 0;
	} catch {}
	const start = Date.now();
	if (last) {
		const REST_TYPES = {
			IssuesEvent: "issues",
			IssueCommentEvent: "issue_comment",
			PullRequestEvent: "pull_request",
			PullRequestReviewEvent: "pull_request_review",
			PullRequestReviewCommentEvent: "pull_request_review_comment",
		};
		try {
			const tsv = execFileSync(
				"gh",
				["api", `repos/${REPO}/events?per_page=100`, "--paginate", "--jq", ".[] | [.type, .created_at, (.payload|@json)] | @tsv"],
				{ encoding: "utf8" },
			);
			let n = 0;
			for (const rec of tsv.split("\n")) {
				if (!rec.trim()) continue;
				const tab1 = rec.indexOf("\t");
				const tab2 = rec.indexOf("\t", tab1 + 1);
				const type = REST_TYPES[rec.slice(0, tab1)];
				const at = Date.parse(rec.slice(tab1 + 1, tab2));
				if (!type || !Number.isFinite(at) || at <= last || at > start) continue;
				const p = JSON.parse(rec.slice(tab2 + 1));
				const key = `${type}:${p.id}`;
				if (seen.has(key)) continue;
				seen.add(key);
				void processEvent(type, p);
				n++;
			}
			log(`liaison catch-up ${new Date(last).toISOString()}..: ${n} event(s)`);
		} catch (e) {
			log(`liaison catch-up failed: ${String(e).slice(0, 200)}`);
		}
	}
	try {
		writeFileSync(SEEN, new Date(start).toISOString());
	} catch {}
}

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
			const type = String(req.headers["x-github-event"] ?? "");
			// payload ids are stable per event, unlike the per-delivery GUID — dedups against catch-up
			const key = `${type}:${p.id}`;
			if (seen.has(key)) return;
			seen.add(key);
			await processEvent(type, p);
		} catch {}
	});
});

// Agent terminals (label project=pirust): on done/blocked/error/exit -> tools/wt finish, report in batch.
const handled = new Set();
const tickets = new Map();
const finishAgent = (term, why) => {
	const n = tickets.get(term);
	if (!n || handled.has(term)) return;
	handled.add(term);
	execFile(`${REPO_DIR}/tools/wt`, ["finish", n], { env: process.env }, (e, out, err) => {
		const msg = `agent #${n} ${why}: ${e ? `wt finish failed: ${String(err).trim().slice(-200)}` : out.trim()}`;
		execFile("hc", ["kill", term], () => execFile("hc", ["rm", term], () => {}));
		if (!e && why === "done") return digest(msg);
		queue.push(msg);
		clearTimeout(timer);
		timer = setTimeout(flush, 1000);
	});
};

const watchAgents = () => {
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
				if (ev.type !== "labels" && ev.type !== "foreground") log(`hc ${ev.type} ${term} ${JSON.stringify(ev.data).slice(0, 200)}`);
				const st = ev.data?.status ?? ev.data?.word;
				if (ev.type === "finished") finishAgent(term, `exited ${ev.data?.exit_code ?? ""}`);
				else if (["done", "blocked", "error"].includes(st)) finishAgent(term, st);
			} catch {}
		}
	});
	k.on("exit", (c) => log(`hc events exit ${c}`));
};

// Watchdog: an agent running > 45 min or > 2M total tokens is killed and escalated. Total tokens =
// last usage.totalTokens per session jsonl (cumulative); sum of agent sessions = the terminal's total.
const checkAgents = () => {
	let list = [];
	try {
		list = JSON.parse(execFileSync("hc", ["ls", "--json"], { encoding: "utf8" })).terminals ?? [];
	} catch {}
	for (const t of list) {
		const m = /^pirust-(\d+)$/.exec(t.name ?? "");
		if (!m || t.state !== "live") continue;
		const n = m[1];
		let total = 0;
		const dir = `${SESSIONS}/--home-zerodawn-private-pirust-wt-${n}--`; // agents run in ~/private/pirust-wt/<n>
		try {
			for (const f of readdirSync(dir)) {
				if (!f.endsWith(".jsonl")) continue;
				const g = readFileSync(`${dir}/${f}`, "utf8").match(/"totalTokens":(\d+)/g);
				if (g) total += Number(g[g.length - 1].slice(14)); // last assistant message = session total
			}
		} catch {}
		let created = 0;
		try {
			created = Number(JSON.parse(execFileSync("hc", ["get", t.address, "--json"], { encoding: "utf8" })).created_ms);
		} catch {}
		const over = [];
		if (created && Date.now() - created > AGENT_MAX_MS) over.push(`${Math.round((Date.now() - created) / 60000)} min`);
		if (total > AGENT_MAX_TOKENS) over.push(`${(total / 1e6).toFixed(1)}M tokens`);
		if (!over.length) continue;
		handled.add(t.address); // killed mid-work: no wt finish
		try {
			execFileSync("hc", ["kill", t.address], { stdio: "ignore" });
			execFileSync("hc", ["rm", t.address], { stdio: "ignore" });
		} catch {}
		queue.push(`agent #${n} ${over.join(" & ")}, killed`);
		clearTimeout(timer);
		timer = setTimeout(flush, 1000);
	}
};

const start = () => {
	const url = `http://127.0.0.1:${server.address().port}/`;
	const env = adminEnv();
	const run = (args) => {
		const k = spawn("gh", ["webhook", "forward", ...args, `--url=${url}`], { stdio: ["ignore", "ignore", "pipe"], env });
		k.on("exit", (c) => log(`gh exit ${c} ${args[0]}`));
		k.stderr?.on("data", (d) => log(`stderr ${String(d).trim()}`));
	};
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
	watchAgents();
	log(`liaison server listening ${url}`);
};

server.listen(0, "127.0.0.1", start);
setInterval(() => checkAgents(), 5 * 60_000);
