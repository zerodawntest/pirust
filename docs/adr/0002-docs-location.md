# ADR-0002: Docs location

Status: accepted (Patrick, #25, 2026-11-16)

- Human docs (overview, contributing, how it works, workbooks): GitHub Wiki (separate git repo, no PR conflicts, not loaded by agents).
- ADR/RFC: `docs/adr/NNNN-*.md`, one file each, append-only.
- Changelog: generated nightly from conventional commits (git-cliff); never edited in PRs.
- Code docs: rustdoc for public API only.
- Writer: docs agent after nightly integration, from the merged diff.
