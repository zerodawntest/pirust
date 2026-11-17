import { test } from "node:test";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
const here = dirname(fileURLToPath(import.meta.url));
async function load(fixture: string) {
	const nw = resolve(here, "fixtures", fixture);
	process.env.NEXT_WORK = nw;
	const mod = await import(new URL(`../.pi/extensions/keepalive.ts?dbg2`, import.meta.url).href);
	const handlers = new Map<string, (e: any, ctx: any) => Promise<any>>();
	const ctx = { cwd: `${process.env.HOME}/private/pirust`, ui: { notify: () => {}, setStatus: () => {} } };
	const pi = { on: (e: string, h: any) => { handlers.set(e, h); }, sendUserMessage: () => Promise.resolve(), sendMessage: () => {}, registerTool: () => {}, registerCommand: () => {} };
	(mod.default)(pi);
	return { fire: async (e: string, x: any = {}) => await handlers.get(e)?.(x, ctx) };
}
test("dbg2", async () => {
	const p = await load("next-work-lines.sh");
	await p.fire("session_start");
	await p.fire("before_agent_start", { messageType: "user" });
	const r = await p.fire("agent_before_settle", { entries: [] });
	console.log("r=", JSON.stringify(r), "has ab_settle:", true);
});
