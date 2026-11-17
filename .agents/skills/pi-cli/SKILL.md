---
name: pi-cli
description: "Pi command-line interface: modes (text/print/json/rpc), model + thinking flags, tool flags, session flags, resource loading. Use when launching pi from a script, choosing an output mode, or setting --model/--tools/--session. For the RPC/SDK wire details see skills pi-drive; for hook behavior see pi-hooks."
---
Docs: `/nix/store/w3j2zc6sidwg028h4b1wqw6yillkf9jm-pi-1.5.1/libexec/pi/docs` (D). Binary is `pi`, never `pig`. Run `pi --help` for the exact installed interface (D/cli.md:5).

## Modes (D/cli.md:23-53, D/quickstart.md:41)
- `pi` → terminal UI. `pi -p/--print "…"` → run prompts, write final assistant text to stdout, exit (D/cli.md:47).
- `pi --mode json "…"` → JSONL events on stdout, exit when prompts finish (D/cli.md:49, D/json.md:5). stdout is protocol-only; logs go to stderr (D/json.md:19).
- `pi --mode rpc` → JSONL commands in, responses+events out, until shutdown (D/cli.md:50). See pi-drive for the command set.
- `--mode text` does NOT force one-shot when stdin+stdout are TTYs; use `--print` for that (D/cli.md:43).
- Print-mode example: `pi --mode json "List files" 2>/dev/null | jq -c 'select(.type=="message_end")'` (D/json.md:225).

## Models + thinking (D/cli.md:55-77)
- `--model <pattern>` accepts `provider/id` and optional `:<thinking>` (e.g. `sonnet:high`); `--thinking off|minimal|low|medium|high|xhigh|max` overrides the suffix and is clamped to the model (D/cli.md:60,72).
- `--provider <name>` restricts `--model` lookup; requires `--model` (D/cli.md:65). `--api-key` is a non-persistent override; requires a `--model`/`--models` selection (D/cli.md:69).
- `--models <csv>` sets the startup/cycling scope; `--list-models [search]` lists then exits (D/cli.md:73-76).

## Tools (D/cli.md:113-159)
- Default enabled tools: `read, bash, edit, write` (D/cli.md:129). `--tools a,b` replaces the set (name every tool you want); `--tools +x,-y` adds/removes from the default (D/cli.md:122,130).
- `--no-builtin-tools` keeps extension/custom tools, drops built-ins; `--no-tools` disables everything (D/cli.md:125-128).
- Enable codemode for all sessions: `"defaultTools": ["+codemode"]` in settings, or `pi --tools +codemode` for one run (D/cli.md:162-173).

## Sessions (D/cli.md:80-109, D/sessions.md:5-14)
- `--continue`/`-c` = most recent session for the CWD; `--resume`/`-r` = picker; `--session <path|id>` opens one; `--session-id <id>` opens-or-creates a fixed ID; `--fork <path|id>` branches into a new session in the current dir; `--no-session` = ephemeral (D/cli.md:83-101).
- `--fork` is incompatible with `--session`/`--continue`/`--resume`/`--no-session` (D/cli.md:108). `--session-dir <dir>` overrides storage; wins over `PI_CODING_AGENT_SESSION_DIR` and the `sessionDir` setting (D/cli.md:98).

## Resources (D/cli.md:188-219)
- `-e/--extension <p>` loads an extension file/dir or a built-in like `builtin:mcp` (repeatable); `-ne/--no-extensions` disables discovered+configured+built-in (explicit `-e` still loads) (D/cli.md:196-199).
- `--skill <p>`, `--prompt-template <p>`, `--theme <p>` (+ `--no-*`) load one resource type; paths are per-process, relative to CWD (D/cli.md:202-219).
- `--system-prompt <text|path>` replaces; `--append-system-prompt <text|path>` appends (repeatable) (D/cli.md:231-234). `-a/--approve` trusts project resources for this process; `-na/--no-approve` ignores them; `--offline` == `PI_OFFLINE=1` (D/cli.md:239-244).
