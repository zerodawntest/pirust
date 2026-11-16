---
name: factory-ticket
description: Create or update a board ticket with tools/ticket (fields, scope, Verify lines). Use when work must be handed to an agent.
---
- `tools/ticket new -t <title> -k Task|Bug|Feature|Epic -p <parent> -l area:<x> -s Ready|Backlog -P P0..P2 -S XS..L -b "<body>"` prints the number. Run it via factory-bg.
- Body: line 1 `Files: <paths>` (agent-guard scope); problem with evidence; `## Acceptance` with runnable `- Verify: <cmd> -> <expected>` lines.
- `tools/ticket set N -s <status> [-P ..] [-S ..]`; comment: `tools/gh-bot issue comment N -b ".."`.
- needs:patrick label assigns Patrick; body starts `## Action for Patrick`.
- Known bug: fields sometimes unset (GraphQL parse); re-run `tools/ticket set`.
