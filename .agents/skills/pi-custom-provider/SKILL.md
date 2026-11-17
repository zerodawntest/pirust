---
name: pi-custom-provider
description: "Add a model service pi doesn't support via a provider extension: registerProvider for a compatible endpoint, auth (API key from env/command, OAuth), dynamic model discovery, and custom streaming. Use when a service needs custom auth/discovery/streaming; for a plain compatible endpoint use models.json (see pi-models) instead."
---
Docs: `/nix/store/w3j2zc6sidwg028h4b1wqw6yillkf9jm-pi-1.5.1/libexec/pi/docs` (D). A provider extension is an extension (see pi-hooks / pi-extension-check): same load/trust/reload; runs INSIDE pi with its rights — treat as trusted code, don't log secrets/payloads (D/custom-provider.md:5).

## Choose the smallest integration (D/custom-provider.md:7-13)
- Models behind a supported API → `models.json` (see pi-models). Change an existing endpoint/headers → `models.json` or a tiny extension. Dynamic discovery → `refreshModels`. `/login` flow → provider with OAuth. Unsupported wire protocol → custom `stream`/`streamSimple`.

## Register a provider (D/custom-provider.md:19-52)
- Call `pi.registerProvider()` from the extension factory; pi awaits async factories, so providers are available to startup model selection + `pi --list-models`.
- Redirect an existing provider: register ONLY the fields to change (keeps its catalog/auth/streaming). e.g. `pi.registerProvider("anthropic",{ baseUrl:"https://gw/anthropic", headers:{ "X-Gateway-Key":"$GATEWAY_API_KEY" } })`. Don't copy the model list (drift).
- Compatible endpoint w/ own catalog: `registerProvider("acme",{ name, baseUrl, apiKey:"$ACME_API_KEY", api:"openai-completions", models:[{type:"chat",id,name,reasoning,input:["text"],cost:{…},contextWindow,maxTokens}] })`. Prefer `models.json` for this if no executable behavior is needed.
- Mixed ops: register `type:"image"`/`"type":"classifier"` models with `images:{ "<api>":{generateImages} }` and `classifiers:{ "<api>":{classify} }` (D/custom-provider.md:82-118). `unregisterProvider()` restores built-ins.

## Auth (D/custom-provider.md:126-144)
- Static: API key from literal, `$NAME`/`${NAME}` env, leading `!command`, `$$`→`$`, `$!`→`!` (same syntax as models.json). Native auth for stored creds, custom resolution, provider-scoped env, multiple login methods.
- OAuth: supply display name, login flow, token refresh, access-token resolution; then it shows in `/login` and creds go to `~/.pi/agent/auth.json`. Honor the abort signal on network calls; never write tokens/headers/full responses to logs.

## Streaming (D/custom-provider.md:164-208)
- Reuse a supported API implementation whenever the protocol matches (Anthropic Messages, OpenAI Chat/Responses, Google/Vertex, Azure Responses, Mistral, Bedrock) — safer than copying. Implement `streamSimple` only when nothing fits; study `packages/ai/src/api` first.
- A custom stream reads prompt/tools from transcript system messages via `getCurrentSystemPrompt(messages)`/`getCurrentTools(messages)` (not `context.systemPrompt`/`context.tools`); `collapseSystemMessages()` if the model has no mid-conversation system messages.
- Contract: create assistant msg (pending stop, zeroed usage) → emit one `start` → balanced text/thinking/toolcall events → finalize usage/cost/content/stopReason → emit exactly ONE terminal `done`/`error` and close. Honor `SimpleStreamOptions`: `onPayload` (before send), `onResponse` (before body), `await onProviderSetreamEvent` per event, pass abort + provider env (D/custom-provider.md:193-200).
- Set a concrete terminal stop reason; errors/aborts need `errorMessage`; successes need accurate tokens+cost. Only normalize YOUR provider's overflow to `context_length_exceeded`; don't rewrite rate-limits/transients as overflow (D/custom-provider.md:202-208).

## Test (D/custom-provider.md:210-224)
Cover: normal+empty text, tool calls+results, image input/results, usage/cost, abort, context overflow, malformed/partial streams, Unicode boundaries, cross-provider session handoff, auth refresh+cancellation. Adapt suites under `packages/ai/test`. `/reload` after changing a discovered provider extension.
