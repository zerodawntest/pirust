# Inventory: packages/telemetry (pi `@earendil-works/pi-telemetry`)

Format: `path | exports | purpose | target crate`. Source root: `/src/pi/packages/telemetry`.
Pure contracts + in-memory/no-op impls; no runtime deps. Rust: `crates/pi-telemetry`.

src/index.ts | types `AttributeValue`, `SpanAttributes`, `TelemetryCarrier`, `TelemetryPropagation`, `SpanLink`, `SpanOptions`, `SpanStatus`, `StoredSpan`, `StoredTrace`, `TraceQuery`, `MetricQuery`, `StoredMetric`, `TelemetryStore`, `TelemetryContext`, `TelemetrySpan`, `TelemetryAttributeType`, `TelemetryAttributeMetadata`, `TelemetryAttributeDefinition`, `TelemetryStartAttributeDefinition`, `TelemetryEventAttributeDefinition`, `TelemetryEventDefinition`, `TelemetryParentDefinition`, `TelemetrySpanDefinition`, `TelemetrySchemaDefinition`, `InferRequiredAndOptionalAttributes`, `InferStartAttributes`, `InferOptionalAttributes`, `ExactTelemetryAttributes`, `InferEventAttributes`, `TelemetrySchemaSpanName`, `TelemetrySchemaSpanStartAttributes`, `TelemetrySchemaSpanEndAttributes`, `TelemetrySchemaSpanEventName`, `TelemetrySchemaSpanEventAttributes`, `SchemaTelemetrySpan`, `TelemetrySchemaSpanUnion`, `TypedSpanStarter`; fns `defineTelemetrySchema`, `createTypedSpanStarter`; re-exports `createTypedMetrics`, `NOOP_TELEMETRY_*`, `InMemoryTelemetryContext`, `telemetryNow` | Typed span/metric contracts + schema DSL | pi-telemetry
src/memory.ts | `InMemoryTelemetryContext`, `telemetryNow`, `RecordedTelemetryEvent`, `RecordedTelemetryLink`, `RecordedTelemetrySpan`, `RecordedTelemetryMeasurement` | In-memory span/metric store for tests | pi-telemetry
src/metrics.ts | `createTypedMetrics`, `InstrumentOptions`, `HistogramOptions`, `TelemetryCounter`, `TelemetryUpDownCounter`, `TelemetryHistogram`, `TelemetryMetrics`, `TelemetryMetricDefinition`, `TelemetryMetricAttributeDefinition`, `SchemaTelemetryCounter`, `SchemaTelemetryHistogram`, `TypedTelemetryMetrics` | Typed counter/histogram instruments | pi-telemetry
src/noop.ts | `NOOP_TELEMETRY_METRICS`, `NOOP_TELEMETRY_PROPAGATION`, `NOOP_TELEMETRY_CONTEXT` | No-op context, metrics, propagation | pi-telemetry
src/render.ts | `renderTrace` | Render stored spans as text tree | pi-telemetry
src/testing/conformance.ts | `createTelemetryAdapterConformance` | Conformance suite for telemetry adapters | pi-telemetry (dev)
src/testing/index.ts | re-exports `createTelemetryAdapterConformance`, fixture types | Public testing entry point | pi-telemetry (dev)
src/testing/types.ts | `TelemetryAdapterFixture`, `TelemetryAdapterFixtureFactory`, `TelemetryAdapterConformanceCase` | Types for adapter conformance fixtures | pi-telemetry (dev)
test/telemetry.test.ts | — | Tests typed spans, metrics, schemas | pi-telemetry (tests)
test/metrics.test.ts | — | Tests counters, histograms, attributes | pi-telemetry (tests)
test/store.test.ts | — | Tests in-memory store query behaviour | pi-telemetry (tests)
test/store-conformance.ts | — | Conformance run against in-memory store | pi-telemetry (tests)
test/conformance.test.ts | — | Runs adapter conformance suite | pi-telemetry (tests)
test/render.test.ts | — | Tests trace rendering output | pi-telemetry (tests)
test/propagation.test.ts | — | Tests context propagation across workers | pi-telemetry (tests)
test/propagation-worker.ts | — | Worker side of cross-thread propagation | pi-telemetry (tests)
