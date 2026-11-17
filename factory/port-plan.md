# Port plan: how large ports are run (researched 2026-11-17)

## Scale (measured: `~/private/pirust-src/pi/packages/*/src`)
1,055 TS files, ~251k LOC, 1,027 test files. Biggest packages: coding-agent 79k, chord 67k, durable 36k, ai 29k, tui 20k. pi-durable-cloudflare comes on top.
Hand-written tickets per milestone do not scale to this. Every source below agrees on that.

## Sources
- Anthropic, "How Anthropic runs large-scale code migrations with Claude Code" (claude.com/resources/articles/ai-code-migration). Bun's Zig→Rust port and others: "you don't fix the code, you fix the loop"; "the work queue should be mechanical: done = the output file exists on disk"; a build daemon is the only process that rebuilds; small models implement, big models review and write rules.
- Augment, "AI Code Migration" guide: rulebook, dependency map, characterization tests and parity gates come before any translation. Then stress-test on a hard vertical slice before scaling out. Google and AWS work the same way: deterministic tools find the work, the LLM only writes the edits.
- fish 4.0 "Fish of Theseus": port component by component and keep a working program at every stage, so the end-to-end test suite keeps running.
- typescript-go: a port, not a rewrite. Keep the original file and package structure 1:1 so every file has a known counterpart.

## Phases (Features under Epic #36). Code moves the queue; the board shows phase counts.
| # | Phase | Output | Done when (mechanical) |
|---|---|---|---|
| 0 | Rulebook | `port/rules.md`: TS→Rust patterns (types, async, errors, events, modules) | mini-migration passes with zero rule changes |
| 0 | Gap inventory | `port/gaps.md`: what has no direct Rust equivalent (jiti extension loading, dynamic import, npm deps, TypeBox) + the decision for each (ADR) | every gap has a decision |
| 0 | Dependency map | `port/map.json` from a script: file → imports, topological batches, crate per package | script output, no AI |
| 0 | Oracle | parity runner: the same scenario through pi and pirust (`--mode json` / RPC), diff the event streams; plus pi's own tests as a spec | runner diffs pi against pi = 0 |
| 1 | Mini-migration | one hard vertical slice: ai (1 provider) + agent loop + read/bash tools + print mode | slice scenarios: parity 100% |
| 2 | Translate | every file in map order, batches in parallel; unsure → `// TODO(port): reason` | file exists for every map entry |
| 3 | Compile | build daemon runs `cargo check` once over the workspace; errors grouped by class → fixer batches | 0 errors |
| 4 | Tests | ported unit tests sharded; failures → fixer + adversarial reviewer | pass rate per crate |
| 5 | Parity | scenario diffs against pi | 0 diffs, or an accepted improvement ADR |
| 6 | Durable | the same phases 2–5 for pi-durable + cloudflare | as above |

## What this means for the factory
- The unit of work is a **file or batch from the queue**, not a ticket. The queue is rebuilt from disk, compiler errors and test results every run, so it is resumable by construction. That is durable.
- Tickets exist only for exceptions: a rule change, a gap decision, a unit blocked after 2 rounds, an improvement over pi. The board holds the Epic, the phases (Features) and these exceptions. A script posts phase counts to each Feature.
- The same failure repeated across files → amend the rule and regenerate only the files that rule produced. Never patch by hand.
- Factory work freezes except what the phases need: queue script, build daemon, parity runner, implement→review→fix loop (`tools/loop` exists).
- Models: implementers on qwen38-flash-next (low). Rule writers and reviewers on a bigger model, as Anthropic does. That is a model change: `needs:patrick` with a token measurement first.
