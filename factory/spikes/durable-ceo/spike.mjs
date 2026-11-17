// Spike #78: smallest node prototype of the CEO daemon on pi-durable.
//
// Scope: one conversation, a wake task, reset(handoff), usage read.
//
// Reality check (see ../durable-ceo.md): the `@earendil-works/pi-durable`
// package named in docs/port/durable-inventory.md is NOT installed in this
// sandbox, so this prototype runs on the only session stack that IS installed:
// the SDK (`@earendil-works/pi-coding-agent`) `createAgentSession` +
// `SessionManager` (JSONL). It implements the same four features on that stack
// and records the gaps. `run.sh` symlinks the SDK in and drives the runs.

import { createAgentSession, SessionManager } from "@earendil-works/pi-coding-agent";
import { readFileSync, writeFileSync } from "node:fs";

const HERE = new URL("./", import.meta.url).pathname;
const SESSION_DIR = HERE + "sessions";
const JOURNAL = HERE + "wake-journal.json";

const MODE = process.argv[2]; // "first" | "recover"

const PROMPT1 =
  "Use the bash tool to run exactly this shell command: `sleep 3 && ls`. " +
  "List the files you see. Then reply DONE.";
const CONTINUE =
  "Your previous turn was interrupted before you finished. " +
  "Run the `sleep 3 && ls` command now and list the files.";
const WAKE_PROMPT = "A scheduled wake fired. Reply with exactly: WAKE-OK";
const HANDOFF_PROMPT = "What is 123 + 4? Reply with only the number.";

function log(...a) {
  console.log(...a);
}

// Rebuild the model conversation (role: text) from persisted entries, the same
// way the SDK does for context, to prove what a restart sees.
function buildContext(sm) {
  return sm
    .buildSessionContext()
    .messages.map(
      (m) =>
        `${m.role}: ${(m.content || [])
          .filter((c) => c.type === "text")
          .map((c) => c.text)
          .join("")
          .replace(/\s+/g, " ")
          .trim()}`,
    );
}

async function main() {
  const sm =
    MODE === "recover"
      ? SessionManager.open(readFileSync(JOURNAL, "utf8").trim())
      : SessionManager.create(process.cwd(), SESSION_DIR);

  const { session } = await createAgentSession({
    sessionManager: sm,
    tools: ["read", "bash"],
  });

  // Capture the first model request's messages (the D-GEN "one request" view).
  let firstReq = null;
  session.subscribe((e) => {
    if (e.type === "provider_request" && !firstReq) {
      firstReq = (e.messages || [])
        .filter((m) => m.role !== "system")
        .map((m) => {
          const t = (m.content || [])
            .filter((c) => c.type === "text")
            .map((c) => c.text)
            .join("");
          return `${m.role}: ${t.replace(/\s+/g, " ").trim()}`;
        });
    }
  });

  // A "wake" here = a scheduled instruction the host arms with a platform
  // timer (inventory U4/D-WAKE): a prompt fired later by setTimeout.
  async function armWake() {
    await new Promise((r) => setTimeout(r, 2000));
    log("[wake] scheduled instruction fires");
    await session.prompt(WAKE_PROMPT);
    log("[wake] scheduled answer:", session.getLastAssistantText());
  }

  // reset(handoff): a new conversation whose first model request carries ONLY
  // the handoff + the prompt (inventory: createReplacedSessionContext / U1).
  async function resetWithHandoff() {
    const handoff =
      "HANDOFF (from the previous conversation): you ran `sleep 3 && ls` and answered 2+2=4. Summary ends here.";
    const fresh = SessionManager.create(process.cwd(), SESSION_DIR);
    const { session: s2 } = await createAgentSession({
      sessionManager: fresh,
      tools: ["read", "bash"],
    });
    let req = null;
    s2.subscribe((e) => {
      if (e.type === "provider_request" && !req) {
        req = (e.messages || [])
          .filter((m) => m.role !== "system")
          .map(
            (m) =>
              `${m.role}: ${(m.content || [])
                .filter((c) => c.type === "text")
                .map((c) => c.text)
                .join("")
                .replace(/\s+/g, " ")
                .trim()}`,
          );
      }
    });
    // Append the handoff WITHOUT starting a turn, so the first request is
    // [handoff, prompt] only.
    await s2.sendCustomMessage(
      { customType: "handoff", content: handoff, display: true, details: {} },
      { triggerTurn: false },
    );
    await s2.prompt(HANDOFF_PROMPT);
    log("[handoff] first request messages =", JSON.stringify(req));
    const ok =
      req &&
      req.length === 2 &&
      req[0].startsWith("custom: HANDOFF") &&
      req[1].startsWith("user:");
    log("[handoff] first request has ONLY handoff+prompt:", ok ? "YES" : "NO");
    s2.dispose();
    return { ok, req };
  }

  if (MODE === "first") {
    writeFileSync(JOURNAL, sm.getSessionFile() ?? "");
    log("[run:first] session:", sm.getSessionFile());
    await session.prompt(PROMPT1); // killed -9 mid-turn by run.sh
    await armWake();
    await resetWithHandoff();
  } else {
    // recover: reopen the SAME persisted conversation.
    log("[run:recover] reopened:", sm.getSessionFile());
    const hist = buildContext(sm);
    const cut =
      hist.length > 0 &&
      hist[hist.length - 1] ===
        `user: ${PROMPT1.replace(/\s+/g, " ").trim()}`;
    log(
      cut
        ? "[run:recover] recovered: last saved message is the unanswered user prompt"
        : "[run:recover] UNEXPECTED tail:",
      hist.slice(-3),
    );
    await session.prompt(CONTINUE);
    await armWake();
    await resetWithHandoff();
  }

  // usage read (D-USAGE)
  const s = session.getSessionStats();
  const cu = session.getContextUsage();
  log("[usage] tokens=", JSON.stringify(s.tokens), "context=", JSON.stringify(cu));

  session.dispose();
}

main().catch((e) => {
  console.error("SPIKE ERROR:", e);
  process.exit(1);
});
