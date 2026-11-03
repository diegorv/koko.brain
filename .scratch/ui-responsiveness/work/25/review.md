VERDICT: APPROVED

## Acceptance criteria

- [met] Failing first: a Rust test awaits `search_fts(...)` (it does not compile while the command is sync) and returns the same hits as `search_fts_inner` for the same query on a seeded FTS database; an empty query returns an empty list — `src-tauri/tests/search_fts_test.rs:181-199` (`search_fts_command_returns_the_same_hits_as_search_fts_inner`) awaits `search_index::search_fts(...)` on the seeded vault and asserts its `(path, score)` list in rank order equals `search_fts_inner`'s, for "programming" (non-fuzzy) and "javscript" (fuzzy), with a padded query so the trim path is covered too; `:201-213` (`search_fts_command_returns_empty_for_empty_query`) awaits it for `""` and `"   "` and asserts an empty list. Against main's sync `pub fn search_fts` returning `Result`, `.await` on a non-Future is E0277, so both tests cannot compile before the change (consistent with the build report's red step; I did not re-run main). Both pass on the branch.
- [met] `search_fts` is an `async fn` that runs `search_fts_inner` in `tokio::task::spawn_blocking` and maps a join error to a `String`, like `update_search_index_file` — `src-tauri/src/commands/search_index.rs:152-169`: `pub async fn search_fts`, body is `tokio::task::spawn_blocking(move || { trim / empty / defaults; search_fts_inner(...) }).await.map_err(|e| format!("search_fts task join error: {e}"))?`, the same shape and message format as `update_search_index_file` at `:200-210`. Arguments are all owned (`String`, `Option<usize>`, `Option<bool>`), which Tauri async commands require.
- [met] `search_fts_inner`, its hybrid caller, the `FtsSearchResult` type and the TS call and its `searchVersion` guard are unchanged; existing search tests stay green — `git diff main...HEAD --stat` touches only `src-tauri/src/commands/search_index.rs` (one hunk, the `search_fts` command only), `src-tauri/tests/search_fts_test.rs` and the discovery note; `search_fts_inner` (`:172`), `semantic.rs:1003` (hybrid caller), `FtsSearchResult`, `lib.rs:359` registration, `src/lib/contracts/` and `src/lib/features/search/search.service.ts` are untouched. Tests green: `search_fts_test` 37/37, `fts_repo_test` 21/21, vitest `search.service.test.ts` + `ipc.test.ts` 60/60. The full suite is deliver's to run.
- [met] Not verified by the agent: on device, a fuzzy text search for "OKR" logs no `[MAIN-HB]` stall over 300 ms (before: 791 ms), and the search results still arrive in order while typing — on-device only, owner's to check; nothing for the agent or the review to run. Code-side precondition holds: an async Tauri command no longer runs on the main thread, and the query itself runs on the blocking pool so it does not occupy an async worker either. Ordering is still guarded by `searchVersion` in `search.service.ts` (unchanged); concurrent queries now serialize on the `FTS_DB` mutex (`db/mod.rs:156`) instead of the main thread, and a stale answer is dropped by that guard.

## Findings

1. nit — `src-tauri/src/commands/search_index.rs:149-151`: the doc comment quotes a perf figure ("a fuzzy query can take close to a second on a large vault"), a fact that goes stale if the fuzzy path is later optimized (the Issue Notes already expect a follow-up on it). Fix (optional): drop the parenthetical and keep the reason ("a sync command runs on the app main thread and freezes the UI for the whole query").

## Checks run by the reviewer

All in the worktree at `2422183d`, cargo with the shared target, `CARGO_BUILD_JOBS=2`, `nice 19`, each exit status read directly:

- `cargo test --manifest-path src-tauri/Cargo.toml --test search_fts_test`: exit 0, 37 passed, 0 failed (includes the two new `#[tokio::test]` cases).
- `cargo test --manifest-path src-tauri/Cargo.toml --test fts_repo_test`: exit 0, 21 passed.
- `cargo clippy --manifest-path src-tauri/Cargo.toml --lib --test search_fts_test -- -D warnings`: exit 0.
- `pnpm check`: exit 0, 0 errors, 0 warnings.
- `pnpm vitest run src/tests/lib/features/search/search.service.test.ts src/tests/lib/contracts/ipc.test.ts`: exit 0, 2 files, 60 tests passed.

Test verdict rests on: `src-tauri/tests/search_fts_test.rs`, `src-tauri/tests/fts_repo_test.rs`, `src/tests/lib/features/search/search.service.test.ts`, `src/tests/lib/contracts/ipc.test.ts`.

Other checks: no `#[ts(export)]` type changed and `src/lib/contracts/generated/` is untouched, so no binding regeneration is due; no layer-baseline change; added lines use tabs; the file-level `#![allow(clippy::await_holding_lock)]` matches the prior art in `semantic_commands_test.rs:1-4` with its reason; worktree clean. No scope creep: the 24 call-site rewrites in the test file are forced by the signature change and go through `search_fts_blocking`, which runs the real async command, not a stand-in.

## Resolution

1. Fixed: dropped the perf parenthetical from the `search_fts` doc comment (`src-tauri/src/commands/search_index.rs:149-151`); the comment keeps only the reason (a sync command runs on the main thread and freezes the UI for the whole query).
