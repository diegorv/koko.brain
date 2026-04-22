---
type: ADR
id: "0012"
title: "ONNX Runtime local semantic search with BGE-M3 and content-hash skip"
status: active
date: 2026-04-22
---

## Context

Keyword search (FTS5, ADR-0011) is excellent for exact-term recall but misses semantic matches: a search for "shipping a product" won't find a note titled "how we launched." The app needs semantic retrieval — embedding notes into vectors and doing cosine similarity search — without:

- Sending vault content to an external API (privacy + offline-first).
- Bundling a Python runtime and a 2 GB model + dependencies (size + startup time).
- Re-embedding 1800 notes on every save (CPU cost + user-visible lag).

## Decision

**Use ONNX Runtime (`ort` crate) to run Xenova's quantized BGE-M3 model locally, cache embeddings per chunk keyed by SHA-256 content hash, and skip inference on unchanged chunks.** Models are downloaded on first use and stored inside the vault's `.kokobrain/models/` directory; the embedder unloads after idle to reclaim memory.

Key components:

- **Model manager** (`src-tauri/src/semantic/model.rs`):
  - `MODEL_NAME = "bge-m3"`, files: `model.onnx` + `tokenizer.json`, path: `{vault}/.kokobrain/models/bge-m3/`.
  - Downloads from Xenova's HuggingFace mirrors (`huggingface.co/Xenova/bge-m3/resolve/main/onnx/model_quantized.onnx` and `…/tokenizer.json`).
  - `is_model_available()` checks existence on disk; first build triggers `download_if_needed()`.
- **Embedder** (`src-tauri/src/semantic/embedder.rs`): loads ONNX session lazily, tokenizes via the `tokenizers` crate, runs inference, returns `Vec<f32>`. Auto-unloads after ~120 s idle to free ~500 MB resident memory.
- **Chunker** (`src-tauri/src/semantic/chunker.rs`): splits markdown into heading-aligned chunks; each chunk carries `source_path`, `heading`, `line_start/end`, and content.
- **Content-hash skip** (`CLAUDE.md` Indexing rule 6): `update_semantic_file()` computes SHA-256 of each chunk's content and queries `chunks.content_hash` (indexed in `schema.rs:48`). Matching chunks skip ONNX inference — saves ~200–500 ms per unchanged chunk. Only new or modified chunks are re-embedded.
- **Storage** (`src-tauri/src/db/semantic_repo.rs`): chunk rows in the `chunks` table (see ADR-0011); model version in `semantic_meta`. A model swap writes a new `version` key, making the old embeddings logically stale.
- **Build lock**: only one concurrent `build_semantic_index` — prevents concurrent OOM from two ONNX sessions.
- **Rust dependencies** (`src-tauri/Cargo.toml:50-58`): `ort = "2.0.0-rc.12"` with `download-binaries, ndarray, half`; `tokenizers = "0.22"` default-features-off + `onig`; `half`, `ndarray`, `reqwest`/`futures-util` for streamed model download; `tokio` for async I/O.

## Alternatives considered

- **OpenAI / Cohere / Voyage embeddings API**: easiest to integrate, privacy-breaking, requires internet, usage-billed. Rejected — product positioning is offline-first.
- **Ollama or llama.cpp for embeddings**: excellent quality but requires users to install a second process; lock-in to another ecosystem. Rejected — shipping our own ONNX model is self-contained.
- **Smaller model (e.g., `all-MiniLM-L6-v2`)**: faster and lighter (~90 MB vs 542 MB) but weaker multilingual performance. BGE-M3 gives state-of-the-art multilingual retrieval, which matters because users write notes in multiple languages. Accepted the size/quality trade.
- **Python sidecar (sentence-transformers)**: proven stack but adds Python runtime + venv complexity to Tauri bundles; CPU startup overhead. Rejected.
- **Re-embed everything on every save**: simple, wastes 1–2 s per save on a 200-chunk note. Rejected in favor of the content-hash skip.
- **Embed the whole file instead of chunks**: loses heading-aligned retrieval (no "jump to the section that matches"). Rejected — chunk-level retrieval is the point.

## Consequences

- First-run UX includes a ~542 MB download — this is the largest single install step. It runs in the background on the first vault that enables semantic search; the app stays usable through FTS5 meanwhile.
- Disk usage per vault: `model.onnx` + `tokenizer.json` (~550 MB) + per-chunk embeddings (~1.5 KB per chunk, typically 10–30 chunks per note — call it ~50 MB for a 1800-note vault). Acceptable on modern drives.
- The model is stored **inside the vault** under `.kokobrain/models/`. This is deliberate: portable vault + zero reconfiguration on a new machine. Users who sync vaults should exclude this directory to avoid syncing 550 MB per vault per machine.
- Incremental save cost is dominated by tokenization + embedding of changed chunks only. Typical edit = 1–3 chunks re-embedded = ~300–900 ms in the save path.
- Swapping the model (e.g., to BGE-small for low-RAM users) requires writing a new `MODEL_NAME`, a new `MODEL_DOWNLOADS` entry, and bumping `semantic_meta.version` so old embeddings are invalidated.
- Tests for semantic use `tempfile`-backed vaults and real SQLite (`src-tauri/tests/db_semantic_repo_test.rs`).
- Re-evaluation triggers: a substantially better open model ships at a similar size; ONNX Runtime breaking changes in a future `ort` release; Apple Silicon / Metal acceleration requires moving to Core ML; vault sync + embedded 550 MB model proves too painful for users.
