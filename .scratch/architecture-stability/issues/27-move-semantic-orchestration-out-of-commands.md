# 27: Make semantic build and model downloads testable without an AppHandle

**What to build:** A small seam, not the full move:
- `download_semantic_model`, `download_reranker_model` and `build_semantic_index` get inner functions that take `on_progress: impl Fn(SemanticProgress) + Send + Sync` instead of `AppHandle`. The `#[tauri::command]` wrappers pass a closure that emits `semantic-index-progress`, using the issue-11 const if it has landed.
- Fix the reverse reference at `db/semantic_repo.rs:707,713`: test code there calls `crate::commands::semantic::deserialize_embedding`. Move `deserialize_embedding` into `semantic/`.
- Moving the remaining ~1,400 lines (statics, caches, load/unload scheduling) into `semantic/service.rs` waits for issue 29.

**Blocked by:** none

**Status:** needs-triage

**Gate:** `cargo test --manifest-path src-tauri/Cargo.toml`

**Source:** src-tauri/src/commands/semantic.rs (emits at :422, :447, :584, :729), src-tauri/src/semantic/, src-tauri/src/db/semantic_repo.rs, tests/semantic_*_test.rs, docs/SEARCH.md

- [ ] New test: on a temp vault with no model, the inner `build_semantic_index` called with a recording callback returns the same result the command returns today. Where a model fixture exists, `chunking` arrives before `embedding`.
- [ ] The `semantic-index-progress` payload JSON keys are unchanged (`phase,current,total,message`)
- [ ] `cargo test -- --list 2>/dev/null | grep -c ': test$'` matches the count before the change, plus the new tests

## Notes

- **Why small:** none of the 18 `fix` commits touching `src-tauri/src` since July came from Tauri coupling. They were about semantic statics, locks and search logic. The value here is being able to test the build and downloads without an `AppHandle`.
- **Size:** S.
