import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import ka from "/tmp/ka-dbg.ts";
const here = dirname(fileURLToPath(import.meta.url));
test("dbg4", async () => {
  process.env.NEXT_WORK = resolve(here, "fixtures", "next-work-lines.sh");
  const p = (() => {
    const h = new Map<string, (e: any, c: any) => Promise<any>>();
    const ctx = { cwd: `${process.env.HOME}/private/pirust`, ui: { notify: () => {}, setStatus: () => {} } };
    const pi = { on: (e: string, fn: any) => h.set(e, fn), sendUserMessage: () => Promise.resolve(), sendMessage: () => {}, registerTool: () => {}, registerCommand: () => {} };
    ka(pi);
    return { fire: async (e: string, x: any = {}) => h.get(e)?.(x, ctx) };
  })();
  const r = await p.fire("agent_before_settle", { entries: [] });
  console.log("DBG r=", JSON.stringify(r));
});
