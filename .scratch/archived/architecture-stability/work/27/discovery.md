# Issue 27 discovery

No `spec.md` exists next to `issues/`; the Issue file is the spec.

## Files that change

- `src-tauri/src/commands/semantic.rs`
  - `:418` `download_reranker_model`, `:443` `download_semantic_model`, `:472` `build_semantic_index`
    take `AppHandle` and call `app.emit("semantic-index-progress", ...)` at `:426`, `:451`, `:588`, `:733`.
  - `:155` `deserialize_embedding` (moves out).
- `src-tauri/src/semantic/embedder.rs`: new home of `deserialize_embedding` (next to `cosine_similarity`, the other embedding-vector helper).
- `src-tauri/src/db/semantic_repo.rs:709,715`: test code switches to `crate::semantic::embedder::deserialize_embedding`.
- `src-tauri/tests/semantic_commands_test.rs:8`: import of `deserialize_embedding` moves to `semantic::embedder`.
- `docs/SEARCH.md`: only if it names the moved function or the command signatures.

## Plan

1. Move `deserialize_embedding` into `semantic/embedder.rs`; update the two test call sites. No re-export from `commands::semantic`.
2. Add `pub async fn download_reranker_model_inner`, `download_semantic_model_inner`, `build_semantic_index_inner`
   taking `on_progress: impl Fn(SemanticProgress) + Send + Sync`. Bodies move verbatim; `app.emit(...)` becomes `on_progress(...)`.
   The `#[tauri::command]` wrappers keep their names and signatures and pass `|p| { let _ = app.emit(SEMANTIC_INDEX_PROGRESS, p); }`.
3. Event name: the issue-11 const has not landed (`grep` finds no const), so a private `const SEMANTIC_INDEX_PROGRESS: &str = "semantic-index-progress"` in `commands/semantic.rs` replaces the three literals.
4. Tests in `src-tauri/tests/semantic_commands_test.rs`:
   - empty temp vault, no model: `build_semantic_index_inner` returns `Ok` equal to `get_semantic_stats()`, records no events.
   - temp vault with a note, no model: returns `Err("Embedder not initialized")` (today's command result) and records exactly one `chunking` event, no `embedding`.
   - download inner fns on a vault whose model files exist return `Ok(true)` and record no events (short-circuit; no network).
   - `SemanticProgress` serializes with keys `phase,current,total,message` and kebab-case phase.

## Prior art

- `semantic_commands_test.rs` `setup()` + `TEST_LOCK` for the process-global DB.
- `is_model_available` fixtures: write the expected files under `.kokobrain/models/<dir>/` (see `ModelManager` file list).

## Risks / defaults

- No real model fixture exists in the repo (semantic-test policy keeps ORT inference out), so the "chunking before embedding" ordering is checked only up to the first embed failure: `chunking` arrives, `embedding` never does.
- The `on_progress` bound is `Fn + Send + Sync`; `ModelManager::download_model` takes `impl Fn(f64)`, so the closure is passed by reference.
- Test count: baseline taken with `cargo test -- --list` before the change; after = baseline + new tests.
