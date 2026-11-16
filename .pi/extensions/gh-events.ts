// Push GitHub repo + board events into the orchestrator session (main checkout only). No polling:
// gh webhook forward (websocket) -> local HTTP -> pi.sendMessage.
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";
import { spawn, execFile, execFileSync, type ChildProcess } from "node:child_process";
import { createServer, type Server } from "node:http";
import { realpathSync } from "node:fs";
import { homedir } from "node:os";
import { appendFileSync } from "node:fs";
const log = (s: string) => { try { appendFileSync(`${homedir()}/.pi/gh-events.log`, `${new Date().toISOString()} ${s}\n`); } catch {} };

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
const REPO_DIR = `${homedir()}/private/pirust`;
const DIGEST = `${homedir()}/.pi/pirust-digest.log`;
const digest = (s: string) => { try { appendFileSync(DIGEST, `${new Date().toISOString()} ${s}\n`); } catch {} };
const escalates = (type: string, p: any) =>
	p.sender?.type === "User" &&
	(["issue_comment", "pull_request_review", "pull_request_review_comment"].includes(type) ||
		(type === "issues" && ["opened", "reopened"].includes(p.action)) ||
		(type === "issues" && p.action === "assigned" && p.assignee?.login === BOT));

const gql = (id: string) =>
	new Promise<string>((res) =>
		execFile("gh", ["api", "graphql", "-f", `query=query{node(id:"${id}"){...on Issue{number}...on PullRequest{number}}}`, "--jq", ".data.node.number"], (e, out) =>
			res(e ? "?" : out.trim()),
		),
	);

async function summarize(type: string, p: any): Promise<string | undefined> {
	const who = p.sender?.login;
	const t = (s?: string) => (s ?? "").replace(/\s+/g, " ").slice(0, 100);
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

log("module loaded");
export default function (pi: ExtensionAPI) {
	log("factory called");
	let server: Server | undefined;
	const kids: ChildProcess[] = [];
	const seen = new Set<string>();
	const queue: string[] = [];
	let timer: ReturnType<typeof setTimeout> | undefined;
	let reloadRequested = false;
	const flush = () => {
		if (!queue.length) return;
		const lines = queue.splice(0);
		pi.sendMessage({ customType: "gh-event", content: `[gh] ${lines.length} event(s)\n${lines.join("\n")}`, display: true }, { triggerTurn: true, deliverAs: "followUp" });
	};

	// Agent terminals (label project=pirust): on done/blocked/error/exit -> tools/wt finish, report in batch.
	const handled = new Set<string>();
	const tickets = new Map<string, string>();
	const finishAgent = (term: string, why: string) => {
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
		kids.push(k);
		let buf = "";
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

	pi.registerCommand("reload-runtime", { description: "Reload extensions", handler: async (_a, ctx) => { await ctx.reload(); } });
	pi.registerTool({
		name: "reload_runtime",
		label: "Reload Runtime",
		description: "Reload extensions/skills/context files after this response (use after editing .pi/extensions).",
		parameters: Type.Object({}),
		async execute() {
			reloadRequested = true;
			return { content: [{ type: "text", text: "Reload after this response." }], details: {}, terminate: true };
		},
	});
	pi.on("agent_settled", () => {
		if (!reloadRequested) return;
		reloadRequested = false;
		pi.sendUserMessage("/reload-runtime", { expandPromptTemplates: true });
	});

	pi.on("session_start", async (_e, ctx) => {
		let cwd = "";
		try { cwd = realpathSync(ctx.cwd); } catch {}
		log(`session_start cwd=${cwd} server=${!!server}`);
		if (cwd !== `${homedir()}/private/pirust` || server) return;

		server = createServer((req, res) => {
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
					const line = await summarize(String(req.headers["x-github-event"] ?? ""), p);
					if (!line) return;
					const type = String(req.headers["x-github-event"] ?? "");
					const bad = (type === "check_suite" || type === "workflow_run");
					if (!bad && !escalates(type, p)) return digest(line);
					if (queue.includes(line)) return;
					queue.push(line);
					clearTimeout(timer);
					timer = setTimeout(flush, DEBOUNCE_MS);
				} catch {}
			});
		});
		server.listen(0, "127.0.0.1", () => {
			const port = (server!.address() as any).port;
			const url = `http://127.0.0.1:${port}/`;
			const env = adminEnv();
			const run = (args: string[]) => {
				const k = spawn("gh", ["webhook", "forward", ...args, `--url=${url}`], { stdio: ["ignore", "ignore", "pipe"], env });
				k.on("exit", (c) => log(`gh exit ${c} ${args[0]}`));
				k.stderr?.on("data", (d) => log(`stderr ${String(d).trim()}`));
				k.stderr?.on("data", (d) => /error/i.test(String(d)) && ctx.ui.notify(`gh-events: ${String(d).trim()}`, "warning"));
				kids.push(k);
			};
			// a stale `cli` hook from a previous forwarder blocks a new one (422)
			const clear = (path: string, then: () => void) =>
				execFile("gh", ["api", path, "--jq", '.[]|select(.name=="cli")|.id'], { env }, (_e, out) => {
					const ids = String(out).trim().split("\n").filter(Boolean);
					let left = ids.length;
					if (!left) return then();
					for (const id of ids) execFile("gh", ["api", "-X", "DELETE", `${path}/${id}`], { env }, () => --left || then());
				});
			clear(`repos/${REPO}/hooks`, () => run([`--repo=${REPO}`, `--events=${REPO_EVENTS}`]));
			clear(`orgs/${ORG}/hooks`, () => run([`--org=${ORG}`, "--events=projects_v2_item"]));
			watchAgents();
			ctx.ui.setStatus("gh-events", "gh: live");
		});
	});

	pi.on("session_shutdown", async () => {
		clearTimeout(timer);
		for (const k of kids.splice(0)) k.kill();
		server?.close();
		server = undefined;
	});
}
