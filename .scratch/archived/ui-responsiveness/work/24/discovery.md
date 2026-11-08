# Issue 24 discovery: semantic / hybrid stage timing line

## Files that change

- `src-tauri/src/semantic/search_timing.rs` (new): pure `SearchTiming` struct + `summary()`; `rerank_batches(n, batch)` helper. Registered in `src-tauri/src/semantic/mod.rs:1-10`.
- `src-tauri/src/commands/semantic.rs`
  - `get_or_load_cache` (`:154`) returns `(Arc<..>, hit: bool)`; caller times the call.
  - `ensure_embedder_loaded` (`:245`) returns `Result<bool>` (true = it lazy-reloaded). The other callers (`:384`, `:1305`) keep `?;` and ignore the bool.
  - `search_semantic` (`:798-903`): `Instant` per stage (embedder `:806-817`, cache `:824`, cosine `:830-836`, rerank ensure `:859`, rerank inference `:860-882`, finalize `:901-903`), log line right after `finalize_results`.
  - `search_hybrid` (`:959-1126`): same plus fts (`:965`), rrf (`:1013`), pool (`:1023-1081`, `build_pool` and candidate materialization). Finalize includes the pre-truncation sort (`:1113`).
- `src-tauri/tests/semantic_search_timing_test.rs` (new): unit tests of `summary()`.
- `docs/SEARCH.md:197`: name the `timing` line in the `[TAURI:RUST:SEMANTIC]` row.

## Plan

Stage durations are `Duration`; `other = total - sum(stages)` (saturating), so the test with fixed durations is exact. Line format, one row, `key=value` tokens:

`timing mode=semantic total_ms=.. cache=miss cache_ms=.. embedder_ms=.. embedder_reloaded=true cosine_ms=.. chunks=.. [fts_ms rrf_ms pool_ms] rerank_ensure_ms=.. rerank_ms=.. rerank_candidates=.. rerank_batches=.. finalize_ms=.. other_ms=..`

`rerank=skipped` replaces the four rerank fields when the reranker is absent or the pool is empty.

Batches = `candidates.div_ceil(Reranker::DEFAULT_BATCH_SIZE)`: `Reranker::load` always sets that batch size (`reranker.rs:83`), so no change to `reranker.rs`.

## Prior art

`semantic/cache_stats.rs` (pure struct + `describe()`, unit-tested string). Test file shape from `src-tauri/tests/semantic_reranker_test.rs`.

## Risks / defaults taken

- Behavior: only timers and one log line are added; no reorder of calls, so results, order and gap filter are unchanged. Errors (`?`) skip the line.
- `cache_ms` is printed on a hit too (lock wait would otherwise hide in `other`).
- When the reranker is skipped, the `ensure_reranker_loaded` disk check (when it ran) lands in `other`.
- Hybrid path dedupe (`:995-1008`) and the semantic no-rerank result materialization land in `other`; they are small and `other` exposes them.
- On-device verification (19.8 s hybrid "OKR") is left to the owner.
