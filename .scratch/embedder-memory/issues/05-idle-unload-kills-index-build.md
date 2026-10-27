# 05: Idle unload aborts a running semantic index build

**What to build:** the 120 s idle unload must not fire while `build_semantic_index` is running.

**Blocked by:** None

**Status:** ready-for-agent

- `2026-10-27_10-51-04.log` L309-312: index batch 32/846 starts, the embedder is unloaded 3 s later (L310), then `Semantic index build failed: Embedder not initialized`. No batch after 32 ran.
- The bulk path locks `EMBEDDER` per batch (`commands/semantic.rs:613-617`) and does not bump `UNLOAD_GENERATION`, so an unload scheduled by an earlier save fires between batches.
- Fix direction: the build holds off unloads (bump generation per batch, or check `BUILD_LOCK` in the unload task).

- [ ] Test: unload scheduled before a build does not unload mid-build
- [ ] Build completes across a > 120 s run
