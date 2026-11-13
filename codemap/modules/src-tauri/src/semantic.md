# module card src-tauri/src/semantic
cols: module <path> <layer> files <n> in-modules <n> out-modules <n> pub <public>/<exports> ipc <called>/<served> card ~<k>k · dep <from> -> <to> <file pairs> · in2/out2 <module> <n> modules: <module>(<via>) · entry <file> ext-in<n> <importers> · file … · sym … · grep: grep -rF -- '-> src-tauri/src/semantic ' codemap/modules
module src-tauri/src/semantic rust files 12 in-modules 2 out-modules 1 pub 39/69 ipc 0/0 card ~3.3k
## neighbors
dep src-tauri/src/commands -> src-tauri/src/semantic 11
dep src-tauri/src/search -> src-tauri/src/semantic 1
dep src-tauri/src/semantic -> src-tauri/src/utils 3
in2 src-tauri/src/semantic 1 modules: src-tauri/src(1)
out2 src-tauri/src/semantic 0 modules: -
## entry files
entry src-tauri/src/semantic/types.rs ext-in2 src-tauri/src/commands/semantic.rs src-tauri/src/search/hybrid.rs
entry src-tauri/src/semantic/cache_stats.rs ext-in1 src-tauri/src/commands/semantic.rs
entry src-tauri/src/semantic/chunker.rs ext-in1 src-tauri/src/commands/semantic.rs
entry src-tauri/src/semantic/embedder.rs ext-in1 src-tauri/src/commands/semantic.rs
entry src-tauri/src/semantic/filtering.rs ext-in1 src-tauri/src/commands/semantic.rs
entry src-tauri/src/semantic/model.rs ext-in1 src-tauri/src/commands/semantic.rs
entry src-tauri/src/semantic/qos.rs ext-in1 src-tauri/src/commands/semantic.rs
entry src-tauri/src/semantic/quantize.rs ext-in1 src-tauri/src/commands/semantic.rs
entry src-tauri/src/semantic/reranker.rs ext-in1 src-tauri/src/commands/semantic.rs
entry src-tauri/src/semantic/search_timing.rs ext-in1 src-tauri/src/commands/semantic.rs
entry src-tauri/src/semantic/update_plan.rs ext-in1 src-tauri/src/commands/semantic.rs
## files
file src-tauri/src/semantic/cache_stats.rs rust L155 module src-tauri/src/semantic in1 t0 t:inline | Resident-memory estimate for the in-memory embedding cache (`SEARCH_CACHE` in `commands/semantic.rs`).
file src-tauri/src/semantic/chunker.rs rust L944 module src-tauri/src/semantic in1 t2 t:inline
file src-tauri/src/semantic/embedder.rs rust L484 module src-tauri/src/semantic in1 t4 t:inline
file src-tauri/src/semantic/filtering.rs rust L586 module src-tauri/src/semantic in1 t0 t:inline
file src-tauri/src/semantic/mod.rs rust L50 module src-tauri/src/semantic in0 t1
file src-tauri/src/semantic/model.rs rust L290 module src-tauri/src/semantic in1 t1 t:inline
file src-tauri/src/semantic/qos.rs rust L148 module src-tauri/src/semantic in1 t2 | macOS quality-of-service (QoS) for the embedder's threads.
file src-tauri/src/semantic/quantize.rs rust L238 module src-tauri/src/semantic in1 t0 t:inline | Symmetric int8 quantization for the in-memory embedding cache (`SEARCH_CACHE` in `commands/semantic.rs`).
file src-tauri/src/semantic/reranker.rs rust L160 module src-tauri/src/semantic in1 t1
file src-tauri/src/semantic/search_timing.rs rust L110 module src-tauri/src/semantic in1 t1 | Per-stage timing of one `search_semantic` / `search_hybrid` call, written as a single `[SEMANTIC] timing ...` log line so `grep "timing"` over a session log re…
file src-tauri/src/semantic/types.rs rust L212 module src-tauri/src/semantic in5 t3 t:inline
file src-tauri/src/semantic/update_plan.rs rust L69 module src-tauri/src/semantic in1 t1 | Plans a single-file semantic update from the file's stored chunk rows and its fresh chunks, without touching the model or the database.
## public
sym src-tauri/src/semantic/cache_stats.rs:12 struct ChunkFootprint L13 | Per-chunk sizes the caller reads off its cache entry.
sym src-tauri/src/semantic/cache_stats.rs:65 fn estimate_footprint(items: I) -> CacheFootprint L14 | Sums per-chunk footprints into a `CacheFootprint`.
sym src-tauri/src/semantic/chunker.rs:6 struct ChunkOptions L16 | Options for controlling chunk size and overlap.
sym src-tauri/src/semantic/chunker.rs:61 fn chunk_markdown(path: &str, content: &str, options: &ChunkOptions) -> Vec<Chunk> L59 | Chunks a markdown file by heading boundaries.
sym src-tauri/src/semantic/embedder.rs:33 struct Embedder L7 | Embedding model wrapper for ONNX inference.
sym src-tauri/src/semantic/embedder.rs:58 method Embedder::load(model_dir: &Path, dimensions: usize) -> Result<Self, String> L48 | Loads the ONNX model and tokenizer from the given directory.
sym src-tauri/src/semantic/embedder.rs:127 method Embedder::embed_batch(&mut self, texts: &[&str],) -> Result<Vec<Vec<f32>>, String> L13 | Generates embeddings for multiple texts, automatically batching for inference.
sym src-tauri/src/semantic/embedder.rs:342 fn deserialize_embedding(bytes: &[u8]) -> Option<Vec<f32>> L13 | Deserializes an embedding blob (little-endian f32s) or returns `None` for a malformed blob whose length is not a multiple of 4.
sym src-tauri/src/semantic/embedder.rs:364 fn cosine_similarity(a: &[f32], b: &[f32]) -> f32 L22 | Computes cosine similarity between two vectors.
sym src-tauri/src/semantic/filtering.rs:14 enum ScoreKind L24 | Which scale `SemanticResult::score` is on.
sym src-tauri/src/semantic/filtering.rs:43 method ScoreKind::for_search(used_reranker: bool, hybrid: bool) -> Self L7 | The kind of score a search hands to `finalize_results`: reranker logits when the cross-encoder ran, otherwise cosine for a semantic search and RRF for a hybrid…
sym src-tauri/src/semantic/filtering.rs:151 fn finalize_results(candidates: &mut Vec<SemanticResult>, limit: usize, kind: ScoreKind,) -> Option<FilterOutcome> L15 | Final step shared by `search_semantic` and `search_hybrid`: truncate to `limit`, run `adaptive_filter` for `kind` on what is left, and truncate again to its `k…
sym src-tauri/src/semantic/filtering.rs:169 fn format_score_distribution(query: &str, results: &[SemanticResult], query_embedding_dims: usize, query_embedding_norm: f32,) -> String L56 | Logs diagnostic information about score distribution.
sym src-tauri/src/semantic/model.rs:60 struct ModelManager L4 | Manages ONNX model availability and download for a single `ManagedModel`.
sym src-tauri/src/semantic/model.rs:79 method ModelManager::for_embedder(vault_path: &Path) -> Self L3 | Manager for the dense retrieval embedder (BGE-M3).
sym src-tauri/src/semantic/model.rs:84 method ModelManager::for_reranker(vault_path: &Path) -> Self L3 | Manager for the cross-encoder reranker (jina-reranker-v2-base-multilingual).
sym src-tauri/src/semantic/model.rs:89 method ModelManager::is_model_available(&self) -> bool L6 | Checks if all required model files exist on disk.
sym src-tauri/src/semantic/model.rs:97 method ModelManager::model_path(&self) -> PathBuf L3 | Returns the path to the model directory.
sym src-tauri/src/semantic/model.rs:103 method ModelManager::embedding_dimensions(&self) -> Option<usize> L3 | Returns the expected embedding dimensionality declared by the underlying `ManagedModel`.
sym src-tauri/src/semantic/model.rs:111 method ModelManager::download_model(&self, on_progress: impl Fn(f32),) -> Result<PathBuf, String> L30 | Downloads all model files from HuggingFace Hub.
sym src-tauri/src/semantic/qos.rs:89 fn enter_utility_qos() -> UtilityQosGuard L16 | Lowers the current thread to utility QoS until the returned guard drops.
sym src-tauri/src/semantic/quantize.rs:25 struct QuantizedVector L6 | A cached embedding stored as int8 with one symmetric per-vector scale.
sym src-tauri/src/semantic/quantize.rs:47 method QuantizedVector::from_f32(vector: &[f32]) -> Self L21 | Quantizes an f32 vector with a symmetric absmax scale.
sym src-tauri/src/semantic/reranker.rs:16 struct Reranker L5 | Cross-encoder reranker wrapping a jina-reranker-v2-base-multilingual ONNX session.
sym src-tauri/src/semantic/reranker.rs:39 method Reranker::load(model_dir: &Path) -> Result<Self, String> L48 | Loads the ONNX model + tokenizer from a directory containing `model.onnx` and `tokenizer.json`.
sym src-tauri/src/semantic/search_timing.rs:9 struct CacheTiming L6 | Search-cache lookup (`get_or_load_cache`).
sym src-tauri/src/semantic/search_timing.rs:18 struct HybridTiming L8 | Stages only `search_hybrid` runs.
sym src-tauri/src/semantic/search_timing.rs:29 enum RerankTiming L13 | Cross-encoder rerank stage.
sym src-tauri/src/semantic/search_timing.rs:45 struct SearchTiming L20 | Stage durations of one search.
sym src-tauri/src/semantic/types.rs:5 struct SemanticResult L18 dto:SemanticResult | A search result from semantic (embedding-based) search.
sym src-tauri/src/semantic/types.rs:28 struct SemanticStats L8 dto:SemanticStats | Statistics about the semantic search index.
sym src-tauri/src/semantic/types.rs:42 struct SemanticFileStatus L9 dto:SemanticFileStatus | Per-file semantic indexing status.
sym src-tauri/src/semantic/types.rs:56 struct SemanticProgress L10 dto:SemanticProgress | Progress event emitted during semantic indexing.
sym src-tauri/src/semantic/types.rs:72 enum SemanticPhase L10 dto:SemanticPhase | Phase reported by `SemanticProgress`.
sym src-tauri/src/semantic/types.rs:84 struct Chunk L21 | A chunk of markdown content ready for embedding.
sym src-tauri/src/semantic/types.rs:117 fn heading_prefixed_text(parent_headings: &[String], heading: Option<&str>, content: &str) -> String L11 | Builds the heading-prefixed projection of a chunk: the text the embedder indexes (`Chunk::embed_text`) and the text the cross-encoder scores at query time (`Ca…
sym src-tauri/src/semantic/types.rs:134 method Chunk::embed_text(&self) -> String L3 | Returns the text that should be fed to the embedder.
sym src-tauri/src/semantic/update_plan.rs:31 method UpdatePlan::is_noop(&self) -> bool L3 | True when every fresh chunk is stored under its own key with its own hash and no stored key is stale.
sym src-tauri/src/semantic/update_plan.rs:42 fn plan_file_update(existing: &HashMap<String, String>, chunks: &'a [Chunk]) -> UpdatePlan<'a> L28 | Plans the update of one file.
## effects
fx-count rust-tokio-fs.File::create 1
fx-count rust-tokio-fs.create_dir_all 1
fx-count rust-tokio-fs.remove_file 1
fx-count rust-tokio-fs.rename 1
## debt
-
