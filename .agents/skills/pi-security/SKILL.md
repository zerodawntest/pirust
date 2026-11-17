---
name: pi-security
description: "Run pi safely: model-generated commands are untrusted and run with your permissions with no per-call approval. Covers isolation (container/VM), project trust, prompt injection, credential scoping, and reviewing exports. Use before any unattended/untrusted automation."
---
Docs: `/nix/store/w3j2zc6sidwg028h4b1wqw6yillkf9jm-pi-1.5.1/libexec/pi/docs` (D).

## Core model (D/security.md:3-8)
- Treat model-generated commands/code as untrusted. pi reads/changes/executes files with the starting account's permissions and does NOT ask before every tool call. Extensions, package installers, language servers, child processes share those rights.
- Prompt injection: files, comments, instructions, command output, and model responses can steer the model. Project trust gates which PROJECT resources load at startup; it does NOT make loaded content safe. Watching the transcript / trust / reviewing diffs do NOT create a security boundary.

## Isolation (D/security.md:9-24)
- Run pi entirely inside a container/VM/sandbox → host files+processes you don't expose stay protected (usually the strongest option). Run only its built-in tools inside → narrower (pi + extensions stay outside the boundary).
- The working folder controls resource discovery + default tool location, NOT what commands can access. Keep credentials out, use short-lived scoped creds, restrict network. See `docs/containerization.md` (not distilled here).

## Project trust (D/security.md:25-58)
- Controls whether pi loads most settings/resources a working dir supplies — prevents a folder silently loading executable extensions before you approve. It is NOT a complete startup boundary: `sessionDir` is read before trust; and after startup, tools still use the process's OS permissions.
- Trust-gated (from CWD): `.pi/settings.json`, `.pi/mcp.json`, `.pi/{extensions,skills,prompts,themes}`, `.pi/SYSTEM.md`/`APPEND_SYSTEM.md`, and project `.agents/skills` (current dir or ancestor). A bare `.pi` dir needs no trust. Context files (`AGENTS.md`, `CLAUDE.md`) load REGARDLESS of trust — treat them as untrusted input.
- Decision order: CLI `--approve`/`--no-approve` first; then a `project_trust`-handling extension (first to answer owns it); then a saved decision for this dir/ancestors in `~/.pi/agent/trust.json`; then `defaultProjectTrust` (default `ask`). `/trust` saves a decision.
- Print/JSON/RPC can't show the trust prompt: `defaultProjectTrust:"always"` loads protected resources, `"ask"`/`"never"` skips. Use `--approve`/`--no-approve` for a one-time automated decision.

## Reduce impact (D/security.md:84-98)
- Grant only needed files/services; use version control/backups before big changes; review extensions+packages (they execute in-process); prefer narrow/short-lived creds; review diffs and sessions before applying/sharing.
- `/bug` (see pi-sessions, D/sessions.md:70) and `/export`/`/share` can expose credentials — review first. Security reports: follow the repo SECURITY.md, not a public issue. Expected local-agent behavior + prompt injection are OUTSIDE pi's security boundary unless a real privilege boundary is crossed.
