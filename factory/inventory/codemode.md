# Inventory: packages/codemode (pi `@earendil-works/pi-codemode`)

Format: `path | exports | purpose | target crate`. Source root: `/src/pi/packages/codemode`.
Sandbox runs QuickJS wasm; Rust port needs a JS engine (`rquickjs`) — new dependency, not in this ticket, so runtime files are `deferred`.

src/types.ts | `CodemodeTool`, `CodemodeToolContext`, `CodemodeJsonSchema`, `CodemodeCall`, `CodemodeCallStatus`, `CodemodeError`, `CodemodeErrorKind`, `CodemodeStoreWrites`, `CodemodeResult`, `CodemodeOutputItem`, `CodemodeSandboxOptions`, `CodemodeSandboxBaseOptions`, `CodemodeHostCall`, `CodemodeDeclaredTool`, `CodemodeDeclaredGlobal`, `CodemodeOutcome`, `CodemodeDuring`, `CodemodeRunOptions`, `CodemodeRun`, `CodemodeExecuteOptions` | Types: tools, run, result, errors | pi-codemode (types only)
src/identifier.ts | `toCodemodeIdentifier` | Sanitize tool names to JS identifiers | pi-codemode
src/declarations.ts | `renderDeclarations`, `renderToolSignature`, `renderToolSample`, `renderToolOutputType`, `schemaToType`, `resolveSchemaRef`, `DEFAULT_INPUT_SCHEMA_MAX_CHARS`, `RenderDeclarationsOptions`, `toCodemodeIdentifier`(re-export) | Emit TS declarations for injected tools | pi-codemode
src/source.ts | `parseCodemodeSource`, `CODEMODE_OPTIONS_PREFIX`, `CODEMODE_SOURCE_GRAMMAR`, `CodemodeSourceOptions`, `ParsedCodemodeSource`, `CodemodeSourceError` | Parse `// @options:` script header + grammar | pi-codemode
src/wasm.ts | `loadQuickJSWasm`, `CodemodeWasmModule` | Load bundled QuickJS wasm binary | pi-codemode (deferred: needs rquickjs)
src/runtime/execution.ts | `CodemodeSandboxBase`, `VmEvents`, `VmChannel`, `VmLauncher`, `errorMessage` | Sandbox base: run script, invoke tools | pi-codemode (deferred: needs rquickjs)
src/runtime/host.ts | `CodemodeSandbox` | Host-side sandbox bridging tool calls | pi-codemode (deferred: needs rquickjs)
src/runtime/inline.ts | `InlineCodemodeSandbox`, `inlineLauncher`, `DEFAULT_INTERRUPT_BUDGET`, `INLINE_MAX_STACK_SIZE` | Inline sandbox: budget, stack limits | pi-codemode (deferred: needs rquickjs)
src/runtime/prelude-source.ts | `PRELUDE_SOURCE`, `MAX_STORE_VALUE_CHARS`, `MAX_STORE_TOTAL_CHARS`, `MAX_OUTPUT_CHARS`, `MAX_OUTPUT_ITEMS` | JS prelude bridging tools into sandbox | pi-codemode (deferred: JS string)
src/runtime/protocol.ts | `VmStartData`, `WorkerData`, `WorkerToHostMessage`, `HostToWorkerMessage`, `isWorkerToHostMessage`, `isHostToWorkerMessage`, `ScriptErrorJson` | Host/worker message protocol for VM | pi-codemode
src/runtime/remote.ts | `serveCodemodeRemote`, `RemoteCodemodeSandbox`, `CodemodeRemoteRequest`, `CodemodeRemoteMessage`, `CodemodeRemoteReply`, `CodemodeRemoteExchange`, `CodemodeRemote`, `RemoteCodemodeSandboxOptions`, `CodemodeServeOptions` | Run sandbox in a separate worker process | pi-codemode (deferred: needs rquickjs)
src/runtime/vm.ts | `startVm`, `VmSession`, `StartVmOptions` | Start QuickJS VM session with limits | pi-codemode (deferred: needs rquickjs)
src/runtime/worker.ts | — | Worker entry running the sandboxed script | pi-codemode (deferred)
src/index.ts | re-exports `declarations`, `identifier`, `source`, `wasm`, runtime, types | Public API surface of the package | pi-codemode (lib root)
src/portable.ts | re-exports `identifier`, `runtime/*`, `source`, `wasm`, types | Portable bundle entry, no Node-only APIs | pi-codemode (lib root)
src/cloudflare.ts | `cloudflareQuickJSWasm`, `createInlineCodemodeSandbox`, `CodemodeSandboxDurableObject`, `DEFAULT_REMOTE_MEMORY_LIMIT_BYTES` | Cloudflare Workers sandbox + DurableObject | pi-codemode (deferred: CF-only)
src/cloudflare-modules.d.ts | — | Ambient types for wasm import modules | none (TS-only)
test/declarations.test.ts | — | Tests declaration rendering, schema refs | pi-codemode (tests)
test/source.test.ts | — | Tests source parsing, options prefix | pi-codemode (tests)
test/sandbox.test.ts | — | Tests sandbox runs, tool calls, limits | pi-codemode (tests, deferred)
test/portable.test.ts | — | Tests portable entry exports, same behaviour | pi-codemode (tests, deferred)
test/deterministic.test.ts | — | Tests deterministic repeat of a run | pi-codemode (tests, deferred)
test/worker-lifetime.test.ts | — | Tests worker start/stop lifecycle | pi-codemode (tests, deferred)
test/fixtures/raw-worker.ts | — | Fixture: raw worker script for tests | pi-codemode (tests, fixtures)
test/fixtures/worker-process-exit.ts | — | Fixture: worker calling process.exit | pi-codemode (tests, fixtures)
examples/cloudflare/agent/src/index.ts | `Session`, default fetch handler | Cloudflare agent using codemode tools | pi-codemode (examples, deferred)
examples/cloudflare/sandbox/src/index.ts | `CodemodeSandbox` (re-export), default fetch handler | Cloudflare sandbox service entry | pi-codemode (examples, deferred)
vitest.config.ts | default (vitest config) | Test runner config, not ported | none
