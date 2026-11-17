---
name: pi-models
description: "Choose and authenticate pi models: /login + /model, API-key env vars, credential precedence, custom/compatible endpoints in models.json, and non-chat models (classifiers, image) reached through codemode. Use when wiring credentials, adding a local/proxy endpoint, or calling classifier/image models."
---
Docs: `/nix/store/w3j2zc6sidwg028h4b1wqw6yillkf9jm-pi-1.5.1/libexec/pi/docs` (D).

## Pick a connection (D/models.md:5-13)
- Subscription → `/login`; API key → `/login` (stores in `auth.json`) or set the provider's env var; local GGUF → llama.cpp router (see `docs/llama-cpp.md`, not distilled); OpenAI/Anthropic/Google-compatible endpoint → `models.json`; custom protocol/auth → extension (see pi-custom-provider).
- Interactive: `/login [provider]` then `/model`; `/model` picker shows only models whose provider has usable auth (D/models.md:29, D/quickstart.md:60-66). `Ctrl+P` cycles models, `Shift+Tab` cycles thinking, `Ctrl+S` saves as default (D/models.md:29-33, D/usage.md:48-49).

## Credentials (D/models.md:17-25, D/providers.md)
- Precedence: runtime `--api-key` → stored `auth.json` → `apiKey` from `models.json` → provider env var / ambient cloud creds (D/models.md:23).
- Common single-key env vars: `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `GEMINI_API_KEY`, `DEEPSEEK_API_KEY`, `XAI_API_KEY`, `GROQ_API_KEY`, `OPENROUTER_API_KEY`, `MISTRAL_API_KEY`, `TOGETHER_API_KEY`, `FIREWORKS_API_KEY` (full list D/providers.md:33-63). Env vars must be present in the process that starts pi (D/models.md:218).
- Secret-manager keys: in `auth.json` set `"key": "!<command>"`; pi runs it lazily, caches stdout for the process; empty/timeout/nonzero leaves it unresolved until restart (D/providers.md:73-84). A stored credential can carry `env` (e.g. `CLOUDFLARE_ACCOUNT_ID`) that beats the process env (D/providers.md:90-102).
- `pi auth check --provider X [--json]` → `ready|not_ready|invalid`, exit 0/1/2; `pi auth print-api-key|print-bearer-token` write secrets to stdout (D/cli.md:324-339). `pi auth login <p>` / `pi auth logout <p>` (D/cli.md:307,314).

## Compatible endpoint via models.json (D/models.md:45-79)
- Use when the endpoint already speaks a supported API (Ollama/LM Studio/vLLM/SGLang/proxy). Under `providers.<name>`: `baseUrl`, `api`, `apiKey`, `models:[{id,…}]` (D/models.md:49-63). Dummy `apiKey` makes a no-auth model (e.g. Ollama) appear (D/models.md:65).
- `apiKey`/header values support `$NAME`, `${NAME}`, a literal, or a leading `!command` (commands run at request time, not cached); `$$`/`$!` are literal `$`/`!` (D/models.md:65).
- A `models` entry adds/replaces a model with the same ID on that provider; `modelOverrides` changes metadata on a built-in/extension model without replacing its list (D/models.md:67). To route a built-in through a proxy set only its `baseUrl` (keeps models+auth) — do NOT copy the model list (D/models.md:69, D/custom-provider.md:49).

## Non-chat models: classifiers + images (D/models.md:142-204, D/codemode.md:60-135)
- Both are off in `/model`; the model reaches them only through the `codemode` tool (enable `defaultTools:["+codemode"]`). List with `models.getAvailableOfType(type)`, run with `models.classify(...)` / `models.generateImages(...)` (D/models.md:160,191).
- `classify` answers typed questions about JSON state (choice/score/bool, with probabilities); `generateImages` returns base64 image blocks; `models` calls' usage is added to the codemode tool result and counts toward session cost (D/models.md:183,202).
- Extensions call these without codemode via `ctx.modelRegistry.classify()` / `.generateImages()` (D/models.md:185,204).
