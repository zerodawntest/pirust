# Inventory: packages/mcp (pi `@earendil-works/pi-mcp`)

Format: `path | exports | purpose | target crate`. Source root: `/src/pi/packages/mcp`.
Standalone Model Context Protocol client. Runtime dep `cross-spawn` only; no other pi package at runtime. Rust: `crates/pi-mcp`.

src/auth-provider.ts | `McpFetch`, `UnauthorizedContext`, `AuthProvider` | OAuth auth-provider contract for MCP | pi-mcp
src/client.ts | `McpClientOptions`, `McpRequestOptions`, `McpClient` | MCP client: connect, request, list/call tools | pi-mcp
src/config.ts | `McpStdioServerConfig`, `McpOAuthConfig`, `McpHttpServerConfig`, `McpServerConfig`, `McpServerConfigResult`, `McpServerConfigOptions`, `validateMcpServerConfig`, `isMcpServerOverride` | MCP server config types + validation | pi-mcp
src/index.ts | re-exports auth-provider, client, config, input-schema, naming, output-limit, protocol, transports | Public API surface of the package | pi-mcp (lib root)
src/input-schema.ts | `normalizeMcpInputSchema` | Normalizes MCP tool input JSON schemas | pi-mcp
src/naming.ts | `createMcpToolName`, `mcpNamespace`, `mcpServerSummary` | Namespaces MCP tool names per server | pi-mcp
src/oauth/auth-provider.ts | `McpAuthProvider`, `createMcpAuthProvider`, `refreshStoredTokens` | OAuth token provider + token refresh | pi-mcp
src/oauth/callback.ts | `OAuthCallback`, `OAuthCallbackPage`, `OAuthCallbackServerOptions`, `OAuthCallbackServer` | Local HTTP server for OAuth redirect callback | pi-mcp
src/oauth/client-settings.ts | `McpOAuthSettings`, `McpClientMetadataDocuments`, `McpOAuthServerStore`, `createOAuthClientProvider`, `offersClientMetadataDocument`, `serverSpecificPath`, `registeredRedirectUrls`, `timedFetch`, `DEFAULT_REDIRECT_URL`, `LoopbackSettings`, `loopbackSettings` | OAuth client settings, store, timed fetch | pi-mcp
src/oauth/discovery.ts | `parseWwwAuthenticate`, `discoverProtectedResourceMetadata`, `buildAuthorizationServerDiscoveryUrls`, `discoverAuthorizationServerMetadata`, `discoverOAuthServerInfo`, `resourceUrlFromServerUrl`, `selectResource` | OAuth server metadata discovery | pi-mcp
src/oauth/errors.ts | `OAuthError`, `OAuthIssuerMismatchError`, `OAuthInsecureEndpointError`, `OAuthRegistrationError`, `McpOAuthAuthorizationRequiredError`, `McpRefreshLockBusyError` | OAuth error classes for MCP | pi-mcp
src/oauth/flow.ts | `AddClientAuthentication`, `OAuthClientMetadataDocument`, `OAuthClientProvider`, `OAuthFlowOptions`, `OAuthFlowResult`, `TokenRequestOptions`, `startAuthorization`, `registerClient`, `exchangeAuthorizationCode`, `refreshAuthorization`, `stepUpScope`, `authorizeMcp`, `adaptOAuthProvider` | OAuth authorization-code + refresh flow | pi-mcp
src/oauth/index.ts | re-exports auth-provider, callback, client-settings, discovery, errors, flow, provider, sign-in, types | OAuth public API (subpath `./oauth`) | pi-mcp (subpath root)
src/oauth/loopback.ts | `McpLoopbackCallback`, `listenForLoopbackSignIn`, `waitForLoopbackSignIn`, `responseFromRedirectUrl` | Loopback browser sign-in flow | pi-mcp
src/oauth/provider.ts | `McpOAuthState`, `McpOAuthStateStore`, `McpOAuthProviderOptions`, `MemoryOAuthStateStore`, `McpOAuthProvider` | OAuth client provider + in-memory state store | pi-mcp
src/oauth/sign-in.ts | `McpSignInOptions`, `McpSignInRedirect`, `McpSignInStart`, `McpAuthorizationResponse`, `McpSignInCancelledError`, `startMcpSignIn`, `completeMcpSignIn`, `cancellable` | Interactive MCP sign-in start/complete flow | pi-mcp
src/oauth/types.ts | `OAuthProtectedResourceMetadata`, `AuthorizationServerMetadata`, `OAuthTokens`, `OAuthClientMetadata`, `OAuthClientInformation`, `OAuthClientInformationFull`, `OAuthClientInformationMixed`, `OAuthDiscoveryState`, `OAuthServerInfo`, `OAuthChallenge`, `isHttpUrl`, `parseProtectedResourceMetadata`, `parseAuthorizationServerMetadata`, `parseOAuthTokens`, `parseClientInformation` | OAuth metadata types, parsers, guards | pi-mcp
src/output-limit.ts | `MCP_OUTPUT_MAX_BYTES`, `McpOutputSaver`, `LimitedMcpContent`, `limitMcpContent` | Truncates/saves oversized tool output | pi-mcp
src/protocol/content.ts | `ContentAnnotations`, `TextContent`, `ImageContent`, `AudioContent`, `ResourceLinkContent`, `TextResourceContents`, `BlobResourceContents`, `EmbeddedResourceContent`, `ContentBlock`, `CallToolResult`, `LlmContent`, `toLlmContent` | MCP content blocks; tool result to LLM content | pi-mcp
src/protocol/jsonrpc.ts | `JsonRpcId`, `JsonRpcRequest`, `JsonRpcNotification`, `JsonRpcErrorObject`, `JsonRpcSuccessResponse`, `JsonRpcErrorResponse`, `JsonRpcResponse`, `JsonRpcMessage`, `JSON_RPC_ERROR_CODES`, `McpError`, `McpConnectionClosedError`, `McpTimeoutError`, `McpAbortError`, `isObject`, `toError`, `isJsonRpcId`, `isJsonRpcRequest`, `isJsonRpcNotification`, `isJsonRpcResponse`, `parseJsonRpcMessage` | JSON-RPC types, guards, MCP transport errors | pi-mcp
src/protocol/types.ts | `LATEST_PROTOCOL_VERSION`, `SUPPORTED_PROTOCOL_VERSIONS`, `SupportedProtocolVersion`, `Implementation`, `Root`, `ClientCapabilities`, `ServerCapabilities`, `InitializeParams`, `InitializeResult`, `ProgressNotification`, `CancelledNotification`, `ToolAnnotations`, `ToolExecution`, `Tool`, `ListToolsResult`, `Resource`, `ResourceTemplate`, `ListResourcesResult`, `ListResourceTemplatesResult`, `ReadResourceResult` | MCP protocol types: tools, resources, init | pi-mcp
src/testing/index.ts | `createInMemoryTransportPair`, `InMemoryTransport` | Test helper re-export of in-memory transport | pi-mcp (testing, subpath `./testing`)
src/transports/in-memory.ts | `InMemoryTransport`, `createInMemoryTransportPair` | In-memory transport pair for tests | pi-mcp
src/transports/lines.ts | `JsonRpcLineReaderOptions`, `JsonRpcLineReader` | Newline-delimited JSON-RPC stream reader | pi-mcp
src/transports/pipe.ts | `McpPipe`, `McpPipeHandlers`, `PipeTransportOptions`, `PipeTransport` | Transport over a running process's pipes | pi-mcp
src/transports/stdio.ts | `StdioTransportOptions`, `StdioTransport` | Stdio transport: spawn child, line framing | pi-mcp
src/transports/streamable-http.ts | `SseEvent`, `ConsumeSseOptions`, `consumeSseStream`, `StreamableHttpReconnectOptions`, `StreamableHttpTransportOptions`, `McpHttpError`, `McpAuthRequiredError`, `McpSessionExpiredError`, `StreamableHttpTransport` | Streamable HTTP transport + SSE stream parsing | pi-mcp
src/transports/transport.ts | `DEFAULT_MAX_MESSAGE_BYTES`, `McpTransportMessageListener`, `McpTransportErrorListener`, `McpTransportCloseListener`, `McpTransportSendOptions`, `McpTransport`, `TransportEvents` | Transport interface + event emitter base | pi-mcp
test/authorization-server.ts | `startAuthorizationServer`, `AuthorizationServer`, `memoryStore`, `recordingStore`, `authorizeInBrowser` | Mock OAuth authorization server for tests | pi-mcp (tests)
test/auth-provider.test.ts | — | Tests MCP auth provider token/refresh | pi-mcp (tests)
test/client.test.ts | — | Tests MCP client requests, tools, resources | pi-mcp (tests)
test/config.test.ts | — | Tests MCP server config validation | pi-mcp (tests)
test/content.test.ts | — | Tests content blocks + LLM content conversion | pi-mcp (tests)
test/helpers.ts | `HttpHandler`, `readBody`, `listen`, `closeServers` | Local HTTP server helpers for tests | pi-mcp (tests)
test/input-schema.test.ts | — | Tests tool input schema normalization | pi-mcp (tests)
test/lines.test.ts | — | Tests JSON-RPC newline-delimited reader | pi-mcp (tests)
test/loopback.test.ts | — | Tests loopback browser sign-in flow | pi-mcp (tests)
test/naming.test.ts | — | Tests MCP tool name namespacing | pi-mcp (tests)
test/oauth.test.ts | — | Tests OAuth flow, discovery, client provider | pi-mcp (tests)
test/output-limit.test.ts | — | Tests large tool output truncation/save | pi-mcp (tests)
test/pipe.test.ts | — | Tests pipe transport | pi-mcp (tests)
test/sign-in.test.ts | — | Tests interactive MCP sign-in flow | pi-mcp (tests)
test/stdio.test.ts | — | Tests stdio transport | pi-mcp (tests)
test/streamable-http.test.ts | — | Tests streamable HTTP + SSE transport | pi-mcp (tests)
vitest.config.ts | default (vitest config) | Test runner config, not ported | none
