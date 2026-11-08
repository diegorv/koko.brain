# 24: Semantic and hybrid search log the time of each stage

**Status:** resolved

Priority: P2 (a semantic search takes about 11 s and a hybrid search 10 to 29 s on a 10.6k-note vault, and the log cannot say which stage costs it)

**What to build:** `search_semantic` and `search_hybrid` (`src-tauri/src/commands/semantic.rs:788`, `:950`) log only the cache hit or miss, the gap-filter cut and the final scores. Between "cache hit" and the result there is no line, so the time cannot be split between the query embedding, the cosine scan over every chunk, the FTS and RRF steps of hybrid, the reranker load and the reranker inference. Add one `[SEMANTIC] timing` line per search, written with `debug_log` after `finalize_results` (`semantic.rs:901`, `:1124`), carrying the milliseconds of each stage:

- `cache`: `hit` or `miss`, with the load time on a miss (`semantic.rs:157-161`)
- `embedder`: `ensure_embedder_loaded` plus `embed` (`semantic.rs:807-816`, `:971-978`), and whether the embedder was lazy-reloaded
- `cosine`: the scan that scores every chunk, with the chunk count
- hybrid only: `fts` (the FTS top-30 step), `rrf` (`rrf_fuse`, `semantic.rs:1013`) and `pool` (`build_pool`, `:1028`)
- `rerank`: `ensure_reranker_loaded` (`:859`, `:1086`) and `Reranker::rerank` (`:873`, `:1103`) separately, with the candidate count and the number of inference batches; `rerank=skipped` when the reranker is absent
- `finalize`: the gap filter and truncation
- `total`, and `other` = `total` minus the stages above, so an unlogged gap shows up as a number

Keep the line on one row so `grep "timing"` gives a table. Build it from a small pure struct with a `summary()` method so the format is unit-testable without the models.

Do not change behavior: no change to `RERANK_CANDIDATE_POOL` (`docs/SEARCH.md:48`), the reranker batch size (`src-tauri/src/semantic/reranker.rs:23`), its intra-op threads (`:56`) or its truncation (`:74`), and no change to results, order or the gap filter. Those are levers to decide after the numbers exist.

Evidence from the owner session `2026-11-03_11-40-57.log` (release build, 156,885 chunks, cache 437.7 MB):

| Search | Time | What the log shows |
|---|---|---|
| text "OKR" | 0.86 s | `[FTS] Results: 50 matches in 860ms` |
| semantic "OKR" | 11.4 s | cache miss 2.9 s, reranker lazy-load 0.5 s, then 7.9 s with no log line |
| hybrid "OKR" | 20.2 s | cache hit at +0.5 s, then 19.8 s with no log line; `fused=52 pool=50` |
| hybrid "Product" | 9.7 s | cache hit, `fused=57 pool=50` |
| hybrid "Claude workspace" | 28.9 s | cache hit |
| hybrid "OKR" again | 20.5 s | cache miss 2.5 s, then about 18 s |

No `[HB]` or `[MAIN-HB]` stall fell inside these windows (both commands are `async fn` over `spawn_blocking`), so the cost is wait time, not a frozen UI. The process RSS went from 1.4 GB to 3.9 GB during the first semantic search and stayed at 3.4 GB at the end of the log. The same query repeated gave the same time, so the cost is deterministic. The reranker is the likely stage by elimination (the documented embedder cost is 50 to 100 ms per query, `docs/SEARCH.md:111`), but the log cannot prove it, which is the point of this Issue.

**Blocked by:** none

**Gate:** `cargo test --manifest-path src-tauri/Cargo.toml` (Rust only, no IPC DTO change)

**Source:** src-tauri/src/commands/semantic.rs:157-161,788-905,950-1130, src-tauri/src/semantic/reranker.rs:23,56,74,93, docs/SEARCH.md:48,111,197

- [x] Failing first: a unit test of the timing summary builds one line for a semantic search and one for a hybrid search from fixed stage durations, and `other` equals `total` minus the stages
- [x] `search_semantic` writes one `[SEMANTIC] timing` line with cache, embedder, cosine, rerank (ensure and inference separately, candidates, batches), finalize, total and other
- [x] `search_hybrid` writes the same line plus fts, rrf and pool
- [x] With the reranker absent the line says `rerank=skipped` and the search result is unchanged
- [x] Results, ordering and the gap-filter cut are identical to before; the existing search and semantic tests stay green
- [x] The `[TAURI:RUST:SEMANTIC]` row of the log table in `docs/SEARCH.md` (`:197`) names the timing line
- [ ] Not verified by the agent: on device, a hybrid search of "OKR" logs the line and its stages account for the 19.8 s; record the numbers in Notes

## Notes

- Filed as Issue 25: `search_fts` is a sync `pub fn` (`src-tauri/src/commands/search_index.rs:149`), unlike the two async commands above. In the same session the only `[MAIN-HB]` stall (791 ms at 15:33:24 UTC) ended 3 ms after the text search "OKR" returned its 860 ms result, so the app main thread was probably blocked for the FTS query. That a sync Tauri command runs on the main thread is from the Tauri docs as remembered, not re-checked here; Issues 06, 11 and 23 measured it for other commands with `[MAIN-HB]`. See Issue 25.
- Filed as Issue 26: the search cache was invalidated 17 times in the session and reloaded twice (2.5 s and 2.9 s). An earlier version of this note said the second reload "may have been avoidable"; that was wrong. The "all 11 chunks unchanged" skip belonged to a second, duplicate watcher event 600 ms after the first, and did not invalidate; the invalidations before the reload came from real changes. See Issue 26.
- The log shows the first semantic search paying a 0.5 s reranker lazy-load and the embedder lazy-reloading in 0.7 s after an idle unload (Issue 07 working), so the first search after idle costs more than the warm numbers above.
- Search latency is reported, not gated (recall gates the search work). This Issue adds measurement only.

## Comments

- 2026-11-03, branch `issue/24-semantic-hybrid-stage-timing-logs`: `search_semantic` and `search_hybrid` log one `[SEMANTIC] timing` line per search (cache, embedder, cosine, rerank ensure/inference/candidates/batches, finalize, total, other; hybrid adds fts, rrf, pool), built by a tested summary module (`src-tauri/tests/semantic_search_timing_test.rs`); `docs/SEARCH.md` log table names the line. Review round 1 APPROVED with minor findings, fixed in a fix round (escaped `\|` in the SEARCH.md row; documented that `total` excludes the blocking-pool wait and IPC hop); round 2 APPROVED with no findings. Tests at 172ee03f: vitest 457 files / 10573 passed, build OK, cargo test all ok, pnpm check 0 errors. On-device "OKR" numbers still need the owner.
