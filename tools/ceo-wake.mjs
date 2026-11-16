#!/usr/bin/env node
// CEO sessions (ticket #52). The CEO is an SDK session, not a chat session.
//
// Two ways to use this file:
// - `tools/ceo "msg"`: one wake in its own process (create, one prompt, dispose). Self-contained,
//   so the chat path works even when the daemon is down.
// - `tools/factory.mjs`: one session kept warm, `wake()` once per event batch.
//
// A wake is one request, never a chat: the CEO answers, and the next wake is a new prompt on the
// same session. The prompt order is fixed so the cached prefix stays byte-stable:
//   fixed CEO prompt, then factory/STATE.md, then the event batch.
//
// Reset rules (factory/ceo-daemon.md), checked before a wake: context over 60k tokens, idle over
// 55 min, or 40 requests. Reset means a new session seeded with `factory/STATE.md` (~5k), because
// compaction costs a full context read plus summary output. `PI_CACHE_RETENTION=long` keeps a warm
// session's cache alive over the 5 min gaps the measurements found.
//
// Tools: ticket, gh_comment, kill_agent, relaunch_agent, write_state. There are no built-in
// tools, so the CEO cannot edit code, run a build, or block in the foreground by construction.
import { appendFileSync, existsSync, readFileSync, readdirSync, realpathSync, writeFileSync } from "node:fs";
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
const THINKING = process.env.PIRUST_CEO_THINKING || "high";
const OUT_CAP = 4000;
export const RESET_CONTEXT_TOKENS = 60_000;
export const RESET_IDLE_MS = 55 * 60_000;
export const RESET_REQUESTS = 40;
export const STALL_MS = 5 * 60_000;
export const MAX_INFLIGHT = 3;

// The SDK reads it at request time; set it before any session exists.
process.env.PI_CACHE_RETENTION ||= "long";

function loadSdk() {
	const ver = (n) => n.match(/pi-coding-agent-(\d+\.\d+\.\d+)/)?.[1] ?? "0";
	const store = readdirSync("/nix/store")
		.filter((n) => n.includes("-pi-coding-agent-") && !n.endsWith(".drv") && !n.endsWith(".json"))
		.map((n) => `/nix/store/${n}/lib/node_modules/pi-monorepo/dist/index.js`)
		.filter((p) => existsSync(p));
	const candidates = store.sort((a, b) => ver(b).localeCompare(ver(a), undefined, { numeric: true }));
	if (process.env.PIRUST_PI_SDK) candidates.unshift(process.env.PIRUST_PI_SDK);
	candidates.push("@earendil-works/pi-coding-agent");
	return candidates;
}

function readState(path = STATE) {
	try {
		return readFileSync(path, "utf8");
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

// One array, built once, so the tool declarations in the prompt never change (cache prefix).
export const CEO_TOOLS = [
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
		"Relaunch the coder on ticket <ticket> in a new worktree; it starts from that ticket's HANDOFF.md and comments. The daemon starts it, so do it in a ticket: action=new, title 'Relaunch coder #12', body '## Relaunch\\n- ticket: 12\\n- notes: ...'.",
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

/** Sum the tokens and cost of `messages` (the ones a wake added). Pure, so it is testable. */
export function totalUsage(messages) {
	const t = { requests: 0, in: 0, out: 0, cr: 0, cw: 0, cost: 0, costIn: 0, costOut: 0, costCr: 0, costCw: 0, cacheMiss: 0 };
	for (const m of messages) {
		if (m.role !== "assistant" || !m.usage) continue;
		t.requests += 1;
		t.in += m.usage.input ?? 0;
		t.out += m.usage.output ?? 0;
		t.cr += m.usage.cacheRead ?? 0;
		t.cw += m.usage.cacheWrite ?? 0;
		t.cost += m.usage.cost?.total ?? 0;
		t.costIn += m.usage.cost?.input ?? 0;
		t.costOut += m.usage.cost?.output ?? 0;
		t.costCr += m.usage.cost?.cacheRead ?? 0;
		t.costCw += m.usage.cost?.cacheWrite ?? 0;
		if ((m.usage.cacheRead ?? 0) === 0) t.cacheMiss += 1;
	}
	return t;
}

/** Fixed for every wake, so the cached prefix of a warm session never changes. */
export const CEO_PROMPT = `# CEO wake (stateless)
You are the CEO of the piroot factory (Rust port of pi), working in ${REPO}. Read AGENTS.md there for the full rules; the short version:
- You are paid in tokens. One request, no chat. Answer in ≤5 short lines: what you did, and any question for Patrick (he is slow; do not wait).
- You decide and delegate. You do not write code, do not build, do not run anything slow, and do not read whole logs.
- Tools: ticket (create/update), gh_comment (write on a ticket = the only way to ask Patrick), kill_agent, relaunch_agent, write_state.
- A "killed" event: the agent is gone; the ticket needs the work. Use relaunch_agent, and say so on the ticket.
- A "watch:" line: the work is yours to delegate; the agent is not running.
- To relaunch a coder on #12: create a ticket (action=new) titled "Relaunch coder #12" with body "## Relaunch\\n- ticket: 12\\n- notes: ...". The daemon starts it; the model is fixed by the template.
- Do not reply to routine items (a board move, a push, a PR, a CI pass, a finished agent with a clean HANDOFF).
- Finish with write_state: rewrite factory/STATE.md for the next session, ≤15 lines, pointers not prose.`;

/** The prompt one wake sends. Pure, so the cache prefix is testable. */
export function buildWakePrompt({ state, events, first, stateChanged }) {
	const head = first ? `${CEO_PROMPT}\n\n` : "";
	const st = first || stateChanged ? `## State (from factory/STATE.md; you rewrite it with write_state)\n${state}\n\n` : "";
	return `${head}${st}## Events\n${events}\n`;
}

/** Why this session must be replaced, or null to keep it. Pure, so the rules are testable. */
export function needsReset(s, now = Date.now()) {
	if (s.requests >= RESET_REQUESTS) return `requests=${s.requests}`;
	if (s.lastEnd && now - s.lastEnd > RESET_IDLE_MS) return `idle ${Math.round((now - s.lastEnd) / 60_000)} min`;
	if (s.ctx > RESET_CONTEXT_TOKENS) return `context ${Math.round(s.ctx / 1000)}k > ${RESET_CONTEXT_TOKENS / 1000}k`;
	return null;
}

/** One wake on a fresh session, then dispose: what `tools/ceo` runs. */
export async function ceoWake(events) {
	const s = await createCeoSession();
	try {
		return await s.wake(events);
	} finally {
		s.dispose();
	}
}

/**
 * A CEO session the caller keeps warm. `wake(events)` is one request; it starts a new session
 * when a reset rule is met, so a wake never pays for a 200k context.
 */
export async function createCeoSession(options = {}) {
	const o = { model: MODEL, thinking: THINKING, statePath: STATE, usagePath: USAGE, cwd: REPO, ...options };
	let sdk;
	for (const c of loadSdk()) {
		try {
			sdk = await import(c.startsWith("/") ? pathToFileURL(c).href : c);
			break;
		} catch {}
	}
	if (!sdk) throw new Error(`pi SDK not found: set PIRUST_PI_SDK=<path to pi-coding-agent dist/index.js>; tried ${loadSdk().join(", ")}`);
	const modelRuntime = await sdk.ModelRuntime.create();
	const [mp, mm] = o.model.split("/");
	const model = modelRuntime.getModel(mp, mm);
	if (!model) throw new Error(`model not found: ${o.model} (set PIRUST_CEO_MODEL; check ~/.pi/agent/models.json)`);

	/** Everything below belongs to one session; `reset()` starts over. */
	let session;
	let unsub;
	let seeded = false;
	let seenMessages = 0;
	let lastState = "";
	const h = {
		/** Tokens and cost of the current session (reset with it). */
		requests: 0,
		in: 0,
		out: 0,
		cr: 0,
		cw: 0,
		cost: 0,
		ctx: 0,
		lastEnd: 0,
		get seeded() {
			return seeded;
		},
		async wake(events) {
			const why = needsReset(this, Date.now());
			if (why) {
				digest(`ceo session reset (${why})`);
				stop();
				seeded = false;
				seenMessages = 0;
				this.requests = 0;
				this.in = 0;
				this.out = 0;
				this.cr = 0;
				this.cw = 0;
				this.cost = 0;
				this.ctx = 0;
			}
			const state = readState(o.statePath);
			const first = !seeded;
			const prompt = buildWakePrompt({ state, events, first, stateChanged: state !== lastState });
			lastState = state;
			seeded = true;
			let text = "";
			const before = seenMessages;
			if (first) await start();
			unsub = session.subscribe((e) => {
				if (e.type === "message_update" && e.assistantMessageEvent?.type === "text_delta") text += e.assistantMessageEvent.delta;
			});
			await session.prompt(prompt);
			unsub();
			const u = totalUsage(session.messages.slice(before));
			this.requests += u.requests;
			this.in += u.in;
			this.out += u.out;
			this.cr += u.cr;
			this.cw += u.cw;
			this.cost += u.cost;
			this.ctx = session.getContextUsage?.()?.tokens ?? 0;
			this.lastEnd = Date.now();
			appendFileSync(
				o.usagePath,
				`${new Date().toISOString()} wake=ceo model=${o.model} thinking=${o.thinking} requests=${u.requests} in=${u.in} out=${u.out} cache_read=${u.cr} cache_write=${u.cw} cost=${u.cost.toFixed(4)} cost_in=${u.costIn.toFixed(4)} cost_out=${u.costOut.toFixed(4)} cost_cache_read=${u.costCr.toFixed(4)} cost_cache_write=${u.costCw.toFixed(4)} cache_miss=${u.cacheMiss} ctx=${this.ctx} prompt_chars=${prompt.length} events=${events.split("\n").length}\n`,
			);
			return { text: text.trim(), ok: true };
		},
		dispose() {
			stop();
		},
	};

	async function start() {
		// No extensions, skills, prompts, themes: the CEO has five tools and nothing else.
		const loader = {
			getExtensions: () => ({ extensions: [], errors: [], runtime: sdk.createExtensionRuntime() }),
			getSkills: () => ({ skills: [], diagnostics: [] }),
			getPrompts: () => ({ prompts: [], diagnostics: [] }),
			getThemes: () => ({ themes: [], diagnostics: [] }),
			getAgentsFiles: () => ({ agentsFiles: [] }),
			getSystemPrompt: () => CEO_PROMPT,
			getSystemPromptSource: () => undefined,
			getAppendSystemPrompt: () => [],
			getAppendSystemPromptSources: () => [],
			extendResources: () => {},
			reload: async () => {},
		};
		const r = await sdk.createAgentSession({
			cwd: o.cwd,
			model,
			thinkingLevel: o.thinking,
			modelRuntime,
			resourceLoader: loader,
			tools: CEO_TOOLS.map((t) => t.name),
			customTools: CEO_TOOLS,
			sessionManager: sdk.SessionManager.inMemory(o.cwd),
		});
		session = r.session;
		seenMessages = session.messages.length;
	}

	function stop() {
		unsub?.();
		session?.dispose();
	}

	await start();
	return h;
}

function digest(s) {
	try {
		appendFileSync(join(HOME, ".pi/pirust-digest.log"), `${new Date().toISOString()} ${s}\n`);
	} catch {
		/* a log must not stop the factory */
	}
}


export const IS_MAIN = process.argv[1] && realpathSync(process.argv[1]) === realpathSync(import.meta.filename);

if (IS_MAIN) {
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
