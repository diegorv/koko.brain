# 27: Make semantic build and model downloads testable without an AppHandle

**What to build:** A small seam, not the full move:
- `download_semantic_model`, `download_reranker_model` and `build_semantic_index` get inner functions that take `on_progress: impl Fn(SemanticProgress) + Send + Sync` instead of `AppHandle`. The `#[tauri::command]` wrappers pass a closure that emits `semantic-index-progress`, using the issue-11 const if it has landed.
- Fix the reverse reference at `db/semantic_repo.rs:707,713`: test code there calls `crate::commands::semantic::deserialize_embedding`. Move `deserialize_embedding` into `semantic/`.
- Moving the remaining ~1,400 lines (statics, caches, load/unload scheduling) into `semantic/service.rs` waits for issue 29.

**Blocked by:** none

**Status:** resolved

**Gate:** `cargo test --manifest-path src-tauri/Cargo.toml`

**Source:** src-tauri/src/commands/semantic.rs (emits at :422, :447, :584, :729), src-tauri/src/semantic/, src-tauri/src/db/semantic_repo.rs, tests/semantic_*_test.rs, docs/SEARCH.md

- [x] New test: on a temp vault with no model, the inner `build_semantic_index` called with a recording callback returns the same result the command returns today. Where a model fixture exists, `chunking` arrives before `embedding`.
- [x] The `semantic-index-progress` payload JSON keys are unchanged (`phase,current,total,message`)
- [x] `cargo test -- --list 2>/dev/null | grep -c ': test$'` matches the count before the change, plus the new tests

## Notes

- **Why small:** none of the 18 `fix` commits touching `src-tauri/src` since July came from Tauri coupling. They were about semantic statics, locks and search logic. The value here is being able to test the build and downloads without an `AppHandle`.
- **Size:** S.

## Comments

- 2026-11-01, branch `issue/27-move-semantic-orchestration-out-of-commands`: `build_semantic_index`, `download_semantic_model` and `download_reranker_model` now have `*_inner` functions that take a progress callback; the Tauri commands wrap them and emit `semantic-index-progress`. `deserialize_embedding` moved to `semantic::embedder`. Five seam tests added in `src-tauri/tests/semantic_commands_test.rs`; deliver tightened the empty-vault test with absolute asserts. Tests: vitest 398 files / 9542 passed, `pnpm build` ok, cargo test 1200 passed / 0 failed. Review round 1: APPROVED (1 minor rejected, needs network; 1 nit fixed).
