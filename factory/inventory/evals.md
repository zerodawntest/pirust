# Inventory: packages/evals (pi `@earendil-works/pi-evals`, private)

Format: `path | exports | purpose | target crate`. Source root: `/src/pi/packages/evals`.
Evals target the TS coding agent; the Rust port has no `pi-coding-agent` crate yet, so most of these are `deferred`.

src/harness.ts | `createPiCodingAgentHarness`, `createPiDocumentationEvalHarness`, `resolveModelSelection`, `applyIsolatedEnvironment`, `verifySystemPrompt`, `PiCodingAgentHarnessOptions`, `PiCodingAgentInput`, `PiCodingAgentModelSelection`, `PiCodingAgentHarnessWithOutput`, `DOCUMENTATION_EVAL_TOOLS`, `resolveDocumentationVariant`, `excludePiDocumentation` | Harness: run pi agent in isolated env | pi-evals (deferred: needs pi-coding-agent)
src/report.ts | `PI_SESSION_SNAPSHOT_ARTIFACT`, `erroredObservation`, `readTaskObservation`, `summarizeEvalObservations`, `formatEvalComparisonReport`, `EvalRunIdentity`, `EvalObservation`, `PairedMetricSummary`, `EvalSetComparison`, `BlockedPair`, `OperationalMetricTotal`, `VariantTotals`, `EvalComparisonReport`, `ExpectedEvalRun` | Summarise + diff paired eval runs | pi-evals
src/plan.ts | `DOCUMENTATION_VARIANTS`, `parseDiscoveredCases`, `createTaskPlan`, `DiscoveredEvalCase`, `EvalTask`, `DocumentationVariant` | Build with/without-docs eval task plan | pi-evals
src/docker.ts | `buildImages`, `requireEvalAuthFile`, `createDockerContext`, `discoverCases`, `runTask`, `BuiltImages` | Run eval cases inside Docker containers | pi-evals
src/cli.ts | — | CLI entry: runs docs evals, prints report | pi-evals (bin)
docker/entrypoint.ts | — | Container entry: runs eval cases isolated | pi-evals (deferred)
evals/acme-server.ts | `createAcmeServer`, `AcmeServer`, `OPENAI_PROVIDER_ID`, `OPENAI_MODEL_ID`, `OPENAI_PROBE_PROMPT`, `OPENAI_PROBE_RESPONSE`, `STREAM_PROVIDER_ID`, `STREAM_MODEL_ID`, `STREAM_PROBE_PROMPT`, `STREAM_PROBE_RESPONSE`, `STREAM_API_DOCUMENTATION` | Fake OpenAI server for provider tests | pi-evals (tests)
evals/configured-runtime.ts | `inspectProvider`, `inspectAddedModel`, `ProviderRuntimeOutput`, `AddedModelOutput`, `ProviderScenario` | Checks configured provider/model runtime | pi-evals (tests)
evals/smoke.eval.ts | — | Smoke eval: agent answers with tools | pi-evals (deferred)
evals/documentation-audit.eval.ts | — | Audits docs claims against code | none (TS-only audit)
evals/custom-provider.docs.eval.ts | — | Eval: add custom provider via docs | pi-evals (deferred)
evals/openai-provider.docs.eval.ts | — | Eval: OpenAI provider setup via docs | pi-evals (deferred)
evals/extensions.docs.eval.ts | — | Eval: write extension from docs | pi-evals (deferred)
evals/models.docs.eval.ts | — | Eval: model config from docs | pi-evals (deferred)
evals/prompt-templates.docs.eval.ts | — | Eval: prompt templates from docs | pi-evals (deferred)
evals/tui.docs.eval.ts | — | Eval: TUI usage from docs | pi-evals (deferred)
test/harness.test.ts | — | Tests harness creation and isolation | pi-evals (tests)
test/report.test.ts | — | Tests report summarising, formatting | pi-evals (tests)
test/plan.test.ts | — | Tests task plan building, parsing | pi-evals (tests)
test/comparison.test.ts | — | Tests paired comparison output | pi-evals (tests)
test/configured-runtime.test.ts | — | Tests provider/model runtime inspection | pi-evals (tests)
test/acme-server.test.ts | — | Tests fake ACME provider server | pi-evals (tests)
vitest.evals.config.ts | default (vitest config) | Eval runner config, not ported | none
vitest.test.config.ts | default (vitest config) | Unit test runner config, not ported | none
