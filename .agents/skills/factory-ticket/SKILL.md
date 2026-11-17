---
name: factory-ticket
description: "Write a ticket a fresh small-context agent can finish without help: one change, exact files, numbered steps, runnable checks. Use for every Task/Bug that an agent will get."
---
The agent sees only: title, body, last HANDOFF. No AGENTS.md, no skills, no factory docs, no memory, no other tickets.
So the body must stand alone. Write it for a reader who has never seen this project.

## Size
- One ticket = one change, max 3 files, finishable in ~20 tool calls. Size XS or S only.
- Bigger = Feature/Epic. Never dispatched; split it into Tasks first.
- If you need "and" in the title, it is two tickets.

## Template (body)
```
Files: path/a.ts, path/b (new)
## Why
One or two plain sentences: what is wrong or missing, with the evidence (error line, command output).
## Do
1. One concrete action: which function/flag/line, what to change it to.
2. ... (max 5 steps)
## Context
Only facts the agent cannot see: paste the 2–5 relevant lines (API signature, snippet, doc path:line).
## Done when
- Verify: `exact command` -> expected output
## Not in scope
- What to leave alone.
```

## Rules
- Plain sentences. No arrow chains, no slash lists, no abbreviations, no project jargon (runner, lead, wt finish, digest).
- No pointers the agent cannot follow: no "see factory/x.md", "skill X", "as in #99". Paste the needed lines instead.
- Verify lines run inside the sandbox: no network, no GitHub, no CI. Prefer one test or one script call with exact expected output.
- Dependencies and parents go in board fields, not in the body.
- The body is the only truth. A changed decision = edit the body (`tools/gh-bot issue edit N -F file`), not a comment.
- Leads' design notes belong in the Feature/Epic body, never in a Task.

## Create / update
- Write the body to a `factory/tk-*.md` file, then via factory-bg: `tools/ticket new -t <title> -k Task|Bug -p <parent> -l area:<x> -s Ready -P P0..P2 -S XS|S -b - < file`; delete the file after.
- `tools/ticket set N -s <status> [-P ..] [-S ..]`. needs:patrick: body starts `## Action for Patrick`.
- Known bug: fields sometimes unset (GraphQL parse); re-run `tools/ticket set`.

## Quality is measured
Ticket quality = first-pass finish rate, tool calls and tokens per ticket in the usage ledger. A ticket needing 2+ handoffs was too big: split it, note the lesson here.
