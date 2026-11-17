---
name: pi-extension-api
description: Reference for the pi extension API (pi.*, ctx.*, custom tools, commands). Use when writing, reviewing, or debugging pi .ts extensions that register tools, commands, providers, or UI.
---

# pi extension API

An extension is a TS module with `export default function (pi: ExtensionAPI) { ... }`. Event handlers get `ctx: ExtensionContext`; tools get `ExtensionToolContext` (adds `ctx.tools`, `ctx.executeTool()`); commands get `ExtensionCommandContext`.

## pi.* methods

| method | what | limits | doc line |
|---|---|---|---|
| `pi.on(event, handler)` | Subscribe to an event; returns an unsubscribe fn. | Handler runs in load order; add/remove does not affect a dispatch in progress. | docs/extensions.md:1569 |
| `pi.registerTool(def)` | Register an LLM-callable tool. `execute(toolCallId, params, signal, onUpdate, ctx)`. | Works at load and after startup; registering activates it unless `defaultActive:false`. Output MUST be truncated. | docs/extensions.md:1582, docs/extensions.md:2451 |
| `pi.sendMessage(msg, opts)` | Inject a custom message that participates in LLM context. | `triggerTurn` only for `steer`/`followUp`; `nextTurn` ignores it. | docs/extensions.md:1627 |
| `pi.sendUserMessage(content, opts)` | Send a real user message; starts/queues a turn. | While streaming must set `deliverAs`; `expandPromptTemplates:true` dispatches `/commands` + skills. | docs/extensions.md:1651 |
| `pi.appendEntry(type, data)` | Persist custom entry; NOT in LLM context. | Render in TUI via `pi.registerEntryRenderer`. | docs/extensions.md:1683 |
| `pi.setSessionName` / `pi.getSessionName` | Set/read the session display name. | — | docs/extensions.md:1701 |
| `pi.setLabel(entryId, label)` | Bookmark an entry (shown in `/tree`). | `undefined` clears. | docs/extensions.md:1720 |
| `pi.registerCommand(name, opts)` | Register a slash command; handler gets `ExtensionCommandContext`. | Duplicate names kept, suffixed `/x:1`, `/x:2`. | docs/extensions.md:1737 |
| `pi.getCommands()` | List invokable commands (extension, prompt, skill). | Excludes built-in interactive-only commands (`/model`, `/settings`). | docs/extensions.md:1772 |
| `pi.registerMessageRenderer(type, r)` / `pi.registerEntryRenderer(type, r)` | Custom TUI rendering for messages (in LLM ctx) / entries (not). | — | docs/extensions.md:1805, docs/extensions.md:1845 |
| `pi.registerMarkdownTransformer(fn, opts)` | Rewrite Markdown before rendering (display-only). | One per extension; keep synchronous/cheap. | docs/extensions.md:1809 |
| `pi.registerShortcut(shortcut, opts)` | Register a keyboard shortcut. | See docs/keybindings.md. | docs/extensions.md:1865 |
| `pi.registerFlag(name, opts)` | Register a CLI flag; read with `pi.getFlag(name)`. | In the factory `getFlag()` returns the default; read it in `session_start`. | docs/extensions.md:1878 |
| `pi.exec(cmd, args, opts)` | Run a command with no shell. | `opts`: `signal`, `timeout`, `cwd`, `maxBuffer`; on overflow sets `truncated`+`killed`. | docs/extensions.md:1897 |
| `pi.getActiveTools()` / `getAllTools()` / `setActiveTools(names)` | Inspect/set the active tool set. | `setActiveTools` ignores unknown and `hidden` tools. | docs/extensions.md:1908 |
| `pi.setModel(m)` | Set the session model. | Returns `false` if no auth; does NOT change default for new sessions. | docs/extensions.md:1940 |
| `pi.getThinkingLevel()` / `setThinkingLevel(l)` | Get/set thinking level. | Clamped to model caps; `set` does not change the default. | docs/extensions.md:1954 |
| `pi.events` | Shared event bus between extensions (`on`/`emit`). | — | docs/extensions.md:1965 |
| `pi.registerProvider(name, cfg)` / `pi.unregisterProvider(name)` | Register/override a model provider (proxy, OAuth, custom API). | Calls at load are queued; later calls apply without `/reload`. | docs/extensions.md:1974, docs/extensions.md:2100 |
| `pi.registerVirtualModel(m)` / `pi.unregisterVirtualModel(p, id)` | Register a routing model; routes to a physical model per request. | See docs/virtual-models.md. | docs/extensions.md:2115 |
| `pi.registerMcpServer(name, cfg)` / `unregisterMcpServer` / `getMcpServers` | Add/remove MCP servers. | Not persisted; re-register every load. See docs/mcp.md. | docs/extensions.md:2119 |
| `pi.registerToolRenderer(resolver)` | Choose how any tool renders (incl. not-yet-registered). | Use `next() ?? mine` to fill gaps only. | docs/extensions.md:1923 |
| `pi.getSettings()` | Copy of effective merged settings. | — | docs/extensions.md:2134 |

## ctx.* (ExtensionContext)

| method/prop | what | limits | doc line |
|---|---|---|---|
| `ctx.ui` | Dialogs (`select`/`confirm`/`input`/`editor`), `notify`, `setStatus`/`setWidget`/`setFooter`/`setHeader`, `setEditorComponent`, `setTheme`, `custom`. | Guard dialogs with `ctx.hasUI`; guard `custom()`/components/terminal input with `ctx.mode === "tui"`. | docs/extensions.md:1167, docs/extensions.md:2821 |
| `ctx.mode` | Run mode: `tui`/`rpc`/`json`/`print`. | — | docs/extensions.md:1171 |
| `ctx.hasUI` | `true` in tui+rpc; `false` in print+json. | — | docs/extensions.md:1175 |
| `ctx.cwd` | Current working directory. | Use `CONFIG_DIR_NAME`, not `.pi`. | docs/extensions.md:1179 |
| `ctx.isProjectTrusted()` | Whether project-local trust is active. | Check before reading project-local config. | docs/extensions.md:1197 |
| `ctx.sessionManager` | Read-only session state (`getEntries`, `getBranch`, `buildContextEntries`, `getLeafId`, ...). | Synced to current assistant message before `tool_call`. | docs/extensions.md:1203 |
| `ctx.modelRegistry` / `ctx.model` / `ctx.thinkingLevel` / `ctx.scopedModels` | Models, providers, resolved auth; active model + thinking level; scoped model list. | `scopedModels` empty = all models usable. | docs/extensions.md:1216 |
| `ctx.signal` | Abort signal for the active agent turn. | `undefined` in idle/non-turn contexts (session events, commands, idle shortcuts). | docs/extensions.md:1230 |
| `ctx.isIdle()` / `ctx.abort()` / `ctx.hasPendingMessages()` | Control-flow helpers. | — | docs/extensions.md:1255 |
| `ctx.shutdown()` | Graceful shutdown; emits `session_shutdown`. | In all contexts; interactive defers until idle, print is a no-op. | docs/extensions.md:1259 |
| `ctx.getContextUsage()` | Context usage for the active model. | — | docs/extensions.md:1277 |
| `ctx.compact(opts)` | Trigger compaction (not awaited); use `onComplete`/`onError`. | — | docs/extensions.md:1288 |
| `ctx.getSystemPrompt()` / `ctx.getSystemPromptOptions()` | Current system prompt string / its base inputs. | Options exclude chained + `context`-event mutations; sensitive, do not log. | docs/extensions.md:1304, docs/extensions.md:1324 |
| `ctx.newSession(opts)` / `ctx.fork(entryId, opts)` / `ctx.navigateTree(id, opts)` / `ctx.switchSession(path, opts)` | Session replacement / fork / tree nav / switch. | ONLY from command handlers (deadlock from event handlers); use the `withSession` ctx only. | docs/extensions.md:1320, docs/extensions.md:1350, docs/extensions.md:1383, docs/extensions.md:1428 |
| `ctx.reload()` | Run the `/reload` flow. | Commands only; treat as terminal: `await ctx.reload(); return;`. | docs/extensions.md:1514 |

## Custom tools & commands (limits)

- `execute(toolCallId, params, signal, onUpdate, ctx)`; return `{ content, details }`. Both are required on every result incl. `onUpdate` partials; `details` type must be consistent. docs/extensions.md:2222
- Truncate output to 50KB / 2000 lines (`truncateHead`/`truncateTail`); tell the LLM where full output is. docs/extensions.md:2451
- File-mutating tools must wrap the whole read-modify-write window in `withFileMutationQueue(absPath, ...)` (calls run in parallel). docs/extensions.md:2192
- Signal errors by `throw`ing or returning `isError:true`; return `terminate:true` to hint at skipping the follow-up call. docs/extensions.md:2276
- `ctx.executeTool(name, args, {signal, onUpdate})` calls other tools; nested calls add no transcript entries. Tools with `exposure:"codemode"`/`"deferred"` stay callable from codemode scripts. docs/extensions.md:2790, docs/extensions.md:2758
- Commands: `pi.registerCommand(name, { description, handler(args, ctx) })`; only command handlers get session-control methods. docs/extensions.md:1737, docs/extensions.md:1320
