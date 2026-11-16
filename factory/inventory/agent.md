# Inventory: packages/agent (pi `@earendil-works/pi-agent-core`)

Format: `path | exports | purpose | target crate`. Source root: `/src/pi/packages/agent`.
Rust lib root will be `crates/pi-agent/src/lib.rs`; `src/index.ts` re-exports map to its `pub mod`/`pub use` list.

src/agent.ts | `Agent`, `AgentOptions`, `AgentInitialState`, `QueueMode`(re-export) | Stateful agent: prompt, state, tools | pi-agent
src/agent-loop.ts | `AgentEventSink`, `DEFAULT_AGENT_IDENTITY`, `agentLoop`, `agentLoopContinue`, `runAgentLoop`, `runAgentLoopContinue`, `ToolCallHooks`, `RunToolCallOptions`, `runToolCall` | Runs turn loop, tool calls, streaming | pi-agent
src/types.ts | `StreamFn`, `ToolExecutionMode`, `QueueMode`, `AgentToolCall`, `BeforeToolCallResult`, `AfterToolCallResult`, `AgentTurnContext`, `FinishTurn`, `AgentLoopConfig`, `ThinkingLevel`, `AgentMessage`, `AgentState`, `AgentTool`, `AgentToolResult`, `AgentToolCallOutcome`, `AgentToolParams`, `AgentContext`, `AgentEvent`, `AgentLoopTurnUpdate`, `PrepareRequest`, `PrepareRequestContext`, `PrepareNextTurnContext`, `AgentRequestUpdate`, `BeforeToolCallContext`, `AfterToolCallContext`, `CustomAgentMessages`, `AgentToolUpdateCallback` | Type contracts: tools, events, state, hooks | pi-agent
src/proxy.ts | `streamProxy`, `ProxyStreamOptions`, `ProxyAssistantMessageEvent` | Streams assistant turns through a proxy | pi-agent
src/stream-fn.ts | `setDefaultStreamFn`, `getDefaultStreamFn` | Global default stream function get/set | pi-agent
src/index.ts | re-exports `agent`, `agent-loop`, `proxy`, `stream-fn`, `types` | Public API surface of the package | pi-agent (lib root)
test/agent.test.ts | — | Tests agent state, prompt, tool flow | pi-agent (tests)
test/agent-loop.test.ts | — | Tests turn loop, tool calls, streaming | pi-agent (tests)
test/agent-tool-typebox.test.ts | — | Tests TypeBox tool param schemas | pi-agent (tests)
test/e2e.test.ts | — | End-to-end agent session with tools | pi-agent (tests)
test/proxy.test.ts | — | Tests proxy streaming | pi-agent (tests)
test/utils/calculate.ts | `calculate`, `calculateTool`, `CalculateResult`, `createCalculateToolWithUsage` | Test tool: evaluate arithmetic expression | pi-agent (tests)
test/utils/get-current-time.ts | `getCurrentTime`, `getCurrentTimeTool`, `GetCurrentTimeResult` | Test tool: current time by timezone | pi-agent (tests)
test/utils/wait-for-tick.ts | `waitForTick` | Await one event-loop tick in tests | pi-agent (tests)
examples/mcp-codemode/main.ts | — | Demo: agent with MCP + codemode tools | pi-agent (examples, deferred)
examples/mcp-codemode/tools.ts | `createMcpTools`, `createCodemodeTool`, `createNestedToolRunner`, `CODEMODE_TOOL_NAME` | Wraps MCP servers as agent tools | pi-agent (examples, deferred)
vitest.config.ts | default (vitest config) | Test runner config, not ported | none
