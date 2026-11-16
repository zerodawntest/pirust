// Push GitHub repo + board events into the orchestrator session (main checkout only). No polling:
// gh webhook forward (websocket) -> local HTTP -> pi.sendMessage.
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
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
const REPO_EVENTS = "issues,issue_comment,pull_request,pull_request_review,pull_request_review_comment,check_suite,workflow_run,push";

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
			return `issue #${p.issue.number} ${p.action}${p.label ? ` ${p.label.name}` : ""} by ${who}: ${t(p.issue.title)}`;
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
		case "push":
			return `push ${p.ref.replace("refs/heads/", "")} by ${who}: ${p.commits?.length ?? 0} commit(s)${p.forced ? " FORCED" : ""}`;
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
					const type = String(req.headers["x-github-event"] ?? "");
					const p = JSON.parse(body);
					if (p.sender?.login === BOT) return; // own actions (scripts push/ticket as the bot)
					const line = await summarize(type, p);
					if (line) pi.sendMessage({ customType: "gh-event", content: `[gh] ${line}`, display: true }, { triggerTurn: true, deliverAs: "followUp" });
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
			run([`--repo=${REPO}`, `--events=${REPO_EVENTS}`]);
			run([`--org=${ORG}`, "--events=projects_v2_item"]);
			ctx.ui.setStatus("gh-events", "gh: live");
		});
	});

	pi.on("session_shutdown", async () => {
		for (const k of kids.splice(0)) k.kill();
		server?.close();
		server = undefined;
	});
}
