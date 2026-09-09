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

4. **FTS5 index** (`src-tauri/src/db/schema.rs`, `src-tauri/src/search/`)
   - `tokenize = 'unicode61 remove_diacritics 2'`. Query and content are folded the same way, so `acao` ↔ `ação`.
   - `notes_fts` is an external-content table (`content='notes_content'`, `content_rowid='rowid'`), so the document text is stored once in `notes_content` rather than duplicated into the index.
   - The schema is versioned via `FTS_SCHEMA_VERSION` (`v3-external-content` at time of writing). On mismatch both tables are dropped and rebuilt at startup.

---

## Models

Both models live under `{vault}/.kokobrain/models/{model_name}/` and are managed by `ModelManager` (`src-tauri/src/semantic/model.rs`).

| Model | Role | Source | Size on disk | License | Approx latency |
|-------|------|--------|--------------|---------|----------------|
| BGE-M3 (Xenova INT8 ONNX) | Bi-encoder embedder | `huggingface.co/Xenova/bge-m3` | ~120 MB | MIT | ~50-100 ms per query |
| BGE-reranker-v2-m3 (onnx-community INT8) | Cross-encoder reranker | `huggingface.co/onnx-community/bge-reranker-v2-m3-ONNX` | ~571 MB | Apache 2.0 | ~500 ms for top-50 |

Both models load lazily and are guarded by mutexes that are held across the entire load so concurrent first callers do not double-init.

Embedder load is mandatory for semantic / hybrid search. Reranker is opt-in — when the file is absent on disk, `ensure_reranker_loaded()` returns `Ok(false)` and the search path falls back gracefully. The log line `reranker=true/false` records which path executed for each query.

---

## Versioning levers (trigger reindex)

These constants force a full or partial reindex when bumped. Used to ship breaking changes to the retrieval recipe without users having to manually delete the database.

| Constant | Location | What it forces |
|----------|----------|----------------|
| `EMBED_RECIPE_VERSION` | `src-tauri/src/commands/semantic.rs` | Mixed into `model_hash`. Bumping invalidates every chunk row → full re-embed. Bump when chunking or `embed_text` formatting changes. |
| `FTS_SCHEMA_VERSION` | `src-tauri/src/db/schema.rs` | When stored value differs, `notes_content` and `notes_fts` are dropped and rebuilt. Bump when the tokenizer or the external-content wiring changes. |
| `model_hash` (computed) | `src-tauri/src/commands/semantic.rs` | sha256 of model file bytes mixed with `EMBED_RECIPE_VERSION`. Stored alongside each chunk; mismatched rows are deleted and re-embedded. |

---

## Known limitations / non-goals

- **Fused paths with zero semantic chunks**: hybrid picks one chunk per fused path from the whole semantic index (`src-tauri/src/search/hybrid.rs`: most literal query-term hits in content + heading, then highest cosine), so a path that only the FTS leg surfaced is reranked like any other. The one remaining gap is a path with no chunk at all (a brand-new file before the semantic index catches up): it is skipped. The `hybrid:` log line reports `fts_only=N` (paths materialized from the FTS leg alone) and `overlap=N` (paths both legs agreed on).
- **No CoreML / Apple Neural Engine acceleration**. Verified empirically not to help BGE-M3 / XLM-RoBERTa on Apple Silicon — the ANE only engages for FP16 + ANE-friendly layer ordering, and Xenova's conversion has neither. INT8 + AMX on perf cores is the speed sweet spot.
- **No sqlite-vec / HNSW index**. Brute-force cosine over ~85k chunks completes in <20 ms on M-series — not worth the schema migration.
- **No sparse / ColBERT retrieval signals**. BGE-M3 outputs both, but storing them would roughly double on-disk size and the win on this vault is small. Reserved for the optional Phase 4 work — see `tasks/done/embedding-quality.md` if it's been moved there.

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

1. **Write the fixture** at `{vault}/.kokobrain/eval/queries.json` (template: `src-tauri/examples/retrieval_eval.queries.example.json`). 15-25 queries in three buckets, each with the vault-relative paths of the notes that should come back:
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
| `[TAURI:RUST:SEMANTIC]` | cache hit / miss, gap-filter cut, `reranker=true/false`, per-result rank+score+path+heading |
