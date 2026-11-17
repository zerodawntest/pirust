// Unit tests for .pi/extensions/ceo-flow.ts:  node --test test/ceo-flow.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, utimesSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { scanLoops, retroOwed, board } from "../.pi/extensions/ceo-flow.ts";

const old = (d: string) => { for (const f of readdirSync(d)) utimesSync(`${d}/${f}`, 1, 1); };
function fixture() {
	const dir = mkdtempSync(`${tmpdir()}/ceo-flow-`);
	const mk = (name: string, files: Record<string, string>) => {
		mkdirSync(`${dir}/${name}`);
		for (const [f, c] of Object.entries(files)) writeFileSync(`${dir}/${name}/${f}`, c);
		old(`${dir}/${name}`);
	};
	mk("failed", { "state.json": '{"stage":"research","round":1,"fix":[]}' });
	mk("passed", { "ledger.jsonl": '{"stage":"review","round":1,"score":8,"exit":0}\n{"stage":"verify","round":1,"score":9,"exit":0}\n', "review.json": '{"verdict":"pass","score":9}' });
	mk("live", { "state.json": '{"stage":"write","round":2,"fix":[]}', "ledger.jsonl": '{"stage":"research","round":1,"score":null,"exit":0}\n' });
	mk("fresh", { "state.json": '{"stage":"research","round":1,"fix":[]}' });
	utimesSync(`${dir}/fresh/state.json`, new Date(), new Date());
	return dir;
}

test("scanLoops classifies ended, passed, running", () => {
	const ls = scanLoops(fixture(), new Set(["live"]));
	const by = Object.fromEntries(ls.map((l) => [l.name, l]));
	assert.equal(by.failed.ended, true);
	assert.equal(by.failed.passed, false);
	assert.equal(by.failed.key, "loop:failed r0");
	assert.equal(by.passed.passed, true);
	assert.deepEqual(by.passed.scores, [8, 9]);
	assert.equal(by.live.running, true);
	assert.equal(by.live.ended, false);
	assert.equal(by.fresh.running, true);
});

test("retro owed until a matching changes.md block exists", () => {
	const ls = scanLoops(fixture(), new Set());
	assert.deepEqual(retroOwed(ls, "").map((l) => l.name), ["failed", "live", "passed"]);
	assert.deepEqual(retroOwed(ls, "## loop:failed r0\nx\n## loop:live r1\n## loop:passed r2\n").map((l) => l.name), []);
	assert.match(board(ls, ""), /failed: ENDED .*RETRO OWED/);
});
