# 04: init_semantic_search can load a second embedder copy

**What to build:** `init_semantic_search` must not load the model when one is already loaded or loading.

**Blocked by:** None

**Status:** ready-for-agent

- `commands/semantic.rs:352-375`: `Embedder::load` (`:367`) runs before `EMBEDDER.lock()` (`:368`) and does not check for an existing instance; concurrent `ensure_embedder_loaded` can load another copy, and the later assignment drops the earlier one.
- Seen in logs: `2026-09-29_11-31-25.log` L129-155 and `2026-10-26_13-46-12.log` L127-137 show two "Using 8 intra-op threads" loads with no unload between (RSS 297 -> 989 MB, 315 -> 582 MB).

- [ ] Test: init while loaded does not reload
- [ ] Load happens under the lock, skipped when `Some`
