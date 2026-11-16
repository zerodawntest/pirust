#!/usr/bin/env node
// One stateless CEO wake (#52): fixed prompt + factory/STATE.md + events, one request, then exit.
// `tools/ceo "msg"` runs one wake; factory.mjs runs one per event batch.
// The prompt order is fixed: CEO prompt (a stable prefix, so it caches), then STATE.md, then events.
// No built-in tools: the CEO cannot edit code, run a build, or block in the foreground by construction.
import { appendFileSync, existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";

const TOOLS = dirname(process.realpathSync(import.meta.filename));
const REPO = join(TOOLS, "..");
const HOME = homedir();
const GH = join(TOOLS, "gh-bot");
const TICKET = join(TOOLS, "ticket");
const AGENT = join(TOOLS, "agent");
const STATE = join(REPO, "factory/STATE.md");
const USAGE = join(HOME, ".pi/pirust-usage.log");
const MODEL = process.env.PIRUST_CEO_MODEL || "opencode/claude-opus-5-5";
const THINKING = process.env.PIRUST_CEO_THINKING || "low";
const OUT_CAP = 4000;

function loadSdk() {
	const ver = (n) => n.match(/pi-coding-agent-(\d+\.\d+\.\d+)/)?.[1] ?? "0";
	const store = readdirSync("/nix/store")
		.filter((n) => n.includes("-pi-coding-agent-") && !n.endsWith(".drv"))
		.map((n) => `/nix/store/${n}/lib/node_modules/pi-monorepo/dist/index.js`)
		.filter((p) => existsSync(p))
		.sort((a, b) => ver(a).localeCompare(ver(b), undefined, { numeric: true }));
	const candidates = store;
	if (process.env.PIRUST_PI_SDK) candidates.unshift(process.env.PIRUST_PI_SDK);
	candidates.push("@earendil-works/pi-coding-agent");
	return candidates;
}

function readState() {
	try {
		return readFileSync(STATE, "utf8");
	} catch {
		return "(no factory/STATE.md)";
	}
}

function run(file, args) {
	const r = spawnSync(file, args, { encoding: "utf8", maxBuffer: 8 << 20 });
	const out = (r.stdout ?? "").trim();
	const err = (r.stderr ?? "").trim();
	if (r.error) return { code: 1, out: "", err: (r.error.message ?? "").slice(0, OUT_CAP) };
	const tail = (s) => (s.length > OUT_CAP ? `…${s.slice(-OUT_CAP)}` : s);
	return { code: r.status ?? 1, out: tail(out), err: tail(err) };
}

function tool(name, description, parameters, call) {
	return {
		name,
		label: name,
		description,
		promptSnippet: description.split(". ")[0],
		parameters,
		async execute(_id, params) {
			const r = call(params);
			const text = r.code === 0 ? r.out || "ok" : `FAILED (${r.code}): ${r.err || r.out}`;
			return { content: [{ type: "text", text }], details: {}, terminate: true };
		},
	};
}

const TICKET_SPEC = {
	type: "object",
	properties: {
		action: { enum: ["new", "set"] },
		title: { type: "string" },
		body: { type: "string" },
		number: { type: "integer" },
		kind: { enum: ["Epic", "Feature", "Task", "Bug"] },
		status: { type: "string" },
		priority: { enum: ["P0", "P1", "P2"] },
		size: { enum: ["S", "M", "L"] },
		claim: { type: "string" },
		parent: { type: "integer" },
		labels: { type: "string" },
	},
	required: ["action"],
	additionalProperties: false,
};
const COMMENT_SPEC = { type: "object", properties: { issue: { type: "integer" }, body: { type: "string" } }, required: ["issue", "body"], additionalProperties: false };
const KILL_SPEC = { type: "object", properties: { terminal: { type: "string" } }, required: ["terminal"], additionalProperties: false };
const RELAUNCH_SPEC = { type: "object", properties: { ticket: { type: "integer" }, role: { type: "string" } }, required: ["ticket"], additionalProperties: false };
const STATE_SPEC = { type: "object", properties: { content: { type: "string" } }, required: ["content"], additionalProperties: false };

const TOOLS_DEF = [
	tool(
		"ticket",
		"Create (action=new) or update (action=set) a ticket. new needs title; set needs number. Returns the ticket number.",
		TICKET_SPEC,
		(p) => {
			const a = [TICKET, p.action];
			if (p.action === "new") a.push(...(p.title ? ["-t", p.title] : []), ...(p.kind ? ["-k", p.kind] : []), ...(p.parent ? ["-p", String(p.parent)] : []), ...(p.labels ? ["-l", p.labels] : []), ...(p.status ? ["-s", p.status] : []), ...(p.priority ? ["-P", p.priority] : []), ...(p.size ? ["-S", p.size] : []), ...(p.body ? ["-b", p.body] : []));
			else a.push(String(p.number), ...(p.status ? ["-s", p.status] : []), ...(p.priority ? ["-P", p.priority] : []), ...(p.size ? ["-S", p.size] : []), ...(p.claim ? ["-c", p.claim] : []));
			return run(a[0], a.slice(1));
		},
	),
	tool(
		"gh_comment",
		"Comment on issue or PR <issue>. This is how you talk to Patrick; write full sentences.",
		COMMENT_SPEC,
		(p) => run(GH, ["api", `repos/zerodawntest/pirust/issues/${p.issue}/comments`, "-f", `body=${p.body}`]),
	),
	tool(
		"kill_agent",
		"Kill a running agent by terminal id, e.g. pirust-12. Use only for a loop, a stall over 5 min, or a budget over 400k tokens.",
		KILL_SPEC,
		(p) => {
			const k = run("hc", ["kill", p.terminal]);
			const r = run("hc", ["rm", p.terminal]);
			return { code: k.code === 0 && r.code === 0 ? 0 : 1, out: `killed ${p.terminal}`, err: k.err || r.err };
		},
	),
	tool(
		"relaunch_agent",
		"Relaunch the coder on ticket <ticket> in a new worktree; it starts from that ticket's HANDOFF.md and comments.",
		RELAUNCH_SPEC,
		(p) => run(AGENT, [String(p.ticket), ...(p.role ? [p.role] : [])]),
	),
	tool(
		"write_state",
		"Rewrite factory/STATE.md (max 15 lines, 4000 chars) with the state a new session needs to resume: Patrick's last request, open decisions, running agents, rules broken. Do it last.",
		STATE_SPEC,
		(p) => {
			const lines = p.content.split("\n").filter((l) => l.trim() !== "").length;
			if (lines > 15 || p.content.length > 4000) return { code: 1, out: "", err: `state too big (${lines} non-empty lines, ${p.content.length} chars): max 15 lines / 4000 chars. Cut detail, keep pointers to tickets and logs.` };
			try {
				writeFileSync(STATE, p.content.endsWith("\n") ? p.content : `${p.content}\n`);
			} catch (e) {
				return { code: 1, out: "", err: (e?.message ?? `${e}`).slice(0, OUT_CAP) };
			}
			return { code: 0, out: `wrote ${STATE}`, err: "" };
		},
	),
];

function totalUsage(messages) {
	const t = { requests: 0, in: 0, out: 0, cr: 0, cw: 0, cost: 0 };
	for (const m of messages) {
		if (m.role !== "assistant" || !m.usage) continue;
		t.requests += 1;
		t.in += m.usage.input ?? 0;
		t.out += m.usage.output ?? 0;
		t.cr += m.usage.cacheRead ?? 0;
		t.cw += m.usage.cacheWrite ?? 0;
		t.cost += m.usage.cost?.total ?? 0;
	}
	return t;
}

export async function ceoWake(events) {
	const state = readState();
	const prefix = `# CEO wake (stateless)
You are the CEO of the pirust factory (Rust port of pi), working in ${REPO}. Read AGENTS.md there for the full rules; the short version:
- You are paid in tokens. One request, no chat. Answer in ≤5 short lines: what you did, and any question for Patrick (he is slow; do not wait).
- You decide and delegate. You do not write code, do not build, do not run anything slow, and do not read whole logs.
- Tools: ticket (create/update), gh_comment (write on a ticket = the only way to ask Patrick), kill_agent, relaunch_agent, write_state.
- A "killed" event: the agent is gone; the ticket needs the work. Use relaunch_agent, and say so on the ticket.
- A "watch:" line: the work is yours to delegate; the agent is not running.
- To relaunch a coder on #12: create a ticket (action=new) titled "Relaunch coder #12" with body "## Relaunch\\n- ticket: 12\\n- notes: ...". The daemon starts it; the model is fixed by the template.
- Do not reply to routine items (a board move, a push, a PR, a CI pass, a finished agent with a clean HANDOFF).
- Finish with write_state: rewrite factory/STATE.md for the next session, ≤15 lines, pointers not prose.`;
	const prompt = `${prefix}\n\n## State (from factory/STATE.md; you rewrite it with write_state)\n${state}\n\n## Events\n${events}\n`;

	const candidates = loadSdk();
	let sdk;
	for (const c of candidates) {
		try {
			sdk = await import(c.startsWith("/") ? pathToFileURL(c).href : c);
			break;
		} catch {}
	}
	if (!sdk) throw new Error(`pi SDK not found: set PIRUST_PI_SDK=<path to pi-coding-agent dist/index.js>; tried ${candidates.join(", ")}`);

	const modelRuntime = await sdk.ModelRuntime.create();
	const [mp, mm] = MODEL.split("/");
	const model = modelRuntime.getModel(mp, mm);
	if (!model) throw new Error(`model not found: ${MODEL} (set PIRUST_CEO_MODEL; check ~/.pi/agent/models.json)`);
	const loader = {
		getExtensions: () => ({ extensions: [], errors: [], runtime: sdk.createExtensionRuntime() }),
		getSkills: () => ({ skills: [], diagnostics: [] }),
		getPrompts: () => ({ prompts: [], diagnostics: [] }),
		getThemes: () => ({ themes: [], diagnostics: [] }),
		getAgentsFiles: () => ({ agentsFiles: [] }),
		getSystemPrompt: () => prefix,
		getSystemPromptSource: () => undefined,
		getAppendSystemPrompt: () => [],
		getAppendSystemPromptSources: () => [],
		extendResources: () => {},
		reload: async () => {},
	};
	const { session } = await sdk.createAgentSession({
		cwd: REPO,
		model,
		thinkingLevel: THINKING,
		modelRuntime,
		resourceLoader: loader,
		tools: TOOLS_DEF.map((t) => t.name),
		customTools: TOOLS_DEF,
		sessionManager: sdk.SessionManager.inMemory(),
	});
	let text = "";
	try {
		session.subscribe((e) => {
			if (e.type === "message_update" && e.assistantMessageEvent?.type === "text_delta") text += e.assistantMessageEvent.delta;
		});
		await session.prompt(prompt);
		const u = totalUsage(session.state.messages);
		const ctx = session.getContextUsage?.()?.tokens ?? 0;
		appendFileSync(USAGE, `${new Date().toISOString()} wake=ceo model=${MODEL} thinking=${THINKING} requests=${u.requests} in=${u.in} out=${u.out} cache_read=${u.cr} cache_write=${u.cw} cost=${u.cost.toFixed(4)} ctx=${ctx} prompt_chars=${prompt.length}\n`);
	} finally {
		session.dispose();
	}
	return { text: text.trim(), ok: true };
}

if (process.argv[1] && process.argv[1].endsWith("ceo-wake.mjs")) {
	const args = process.argv.slice(2);
	const events = args.length ? (args[0] === "-" ? readFileSync(0, "utf8") : args.join(" ")) : readFileSync(0, "utf8");
	try {
		const r = await ceoWake(events);
		if (r.text) process.stdout.write(`${r.text}\n`);
	} catch (e) {
		process.stderr.write(`ceo wake failed: ${e?.stack ?? e}\n`);
		process.exitCode = 1;
	}
}
