// Tests for the CEO-rules split (ticket #68), run with:
//   node --test test/ceo-rules.test.ts
// Verifies that .pi/extensions/ceo-guard.ts injects factory/ceo/RULES.md into the system prompt
// of the orchestrator session (cwd == repo root) and of no other session, deterministically.

import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, readdirSync, realpathSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { homedir } from "node:os";

import setupCeoGuard from "../.pi/extensions/ceo-guard.ts";

const here = dirname(fileURLToPath(import.meta.url));
const extDir = resolve(here, "../.pi/extensions"); // where ceo-guard.ts lives
const rulesFile = resolve(here, "../factory/ceo/RULES.md");
const ROOT = `${homedir()}/private/pirust`; // root the extension hard-codes

// The root is a fixed path, so every worktree's copy of the extension hard-codes the same one (that
// is what tells a lead session from an agent in a worktree). Create it when it is not here, so the
// "injects" case runs on every machine, not only on the one that hosts the orchestrator repo.
mkdirSync(ROOT, { recursive: true });

// The root is also where the reload_runtime gate (#83) reads its extcheck stamp. Write what
// tools/extcheck writes (sorted sha256 per `.pi/extensions/*.ts`), so the reload assertions below
// are the same on every machine, not only on the one that hosts the orchestrator repo.
mkdirSync(`${ROOT}/.pi/extensions`, { recursive: true });
const extNames = readdirSync(`${ROOT}/.pi/extensions`).filter((n) => n.endsWith(".ts")).sort();
writeFileSync(
	`${ROOT}/.pi/.extcheck-pass`,
	extNames
		.map((n) => `${createHash("sha256").update(readFileSync(`${ROOT}/.pi/extensions/${n}`)).digest("hex")}  .pi/extensions/${n}`)
		.join("\n") + "\n",
);

// The rules the extension reads once at load and pastes verbatim (deterministic text).
const rulesContent = readFileSync(rulesFile, "utf8").trim();
const rulesPath = `${extDir}/../../factory/ceo/RULES.md`; // path string the extension embeds
const injectedRules = `## CEO rules (from ${rulesPath})\n\n${rulesContent}\n`;

// A minimal stand-in for pi's ExtensionAPI: capture the handlers and the /ceo-rules-check command.
function loadExtension() {
  const handlers: Record<string, (...a: any[]) => any> = {};
  const commands: Record<string, { description: string; handler: (...a: any[]) => any }> = {};
  setupCeoGuard({
    on: (ev: string, fn: (...a: any[]) => any) => {
      handlers[ev] = fn;
    },
    registerCommand: (name: string, def: { description: string; handler: (...a: any[]) => any }) => {
      commands[name] = def;
    },
  } as any);
  return { handlers, commands };
}

test("RULES.md is the moved orchestrator content and is non-empty", () => {
  assert.ok(rulesContent.length > 3000, `RULES.md carries the full orchestrator text (${rulesContent.length} chars)`);
  assert.match(rulesContent, /^# CEO rules \(orchestrator only\)/);
  // The move is complete: the two blocks an earlier pass dropped are here, verbatim.
  assert.ok(rulesContent.includes("# We will follow a rigid testing routine this means:"), "testing routine moved");
  assert.ok(rulesContent.includes("# THings to fix:"), "things to fix moved");
  // Integration's launch line is carried here, not lost: agents run pi inside the sandbox.
  assert.ok(
	rulesContent.includes("`hc run --bg --name <n> --cwd <worktree> tools/sandbox . pi --model ibm-next/qwen38-flash-next --thinking low"),
	"the pi launch line is in RULES.md",
  );
  // Deterministic injected text: no per-run timestamps (a fixed date in the content is fine).
});

test("worktree session (cwd != repo root) injects nothing", async () => {
  const { handlers } = loadExtension();
  await handlers.session_start(null, { cwd: here }); // a worktree dir, not ROOT
  const e = { systemPrompt: "BASE" };
  assert.equal(handlers.before_agent_start(e), undefined, "no injection outside the repo root");
});

test("orchestrator session (cwd == repo root) injects RULES.md verbatim", async () => {
  const { handlers } = loadExtension();
  assert.equal(realpathSync(ROOT), ROOT, "the orchestrator root exists for this check");
  await handlers.session_start(null, { cwd: ROOT });
  const out = handlers.before_agent_start({ systemPrompt: "BASE" });
  assert.equal(out.systemPrompt, `BASE\n\n${injectedRules}`, "rules pasted verbatim after the base prompt");
});

test("the injected prompt is deterministic (identical across two turns)", async () => {
  const { handlers } = loadExtension();
  await handlers.session_start(null, { cwd: ROOT });
  const a = handlers.before_agent_start({ systemPrompt: "BASE" });
  const b = handlers.before_agent_start({ systemPrompt: "BASE" });
  assert.equal(a.systemPrompt, b.systemPrompt, "no timestamps/counters, prefix stays cached");
});

test("a lead cannot reload the runtime mid-session (#83)", async () => {
  const { handlers } = loadExtension();
  await handlers.session_start(null, { cwd: ROOT }); // the orchestrator
  const d = await handlers.tool_call({ toolName: "reload_runtime", input: {} });
  assert.equal(d.block, true, "reload_runtime is blocked for a lead");
  assert.match(d.reason, /^A lead does not call reload_runtime\. Run tools\/extcheck/);
  // an agent in a worktree is not a lead, so nothing is blocked for it
  const { handlers: h2 } = loadExtension();
  await h2.session_start(null, { cwd: here });
  assert.equal(await h2.tool_call({ toolName: "reload_runtime", input: {} }), undefined, "no guard in a worktree");
});

test("/ceo-rules-check reports OK on the orchestrator, MISSING in a worktree", async () => {
  const { handlers, commands } = loadExtension();
  assert.ok(commands["ceo-rules-check"], "the command is registered");

  // Orchestrator: an agent turn that ran through before_agent_start carries the rules.
  await handlers.session_start(null, { cwd: ROOT });
  const orchPrompt = handlers.before_agent_start({ systemPrompt: "BASE" }).systemPrompt;
  let note: string = "";
  await commands["ceo-rules-check"].handler("", { getSystemPrompt: () => orchPrompt, ui: { notify: (m: string) => (note = m) } });
  assert.match(note, /^OK: CEO rules injected/, "orchestrator carries the rules");

  // Worktree: no injection, so the check reports MISSING.
  const { handlers: h2, commands: c2 } = loadExtension();
  await h2.session_start(null, { cwd: here });
  const wtPrompt = h2.before_agent_start({ systemPrompt: "BASE" })?.systemPrompt ?? "BASE";
  let note2: string = "";
  await c2["ceo-rules-check"].handler("", { getSystemPrompt: () => wtPrompt, ui: { notify: (m: string) => (note2 = m) } });
  assert.match(note2, /^MISSING: CEO rules not in the system prompt/, "worktree does not carry the rules");
});
