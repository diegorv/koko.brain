# 07: build_semantic_index fails when it starts after an idle unload

**What to build:** a semantic index build that starts while the embedder is unloaded loads it instead of failing on batch 1, without letting a build survive `shutdown_semantic`.

**Blocked by:** None

**Status:** needs-triage

- The build never loads the embedder; batches only lock `EMBEDDER` and fail with "Embedder not initialized" on `None` (`src-tauri/src/commands/semantic.rs`, Phase 3 batch closure). The only loads are `init_semantic_search` and the lazy `ensure_embedder_loaded` in search / update paths.
- So any build started more than 120 s after the last embedder use (idle unload) fails immediately. Issue 05's fix only stops the unload from firing DURING a build.
- Naive fix (reload per batch from `VAULT_PATH`) was tried and rejected in review: `shutdown_semantic` does not clear `VAULT_PATH`, so a build would reload the model after vault close/switch and keep writing. A fix needs a shutdown generation or `VAULT_PATH` cleared on shutdown, checked before any reload.

- [ ] Load once at build start under the lock, guarded by a shutdown generation
- [ ] Test: shutdown during a build still aborts it
