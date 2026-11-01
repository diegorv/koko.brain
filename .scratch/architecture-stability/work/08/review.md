VERDICT: APPROVED

# Review: Issue 08, ts-rs generated IPC types
Reviewed `git diff main...HEAD` (ed86f50d..4d4101a6, 6 commits) in the worktree at HEAD 4d4101a6.

## Acceptance criteria

- [met] A failing Rust test comes first: `serde_json::to_value(SemanticPhase::DownloadingReranker) == "downloading-reranker"`, plus the same pinning for every DiffLineType and ScanSource variant against today's literals (semantic.rs:425,450,587,732; history.rs:84,94,103; vault.rs:1188,1300,1302) — `src-tauri/tests/ipc_contracts_test.rs:16-36` pins all 4 SemanticPhase, 3 DiffLineType and 3 ScanSource variants to the old literals, and these are exactly the literals the diff removes at the call sites listed. The test and the enums arrive in the same commit (7396ba0f), so the red step is not visible in history; the build report says it failed to compile before the enums existed (see finding 1). All 8 tests pass in my run.
- [met] Rust test: a FileNode with `children: None` serializes with no `children` key, and the generated `FileNode.ts` declares `children?:`, not `| null` — `ipc_contracts_test.rs:885-905` (`file_node_without_children_has_no_children_key`, `generated_file_node_declares_optional_fields_without_null`) pass. The committed `src/lib/contracts/generated/FileNode.ts` reads `children?: Array<FileNode>, modifiedAt?: number, createdAt?: number` with no `| null`. The test checks `export_to_string` output, and the CI freshness step holds the committed file equal to that output.
- [met] `cargo test` writes one .ts per type to src/lib/contracts/generated/ (plus `serde_json/JsonValue.ts` for `serde_json::Value`), and u64/i64 come out as `number` — I deleted `src/lib/contracts/generated`, ran `cargo test --manifest-path src-tauri/Cargo.toml` from the worktree root (exit=0, 1190 passed, 0 failed, log /tmp/issue08-review/cargo-test.log), and the dir came back with 33 files (29 DTOs + 3 enums + `serde_json/JsonValue.ts`) and `git status --porcelain` was empty. `UpdateResult.version` (u64), `SnapshotInfo.id` (i64), and `FileNode.modifiedAt` (u64) are `number`. `generated_large_ints_are_numbers` passes. `UpdateMetadata.rid` is `number` via `#[ts(type = "number")]`. Every other `Serialize` type under src-tauri/src (`search/eval_metrics.rs:119`, `vault/index_cache.rs:21`) is not an IPC DTO.
- [met] The generated `TaskMetadata.ts` has `dueDate?: string` with no `| null` — the committed file has `dueDate?: string,` and all 11 optional fields carry no `| null`. `generated_task_metadata_declares_due_date_without_null` passes.
- [met] The CI rust job deletes the generated dir, runs `cargo test`, and fails when `git status --porcelain -- src/lib/contracts/generated` is non-empty. Prove it on a throwaway branch that renames a field without regenerating — `.github/workflows/ci.yml:109-124` runs `rm -rf src/lib/contracts/generated` then `cargo test`, and a following step exits 1 when `git status --porcelain -- src/lib/contracts/generated` is non-empty. The rust filter adds `src/lib/contracts/generated/**` and `.cargo/**` (ci.yml:50-51). I reproduced the CI sequence and confirmed that `cargo test` regenerates the whole dir from nothing; a renamed field changes the `export_to_string` text that gets written, so the porcelain check catches it. The throwaway-branch rename proof is the builder's local run, and the step has not yet run on GitHub Actions (finding 2).
- [met] `pnpm check` passes with the generated files in place (nothing imports them yet) — `pnpm check`: 0 errors, 0 warnings. `tsconfig.json:23` includes `src`, so the generated dir gets type-checked. No file under `src/` imports from `contracts/generated`.

## Checks I ran

- `cargo test --manifest-path src-tauri/Cargo.toml` from the worktree root, after deleting the generated dir (CI sequence): exit=0, 1190 passed, 0 failed; generated dir clean afterwards.
- `pnpm check`: exit 0, 0 errors.
- `pnpm vitest run src/tests/lib/architecture src/tests/lib/features/search/search.service.test.ts src/tests/lib/features/backlinks/backlinks.service.test.ts src/tests/lib/features/search/search.store.test.ts`: 7 files, 156 tests passed. These are the architecture tests plus the frontend tests that assert the `scan_source` / `phase` literals.
- The Rust verdict rests on `tests/ipc_contracts_test.rs`, `tests/history_test.rs` and `tests/commands/vault_test.rs`, plus the lib unit tests (the ts-rs `export_bindings_*` tests). All of them ran in the full cargo run above.
- I did not check `pnpm vitest run` (full) or `pnpm build`; deliver runs them.
- `layer-baseline.json`, `BASELINE_SIZE` and the composition roots are untouched. `src/lib/contracts` is already in `OPEN_LAYERS` (`scripts/import-graph.mjs:150`).
- Verified in the ts-rs 12.0.1 source (`ts-rs-12.0.1/src/lib.rs:618-641`, `ts-rs-macros-12.0.1/src/lib.rs:207`) that the export tests read `TS_RS_*` at runtime through `Config::from_env()`. The DEV-ENVIRONMENT claim that sccache or a shared target dir cannot serve stale bindings holds; my run used main's target dir and still wrote into the worktree.
- Other Issue items: the stale comment at `entry.rs:73` now names `project_note_record`, which exists at `commands/vault.rs:733`. The phase doc at `semantic/types.rs` now defers to the four-variant `SemanticPhase`. CLAUDE.md rule 5 exempts the generated dir and rule 6 adds DTO change = Both. `history_test.rs` and `vault_test.rs` assertions compare against the enum without being weakened, and the wire-shape test at `vault_test.rs:744` still pins `"cache_reconciled"` on the JSON. Cargo.lock adds only ts-rs, ts-rs-macros and termcolor.

## Findings

1. nit — src-tauri/tests/ipc_contracts_test.rs:16 — Test-first is not visible in history: the serde pins and the enums land in one commit (7396ba0f). No code change is needed; just note in the squash message that the pins were red before the enums were added.
2. minor — .github/workflows/ci.yml:109-124 — The freshness step has never run on GitHub Actions. Local reproduction and my rm-rf-then-regenerate run show the mechanism works, but its first real run will be post-merge. Fix: after delivery, confirm the first `Rust (cargo test)` run on main reaches "Check TS bindings are committed" green.
3. nit — CLAUDE.md:70 — Rule 6 says any change to a `#[ts(export)]` type is "Both", but it does not say that editing a doc comment on a DTO also changes the generated file (doc comments are emitted as JSDoc) and so fails CI unless regenerated. Fix: add "including its doc comments" to that line.

## Resolution

1. Accepted, no code change: the squash commit message states that the serde pins in `src-tauri/tests/ipc_contracts_test.rs` failed to compile before the `SemanticPhase` / `DiffLineType` / `ScanSource` enums were added.
2. Accepted, post-merge action: the freshness step can only run on GitHub Actions after delivery. The report asks the owner to confirm the first `Rust (cargo test)` run on main passes "Check TS bindings are committed".
3. Fixed: CLAUDE.md rule 6 now says a `#[ts(export)]` type change includes its doc comments, which ts-rs emits as JSDoc.
