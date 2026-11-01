# 08 discovery: ts-rs generated IPC types

No spec.md for this feature; the Issue is the spec.

## Files that change
- `src-tauri/Cargo.toml:34-35` add `ts-rs = { version = "=12.0.1", features = ["serde-json-impl"] }` (+ Cargo.lock).
- `.cargo/config.toml` add `[env]` with TS_RS_EXPORT_DIR (relative), TS_RS_LARGE_INT, TS_RS_IMPORT_EXTENSION.
- Derive `TS` + `#[ts(export)]` on the 29 types:
  - `src/vault/entry.rs:34,52,77,109,122,139`; fix stale `commands::vault::all_records` at entry.rs:73 (real fn is `project_note_record`).
  - `src/vault/index.rs:26`, `src/vault/task.rs:21,40,55,68,77(+11 `#[ts(optional)]`),122,136,168`, `src/vault/watcher.rs:44`.
  - `src/commands/vault.rs:54` (FileNode, 3x optional), `:1086` CachedScanResult.source -> `ScanSource` (snake_case), call sites `:1192,:1303-1311`.
  - `src/commands/files.rs:11`, `src/commands/search_index.rs:17`, `src/db/fts_repo.rs:8`, `src/db/history_repo.rs:6`.
  - `src/semantic/types.rs:4,26,39,52` SemanticProgress.phase -> `SemanticPhase` (kebab-case); fix phase list at :53. Call sites `src/commands/semantic.rs:427,452,589,734`.
  - `src/commands/history.rs:13` DiffLine.line_type -> `DiffLineType` (lowercase), 2x optional; call sites `:84,94,103`.
  - `src/commands/update_channel.rs:56` `#[ts(type = "number")]` on rid. `src/utils/logger.rs:16`.
- Tests: `tests/history_test.rs:145-194` (8 asserts), `tests/commands/vault_test.rs:812,831,859,905,926,942` (6 asserts) compare against the enum.
- New test file `tests/ipc_contracts_test.rs`: serde pins for every SemanticPhase / DiffLineType / ScanSource variant, FileNode `children: None` has no key, and checks the generated `FileNode.ts` / `TaskMetadata.ts` text.
- `src/lib/contracts/generated/**` committed output.
- `.github/workflows/ci.yml` rust job: delete generated dir, run `cargo test`, fail on `git status --porcelain -- src/lib/contracts/generated`; rust filter gains `src/lib/contracts/generated/**` and `.cargo/**`.
- CLAUDE.md rule 5 (generated files exempt from tabs) and rule 6 (DTO change = Both); docs/DEV-ENVIRONMENT.md worktree note.

## Plan (commits)
1. Failing Rust test for enum serde pins (red), then enums + call sites + test rewrites (green).
2. ts-rs dep + cargo env + derives + attrs + generated files + generated-file assertions.
3. CI freshness step + filters. 4. Docs (CLAUDE.md, DEV-ENVIRONMENT.md).

## Prior art
- `src/lib/contracts` is already an open layer in `scripts/import-graph.mjs` (OPEN_LAYERS), so layer-rules tests need no change.

## Risks / defaults
- Generated-file assertions use `TS::export_to_string(&Config::from_env())`, the same text `cargo test` writes, so they do not depend on test-binary order; the CI freshness step covers file == type.
- "Prove on a throwaway branch": done locally (rename a field, run the freshness commands, observe failure); no branch is pushed by this step.
- Pin ts-rs with `=12.0.1` to keep the exact version the Issue names.
