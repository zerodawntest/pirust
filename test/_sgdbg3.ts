import { test } from "node:test";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { keepalive as _ka } from "/tmp/kb.ts";
const here = dirname(fileURLToPath(import.meta.url));
test("dbg3", async () => {
	const p = (() => {
		const handlers = new Map<string, any>();
		const ctx = { cwd: `${process.env.HOME}/private/pirust`, ui: { notify: () => {}, setStatus: () => {} } };
		const pi = { on: (e: string, h: any) => { handlers.set(e, h); }, sendUserMessage: () => Promise.resolve(), sendMessage: () => {}, registerTool: () => {}, registerCommand: () => {} };
		return { pi, fire: async (e: string, x: any = {}) => { const r = await handlers.get(e)?.(x, ctx); return r; } };
	})();
	process.env.NEXT_WORK = resolve(here, "fixtures", "next-work-lines.sh");
	const { default: ka } = await import("/tmp/kb.ts");
	ka(p.pi);
	await p.fire("session_start");
	await p.fire("before_agent_start", { messageType: "user" });
	const r = await p.fire("agent_before_settle", { entries: [] });
	console.log("r=", JSON.stringify(r));
});
