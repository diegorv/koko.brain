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
                                      best chunk / path ── rerank* ── gap filter ── top-K

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
   - Maintains a parent-heading stack while walking the document. The full ancestry (e.g. `Project X > Decisions > Auth`) is prepended to the embedded text via `Chunk::embed_text()`, but the stored `content` is the original section body — display stays correct.
   - Sections are capped at `max_chunk_chars = 3000` (~700 tokens). Overlap is char-based, ~200 chars, snapped to the previous newline so we never split mid-word.
   - Notes with zero headings fall back to `window_chunks()` — 2500-char windows with 500-char overlap. Without this, long headless notes would be truncated to the model's 512-token limit and only the first ~2 KB would be indexed.
   - `strip_code_blocks` keeps the first two lines (so language tag + function signature survive) and any inline comments — function/CLI names matter for retrieval.

2. **Embedding** (`src-tauri/src/semantic/embedder.rs`)
   - BGE-M3 INT8 ONNX, 1024-d dense vectors, dynamic padding, `max_seq_len = 512`.
   - Threads: `intra_op_threads = min(8, ...)`. Batch size: 4 (empirically optimal on M-series — batch 8 wastes padding and spills L2).
   - Content-hash short-circuit: chunks whose `content_hash` already matches a row in `chunks` skip embedding entirely. This makes save-time re-indexing nearly free for unchanged sections.

3. **Storage** (`src-tauri/src/db/semantic_repo.rs`)
   - SQLite, one row per chunk. Embeddings stored as raw little-endian `f32` blobs.
   - `parent_headings` stored as JSON. `heading`, `line_start`, `line_end`, `content_hash` per chunk.
   - No vector index — brute-force cosine over all chunks completes in well under 50 ms for our typical vault size (~85k chunks).

4. **FTS5 index** (`src-tauri/src/db/schema.rs`, `src-tauri/src/search/`)
   - `tokenize = 'unicode61 remove_diacritics 2'`. Query and content are folded the same way, so `acao` ↔ `ação`.
   - The schema is versioned via `FTS_SCHEMA_VERSION` (`v2-unicode61` at time of writing). On mismatch the FTS table is dropped and rebuilt from `notes` at startup.

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
| `FTS_SCHEMA_VERSION` | `src-tauri/src/db/schema.rs` | When stored value differs, the FTS table is dropped and rebuilt from `notes`. Bump when tokenizer settings change. |
| `model_hash` (computed) | `src-tauri/src/commands/semantic.rs` | sha256 of model file bytes mixed with `EMBED_RECIPE_VERSION`. Stored alongside each chunk; mismatched rows are deleted and re-embedded. |

---

## Known limitations / non-goals

- **FTS-only paths in hybrid**: hybrid takes the best semantic chunk for each fused path. If a path is in the FTS top-30 but has no semantic chunk yet (e.g. brand-new file before the semantic index catches up), it is dropped. In practice the semantic indexer covers the full vault so this is rare; the failure mode is "the result drops out of hybrid" not "wrong result returned".
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

## Tracing a query

Useful tags to grep in `~/Library/Logs/com.diegorv.kokobrain/`:

| Tag | Emits |
|-----|-------|
| `[FRONT-END:SEARCH]` | mode, query, fuzzy flag, result count |
| `[TAURI:RUST:EMBEDDER]` | model i/o shape per query |
| `[TAURI:RUST:RERANKER]` | load events, idle unload |
| `[TAURI:RUST:SEMANTIC]` | cache hit / miss, gap-filter cut, `reranker=true/false`, per-result rank+score+path+heading |
| `[TAURI:RUST:MCP]` | per-tool calls (`tool=search query=... results=N took=Xms`, tool errors) via `debug_log` (gated on debug mode). Bind lifecycle (`listening on ...`, `bind failed: ...`, `server stopped with error: ...`) is printed straight to stderr via `eprintln!` and only shows on the `pnpm tauri dev` terminal — release builds without a terminal don't capture it. |

---

## Exposed via MCP

The same hybrid pipeline is exposed to external Model-Context-Protocol clients (Claude Code, etc.) through an in-process MCP server. The server starts inside `tauri::Builder::setup()` and is bound to the Tauri runtime lifetime — it listens only while the Kokobrain app is open.

| Surface | Value |
|---------|-------|
| Transport | rmcp streamable HTTP (`transport-streamable-http-server` feature) |
| Bind | `127.0.0.1:3737/mcp` (loopback only; no auth, no TLS) |
| Lifecycle | Started in `lib.rs` `.setup()`, stopped when the app exits |
| Bind failure | Printed on stderr via `eprintln!` (visible on the `pnpm tauri dev` terminal); the app continues without MCP. Not routed through the frontend log file because `mcp::start` runs before the FE listener subscribes. |
| Code | `src-tauri/src/mcp/mod.rs` (transport) and `src-tauri/src/mcp/tools.rs` (tool methods) |

One tool is registered:

| Tool | Calls into | Input | Output |
|------|------------|-------|--------|
| `search` | `commands::semantic::search_hybrid(query, max_results)` | `{ query: string, maxResults?: number }` | `{ hits: [{ path, heading, content, lineStart, lineEnd, score }] }` |

`search` covers FTS, semantic, and the optional reranker through the same fusion pipeline the in-app search panel uses, so the MCP client gets the same ranking the user would. Note reading is delegated to the MCP client (Claude Code already runs in the vault directory and can `Read` the vault-relative paths search returns) — the MCP surface stays single-purpose on retrieval.

### Claude Code config

```json
{
  "mcpServers": {
    "kokobrain": {
      "url": "http://127.0.0.1:3737/mcp"
    }
  }
}
```

Open Kokobrain first; if the app is not running the connection is refused (process-bound by design). Per-tool call logs land in the session log file under the `[TAURI:RUST:MCP]` tag (see the tracing table above) — `python3 scripts/log-watcher.py | grep MCP` tails them in real time, but only with debug mode enabled (`debug_log` is gated). Bind lifecycle events (`listening on ...`, `bind failed: ...`) are stderr-only via `eprintln!` and show on the `pnpm tauri dev` terminal, not in the log file.
