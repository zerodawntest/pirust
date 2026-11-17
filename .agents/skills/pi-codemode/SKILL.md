---
name: pi-codemode
description: "Pi's codemode tool: a JS script that calls other pi tools and runs classifier/image models in one turn, with only the script output reaching the model. Use when a task needs many tool calls (often parallel) or a non-chat model. Enable with defaultTools [\"+codemode\"]."
---
Docs: `/nix/store/w3j2zc6sidwg028h4b1wqw6yillkf9jm-pi-1.5.1/libexec/pi/docs` (D). Enable: `pi --tools +codemode` (one run) or `"defaultTools":["+codemode"]` in settings (D/cli.md:160-176). Tool input is RAW JS (not JSON, not a code fence) run as an async function body in a QuickJS sandbox — top-level `await`/`return` work; no Node APIs, fs, net, timers (D/codemode.md:5-7).

## Globals (D/codemode.md:20-35)
- `tools.<name>(args)` — call a tool; non-identifier chars in the name → `_` (MCP tool `mcp__a-b__x` → `tools.mcp__a_b__x`). `bash` resolves to `{output,truncated,full_output_path?,exit_code,…}` (output up to 1 MiB, not the 2000-line/50KB the model sees). `read` of an image returns an image block for `image()`.
- `text(v)` add text item; `image(block)` add image (also saves a temp file, path shown); `console.log(...)` adds to a `<console_output>` block; top-level `return v` = `text(v)`; `exit()` ends successfully.
- `store(key,val)`/`load(key)` — small JSON across codemode calls (persists in session; per-branch). Cap: one value ≤262144 JSON chars, all ≤1048576; do NOT store images (use `image()`).
- `ALL_TOOLS` (every callable tool `{name,description}`), `searchTools(query,{limit?,namespace?})` (BM25, default 8), `describeTool(name)`, `describeNamespace(name)`.
- `models` — list/run non-chat models: `getAvailableOfType(type)`, `getModelOfType(type,provider,id)`, `classify(model,{state,questions})`, `generateImages(model,{input})` (see pi-models).

## Options + result (D/codemode.md:9-18)
- Optional first line only: `// @options: {"max_output_tokens":2000,"timeout_ms":60000}`. `max_output_tokens` default 10000 (overflow keeps start+end, full text in a temp file); `timeout_ms` is a hard deadline incl. worker wait (unset by default; don't set it short for image generation — minutes).
- Result starts `Script completed`/`Script failed` + wall time + output. Multiple `text()`/`return` items each get a `==> text N/M <==` header; `<console_output>` at the end. A failed script keeps partial output then `Script error:`. Tool calls before a failure are NOT undone; unawaited promises are dropped.

## Limits (D/codemode.md:224-230)
- 256 MB VM → `InternalError: out of memory`; aggregate/filter large data, write big data to a file. ≤2 codemode workers alive per process (`PI_CODEMODE_MAX_WORKERS`); a script with no free worker for 60s (or past `timeout_ms`) fails. Scripts cannot start other codemode scripts. A promise that can never settle fails immediately (no timers).
- Use `Promise.allSettled()` for parallel calls so one failure doesn't drop the rest (D/codemode.md:48). Codemode is useful without MCP: parallel tool calls, filter large output, run classifiers/images (D/cli.md:176).
