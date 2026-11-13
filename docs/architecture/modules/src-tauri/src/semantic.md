---
summary: "Building blocks of semantic search: markdown chunking, ONNX embedder and reranker, model files, int8 quantization, result filtering and update planning."
---

## Responsibility

Owns splitting markdown into heading-based chunks (chunker.rs), the ONNX sessions for the BGE-M3 embedder and the jina-reranker-v2 cross-encoder (embedder.rs, reranker.rs), model file location and download (model.rs), int8 quantization of cached vectors (quantize.rs), score filtering after a search (filtering.rs), per-file update planning by content hash (update_plan.rs), the shared result, progress and chunk types (types.rs), macOS utility QoS for the embedder's ORT worker threads (qos.rs), and the timing and cache-footprint value types used for logging (search_timing.rs, cache_stats.rs). It does not own index persistence (db/semantic_repo.rs), the Tauri command handlers, or the process-wide model and cache statics, which live in commands/semantic.rs.

## Key files

- `src-tauri/src/semantic/mod.rs`: Process-wide ORT environment and session_builder, the shared place where ONNX session builders start.
- `src-tauri/src/semantic/types.rs`: Shared DTOs (SemanticResult, SemanticStats, SemanticFileStatus, SemanticProgress, SemanticPhase), Chunk and heading_prefixed_text.
- `src-tauri/src/semantic/chunker.rs`: chunk_markdown and ChunkOptions: heading-based chunks with a size limit and character overlap, and the chunk content_hash.
- `src-tauri/src/semantic/embedder.rs`: Embedder ONNX wrapper with mean pooling, L2 normalization, dimension checks, deserialize_embedding and cosine_similarity.
- `src-tauri/src/semantic/reranker.rs`: Reranker cross-encoder wrapper returning one raw logit per query and document pair.
- `src-tauri/src/semantic/model.rs`: ManagedModel definitions, ModelManager availability checks and downloads into .kokobrain/models.
- `src-tauri/src/semantic/filtering.rs`: ScoreKind, adaptive_filter and finalize_results.
- `src-tauri/src/semantic/update_plan.rs`: plan_file_update: reuse stored vectors by content hash for a single-file update.
- `src-tauri/src/commands/semantic.rs`: Main consumer: owns the statics and the command handlers that call into this module.

## State

- Model files written under <vault>/.kokobrain/models/<model name>/ by ModelManager, through a temp file and rename (model.rs).
- Process-wide ORT environment in a static OnceLock (mod.rs).
- An atomic counter of ORT worker threads that reached utility QoS (qos.rs).
- The loaded sessions, the in-memory search cache and the SQLite index are not here; they live in commands/semantic.rs and db/semantic_repo.rs.

## Collaborators

- `src-tauri/src/commands`: commands/semantic.rs loads Embedder and Reranker, calls chunk_markdown, plan_file_update, filtering, quantization, timing and cache stats, and holds the process-wide statics.
- `src-tauri/src/search`: search/hybrid.rs imports SemanticResult from types.rs to build FTS-only rerank pool entries.
- `src-tauri/src/db`: Not a code dependency: commands/semantic.rs stores the chunk fields and f32 embedding blobs produced here through db/semantic_repo.rs and decodes loaded blobs with embedder::deserialize_embedding.
- `src-tauri/src/utils`: embedder.rs, reranker.rs and qos.rs write through utils::logger::debug_log.
- `src/lib/contracts`: The ts-rs exported types in types.rs produce TypeScript bindings in generated/, and events.ts maps the semantic-index-progress event to SemanticProgress.
- `src-tauri/tests`: Chunker, embedder thread, QoS, model, reranker, session builder, search timing and update plan tests import this module.
- `event:semantic-index-progress`: Emitted by commands/semantic.rs with SemanticProgress payloads defined in types.rs.

## Gotchas

- The ORT environment lives in a static OnceLock because the ort crate keeps only a weak global reference. Every session must start from session_builder in mod.rs, which pins the CPU execution provider and turns intra-op spinning off; embedder_session_builder adds the utility QoS thread manager on top.
- The embedder caps ONNX intra-op threads at 4 (embedder_intra_threads) because it also runs during background bursts, while Reranker::load uses up to 8.
- Cosine similarity equals a dot product only because stored and query vectors are L2-normalized in the embedder. The int8 cache in quantize.rs depends on that, and the database still stores f32 blobs; quantization happens at cache load.
- heading_prefixed_text in types.rs is the text projection used for embedding (Chunk::embed_text) and reranking (CachedChunk::rerank_text in commands/semantic.rs). chunker.rs builds the content_hash input with its own copy of the same format rather than calling it, so a change to the projection must be mirrored in chunker.rs to keep content_hash in step, and the Chunk::embed_text doc asks for an EMBED_RECIPE_VERSION bump (commands/semantic.rs).
- Chunk keys contain the absolute line_start but content_hash does not. update_plan.rs reuses stored vectors by hash, so a key can move without re-embedding.
- ScoreKind::for_search selects how scores are judged: reranker logits are mapped through a sigmoid before the gap test and finalize_results keeps at least MIN_LOGIT_RESULTS of them; cosine uses COSINE_GAP_RATIO of the top score; RRF scores get no gap filter, only truncation. The reranker itself returns raw logits.
- Embedder inference aborts a batch when the model output dimension differs from the dimension given at load.
- Types with #[ts(export)] in types.rs (SemanticResult, SemanticStats, SemanticFileStatus, SemanticProgress, SemanticPhase) produce TypeScript bindings. Chunk is not exported.
- The module has no SQLite handle and no Tauri handles. Process-wide state and command handlers belong in commands/semantic.rs.
- model.rs records the reranker model's license as CC-BY-NC-4.0 (non-commercial, attribution required) in the doc comment on JINA_RERANKER_V2.
