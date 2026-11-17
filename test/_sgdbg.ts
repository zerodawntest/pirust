import { test } from "node:test";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
const here = dirname(fileURLToPath(import.meta.url));
async function load(fixture: string, opts: { role?: string; cwd?: string } = {}) {
	process.env.NEXT_WORK = resolve(here, "fixtures", fixture);
	if (opts.role) process.env.PIRUST_ROLE = opts.role;
	const mod = await import(new URL(`../.pi/extensions/keepalive.ts?sg=${fixture}${opts.role ?? ""}${Math.random()}`, import.meta.url).href);
	const handlers = new Map<string, (e: any, ctx: any) => Promise<any>>();
	const ctx = { cwd: opts.cwd ?? `${process.env.HOME}/private/pirust`, ui: { notify: () => {}, setStatus: () => {} } };
	const pi = { on: (e: string, h: any) => { console.log("REG", e); handlers.set(e, h); }, sendUserMessage: () => Promise.resolve(), sendMessage: () => {}, registerTool: () => {}, registerCommand: () => {} };
	(mod.default)(pi);
	return { fire: async (e: string, x: any = {}) => await handlers.get(e)?.(x, ctx), has: (e: string) => handlers.has(e) };
}
test("debug2", async () => {
	const p = await load("next-work-lines.sh");
	await p.fire("session_start");
	await p.fire("before_agent_start", { messageType: "user" });
	const r3 = await p.fire("agent_before_settle", { entries: [] });
	console.log("r3", JSON.stringify(r3));
});
