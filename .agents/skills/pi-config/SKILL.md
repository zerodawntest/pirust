---
name: pi-config
description: "Where pi reads settings, credentials, model catalogs, and context files (agent dir + project .pi), which file wins, and the env vars that configure a pi process. Use when locating settings.json/auth.json/models.json, editing context files, or setting PI_* env vars."
---
Docs: `/nix/store/w3j2zc6sidwg028h4b1wqw6yillkf9jm-pi-1.5.1/libexec/pi/docs` (D).

## Two config scopes (D/configuration.md:3)
- User config lives in the **agent dir** (default `~/.pi/agent`; override with `PI_CODING_AGENT_DIR`) (D/configuration.md:9,11-24).
- Project config lives in `.pi` under the working dir and loads only after project trust (see pi-security). Only exception: `sessionDir`, read before trust so sessions can be located (D/configuration.md:3).
- Project settings override agent-dir settings; resource lists are combined (D/settings.md:3). For `SYSTEM.md`/`APPEND_SYSTEM.md` the trusted project file wins; same-named files are NOT merged (D/configuration.md:39).

## Agent-dir files (D/configuration.md:11-24)
- `settings.json` — settings + resource paths + package declarations. `keybindings.json`. `mcp.json` (see pi-mcp). `models.json` — custom endpoints/models (see pi-models). `auth.json` — API keys + OAuth creds (keep private, never commit — D/models.md:25).
- `AGENTS.override.md`/`AGENTS.md`/`CLAUDE.md` — user instructions. `SYSTEM.md` replaces the system prompt; `APPEND_SYSTEM.md` appends. `extensions/`, `skills/`, `prompts/`, `themes/`.

## Context files (D/configuration.md:41-47, D/quickstart.md:100)
- `AGENTS.md`/`CLAUDE.md` load from the agent dir, the working dir, and every parent; a file applies in its dir and below. `AGENTS.override.md` replaces `AGENTS.md`/`CLAUDE.md` only in the same dir. Discovery does NOT require project trust. Disable with `--no-context-files` (D/cli.md:216).
- Run `/reload` after manually editing settings, keybindings, instructions, or resources (D/configuration.md:5).

## Key settings (D/settings.md)
- Models: `defaultProvider`, `defaultModel`, `defaultThinkingLevel` (default `medium`), `modelThinkingLevels` (per `provider/modelId`), `enabledModels` (same format as `--models`) (D/settings.md:11-18).
- Tools: `defaultTools` — plain names replace the set, `+x`/`-y` add/remove; `["+codemode"]` keeps defaults and adds codemode (D/settings.md:42-54). `codemode.mode` (`on`|`only`) and `codemode.inlineBudget` (D/settings.md:43-44).
- Compaction: `compaction.enabled/reserveTokens(16384)/keepRecentTokens(20000)` + `modelOverrides` (D/settings.md:69-79; semantics in pi-sessions).
- Session: `sessionDir`, `sessionShareDestination` (`auto`|`gist`|`radius`) (D/settings.md:66-67).
- **Agent-dir-only settings** (cannot be set at project level): `defaultProjectTrust`, `httpProxy`, `selfUpdateCommand` (D/settings.md:36,125,145).
- `"$schema": "https://pi.dev/schemas/settings.schema.json"` enables editor validation (D/settings.md:5).

## Process env vars (D/environment-variables.md)
- Configures pi: `PI_CODING_AGENT_DIR`, `PI_CODING_AGENT_SESSION_DIR`, `PI_PACKAGE_DIR` (Nix/Guix), `PI_OFFLINE`, `PI_SKIP_VERSION_CHECK`, `PI_SELF_UPDATE_COMMAND`, `PI_TELEMETRY`, `PI_CODEMODE_MAX_WORKERS` (default 2), `PI_CACHE_RETENTION=long`, `PI_CLEAR_ON_SHRINK`, `PI_HARDWARE_CURSOR`, `PI_IMAGE_PROTOCOL`, `PI_TRUE_COLOR`, `PI_TUI_ESC_TIMEOUT` (D/env:81-99).
- Session env handed to LLM `bash`/`powershell` tools (resolved at each command start; NOT injected into user `!`/`!!` commands): `PI_SESSION_ID`, `PI_SESSION_FILE` (unset for ephemeral), `PI_PROVIDER`, `PI_MODEL`, `PI_REASONING_LEVEL` (D/environment-variables.md:20-49).
- Detect pi as your launcher: `AI_AGENT=pi` + `PI_CODING_AGENT=true` (set by CLI/RPC entrypoints, inherited by children; NOT set when embedded via SDK) (D/environment-variables.md:11-18).
