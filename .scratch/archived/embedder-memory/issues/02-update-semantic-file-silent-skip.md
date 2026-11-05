# 02: Save silently dropped when the idle unload races update_semantic_file

**What to build:** `update_semantic_file` must not lose a save when the embedder is unloaded between `ensure_embedder_loaded()` and the inference lock.

**Blocked by:** None

**Status:** ready-for-agent

- `commands/semantic.rs:1229` calls `ensure_embedder_loaded()`, which releases `EMBEDDER`; `:1231` re-locks it. If the 120 s idle unload (`schedule_embedder_unload`, `:339-347`) fires in between, `guard.as_mut()` is `None`, the code logs "Skipped update ... embedder not loaded" and returns `Ok(())` (`:1232-1237`): no embedding, no mtime update, no error.
- Same window in `search_semantic` (`:758` then `:762`), which returns an error instead.
- Fix direction: load-if-missing under the same guard used for inference (one lock acquisition).

- [ ] Failing test reproducing the unload-between-load-and-lock window
- [ ] Load and inference happen under one lock in both callers
