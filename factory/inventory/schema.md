# Inventory: packages/schema (pi `@earendil-works/pi-schema`)

Format: `path | exports | purpose | target crate`. Source root: `/src/pi/packages/schema`.
Self-contained JSON Schema validator + typed schema builders; `typebox` is devDependency only (interop types). Rust: `crates/pi-schema`.

src/annotations.ts | `Annotations`, `AnnotatingCheck`, `newAnnotations`, `ANNOTATING_TRUE`, `ANNOTATING_FALSE`, `indirectAnnotating`, `ignoreAnnotations`, `withFreshAnnotations`, `scopedAnnotating`, `isolateAnnotations`, `annotateAll`, `annotateObject`, `annotateArray`, `annotateAny`, `annotateIf`, `annotateDependent`, `unevaluatedProperties`, `unevaluatedItems` | JSON Schema annotation collection/combinators | pi-schema
src/builders.ts | `Schema`, `Static`, `Annotations`, `LengthBounds`, `str`, `NumberBounds`, `num`, `int`, `BigintBounds`, `bigint`, `bool`, `nul`, `unknown`, `lit`, `oneOf`, `union`, `nullable`, `arr`, `tuple`, `map`, `unsafe`, `recursive`, `bytes`, `Optional`, `opt`, `Properties`, `StaticObject`, `obj` | Typed schema builders (string/num/obj/array) | pi-schema
src/checks.ts | `ALWAYS`, `NEVER`, `IS_ARRAY`, `IS_OBJECT`, `isObject`, `TYPE_CHECKS`, `Leaf`, `leafOf`, `GUARD_NONE`, `GUARD_STRICT`, `GUARD_LOOSE`, `Guard`, `CODE`, `REQUIRED`, `INHERITED`, `and`, `indirect`, `scopedCheck`, `typeCheck`, `typeMask`, `maskedAnyCheck`, `bytesCheck`, `codePoints`, `stringCheck`, `Bound`, `numberCheck`, `isMultiple`, `guardObject`, `guardArray`, `declaredObject`, `deepEqual` | Primitive/compound check fns, deep-equal | pi-schema
src/coerce.ts | `Coercer` | Coerces input to schema-typed values | pi-schema
src/compiler.ts | `RESTART`, `Compiler`, `NEUTRAL_KEYWORDS` | Compiles JSON Schema to check functions | pi-schema
src/explain.ts | `Explainer` | Explains schema validation failures | pi-schema
src/formats/index.ts | `formats` | Format-check registry (date/email/uri/…) | pi-schema
src/formats/typebox/date_time.ts | `IsDateTime` | Validates date-time string format | pi-schema
src/formats/typebox/date.ts | `IsDate` | Validates date string format | pi-schema
src/formats/typebox/duration.ts | `IsDuration` | Validates duration (ISO 8601) format | pi-schema
src/formats/typebox/email.ts | `IsEmail` | Validates email address format | pi-schema
src/formats/typebox/hostname.ts | `IsHostname` | Validates hostname format | pi-schema
src/formats/typebox/idna/format/bidi.ts | `HasBidiChars`, `HasRightToLeftCharacters`, `SatisfiesBidiRule` | IDNA bidirectional rule checks | pi-schema
src/formats/typebox/idna/format/puny.ts | `IsAcePrefixed`, `Decode`, `Encode` | Punycode encode/decode for IDNA | pi-schema
src/formats/typebox/idna/hostname.ts | `IsHostname` | Validates IDN hostname format | pi-schema
src/formats/typebox/idna/idn-hostname.ts | `IsIdnHostname` | Validates internationalized hostname | pi-schema
src/formats/typebox/idna/index.ts | re-exports hostname, idn-hostname | IDNA hostname module barrel | pi-schema (lib root)
src/formats/typebox/idna/label/ascii.ts | `IsAsciiLabel` | Validates ASCII host label | pi-schema
src/formats/typebox/idna/label/puny.ts | `IsPunyLabel` | Validates punycode host label | pi-schema
src/formats/typebox/idna/label/unicode.ts | `IsUnicodeLabel` | Validates Unicode host label | pi-schema
src/formats/typebox/idna/pattern/pattern.ts | `RE_RULE_HYPHEN_PLACEMENT`, `RE_RULE_NOT_RESERVED_ACE`, `RE_ASCII_LDH`, `RE_ASCII`, `RE_NON_ASCII`, `RE_HIGH_SURROGATE`, `RE_REGIONAL_INDICATOR`, `RE_VARIATION_SELECTOR`, `RE_ZERO_WIDTH_JOINER`, `RE_ASCII_DIGIT`, `RE_ARABIC_INDIC_DIGIT`, `RE_EXT_ARABIC_INDIC_DIGIT`, `RE_COMMON_SEPARATOR`, `RE_EUROPEAN_SEPARATOR`, `RE_MARK_NONSPACING`, `RE_MARK_SPACING_COMBINING`, `RE_MARK_ENCLOSING`, `RE_COMBINING_MARK`, `RE_LETTER`, `RE_NUMBER_DECIMAL`, `RE_SCRIPT_GREEK`, `RE_SCRIPT_HEBREW`, `RE_SCRIPT_JAPANESE`, `RE_SCRIPT_ARABIC_LETTER`, `RE_VIRAMA`, `RE_RFC5892_DISALLOWED`, `RE_CONTEXTO_EXCEPTIONS`, `RE_PVALID_EXCEPTIONS`, `RE_EUROPEAN_NUMBER`, `RE_PERMITTED_CATEGORY` | Unicode/script regexes for IDNA labels | pi-schema
src/formats/typebox/idn_email.ts | `IsIdnEmail` | Validates internationalized email address | pi-schema
src/formats/typebox/idn_hostname.ts | `IsIdnHostname` | Validates internationalized hostname (alias) | pi-schema
src/formats/typebox/ipv4.ts | `IsIPv4` | Validates IPv4 address format | pi-schema
src/formats/typebox/ipv6.ts | `IsIPv6` | Validates IPv6 address format | pi-schema
src/formats/typebox/iri_reference.ts | `IsIriReference` | Validates IRI-reference string format | pi-schema
src/formats/typebox/iri.ts | `IsIri` | Validates IRI string format | pi-schema
src/formats/typebox/json_pointer.ts | `IsJsonPointer` | Validates JSON Pointer string | pi-schema
src/formats/typebox/json_pointer_uri_fragment.ts | `IsJsonPointerUriFragment` | Validates JSON Pointer URI fragment | pi-schema
src/formats/typebox/regex.ts | `IsRegex` | Validates ECMA regex literal string | pi-schema
src/formats/typebox/relative_json_pointer.ts | `IsRelativeJsonPointer` | Validates relative JSON pointer | pi-schema
src/formats/typebox/time.ts | `IsTime` | Validates time string (strict tz option) | pi-schema
src/formats/typebox/uri_reference.ts | `IsUriReference` | Validates URI-reference string | pi-schema
src/formats/typebox/uri_template.ts | `IsUriTemplate` | Validates URI template string | pi-schema
src/formats/typebox/uri.ts | `IsUri` | Validates URI string format | pi-schema
src/formats/typebox/url.ts | `IsUrl` | Validates URL string format | pi-schema
src/formats/typebox/uuid.ts | `IsUuid` | Validates UUID string format | pi-schema
src/index.ts | re-exports builders, checks, coerce, compiler, explain, formats, resolver, shared, typebox-static, types, validator; `equal` (from checks) | Public API surface of the package | pi-schema (lib root)
src/resolver.ts | `Resolved`, `DEFAULT_BASE`, `Resolver`, `isSchemaObject`, `resolveUri`, `documentOf` | Resolves JSON Schema $ref/URIs | pi-schema
src/shared.ts | `sharedRegex`, `sharedRegexCount` | Memoized shared RegExp cache | pi-schema
src/typebox-static.ts | `TypeBoxStatic` | Maps TypeBox types to static TS types | pi-schema (interop, deferred)
src/types.ts | `JsonSchema`, `FormatCheck`, `CompileOptions`, `ParseResult`, `ValidationError`, `SchemaObject`, `Check` | Core type contracts (schema, check, results) | pi-schema
src/validator.ts | `compile`, `Validator`, `CoercingValidator` | Compiles schema to validating Validator | pi-schema
test/bench/all.ts | — | Bench runner: all candidates, aggregates | pi-schema (tests, deferred)
test/bench/candidates.ts | `PrepareOptions`, `Prepared`, `Candidate`, `noEval`, `candidates`, `byName` | Bench: candidate validator libraries | pi-schema (tests, deferred)
test/bench/cases.ts | `Case`, `cases` | Bench: validation test cases | pi-schema (tests, deferred)
test/bench/conformance.ts | `ConformanceResults` | Bench: JSON Schema suite conformance | pi-schema (tests, deferred)
test/bench/corpus.ts | `CorpusItem`, `corpus` | Bench: generated instance corpus | pi-schema (tests, deferred)
test/bench/memory.ts | `MemoryResults` | Bench: memory footprint measurement | pi-schema (tests, deferred)
test/bench/setup.ts | `SetupResults` | Bench: compile/check time measurement | pi-schema (tests, deferred)
test/bench/size.ts | `SizeResults` | Bench: bundle size (minify/gzip) | pi-schema (tests, deferred)
test/bench/speed.ts | `SpeedResults` | Bench: validation speed measurement | pi-schema (tests, deferred)
test/bench/zod.ts | `nativeCases`, `nativeZod`, `zodFromJsonSchema` | Bench: Zod comparison harness | pi-schema (tests, deferred)
test/builders.test.ts | — | Tests typed schema builders | pi-schema (tests)
test/coerce.test.ts | — | Tests value coercion to schema | pi-schema (tests)
test/coerce-typebox.test.ts | — | Tests coercion vs TypeBox behavior | pi-schema (tests)
test/conformance.test.ts | — | Tests JSON Schema suite conformance | pi-schema (tests)
test/equal.test.ts | — | Tests deepEqual equality checks | pi-schema (tests)
test/shared.test.ts | — | Tests shared regex cache | pi-schema (tests)
test/suite.ts | `SuiteFile`, `SuiteGroup`, `suiteFiles`, `suiteSchemas` | Loads JSON-Schema-Test-Suite files | pi-schema (tests)
test/typebox-static.test.ts | — | Tests TypeBox static type mapping | pi-schema (tests)
test/validator.test.ts | — | Tests compiled Validator validate/coerce | pi-schema (tests)
vitest.config.ts | default (vitest config) | Test runner config, not ported | none
