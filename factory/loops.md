# Loops: script-driven, gated, until it is good (Patrick 2026-11-17)

Every piece of work above one ticket goes through a loop. A script runs it; each stage is a fresh pi agent with one role, a small input and one output file. Gates decide: forward, back, or stop.

## Researched
- pi has no loop runner. The subagent example (`examples/extensions/subagent`) does chains (`{previous}`), but an LLM drives them, they are linear, and they stop at the first failure. There is no gate and no loop back.
- What we use from it: role files as frontmatter (`tools`, `model`) plus a system prompt. A stage is isolated in its own pi process. Usage is counted per step.
- We enforce read-only roles with `--tools read,grep,find,ls`, not with prompt text.

## Shape
| Field | Meaning |
|---|---|
| stage | id, role (template), thinking, `--tools` allowlist, inputs (files), output (one file), prompt (2–4 lines) |
| gate | a review stage writes `review.json` `{"verdict":"pass"\|"revise","score":0-10,"issues":["..."]}`; the script checks it with jq |
| back | on `revise`: jump to the named stage with `review.json` as extra input |
| stop | pass, or `max_rounds` reached, or the score did not rise for 2 rounds (converged). Then the best round wins; if the score is still < 7, the script sets Blocked + `needs:patrick` |
| state | `~/.pig/loops/<name>/state.json` + artifacts; resumable after a crash (durable) |
| ledger | one usage row per stage: stage, round, score, tokens |

## Milestone loop (first one)
`research → write → review(gate, back: research, max 3) → architect → write → review(gate, max 2) → assess → write → review(gate, max 2) → break → verify(gate, back: break, max 3) → create tickets`

| Stage | Role | Tools | Output |
|---|---|---|---|
| research | researcher | read,grep,find,ls,bash | research.md: facts with `file:line`, open questions |
| write | writer | read,write | milestone.md: goal, scope, done-when (max 60 lines) |
| review | reviewer | read,grep,find,ls | review.json |
| architect | architect | read,grep,find,ls,write | adr.md: decision, options, consequences |
| assess | assessor | read,grep,find,ls,bash | assessment.md: files touched, risks, token/cost estimate, test plan |
| break | planner | read,write | TICKETS.md in the factory-ticket format |
| verify | script + reviewer | read | each ticket passes `tools/ticket lint`; the reviewer checks that each one can be done standalone |

## Improving the loop itself
After each run: the ledger gives rounds per gate, score per round and tokens per stage. A gate that always passes in round 1 is dead weight, so drop it. A gate that hits max_rounds means the stage prompt or role is weak, so fix it and re-run the eval.
