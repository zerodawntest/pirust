// Unit tests for the event router (tools/event-route), run with:
//   node --test test/event-route.test.ts
// The router is a shell script; every helper it calls (`wt`, `ticket`, `gh`, `hc`, `curl`) is a shim
// in a temp dir that records its arguments, so no git, GitHub, herdr, LLM or chat session is touched.
// Ticket #107: each event type maps to its action, and an agent event never wakes the CEO chat
// (that terminal is `t1nm`, woken with `hc send t1nm ...`).

import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const ROUTE = resolve(here, "../tools/event-route");
const wtSrc = readFileSync(resolve(here, "../tools/wt"), "utf8");
const ghEventsSrc = readFileSync(resolve(here, "../.pi/extensions/gh-events.ts"), "utf8");

interface RunOpts {
  /** stdout of the `wt finish` shim, e.g. `pr=51` or `rebase-conflict a.rs,b.rs`. */
  finishOut?: string;
  /** exit code of the `wt finish` shim (2 = rebase conflict). */
  finishStatus?: number;
  /** reuse a state dir, so the refresh counter of a handoff ladder accumulates. */
  state?: string;
}

/** `f` in the state dir, "" when the router did not write it. */
const readOr = (p: string) => {
  try {
    return readFileSync(p, "utf8");
  } catch {
    return "";
  }
};

/** One run of the real router with shims on PATH: stdout, stderr, every recorded call, state dir. */
function run(args: string[], opts: RunOpts = {}) {
  const root = mkdtempSync(join(tmpdir(), "event-route-"));
  const bin = join(root, "bin");
  const state = opts.state ?? join(root, "state");
  mkdirSync(bin);
  mkdirSync(state, { recursive: true });
  const log = join(root, "calls.log");
  writeFileSync(log, "");
  const shim = (name: string, body = "") => {
    const p = join(bin, name);
    // `set -u` and no `"$@"` expansion in the record line: one line per call, args space separated.
    writeFileSync(p, `#!/usr/bin/env bash
set -u
{ printf '${name}'; for a in "$@"; do printf ' %s' "$a"; done; printf '\\n'; } >>"$EVENT_ROUTE_LOG"
${body}
exit 0
`);
    chmodSync(p, 0o755);
  };
  const env = {
    ...process.env,
    PATH: `${bin}:${process.env.PATH}`,
    EVENT_ROUTE_LOG: log,
    WT: join(bin, "wt"),
    TICKET: join(bin, "ticket"),
    GH: join(bin, "gh"),
    PIRUST_STATE_DIR: state,
    HOME: join(root, "home"),
    FINISH_OUT: opts.finishOut ?? "pr=51",
    FINISH_STATUS: String(opts.finishStatus ?? 0),
  };
  // `wt finish` prints `pr=<n>` on success; on a rebase conflict `rebase-conflict <files>` with exit 2.
  shim("wt", 'case $1 in\n  finish) if [ "$2" = 40 ]; then echo "$FINISH_OUT"; exit "$FINISH_STATUS"; fi\nesac');
  shim("ticket", "case $1 in\n  new) echo 120 ;;\nesac");
  shim("gh", `if [ "$#" -ge 2 ] && [ "$1" = api ]; then
  case "$2" in
    repos/zerodawntest/pirust/pulls/51)
      case "$4" in
        .body) echo 'Ticket #40 fix x. Closes #40' ;;
        .head.sha) echo deadbeef0123 ;;
      esac ;;
    "repos/zerodawntest/pirust/actions/runs?head_sha=deadbeef0123&per_page=100") echo 9001 ;;
    repos/zerodawntest/pirust/actions/runs/9001/jobs) echo 7001 ;;
    repos/zerodawntest/pirust/actions/jobs/7001) echo build-rust ;;
    repos/zerodawntest/pirust/actions/jobs/7001/logs) echo http://127.0.0.1:1/nope ;;
  esac
fi`);
  shim("curl", `echo 'Executing "cargo test -p x"'
echo 'error: the build failed'`);
  shim("hc");
  const r = spawnSync(ROUTE, args, { env, encoding: "utf8" });
  return { ...r, calls: readFileSync(log, "utf8").split("\n").filter(Boolean), state };
}

test("agent done with a PR: review queue and In review, no chat wake", () => {
  const r = run(["agent-done", "40"]);
  assert.equal(r.status, 0, r.stderr);
  assert.equal(r.stdout.trim(), "agent #40 done: PR #51 in the review queue, ticket In review");
  assert.ok(r.calls.includes("wt finish 40"), "the router runs wt finish, which sets the ticket In review");
  assert.equal(readOr(join(r.state, "review-queue")), "PR #51 ticket #40\n");
  assert.equal(readOr(join(r.state, "driver-queue")), "");
  assert.deepEqual(r.calls.filter((c) => c.startsWith("send ") || c.includes("send t1nm")), [], "an agent event never wakes the CEO chat");
  // `wt finish` does the ticket work itself: posts the handoff, sets the board status.
  assert.match(wtSrc, /"\$D\/gh-bot" issue comment "\$N" -b "Handoff: /, "wt finish posts the handoff on the ticket");
  assert.match(wtSrc, /"\$D\/ticket" set "\$N" -s "In review"/, "wt finish sets the ticket In review");
});

test("agent done, wt finish conflict: refresh, ticket Ready, files on the ticket", () => {
  const r = run(["agent-done", "40"], { finishOut: "rebase-conflict tools/a.rs,tools/b.rs", finishStatus: 2 });
  assert.equal(r.status, 0, r.stderr);
  assert.equal(r.stdout.trim(), "wt refresh #40: conflicts in tools/a.rs,tools/b.rs, ticket Ready");
  assert.ok(r.calls.includes("wt refresh 40"), "the conflict refreshes the worktree (#99)");
  assert.ok(r.calls.includes("ticket set 40 -s Ready"), "the ticket goes Ready for a fresh agent");
  assert.ok(r.calls.some((c) => c.startsWith("gh issue comment 40 -b wt refresh: rebase conflicts in tools/a.rs,tools/b.rs.")), "the files are on the ticket");
  assert.match(wtSrc, /^refresh\)$/m, "tools/wt has the refresh command");
});

test("wt-conflict: refresh, ticket Ready, comment files", () => {
  const r = run(["wt-conflict", "60", "tools/x.rs,tools/y.rs"]);
  assert.equal(r.status, 0, r.stderr);
  assert.equal(r.stdout.trim(), "wt refresh #60: conflicts in tools/x.rs,tools/y.rs, ticket Ready");
  assert.ok(r.calls.includes("wt refresh 60"));
  assert.ok(r.calls.includes("ticket set 60 -s Ready"));
  assert.ok(r.calls.some((c) => c.startsWith("gh issue comment 60 -b wt refresh: rebase conflicts in tools/x.rs,tools/y.rs.")));
});

test("killed: handoff ladder, refresh count, 3rd blocks with needs:split", () => {
  const one = run(["killed", "52", "budget 300k"]);
  assert.equal(one.status, 0, one.stderr);
  assert.equal(one.stdout.trim(), "agent #52 killed (budget 300k): forced handoff ticket #120, refresh 1/3");
  assert.ok(one.calls.some((c) => c.startsWith("ticket new -t Forced handoff #52 (budget 300k, rung 1/3) -k Task -s Ready -p 52 -b Continue #52:")), "a forced handoff ticket starts a fresh agent");
  assert.equal(readOr(join(one.state, "refresh", "52")).trim(), "1");

  const two = run(["killed", "52", "loop: same tool call 4x"], { state: one.state });
  assert.equal(two.stdout.trim(), "agent #52 killed (loop: same tool call 4x): forced handoff ticket #120, refresh 2/3");
  assert.equal(readOr(join(two.state, "refresh", "52")).trim(), "2");

  const three = run(["killed", "52", "stalled 5 min"], { state: one.state });
  assert.equal(three.stdout.trim(), "agent #52 killed (stalled 5 min) 3rd time: Blocked, needs:split");
  assert.ok(three.calls.includes("gh api repos/zerodawntest/pirust/issues/52/labels -f labels[]=blocked -f labels[]=needs:split"), "the 3rd kill blocks the ticket");
  assert.ok(three.calls.some((c) => c.startsWith("gh issue comment 52 -b agent #52 killed (stalled 5 min) 3 times: Blocked, needs:split.")));
  assert.ok(!three.calls.some((c) => c.startsWith("ticket new")), "the ladder ends at rung 3: no 4th agent is launched");
  assert.equal(readOr(join(one.state, "refresh", "52")).trim(), "3");
});

test("ci-failure: the ticket gets the failing job and the log tail, and goes Ready", () => {
  const r = run(["ci-failure", "51"]);
  assert.equal(r.status, 0, r.stderr);
  assert.equal(r.stdout.trim(), "CI failure on PR #51 -> ticket #40 Ready");
  assert.ok(r.calls.includes("gh api repos/zerodawntest/pirust/pulls/51 --jq .head.sha"), "the failing jobs are found on the PR head commit");
  assert.ok(r.calls.includes('gh api repos/zerodawntest/pirust/actions/runs/9001/jobs --jq .jobs[]|select(.conclusion=="failure")|.id'));
  assert.ok(r.calls.some((c) => c.startsWith("curl -sL http://127.0.0.1:1/nope")), "the log tail comes from the job log");
  assert.ok(r.calls.some((c) => c.startsWith('gh issue comment 40 -b CI failed on PR #51: build-rust. Log tail: === build-rust Executing "cargo test -p x" error: the build failed')), "the ticket comment names the job and the log tail");
  assert.ok(r.calls.includes("ticket set 40 -s Ready"));
  assert.equal(readOr(join(r.state, "driver-queue")), "", "a routed CI failure is not a driver note");
});

test("ci-failure with a job named by the caller: same action, job first", () => {
  const r = run(["ci-failure", "51", "ci.yml"]);
  assert.equal(r.status, 0, r.stderr);
  assert.equal(r.stdout.trim(), "CI failure on PR #51 -> ticket #40 Ready");
  assert.ok(r.calls.some((c) => c.startsWith("gh issue comment 40 -b CI failed on PR #51: ci.yml, build-rust. Log tail:")), "the caller's job is named on the ticket");
  assert.ok(r.calls.includes("ticket set 40 -s Ready"));
});

test("an unhandled event is one line in the driver queue", () => {
  const r = run(["other", "board #40 Status -> Ready"]);
  assert.equal(r.status, 0, r.stderr);
  assert.equal(r.stdout.trim(), "queued for the driver: board #40 Status -> Ready");
  assert.equal(readOr(join(r.state, "driver-queue")), "board #40 Status -> Ready\n");
});

test("no event and an unknown event print the usage and fail", () => {
  for (const args of [[], ["bogus"]]) {
    const r = run(args);
    assert.equal(r.status, 1);
    assert.match(r.stdout, /event-route agent-done NUM \[PR\]/);
    assert.match(r.stdout, /event-route other \[TEXT\]/);
  }
});

test("the router is executable; the extension routes agent events, never a chat wake", () => {
  assert.ok(readFileSync(ROUTE, "utf8").startsWith("#!/usr/bin/env bash"));
  assert.doesNotMatch(ghEventsSrc, /queue\.push\(`agent #/, "an agent event never enters the CEO chat queue");
  assert.ok(ghEventsSrc.includes("${REPO_DIR}/tools/event-route"), "agent events go to the router");
  assert.doesNotMatch(ghEventsSrc, /queue\.push\(`agent #\$\{n\} killed/, "a killed agent is a ticket action, not a chat message");
});
