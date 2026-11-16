# Inventory: packages/ai (pi `@earendil-works/pi-ai`)

Format: `path | exports | purpose | target crate`. Source root: `/src/pi/packages/ai`.
Rust lib root will be `crates/pi-ai/src/lib.rs`; `src/index.ts` re-exports map to its `pub mod`/`pub use` list.

## src (top level)

src/types.ts | `KnownApi`, `Api`, `KnownImageApi`, `ImageApi`, `KnownClassifierApi`, `ClassifierApi`, `KnownProvider`, `ProviderId`, `ToolChoice`, `SamplingParams`, `SamplingParamsByThinkingLevel`, `ThinkingBudgets`, `Transport`, `ProviderEnv`, `ProviderHeaders`, `FetchFunction`, `ProviderResponse`, `ProviderRequestOptions`, `StreamOptions`, `DeferredFetchOptions`, `DeferredCancelOptions`, `ApiStreamOptions`, `ProviderStreams`, `ProviderImages`, `ProviderClassifier`, `ClassifierOptions`, `ImagesOptions`, `SimpleStreamOptions`, `StreamFunction`, `ImagesFunction`, `ClassifierFunction`, `TextSignatureV1`, `TextContent`, `ThinkingContent`, `ImageContent`, `ToolCall`, `Usage`, `StopReason`, `JsonValue`, `JsonObject`, `JsonRepresentation`, `DeferredHandle`, `SystemMessage`, `UserMessage`, `AssistantMessage`, `NestedToolCallRecord`, `NestedToolCalls`, `ToolResultMessage`, `Message`, `ImagesContext`, `AssistantImages`, `Classifier*Question/Answer/Result`, `GrammarFormat`, `ConstrainedSamplingConfig`, `Tool`, `ToolReference`, `Context`, `TranscriptContext`, `AssistantMessageEvent`, `BaseModel`, `Model`, `ImageModel`, `ClassifierModel`, `ModelTypeMap`, `ModelType`, `AnyModel` | Core types: messages, content, tools, models, sampling | pi-ai
src/models.ts | `ModelsError`, `getModelType`, `isModelType`, `ModelsPublication`, `RefreshModelsContext`, `ModelsRefreshOptions`, `ModelsRefreshResult`, `ModelsRequestTransforms`, `ModelsApiStreamOptions`, `ModelsSimpleStreamOptions`, `ModelsDeferredFetchOptions`, `ModelsDeferredCancelOptions`, `ModelsImagesOptions`, `ModelsClassifierOptions`, `Provider`, `Models`, `MutableModels`, `CreateModelsOptions`, `createModels`, `CreateProviderOptions` | Models registry, provider registry, createModels | pi-ai
src/models.generated.ts | `MODELS`, `IMAGE_MODELS`, `CLASSIFIER_MODELS` | Generated chat/image/classifier model data | pi-ai
src/models-store.ts | `ModelsStoreEntry`, `ModelsStoreOperationOptions`, `ModelsStore`, `InMemoryModelsStore` | In-memory model store with ops | pi-ai
src/cache-warming.ts | `CacheWarmingAction`, `CacheWarmingPhase`, `CacheWarmingDecision`, `CACHE_WARMING_MAX_AGE_MS`, `CACHE_WARMING_MAX_IDLE_AGE_MS`, `CACHE_WARMING_MINIMUM_EXPECTED_SAVINGS`, `CACHE_WARMING_IDLE_CONTINUATION_PROBABILITY`, `getCacheWarmingDelayMs`, `getPromptCacheTtlMs`, `isCacheWarmingReplayable`, `getCacheWarmingRequestOptions`, `evaluateCacheWarming` | Prompt-cache warming decisions | pi-ai
src/model-catalog.ts | `ModelGroups`, `ChatModelCatalog`, `ImageModelCatalog`, `ClassifierModelCatalog`, `flattenChatModelCatalog`, `flattenImageModelCatalog`, `flattenClassifierModelCatalog` | Model catalog types, flatten helpers | pi-ai
src/image-models.ts | `BuiltinImageProvider`, `getImageModel`, `getImageProviders`, `getImageModels` | Builtin image model catalog access | pi-ai
src/images.ts | `generateImages` | Generate images via provider | pi-ai
src/images-api-registry.ts | `ImagesApiFunction`, `ImagesApiProvider`, `registerImagesApiProvider`, `getImagesApiProvider` | Registry for image API providers | pi-ai
src/env-api-keys.ts | `ANTHROPIC_*_ENV` (8), `findEnvKeys`, `getEnvApiKey` | Resolve API keys from env vars | pi-ai
src/telemetry.ts | `AI_TELEMETRY_SCHEMA`, `observeModelRequest` | Model request telemetry schema/observers | pi-ai
src/session-resources.ts | `SessionResourceCleanup`, `registerSessionResourceCleanup`, `cleanupSessionResources` | Session resource cleanup registry | pi-ai
src/oauth.ts | re-export `oauth/*` types | Re-export OAuth flow types | pi-ai
src/lazy-oauth.ts | `registerLazyOAuthFlows` | Lazy-register OAuth flows | pi-ai
src/lazy-bedrock-provider.ts | `registerLazyBedrockProvider` | Lazy-register Bedrock provider | pi-ai
src/bedrock-provider.ts | `bedrockProviderModule` | Amazon Bedrock provider module | pi-ai
src/bun-oauth.ts | `registerBunOAuthFlows` | Register Bun runtime OAuth flows | pi-ai
src/legacy-api-aliases.ts | `streamAnthropic`, `streamSimpleAnthropic`, `streamAzureOpenAIResponses`, `streamSimpleAzureOpenAIResponses`, `streamGoogle`, `streamSimpleGoogle`, `streamGoogleVertex`, `streamSimpleGoogleVertex`, `streamMistral`, `streamSimpleMistral`, `streamOpenAICodexResponses`, `streamSimpleOpenAICodexResponses`, `streamOpenAICompletions`, `streamSimpleOpenAICompletions`, `streamOpenAIResponses`, `streamSimpleOpenAIResponses` | Legacy stream function aliases per API | pi-ai
src/compat.ts | re-exports (api *.lazy, env keys, images, index, providers/images) | Compat re-export barrel for all APIs | pi-ai
src/index.ts | re-exports (api options, auth, models, cache-warming) | Public API surface of the package | pi-ai (lib root)
src/cli.ts | (none) | CLI entry, no exports, not ported | none

## src/api

src/api/classifier-shared.ts | `ClassifierHttpError`, `isRecord`, `requiredNumber`, `postClassifierRequest`, `parseClassifierUsage` | Shared classifier HTTP request/usage helpers | pi-ai::api
src/api/lazy.ts | `LazyStreamObserver`, `lazyStream`, `LazyApiCapabilities`, `lazyApi` | Lazy stream/API loading helpers | pi-ai::api
src/api/anthropic-messages.ts | `AnthropicEffort`, `AnthropicThinkingDisplay`, `AnthropicOptions`, `stream`, `streamSimple` | Anthropic Messages API: stream, options | pi-ai::api
src/api/anthropic-messages.lazy.ts | `anthropicMessagesApi` | Lazy wrapper for Anthropic Messages API | pi-ai::api
src/api/openai-completions.ts | `OpenAICompletionsOptions`, `ConvertCompletionsMessagesOptions`, `stream`, `streamSimple`, `convertMessages` | OpenAI Chat Completions API: stream, convert | pi-ai::api
src/api/openai-completions.lazy.ts | `openAICompletionsApi` | Lazy wrapper for OpenAI Completions API | pi-ai::api
src/api/openai-responses.ts | `OpenAIResponsesOptions`, `stream`, `streamSimple` | OpenAI Responses API: stream, options | pi-ai::api
src/api/openai-responses.lazy.ts | `openAIResponsesApi` | Lazy wrapper for OpenAI Responses API | pi-ai::api
src/api/openai-responses-shared.ts | `OpenAIResponsesStreamOptions`, `ConvertResponsesMessagesOptions`, `ConvertResponsesToolsOptions`, `getResponsesToolSupport`, `convertResponsesMessages`, `convertResponsesTools`, `processResponsesStream` | Shared OpenAI Responses helpers: convert, stream | pi-ai::api
src/api/openai-codex-responses.ts | `OpenAICodexResponsesOptions`, `stream`, `streamSimple`, `OpenAICodexWebSocketDebugStats`, `getOpenAICodexWebSocketDebugStats`, `resetOpenAICodexWebSocketDebugStats`, `closeOpenAICodexWebSocketSessions` | OpenAI Codex Responses API: stream, ws debug | pi-ai::api
src/api/openai-codex-responses.lazy.ts | `openAICodexResponsesApi` | Lazy wrapper for OpenAI Codex Responses API | pi-ai::api
src/api/openai-decisions.ts | `classify` | OpenAI decisions classifier implementation | pi-ai::api
src/api/openai-decisions.lazy.ts | `openAIDecisionsApi` | Lazy wrapper for OpenAI decisions classifier | pi-ai::api
src/api/openai-prompt-cache.ts | `OPENAI_PROMPT_CACHE_KEY_MAX_LENGTH`, `clampOpenAIPromptCacheKey` | Clamp OpenAI prompt-cache key length | pi-ai::api
src/api/azure-openai-config.ts | `AzureEndpointOptions`, `resolveDeploymentName`, `resolveAzureBaseUrl`, `resolveAzureConfig` | Resolve Azure OpenAI endpoint/deployment config | pi-ai::api
src/api/azure-openai-responses.ts | `AzureOpenAIResponsesOptions`, `stream`, `streamSimple` | Azure OpenAI Responses API: stream, options | pi-ai::api
src/api/azure-openai-responses.lazy.ts | `azureOpenAIResponsesApi` | Lazy wrapper for Azure OpenAI Responses API | pi-ai::api
src/api/google-generative-ai.ts | `GoogleOptions`, `stream`, `streamSimple` | Google Generative AI API: stream, options | pi-ai::api
src/api/google-generative-ai.lazy.ts | `googleGenerativeAIApi` | Lazy wrapper for Google Generative AI API | pi-ai::api
src/api/google-vertex.ts | `GoogleVertexOptions`, `stream`, `streamSimple` | Google Vertex AI API: stream, options | pi-ai::api
src/api/google-vertex.lazy.ts | `googleVertexApi` | Lazy wrapper for Google Vertex API | pi-ai::api
src/api/google-shared.ts | `GoogleApiThinkingLevel`, `ResolvedGoogleThinkingLevel`, `resolveGoogleThinkingLevel`, `usesGoogleThinkingLevel`, `toGoogleThinkingLevel`, `toGoogleSdkThinkingLevel`, `getDisabledGoogleThinkingConfig`, `isThinkingPart`, `retainThoughtSignature`, `requiresToolCallId`, `convertMessages`, `convertTools` | Shared Google helpers: thinking, convert msgs/tools | pi-ai::api
src/api/mistral-conversations.ts | `MistralOptions`, `stream`, `streamSimple` | Mistral Conversations API: stream, options | pi-ai::api
src/api/mistral-conversations.lazy.ts | `mistralConversationsApi` | Lazy wrapper for Mistral Conversations API | pi-ai::api
src/api/bedrock-converse-stream.ts | `BedrockThinkingDisplay`, `BedrockOptions`, `stream`, `streamSimple` | Amazon Bedrock Converse stream API | pi-ai::api
src/api/bedrock-converse-stream.lazy.ts | `setBedrockProviderModule`, `setBedrockProviderLoader`, `bedrockConverseStreamApi` | Lazy Bedrock provider loader/wiring | pi-ai::api
src/api/cloudflare.ts | `CLOUDFLARE_WORKERS_AI_BASE_URL`, `CLOUDFLARE_WORKERS_AI_REST_BASE_URL`, `CLOUDFLARE_AI_GATEWAY_COMPAT_BASE_URL`, `CLOUDFLARE_AI_GATEWAY_OPENAI_BASE_URL`, `CLOUDFLARE_AI_GATEWAY_ANTHROPIC_BASE_URL` | Cloudflare AI base URL constants | pi-ai::api
src/api/cloudflare-ai-binding.ts | `AiBinding`, `CLOUDFLARE_GATEWAY_BINDING_AUTH_SENTINEL`, `createAiBindingFetch` | Cloudflare AI binding fetch adapter | pi-ai::api
src/api/cloudflare-workers-ai-system-one.ts | `classify` | Cloudflare Workers AI System One classifier | pi-ai::api
src/api/cloudflare-workers-ai-system-one.lazy.ts | `cloudflareWorkersAISystemOneApi` | Lazy wrapper for CF Workers AI System One | pi-ai::api
src/api/system-one-shared.ts | `SystemOneWireRequest`, `SystemOneImageInput`, `ResolvedSystemOneCompat`, `SystemOneTransport`, `classifySystemOne` | Shared System One classifier transport/logic | pi-ai::api
src/api/llama-cpp-classify.ts | `LabeledQuestion`, `llamaServerRoot`, `renderQuestion`, `labelProbabilities`, `peakConfidence`, `answerFromProbabilities`, `classify` | Llama.cpp classifier: prompts, probabilities | pi-ai::api
src/api/llama-cpp-classify.lazy.ts | `llamaCppClassifyApi` | Lazy wrapper for Llama.cpp classifier | pi-ai::api
src/api/openrouter-images.ts | `generateImages` | OpenRouter image generation | pi-ai::api
src/api/openrouter-images.lazy.ts | `openrouterImagesApi` | Lazy wrapper for OpenRouter images API | pi-ai::api
src/api/pi-messages.ts | `PiMessagesOptions`, `PiMessagesRewriteImpact`, `PiMessagesEvent`, `PiMessagesResponseError`, `stream`, `streamSimple` | pi-native Messages API: stream, events | pi-ai::api
src/api/pi-messages.lazy.ts | `piMessagesApi` | Lazy wrapper for pi Messages API | pi-ai::api
src/api/typesafe-system-one.ts | `classify` | Type-safe System One classifier | pi-ai::api
src/api/typesafe-system-one.lazy.ts | `typesafeSystemOneApi` | Lazy wrapper for type-safe System One classifier | pi-ai::api
src/api/simple-options.ts | `clampMaxTokensToContext`, `resolveSamplingParams`, `buildBaseOptions`, `MIN_ANSWER_TOKENS`, `DEFAULT_THINKING_BUDGETS`, `clampReasoning`, `thinkingBudgetForLevel`, `clampThinkingBudgetToAnswerRoom`, `adjustMaxTokensForThinking` | Build simple stream options, thinking budgets | pi-ai::api
src/api/constrained-sampling.ts | `UnsupportedStrictSchemaKeywordCheck`, `makeStrictJsonSchema`, `prefersJsonSchemaStrictSampling`, `getJsonSchemaToolParameters`, `GrammarConstrainedSampling`, `GrammarToolInputJsonBuffer`, `getGrammarToolInput`, `appendGrammarToolInputJsonDelta`, `closeGrammarToolInputJson`, `resolveJsonSchemaStrictSampling`, `resolveGrammarConstrainedSampling`, `createGrammarToolInputProperties` | Constrained sampling: strict JSON schema, grammar | pi-ai::api
src/api/strict-tool-limits.ts | `isStrictToolLimitErrorMessage`, `markStrictToolLimitsExceeded`, `hasExceededStrictToolLimits` | Track strict tool-call limit exceedance | pi-ai::api
src/api/github-copilot-headers.ts | `inferCopilotInitiator`, `hasCopilotVisionInput`, `buildCopilotDynamicHeaders` | Build GitHub Copilot request headers | pi-ai::api
src/api/transform-messages.ts | `SplitErrorToolResult`, `splitErrorToolResultImages`, `transformMessages` | Transform messages across providers/APIs | pi-ai::api

## src/auth

src/auth/types.ts | `ModelAuth`, `ApiKeyCredential`, `OAuthCredentials`, `OAuthCredential`, `Credential`, `CredentialInfo`, `AuthOperationOptions`, `CredentialStore`, `AuthContext`, `AuthResult`, `AuthCheck`, `AuthType` | Auth types: credentials, store, context, result | pi-ai::auth
src/auth/resolve.ts | `ModelsError`(re-export), `ModelsErrorCode`(re-export), `AuthResolutionOverrides`, `resolveProviderAuth`, `refreshStoredOAuthCredential` | Resolve provider auth, refresh OAuth credential | pi-ai::auth
src/auth/context.ts | `defaultProviderAuthContext` | Default provider auth context factory | pi-ai::auth
src/auth/credential-store.ts | `InMemoryCredentialStore` | In-memory credential store impl | pi-ai::auth
src/auth/helpers.ts | `envApiKeyAuth`, `lazyOAuth` | Auth helpers: env API key, lazy OAuth | pi-ai::auth

## src/auth/oauth

src/auth/oauth/pkce.ts | `generatePKCE` | Generate OAuth PKCE verifier/challenge | pi-ai::auth::oauth
src/auth/oauth/device-code.ts | `OAuthDeviceCodePollResult`, `OAuthDeviceCodePollOptions`, `abortableSleep`, `pollOAuthDeviceCodeFlow` | OAuth device-code flow polling | pi-ai::auth::oauth
src/auth/oauth/callback-server.ts | `OAuthCallbackServerOptions`, `OAuthCallbackServer`, `startOAuthCallbackServer`, `waitForCallbackOrManualInput` | Local OAuth callback server | pi-ai::auth::oauth
src/auth/oauth/trusted-url.ts | `trustedHttpUrl` | Validate trusted http(s) URL | pi-ai::auth::oauth
src/auth/oauth/anthropic.ts | `anthropicOAuth` | Anthropic OAuth flow | pi-ai::auth::oauth
src/auth/oauth/openai-codex.ts | `openaiCodexOAuth` | OpenAI Codex OAuth flow | pi-ai::auth::oauth
src/auth/oauth/openai-chatgpt.ts | `openaiChatGPTOAuth` | OpenAI ChatGPT OAuth flow | pi-ai::auth::oauth
src/auth/oauth/github-copilot.ts | `githubCopilotOAuth` | GitHub Copilot OAuth flow | pi-ai::auth::oauth
src/auth/oauth/kimi-coding.ts | `kimiCodingOAuth` | Kimi Coding OAuth flow | pi-ai::auth::oauth
src/auth/oauth/meta.ts | `metaOAuth` | Meta OAuth flow | pi-ai::auth::oauth
src/auth/oauth/openrouter.ts | `openRouterOAuth` | OpenRouter OAuth flow | pi-ai::auth::oauth
src/auth/oauth/xai.ts | `xaiOAuth` | xAI OAuth flow | pi-ai::auth::oauth
src/auth/oauth/radius.ts | `RadiusOAuthOptions`, `createRadiusOAuth` | Radius OAuth flow factory | pi-ai::auth::oauth
src/auth/oauth/load.ts | `registerBundledOAuthFlowLoaders`, `loadAnthropicOAuth`, `loadOpenAICodexOAuth`, `loadOpenAIChatGPTOAuth`, `loadGitHubCopilotOAuth`, `loadOpenRouterOAuth`, `loadKimiCodingOAuth`, `loadMetaOAuth`, `loadXaiOAuth`, `loadRadiusOAuth` | Lazy loaders for bundled OAuth flows | pi-ai::auth::oauth

## src/compat

src/compat/extension-oauth-types.ts | `OAuthPrompt`, `OAuthAuthInfo`, `OAuthDeviceCodeInfo`, `OAuthSelectOption`, `OAuthSelectPrompt`, `OAuthLoginCallbacks`, `OAuthCredentials`(re-export) | OAuth prompt/callback types for extensions | pi-ai::compat

## src/providers

src/providers/all.ts | `radiusProvider`(re-export), `BuiltinProvider`, `getBuiltinModel`, `getBuiltinImageModel`, `getBuiltinClassifierModel`, `getBuiltinProviders`, `getBuiltinModelDataGeneratedAt`, `getBuiltinModels` | Builtin provider registry, get model helpers | pi-ai::providers
src/providers/compat-schema.ts | `SessionAffinityFormatSchema`, `ThinkingTokenBudgetFieldSchema`, `ChatTemplateKwargValueSchema`, `OpenRouterRoutingSchema`, `VercelGatewayRoutingSchema`, `AnthropicAllowedFallbackModelSchema`, `OpenAICompletionsCompatSchema`, `OpenAIResponsesCompatSchema` | JSON schemas: compat, routing, gateway options | pi-ai::providers
src/providers/model-schema.ts | `THINKING_LEVELS`, `MODEL_THINKING_LEVELS`, `MODEL_INPUT_MODALITIES`, `CACHE_RETENTIONS`, `MODEL_PROMPT_CACHE_RETENTIONS`, `ThinkingLevelSchema`, `ModelThinkingLevelSchema`, `ModelInputModalitySchema` | Model schema: thinking levels, modalities, cache | pi-ai::providers
src/providers/schema-builders.ts | `openObject`, `stringLiteral`, `stringRecord` | Schema builder helpers (open object/string) | pi-ai::providers
src/providers/faux.ts | `FauxModelDefinition`, `FauxContentBlock`, `fauxText`, `fauxThinking`, `fauxToolCall`, `fauxAssistantMessage`, `FauxProviderState`, `FauxResponseFactory` | Faux/mock provider for tests | pi-ai::providers
src/providers/cloudflare-auth.ts | `cloudflareWorkersAIAuth`, `cloudflareAIGatewayAuth` | Cloudflare Workers AI / gateway auth | pi-ai::providers
src/providers/cloudflare-stream.ts | `resolveCloudflareModel`, `cloudflareStreams`, `cloudflareClassifier` | Cloudflare stream/classifier provider wrappers | pi-ai::providers
src/providers/openrouter-api.ts | `OpenRouterPricing`, `OpenRouterPricingOverride`, `OpenRouterModel`, `openRouterCost` | OpenRouter API: pricing, model, cost | pi-ai::providers
src/providers/radius-config.ts | `DEFAULT_RADIUS_GATEWAY`, `RadiusGatewayModel`, `RadiusGatewayConfig`, `RadiusOAuthCredential`, `normalizeRadiusGatewayUrl`, `getRadiusCredentialConfig`, `getRadiusModelsFromConfig`, `getRadiusModels` | Radius gateway config, credential, models | pi-ai::providers
src/providers/opencode-headers.ts | `withOpenCodeSessionHeader` | Add OpenCode session header to streams | pi-ai::providers
src/providers/anthropic.ts | `anthropicProvider` | Anthropic provider factory | pi-ai::providers
src/providers/anthropic.models.ts | `ANTHROPIC_MODELS`, `ANTHROPIC_IMAGE_MODELS`, `ANTHROPIC_CLASSIFIER_MODELS` | Anthropic model catalog data | pi-ai::providers
src/providers/amazon-bedrock.ts | `amazonBedrockProvider` | Amazon Bedrock provider factory | pi-ai::providers
src/providers/amazon-bedrock.models.ts | `AMAZON_BEDROCK_MODELS`, `AMAZON_BEDROCK_IMAGE_MODELS`, `AMAZON_BEDROCK_CLASSIFIER_MODELS` | Amazon Bedrock model catalog data | pi-ai::providers
src/providers/ant-ling.ts | `antLingProvider` | Ant Ling provider factory | pi-ai::providers
src/providers/ant-ling.models.ts | `ANT_LING_MODELS`, `ANT_LING_IMAGE_MODELS`, `ANT_LING_CLASSIFIER_MODELS` | Ant Ling model catalog data | pi-ai::providers
src/providers/azure.ts | `azureProvider` | Azure provider factory (responses/completions) | pi-ai::providers
src/providers/azure.models.ts | `AZURE_MODELS`, `AZURE_IMAGE_MODELS`, `AZURE_CLASSIFIER_MODELS` | Azure model catalog data | pi-ai::providers
src/providers/baseten.ts | `basetenProvider` | Baseten provider factory | pi-ai::providers
src/providers/baseten.models.ts | `BASETEN_MODELS`, `BASETEN_IMAGE_MODELS`, `BASETEN_CLASSIFIER_MODELS` | Baseten model catalog data | pi-ai::providers
src/providers/cerebras.ts | `cerebrasProvider` | Cerebras provider factory | pi-ai::providers
src/providers/cerebras.models.ts | `CEREBRAS_MODELS`, `CEREBRAS_IMAGE_MODELS`, `CEREBRAS_CLASSIFIER_MODELS` | Cerebras model catalog data | pi-ai::providers
src/providers/cloudflare-ai-gateway.ts | `cloudflareAIGatewayProvider` | Cloudflare AI Gateway provider factory | pi-ai::providers
src/providers/cloudflare-ai-gateway.models.ts | `CLOUDFLARE_AI_GATEWAY_MODELS`, `CLOUDFLARE_AI_GATEWAY_IMAGE_MODELS`, `CLOUDFLARE_AI_GATEWAY_CLASSIFIER_MODELS` | Cloudflare AI Gateway model catalog data | pi-ai::providers
src/providers/cloudflare-workers-ai.ts | `cloudflareWorkersAIProvider` | Cloudflare Workers AI provider factory | pi-ai::providers
src/providers/cloudflare-workers-ai.models.ts | `CLOUDFLARE_WORKERS_AI_MODELS`, `CLOUDFLARE_WORKERS_AI_IMAGE_MODELS`, `CLOUDFLARE_WORKERS_AI_CLASSIFIER_MODELS` | Cloudflare Workers AI model catalog data | pi-ai::providers
src/providers/deepseek.ts | `deepseekProvider` | DeepSeek provider factory | pi-ai::providers
src/providers/deepseek.models.ts | `DEEPSEEK_MODELS`, `DEEPSEEK_IMAGE_MODELS`, `DEEPSEEK_CLASSIFIER_MODELS` | DeepSeek model catalog data | pi-ai::providers
src/providers/fireworks.ts | `fireworksProvider` | Fireworks provider factory (anthropic/openai) | pi-ai::providers
src/providers/fireworks.models.ts | `FIREWORKS_MODELS`, `FIREWORKS_IMAGE_MODELS`, `FIREWORKS_CLASSIFIER_MODELS` | Fireworks model catalog data | pi-ai::providers
src/providers/github-copilot.ts | `githubCopilotProvider` | GitHub Copilot provider factory | pi-ai::providers
src/providers/github-copilot.models.ts | `GITHUB_COPILOT_MODELS`, `GITHUB_COPILOT_IMAGE_MODELS`, `GITHUB_COPILOT_CLASSIFIER_MODELS` | GitHub Copilot model catalog data | pi-ai::providers
src/providers/google.ts | `googleProvider` | Google provider factory | pi-ai::providers
src/providers/google.models.ts | `GOOGLE_MODELS`, `GOOGLE_IMAGE_MODELS`, `GOOGLE_CLASSIFIER_MODELS` | Google model catalog data | pi-ai::providers
src/providers/google-vertex.ts | `googleVertexProvider` | Google Vertex provider factory | pi-ai::providers
src/providers/google-vertex.models.ts | `GOOGLE_VERTEX_MODELS`, `GOOGLE_VERTEX_IMAGE_MODELS`, `GOOGLE_VERTEX_CLASSIFIER_MODELS` | Google Vertex model catalog data | pi-ai::providers
src/providers/groq.ts | `groqProvider` | Groq provider factory | pi-ai::providers
src/providers/groq.models.ts | `GROQ_MODELS`, `GROQ_IMAGE_MODELS`, `GROQ_CLASSIFIER_MODELS` | Groq model catalog data | pi-ai::providers
src/providers/huggingface.ts | `huggingfaceProvider` | HuggingFace provider factory | pi-ai::providers
src/providers/huggingface.models.ts | `HUGGINGFACE_MODELS`, `HUGGINGFACE_IMAGE_MODELS`, `HUGGINGFACE_CLASSIFIER_MODELS` | HuggingFace model catalog data | pi-ai::providers
src/providers/kimi-coding.ts | `kimiCodingProvider` | Kimi Coding provider factory | pi-ai::providers
src/providers/kimi-coding.models.ts | `KIMI_CODING_MODELS`, `KIMI_CODING_IMAGE_MODELS`, `KIMI_CODING_CLASSIFIER_MODELS` | Kimi Coding model catalog data | pi-ai::providers
src/providers/meta.ts | `metaProvider` | Meta provider factory | pi-ai::providers
src/providers/meta.models.ts | `META_MODELS`, `META_IMAGE_MODELS`, `META_CLASSIFIER_MODELS` | Meta model catalog data | pi-ai::providers
src/providers/minimax.ts | `minimaxProvider` | MiniMax provider factory | pi-ai::providers
src/providers/minimax.models.ts | `MINIMAX_MODELS`, `MINIMAX_IMAGE_MODELS`, `MINIMAX_CLASSIFIER_MODELS` | MiniMax model catalog data | pi-ai::providers
src/providers/minimax-cn.ts | `minimaxCnProvider` | MiniMax CN provider factory | pi-ai::providers
src/providers/minimax-cn.models.ts | `MINIMAX_CN_MODELS`, `MINIMAX_CN_IMAGE_MODELS`, `MINIMAX_CN_CLASSIFIER_MODELS` | MiniMax CN model catalog data | pi-ai::providers
src/providers/mistral.ts | `mistralProvider` | Mistral provider factory | pi-ai::providers
src/providers/mistral.models.ts | `MISTRAL_MODELS`, `MISTRAL_IMAGE_MODELS`, `MISTRAL_CLASSIFIER_MODELS` | Mistral model catalog data | pi-ai::providers
src/providers/moonshotai.ts | `moonshotaiProvider` | MoonshotAI provider factory | pi-ai::providers
src/providers/moonshotai.models.ts | `MOONSHOTAI_MODELS`, `MOONSHOTAI_IMAGE_MODELS`, `MOONSHOTAI_CLASSIFIER_MODELS` | MoonshotAI model catalog data | pi-ai::providers
src/providers/moonshotai-cn.ts | `moonshotaiCnProvider` | MoonshotAI CN provider factory | pi-ai::providers
src/providers/moonshotai-cn.models.ts | `MOONSHOTAI_CN_MODELS`, `MOONSHOTAI_CN_IMAGE_MODELS`, `MOONSHOTAI_CN_CLASSIFIER_MODELS` | MoonshotAI CN model catalog data | pi-ai::providers
src/providers/nvidia.ts | `nvidiaProvider` | NVIDIA provider factory | pi-ai::providers
src/providers/nvidia.models.ts | `NVIDIA_MODELS`, `NVIDIA_IMAGE_MODELS`, `NVIDIA_CLASSIFIER_MODELS` | NVIDIA model catalog data | pi-ai::providers
src/providers/openai.ts | `openaiProvider` | OpenAI provider factory | pi-ai::providers
src/providers/openai.models.ts | `OPENAI_MODELS`, `OPENAI_IMAGE_MODELS`, `OPENAI_CLASSIFIER_MODELS` | OpenAI model catalog data | pi-ai::providers
src/providers/openai-codex.ts | `openaiCodexProvider` | OpenAI Codex provider factory | pi-ai::providers
src/providers/openai-codex.models.ts | `OPENAI_CODEX_MODELS`, `OPENAI_CODEX_IMAGE_MODELS`, `OPENAI_CODEX_CLASSIFIER_MODELS` | OpenAI Codex model catalog data | pi-ai::providers
src/providers/opencode.ts | `opencodeProvider` | OpenCode provider factory | pi-ai::providers
src/providers/opencode.models.ts | `OPENCODE_MODELS`, `OPENCODE_IMAGE_MODELS`, `OPENCODE_CLASSIFIER_MODELS` | OpenCode model catalog data | pi-ai::providers
src/providers/opencode-go.ts | `opencodeGoProvider` | OpenCode Go provider factory | pi-ai::providers
src/providers/opencode-go.models.ts | `OPENCODE_GO_MODELS`, `OPENCODE_GO_IMAGE_MODELS`, `OPENCODE_GO_CLASSIFIER_MODELS` | OpenCode Go model catalog data | pi-ai::providers
src/providers/openrouter.ts | `personalizeOpenRouterCatalog`, `openrouterProvider` | OpenRouter provider factory, catalog personalize | pi-ai::providers
src/providers/openrouter.models.ts | `OPENROUTER_MODELS`, `OPENROUTER_IMAGE_MODELS`, `OPENROUTER_CLASSIFIER_MODELS` | OpenRouter model catalog data | pi-ai::providers
src/providers/qwen-token-plan.ts | `qwenTokenPlanProvider` | Qwen token plan provider factory | pi-ai::providers
src/providers/qwen-token-plan.models.ts | `QWEN_TOKEN_PLAN_MODELS`, `QWEN_TOKEN_PLAN_IMAGE_MODELS`, `QWEN_TOKEN_PLAN_CLASSIFIER_MODELS` | Qwen token plan model catalog data | pi-ai::providers
src/providers/qwen-token-plan-cn.ts | `qwenTokenPlanCnProvider` | Qwen token plan CN provider factory | pi-ai::providers
src/providers/qwen-token-plan-cn.models.ts | `QWEN_TOKEN_PLAN_CN_MODELS`, `QWEN_TOKEN_PLAN_CN_IMAGE_MODELS`, `QWEN_TOKEN_PLAN_CN_CLASSIFIER_MODELS` | Qwen token plan CN model catalog data | pi-ai::providers
src/providers/qwen-token-plan-individual.ts | `qwenTokenPlanIndividualProvider` | Qwen token plan individual provider factory | pi-ai::providers
src/providers/qwen-token-plan-individual.models.ts | `QWEN_TOKEN_PLAN_INDIVIDUAL_MODELS`, `QWEN_TOKEN_PLAN_INDIVIDUAL_IMAGE_MODELS`, `QWEN_TOKEN_PLAN_INDIVIDUAL_CLASSIFIER_MODELS` | Qwen token plan individual model catalog data | pi-ai::providers
src/providers/qwen-token-plan-individual-cn.ts | `qwenTokenPlanIndividualCnProvider` | Qwen token plan individual CN provider factory | pi-ai::providers
src/providers/qwen-token-plan-individual-cn.models.ts | `QWEN_TOKEN_PLAN_INDIVIDUAL_CN_MODELS`, `QWEN_TOKEN_PLAN_INDIVIDUAL_CN_IMAGE_MODELS`, `QWEN_TOKEN_PLAN_INDIVIDUAL_CN_CLASSIFIER_MODELS` | Qwen token plan individual CN model catalog data | pi-ai::providers
src/providers/radius.ts | `RadiusProviderOptions`, `radiusProvider` | Radius provider factory | pi-ai::providers
src/providers/radius.models.ts | `RADIUS_MODELS`, `RADIUS_IMAGE_MODELS`, `RADIUS_CLASSIFIER_MODELS` | Radius model catalog data | pi-ai::providers
src/providers/together.ts | `togetherProvider` | Together provider factory | pi-ai::providers
src/providers/together.models.ts | `TOGETHER_MODELS`, `TOGETHER_IMAGE_MODELS`, `TOGETHER_CLASSIFIER_MODELS` | Together model catalog data | pi-ai::providers
src/providers/typesafe.ts | `typesafeProvider` | Type-safe provider factory | pi-ai::providers
src/providers/typesafe.models.ts | `TYPESAFE_MODELS`, `TYPESAFE_IMAGE_MODELS`, `TYPESAFE_CLASSIFIER_MODELS` | Type-safe model catalog data | pi-ai::providers
src/providers/vercel-ai-gateway.ts | `vercelAIGatewayProvider` | Vercel AI Gateway provider factory | pi-ai::providers
src/providers/vercel-ai-gateway.models.ts | `VERCEL_AI_GATEWAY_MODELS`, `VERCEL_AI_GATEWAY_IMAGE_MODELS`, `VERCEL_AI_GATEWAY_CLASSIFIER_MODELS` | Vercel AI Gateway model catalog data | pi-ai::providers
src/providers/xai.ts | `xaiProvider` | xAI provider factory | pi-ai::providers
src/providers/xai.models.ts | `XAI_MODELS`, `XAI_IMAGE_MODELS`, `XAI_CLASSIFIER_MODELS` | xAI model catalog data | pi-ai::providers
src/providers/xiaomi.ts | `xiaomiProvider` | Xiaomi provider factory | pi-ai::providers
src/providers/xiaomi.models.ts | `XIAOMI_MODELS`, `XIAOMI_IMAGE_MODELS`, `XIAOMI_CLASSIFIER_MODELS` | Xiaomi model catalog data | pi-ai::providers
src/providers/xiaomi-token-plan-ams.ts | `xiaomiTokenPlanAmsProvider` | Xiaomi token plan AMS provider factory | pi-ai::providers
src/providers/xiaomi-token-plan-ams.models.ts | `XIAOMI_TOKEN_PLAN_AMS_MODELS`, `XIAOMI_TOKEN_PLAN_AMS_IMAGE_MODELS`, `XIAOMI_TOKEN_PLAN_AMS_CLASSIFIER_MODELS` | Xiaomi token plan AMS model catalog data | pi-ai::providers
src/providers/xiaomi-token-plan-cn.ts | `xiaomiTokenPlanCnProvider` | Xiaomi token plan CN provider factory | pi-ai::providers
src/providers/xiaomi-token-plan-cn.models.ts | `XIAOMI_TOKEN_PLAN_CN_MODELS`, `XIAOMI_TOKEN_PLAN_CN_IMAGE_MODELS`, `XIAOMI_TOKEN_PLAN_CN_CLASSIFIER_MODELS` | Xiaomi token plan CN model catalog data | pi-ai::providers
src/providers/xiaomi-token-plan-sgp.ts | `xiaomiTokenPlanSgpProvider` | Xiaomi token plan SGP provider factory | pi-ai::providers
src/providers/xiaomi-token-plan-sgp.models.ts | `XIAOMI_TOKEN_PLAN_SGP_MODELS`, `XIAOMI_TOKEN_PLAN_SGP_IMAGE_MODELS`, `XIAOMI_TOKEN_PLAN_SGP_CLASSIFIER_MODELS` | Xiaomi token plan SGP model catalog data | pi-ai::providers
src/providers/zai.ts | `zaiProvider` | Zai provider factory | pi-ai::providers
src/providers/zai.models.ts | `ZAI_MODELS`, `ZAI_IMAGE_MODELS`, `ZAI_CLASSIFIER_MODELS` | Zai model catalog data | pi-ai::providers
src/providers/zai-coding-cn.ts | `zaiCodingCnProvider` | Zai Coding CN provider factory | pi-ai::providers
src/providers/zai-coding-cn.models.ts | `ZAI_CODING_CN_MODELS`, `ZAI_CODING_CN_IMAGE_MODELS`, `ZAI_CODING_CN_CLASSIFIER_MODELS` | Zai Coding CN model catalog data | pi-ai::providers
src/providers/data-json.d.ts | — | Ambient module decl for bundled JSON data | pi-ai (types)

## src/providers/images

src/providers/images/register-builtins.ts | `generateImagesOpenRouter`, `registerBuiltInImagesApiProviders` | Register builtin image API providers | pi-ai::providers

## src/utils

src/utils/abort-signals.ts | `CombinedAbortSignal`, `combineAbortSignals` | Combine multiple abort signals | pi-ai::utils
src/utils/abort.ts | `operationSignal`, `raceWithAbortSignal` | Abort operation, race with signal | pi-ai::utils
src/utils/diagnostics.ts | `DiagnosticErrorInfo`, `AssistantMessageDiagnostic`, `formatThrownValue`, `extractDiagnosticError`, `createAssistantMessageDiagnostic`, `appendAssistantMessageDiagnostic` | Assistant-message diagnostics, error info | pi-ai::utils
src/utils/error-body.ts | `MAX_PROVIDER_ERROR_BODY_CHARS`, `NormalizedProviderError`, `normalizeProviderError`, `withCauseDetail`, `formatProviderError`, `truncateErrorText`, `safeJsonStringify` | Normalize/format provider error bodies | pi-ai::utils
src/utils/estimate.ts | `ContextUsageEstimate`, `calculateContextTokens`, `estimateTextTokens`, `estimateTextAndImageContentTokens`, `estimateMessageTokens`, `estimateContextTokens` | Estimate context/message tokens | pi-ai::utils
src/utils/event-stream.ts | `EventStream`, `AssistantMessageEventStream`, `createAssistantMessageEventStream` | Async event stream for messages | pi-ai::utils
src/utils/hash.ts | `shortHash` | Short hash of a string | pi-ai::utils
src/utils/headers.ts | `headersToRecord`, `providerHeadersToRecord` | Convert headers to plain record | pi-ai::utils
src/utils/identity.ts | `UserAgentMode`, `ClientAttribution`, `PI_ATTRIBUTION`, `ClientIdentity`, `ClientIdentityTarget`, `mergeClientIdentity`, `getClientVersion`, `formatUserAgent`, `getAttributionHeaders`, `getOpenCodeSessionHeaders` | Client identity, user-agent, attribution headers | pi-ai::utils
src/utils/json-parse.ts | `repairJson`, `parseJsonWithRepair`, `parseToolCallArguments`, `parseStreamingJson` | Parse/repair JSON, streaming tool args | pi-ai::utils
src/utils/model-operations.ts | `getModelType`, `isModelType`, `assertChatModel`, `assertImageModel`, `assertClassifierModel`, `assertClassifierInputSupported`, `imageErrorResult`, `classifierErrorResult` | Model type checks, image/classifier error results | pi-ai::utils
src/utils/models-error.ts | `ModelsErrorCode`, `ModelsError` | ModelsError class and code type | pi-ai::utils
src/utils/node-http-proxy.ts | `UNSUPPORTED_PROXY_PROTOCOL_MESSAGE`, `resolveHttpProxyUrlForTarget` | Resolve http proxy URL for target | pi-ai::utils
src/utils/oauth-page.ts | `oauthSuccessHtml`, `oauthErrorHtml` | OAuth success/error HTML pages | pi-ai::utils
src/utils/openrouter-cost.ts | `OpenRouterUsageAccounting`, `isOpenRouterModel`, `applyOpenRouterReportedCost` | OpenRouter reported cost accounting | pi-ai::utils
src/utils/overflow.ts | `isContextOverflow`, `isRecoverableLength`, `getOverflowPatterns` | Detect context overflow / recoverable length | pi-ai::utils
src/utils/provider-env.ts | `getProviderEnvValue` | Read provider env var value | pi-ai::utils
src/utils/provider-retry.ts | `retryProviderRequest` | Retry provider request with backoff | pi-ai::utils
src/utils/retry.ts | `RetryPolicy`, `DEFAULT_MAX_AGENT_RETRY_DELAY_MS`, `retryDelayMs`, `RetryCallbacks`, `retryAssistantCall`, `isRetryableAssistantError` | Retry assistant calls, retry policy | pi-ai::utils
src/utils/sanitize-unicode.ts | `sanitizeSurrogates` | Strip unpaired UTF-16 surrogates | pi-ai::utils
src/utils/sleep.ts | `sleep` | Abortable sleep | pi-ai::utils
src/utils/streaming-json.ts | `JsonPath`, `JsonChange`, `StreamingJsonParser`, `ToolCallArgumentsStream` | Streaming JSON parser, tool-arg stream | pi-ai::utils
src/utils/string-enum.ts | `StringEnum` | String enum schema helper | pi-ai::utils
src/utils/text.ts | `contentText`, `getSystemMessageText`, `renderSystemMessageUpdate`, `ownedSlice` | Content text, system message text helpers | pi-ai::utils
src/utils/transcript.ts | `TranscriptContext`(re-export), `createInitialSystemMessage`, `normalizeContext`, `TranscriptMessages`, `getInitialSystemMessage`, `withoutInitialSystemMessage`, `getCurrentTools`, `getCurrentSystemMessage`, `getCurrentSystemPrompt`, `collapseSystemMessages` | Transcript: normalize, current tools/system prompt | pi-ai::utils
src/utils/uuid.ts | `uuidv7` | Generate UUID v7 | pi-ai::utils
src/utils/validation.ts | `validateToolCall`, `validateToolArguments` | Validate tool calls/arguments | pi-ai::utils
src/utils/version.ts | `PI_AI_VERSION` | Package version constant | pi-ai::utils

## Notes

- Provider catalog pairs (`<name>.ts` + `<name>.models.ts`) are highly repetitive; most are
  `Provider<"openai-completions">` factories over a generated catalog.
- `.lazy.ts` files are thin dynamic-import wrappers of the matching `.ts`; keep as-is in port.
- Test files (`test/**`) map to `pi-ai` `#[cfg(test)]`; not enumerated here (out of scope, see ticket).
- `src/cli.ts` and `src/providers/data-json.d.ts` carry no runtime exports.
