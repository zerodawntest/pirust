# ADR-0003: Test tiers

Status: accepted (Patrick, #21, 2026-11-16)

0. pre-commit (local, devenv hooks): fmt, clippy -D warnings, gitleaks, shellcheck.
1. preflight (local, bg): nextest on affected crates, cargo deny, cargo audit -> signed attestation (git note `preflight`: tree hash + result).
2. PR -> integration (Actions, fail-fast): valid attestation for HEAD tree skips tests; always fmt/clippy (rust-cache), CodeQL, dependency-review. Required check.
3. nightly: full tests + parity tests; ff integration -> PR to main for Patrick; on failure bisect, revert offender, ticket.
Pinned toolchain, Cargo.lock, actions by SHA; Dependabot weekly grouped. Merges ff-only by script.
