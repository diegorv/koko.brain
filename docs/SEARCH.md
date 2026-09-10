# Search Architecture

End-to-end reference for how Kokobrain finds notes. Covers the three search modes (text / semantic / hybrid), the indexing pipeline, the local ONNX models, and the versioning levers that trigger automatic re-indexing.

For the user-facing description see [`help/documentation/06-search-and-navigation.md`](../help/documentation/06-search-and-navigation.md). This document is for developers working on the retrieval stack.

---

## Modes at a glance

| Mode | Frontend command | Rust command | Backed by |
|------|-----------------|--------------|-----------|
| Text | `performSearch` (mode = `text`) | `search_fts` | FTS5 + BM25 |
| Semantic | `performSearch` (mode = `semantic`) | `search_semantic` | BGE-M3 embeddings + optional cross-encoder rerank |
| Hybrid | `performSearch` (mode = `hybrid`) | `search_hybrid` | FTS top-30 + semantic top-30 → RRF → cross-encoder rerank |

The frontend wiring lives in `src/lib/features/search/search.service.ts`. The Rust commands live in `src-tauri/src/commands/search_index.rs` and `src-tauri/src/commands/semantic.rs`.

---

## Pipeline (query time)

```
query
  │
  ├──── text mode ─────────────────────────────────────────────┐
  │                                                            │
  │     FTS5 (unicode61) ── BM25 ── top-K ─────────────────────┤
  │                                                            ▼
  │                                                       results
  │
  ├──── semantic mode ─────────────────────────────────────────┐
  │                                                            │
  │     BGE-M3 embed ── cosine top-50 ── rerank* ── gap filter ▶ top-K
  │
  └──── hybrid mode ───────────────────────────────────────────┐
        FTS top-30 paths ─┐                                    │
                          ├── RRF (k = 60) ── top-50 ──────────┤
        cosine top-30 ───┘                                     │
                                                               ▼
                              term-hit chunk / path ── rerank* ── gap filter ── top-K

  * Rerank stage is skipped automatically when the BGE-reranker-v2-m3 model is not on disk.
```

Key constants (`src-tauri/src/commands/semantic.rs`):

- `RERANK_CANDIDATE_POOL = 50` — how many cosine / fused candidates are fed to the cross-encoder.
- `RERANKER_IDLE_TIMEOUT_SECS = 120` — both models unload after 2 min of idleness to release ~600 MB+ of RSS.
- `EMBEDDER_IDLE_TIMEOUT_SECS = 120` — same policy for the embedder.

RRF is in `src-tauri/src/search/rrf.rs`. `DEFAULT_RRF_K = 60`. Ties are broken alphabetically so results are deterministic across runs.

**Gap filter** (`src-tauri/src/semantic/filtering.rs`, `adaptive_filter`): after truncating to K, finds the largest gap between consecutive scores and cuts there when the gap is significant; otherwise falls back to a scale-free `mean - 1*stddev` floor. "Significant" depends on the score scale, passed as `ScoreKind`:

- `Cosine` (reranker absent): gap > `COSINE_GAP_RATIO = 0.04` × top score. Cosine has a meaningful zero, so a fraction of the top works.
- `Logit` (reranker ran): the logits are mapped through the sigmoid to probabilities first, then the same `COSINE_GAP_RATIO` rule applies. Logits are an interval scale — a top logit near zero would make any raw gap "significant" under the ratio rule, a strongly negative top would make none. An absolute threshold in logit units (1.0, an e-fold change in odds) was tried first and never fired on the flat, very negative tail a nonsense query produces, so those lists stayed near the cap (only the stddev fallback trimmed 0-3). In probability space one logit step is small among confident results and large in the tail, which is where the list should be cut short; the `mean - 1*stddev` fallback runs on the same probabilities.
- `Rrf` (hybrid without a reranker): no gap filter, truncation only. RRF scores are rank artefacts (`1/(k+rank)` summed per leg); the step between a path both legs found and a path one leg found is fixed by the formula and says nothing about the query.

Both `search_semantic` and `search_hybrid` end in `filtering::finalize_results(candidates, limit, kind)`, which truncates, filters and truncates again, and returns the outcome for the log.

---

## Indexing pipeline (index time)

1. **Chunking** (`src-tauri/src/semantic/chunker.rs`)
   - Heading-driven by default. Each section becomes one chunk.
   - Maintains a parent-heading stack while walking the document. The full ancestry (e.g. `Project X > Decisions > Auth`) is prepended to the embedded text via `Chunk::embed_text()`, but the stored `content` is the original section body — display stays correct. At query time the cross-encoder scores the same projection (`heading_prefixed_text` in `semantic/types.rs`, shared by `Chunk::embed_text()` and `CachedChunk::rerank_text()`), so the reranker knows where a section sits in its document. Changing the projection is a recipe change: bump `EMBED_RECIPE_VERSION`.
   - Sections are capped at `max_chunk_chars = 3000` (~700 tokens). Overlap is char-based, `overlap_chars = 200`, snapped forward to the next newline so the overlap starts at a clean line boundary instead of mid-sentence.
   - Notes with zero headings fall back to `window_chunks()` — `max_chunk_chars`-sized windows (3000 by default) with `WINDOW_OVERLAP_CHARS = 500` overlap. Without this, long headless notes would be truncated to the model's 512-token limit and only the first ~2 KB would be indexed.
   - `strip_code_blocks` keeps the first two lines (so language tag + function signature survive) and any inline comments — function/CLI names matter for retrieval.

2. **Embedding** (`src-tauri/src/semantic/embedder.rs`)
   - BGE-M3 INT8 ONNX, 1024-d dense vectors, dynamic padding, `max_seq_len = 512`.
   - Threads: `intra_op_threads = min(8, available_parallelism())`, raised from `min(4)` to use the M-series performance cores during indexing. `INFERENCE_BATCH_SIZE = 8`, raised from 4: the CPU SIMD path under-utilizes at batch 4, where per-batch dispatch overhead dominates. Peak RSS rises proportionally.
   - Content-hash short-circuit: chunks whose `content_hash` already matches a row in `chunks` skip embedding entirely. This makes save-time re-indexing nearly free for unchanged sections.

3. **Storage** (`src-tauri/src/db/semantic_repo.rs`)
   - SQLite, one row per chunk. Embeddings stored as raw little-endian `f32` blobs.
   - `parent_headings` stored as JSON. `heading`, `line_start`, `line_end`, `content_hash` per chunk.
   - No vector index — brute-force cosine over all chunks completes in well under 50 ms for our typical vault size (~85k chunks).
   - Query-time cache: `SEARCH_CACHE` holds every chunk with its embedding quantized to int8 at load time — a `Vec<i8>` plus one symmetric absmax `f32` scale per vector (`semantic/quantize.rs`), 1028 bytes per chunk at 1024 dims instead of 4 KB. Stored vectors are L2-normalized by the embedder, so cosine equals the dot product and the score is `dot(query_f32, values) * scale`; the query stays in f32, which keeps the chunk vector as the only source of quantization error. Per-component error is at most `scale / 2`, so the dot-product error is at most `√d · scale / 2` by Cauchy-Schwarz — ~6e-3 at d=1024, and ~1e-4 in practice on unit vectors (`quantize.rs` tests). That is not small enough to argue ordering from: adjacent-rank gaps inside a top-50 are routinely below 1e-4, so the top-k order can flip at the margins and the question is a recall question. Measure it: `KOKO_SEARCH_CACHE=f32` keeps the pre-quantization vectors resident and scores with `embedder::cosine_similarity`, so `examples/retrieval_eval.rs` can run the same fixture as an f32 baseline and `--compare` it against the int8 run (the report carries a `search_cache` field, and the per-query regression list is the gate). The DB still stores f32 blobs, so this needs no `EMBED_RECIPE_VERSION` bump and no reindex.
   - The cache is cleared on index mutation and vault shutdown but has no idle unload. The `Search cache loaded: N chunks, ~X MB (vectors …, text …, overhead …)` log line (`semantic/cache_stats.rs`) reports the resident estimate. On the owner's vault (139,360 chunks) the f32 layout measured ~813 MB — vectors 570.8 MB, text 216.2 MB, overhead 26.2 MB; int8 puts vectors at ~143 MB and makes text the dominant term.

4. **FTS5 index** (`src-tauri/src/db/schema.rs`, `src-tauri/src/search/`)
   - `tokenize = 'unicode61 remove_diacritics 2'`. Query and content are folded the same way, so `acao` ↔ `ação`.
   - `notes_fts` is an external-content table (`content='notes_content'`, `content_rowid='rowid'`), so the document text is stored once in `notes_content` rather than duplicated into the index.
   - The schema is versioned via `FTS_SCHEMA_VERSION` (`v3-external-content` at time of writing). On mismatch both tables are dropped and rebuilt at startup.
   - `notes_content.mtime` holds each row's source file mtime in seconds since the UNIX epoch - the same unit the semantic index stores. It arrived as an `ALTER TABLE ... ADD COLUMN` migration (`schema.rs`), not an `FTS_SCHEMA_VERSION` bump, so existing rows survived; they default to 0 and are re-indexed once by the first reconcile.
   - **Build = reconcile, not rebuild** (`build_search_index_inner`). One walk of the vault (`collect_markdown_paths_with_mtime`, empty exclusion list - FTS indexes `_templates` on purpose, so it must not borrow semantic's `EXCLUDED_FOLDERS`) yields `path -> mtime`; the same map is read out of `notes_content` and diffed by the pure `search::fts_logic::plan_reconcile`. Rows whose file is gone are deleted, files that are new or whose mtime *differs* from their row are read and indexed, everything else is left untouched and never opened. Any difference counts, not just a newer one - the semantic index compares the same way (`*mtime != stored`), and a strictly-newer test would never notice a file restored from backup, unzipped, or landed by `cp -p` / `rsync -t` / a sync client's conflict copy, all of which arrive stamped older than the row. `IndexStats` reports `added` / `updated` / `removed` / `unchanged` alongside `totalDocuments`, and the `[FTS] Reconciled: ...` log line states them.
   - The full `clear_index` + rebuild survives for exactly two cases, both of them "no row survives this pass anyway": an empty `notes_content` (also the state an `FTS_SCHEMA_VERSION` mismatch leaves behind), and a pass where `unchanged` is 0 with no read errors - which is what the first open after the `mtime` migration looks like, every row at 0 and therefore stale. Clearing once beats paying one FTS5 `'delete'` re-tokenization (2-5 ms) per row for a table that ends up fully replaced. A read error rules the shortcut out: that row has to survive.
   - **Same-second blind spot.** Both sides of the comparison are `as_secs()`, so an external edit landing in the same wall-clock second as the save that stamped the row is indistinguishable from that save and is not re-read. Sub-second resolution on both sides would close it; the cost of the miss is one stale row until the file changes again.
   - This replaced a count-within-5% skip that compared row count against file count and returned early when they were close. Cardinality sees neither identity nor freshness: an external add and an external delete cancelled out, and an external edit never moved the count at all, so drift survived indefinitely (measured 2026-09-10 on the owner's vault: 171 notes on disk with no FTS row, 26 rows whose file was gone).

5. **Index maintenance (per note, between builds)**
   - Both tables are keyed vault-relative. The key comes from `vaultRelativeKey` (`src/lib/utils/path.ts`); a path outside the vault yields `null` and the update is skipped - never fall back to the absolute path.
   - Upsert: `update_search_index_file` (FTS5) + `update_semantic_file` (chunks + `mtime:<rel_path>`), fired by `applyNoteChange`'s upsert branch and by the search after-save observer. Both take `vaultPath` as well as the vault-relative key: the FTS side resolves the real file and stores its mtime on the row, so the reconcile at the next vault open does not read it again. An unresolvable file stores mtime 0 - the content still lands, it just costs one re-read later.
   - Removal: `remove_from_search_index` (FTS5) + `remove_semantic_file` (chunk rows + the `mtime:<rel_path>` key, one transaction, then `invalidate_search_cache()`), both fired from the delete branch of `applyNoteChange` - the one owner of a note's removal. Dropping the mtime key with the chunks matters: chunks gone with the mtime left behind means a file re-created at the same mtime is treated as unchanged and never re-embedded.
   - Both delete legs fire on the app-side path too: `path-change.service::forgetNote` passes `vaultStore.path`, so every delete / rename / move and every child of a deleted folder purges both tables directly. The watcher's `vault-files-changed` event cannot carry this on its own - it is dropped when the burst is all self-saves (`areAllRecentSaves`, and a 2 s autosave before a delete leaves a 15 s marker), a folder delete arrives as one directory rename that the directory-only filter discards, and a burst above `INCREMENTAL_THRESHOLD` (10) takes the full-rebuild branch, which does no per-path removal.
   - Backstop: `cleanup_orphaned_chunks` at the end of `build_semantic_index` still sweeps chunk rows and mtime keys whose files no longer exist, covering deletions made while the app was not running. It also covers the residual race: the removal is fire-and-forget while an `update_semantic_file` for the same key may still be inside its 200-500 ms ONNX embed, and a delete that commits first is undone by that insert.
   - `remove_semantic_file` reloads the search cache only when it actually deleted rows. The watcher fires a delete for every vanished `.md`, indexed or not, and a cache reload re-reads every chunk in the vault.

---

## Models

Both models live under `{vault}/.kokobrain/models/{model_name}/` and are managed by `ModelManager` (`src-tauri/src/semantic/model.rs`).

| Model | Role | Source | Size on disk | License | Approx latency |
|-------|------|--------|--------------|---------|----------------|
| BGE-M3 (Xenova INT8 ONNX) | Bi-encoder embedder | `huggingface.co/Xenova/bge-m3` | ~120 MB | MIT | ~50-100 ms per query |
| BGE-reranker-v2-m3 (onnx-community INT8) | Cross-encoder reranker | `huggingface.co/onnx-community/bge-reranker-v2-m3-ONNX` | ~571 MB | Apache 2.0 | ~10 s p50 per query end-to-end with the reranker on (2026-09-09, `retrieval_eval`, Apple-silicon CPU; reranker time not isolated; the ~500 ms that used to be here was never measured) |

Both models load lazily and are guarded by mutexes that are held across the entire load so concurrent first callers do not double-init.

Embedder load is mandatory for semantic / hybrid search. Reranker is opt-in — when the file is absent on disk, `ensure_reranker_loaded()` returns `Ok(false)` and the search path falls back gracefully. The log line `reranker=true/false` records which path executed for each query.

---

## Versioning levers (trigger reindex)

These constants force a full or partial reindex when bumped. Used to ship breaking changes to the retrieval recipe without users having to manually delete the database.

| Constant | Location | What it forces |
|----------|----------|----------------|
| `EMBED_RECIPE_VERSION` | `src-tauri/src/commands/semantic.rs` | Mixed into `model_hash`. Bumping invalidates every chunk row → full re-embed. Bump when chunking or `embed_text` formatting changes. |
| `FTS_SCHEMA_VERSION` | `src-tauri/src/db/schema.rs` | When stored value differs, `notes_content` and `notes_fts` are dropped and rebuilt. Bump when the tokenizer or the external-content wiring changes - never for an added column, which an `ALTER TABLE` migration handles without discarding rows. |
| `model_hash` (computed) | `src-tauri/src/commands/semantic.rs` | sha256 of model file bytes mixed with `EMBED_RECIPE_VERSION`. Stored alongside each chunk; mismatched rows are deleted and re-embedded. |

---

## Known limitations / non-goals

- **Approximate query terms in the chunk pick**: hybrid picks one chunk per fused path from the whole semantic index (`src-tauri/src/search/hybrid.rs`: most literal query-term hits in content + heading, then highest cosine), so a path that only the FTS leg surfaced is reranked like any other. Query terms are tokens of 3+ characters that are not in the literal en/pt `STOP_WORDS` list: `term_hits` is a boundary-less substring match, so short function words hit inside longer words ("que" inside "porque") and turn the pick into "longest chunk wins"; a query left with no terms scores 0 hits everywhere and collapses to the cosine tie-break. Only the *representative chunk* of an already-fused path is at stake — never whether the path is in the pool — and the cross-encoder arbitrates the final order, so the fix (word boundaries, diacritic folding) is not worth the cost yet. A fused path with no chunk at all (a brand-new file before the semantic index catches up) is not dropped: `build_pool` materializes it from its FTS row — `content` is the FTS5 snippet with the `<mark>` tags stripped, `heading` is `None`, the line numbers are 0 (the frontend clamps to the top of the file), the key is `<path>#fts` — and merges it among the chunk picks **by fused rank** before cutting to `RERANK_CANDIDATE_POOL`, so a top-ranked chunkless path is never displaced by a lower-ranked chunk pick. A snippet that is blank once the marks come off (an FTS match in the title / headings / tags column of a body-less note) is dropped instead of spending a pool slot. The `hybrid:` log line reports `pool=N` (chunk picks plus synthesized, post-cap), `synth=N` (the synthesized share), `fts_only=N` (paths materialized from the FTS leg alone, synthesized ones included) and `overlap=N` (paths both legs agreed on).
- **No CoreML / Apple Neural Engine acceleration**. Verified empirically not to help BGE-M3 / XLM-RoBERTa on Apple Silicon — the ANE only engages for FP16 + ANE-friendly layer ordering, and Xenova's conversion has neither. INT8 + AMX on perf cores is the speed sweet spot.
- **No sqlite-vec / HNSW index**. Brute-force cosine over ~85k chunks completes in <20 ms on M-series — not worth the schema migration.
- **No sparse / ColBERT retrieval signals**. BGE-M3 outputs both, but storing them would roughly double on-disk size and the win on this vault is small. Re-evaluate only if the retrieval eval (see below) still shows rare-term misses after the hybrid assembler change; tracked as a follow-up under `.scratch/retrieval-quality/`.

---

## Adding a new model

1. Define a `ManagedModel` const in `src-tauri/src/semantic/model.rs` (URL, on-disk filenames, the files `is_available` checks for). Match the directory layout of the existing two.
2. Add a `ModelManager::for_<role>(vault_path)` convenience constructor.
3. Add an `is_<role>_model_available` and `download_<role>_model` Tauri command pair if the model is opt-in.
4. Add the HuggingFace URL to `.github/workflows/privacy.yml` allowlist — the privacy check fails the build on unknown external calls.
5. Document the model in the table above and the user guide.

---

## Evaluating retrieval changes

There is no synthetic fixture: retrieval quality is measured against a real vault on the machine that has the models. The harness is `src-tauri/examples/retrieval_eval.rs`; the metrics it prints are the pure functions in `src-tauri/src/search/eval_metrics.rs` (unit-tested, no I/O).

1. **Write the fixture** at `{vault}/.kokobrain/eval/queries.json`. The quickest start is to let the harness draft it from the vault's own FTS index and then review it:

   ```sh
   cargo run --release --manifest-path src-tauri/Cargo.toml --example retrieval_eval -- \
     --vault ~/Vault --init-fixture --count 10
   ```

   Bucket A comes from terms that occur in exactly one note (delete the junk), bucket B from note titles (rewrite each as a paraphrase, otherwise it is just another lexical query), bucket C from nonsense verified absent from the vocabulary. Or write it by hand from `src-tauri/examples/retrieval_eval.queries.example.json`. Aim for 15-25 queries in three buckets, each with the vault-relative paths of the notes that should come back:
   - `A` rare exact terms (code identifiers, proper nouns, acronyms) — where the lexical leg of hybrid has to earn its keep;
   - `B` paraphrase / semantic queries — where the embedder has to;
   - `C` queries with nothing relevant in the vault (`expected: []`) — where the gap filter should keep the result list short.
2. **Capture the baseline** on the commit before the change:

   ```sh
   cargo run --release --manifest-path src-tauri/Cargo.toml --example retrieval_eval -- \
     --vault ~/Vault --out ~/Vault/.kokobrain/eval/report-baseline.json
   ```

3. **Re-run after the change** with `--compare` pointing at the baseline:

   ```sh
   cargo run --release --manifest-path src-tauri/Cargo.toml --example retrieval_eval -- \
     --vault ~/Vault --compare ~/Vault/.kokobrain/eval/report-baseline.json
   ```

The report (JSON, one per run) stores the top-10 paths per query per mode, so a later reader can see *which* note moved, not just that a mean changed. The console prints recall@5, recall@10, MRR@10, mean result count and p50 latency per mode and per bucket, the list of expected paths missing from the top 10, and, with `--compare`, every expected path the baseline had in its top 10 that the current run lost.

Read it in this order: the per-query regressions list (any entry is a real loss), then bucket `A` recall@10 for hybrid versus text, then bucket `C` mean result count (filter behavior), then p50 latency. A mean that moved without a per-query story is noise, not a result.

`--modes text` runs without the models; semantic and hybrid are skipped automatically when the embedder is not on disk. The first query is run once per mode as a warm-up so model lazy-loads do not land in the latency numbers. `--verbose` turns on the `[SEMANTIC]` / `[FTS]` debug log lines.

---

## Tracing a query

Useful tags to grep in `~/Library/Logs/com.diegorv.kokobrain/`:

| Tag | Emits |
|-----|-------|
| `[FRONT-END:SEARCH]` | mode, query, fuzzy flag, result count |
| `[TAURI:RUST:EMBEDDER]` | model i/o shape per query |
| `[TAURI:RUST:RERANKER]` | load events, idle unload |
| `[TAURI:RUST:SEMANTIC]` | cache hit / miss and resident-size estimate on load, gap-filter cut, `reranker=true/false`, hybrid `pool`/`synth`/`fts_only`/`overlap`, per-result rank+score+path+heading |
