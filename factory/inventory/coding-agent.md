# Inventory: packages/coding-agent (pi `coding-agent`)

Format: `path | exports | purpose | target crate`. Source root: `/src/pi/packages/coding-agent`.
Rust crates live under `crates/`. `src/index.ts` is the SDK public surface; `src/cli.ts`, `src/main.ts`, `src/rpc-entry.ts` are executable entrypoints (bin targets).

## src/bun

src/bun/cli.ts | (none; imports side-effect modules, then `../cli.ts`) | Bun executable entrypoint | pi-coding-agent (bin)
src/bun/quickjs-wasm.d.ts | (declare module) | Ambient decl: QuickJS wasm asset path | pi-coding-agent (asset)
src/bun/restore-sandbox-env.ts | `restoreSandboxEnv` | Restore original env vars post-sandbox | pi-coding-agent
src/bun/runtime-setup.ts | (side-effect: registers providers, sets process.title) | Configure Bedrock/OAuth providers, QuickJS wasm | pi-coding-agent
src/bun/sandbox-env-setup.ts | (side-effect: calls restoreSandboxEnv) | Restore env before startup imports | pi-coding-agent

## src/cli
src/cli/args.ts | `Mode`,`Args`,`isValidThinkingLevel`,`normalizeSessionName`,`parseArgs`,`printHelp` | Parse CLI args, help, thinking-level validation | pi-coding-agent
src/cli/auth-check.ts | `AuthCheckStatus`,`AuthCheckResult`,`checkProviderAuth`,`getProviderCredential`,`createAuthCheckModelRuntime` | Check provider auth/credentials readiness | pi-coding-agent
src/cli/auth-command.ts | `AuthCommandKind`,`AuthCommand`,`AuthCommandError`,`getAuthCommandName/Usage`,`isAuthCommandHelp`,`printAuthCommandHelp`,`parseAuthCommand`,`validateAuthCommandArgs`,`getAuthCredential` | Parse/run `auth` subcommands (check, api_key, bearer) | pi-coding-agent
src/cli/auth-login.ts | `AuthLoginOptions`,`runAuthLogin` | CLI: log in to a provider | pi-coding-agent
src/cli/auth-logout.ts | `AuthLogoutOptions`,`runAuthLogout` | CLI: log out of a provider | pi-coding-agent
src/cli/auth-terminal.ts | `AuthOutput`,`LoginTerminal`,`createProcessLoginTerminal` | Terminal I/O for OAuth device-code login | pi-coding-agent
src/cli/config-selector.ts | `ConfigSelectorOptions`,`selectConfig` | Interactive config file selection | pi-coding-agent
src/cli/credential-print.ts | `resolveCredentialForPrint` | Resolve credential value for print | pi-coding-agent
src/cli/file-processor.ts | `ProcessedFiles`,`ProcessFileOptions`,`processFileArguments` | Read @file args into messages | pi-coding-agent
src/cli/initial-message.ts | `InitialMessageInput`,`InitialMessageResult`,`buildInitialMessage` | Build first user message from args/files | pi-coding-agent
src/cli/list-models.ts | `listModels` | List available models to stdout | pi-coding-agent
src/cli/project-trust.ts | `createProjectTrustContext` | Set up project-trust context for CLI | pi-coding-agent
src/cli/session-picker.ts | `selectSession` | Interactive session picker for CLI | pi-coding-agent
src/cli/setup.ts | `setupCli` | One-time CLI env/config setup | pi-coding-agent
src/cli/startup-ui.ts | `createStartupTui`,`startStartupTui`,`shouldRunFirstTimeSetup`,`showStartupSelector`,`showFirstTimeSetup`,`showStartupInput` | Startup TUI: first-run setup, selectors | pi-coding-agent

## src (root files)
src/config.ts | `isBunBinary`,`isBunRuntime`,`isBundledNode`,`InstallMethod`,`SelfUpdateCommand`,`detectInstallMethod`,`getSelfUpdateCommand`,`getConfiguredSelfUpdateArgv`,`makeConfiguredSelfUpdateCommand`,`getSelfUpdateUnavailableInstruction`,`getUpdateInstruction`,`findNodePackageDir`,`getPackageDir`,`getThemesDir`,`getExportTemplateDir`,`getPackageJsonPath`,`getReadmePath`,`getDocsPath`,`getExamplesPath`,`getChangelogPath`,`getInteractiveAssetsDir`,`getBundledInteractiveAssetPath`,`setEmbeddedQuickJSWasmPath`,`getQuickJSWasmPath`,`resolveCodemodeWorkerSpecifier`,`getCodemodeWorkerSpecifier`,`InstallChange`,`detectInstallChange`,`PACKAGE_NAME` | Install-method detection, asset/worker paths, self-update, self-update change | pi-coding-agent
src/index.ts | re-exports cli, core, tools, extensions, agent-session, models, resource-loader, package-manager | Public SDK API surface (all re-exports) | pi-coding-agent (lib root)
src/main.ts | `createSessionManager`,`MainOptions`,`main` | Wire services, build program, run main entry | pi-coding-agent
src/migrations.ts | `migrateAuthToAuthJson`,`migrateSessionsFromAgentRoot`,`showDeprecationWarnings`,`runMigrations` | Migrate auth/sessions config on startup | pi-coding-agent
src/package-manager-cli.ts | `PackageCommand`,`cleanupManagedInstall`,`PackageCommandRuntimeOptions`,`handleConfigCommand`,`handlePackageCommand` | CLI: install/remove/update/list packages, config | pi-coding-agent
src/rpc-entry.ts | (side-effect: sets process.title, configures dispatcher, runs main) | RPC binary entrypoint (imports main) | pi-coding-agent (bin)

## src/core (root files)
src/core/agent-session-runtime.ts | `CreateAgentSessionRuntimeResult`,`CreateAgentSessionRuntimeFactory`,`SessionImportFileNotFoundError`,`AgentSessionRuntime`,`createAgentSessionRuntime` | Runtime: create/manage agent session instances | pi-coding-agent
src/core/agent-session-services.ts | `AgentSessionRuntimeDiagnostic`,`CreateAgentSessionServicesOptions`,`CreateAgentSessionFromServicesOptions`,`AgentSessionServices`,`createAgentSessionServices`,`createAgentSessionFromServices` | Assemble services for a new agent session | pi-coding-agent
src/core/agent-session.ts | `markRuntimeStreamFunction`,`ParsedSkillBlock`,`parseSkillBlock`,`AgentSessionEvent`,`AgentSessionEventListener`,`AgentSessionConfig`,`ExtensionBindings`,`PromptOptions`,`ModelMutationOptions`,`ModelCycleResult`,`SessionStats`,`AgentSession` | Core session: prompt, events, model mutations, stats | pi-coding-agent
src/core/auth-guidance.ts | `getProviderLoginHelp`,`formatNoModelsAvailableMessage`,`formatNoModelSelectedMessage`,`formatNoApiKeyFoundMessage` | Auth/login help and error messages | pi-coding-agent
src/core/auth-storage.ts | `AuthStorageBackend`,`FileAuthStorageBackend`,`ReadOnlyAuthStorage`,`InMemoryAuthStorageBackend`,`AuthStorage`,`readStoredCredential` | Store credentials (file/memory, read-only) | pi-coding-agent
src/core/bash-executor.ts | `BashExecutorOptions`,`BashResult`,`executeBashWithOperations` | Execute bash shell operations for tools | pi-coding-agent
src/core/bug-report.ts | `BUG_REPORT_CUSTOM_ENTRY_TYPE`,`redactUrl`,`redactJsonValue`,`collectBugReportMetadata`,`collectBugReportDiagnostics`,`BugReportMetadata`,`BugReportDiagnostics`,`BugReportBundle`,`bugReportFiles`,`writeBugReportArchive`,`bugReportArchiveFileName`,`generateBugReportSummary` | Collect/redact bundle for bug reports | pi-coding-agent
src/core/bug-report-upload.ts | `uploadBugReport` | Upload bug-report archive to server | pi-coding-agent
src/core/cache-stats.ts | `CACHE_TTL_MS`,`CacheMiss`,`CacheWasteTotals`,`ModelPriceSource`,`computeCacheWaste`,`collectCacheMisses`,`detectCacheMiss` | Compute prompt-cache waste/miss stats | pi-coding-agent
src/core/cache-warmer.ts | `CacheWarmingAction`,`CacheWarmingDecision`,`CacheWarmingDecisionEvent`,`CacheWarmingDecisionEventResult`,`CacheWarmingStatus`,`CacheWarmRequest`,`CacheWarmer`,`formatCacheWarmingStatus`,`formatCacheWarmingUsage` | Warm model prompt cache; status/usage | pi-coding-agent
src/core/client-identity.ts | `getClientIdentity` | Derive client identity from settings | pi-coding-agent
src/core/crash-log.ts | `CrashRecord`,`readCrashLog`,`findExtensionStackMatches`,`recordCrash`,`takeUnnotifiedCrash`,`clearCrashLog` | Read/record extension crash log | pi-coding-agent
src/core/defaults.ts | `DEFAULT_THINKING_LEVEL`,`THINKING_LEVEL_OPTIONS` | Default thinking level constants | pi-coding-agent
src/core/diagnostics.ts | `ResourceCollision`,`ResourceDiagnostic` | Resource collision/diagnostic types | pi-coding-agent
src/core/event-bus.ts | `EventBus`,`EventBusController`,`createEventBus` | Create publish/subscribe event bus | pi-coding-agent
src/core/exec.ts | `ExecOptions`,`ExecResult`,`execCommand` | Run external command with options | pi-coding-agent
src/core/experimental.ts | `areExperimentalFeaturesEnabled` | Check experimental feature flag | pi-coding-agent
src/core/footer-data-provider.ts | `GitPaths`,`findGitPaths`,`FooterDataProvider`,`ReadonlyFooterDataProvider` | Supply footer data (git, session, models) | pi-coding-agent
src/core/http-dispatcher.ts | `DEFAULT_HTTP_IDLE_TIMEOUT_MS`,`HTTP_IDLE_TIMEOUT_CHOICES`,`parseHttpIdleTimeoutMs`,`formatHttpIdleTimeoutMs`,`applyHttpProxySettings`,`configureHttpDispatcher` | Configure HTTP proxy and idle timeouts | pi-coding-agent
src/core/index.ts | re-exports bash-executor, cache-warmer, compaction, event-bus, experimental, source-info, tools | Public core API surface | pi-coding-agent (lib root)
src/core/keybindings-schema.ts | `KeybindingValueSchema`,`KeybindingsSchema` | TypeBox schema for keybindings config | pi-coding-agent
src/core/keybindings.ts | `useWindowsKeybindings`,`AppKeybinding`,`AppKeybindings`,`KEYBINDINGS`,`migrateKeybindingsConfig`,`KeybindingsManager` | Keybinding definitions, migration, manager | pi-coding-agent
src/core/key-id-schema.ts | `KeyIdSchema`,`keybindingValueSchema`,`KeybindingValueSchema` | Schema for key ids and binding values | pi-coding-agent
src/core/mcp-servers.ts | `createToolNameMatcher`,`LIST_MCP_RESOURCES_TOOL`,`LIST_MCP_RESOURCE_TEMPLATES_TOOL`,`READ_MCP_RESOURCE_TOOL`,`isMcpToolName`,`McpExposure`,`McpStdioServerConfig`,`McpOAuthConfig`,`isClientMetadataDocumentCallback`,`McpHttpServerConfig`,`McpServerConfig`,`getMcpToolExposure`,`validateMcpServerConfig`,`RegisteredMcpServer`,`McpServerRegistry` | MCP server configs, registry, tool exposure | pi-coding-agent
src/core/messages.ts | `COMPACTION_SUMMARY_PREFIX`,`COMPACTION_SUMMARY_SUFFIX`,`BRANCH_SUMMARY_PREFIX`,`BRANCH_SUMMARY_SUFFIX`,`BashExecutionMessage`,`CustomMessage`,`BranchSummaryMessage`,`CompactionSummaryMessage`,`bashExecutionToText`,`createBranchSummaryMessage`,`createCompactionSummaryMessage`,`createCustomMessage`,`convertToLlm` | Custom message types; convert messages for LLM | pi-coding-agent
src/core/model-config.ts | `ModelsConfigSchema`,`ModelsJsonSchemas`,`ModelsJsonModel`,`ModelsJsonModelOverride`,`ModelsJsonProvider`,`ModelConfig` | Load/validate models.json model config | pi-coding-agent
src/core/model-registry.ts | `ProviderConfigInput`(re),`ResolvedRequestAuth`,`clearApiKeyCache`(re),`ModelRegistry` | Registry of providers and models | pi-coding-agent
src/core/model-resolver.ts | `defaultModelPerProvider`,`ScopedModel`,`ModelReferenceRequest`,`ModelReferenceResult`,`ModelReferenceTarget`,`resolveModelReference`,`findExactModelReferenceMatch`,`ModelScopeDiagnostic`,`ResolveModelScopeResult`,`resolveModelScopeFromModels`,`resolveModelScopeWithDiagnostics`,`ResolveCliModelResult`,`resolveCliModel`,`InitialModelResult`,`findInitialModel` | Resolve model refs, scopes, initial model | pi-coding-agent
src/core/model-runtime.ts | `CreateModelRuntimeOptions`,`ModelRuntimeAuthOverrides`,`CredentialSynchronizationOperation`,`CredentialSynchronizationError`,`ModelRuntime` | Model runtime: requests, credential sync | pi-coding-agent
src/core/models-store.ts | `InMemoryCodingAgentModelsStore`,`FileModelsStore` | Store model definitions (memory/file) | pi-coding-agent
src/core/nested-tool-calls.ts | `NESTED_CALL_LIMITS`,`NestedCallSummary`,`NestedCallRecorder`,`NestedToolCallOptions`,`NestedToolExecutionEvent`,`NestedToolCallHost`,`NestedToolCallRunner` | Run nested/recursive tool calls with limits | pi-coding-agent
src/core/output-guard.ts | `takeOverStdout`,`restoreStdout`,`isStdoutTakenOver`,`writeRawStdout`,`waitForResult` | Guard stdout: take over, write raw, backpressure | pi-coding-agent
src/core/package-manager.ts | `isOfflineModeEnabled`,`PathMetadata`,`ResolvedResource`,`ResolvedPaths`,`PackageInstallFailure`,`MissingSourceAction`,`ProgressEvent`,`ProgressCallback`,`PackageUpdate`,`ConfiguredPackage`,`PackageManager`,`getExtensionTempFolder`,`DefaultPackageManager` | Install/resolve extension & resource packages | pi-coding-agent
src/core/pi-ai-schemas.ts | `ProviderCompatSchema`,`ModelCostSchema`,`ModelInputLimitsSchema`,`ModelInputModalitySchema`,`ModelPromptCacheSchema`,`ModelThinkingLevelSchema`,`ThinkingLevelMapSchema`,`PartialModelCostSchema` | TypeBox schemas for pi-ai model metadata | pi-coding-agent
src/core/pi-manifest.ts | `PiManifest`,`readPiManifest` | Read pi package manifest from package.json | pi-coding-agent
src/core/preferred-providers.ts | `PREFERRED_PROVIDER_IDS`,`isPreferredProvider`,`compareProviders` | Preferred provider ordering | pi-coding-agent
src/core/project-trust.ts | `AppMode`,`ResolveProjectTrustedOptions`,`resolveProjectTrusted` | Resolve whether a project is trusted | pi-coding-agent
src/core/prompt-templates.ts | `PromptTemplate`,`parseCommandArgs`,`substituteArgs`,`LoadPromptTemplatesOptions`,`LoadPromptTemplatesResult`,`loadPromptTemplates`,`expandPromptTemplate` | Load/expand prompt templates; arg substitution | pi-coding-agent
src/core/provider-composer.ts | `ExtensionOAuthConfig`,`ProviderChatModelConfig`,`ProviderImageModelConfig`,`ProviderClassifierModelConfig`,`ProviderModelConfig`,`ProviderConfigInput`,`AuthStatus`,`clearApiKeyCache`,`validateExtensionProvider`,`composeModelProvider`,`resolveConfiguredModelHeaders`,`CompatibilityRequestConfig`,`resolveCompatibilityRequestConfig`,`configuredRequestAuthStatus` | Compose provider/chat model configs; auth | pi-coding-agent
src/core/provider-matching.ts | `findMatchingProviders` | Find providers matching a name | pi-coding-agent
src/core/radius-mcp.ts | `RadiusMcpServerPlan`,`planRadiusMcpServer` | Plan Radius gateway MCP server config | pi-coding-agent
src/core/radius.ts | `RADIUS_PROVIDER_ID`,`ENV_RADIUS_GATEWAY`,`RADIUS_MCP_URL`,`getRadiusGatewayUrl` | Radius gateway URL/provider constants | pi-coding-agent
src/core/remote-catalog-provider.ts | `REMOTE_CATALOG_REFRESH_INTERVAL_MS`,`REMOTE_CATALOG_MODEL_TYPES`,`PersonalizeCatalog`,`withRemoteCatalog`,`withPersonalizedCatalog` | Fetch/refresh remote model catalog provider | pi-coding-agent
src/core/resolve-config-value.ts | `getConfigValueEnvVarName`,`getConfigValueEnvVarNames`,`getMissingConfigValueEnvVarNames`,`isCommandConfigValue`,`isConfigValueConfigured`,`resolveConfigValue`,`resolveConfigValueUncached`,`resolveConfigValueOrThrow`,`resolveHeaders`,`resolveHeadersOrThrow`,`clearConfigValueCache` | Resolve config values from env/command; headers | pi-coding-agent
src/core/resource-loader.ts | `ResourceCollision`(re),`ResourceDiagnostic`(re),`ResourceExtensionPaths`,`ResourceLoaderReloadOptions`,`formatPackageInstallWarning`,`isBuiltinExtension`,`ResourceLoader`,`loadProjectContextFiles`,`DefaultResourceLoaderOptions`,`DefaultResourceLoader` | Load extensions/skills/templates; context files | pi-coding-agent
src/core/runtime-credentials.ts | `RuntimeCredentials` | In-process credential store impl | pi-coding-agent
src/core/session-cwd.ts | `SessionCwdIssue`,`getMissingSessionCwdIssue`,`formatMissingSessionCwdError`,`formatMissingSessionCwdPrompt`,`MissingSessionCwdChoice`,`getMissingSessionCwdOptions`,`MissingSessionCwdError`,`assertSessionCwdExists` | Handle missing session working directory | pi-coding-agent
src/core/session-export.ts | `serializeSessionBranch`,`exportSessionToJsonl` | Serialize/export session branch to JSONL | pi-coding-agent
src/core/session-manager.ts | `CURRENT_SESSION_VERSION`,`SessionHeader`,`NewSessionOptions`,`SessionEntryBase`,`SessionMessageEntry`,`ThinkingLevelChangeEntry`,`ModelChangeEntry`,`UsageEntry`,`CompactionEntry`,`BranchSummaryEntry`,`CustomEntry`,`LabelEntry`,`SessionInfoEntry`,`CustomMessageEntry`,`ContextEditableContent`,`ContextEditEntry` | Session file entries, headers, persistence | pi-coding-agent
src/core/settings-defaults.ts | `SETTINGS_DEFAULTS` | Default settings values | pi-coding-agent
src/core/settings-diagnostics.ts | `collectSettingsDiagnostics`,`deduplicateDiagnostics` | Collect/dedupe settings diagnostics | pi-coding-agent
src/core/settings-manager.ts | `CACHE_WARMING_MODES`,`DEFAULT_TOOL_NAMES`,`isToolModifier`,`getToolListError`,`applyToolModifiers`,`SettingsScope`,`SettingsStorage`,`SettingsManagerCreateOptions`,`SettingsError`,`FileSettingsStorage`,`InMemorySettingsStorage`,`SettingsManager` | Load/store settings; tool list modifiers | pi-coding-agent
src/core/settings-schema.ts | `SettingsSchema`,`CompactionModelOverride`,`CompactionSettings`,`BranchSummarySettings`,`ProviderRetrySettings`,`RetrySettings`,`TerminalSettings`,`ImageSettings`,`ThinkingBudgetsSettings`,`MermaidRenderingMode`,`MarkdownSettings`,`WarningSettings`,`CodemodeMode`,`CodemodeSettings`,`DefaultProjectTrust`,`QuietStartup` | TypeBox schemas for settings sub-sections | pi-coding-agent
src/core/skills.ts | `SkillFrontmatter`,`Skill`,`LoadSkillsResult`,`LoadSkillsFromDirOptions`,`loadSkillsFromDir`,`formatSkillsForPrompt`,`LoadSkillsOptions`,`loadSkills` | Load skills from dirs; format for prompt | pi-coding-agent
src/core/slash-commands.ts | `SlashCommandSource`,`SlashCommandInfo`,`BuiltinSlashCommand`,`BUILTIN_SLASH_COMMANDS` | Built-in slash command definitions | pi-coding-agent
src/core/source-info.ts | `SourceScope`,`SourceOrigin`,`SourceInfo`,`SourcePackageIdentity`,`getSourcePackageKey`,`BUILTIN_PATH_PREFIX`,`getSyntheticPathSource`,`isSyntheticPath`,`getResourcePathKey`,`createSourceInfo`,`createSyntheticSourceInfo` | Resource source provenance metadata | pi-coding-agent
src/core/system-prompt.ts | `BuildSystemPromptOptions`,`NormalizedBuildSystemPromptOptions`,`SystemPromptSections`,`normalizeBuildSystemPromptOptions`,`buildSystemPromptSections`,`buildSystemPromptState`,`buildSystemPrompt`,`diffSystemPromptSections` | Build and diff system prompt sections | pi-coding-agent
src/core/telemetry.ts | `isInstallTelemetryEnabled` | Check install telemetry flag | pi-coding-agent
src/core/timings.ts | `resetTimings`,`time`,`printTimings` | Startup timing measurements | pi-coding-agent
src/core/trust-manager.ts | `ProjectTrustDecision`,`ProjectTrustStoreEntry`,`ProjectTrustUpdate`,`ProjectTrustOption`,`getProjectTrustParentPath`,`getProjectTrustOptions`,`hasTrustRequiringProjectResources`,`ProjectTrustStore` | Store/query project trust decisions | pi-coding-agent
src/core/usage-totals.ts | `UsageTotals`,`createUsageTotals`,`addUsageToTotals`,`combineUsage`,`UsageCostBreakdownEntry`,`getUsageCostBreakdown` | Aggregate token usage and cost totals | pi-coding-agent
src/core/virtual-models.ts | `VIRTUAL_MODEL_API`,`VIRTUAL_MODEL_STATE_ENTRY`,`VirtualModelStateData`,`ModelRouteReason`,`ModelRouteRequest`,`ModelRoute`,`VirtualModelDefinition`,`isVirtualModel`,`findLatestResponse`,`getBranchSelection`,`getVirtualModelState`,`createVirtualModel` | Virtual model routing and state | pi-coding-agent

## src/core/compaction
src/core/compaction/branch-summarization.ts | `BranchSummaryResult`,`BranchSummaryDetails`,`FileOperations`(re),`BranchPreparation`,`CollectEntriesResult`,`GenerateBranchSummaryOptions`,`collectEntriesForBranchSummary`,`prepareBranchEntries`,`generateBranchSummary` | Summarize a conversation branch on tree navigation | pi-coding-agent
src/core/compaction/compaction.ts | `CompactionDetails`,`CompactionResult`,`CompactionSettings`,`DEFAULT_COMPACTION_SETTINGS`,`calculateContextTokens`,`getLastAssistantUsage`,`ContextUsageEstimate`,`estimateContextTokens`,`estimateProjectedContextTokens`,`shouldCompact`,`estimateTokens`,`findTurnStartIndex`,`CutPointResult`,`findCutPoint`,`getSummarizationFailure`,`completeSummarization`,`generateSummary`,`generateSummaryWithUsage` | Context compaction: token estimate, cut point, summary | pi-coding-agent
src/core/compaction/index.ts | re-exports branch-summarization, compaction, utils | Public compaction API surface | pi-coding-agent
src/core/compaction/utils.ts | `FileOperations`,`createFileOps`,`extractFileOpsFromMessage`,`computeFileLists`,`formatFileOperations`,`serializeConversation`,`SUMMARIZATION_SYSTEM_PROMPT` | File-op extraction; summary prompt/serialize | pi-coding-agent

## src/core/export-html
src/core/export-html/ansi-to-html.ts | `stripAnsiEscapes`,`ansiToHtml`,`ansiLinesToHtml` | Convert ANSI-styled text to HTML | pi-coding-agent
src/core/export-html/index.ts | `ToolHtmlRenderer`,`ExportOptions`,`exportSessionToHtml`,`exportFromFile` | Export session to standalone HTML | pi-coding-agent
src/core/export-html/tool-renderer.ts | `ToolHtmlRendererDeps`,`ToolHtmlRenderer`(impl),`createToolHtmlRenderer` | Render tool calls for HTML export | pi-coding-agent
src/core/export-html/template.css | (asset) | HTML export stylesheet | assets
src/core/export-html/template.html | (asset) | HTML export template shell | assets
src/core/export-html/template.js | (asset) | HTML export client script | assets
src/core/export-html/vendor/highlight.min.js | (vendor asset) | highlight.js for code blocks | assets (vendor)
src/core/export-html/vendor/marked.min.js | (vendor asset) | marked markdown parser | assets (vendor)
src/core/export-html/vendor/marked-cjk-friendly.min.js | (vendor asset) | CJK-friendly marked plugin | assets (vendor)

## src/core/extensions
src/core/extensions/index.ts | re-exports slash-commands, source-info, loader, runner, types, wrapper | Public extensions API surface | pi-coding-agent
src/core/extensions/jiti-loader.ts | `createJiti` | Runtime jiti loader for extensions | pi-coding-agent
src/core/extensions/jiti-static-loader.ts | `createJiti` (static) | Static/compiled jiti loader | pi-coding-agent
src/core/extensions/loader.ts | `clearExtensionCache`,`createExtensionRuntime`,`loadExtensionFromFactory`,`loadExtensions`,`loadExtensionsCached`,`discoverAndLoadExtensions` | Discover/load/cache JS+TS extensions | pi-coding-agent
src/core/extensions/runner.ts | `BeforeAgentStartTrigger`,`ExtensionErrorListener`,`NewSessionHandler`,`ForkHandler`,`NavigateTreeHandler`,`SwitchSessionHandler`,`ReloadHandler`,`ShutdownHandler`,`emitSessionShutdownEvent`,`emitProjectTrustEvent`,`ExtensionRunner` | Run extension hooks; session event emitters | pi-coding-agent
src/core/extensions/types.ts | `ExtensionUIDialogOptions`,`WidgetPlacement`,`ExtensionWidgetOptions`,`TerminalInputHandler`,`WorkingIndicatorOptions`,`AutocompleteProviderFactory`,`EditorFactory`,`KeybindingHints`,`ExtensionUIContext`,`ContextUsage`,`CompactOptions`,`ExtensionMode`,`ExtensionContext`,`ExecuteToolOptions` | Extension SDK type contracts (UI, context) | pi-coding-agent
src/core/extensions/virtual-modules.ts | `VIRTUAL_MODULES` | Virtual modules injected into extensions | pi-coding-agent
src/core/extensions/wrapper.ts | `wrapRegisteredTool`,`wrapRegisteredTools` | Wrap registered tools into AgentTools | pi-coding-agent

## src/core/tools
src/core/tools/bash.ts | `bashToolSystemPromptContribution`,`BashToolInput`,`BashToolOutput`,`BashOperations`,`createLocalShellOperations`,`createLocalBashOperations`,`BashSpawnContext`,`BashSpawnHook`,`BashToolOptions`,`BashRenderState`,`ShellToolConfig`,`createShellToolDefinition`,`createBashToolDefinition` | Bash/shell tool: ops, spawn, definition | pi-coding-agent
src/core/tools/edit-diff.ts | `normalizeToLF`,`applyReplacementsToOriginal`,`normalizeForFuzzyMatch`,`TextReplacement`,`FuzzyMatchResult`,`Edit`,`AppliedEditsResult`,`fuzzyFindText`,`applyEditsToNormalizedContent`,`generateUnifiedPatch`,`generateDiffString`,`EditDiff`,`generateEditDiff`,`EditDiffResult` | Edit diff: fuzzy match, apply edits, patches | pi-coding-agent
src/core/tools/edit.ts | `editToolSystemPromptContribution`,`EditToolInput`,`EditToolDetails`,`EditOperations`,`EditToolOptions`,`createEditToolDefinition`,`createEditTool` | Edit tool: apply text replacements to files | pi-coding-agent
src/core/tools/file-mutation-queue.ts | `withFileMutationQueue` | Serialize per-file mutations | pi-coding-agent
src/core/tools/find.ts | `relativizeFindResultPath`,`findToolSystemPromptContribution`,`FindToolInput`,`FindToolDetails`,`FindOperations`,`FindToolOptions`,`createFindToolDefinition`,`createFindTool` | Find tool: glob file search | pi-coding-agent
src/core/tools/grep.ts | `grepToolSystemPromptContribution`,`GrepToolInput`,`GrepToolDetails`,`GrepOperations`,`GrepToolOptions`,`createGrepToolDefinition`,`createGrepTool` | Grep tool: content search | pi-coding-agent
src/core/tools/index.ts | re-exports read, bash, edit, write, find, grep, ls, powershell; `Tool`,`ToolDef`,`ToolName`,`allToolNames` | Public tools API; tool name set | pi-coding-agent (lib root)
src/core/tools/ls.ts | `lsToolSystemPromptContribution`,`LsToolInput`,`LsToolDetails`,`LsOperations`,`LsToolOptions`,`createLsToolDefinition`,`createLsTool` | LS tool: list directory | pi-coding-agent
src/core/tools/output-accumulator.ts | `OutputAccumulatorOptions`,`OutputSnapshot`,`FullOutput`,`OutputAccumulator` | Accumulate streaming tool output | pi-coding-agent
src/core/tools/path-utils.ts | `pathExists`,`expandPath`,`resolveToCwd`,`resolveReadPath`,`resolveReadPathAsync` | Path expand/resolve helpers for tools | pi-coding-agent
src/core/tools/powershell.ts | `powershellToolSystemPromptContribution`,`PowerShellOperations`,`PowerShellSpawnContext`,`PowerShellSpawnHook`,`PowerShellToolDetails`,`PowerShellToolInput`,`PowerShellToolOptions`,`createLocalPowerShellOperations`,`createPowerShellToolDefinition`,`createPowerShellTool` | PowerShell tool (wraps bash ops) | pi-coding-agent
src/core/tools/read.ts | `readToolSystemPromptContribution`,`ReadToolInput`,`ReadToolOutput`,`ReadToolDetails`,`ReadOperations`,`ReadToolOptions`,`createReadToolDefinition`,`createReadTool` | Read tool: read files (ranges) | pi-coding-agent
src/core/tools/render-utils.ts | `shortenPath`,`linkPath`,`str`,`formatReadLineRange`,`replaceTabs`,`normalizeDisplayText`,`getTextOutput`,`ToolRenderResultLike`,`formatToolCallWithArgs`,`formatToolDuration`,`startToolTimer`,`toolTimerText`,`invalidArgText`,`renderToolPath` | Helpers for rendering tool calls/results | pi-coding-agent
src/core/tools/tool-definition-wrapper.ts | `TypeBoxAgentTool`,`ToolContextFactory`,`wrapToolDefinition`,`wrapToolDefinitions`,`createToolDefinitionFromAgentTool` | Wrap tool definitions for TUI/execution | pi-coding-agent
src/core/tools/truncate.ts | `DEFAULT_MAX_LINES`,`DEFAULT_MAX_BYTES`,`GREP_MAX_LINE_LENGTH`,`TruncationResult`,`TruncationOptions`,`formatSize`,`truncateHead`,`truncateTail`,`truncateLine`,`sliceHead`,`sliceTail` | Truncate tool output (head/tail/line) | pi-coding-agent
src/core/tools/write.ts | `writeToolSystemPromptContribution`,`WriteToolInput`,`WriteOperations`,`WriteToolOptions`,`createWriteToolDefinition`,`createWriteTool` | Write tool: create/overwrite files | pi-coding-agent

## src/core/tools/renderers
src/core/tools/renderers/bash.ts | `BASH_UPDATE_THROTTLE_MS`,`createShellRenderers` | Render bash tool call/result in TUI | pi-coding-agent (TUI)
src/core/tools/renderers/edit.ts | `EditRenderState`,`editRenderers` | Render edit tool call/result in TUI | pi-coding-agent (TUI)
src/core/tools/renderers/find.ts | `findRenderers` | Render find tool call/result in TUI | pi-coding-agent (TUI)
src/core/tools/renderers/grep.ts | `grepRenderers` | Render grep tool call/result in TUI | pi-coding-agent (TUI)
src/core/tools/renderers/index.ts | `ToolRenderers`,`createAllToolRenderers`,`withBuiltInRenderers` | Registry of built-in tool renderers | pi-coding-agent (TUI)
src/core/tools/renderers/ls.ts | `lsRenderers` | Render ls tool call/result in TUI | pi-coding-agent (TUI)
src/core/tools/renderers/read.ts | `readRenderers` | Render read tool call/result in TUI | pi-coding-agent (TUI)
src/core/tools/renderers/write.ts | `writeRenderers` | Render write tool call/result in TUI | pi-coding-agent (TUI)

## src/extensions (built-in extension bundles)
src/extensions/index.ts | `builtInExtensions` | Register built-in extensions (codemode, llama, mcp, tool-search) | pi-coding-agent
src/extensions/codemode/execute.lazy.ts | `loadCodemodeExecutor` | Lazy-load codemode executor module | pi-coding-agent
src/extensions/codemode/execute.ts | `readCodemodeStore`,`executeCodemode` | Execute codemode in QuickJS; store read | pi-coding-agent
src/extensions/codemode/index.ts | `CodemodeExtensionOptions`,`createCodemodeExtension`(default) | Codemode extension: register tool | pi-coding-agent
src/extensions/codemode/renderer.ts | `codemodeRenderers` | Render codemode tool call/result in TUI | pi-coding-agent (TUI)
src/extensions/codemode/tool.ts | `CODEMODE_TOOL_NAME`,`CODEMODE_STORE_ENTRY_TYPE`,`CodemodeStoreEntryData`,`CodemodeModelRuntime`,`CodemodeToolOptions`,`codemodeSchema`,`CodemodeToolInput`,`CodemodeNestedCall`,`CodemodeToolDetails`,`codemodeToolSystemPromptContribution`,`CODEMODE_DOCS_PATH` | Codemode tool: schema, details, nested calls | pi-coding-agent
src/extensions/codemode/worker.ts | (side-effect: imports pi-codemode/worker) | Codemode worker entry (bundled builds) | pi-coding-agent (bin)
src/extensions/llama/client.ts | `LlamaModelStatus`,`LlamaModelInfo`,`LlamaModelsResponse`,`LlamaServerProps`,`LlamaModelEvent`,`LlamaProgress`,`formatBytes`,`normalizeLlamaServerUrl`,`llamaInferenceUrl`,`LlamaClient` | llama.cpp server client; format helpers | pi-coding-agent
src/extensions/llama/huggingface.ts | `HuggingFaceModel`,`HuggingFaceQuantization`,`HuggingFaceModelDetails`,`findHuggingFaceToken`,`HuggingFaceClient` | Download GGUF models from Hugging Face | pi-coding-agent
src/extensions/llama/index.ts | `llamaExtension`(default) | llama.cpp extension: register provider/UI | pi-coding-agent
src/extensions/llama/provider.ts | `LLAMA_PROVIDER_ID`,`DEFAULT_LLAMA_SERVER_URL`,`LlamaProviderController`,`createLlamaProvider` | Local llama.cpp model provider | pi-coding-agent
src/extensions/llama/ui.ts | `LlamaManagerAction`,`LlamaUi`,`showLlamaUi`,`runWithProgress` | llama.cpp model manager TUI | pi-coding-agent (TUI)
src/extensions/mcp/cli.lazy.ts | `loadMcpCommand` | Lazy-load MCP command module | pi-coding-agent
src/extensions/mcp/cli.ts | `McpCommandOptions`,`runMcpCommand` | CLI: manage MCP servers | pi-coding-agent
src/extensions/mcp/config.ts | `McpServerEntry`,`LoadedMcpConfig`,`loadMcpConfig`,`McpServerConfigPatch`,`updateMcpServerConfig`,`addMcpServerConfig`,`removeMcpServerConfig` | Load/patch MCP server config file | pi-coding-agent
src/extensions/mcp/index.ts | `McpTransportFactory`(re),`McpExtensionOptions`,`MCP_SERVERS_SECTION`,`MAX_SERVERS_SECTION_CHARS`,`McpServerListing`,`renderServersSection`,`createMcpExtension`(default) | MCP extension: register tools/resources | pi-coding-agent
src/extensions/mcp/log.ts | `formatMcpLogMessage`,`McpServerLog` | Buffer/format MCP server logs | pi-coding-agent
src/extensions/mcp/oauth.ts | `McpOAuthCredentialStore`,`createMcpAuthProvider`,`McpSignInPrompt`,`signInMcpServer` | MCP OAuth credentials and sign-in | pi-coding-agent
src/extensions/mcp/resources.ts | `LIST_MCP_RESOURCES_TOOL`(re),`McpResourceServer`,`createMcpResourceToolDefinitions` | MCP resource list/read tool definitions | pi-coding-agent
src/extensions/mcp/runtime.lazy.ts | `loadMcpRuntime` | Lazy-load MCP runtime module | pi-coding-agent
src/extensions/mcp/runtime.ts | `McpTransportFactory`,`createDefaultTransport`,`McpServerConnection` | MCP server connection; transport factory | pi-coding-agent
src/extensions/mcp/tools.ts | `toToolExposure`,`McpToolDetails`,`saveToTempFile`,`McpToolCaller`,`createMcpResultSchema`,`ConvertMcpResultOptions`,`toModelContent`,`convertMcpResult`,`createMcpToolDefinition` | MCP tool defs; convert MCP results | pi-coding-agent
src/extensions/mcp/ui.ts | `McpMenu`,`McpUi`,`McpManagerView`,`showMcpManager` | MCP server manager TUI | pi-coding-agent (TUI)
src/extensions/tool-search/index.ts | `createToolSearchExtension`(default) | Tool-search extension: register tool | pi-coding-agent
src/extensions/tool-search/tool.ts | `TOOL_SEARCH_TOOL_NAME`,`DEFAULT_TOOL_SEARCH_LIMIT`,`ToolSearchDocument`,`ToolSearchMatch`,`ToolRanker`,`tokenize`,`createToolSearchDocument`,`Bm25Ranker`,`toolSearchSchema`,`ToolSearchInput` | Search tools via BM25 ranking | pi-coding-agent

## src/modes (interactive + print + rpc)
src/modes/index.ts | `InteractiveMode`,`InteractiveModeOptions`,`JsonAgentSessionEvent`,`PrintModeOptions`,`runPrintMode`,`RpcClient`,`RpcClientOptions`,`RpcEventListener`,`runRpcMode` | Public modes API surface | pi-coding-agent
src/modes/interactive/bug-report.ts | `reportBug` | Interactive bug-report flow | pi-coding-agent (TUI)
src/modes/interactive/chat-viewport.ts | `ChatViewportOptions`,`ChatViewport`,`createChatViewport` | Chat viewport scroll/layout | pi-coding-agent (TUI)
src/modes/interactive/components/armin.ts | `ARMIN_WIDTH`,`ARMIN_HEIGHT`,`isArminPixel`,`ArminComponent` | "Armin" easter-egg component | pi-coding-agent (TUI)
src/modes/interactive/components/assistant-message.ts | `AssistantMessageComponent` | Render assistant message | pi-coding-agent (TUI)
src/modes/interactive/components/auth-url.ts | `AuthUrlComponent` | Show auth URL prompt | pi-coding-agent (TUI)
src/modes/interactive/components/bash-execution.ts | `BashExecutionComponent` | Show bash execution output | pi-coding-agent (TUI)
src/modes/interactive/components/bordered-loader.ts | `BorderedLoader` | Bordered spinner/loader | pi-coding-agent (TUI)
src/modes/interactive/components/branch-summary-message.ts | `BranchSummaryMessageComponent` | Render branch summary message | pi-coding-agent (TUI)
src/modes/interactive/components/compaction-summary-message.ts | `CompactionSummaryMessageComponent` | Render compaction summary | pi-coding-agent (TUI)
src/modes/interactive/components/config-selector.ts | `ScopedResolvedPaths`,`ConfigSelectorComponent` | Config file selector UI | pi-coding-agent (TUI)
src/modes/interactive/components/countdown-timer.ts | `CountdownTimer` | Countdown timer component | pi-coding-agent (TUI)
src/modes/interactive/components/custom-editor.ts | `CustomEditorOptions`,`CustomEditor` | Custom text editor widget | pi-coding-agent (TUI)
src/modes/interactive/components/custom-entry.ts | `CustomEntryComponent` | Render custom session entry | pi-coding-agent (TUI)
src/modes/interactive/components/custom-message.ts | `CustomMessageComponent` | Render custom message | pi-coding-agent (TUI)
src/modes/interactive/components/diff.ts | `RenderDiffOptions`,`renderDiff` | Render unified diff in TUI | pi-coding-agent (TUI)
src/modes/interactive/components/dynamic-border.ts | `DynamicBorder` | Animated border component | pi-coding-agent (TUI)
src/modes/interactive/components/earendil-announcement.ts | `EarendilAnnouncementComponent` | Earendil announcement banner | pi-coding-agent (TUI)
src/modes/interactive/components/easter-egg-3d.lazy.ts | `playPiLogo3d`,`playArmin3d` | Lazy-load 3D easter eggs | pi-coding-agent (TUI)
src/modes/interactive/components/easter-egg-3d.ts | `EasterEgg3d`,`playEasterEgg3d`,`EasterEgg3dAnimation` | 3D pi logo / Armin easter eggs | pi-coding-agent (TUI)
src/modes/interactive/components/extension-editor.ts | `ExtensionEditorOptions`,`ExtensionEditorComponent` | Extension editor UI | pi-coding-agent (TUI)
src/modes/interactive/components/extension-input.ts | `ExtensionInputOptions`,`ExtensionInputComponent` | Extension prompt input UI | pi-coding-agent (TUI)
src/modes/interactive/components/extension-selector.ts | `ExtensionSelectorOptions`,`ExtensionSelectorComponent` | Extension list selector UI | pi-coding-agent (TUI)
src/modes/interactive/components/first-time-setup.ts | `FirstTimeSetupResult`,`FirstTimeSetupOptions`,`FirstTimeSetupComponent` | First-time setup UI | pi-coding-agent (TUI)
src/modes/interactive/components/footer.ts | `formatTokens`,`formatCwdForFooter`,`FooterComponent` | Status footer (tokens, cwd) | pi-coding-agent (TUI)
src/modes/interactive/components/index.ts | re-exports all components | Component registry (all) | pi-coding-agent (TUI, lib root)
src/modes/interactive/components/keybinding-hints.ts | `KeyTextFormatOptions`,`formatKeyText`,`keyText`,`keyDisplayText`,`keyHint`,`rawKeyHint` | Format keybinding hint text | pi-coding-agent (TUI)
src/modes/interactive/components/login-dialog.ts | `LoginDialogComponent` | Provider login dialog UI | pi-coding-agent (TUI)
src/modes/interactive/components/markdown-transform.ts | `createMarkdownTransform` | Markdown-to-TUI transform | pi-coding-agent (TUI)
src/modes/interactive/components/mermaid.ts | `createMermaidMarkdownTransformer` | Render mermaid diagrams | pi-coding-agent (TUI)
src/modes/interactive/components/model-selector.ts | `ModelSelectorComponent` | Model selection UI | pi-coding-agent (TUI)
src/modes/interactive/components/oauth-selector.ts | `AuthSelectorProvider`,`formatAuthSelectorProviderType`,`formatAuthSelectorProviderStatus`,`OAuthSelectorComponent` | OAuth provider selection UI | pi-coding-agent (TUI)
src/modes/interactive/components/pi-logo.ts | `piLogoLines`,`supportsPiLogo`,`piWordmark` | Pi logo/wordmark rendering | pi-coding-agent (TUI)
src/modes/interactive/components/provider-brand.ts | `ProviderBrandStyle`,`getProviderBrandStyle`,`radiusShimmer`,`startBrandAnimation` | Provider brand animation | pi-coding-agent (TUI)
src/modes/interactive/components/radius-login-selector.ts | `createLoginMenuSelector` | Radius login menu selector | pi-coding-agent (TUI)
src/modes/interactive/components/scoped-models-selector.ts | `ModelsConfig`,`ModelsCallbacks`,`ScopedModelsSelectorComponent` | Scoped model selection UI | pi-coding-agent (TUI)
src/modes/interactive/components/session-selector-search.ts | `SortMode`,`NameFilter`,`ParsedSearchQuery`,`MatchResult`,`hasSessionName`,`parseSearchQuery` | Session selector search logic | pi-coding-agent (TUI)
src/modes/interactive/components/session-selector.ts | `SessionSelectorComponent` | Session selector UI | pi-coding-agent (TUI)
src/modes/interactive/components/settings-selector.ts | `SettingsConfig`,`SettingsCallbacks`,`SettingsSelectorComponent` | Settings selection UI | pi-coding-agent (TUI)
src/modes/interactive/components/settings-submenu.ts | `SelectSubmenuOptions`,`SelectSubmenu`,`SteppedSubmenuStep`,`SteppedSubmenu` | Settings submenus (select/stepped) | pi-coding-agent (TUI)
src/modes/interactive/components/show-images-selector.ts | `ShowImagesSelectorComponent` | Show-images toggle selector | pi-coding-agent (TUI)
src/modes/interactive/components/skill-invocation-message.ts | `SkillInvocationMessageComponent` | Render skill invocation | pi-coding-agent (TUI)
src/modes/interactive/components/status-indicator.ts | `StatusIndicatorKind`,`StatusIndicator`,`WorkingStatusIndicator`,`RetryStatusIndicator`,`CompactionStatusReason`,`CompactionStatusIndicator` | Working/retry/compaction indicators | pi-coding-agent (TUI)
src/modes/interactive/components/themed-text.ts | `ThemedText` | Themed text component | pi-coding-agent (TUI)
src/modes/interactive/components/theme-selector.ts | `ThemeSelectorComponent` | Theme selection UI | pi-coding-agent (TUI)
src/modes/interactive/components/thinking-selector.ts | `ThinkingSelectorComponent` | Thinking-level selector UI | pi-coding-agent (TUI)
src/modes/interactive/components/tool-execution.ts | `ToolRenderers`(re),`ToolExecutionOptions`,`ToolExecutionComponent` | Tool call/result execution UI | pi-coding-agent (TUI)
src/modes/interactive/components/tree-selector.ts | `FilterMode`,`TreeSelectorComponent` | Session tree navigation UI | pi-coding-agent (TUI)
src/modes/interactive/components/trust-selector.ts | `TrustSelection`,`TrustSelectorOptions`,`TrustSelectorComponent` | Project trust selection UI | pi-coding-agent (TUI)
src/modes/interactive/components/user-message-selector.ts | `UserMessageSelectorComponent` | User-message (resume point) selector | pi-coding-agent (TUI)
src/modes/interactive/components/user-message.ts | `UserMessageComponent` | Render user message | pi-coding-agent (TUI)
src/modes/interactive/components/visual-truncate.ts | `VisualTruncateResult`,`truncateToVisualLines`,`VisualLinePreviewOptions`,`VisualLinePreview` | Visual line truncation/preview | pi-coding-agent (TUI)
src/modes/interactive/external-editor.ts | `ExternalEditorOptions`,`ExternalEditorResult`,`editInExternalEditor` | Open external editor for input | pi-coding-agent (TUI)
src/modes/interactive/interactive-mode.ts | `createInteractiveTui`(re),`createInteractiveTuiReference`(re),`formatCrashExtensionHint`,`formatResumeCommand`,`InteractiveModeOptions`,`InteractiveMode` | Interactive TUI mode: crash hints, resume | pi-coding-agent (TUI)
src/modes/interactive/model-catalog-refresh.ts | `refreshModelCatalogs` | Refresh remote model catalogs | pi-coding-agent
src/modes/interactive/model-search.ts | `ModelSearchItem`,`getModelSearchText`,`getDistinctModelName`,`getModelSelectorSearchText` | Model search text helpers | pi-coding-agent (TUI)
src/modes/interactive/program-status-reporter.ts | `BlockedStatus`,`ProgramStatusReporter` | Report program/status to UI | pi-coding-agent (TUI)
src/modes/interactive/session-share.ts | `createShareTrailingEntries`,`exportSessionForShare`,`shareSession` | Export/share a session bundle | pi-coding-agent
src/modes/interactive/theme/system-theme.ts | `SYSTEM_THEME_NAME`,`SystemThemeInput`,`SystemThemeColors`,`relativeLuminance`,`wcagContrast`,`terminalAppearance` | System theme; color luminance/contrast | pi-coding-agent (TUI)
src/modes/interactive/theme/theme-controller.ts | `requestTerminalColors`,`InteractiveThemeController` | Control interactive theme, terminal colors | pi-coding-agent (TUI)
src/modes/interactive/theme/theme-schema.ts | `ColorValueSchema`,`ThemeColorValue`,`ThemeJsonSchema`,`ValidatedThemeJson`,`validateThemeJson` | Theme JSON schema and validation | pi-coding-agent (TUI)
src/modes/interactive/theme/theme-tokens.ts | `ThemeTokenDescriptor`,`ThemeTokenDescriptors`,`THEME_TOKENS`,`ThemeToken`,`ThemeColor`,`ThemeBg` | Theme token definitions | pi-coding-agent (TUI)
src/modes/interactive/theme/theme.ts | `SYSTEM_THEME_NAME`(re),`ThemeJson`(re),`ThemeBg`/`ThemeColor`/`ThemeToken`(re),`ThemeStyle`,`ThemeJsonValidator`,`setThemeJsonValidator` | Theme runtime: styles, validator hookup | pi-coding-agent (TUI)
src/modes/interactive/tui-renderer.ts | `InteractiveTuiOptions`,`createInteractiveTui`,`createInteractiveTuiReference` | Build interactive TUI (fullscreen/regular) | pi-coding-agent (TUI)
src/modes/json-event.ts | `JsonAgentSessionEvent`,`toJsonEvent` | Serialize agent session events to JSON | pi-coding-agent
src/modes/print-mode.ts | `PrintModeOptions`,`runPrintMode` | Print (non-interactive) mode runner | pi-coding-agent
src/modes/rpc/jsonl.ts | `serializeJsonLine`,`attachJsonlLineReader` | JSONL line serialize/read for RPC | pi-coding-agent
src/modes/rpc/rpc-client.ts | `RpcClientOptions`,`ModelInfo`,`RpcEventListener`,`RpcClient` | RPC client: drive session over stdio | pi-coding-agent
src/modes/rpc/rpc-mode.ts | `runRpcMode` | Run RPC server mode | pi-coding-agent
src/modes/rpc/rpc-types.ts | `RpcCommand`,`RpcSlashCommand`,`RpcSessionState`,`RpcResponse`,`RpcExtensionUIRequest`,`RpcExtensionUIResponse` | RPC protocol request/response types | pi-coding-agent

## src/utils
src/utils/abort.ts | `operationSignal`,`raceWithAbortSignal` | Abort-signal helpers for async ops | pi-coding-agent
src/utils/ansi.ts | `splitIncompleteAnsiSuffix`,`stripAnsi` | Strip/split ANSI escape sequences | pi-coding-agent
src/utils/changelog.ts | `ChangelogEntry`,`normalizeChangelogLinks`,`parseChangelog`,`compareVersions`,`getNewEntries`,`getChangelogPath`(re) | Parse CHANGELOG; new-version entries | pi-coding-agent
src/utils/child-process.ts | `spawnProcess`,`spawnProcessSync`,`waitForChildProcess` | Spawn child processes (async/sync) | pi-coding-agent
src/utils/clipboard-command.ts | `runClipboardCommand` | Run OS clipboard command | pi-coding-agent
src/utils/clipboard-image.ts | `ClipboardImage`,`isWaylandSession`,`extensionForImageMimeType`,`readClipboardImage` | Read image from clipboard; Wayland | pi-coding-agent
src/utils/clipboard.ts | `readClipboardText`,`readClipboardFilePaths`,`copyToClipboard` | Clipboard text/file-path read-write | pi-coding-agent
src/utils/exif-orientation.ts | `applyExifOrientation` | Apply EXIF orientation to image | pi-coding-agent
src/utils/frontmatter.ts | `parseFrontmatter`,`stripFrontmatter` | Parse/strip markdown frontmatter | pi-coding-agent
src/utils/fs-watch.ts | `FS_WATCH_RETRY_DELAY_MS`,`closeWatcher`,`watchWithErrorHandler` | File watcher with error handling | pi-coding-agent
src/utils/git.ts | `GitSource`,`parseGitUrl` | Parse git source URLs | pi-coding-agent
src/utils/highlight-js.d.ts | (declare module) | Ambient decl: highlight.js asset types | pi-coding-agent (asset)
src/utils/html.ts | `DecodedHtmlEntity`,`decodeHtmlEntity`,`decodeHtmlEntityAt` | Decode HTML entities | pi-coding-agent
src/utils/image-convert.ts | `convertImageBytesToPng`,`convertToPng`,`loadPngTranscoder`,`ensurePngTranscoder` | Convert images to PNG (transcoder) | pi-coding-agent
src/utils/image-process.ts | `ProcessImageOptions`,`ProcessImageResult`,`processImage` | Process image (resize/convert) for models | pi-coding-agent
src/utils/image-resize-core.ts | `ImageResizeOptions`,`ResizedImage`,`IMAGE_RESIZE_WORKER_RESPONSE_TYPE`,`ResizeImageWorkerResponse`,`resizeImageInProcess` | Image resize core (in-process) | pi-coding-agent
src/utils/image-resize.ts | `ImageResizeOptions`(re),`ResizedImage`(re),`resizeImage`,`formatDimensionNote` | Resize image; worker/coord | pi-coding-agent
src/utils/image-resize-worker.ts | (side-effect) | Image-resize worker entrypoint | pi-coding-agent (bin)
src/utils/json.ts | `stripJsonComments` | Strip comments from JSON text | pi-coding-agent
src/utils/management-http.ts | `FetchRetryOptions`,`fetchWithRetry` | HTTP fetch with retry (management) | pi-coding-agent
src/utils/mime.ts | `detectSupportedImageMimeType`,`detectSupportedImageMimeTypeFromFile` | Detect supported image MIME types | pi-coding-agent
src/utils/open-browser.ts | `openBrowser` | Open URL in default browser | pi-coding-agent
src/utils/output-files.ts | `writeOutputFile`,`createOutputFileStream` | Write streamed output files | pi-coding-agent
src/utils/paths.ts | `PathInputOptions`,`canonicalizePath`,`getPathComparisonKey`,`pathsEqual`,`isPathWithin`,`shortenHomePath`,`getFileRevision`,`isLocalPath` | Path canonicalize/compare/shorten | pi-coding-agent
src/utils/photon.ts | `PhotonImageType`(re),`loadPhoton` | Load photon image lib | pi-coding-agent
src/utils/pi-user-agent.ts | `getPiUserAgent` | Build User-Agent string | pi-coding-agent
src/utils/shell.ts | `ShellConfig`,`getShellConfig`,`POWERSHELL_ARGS`,`getPowerShellConfig`,`getShellEnv`,`sanitizeBinaryOutput`,`trackDetachedChildPid`,`untrackDetachedChildPid` | Shell config (bash/PowerShell); pid track | pi-coding-agent
src/utils/sleep.ts | `sleep` | Promise delay with optional abort | pi-coding-agent
src/utils/syntax-highlight.ts | `loadAllHighlightLanguages`,`HighlightFormatter`,`HighlightTheme`,`HighlightOptions`,`renderHighlightedHtml`,`highlight`,`supportsLanguage`,`getHighlightLanguageCount` | Syntax highlighting for TUI/HTML | pi-coding-agent
src/utils/terminal-question.ts | `questionTerminal` | Prompt yes/no question in terminal | pi-coding-agent
src/utils/text.ts | `splitBom`,`stripBom` | Split/strip UTF-8 BOM | pi-coding-agent
src/utils/tool-result-images.ts | `ToolResultContent`,`NormalizeToolResultImagesOptions`,`normalizeToolResultImages` | Normalize tool-result images | pi-coding-agent
src/utils/tools-manager.ts | `getToolPath`,`getLatestVersion`,`ToolStatus`,`ensureTool` | Ensure external tools (fd, rg) present | pi-coding-agent
src/utils/version-check.ts | `LatestPiRelease`,`formatVersionCheckError`,`comparePackageVersions`,`isNewerPackageVersion`,`getLatestPiRelease`,`getLatestPiVersion`,`checkForNewPiVersion` | Check for new pi release | pi-coding-agent
src/utils/web-url.ts | `webUrl`,`displayUrl` | Validate/display web URLs | pi-coding-agent
src/utils/windows-self-update.ts | `cleanupWindowsSelfUpdateQuarantine`,`quarantineWindowsNativeDependencies` | Windows self-update quarantine | pi-coding-agent
src/utils/wsl.ts | `isWSL` | Detect Windows Subsystem for Linux | pi-coding-agent
src/utils/zip.ts | `writeZipArchive` | Write zip archive (bug reports) | pi-coding-agent

## src (remaining)
src/cli.ts | (side-effect: setupCli() then main()) | Node CLI entrypoint | pi-coding-agent (bin)
src/core/sdk.ts | `CreateAgentSessionOptions`,`CreateAgentSessionResult`,`PromptTemplate`(re),`Skill`(re),`Tool`(re) | SDK: create agent session (options/result) | pi-coding-agent
src/core/extensions/pi-ai-extension-view.ts | `StringEnum` (re-exports pi-ai/compat, TypeBox Type/Static/TSchema) | Module surface extensions import (pi-ai + TypeBox) | pi-coding-agent
src/experimental/source-resolver.ts | (side-effect: registers Node module resolution hooks) | Source-file resolution hooks (TS workspace) | pi-coding-agent
src/modes/diagnostics-stderr.ts | `writeDiagnosticsToStderr` | Write runtime diagnostics to stderr | pi-coding-agent

## examples (demo extensions/SDK scripts — not ported; see pi-coding-agent examples)
examples/extensions/auto-commit-on-exit.ts | default (ExtensionAPI fn) | Demo extension: auto-commit-on-exit | examples (deferred)
examples/extensions/bash-spawn-hook.ts | default (ExtensionAPI fn) | Demo extension: bash-spawn-hook | examples (deferred)
examples/extensions/bookmark.ts | default (ExtensionAPI fn) | Demo extension: bookmark | examples (deferred)
examples/extensions/border-status-editor.ts | default (ExtensionAPI fn) | Demo extension: border-status-editor | examples (deferred)
examples/extensions/built-in-tool-renderer.ts | default (ExtensionAPI fn) | Demo extension: built-in-tool-renderer | examples (deferred)
examples/extensions/claude-rules.ts | default (ExtensionAPI fn) | Demo extension: claude-rules | examples (deferred)
examples/extensions/commands.ts | default (ExtensionAPI fn) | Demo extension: commands | examples (deferred)
examples/extensions/confirm-destructive.ts | default (ExtensionAPI fn) | Demo extension: confirm-destructive | examples (deferred)
examples/extensions/custom-compaction.ts | default (ExtensionAPI fn) | Demo extension: custom-compaction | examples (deferred)
examples/extensions/custom-footer.ts | default (ExtensionAPI fn) | Demo extension: custom-footer | examples (deferred)
examples/extensions/custom-header.ts | default (ExtensionAPI fn) | Demo extension: custom-header | examples (deferred)
examples/extensions/custom-provider-anthropic/index.ts | default (ExtensionAPI fn) | Custom provider demo | examples (deferred)
examples/extensions/custom-provider-gitlab-duo/index.ts | `MODELS,streamGitLabDuo` | Custom provider demo | examples (deferred)
examples/extensions/custom-provider-gitlab-duo/test.ts | — | Custom provider demo | examples (deferred)
examples/extensions/debug-provider.ts | default (ExtensionAPI fn) | Demo extension: debug-provider | examples (deferred)
examples/extensions/dirty-repo-guard.ts | default (ExtensionAPI fn) | Demo extension: dirty-repo-guard | examples (deferred)
examples/extensions/doom-overlay/doom-component.ts | `DoomOverlayComponent` | Doom game overlay | examples (deferred)
examples/extensions/doom-overlay/doom-engine.ts | `DoomModule,DoomEngine` | Doom game overlay | examples (deferred)
examples/extensions/doom-overlay/doom-keys.ts | `DoomKeys,mapKeyToDoom` | Doom game overlay | examples (deferred)
examples/extensions/doom-overlay/index.ts | default (ExtensionAPI fn) | Doom game overlay | examples (deferred)
examples/extensions/doom-overlay/wad-finder.ts | `findWadFile` | Doom game overlay | examples (deferred)
examples/extensions/dynamic-resources/index.ts | default (ExtensionAPI fn) | Demo extension: index | examples (deferred)
examples/extensions/dynamic-tools.ts | default (ExtensionAPI fn) | Demo extension: dynamic-tools | examples (deferred)
examples/extensions/entry-renderer.ts | default (ExtensionAPI fn) | Demo extension: entry-renderer | examples (deferred)
examples/extensions/event-bus.ts | default (ExtensionAPI fn) | Demo extension: event-bus | examples (deferred)
examples/extensions/file-trigger.ts | default (ExtensionAPI fn) | Demo extension: file-trigger | examples (deferred)
examples/extensions/git-checkpoint.ts | default (ExtensionAPI fn) | Demo extension: git-checkpoint | examples (deferred)
examples/extensions/github-issue-autocomplete.ts | default (ExtensionAPI fn) | Demo extension: github-issue-autocomplete | examples (deferred)
examples/extensions/git-merge-and-resolve.ts | default (ExtensionAPI fn) | Demo extension: git-merge-and-resolve | examples (deferred)
examples/extensions/gondolin/index.ts | default (ExtensionAPI fn) | Demo extension: index | examples (deferred)
examples/extensions/handoff.ts | default (ExtensionAPI fn) | Demo extension: handoff | examples (deferred)
examples/extensions/hello.ts | default (ExtensionAPI fn) | Demo extension: hello | examples (deferred)
examples/extensions/hidden-thinking-label.ts | default (ExtensionAPI fn) | Demo extension: hidden-thinking-label | examples (deferred)
examples/extensions/inline-bash.ts | default (ExtensionAPI fn) | Demo extension: inline-bash | examples (deferred)
examples/extensions/input-transform-streaming.ts | default (ExtensionAPI fn) | Demo extension: input-transform-streaming | examples (deferred)
examples/extensions/input-transform.ts | default (ExtensionAPI fn) | Demo extension: input-transform | examples (deferred)
examples/extensions/interactive-shell.ts | default (ExtensionAPI fn) | Demo extension: interactive-shell | examples (deferred)
examples/extensions/jev-router.ts | default (ExtensionAPI fn) | Demo extension: jev-router | examples (deferred)
examples/extensions/mac-system-theme.ts | default (ExtensionAPI fn) | Demo extension: mac-system-theme | examples (deferred)
examples/extensions/message-renderer.ts | default (ExtensionAPI fn) | Demo extension: message-renderer | examples (deferred)
examples/extensions/minimal-mode.ts | default (ExtensionAPI fn) | Demo extension: minimal-mode | examples (deferred)
examples/extensions/modal-editor.ts | default (ExtensionAPI fn) | Demo extension: modal-editor | examples (deferred)
examples/extensions/model-status.ts | default (ExtensionAPI fn) | Demo extension: model-status | examples (deferred)
examples/extensions/notify.ts | default (ExtensionAPI fn) | Demo extension: notify | examples (deferred)
examples/extensions/overlay-qa-tests.ts | default (ExtensionAPI fn) | Demo extension: overlay-qa-tests | examples (deferred)
examples/extensions/overlay-test.ts | default (ExtensionAPI fn) | Demo extension: overlay-test | examples (deferred)
examples/extensions/permission-gate.ts | default (ExtensionAPI fn) | Demo extension: permission-gate | examples (deferred)
examples/extensions/pirate.ts | default (ExtensionAPI fn) | Demo extension: pirate | examples (deferred)
examples/extensions/plan-mode/index.ts | default (ExtensionAPI fn) | Plan-mode demo ext | examples (deferred)
examples/extensions/plan-mode/utils.ts | `isSafeCommand,TodoItem,cleanStepText,extractTodoItems,extractDoneSteps,markCompletedSteps,allStepsComplete` | Plan-mode demo ext | examples (deferred)
examples/extensions/preset.ts | default (ExtensionAPI fn) | Demo extension: preset | examples (deferred)
examples/extensions/project-trust.ts | default (ExtensionAPI fn) | Demo extension: project-trust | examples (deferred)
examples/extensions/prompt-customizer.ts | default (ExtensionAPI fn) | Demo extension: prompt-customizer | examples (deferred)
examples/extensions/protected-paths.ts | default (ExtensionAPI fn) | Demo extension: protected-paths | examples (deferred)
examples/extensions/provider-payload.ts | default (ExtensionAPI fn) | Demo extension: provider-payload | examples (deferred)
examples/extensions/qna.ts | default (ExtensionAPI fn) | Demo extension: qna | examples (deferred)
examples/extensions/questionnaire.ts | default (ExtensionAPI fn) | Demo extension: questionnaire | examples (deferred)
examples/extensions/question.ts | default (ExtensionAPI fn) | Demo extension: question | examples (deferred)
examples/extensions/rainbow-editor.ts | default (ExtensionAPI fn) | Demo extension: rainbow-editor | examples (deferred)
examples/extensions/reload-runtime.ts | default (ExtensionAPI fn) | Demo extension: reload-runtime | examples (deferred)
examples/extensions/rpc-demo.ts | default (ExtensionAPI fn) | Demo extension: rpc-demo | examples (deferred)
examples/extensions/send-user-message.ts | default (ExtensionAPI fn) | Demo extension: send-user-message | examples (deferred)
examples/extensions/session-name.ts | default (ExtensionAPI fn) | Demo extension: session-name | examples (deferred)
examples/extensions/shutdown-command.ts | default (ExtensionAPI fn) | Demo extension: shutdown-command | examples (deferred)
examples/extensions/snake.ts | default (ExtensionAPI fn) | Demo extension: snake | examples (deferred)
examples/extensions/space-invaders.ts | default (ExtensionAPI fn) | Demo extension: space-invaders | examples (deferred)
examples/extensions/ssh.ts | default (ExtensionAPI fn) | Demo extension: ssh | examples (deferred)
examples/extensions/status-line.ts | default (ExtensionAPI fn) | Demo extension: status-line | examples (deferred)
examples/extensions/structured-output.ts | default (ExtensionAPI fn) | Demo extension: structured-output | examples (deferred)
examples/extensions/subagent/agents.ts | `AgentScope,AgentConfig,AgentDiscoveryResult,discoverAgents,formatAgentList` | Subagent demo ext | examples (deferred)
examples/extensions/subagent/index.ts | default (ExtensionAPI fn) | Subagent demo ext | examples (deferred)
examples/extensions/summarize.ts | default (ExtensionAPI fn) | Demo extension: summarize | examples (deferred)
examples/extensions/system-prompt-header.ts | default (ExtensionAPI fn) | Demo extension: system-prompt-header | examples (deferred)
examples/extensions/tic-tac-toe.ts | default (ExtensionAPI fn) | Demo extension: tic-tac-toe | examples (deferred)
examples/extensions/timed-confirm.ts | default (ExtensionAPI fn) | Demo extension: timed-confirm | examples (deferred)
examples/extensions/titlebar-spinner.ts | default (ExtensionAPI fn) | Demo extension: titlebar-spinner | examples (deferred)
examples/extensions/todo.ts | default (ExtensionAPI fn) | Demo extension: todo | examples (deferred)
examples/extensions/tool-override.ts | default (ExtensionAPI fn) | Demo extension: tool-override | examples (deferred)
examples/extensions/tools.ts | default (ExtensionAPI fn) | Demo extension: tools | examples (deferred)
examples/extensions/trigger-compact.ts | default (ExtensionAPI fn) | Demo extension: trigger-compact | examples (deferred)
examples/extensions/truncated-tool.ts | default (ExtensionAPI fn) | Demo extension: truncated-tool | examples (deferred)
examples/extensions/widget-placement.ts | default (ExtensionAPI fn) | Demo extension: widget-placement | examples (deferred)
examples/extensions/with-deps/index.ts | default (ExtensionAPI fn) | Demo extension: index | examples (deferred)
examples/extensions/working-indicator.ts | default (ExtensionAPI fn) | Demo extension: working-indicator | examples (deferred)
examples/extensions/working-message-test.ts | default (ExtensionAPI fn) | Demo extension: working-message-test | examples (deferred)
examples/rpc-client.ts | — | RPC demo: rpc-client.ts | examples (RPC)
examples/rpc-extension-ui.ts | — | RPC demo: rpc-extension-ui.ts | examples (RPC)
examples/sdk/01-minimal.ts | — | SDK demo: 01-minimal | examples (SDK)
examples/sdk/02-custom-model.ts | — | SDK demo: 02-custom-model | examples (SDK)
examples/sdk/03-custom-prompt.ts | — | SDK demo: 03-custom-prompt | examples (SDK)
examples/sdk/04-skills.ts | — | SDK demo: 04-skills | examples (SDK)
examples/sdk/05-tools.ts | — | SDK demo: 05-tools | examples (SDK)
examples/sdk/06-extensions.ts | default (ExtensionAPI fn) | SDK demo: 06-extensions | examples (SDK)
examples/sdk/07-context-files.ts | — | SDK demo: 07-context-files | examples (SDK)
examples/sdk/08-prompt-templates.ts | — | SDK demo: 08-prompt-templates | examples (SDK)
examples/sdk/09-api-keys-and-oauth.ts | — | SDK demo: 09-api-keys-and-oauth | examples (SDK)
examples/sdk/10-settings.ts | — | SDK demo: 10-settings | examples (SDK)
examples/sdk/11-sessions.ts | — | SDK demo: 11-sessions | examples (SDK)
examples/sdk/12-full-control.ts | — | SDK demo: 12-full-control | examples (SDK)
examples/sdk/13-session-runtime.ts | — | SDK demo: 13-session-runtime | examples (SDK)
examples/sdk/14-codemode-mcp.ts | — | SDK demo: 14-codemode-mcp | examples (SDK)

## test (Vitest suites — port as #[test] later; not blocking Rust port)
test/agent-session-auto-compaction-queue.test.ts | — | Tests: agent-session-auto-compaction-queue.test | pi-coding-agent (tests)
test/agent-session-branching.test.ts | — | Tests: agent-session-branching.test | pi-coding-agent (tests)
test/agent-session-compaction.test.ts | — | Tests: agent-session-compaction.test | pi-coding-agent (tests)
test/agent-session-concurrent.test.ts | — | Tests: agent-session-concurrent.test | pi-coding-agent (tests)
test/agent-session-dynamic-provider.test.ts | — | Tests: agent-session-dynamic-provider.test | pi-coding-agent (tests)
test/agent-session-dynamic-tools.test.ts | — | Tests: agent-session-dynamic-tools.test | pi-coding-agent (tests)
test/agent-session-queued-images.test.ts | — | Tests: agent-session-queued-images.test | pi-coding-agent (tests)
test/agent-session-retry.test.ts | — | Tests: agent-session-retry.test | pi-coding-agent (tests)
test/agent-session-runtime-diagnostics.test.ts | — | Tests: agent-session-runtime-diagnostics.test | pi-coding-agent (tests)
test/agent-session-runtime-events.test.ts | — | Tests: agent-session-runtime-events.test | pi-coding-agent (tests)
test/agent-session-stats.test.ts | — | Tests: agent-session-stats.test | pi-coding-agent (tests)
test/agent-session-tree-navigation.test.ts | — | Tests: agent-session-tree-navigation.test | pi-coding-agent (tests)
test/ansi-utils.test.ts | — | Tests: ansi-utils.test | pi-coding-agent (tests)
test/args.test.ts | — | Tests: args.test | pi-coding-agent (tests)
test/assistant-message.test.ts | — | Tests: assistant-message.test | pi-coding-agent (tests)
test/auth-check.test.ts | — | Tests: auth-check.test | pi-coding-agent (tests)
test/auth-login.test.ts | — | Tests: auth-login.test | pi-coding-agent (tests)
test/auth-logout.test.ts | — | Tests: auth-logout.test | pi-coding-agent (tests)
test/auth-storage.test.ts | — | Tests: auth-storage.test | pi-coding-agent (tests)
test/auth-terminal.test.ts | — | Tests: auth-terminal.test | pi-coding-agent (tests)
test/auth-url-copy.test.ts | — | Tests: auth-url-copy.test | pi-coding-agent (tests)
test/bash-close-hang-windows.test.ts | — | Tests: bash-close-hang-windows.test | pi-coding-agent (tests)
test/bash-execution-width.test.ts | — | Tests: bash-execution-width.test | pi-coding-agent (tests)
test/bash-executor-truncation.test.ts | — | Tests: bash-executor-truncation.test | pi-coding-agent (tests)
test/block-images.test.ts | — | Tests: block-images.test | pi-coding-agent (tests)
test/branch-summarization.test.ts | — | Tests: branch-summarization.test | pi-coding-agent (tests)
test/branch-summary-extensions.test.ts | — | Tests: branch-summary-extensions.test | pi-coding-agent (tests)
test/bug-report.test.ts | — | Tests: bug-report.test | pi-coding-agent (tests)
test/builtin-tool-strict-mode.test.ts | — | Tests: builtin-tool-strict-mode.test | pi-coding-agent (tests)
test/cache-stats.test.ts | — | Tests: cache-stats.test | pi-coding-agent (tests)
test/cache-warmer.test.ts | — | Tests: cache-warmer.test | pi-coding-agent (tests)
test/changelog.test.ts | — | Tests: changelog.test | pi-coding-agent (tests)
test/chat-viewport.test.ts | — | Tests: chat-viewport.test | pi-coding-agent (tests)
test/clipboard-command.test.ts | — | Tests: clipboard-command.test | pi-coding-agent (tests)
test/clipboard-image-bmp-conversion.test.ts | — | Tests: clipboard-image-bmp-conversion.test | pi-coding-agent (tests)
test/clipboard-image-native-errors.test.ts | — | Tests: clipboard-image-native-errors.test | pi-coding-agent (tests)
test/clipboard-image.test.ts | — | Tests: clipboard-image.test | pi-coding-agent (tests)
test/clipboard-paste-file-paths.test.ts | — | Tests: clipboard-paste-file-paths.test | pi-coding-agent (tests)
test/clipboard.test.ts | — | Tests: clipboard.test | pi-coding-agent (tests)
test/code-highlighter.test.ts | — | Tests: code-highlighter.test | pi-coding-agent (tests)
test/codemode-renderer.test.ts | — | Tests: codemode-renderer.test | pi-coding-agent (tests)
test/codemode-worker-admission.test.ts | — | Tests: codemode-worker-admission.test | pi-coding-agent (tests)
test/codemode-worker-config.test.ts | — | Tests: codemode-worker-config.test | pi-coding-agent (tests)
test/collapsible-message-components.test.ts | — | Tests: collapsible-message-components.test | pi-coding-agent (tests)
test/compaction-extensions-example.test.ts | — | Tests: compaction-extensions-example.test | pi-coding-agent (tests)
test/compaction-extensions.test.ts | — | Tests: compaction-extensions.test | pi-coding-agent (tests)
test/compaction-nested-calls.test.ts | — | Tests: compaction-nested-calls.test | pi-coding-agent (tests)
test/compaction-serialization.test.ts | — | Tests: compaction-serialization.test | pi-coding-agent (tests)
test/compaction-summary-reasoning.test.ts | — | Tests: compaction-summary-reasoning.test | pi-coding-agent (tests)
test/compaction.test.ts | — | Tests: compaction.test | pi-coding-agent (tests)
test/config-schemas.test.ts | — | Tests: config-schemas.test | pi-coding-agent (tests)
test/config-selector-keybindings.test.ts | — | Tests: config-selector-keybindings.test | pi-coding-agent (tests)
test/config.test.ts | — | Tests: config.test | pi-coding-agent (tests)
test/config-value-migration.test.ts | — | Tests: config-value-migration.test | pi-coding-agent (tests)
test/crash-log.test.ts | — | Tests: crash-log.test | pi-coding-agent (tests)
test/credential-print.test.ts | — | Tests: credential-print.test | pi-coding-agent (tests)
test/custom-editor-keybindings.test.ts | — | Tests: custom-editor-keybindings.test | pi-coding-agent (tests)
test/custom-message.test.ts | — | Tests: custom-message.test | pi-coding-agent (tests)
test/default-tools-setting.test.ts | — | Tests: default-tools-setting.test | pi-coding-agent (tests)
test/deleted-cwd.test.ts | — | Tests: deleted-cwd.test | pi-coding-agent (tests)
test/diff.test.ts | — | Tests: diff.test | pi-coding-agent (tests)
test/documentation.test.ts | — | Tests: documentation.test | pi-coding-agent (tests)
test/edit-diff-window.test.ts | — | Tests: edit-diff-window.test | pi-coding-agent (tests)
test/edit-tool-diff-before-write.test.ts | — | Tests: edit-tool-diff-before-write.test | pi-coding-agent (tests)
test/edit-tool-legacy-input.test.ts | — | Tests: edit-tool-legacy-input.test | pi-coding-agent (tests)
test/edit-tool-no-full-redraw.test.ts | — | Tests: edit-tool-no-full-redraw.test | pi-coding-agent (tests)
test/exec-runtime-limit.test.ts | — | Tests: exec-runtime-limit.test | pi-coding-agent (tests)
test/exec.test.ts | — | Tests: exec.test | pi-coding-agent (tests)
test/exec-utf8-chunks.test.ts | — | Tests: exec-utf8-chunks.test | pi-coding-agent (tests)
test/experimental.test.ts | — | Tests: experimental.test | pi-coding-agent (tests)
test/export-html-ansi-links.test.ts | — | Tests: export-html-ansi-links.test | pi-coding-agent (tests)
test/export-html-cjk.test.ts | — | Tests: export-html-cjk.test | pi-coding-agent (tests)
test/export-html-cost.test.ts | — | Tests: export-html-cost.test | pi-coding-agent (tests)
test/export-html-deep-tree.test.ts | — | Tests: export-html-deep-tree.test | pi-coding-agent (tests)
test/export-html-skill-block.test.ts | — | Tests: export-html-skill-block.test | pi-coding-agent (tests)
test/export-html-system-messages.test.ts | — | Tests: export-html-system-messages.test | pi-coding-agent (tests)
test/export-html-whitespace.test.ts | — | Tests: export-html-whitespace.test | pi-coding-agent (tests)
test/export-html-xss.test.ts | — | Tests: export-html-xss.test | pi-coding-agent (tests)
test/export-jsonl-share.test.ts | — | Tests: export-jsonl-share.test | pi-coding-agent (tests)
test/extension-keybinding-hints.test.ts | — | Tests: extension-keybinding-hints.test | pi-coding-agent (tests)
test/extensions-discovery.test.ts | — | Tests: extensions-discovery.test | pi-coding-agent (tests)
test/extension-selector.test.ts | — | Tests: extension-selector.test | pi-coding-agent (tests)
test/extensions-input-event.test.ts | — | Tests: extensions-input-event.test | pi-coding-agent (tests)
test/extensions-runner.test.ts | — | Tests: extensions-runner.test | pi-coding-agent (tests)
test/external-editor.test.ts | — | Tests: external-editor.test | pi-coding-agent (tests)
test/file-mutation-queue.test.ts | — | Tests: file-mutation-queue.test | pi-coding-agent (tests)
test/find-abort-before-spawn.test.ts | — | Tests: find-abort-before-spawn.test | pi-coding-agent (tests)
test/first-time-setup-fork.test.ts | — | Tests: first-time-setup-fork.test | pi-coding-agent (tests)
test/first-time-setup.test.ts | — | Tests: first-time-setup.test | pi-coding-agent (tests)
test/footer-data-provider.test.ts | — | Tests: footer-data-provider.test | pi-coding-agent (tests)
test/footer-width.test.ts | — | Tests: footer-width.test | pi-coding-agent (tests)
test/format-resume-command.test.ts | — | Tests: format-resume-command.test | pi-coding-agent (tests)
test/frontmatter.test.ts | — | Tests: frontmatter.test | pi-coding-agent (tests)
test/git-merge-and-resolve-extension.test.ts | — | Tests: git-merge-and-resolve-extension.test | pi-coding-agent (tests)
test/git-ssh-url.test.ts | — | Tests: git-ssh-url.test | pi-coding-agent (tests)
test/git-update.test.ts | — | Tests: git-update.test | pi-coding-agent (tests)
test/grep-operations.test.ts | — | Tests: grep-operations.test | pi-coding-agent (tests)
test/http-dispatcher.test.ts | — | Tests: http-dispatcher.test | pi-coding-agent (tests)
test/image-processing.test.ts | — | Tests: image-processing.test | pi-coding-agent (tests)
test/image-process.test.ts | — | Tests: image-process.test | pi-coding-agent (tests)
test/image-resize-callers.test.ts | — | Tests: image-resize-callers.test | pi-coding-agent (tests)
test/image-resize-worker-teardown.test.ts | — | Tests: image-resize-worker-teardown.test | pi-coding-agent (tests)
test/initial-message.test.ts | — | Tests: initial-message.test | pi-coding-agent (tests)
test/input-transform-streaming-example.test.ts | — | Tests: input-transform-streaming-example.test | pi-coding-agent (tests)
test/interactive-mode-anthropic-warning.test.ts | — | Tests: interactive-mode-anthropic-warning.test | pi-coding-agent (tests)
test/interactive-mode-assistant-diagnostics.test.ts | — | Tests: interactive-mode-assistant-diagnostics.test | pi-coding-agent (tests)
test/interactive-mode-bug-report-hint.test.ts | — | Tests: interactive-mode-bug-report-hint.test | pi-coding-agent (tests)
test/interactive-mode-clone-command.test.ts | — | Tests: interactive-mode-clone-command.test | pi-coding-agent (tests)
test/interactive-mode-compaction.test.ts | — | Tests: interactive-mode-compaction.test | pi-coding-agent (tests)
test/interactive-mode-extension-changelog.test.ts | — | Tests: interactive-mode-extension-changelog.test | pi-coding-agent (tests)
test/interactive-mode-extension-dialogs.test.ts | — | Tests: interactive-mode-extension-dialogs.test | pi-coding-agent (tests)
test/interactive-mode-import-command.test.ts | — | Tests: interactive-mode-import-command.test | pi-coding-agent (tests)
test/interactive-mode-model-scope.test.ts | — | Tests: interactive-mode-model-scope.test | pi-coding-agent (tests)
test/interactive-mode-paste.test.ts | — | Tests: interactive-mode-paste.test | pi-coding-agent (tests)
test/interactive-mode-resume-missing-cwd.test.ts | — | Tests: interactive-mode-resume-missing-cwd.test | pi-coding-agent (tests)
test/interactive-mode-startup-input.test.ts | — | Tests: interactive-mode-startup-input.test | pi-coding-agent (tests)
test/interactive-mode-status.test.ts | — | Tests: interactive-mode-status.test | pi-coding-agent (tests)
test/interactive-mode-suspend.test.ts | — | Tests: interactive-mode-suspend.test | pi-coding-agent (tests)
test/interactive-mode-tree-navigation.test.ts | — | Tests: interactive-mode-tree-navigation.test | pi-coding-agent (tests)
test/interactive-tui.test.ts | — | Tests: interactive-tui.test | pi-coding-agent (tests)
test/jev-router-example.test.ts | — | Tests: jev-router-example.test | pi-coding-agent (tests)
test/keybindings-migration.test.ts | — | Tests: keybindings-migration.test | pi-coding-agent (tests)
test/keybindings.test.ts | — | Tests: keybindings.test | pi-coding-agent (tests)
test/llama-extension.test.ts | — | Tests: llama-extension.test | pi-coding-agent (tests)
test/llama-ui.test.ts | — | Tests: llama-ui.test | pi-coding-agent (tests)
test/login-dialog-device-code.test.ts | — | Tests: login-dialog-device-code.test | pi-coding-agent (tests)
test/management-http.test.ts | — | Tests: management-http.test | pi-coding-agent (tests)
test/max-thinking.test.ts | — | Tests: max-thinking.test | pi-coding-agent (tests)
test/mcp-command.test.ts | — | Tests: mcp-command.test | pi-coding-agent (tests)
test/mcp-conformance/client.ts | — | Tests: client | pi-coding-agent (tests)
test/mcp-conformance/run.ts | — | Tests: run | pi-coding-agent (tests)
test/mcp-extension.test.ts | — | Tests: mcp-extension.test | pi-coding-agent (tests)
test/mcp-manager-view.test.ts | — | Tests: mcp-manager-view.test | pi-coding-agent (tests)
test/mcp-oauth-refresh.test.ts | — | Tests: mcp-oauth-refresh.test | pi-coding-agent (tests)
test/mcp-oauth-store.test.ts | — | Tests: mcp-oauth-store.test | pi-coding-agent (tests)
test/mermaid.test.ts | — | Tests: mermaid.test | pi-coding-agent (tests)
test/model-catalog-protocol.test.ts | — | Tests: model-catalog-protocol.test | pi-coding-agent (tests)
test/model-catalog-refresh.test.ts | — | Tests: model-catalog-refresh.test | pi-coding-agent (tests)
test/model-fallback-diagnostic.test.ts | — | Tests: model-fallback-diagnostic.test | pi-coding-agent (tests)
test/model-registry.test.ts | — | Tests: model-registry.test | pi-coding-agent (tests)
test/model-resolver.test.ts | — | Tests: model-resolver.test | pi-coding-agent (tests)
test/model-runtime-auth-options.test.ts | — | Tests: model-runtime-auth-options.test | pi-coding-agent (tests)
test/model-runtime-classifiers.test.ts | — | Tests: model-runtime-classifiers.test | pi-coding-agent (tests)
test/model-runtime-cloudflare-compat.test.ts | — | Tests: model-runtime-cloudflare-compat.test | pi-coding-agent (tests)
test/model-runtime-credential-sync.test.ts | — | Tests: model-runtime-credential-sync.test | pi-coding-agent (tests)
test/model-runtime-images.test.ts | — | Tests: model-runtime-images.test | pi-coding-agent (tests)
test/model-runtime-modify-models-compat.test.ts | — | Tests: model-runtime-modify-models-compat.test | pi-coding-agent (tests)
test/model-runtime-test-utils.ts | `getModelRuntime` | Test helpers/fixtures | pi-coding-agent (tests)
test/model-scope-session-replacement.test.ts | — | Tests: model-scope-session-replacement.test | pi-coding-agent (tests)
test/model-search.test.ts | — | Tests: model-search.test | pi-coding-agent (tests)
test/model-selector.test.ts | — | Tests: model-selector.test | pi-coding-agent (tests)
test/models-store.test.ts | — | Tests: models-store.test | pi-coding-agent (tests)
test/nested-tool-calls.test.ts | — | Tests: nested-tool-calls.test | pi-coding-agent (tests)
test/oauth-selector.test.ts | — | Tests: oauth-selector.test | pi-coding-agent (tests)
test/output-pad.test.ts | — | Tests: output-pad.test | pi-coding-agent (tests)
test/package-command-paths.test.ts | — | Tests: package-command-paths.test | pi-coding-agent (tests)
test/package-distribution.test.ts | — | Tests: package-distribution.test | pi-coding-agent (tests)
test/package-manager-ssh.test.ts | — | Tests: package-manager-ssh.test | pi-coding-agent (tests)
test/package-manager.test.ts | — | Tests: package-manager.test | pi-coding-agent (tests)
test/paths.test.ts | — | Tests: paths.test | pi-coding-agent (tests)
test/path-utils.test.ts | — | Tests: path-utils.test | pi-coding-agent (tests)
test/pi-user-agent.test.ts | — | Tests: pi-user-agent.test | pi-coding-agent (tests)
test/plan-mode-extension.test.ts | — | Tests: plan-mode-extension.test | pi-coding-agent (tests)
test/plan-mode-utils.test.ts | — | Tests: plan-mode-utils.test | pi-coding-agent (tests)
test/powershell-config.test.ts | — | Tests: powershell-config.test | pi-coding-agent (tests)
test/powershell-tool.test.ts | — | Tests: powershell-tool.test | pi-coding-agent (tests)
test/preferred-providers.test.ts | — | Tests: preferred-providers.test | pi-coding-agent (tests)
test/print-mode.test.ts | — | Tests: print-mode.test | pi-coding-agent (tests)
test/program-status-reporter.test.ts | — | Tests: program-status-reporter.test | pi-coding-agent (tests)
test/project-trust-saved-decision.test.ts | — | Tests: project-trust-saved-decision.test | pi-coding-agent (tests)
test/prompt-templates.test.ts | — | Tests: prompt-templates.test | pi-coding-agent (tests)
test/provider-matching.test.ts | — | Tests: provider-matching.test | pi-coding-agent (tests)
test/radius.test.ts | — | Tests: radius.test | pi-coding-agent (tests)
test/read-line-range-display.test.ts | — | Tests: read-line-range-display.test | pi-coding-agent (tests)
test/read-streaming.test.ts | — | Tests: read-streaming.test | pi-coding-agent (tests)
test/references.test.ts | — | Tests: references.test | pi-coding-agent (tests)
test/remote-catalog-provider.test.ts | — | Tests: remote-catalog-provider.test | pi-coding-agent (tests)
test/resolve-config-value.test.ts | — | Tests: resolve-config-value.test | pi-coding-agent (tests)
test/resource-loader.test.ts | — | Tests: resource-loader.test | pi-coding-agent (tests)
test/resource-loader-theme.test.ts | — | Tests: resource-loader-theme.test | pi-coding-agent (tests)
test/restore-sandbox-env.test.ts | — | Tests: restore-sandbox-env.test | pi-coding-agent (tests)
test/rpc-client-clear-queue.test.ts | — | Tests: rpc-client-clear-queue.test | pi-coding-agent (tests)
test/rpc-client-clone.test.ts | — | Tests: rpc-client-clone.test | pi-coding-agent (tests)
test/rpc-client-process-exit.test.ts | — | Tests: rpc-client-process-exit.test | pi-coding-agent (tests)
test/rpc-example.ts | — | Tests: rpc-example | pi-coding-agent (tests)
test/rpc-jsonl.test.ts | — | Tests: rpc-jsonl.test | pi-coding-agent (tests)
test/rpc-prompt-response-semantics.test.ts | — | Tests: rpc-prompt-response-semantics.test | pi-coding-agent (tests)
test/rpc-replacement-diagnostics.test.ts | — | Tests: rpc-replacement-diagnostics.test | pi-coding-agent (tests)
test/rpc.test.ts | — | Tests: rpc.test | pi-coding-agent (tests)
test/runtime-credentials.test.ts | — | Tests: runtime-credentials.test | pi-coding-agent (tests)
test/scoped-models-selector.test.ts | — | Tests: scoped-models-selector.test | pi-coding-agent (tests)
test/scrollbar-theme.test.ts | — | Tests: scrollbar-theme.test | pi-coding-agent (tests)
test/sdk-client-identity.test.ts | — | Tests: sdk-client-identity.test | pi-coding-agent (tests)
test/sdk-codex-cache-probe-tool-loop.ts | — | Tests: sdk-codex-cache-probe-tool-loop | pi-coding-agent (tests)
test/sdk-session-manager.test.ts | — | Tests: sdk-session-manager.test | pi-coding-agent (tests)
test/sdk-skills.test.ts | — | Tests: sdk-skills.test | pi-coding-agent (tests)
test/sdk-stream-options.test.ts | — | Tests: sdk-stream-options.test | pi-coding-agent (tests)
test/session-context-edit.test.ts | — | Tests: session-context-edit.test | pi-coding-agent (tests)
test/session-cwd.test.ts | — | Tests: session-cwd.test | pi-coding-agent (tests)
test/session-file-invalid.test.ts | — | Tests: session-file-invalid.test | pi-coding-agent (tests)
test/session-id-readonly.test.ts | — | Tests: session-id-readonly.test | pi-coding-agent (tests)
test/session-info-modified-timestamp.test.ts | — | Tests: session-info-modified-timestamp.test | pi-coding-agent (tests)
test/session-manager/build-context.test.ts | — | Tests: build-context.test | pi-coding-agent (tests)
test/session-manager/custom-session-id.test.ts | — | Tests: custom-session-id.test | pi-coding-agent (tests)
test/session-manager/file-operations.test.ts | — | Tests: file-operations.test | pi-coding-agent (tests)
test/session-manager/labels.test.ts | — | Tests: labels.test | pi-coding-agent (tests)
test/session-manager/load-entries.test.ts | — | Tests: load-entries.test | pi-coding-agent (tests)
test/session-manager/migration.test.ts | — | Tests: migration.test | pi-coding-agent (tests)
test/session-manager/save-entry.test.ts | — | Tests: save-entry.test | pi-coding-agent (tests)
test/session-manager/tree-traversal.test.ts | — | Tests: tree-traversal.test | pi-coding-agent (tests)
test/session-selector-path-delete.test.ts | — | Tests: session-selector-path-delete.test | pi-coding-agent (tests)
test/session-selector-rename.test.ts | — | Tests: session-selector-rename.test | pi-coding-agent (tests)
test/session-selector-search.test.ts | — | Tests: session-selector-search.test | pi-coding-agent (tests)
test/session-share.test.ts | — | Tests: session-share.test | pi-coding-agent (tests)
test/settings-diagnostics.test.ts | — | Tests: settings-diagnostics.test | pi-coding-agent (tests)
test/settings-manager-bug.test.ts | — | Tests: settings-manager-bug.test | pi-coding-agent (tests)
test/settings-manager-compaction.test.ts | — | Tests: settings-manager-compaction.test | pi-coding-agent (tests)
test/settings-manager.test.ts | — | Tests: settings-manager.test | pi-coding-agent (tests)
test/settings-selector.test.ts | — | Tests: settings-selector.test | pi-coding-agent (tests)
test/shell-kill-process-tree.test.ts | — | Tests: shell-kill-process-tree.test | pi-coding-agent (tests)
test/shell-path-exists.test.ts | — | Tests: shell-path-exists.test | pi-coding-agent (tests)
test/skills.test.ts | — | Tests: skills.test | pi-coding-agent (tests)
test/source-info.test.ts | — | Tests: source-info.test | pi-coding-agent (tests)
test/startup-session-name.test.ts | — | Tests: startup-session-name.test | pi-coding-agent (tests)
test/status-indicator.test.ts | — | Tests: status-indicator.test | pi-coding-agent (tests)
test/stdout-cleanliness.test.ts | — | Tests: stdout-cleanliness.test | pi-coding-agent (tests)
test/streaming-render-debug.ts | — | Tests: streaming-render-debug | pi-coding-agent (tests)
test/subagent-extension.test.ts | — | Tests: subagent-extension.test | pi-coding-agent (tests)
test/suite/agent-session-bash-persistence.test.ts | — | Tests: agent-session-bash-persistence.test | pi-coding-agent (tests)
test/suite/agent-session-boundaries.test.ts | — | Tests: agent-session-boundaries.test | pi-coding-agent (tests)
test/suite/agent-session-codemode.test.ts | — | Tests: agent-session-codemode.test | pi-coding-agent (tests)
test/suite/agent-session-compaction-model-overrides.test.ts | — | Tests: agent-session-compaction-model-overrides.test | pi-coding-agent (tests)
test/suite/agent-session-compaction.test.ts | — | Tests: agent-session-compaction.test | pi-coding-agent (tests)
test/suite/agent-session-mcp-oauth.test.ts | — | Tests: agent-session-mcp-oauth.test | pi-coding-agent (tests)
test/suite/agent-session-mcp.test.ts | — | Tests: agent-session-mcp.test | pi-coding-agent (tests)
test/suite/agent-session-model-extension.test.ts | — | Tests: agent-session-model-extension.test | pi-coding-agent (tests)
test/suite/agent-session-prompt.test.ts | — | Tests: agent-session-prompt.test | pi-coding-agent (tests)
test/suite/agent-session-queue.test.ts | — | Tests: agent-session-queue.test | pi-coding-agent (tests)
test/suite/agent-session-retry-events.test.ts | — | Tests: agent-session-retry-events.test | pi-coding-agent (tests)
test/suite/agent-session-runtime.test.ts | — | Tests: agent-session-runtime.test | pi-coding-agent (tests)
test/suite/agent-session-tool-orchestration.test.ts | — | Tests: agent-session-tool-orchestration.test | pi-coding-agent (tests)
test/suite/agent-session-tool-result-images.test.ts | — | Tests: agent-session-tool-result-images.test | pi-coding-agent (tests)
test/suite/harness.ts | `getMessageText,getUserTexts,getAssistantTexts,getToolResult,createTestUiContext,HarnessOptions,Harness` | Test helpers/fixtures | pi-coding-agent (tests)
test/suite/lax-message-content.test.ts | — | Tests: lax-message-content.test | pi-coding-agent (tests)
test/suite/mcp-oauth-server.ts | — | Tests: mcp-oauth-server | pi-coding-agent (tests)
test/suite/print-mode-session-start-events.test.ts | — | Tests: print-mode-session-start-events.test | pi-coding-agent (tests)
test/suite/regressions/10285-mcp-tool-renderers.test.ts | — | Tests: 10285-mcp-tool-renderers.test | pi-coding-agent (tests)
test/suite/regressions/10470-rpc-session-replacement-start-once.test.ts | — | Tests: 10470-rpc-session-replacement-start-once.test | pi-coding-agent (tests)
test/suite/regressions/11156-pi-ai-models-virtual-module.test.ts | — | Tests: 11156-pi-ai-models-virtual-module.test | pi-coding-agent (tests)
test/suite/regressions/11227-recovery-omits-tool-results.test.ts | — | Tests: 11227-recovery-omits-tool-results.test | pi-coding-agent (tests)
test/suite/regressions/11264-pi-events-handler-errors.test.ts | — | Tests: 11264-pi-events-handler-errors.test | pi-coding-agent (tests)
test/suite/regressions/11451-thinking-level-after-tree-navigation.test.ts | — | Tests: 11451-thinking-level-after-tree-navigation.test | pi-coding-agent (tests)
test/suite/regressions/11520-sdk-summary-oauth-auth.test.ts | — | Tests: 11520-sdk-summary-oauth-auth.test | pi-coding-agent (tests)
test/suite/regressions/11613-bash-timeout-after-shell-exit.test.ts | — | Tests: 11613-bash-timeout-after-shell-exit.test | pi-coding-agent (tests)
test/suite/regressions/11692-dispose-waits-for-oauth-refresh.test.ts | — | Tests: 11692-dispose-waits-for-oauth-refresh.test | pi-coding-agent (tests)
test/suite/regressions/12066-find-ancestor-glob.test.ts | — | Tests: 12066-find-ancestor-glob.test | pi-coding-agent (tests)
test/suite/regressions/12119-copy-after-abort-or-error.test.ts | — | Tests: 12119-copy-after-abort-or-error.test | pi-coding-agent (tests)
test/suite/regressions/12124-websocket-connection-limit-retry.test.ts | — | Tests: 12124-websocket-connection-limit-retry.test | pi-coding-agent (tests)
test/suite/regressions/1717-2113-agent-session-event-settlement.test.ts | — | Tests: 1717-2113-agent-session-event-settlement.test | pi-coding-agent (tests)
test/suite/regressions/2023-queued-slash-command-followup.test.ts | — | Tests: 2023-queued-slash-command-followup.test | pi-coding-agent (tests)
test/suite/regressions/2753-reload-stale-resource-settings.test.ts | — | Tests: 2753-reload-stale-resource-settings.test | pi-coding-agent (tests)
test/suite/regressions/2781-skill-collision-precedence.test.ts | — | Tests: 2781-skill-collision-precedence.test | pi-coding-agent (tests)
test/suite/regressions/2791-fswatch-error-crash.test.ts | — | Tests: 2791-fswatch-error-crash.test | pi-coding-agent (tests)
test/suite/regressions/2835-tools-allowlist-filters-extension-tools.test.ts | — | Tests: 2835-tools-allowlist-filters-extension-tools.test | pi-coding-agent (tests)
test/suite/regressions/2860-replaced-session-context.test.ts | — | Tests: 2860-replaced-session-context.test | pi-coding-agent (tests)
test/suite/regressions/3217-scoped-model-order.test.ts | — | Tests: 3217-scoped-model-order.test | pi-coding-agent (tests)
test/suite/regressions/3302-find-path-glob.test.ts | — | Tests: 3302-find-path-glob.test | pi-coding-agent (tests)
test/suite/regressions/3303-find-nested-gitignore.test.ts | — | Tests: 3303-find-nested-gitignore.test | pi-coding-agent (tests)
test/suite/regressions/3317-network-connection-lost-retry.test.ts | — | Tests: 3317-network-connection-lost-retry.test | pi-coding-agent (tests)
test/suite/regressions/3592-no-builtin-tools-keeps-extension-tools.test.ts | — | Tests: 3592-no-builtin-tools-keeps-extension-tools.test | pi-coding-agent (tests)
test/suite/regressions/3616-settings-inmemory-reload.test.ts | — | Tests: 3616-settings-inmemory-reload.test | pi-coding-agent (tests)
test/suite/regressions/3686-session-name-event.test.ts | — | Tests: 3686-session-name-event.test | pi-coding-agent (tests)
test/suite/regressions/3688-tree-cancel-compacting.test.ts | — | Tests: 3688-tree-cancel-compacting.test | pi-coding-agent (tests)
test/suite/regressions/3982-message-end-cost-override.test.ts | — | Tests: 3982-message-end-cost-override.test | pi-coding-agent (tests)
test/suite/regressions/4167-thinking-toggle-pending-tool-render.test.ts | — | Tests: 4167-thinking-toggle-pending-tool-render.test | pi-coding-agent (tests)
test/suite/regressions/5080-signal-shutdown-extension-cleanup.test.ts | — | Tests: 5080-signal-shutdown-extension-cleanup.test | pi-coding-agent (tests)
test/suite/regressions/5109-exclude-tools.test.ts | — | Tests: 5109-exclude-tools.test | pi-coding-agent (tests)
test/suite/regressions/5208-late-bash-output.test.ts | — | Tests: 5208-late-bash-output.test | pi-coding-agent (tests)
test/suite/regressions/5217-compaction-reason.test.ts | — | Tests: 5217-compaction-reason.test | pi-coding-agent (tests)
test/suite/regressions/5303-bash-output-truncation.test.ts | — | Tests: 5303-bash-output-truncation.test | pi-coding-agent (tests)
test/suite/regressions/5433-extension-oauth-prompt-input.test.ts | — | Tests: 5433-extension-oauth-prompt-input.test | pi-coding-agent (tests)
test/suite/regressions/5596-missing-theme-export.test.ts | — | Tests: 5596-missing-theme-export.test | pi-coding-agent (tests)
test/suite/regressions/5661-uppercase-header-values.test.ts | — | Tests: 5661-uppercase-header-values.test | pi-coding-agent (tests)
test/suite/regressions/5724-sigterm-signal-exit.test.ts | — | Tests: 5724-sigterm-signal-exit.test | pi-coding-agent (tests)
test/suite/regressions/5868-rpc-unknown-command-id.test.ts | — | Tests: 5868-rpc-unknown-command-id.test | pi-coding-agent (tests)
test/suite/regressions/5943-session-start-notify.test.ts | — | Tests: 5943-session-start-notify.test | pi-coding-agent (tests)
test/suite/regressions/5996-session-name-newlines.test.ts | — | Tests: 5996-session-name-newlines.test | pi-coding-agent (tests)
test/suite/regressions/5998-blocked-tool-terminate.test.ts | — | Tests: 5998-blocked-tool-terminate.test | pi-coding-agent (tests)
test/suite/regressions/6019-explicit-provider-retry-message.test.ts | — | Tests: 6019-explicit-provider-retry-message.test | pi-coding-agent (tests)
test/suite/regressions/6104-find-root-relativization.test.ts | — | Tests: 6104-find-root-relativization.test | pi-coding-agent (tests)
test/suite/regressions/6162-extension-active-tools-next-turn.test.ts | — | Tests: 6162-extension-active-tools-next-turn.test | pi-coding-agent (tests)
test/suite/regressions/6260-inline-extension-naming.test.ts | — | Tests: 6260-inline-extension-naming.test | pi-coding-agent (tests)
test/suite/regressions/6324-branch-summary-ambient-auth.test.ts | — | Tests: 6324-branch-summary-ambient-auth.test | pi-coding-agent (tests)
test/suite/regressions/6363-agent-settled-event.test.ts | — | Tests: 6363-agent-settled-event.test | pi-coding-agent (tests)
test/suite/regressions/6596-taskkill-enoent.test.ts | — | Tests: 6596-taskkill-enoent.test | pi-coding-agent (tests)
test/suite/regressions/6647-compaction-retries-transient-stream-drop.test.ts | — | Tests: 6647-compaction-retries-transient-stream-drop.test | pi-coding-agent (tests)
test/suite/regressions/6768-copilot-compaction-base-url.test.ts | — | Tests: 6768-copilot-compaction-base-url.test | pi-coding-agent (tests)
test/suite/regressions/6904-dns-transport-retry.test.ts | — | Tests: 6904-dns-transport-retry.test | pi-coding-agent (tests)
test/suite/regressions/6949-unavailable-scoped-model.test.ts | — | Tests: 6949-unavailable-scoped-model.test | pi-coding-agent (tests)
test/suite/regressions/6999-models-json-hot-reload.test.ts | — | Tests: 6999-models-json-hot-reload.test | pi-coding-agent (tests)
test/suite/regressions/7027-credential-refresh-hang.test.ts | — | Tests: 7027-credential-refresh-hang.test | pi-coding-agent (tests)
test/suite/regressions/7048-compaction-truncated-summary.test.ts | — | Tests: 7048-compaction-truncated-summary.test | pi-coding-agent (tests)
test/suite/regressions/7150-rpc-prompt-during-compaction.test.ts | — | Tests: 7150-rpc-prompt-during-compaction.test | pi-coding-agent (tests)
test/suite/regressions/7153-scoped-models-refresh.test.ts | — | Tests: 7153-scoped-models-refresh.test | pi-coding-agent (tests)
test/suite/regressions/7187-malformed-package-manifest.test.ts | — | Tests: 7187-malformed-package-manifest.test | pi-coding-agent (tests)
test/suite/regressions/7193-event-bus-lifecycle.test.ts | — | Tests: 7193-event-bus-lifecycle.test | pi-coding-agent (tests)
test/suite/regressions/7209-model-selector-filter-resets-selection.test.ts | — | Tests: 7209-model-selector-filter-resets-selection.test | pi-coding-agent (tests)
test/suite/regressions/7253-manual-compact-during-response.test.ts | — | Tests: 7253-manual-compact-during-response.test | pi-coding-agent (tests)
test/suite/regressions/7269-cli-end-of-options.test.ts | — | Tests: 7269-cli-end-of-options.test | pi-coding-agent (tests)
test/suite/regressions/7290-json-stream-linear.test.ts | — | Tests: 7290-json-stream-linear.test | pi-coding-agent (tests)
test/suite/regressions/7301-stalled-availability-refresh.test.ts | — | Tests: 7301-stalled-availability-refresh.test | pi-coding-agent (tests)
test/suite/regressions/7443-model-command-cached-match.test.ts | — | Tests: 7443-model-command-cached-match.test | pi-coding-agent (tests)
test/suite/regressions/7497-session-discovery-symlink.test.ts | — | Tests: 7497-session-discovery-symlink.test | pi-coding-agent (tests)
test/suite/regressions/7572-provider-retry-settings-merge.test.ts | — | Tests: 7572-provider-retry-settings-merge.test | pi-coding-agent (tests)
test/suite/regressions/7731-tui-method-wrapping.test.ts | — | Tests: 7731-tui-method-wrapping.test | pi-coding-agent (tests)
test/suite/regressions/7829-invalid-settings-warning.test.ts | — | Tests: 7829-invalid-settings-warning.test | pi-coding-agent (tests)
test/suite/regressions/7911-json-stream-usage.test.ts | — | Tests: 7911-json-stream-usage.test | pi-coding-agent (tests)
test/suite/regressions/7925-toolcall-start-metadata.test.ts | — | Tests: 7925-toolcall-start-metadata.test | pi-coding-agent (tests)
test/suite/regressions/8092-extension-realpath-jiti.test.ts | — | Tests: 8092-extension-realpath-jiti.test | pi-coding-agent (tests)
test/suite/regressions/8237-node-sea-extension-loading.test.ts | — | Tests: 8237-node-sea-extension-loading.test | pi-coding-agent (tests)
test/suite/regressions/8261-subagent-project-trust.test.ts | — | Tests: 8261-subagent-project-trust.test | pi-coding-agent (tests)
test/suite/regressions/8328-zero-usage-auto-compaction.test.ts | — | Tests: 8328-zero-usage-auto-compaction.test | pi-coding-agent (tests)
test/suite/regressions/8337-utf8-bom-parsing.test.ts | — | Tests: 8337-utf8-bom-parsing.test | pi-coding-agent (tests)
test/suite/regressions/8409-aborted-tool-auth-setup.test.ts | — | Tests: 8409-aborted-tool-auth-setup.test | pi-coding-agent (tests)
test/suite/regressions/8423-extension-factory-failure.test.ts | — | Tests: 8423-extension-factory-failure.test | pi-coding-agent (tests)
test/suite/regressions/8537-custom-message-tool-result-ordering.test.ts | — | Tests: 8537-custom-message-tool-result-ordering.test | pi-coding-agent (tests)
test/suite/regressions/8611-thinking-toggle-pending-bash-output.test.ts | — | Tests: 8611-thinking-toggle-pending-bash-output.test | pi-coding-agent (tests)
test/suite/regressions/8724-in-memory-fork-active-tool.test.ts | — | Tests: 8724-in-memory-fork-active-tool.test | pi-coding-agent (tests)
test/suite/regressions/8935-parallel-preflight-abort.test.ts | — | Tests: 8935-parallel-preflight-abort.test | pi-coding-agent (tests)
test/suite/regressions/8964-extension-provider-streaming.test.ts | — | Tests: 8964-extension-provider-streaming.test | pi-coding-agent (tests)
test/suite/regressions/8989-fork-compaction-label-boundary.test.ts | — | Tests: 8989-fork-compaction-label-boundary.test | pi-coding-agent (tests)
test/suite/regressions/9068-user-bash-fail-closed.test.ts | — | Tests: 9068-user-bash-fail-closed.test | pi-coding-agent (tests)
test/suite/regressions/9124-runtime-dispose-tool-settlement.test.ts | — | Tests: 9124-runtime-dispose-tool-settlement.test | pi-coding-agent (tests)
test/suite/regressions/9154-prompt-during-tree-navigation.test.ts | — | Tests: 9154-prompt-during-tree-navigation.test | pi-coding-agent (tests)
test/suite/regressions/9178-tree-during-compaction.test.ts | — | Tests: 9178-tree-during-compaction.test | pi-coding-agent (tests)
test/suite/regressions/9221-reload-during-tool.test.ts | — | Tests: 9221-reload-during-tool.test | pi-coding-agent (tests)
test/suite/regressions/9340-9777-auto-compaction-cancellation.test.ts | — | Tests: 9340-9777-auto-compaction-cancellation.test | pi-coding-agent (tests)
test/suite/regressions/9540-extension-loader-lazy.test.ts | — | Tests: 9540-extension-loader-lazy.test | pi-coding-agent (tests)
test/suite/regressions/9789-context-handler-system-messages.test.ts | — | Tests: 9789-context-handler-system-messages.test | pi-coding-agent (tests)
test/suite/regressions/copilot-request-size-overflow.test.ts | — | Tests: copilot-request-size-overflow.test | pi-coding-agent (tests)
test/suite/regressions/extension-factory-cache.test.ts | — | Tests: extension-factory-cache.test | pi-coding-agent (tests)
test/suite/regressions/pre-prompt-compaction-no-continue.test.ts | — | Tests: pre-prompt-compaction-no-continue.test | pi-coding-agent (tests)
test/suite/regressions/startup-session-rebind-duplicate-subscription.test.ts | — | Tests: startup-session-rebind-duplicate-subscription.test | pi-coding-agent (tests)
test/suite/regressions/tree-during-streaming.test.ts | — | Tests: tree-during-streaming.test | pi-coding-agent (tests)
test/suite/virtual-models.test.ts | — | Tests: virtual-models.test | pi-coding-agent (tests)
test/syntax-highlight.test.ts | — | Tests: syntax-highlight.test | pi-coding-agent (tests)
test/system-prompt.test.ts | — | Tests: system-prompt.test | pi-coding-agent (tests)
test/system-prompt-updates.test.ts | — | Tests: system-prompt-updates.test | pi-coding-agent (tests)
test/system-theme.test.ts | — | Tests: system-theme.test | pi-coding-agent (tests)
test/terminal-question.test.ts | — | Tests: terminal-question.test | pi-coding-agent (tests)
test/test-harness.test.ts | — | Tests: test-harness.test | pi-coding-agent (tests)
test/test-harness.ts | `fauxModel,FauxResponse,FauxResponseInput,FauxStreamFnState,createFauxStreamFn,HarnessOptions,Harness` | Test helpers/fixtures | pi-coding-agent (tests)
test/test-network-env.ts | `allowNetwork` | Test helpers/fixtures | pi-coding-agent (tests)
test/test-theme-colors.ts | — | Tests: test-theme-colors | pi-coding-agent (tests)
test/theme-controller.test.ts | — | Tests: theme-controller.test | pi-coding-agent (tests)
test/theme-detection.test.ts | — | Tests: theme-detection.test | pi-coding-agent (tests)
test/themed-text.test.ts | — | Tests: themed-text.test | pi-coding-agent (tests)
test/theme-export.test.ts | — | Tests: theme-export.test | pi-coding-agent (tests)
test/theme-picker.test.ts | — | Tests: theme-picker.test | pi-coding-agent (tests)
test/theme-style.test.ts | — | Tests: theme-style.test | pi-coding-agent (tests)
test/thinking-selector.test.ts | — | Tests: thinking-selector.test | pi-coding-agent (tests)
test/tool-execution-component.test.ts | — | Tests: tool-execution-component.test | pi-coding-agent (tests)
test/tool-renderer-examples.test.ts | — | Tests: tool-renderer-examples.test | pi-coding-agent (tests)
test/tool-result-images.test.ts | — | Tests: tool-result-images.test | pi-coding-agent (tests)
test/tool-search.test.ts | — | Tests: tool-search.test | pi-coding-agent (tests)
test/tools-manager.test.ts | — | Tests: tools-manager.test | pi-coding-agent (tests)
test/tools.test.ts | — | Tests: tools.test | pi-coding-agent (tests)
test/tool-system-prompt-contributions.test.ts | — | Tests: tool-system-prompt-contributions.test | pi-coding-agent (tests)
test/tree-selector.test.ts | — | Tests: tree-selector.test | pi-coding-agent (tests)
test/trigger-compact-extension.test.ts | — | Tests: trigger-compact-extension.test | pi-coding-agent (tests)
test/truncate-surrogates.test.ts | — | Tests: truncate-surrogates.test | pi-coding-agent (tests)
test/truncate-to-width.test.ts | — | Tests: truncate-to-width.test | pi-coding-agent (tests)
test/trust-manager.test.ts | — | Tests: trust-manager.test | pi-coding-agent (tests)
test/trust-selector.test.ts | — | Tests: trust-selector.test | pi-coding-agent (tests)
test/usage-totals.test.ts | — | Tests: usage-totals.test | pi-coding-agent (tests)
test/user-message.test.ts | — | Tests: user-message.test | pi-coding-agent (tests)
test/utilities.ts | `API_KEY,hasAuthForProvider,PI_AGENT_DIR,getRealAuthStorage,userMsg,assistantMsg,readSessionFileRoles,TestSessionOptions,TestSessionContext,CreateTestExtensionsResultInput,CreateTestResourceLoaderOptions,createTestResourceLoader,buildTestTree` | Test helpers/fixtures | pi-coding-agent (tests)
test/version-check.test.ts | — | Tests: version-check.test | pi-coding-agent (tests)
test/virtual-models.test.ts | — | Tests: virtual-models.test | pi-coding-agent (tests)
test/windows-shell-config.test.ts | — | Tests: windows-shell-config.test | pi-coding-agent (tests)

## build/config (not ported)
scripts/generate-references.ts | `renderReferences` | Generate docs/references.md | build script
scripts/generate-schemas.ts | `renderConfigSchemas` | Generate config JSON schemas | build script
vitest.config.ts | default (vitest config) | Test runner config, not ported | none
