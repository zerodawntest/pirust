---
name: pi-mcp
description: "Connect pi to Model Context Protocol servers: configure mcp.json (stdio + streamable HTTP), manage with pi mcp / /mcp commands, OAuth, tool exposure, and resources. Use when adding an MCP server, fixing a connection, or wiring MCP tools for an agent."
---
Docs: `/nix/store/w3j2zc6sidwg028h4b1wqw6yillkf9jm-pi-1.5.1/libexec/pi/docs` (D). SDK sessions don't load built-in MCP; add the extension via the resource loader (D/mcp.md:272, see pi-drive).

## Add + check (D/mcp.md:5-28, D/cli.md:341-354)
- Stdio: `pi mcp add <name> -- <cmd> [args…]` (supports `--env KEY=VAL`, repeatable; `--cwd`). HTTP: `pi mcp add <name> --url <url>` (`--header KEY=VAL`, `--bearer-token-env-var NAME`, OAuth flags). Add `--local`/`-l` for `.pi/mcp.json` (project; needs trust — see pi-security).
- `pi mcp list [--json]` connects every enabled server, prints state+tools+errors, exit 1 if any enabled server isn't connected. `pi mcp login|logout <server>`. These shell commands don't load extensions.
- `/mcp` (interactive) inspects/signs in/reconnects/changes exposure; `/reload` after editing `mcp.json` outside a session (D/mcp.md:28,88).

## Configure (D/mcp.md:30-84)
- Files: `~/.pi/agent/mcp.json` (user), `.pi/mcp.json` (project, after trust). Format `{ "mcpServers": { "<name>": {…} } }`. Stdio uses `command`,`args`,`env`,`cwd`; HTTP uses `url`,`headers`,`oauth`. Legacy SSE transport is NOT supported (use streamable HTTP, often at `/mcp`) (D/mcp.md:62-64,79).
- Server name: only letters, digits, `_`, `-`; tools named `mcp__<server>__<tool>` (non-identifier chars → `_`). Names differing only in `-`/`_` collide (D/mcp.md:77).
- `command` is ONE executable; `args` are separate — not a shell string (D/mcp.md:80). `env`/`headers` support `${NAME}` and a whole-value `!command` (D/mcp.md:81).
- Per-server options: `timeout` (s, default 60; progress notifications reset it), `enabled:false` (keep, don't connect), `exposure`/`toolExposure`, `description` (lists server in system prompt; helps tool search + codemode `describeNamespace`) (D/mcp.md:66-71).

## Runtime (D/mcp.md:94-102, 238-268)
- Servers connect in background at session start; a server's tools appear once it connects. First prompt waits up to 10s only for `direct`-exposure tools; codemode/`tool_search`/resources wait for servers as needed. HTTP network errors + 408/429/5xx retried twice; tool calls are NOT retried (server may have acted) (D/mcp.md:100, D/mcp.md:250).
- Resources: `list_mcp_resources`, `list_mcp_resource_templates`, `read_mcp_resource` (reach every enabled, non-hidden server with resources). `ui://` and `text/html;profile=mcp-app` (MCP Apps) are omitted — pi doesn't render them (D/mcp.md:240-248).
- Every MCP call passes through the tool pipeline, so extension `tool_call`/`tool_result` guards apply; codemode calls carry `parentToolCallId` (D/mcp.md:252-254).
- An installed extension registering `/mcp` (e.g. `pi-mcp-adapter`) REPLACES built-in MCP: pi then ignores `mcp.json` and `/mcp` is the extension's. Disable built-in with `extensions:["-builtin:mcp"]` or `--no-mcp` (D/mcp.md:266-270).
- Diagnose: `pi mcp list`; `/mcp` shows the full connection error + tail of a failed stdio server's stderr; server logs append to `~/.pi/agent/mcp.log` (rolls to `mcp.log.1` past 5 MB) (D/mcp.md:94-98).
