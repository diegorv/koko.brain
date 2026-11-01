# 08: Generate TS bindings for every IPC DTO with ts-rs, with a CI freshness check

**What to build:** Add ts-rs 12.0.1 (feature `serde-json-impl`) to `src-tauri/Cargo.toml`. Derive `TS` with `#[ts(export)]` on the 29 IPC types: NoteEntry, WikiLink, OutgoingLink, OutgoingUnlinkedMention, RelationshipBacklink, NoteRecord, UpdateResult, Task, TaskStatus, TaskPriority, RecurrenceRule, TaskMetadata, TagAggregate, FileTaskGroup, ToggleTaskResult, VaultFilesChangedPayload, FileNode, CachedScanResult, FileReadResult, IndexStats, FtsSearchResult, SemanticResult, SemanticStats, SemanticFileStatus, SemanticProgress, SnapshotInfo, DiffLine, UpdateMetadata, DebugLogPayload.

Configuration, in the root `.cargo/config.toml` `[env]`:
- `TS_RS_EXPORT_DIR = { value = "src/lib/contracts/generated", relative = true }`
- `TS_RS_LARGE_INT = "number"`
- `TS_RS_IMPORT_EXTENSION = "js"`

Replace String fields with serde enums that serialize to the same bytes:
- `SemanticProgress.phase` -> `SemanticPhase` (kebab-case)
- `DiffLine.line_type` -> `DiffLineType` (lowercase)
- `CachedScanResult.source` -> `ScanSource` (snake_case)

Field attributes:
- `#[ts(optional)]` where `skip_serializing_if` has no `default`: FileNode x3, DiffLine x2.
- `#[ts(optional)]` on the 11 `TaskMetadata` fields too (`task.rs:86-116`): with `skip_serializing_if` + `default`, ts-rs 12 emits `field?: T | null` (`ts-rs-macros/src/optional.rs:108`), while the current mirror has `dueDate?: string`.
- `#[ts(type = "number")]` on `UpdateMetadata.rid`.

Then:
- Commit the generated files.
- Add the CI freshness step to the rust job, and add the generated dir and `.cargo/**` to its paths filter (`.cargo/config.toml` is in no filter today, ci.yml:36-50).
- Rewrite the ~12 Rust test assertions that compare the new enum fields to string literals (`tests/history_test.rs:145-194`, `tests/commands/vault_test.rs:807-880`) to compare against the enum, without weakening them.
- Fix the stale phase list at `semantic/types.rs:53` (it misses `downloading-reranker`).
- Update CLAUDE.md rule 6: a DTO change is now "Both".
- Fix the stale Rust comment at `entry.rs:73`.

**Blocked by:** none


**Status:** resolved

**Gate:** `cargo test --manifest-path src-tauri/Cargo.toml` + `pnpm check` + `pnpm vitest run` + `pnpm build`

**Source:** src-tauri/src/{vault,semantic,commands,db,utils}/*, src-tauri/src/lib.rs:283, .cargo/config.toml, .github/workflows/ci.yml:31-50,104, ADR-0025, ADR-0018. ts-rs docs: https://github.com/Aleph-Alpha/ts-rs and https://docs.rs/ts-rs/12.0.1/ts_rs/trait.TS.html

- [x] A failing Rust test comes first: `serde_json::to_value(SemanticPhase::DownloadingReranker) == "downloading-reranker"`, plus the same pinning for every DiffLineType and ScanSource variant against today's literals (semantic.rs:425,450,587,732; history.rs:84,94,103; vault.rs:1188,1300,1302)
- [x] Rust test: a FileNode with `children: None` serializes with no `children` key, and the generated `FileNode.ts` declares `children?:`, not `| null`
- [x] `cargo test` writes one .ts per type to src/lib/contracts/generated/ (plus `serde_json/JsonValue.ts` for `serde_json::Value`), and u64/i64 come out as `number`
- [x] The generated `TaskMetadata.ts` has `dueDate?: string` with no `| null`
- [x] The CI rust job deletes the generated dir, runs `cargo test`, and fails when `git status --porcelain -- src/lib/contracts/generated` is non-empty. Prove it on a throwaway branch that renames a field without regenerating
- [x] `pnpm check` passes with the generated files in place (nothing imports them yet)

## Notes

- **Why ts-rs, not tauri-specta:** tauri-specta is 2.0.0-rc.26 and pins tauri ^2, while the `update-tauri-to-v3` branch is live. ts-rs does not depend on the Tauri version.
- **Generated files:** they are not tab-indented. Document the exemption from CLAUDE.md rule 5.
- **Worktrees:** cargo finds config from the current directory, not from `--manifest-path`. Run from a worktree root, the worktree's own `.cargo/config.toml` wins and `relative = true` resolves inside that worktree, which is correct. This holds for `.claude/worktrees/X` and for relay-lite's sibling worktrees (`<repo>.worktrees/issue-NN-slug`). Run from the main root with `--manifest-path <worktree>/...`, the bindings get written into main's `src/`. Document this in DEV-ENVIRONMENT.md. The env vars are read at test runtime (`Config::from_env`), so sccache cannot serve stale output.
- **Size:** M.

## Comments

- 2026-11-01, branch `issue/08-ts-rs-generated-ipc-types`: ts-rs 12.0.1 derives `TS` on the 29 IPC DTOs plus three serde enums (`SemanticPhase`, `DiffLineType`, `ScanSource`) that replace stringly fields; bindings are committed under `src/lib/contracts/generated/`; the CI rust job deletes the dir, re-runs `cargo test` and fails on a dirty `git status`; CLAUDE.md and DEV-ENVIRONMENT.md document the gate. Review round 1: APPROVED (3 findings: CLAUDE.md doc-comment note fixed; test-first note goes in the squash message; first GitHub Actions run of the freshness step to confirm after merge). Tests: `pnpm vitest run` 383 files / 9276 passed, `pnpm build` ok, `cargo test` 1190 passed / 0 failed, `pnpm check` 0 errors.
