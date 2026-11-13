# file card src-tauri/src/commands/semantic.rs
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src-tauri/src/commands/semantic.rs ' codemap/files
sections: imports, imported-by, reach, tests, symbols, locals, calls, ipc-in, effects
file src-tauri/src/commands/semantic.rs rust L1735 module src-tauri/src/commands in2 t1 t:inline
## imports
imp src-tauri/src/commands/semantic.rs:1 -> src-tauri/src/db/mod.rs self
imp src-tauri/src/commands/semantic.rs:2 -> src-tauri/src/events.rs SEMANTIC_INDEX_PROGRESS_EVENT
imp src-tauri/src/commands/semantic.rs:3 -> src-tauri/src/semantic/cache_stats.rs self
imp src-tauri/src/commands/semantic.rs:4 -> src-tauri/src/semantic/chunker.rs chunk_markdown,ChunkOptions
imp src-tauri/src/commands/semantic.rs:5 -> src-tauri/src/semantic/embedder.rs cosine_similarity,deserialize_embedding,Embedder
imp src-tauri/src/commands/semantic.rs:6 -> src-tauri/src/semantic/filtering.rs self
imp src-tauri/src/commands/semantic.rs:7 -> src-tauri/src/semantic/model.rs ModelManager
imp src-tauri/src/commands/semantic.rs:8 -> src-tauri/src/semantic/qos.rs enter_utility_qos
imp src-tauri/src/commands/semantic.rs:9 -> src-tauri/src/semantic/quantize.rs QuantizedVector
imp src-tauri/src/commands/semantic.rs:10 -> src-tauri/src/semantic/reranker.rs Reranker
imp src-tauri/src/commands/semantic.rs:11 -> src-tauri/src/semantic/search_timing.rs CacheTiming,HybridTiming,RerankTiming,SearchTiming
imp src-tauri/src/commands/semantic.rs:12 -> src-tauri/src/semantic/types.rs SemanticFileStatus,SemanticPhase,SemanticProgress,SemanticResult,SemanticStats
imp src-tauri/src/commands/semantic.rs:15 -> src-tauri/src/semantic/update_plan.rs plan_file_update
imp src-tauri/src/commands/semantic.rs:16 -> src-tauri/src/utils/fs.rs self
imp src-tauri/src/commands/semantic.rs:17 -> src-tauri/src/utils/logger.rs debug_log,is_debug_enabled
imp src-tauri/src/commands/semantic.rs:18 -> src-tauri/src/utils/resource_usage.rs self,EmbedPass
imp src-tauri/src/commands/semantic.rs:139 -> src-tauri/src/semantic/types.rs heading_prefixed_text
imp src-tauri/src/commands/semantic.rs:167 -> src-tauri/src/db/semantic_repo.rs load_all_embeddings
imp src-tauri/src/commands/semantic.rs:522 -> src-tauri/src/db/semantic_repo.rs clear_all_chunks
imp src-tauri/src/commands/semantic.rs:526 -> src-tauri/src/db/semantic_repo.rs get_stored_mtimes
imp src-tauri/src/commands/semantic.rs:732 -> src-tauri/src/db/semantic_repo.rs delete_chunks_for_path
imp src-tauri/src/commands/semantic.rs:741 -> src-tauri/src/db/semantic_repo.rs insert_chunk
imp src-tauri/src/commands/semantic.rs:758 -> src-tauri/src/db/semantic_repo.rs upsert_mtimes
imp src-tauri/src/commands/semantic.rs:1003 -> src-tauri/src/commands/search_index.rs search_fts_inner
imp src-tauri/src/commands/semantic.rs:1059 -> src-tauri/src/search/rrf.rs rrf_fuse
imp src-tauri/src/commands/semantic.rs:1061 -> src-tauri/src/search/rrf.rs DEFAULT_RRF_K
imp src-tauri/src/commands/semantic.rs:1071 -> src-tauri/src/search/hybrid.rs query_terms
imp src-tauri/src/commands/semantic.rs:1076 -> src-tauri/src/search/hybrid.rs build_pool
imp src-tauri/src/commands/semantic.rs:1081 -> src-tauri/src/search/hybrid.rs ChunkCandidate
imp src-tauri/src/commands/semantic.rs:1103 -> src-tauri/src/search/hybrid.rs PoolEntry
imp src-tauri/src/commands/semantic.rs:1121 -> src-tauri/src/search/hybrid.rs PoolEntry
imp src-tauri/src/commands/semantic.rs:1239 -> src-tauri/src/db/semantic_repo.rs get_file_index_info
imp src-tauri/src/commands/semantic.rs:1285 -> src-tauri/src/db/semantic_repo.rs delete_chunks_for_path
imp src-tauri/src/commands/semantic.rs:1286 -> src-tauri/src/db/semantic_repo.rs delete_mtime
imp src-tauri/src/commands/semantic.rs:1317 -> src-tauri/src/db/semantic_repo.rs delete_chunks_for_path
imp src-tauri/src/commands/semantic.rs:1329 -> src-tauri/src/db/semantic_repo.rs get_chunk_hashes_for_path
imp src-tauri/src/commands/semantic.rs:1345 -> src-tauri/src/semantic/types.rs Chunk
imp src-tauri/src/commands/semantic.rs:1351 -> src-tauri/src/db/semantic_repo.rs get_chunk_embedding
imp src-tauri/src/commands/semantic.rs:1416 -> src-tauri/src/db/semantic_repo.rs delete_chunk_by_key
imp src-tauri/src/commands/semantic.rs:1422 -> src-tauri/src/db/semantic_repo.rs insert_chunk
imp src-tauri/src/commands/semantic.rs:1448 -> src-tauri/src/db/semantic_repo.rs insert_chunk
imp src-tauri/src/commands/semantic.rs:1505 -> src-tauri/src/db/semantic_repo.rs upsert_mtimes
imp src-tauri/src/commands/semantic.rs:1514 -> src-tauri/src/db/semantic_repo.rs count_chunks
imp src-tauri/src/commands/semantic.rs:1515 -> src-tauri/src/db/semantic_repo.rs count_sources
imp src-tauri/src/commands/semantic.rs:1534 -> src-tauri/src/db/semantic_repo.rs get_distinct_sources
imp src-tauri/src/commands/semantic.rs:1539 -> src-tauri/src/db/semantic_repo.rs delete_chunks_for_path
imp src-tauri/src/commands/semantic.rs:1549 -> src-tauri/src/db/semantic_repo.rs delete_orphaned_mtimes
imp src-tauri/src/commands/semantic.rs:1588 -> src-tauri/src/db/semantic_repo.rs delete_chunks_for_path
imp src-tauri/src/commands/semantic.rs:1590 -> src-tauri/src/db/semantic_repo.rs upsert_mtimes
imp src-tauri/src/commands/semantic.rs:1635 -> src-tauri/src/db/semantic_repo.rs get_meta
imp src-tauri/src/commands/semantic.rs:1640 -> src-tauri/src/db/semantic_repo.rs upsert_meta
## imported-by
imp src-tauri/src/commands/search_index.rs:297 -> src-tauri/src/commands/semantic.rs invalidate_search_cache
imp src-tauri/src/lib.rs:372 -> src-tauri/src/commands/semantic.rs init_semantic_search
imp src-tauri/src/lib.rs:373 -> src-tauri/src/commands/semantic.rs is_semantic_model_available
imp src-tauri/src/lib.rs:374 -> src-tauri/src/commands/semantic.rs build_semantic_index
imp src-tauri/src/lib.rs:375 -> src-tauri/src/commands/semantic.rs search_semantic
imp src-tauri/src/lib.rs:376 -> src-tauri/src/commands/semantic.rs search_hybrid
imp src-tauri/src/lib.rs:377 -> src-tauri/src/commands/semantic.rs get_semantic_stats
imp src-tauri/src/lib.rs:378 -> src-tauri/src/commands/semantic.rs get_semantic_file_status
imp src-tauri/src/lib.rs:379 -> src-tauri/src/commands/semantic.rs update_semantic_file
imp src-tauri/src/lib.rs:380 -> src-tauri/src/commands/semantic.rs remove_semantic_file
imp src-tauri/src/lib.rs:381 -> src-tauri/src/commands/semantic.rs download_semantic_model
imp src-tauri/src/lib.rs:382 -> src-tauri/src/commands/semantic.rs is_reranker_model_available
imp src-tauri/src/lib.rs:383 -> src-tauri/src/commands/semantic.rs download_reranker_model
imp src-tauri/src/lib.rs:384 -> src-tauri/src/commands/semantic.rs shutdown_semantic
## reach
in2 src-tauri/src/commands/semantic.rs 1 files in 1 modules: src-tauri/src(1)
out2 src-tauri/src/commands/semantic.rs 3 files in 2 modules: src-tauri/src/search(2) src-tauri/src/db(1)
## tests
test src-tauri/examples/retrieval_eval.rs example src-tauri/src/commands/semantic.rs
test src-tauri/tests/semantic_commands_test.rs imports src-tauri/src/commands/semantic.rs
## symbols
sym src-tauri/src/commands/semantic.rs:89 fn search_cache_label() -> &'static str L7 | Layout the next cache load will build: `"int8"`, or `"f32"` under `KOKO_SEARCH_CACHE=f32`.
sym src-tauri/src/commands/semantic.rs:148 fn(crate) invalidate_search_cache() L6 | Clears the search cache.
by src-tauri/src/commands/semantic.rs:invalidate_search_cache <- src-tauri/src/commands/search_index.rs:297 in rename_in_search_index_inner lexical
sym src-tauri/src/commands/semantic.rs:359 fn embedder_unload_generation() -> u64 L3 | Returns how many embedder idle unloads have been scheduled since process start.
sym src-tauri/src/commands/semantic.rs:371 cmd init_semantic_search(vault_path: String) -> Result<bool, String> L25 | Loads the ONNX model into the static embedder.
by src-tauri/src/commands/semantic.rs:init_semantic_search <- src-tauri/src/lib.rs:372 in run import
sym src-tauri/src/commands/semantic.rs:399 cmd is_semantic_model_available(vault_path: String) -> Result<bool, String> L4 | Checks if the ONNX model files are available on disk.
by src-tauri/src/commands/semantic.rs:is_semantic_model_available <- src-tauri/src/lib.rs:373 in run import
sym src-tauri/src/commands/semantic.rs:406 cmd is_reranker_model_available(vault_path: String) -> Result<bool, String> L4 | Checks if the reranker model files are available on disk.
by src-tauri/src/commands/semantic.rs:is_reranker_model_available <- src-tauri/src/lib.rs:382 in run import
sym src-tauri/src/commands/semantic.rs:422 cmd download_reranker_model(vault_path: String, app: AppHandle) -> Result<bool, String> L3 | Downloads the jina-reranker-v2-base-multilingual INT8 ONNX model (~280MB) into `.kokobrain/models/jina-reranker-v2-base-multilingual/`.
by src-tauri/src/commands/semantic.rs:download_reranker_model <- src-tauri/src/lib.rs:383 in run import
sym src-tauri/src/commands/semantic.rs:427 fn download_reranker_model_inner(vault_path: String, on_progress: impl Fn(SemanticProgress) + Send + Sync,) -> Result<bool, String> L22 | `download_reranker_model` without the `AppHandle`: progress goes to `on_progress`.
sym src-tauri/src/commands/semantic.rs:452 cmd download_semantic_model(vault_path: String, app: AppHandle) -> Result<bool, String> L3 | Downloads the ONNX model from HuggingFace Hub, emitting progress events.
by src-tauri/src/commands/semantic.rs:download_semantic_model <- src-tauri/src/lib.rs:381 in run import
sym src-tauri/src/commands/semantic.rs:457 fn download_semantic_model_inner(vault_path: String, on_progress: impl Fn(SemanticProgress) + Send + Sync,) -> Result<bool, String> L22 | `download_semantic_model` without the `AppHandle`: progress goes to `on_progress`.
sym src-tauri/src/commands/semantic.rs:483 cmd build_semantic_index(vault_path: String, app: AppHandle,) -> Result<SemanticStats, String> L6 | Builds the semantic index; progress is emitted on `semantic-index-progress`.
by src-tauri/src/commands/semantic.rs:build_semantic_index <- src-tauri/src/lib.rs:374 in run import
sym src-tauri/src/commands/semantic.rs:495 fn build_semantic_index_inner(vault_path: String, on_progress: impl Fn(SemanticProgress) + Send + Sync,) -> Result<SemanticStats, String> L299 | Builds the semantic index: chunks all markdown files, embeds changed chunks, stores in DB.
sym src-tauri/src/commands/semantic.rs:798 cmd search_semantic(query: String, max_results: Option<usize>, min_score: Option<f32>,) -> Result<Vec<SemanticResult>, String> L162 | Searches semantic index by embedding the query and computing cosine similarity.
by src-tauri/src/commands/semantic.rs:search_semantic <- src-tauri/src/lib.rs:375 in run import
sym src-tauri/src/commands/semantic.rs:986 cmd search_hybrid(query: String, max_results: Option<usize>,) -> Result<Vec<SemanticResult>, String> L231 | Hybrid search: fuses FTS5 (BM25) and semantic (cosine) results via RRF, then reranks the top-50 with the cross-encoder when available.
by src-tauri/src/commands/semantic.rs:search_hybrid <- src-tauri/src/lib.rs:376 in run import
sym src-tauri/src/commands/semantic.rs:1220 cmd get_semantic_stats() -> Result<SemanticStats, String> L3 | Returns statistics about the semantic search index.
by src-tauri/src/commands/semantic.rs:get_semantic_stats <- src-tauri/src/lib.rs:377 in run import
sym src-tauri/src/commands/semantic.rs:1235 cmd get_semantic_file_status(file_path: String) -> Result<SemanticFileStatus, String> L14 | Returns per-file indexing status for the given vault-relative path.
by src-tauri/src/commands/semantic.rs:get_semantic_file_status <- src-tauri/src/lib.rs:378 in run import
sym src-tauri/src/commands/semantic.rs:1253 cmd shutdown_semantic() -> Result<(), String> L12 | Releases the ONNX model and clears the search cache.
by src-tauri/src/commands/semantic.rs:shutdown_semantic <- src-tauri/src/lib.rs:384 in run import
sym src-tauri/src/commands/semantic.rs:1282 cmd remove_semantic_file(file_path: String) -> Result<(), String> L19 | Removes a single note from the semantic index: every chunk row for `file_path` plus its `mtime:<file_path>` key, in one transaction, then invalidates the searc…
by src-tauri/src/commands/semantic.rs:remove_semantic_file <- src-tauri/src/lib.rs:380 in run import
sym src-tauri/src/commands/semantic.rs:1305 cmd update_semantic_file(file_path: String, content: String, vault_path: String,) -> Result<(), String> L170 | Re-chunks and re-embeds a single file (called on save).
by src-tauri/src/commands/semantic.rs:update_semantic_file <- src-tauri/src/lib.rs:379 in run import
sym src-tauri/src/commands/semantic.rs:1531 fn cleanup_orphaned_chunks(existing_paths: &[String]) -> Result<usize, String> L29 | Removes chunks and mtime entries whose source paths are not in `existing_paths` (the search walk), which covers files deleted while the app was closed and any …
sym src-tauri/src/commands/semantic.rs:1574 fn clear_changed_files_without_chunks(changed: &[(String, i64)], chunked: &HashSet<String>,) -> Result<Vec<String>, String> L21 | Clears chunks + persists the new mtime for every changed file that produced ZERO chunks (emptied, frontmatter-only, or below the min-chunk threshold).
sym src-tauri/src/commands/semantic.rs:1606 fn compute_model_hash(vault: &Path) -> String L20 | Computes a SHA-256 hash of the first 8KB of the model file plus the embed recipe version, for quick change detection.
sym src-tauri/src/commands/semantic.rs:1629 fn check_and_update_model_hash(current_hash: &str) -> Result<bool, String> L16 | Checks if the model hash changed since last build.
## locals
local src-tauri/src/commands/semantic.rs:82 fn f32_baseline_requested() -> bool L3
local src-tauri/src/commands/semantic.rs:128 fn CachedChunk::score(&self, query: &[f32]) -> f32 L6
local src-tauri/src/commands/semantic.rs:138 fn CachedChunk::rerank_text(&self) -> String L7
local src-tauri/src/commands/semantic.rs:157 fn get_or_load_cache() -> Result<(Arc<Vec<CachedChunk>>, bool), String> L77
local src-tauri/src/commands/semantic.rs:236 fn unload_embedder() L9
local src-tauri/src/commands/semantic.rs:250 fn ensure_embedder_loaded() -> Result<bool, String> L26
local src-tauri/src/commands/semantic.rs:278 fn unload_reranker() L8
local src-tauri/src/commands/semantic.rs:291 fn ensure_reranker_loaded() -> Result<bool, String> L28
local src-tauri/src/commands/semantic.rs:322 fn schedule_reranker_unload() L9
local src-tauri/src/commands/semantic.rs:334 fn schedule_embedder_unload() L21
local src-tauri/src/commands/semantic.rs:364 fn semantic_build_running() -> bool L3
local src-tauri/src/commands/semantic.rs:412 fn emit_progress(app: AppHandle) -> impl Fn(SemanticProgress) + Send + Sync L5
local src-tauri/src/commands/semantic.rs:1484 fn update_stored_mtime(file_path: &str, vault_path: &str) -> Result<(), String> L24
local src-tauri/src/commands/semantic.rs:1510 fn get_semantic_stats_inner() -> Result<SemanticStats, String> L14
## calls
call src-tauri/src/commands/semantic.rs:90 in search_cache_label -> src-tauri/src/commands/semantic.rs:f32_baseline_requested call
call src-tauri/src/commands/semantic.rs:130 in CachedChunk::score -> src-tauri/src/semantic/embedder.rs:cosine_similarity lexical
call src-tauri/src/commands/semantic.rs:139 in CachedChunk::rerank_text -> src-tauri/src/semantic/types.rs:heading_prefixed_text lexical
call src-tauri/src/commands/semantic.rs:151 in invalidate_search_cache -> src-tauri/src/utils/logger.rs:debug_log lexical
call src-tauri/src/commands/semantic.rs:160 in get_or_load_cache -> src-tauri/src/utils/logger.rs:debug_log lexical +3
call src-tauri/src/commands/semantic.rs:165 in get_or_load_cache -> src-tauri/src/commands/semantic.rs:f32_baseline_requested call
call src-tauri/src/commands/semantic.rs:166 in get_or_load_cache -> src-tauri/src/db/mod.rs:with_db lexical
call src-tauri/src/commands/semantic.rs:167 in get_or_load_cache -> src-tauri/src/db/semantic_repo.rs:load_all_embeddings lexical
call src-tauri/src/commands/semantic.rs:171 in get_or_load_cache -> src-tauri/src/semantic/embedder.rs:deserialize_embedding lexical
call src-tauri/src/commands/semantic.rs:193 in get_or_load_cache -> src-tauri/src/semantic/quantize.rs:QuantizedVector lexical
call src-tauri/src/commands/semantic.rs:193 in get_or_load_cache -> src-tauri/src/semantic/quantize.rs:QuantizedVector::from_f32 lexical
call src-tauri/src/commands/semantic.rs:207 in get_or_load_cache -> src-tauri/src/semantic/cache_stats.rs:estimate_footprint lexical
call src-tauri/src/commands/semantic.rs:229 in get_or_load_cache -> src-tauri/src/commands/semantic.rs:search_cache_label call
call src-tauri/src/commands/semantic.rs:240 in unload_embedder -> src-tauri/src/utils/logger.rs:debug_log lexical +1
call src-tauri/src/commands/semantic.rs:241 in unload_embedder -> src-tauri/src/utils/resource_usage.rs:describe_memory lexical
call src-tauri/src/commands/semantic.rs:263 in ensure_embedder_loaded -> src-tauri/src/utils/logger.rs:debug_log lexical +1
call src-tauri/src/commands/semantic.rs:264 in ensure_embedder_loaded -> src-tauri/src/semantic/model.rs:ModelManager lexical
call src-tauri/src/commands/semantic.rs:264 in ensure_embedder_loaded -> src-tauri/src/semantic/model.rs:ModelManager::for_embedder lexical
call src-tauri/src/commands/semantic.rs:265 in ensure_embedder_loaded -> src-tauri/src/semantic/model.rs:ModelManager::is_model_available lexical-method
call src-tauri/src/commands/semantic.rs:269 in ensure_embedder_loaded -> src-tauri/src/semantic/model.rs:ModelManager::embedding_dimensions lexical-method
call src-tauri/src/commands/semantic.rs:271 in ensure_embedder_loaded -> src-tauri/src/semantic/embedder.rs:Embedder lexical
call src-tauri/src/commands/semantic.rs:271 in ensure_embedder_loaded -> src-tauri/src/semantic/embedder.rs:Embedder::load lexical
call src-tauri/src/commands/semantic.rs:271 in ensure_embedder_loaded -> src-tauri/src/semantic/model.rs:ModelManager::model_path lexical-method
call src-tauri/src/commands/semantic.rs:282 in unload_reranker -> src-tauri/src/utils/logger.rs:debug_log lexical
call src-tauri/src/commands/semantic.rs:307 in ensure_reranker_loaded -> src-tauri/src/semantic/model.rs:ModelManager lexical
call src-tauri/src/commands/semantic.rs:307 in ensure_reranker_loaded -> src-tauri/src/semantic/model.rs:ModelManager::for_reranker lexical
call src-tauri/src/commands/semantic.rs:308 in ensure_reranker_loaded -> src-tauri/src/semantic/model.rs:ModelManager::is_model_available lexical-method
call src-tauri/src/commands/semantic.rs:313 in ensure_reranker_loaded -> src-tauri/src/utils/logger.rs:debug_log lexical +1
call src-tauri/src/commands/semantic.rs:314 in ensure_reranker_loaded -> src-tauri/src/semantic/model.rs:ModelManager::model_path lexical-method
call src-tauri/src/commands/semantic.rs:314 in ensure_reranker_loaded -> src-tauri/src/semantic/reranker.rs:Reranker lexical
call src-tauri/src/commands/semantic.rs:314 in ensure_reranker_loaded -> src-tauri/src/semantic/reranker.rs:Reranker::load lexical
call src-tauri/src/commands/semantic.rs:327 in schedule_reranker_unload -> src-tauri/src/commands/semantic.rs:unload_reranker call
call src-tauri/src/commands/semantic.rs:348 in schedule_embedder_unload -> src-tauri/src/commands/semantic.rs:semantic_build_running call
call src-tauri/src/commands/semantic.rs:349 in schedule_embedder_unload -> src-tauri/src/commands/semantic.rs:schedule_embedder_unload call
call src-tauri/src/commands/semantic.rs:352 in schedule_embedder_unload -> src-tauri/src/commands/semantic.rs:unload_embedder call
call src-tauri/src/commands/semantic.rs:378 in init_semantic_search -> src-tauri/src/semantic/model.rs:ModelManager lexical
call src-tauri/src/commands/semantic.rs:378 in init_semantic_search -> src-tauri/src/semantic/model.rs:ModelManager::for_embedder lexical
call src-tauri/src/commands/semantic.rs:379 in init_semantic_search -> src-tauri/src/semantic/model.rs:ModelManager::is_model_available lexical-method
call src-tauri/src/commands/semantic.rs:388 in init_semantic_search -> src-tauri/src/semantic/qos.rs:enter_utility_qos lexical
call src-tauri/src/commands/semantic.rs:389 in init_semantic_search -> src-tauri/src/commands/semantic.rs:ensure_embedder_loaded call
call src-tauri/src/commands/semantic.rs:400 in is_semantic_model_available -> src-tauri/src/semantic/model.rs:ModelManager lexical
call src-tauri/src/commands/semantic.rs:400 in is_semantic_model_available -> src-tauri/src/semantic/model.rs:ModelManager::for_embedder lexical
call src-tauri/src/commands/semantic.rs:401 in is_semantic_model_available -> src-tauri/src/semantic/model.rs:ModelManager::is_model_available lexical-method
call src-tauri/src/commands/semantic.rs:407 in is_reranker_model_available -> src-tauri/src/semantic/model.rs:ModelManager lexical
call src-tauri/src/commands/semantic.rs:407 in is_reranker_model_available -> src-tauri/src/semantic/model.rs:ModelManager::for_reranker lexical
call src-tauri/src/commands/semantic.rs:408 in is_reranker_model_available -> src-tauri/src/semantic/model.rs:ModelManager::is_model_available lexical-method
call src-tauri/src/commands/semantic.rs:423 in download_reranker_model -> src-tauri/src/commands/semantic.rs:download_reranker_model_inner call
call src-tauri/src/commands/semantic.rs:423 in download_reranker_model -> src-tauri/src/commands/semantic.rs:emit_progress call
call src-tauri/src/commands/semantic.rs:431 in download_reranker_model_inner -> src-tauri/src/semantic/model.rs:ModelManager lexical
call src-tauri/src/commands/semantic.rs:431 in download_reranker_model_inner -> src-tauri/src/semantic/model.rs:ModelManager::for_reranker lexical
call src-tauri/src/commands/semantic.rs:432 in download_reranker_model_inner -> src-tauri/src/semantic/model.rs:ModelManager::is_model_available lexical-method
call src-tauri/src/commands/semantic.rs:437 in download_reranker_model_inner -> src-tauri/src/semantic/model.rs:ModelManager::download_model lexical-method
call src-tauri/src/commands/semantic.rs:439 in download_reranker_model_inner -> src-tauri/src/semantic/types.rs:SemanticPhase lexical
call src-tauri/src/commands/semantic.rs:453 in download_semantic_model -> src-tauri/src/commands/semantic.rs:download_semantic_model_inner call
call src-tauri/src/commands/semantic.rs:453 in download_semantic_model -> src-tauri/src/commands/semantic.rs:emit_progress call
call src-tauri/src/commands/semantic.rs:461 in download_semantic_model_inner -> src-tauri/src/semantic/model.rs:ModelManager lexical
call src-tauri/src/commands/semantic.rs:461 in download_semantic_model_inner -> src-tauri/src/semantic/model.rs:ModelManager::for_embedder lexical
call src-tauri/src/commands/semantic.rs:462 in download_semantic_model_inner -> src-tauri/src/semantic/model.rs:ModelManager::is_model_available lexical-method
call src-tauri/src/commands/semantic.rs:467 in download_semantic_model_inner -> src-tauri/src/semantic/model.rs:ModelManager::download_model lexical-method
call src-tauri/src/commands/semantic.rs:469 in download_semantic_model_inner -> src-tauri/src/semantic/types.rs:SemanticPhase lexical
call src-tauri/src/commands/semantic.rs:487 in build_semantic_index -> src-tauri/src/commands/semantic.rs:build_semantic_index_inner call
call src-tauri/src/commands/semantic.rs:487 in build_semantic_index -> src-tauri/src/commands/semantic.rs:emit_progress call
call src-tauri/src/commands/semantic.rs:501 in build_semantic_index_inner -> src-tauri/src/utils/logger.rs:debug_log lexical +6
call src-tauri/src/commands/semantic.rs:505 in build_semantic_index_inner -> src-tauri/src/commands/semantic.rs:get_semantic_stats_inner call +2
call src-tauri/src/commands/semantic.rs:515 in build_semantic_index_inner -> src-tauri/src/commands/semantic.rs:compute_model_hash call
call src-tauri/src/commands/semantic.rs:516 in build_semantic_index_inner -> src-tauri/src/commands/semantic.rs:check_and_update_model_hash call
call src-tauri/src/commands/semantic.rs:522 in build_semantic_index_inner -> src-tauri/src/db/mod.rs:with_db lexical +1
call src-tauri/src/commands/semantic.rs:522 in build_semantic_index_inner -> src-tauri/src/db/semantic_repo.rs:clear_all_chunks ref
call src-tauri/src/commands/semantic.rs:525 in build_semantic_index_inner -> src-tauri/src/utils/fs.rs:collect_markdown_paths_with_mtime lexical
call src-tauri/src/commands/semantic.rs:526 in build_semantic_index_inner -> src-tauri/src/db/semantic_repo.rs:get_stored_mtimes ref
call src-tauri/src/commands/semantic.rs:565 in build_semantic_index_inner -> src-tauri/src/commands/semantic.rs:cleanup_orphaned_chunks call +1
call src-tauri/src/commands/semantic.rs:571 in build_semantic_index_inner -> src-tauri/src/commands/semantic.rs:invalidate_search_cache call +1
call src-tauri/src/commands/semantic.rs:576 in build_semantic_index_inner -> src-tauri/src/commands/semantic.rs:schedule_embedder_unload call
call src-tauri/src/commands/semantic.rs:583 in build_semantic_index_inner -> src-tauri/src/semantic/chunker.rs:ChunkOptions lexical
call src-tauri/src/commands/semantic.rs:583 in build_semantic_index_inner -> src-tauri/src/semantic/chunker.rs:ChunkOptions::default lexical
call src-tauri/src/commands/semantic.rs:586 in build_semantic_index_inner -> src-tauri/src/semantic/chunker.rs:chunk_markdown lexical
call src-tauri/src/commands/semantic.rs:605 in build_semantic_index_inner -> src-tauri/src/commands/semantic.rs:clear_changed_files_without_chunks call
call src-tauri/src/commands/semantic.rs:621 in build_semantic_index_inner -> src-tauri/src/semantic/types.rs:SemanticPhase lexical +1
call src-tauri/src/commands/semantic.rs:659 in build_semantic_index_inner -> src-tauri/src/semantic/types.rs:Chunk::embed_text lexical-method
call src-tauri/src/commands/semantic.rs:666 in build_semantic_index_inner -> src-tauri/src/semantic/qos.rs:enter_utility_qos lexical
call src-tauri/src/commands/semantic.rs:670 in build_semantic_index_inner -> src-tauri/src/utils/resource_usage.rs:EmbedPass lexical
call src-tauri/src/commands/semantic.rs:670 in build_semantic_index_inner -> src-tauri/src/utils/resource_usage.rs:EmbedPass::start lexical
call src-tauri/src/commands/semantic.rs:671 in build_semantic_index_inner -> src-tauri/src/semantic/embedder.rs:Embedder::embed_batch lexical-method
call src-tauri/src/commands/semantic.rs:672 in build_semantic_index_inner -> src-tauri/src/utils/logger.rs:is_debug_enabled lexical
call src-tauri/src/commands/semantic.rs:730 in build_semantic_index_inner -> src-tauri/src/db/mod.rs:with_db_transaction lexical
call src-tauri/src/commands/semantic.rs:732 in build_semantic_index_inner -> src-tauri/src/db/semantic_repo.rs:delete_chunks_for_path lexical
call src-tauri/src/commands/semantic.rs:741 in build_semantic_index_inner -> src-tauri/src/db/semantic_repo.rs:insert_chunk lexical
call src-tauri/src/commands/semantic.rs:758 in build_semantic_index_inner -> src-tauri/src/db/semantic_repo.rs:upsert_mtimes lexical
call src-tauri/src/commands/semantic.rs:790 in build_semantic_index_inner -> src-tauri/src/commands/semantic.rs:unload_embedder call
call src-tauri/src/commands/semantic.rs:815 in search_semantic -> src-tauri/src/semantic/qos.rs:enter_utility_qos lexical
call src-tauri/src/commands/semantic.rs:819 in search_semantic -> src-tauri/src/commands/semantic.rs:ensure_embedder_loaded call
call src-tauri/src/commands/semantic.rs:834 in search_semantic -> src-tauri/src/commands/semantic.rs:schedule_embedder_unload call
call src-tauri/src/commands/semantic.rs:838 in search_semantic -> src-tauri/src/commands/semantic.rs:get_or_load_cache call
call src-tauri/src/commands/semantic.rs:876 in search_semantic -> src-tauri/src/semantic/search_timing.rs:RerankTiming lexical +1
call src-tauri/src/commands/semantic.rs:878 in search_semantic -> src-tauri/src/commands/semantic.rs:ensure_reranker_loaded call
call src-tauri/src/commands/semantic.rs:901 in search_semantic -> src-tauri/src/commands/semantic.rs:schedule_reranker_unload call
call src-tauri/src/commands/semantic.rs:922 in search_semantic -> src-tauri/src/semantic/filtering.rs:ScoreKind lexical
call src-tauri/src/commands/semantic.rs:922 in search_semantic -> src-tauri/src/semantic/filtering.rs:ScoreKind::for_search lexical
call src-tauri/src/commands/semantic.rs:924 in search_semantic -> src-tauri/src/semantic/filtering.rs:finalize_results lexical
call src-tauri/src/commands/semantic.rs:925 in search_semantic -> src-tauri/src/utils/logger.rs:debug_log lexical +2
call src-tauri/src/commands/semantic.rs:943 in search_semantic -> src-tauri/src/semantic/filtering.rs:format_score_distribution lexical
call src-tauri/src/commands/semantic.rs:1003 in search_hybrid -> src-tauri/src/commands/search_index.rs:search_fts_inner lexical
call src-tauri/src/commands/semantic.rs:1009 in search_hybrid -> src-tauri/src/semantic/qos.rs:enter_utility_qos lexical
call src-tauri/src/commands/semantic.rs:1011 in search_hybrid -> src-tauri/src/commands/semantic.rs:ensure_embedder_loaded call
call src-tauri/src/commands/semantic.rs:1022 in search_hybrid -> src-tauri/src/commands/semantic.rs:schedule_embedder_unload call
call src-tauri/src/commands/semantic.rs:1024 in search_hybrid -> src-tauri/src/commands/semantic.rs:get_or_load_cache call
call src-tauri/src/commands/semantic.rs:1059 in search_hybrid -> src-tauri/src/search/rrf.rs:rrf_fuse lexical
call src-tauri/src/commands/semantic.rs:1061 in search_hybrid -> src-tauri/src/search/rrf.rs:DEFAULT_RRF_K lexical
call src-tauri/src/commands/semantic.rs:1071 in search_hybrid -> src-tauri/src/search/hybrid.rs:query_terms lexical
call src-tauri/src/commands/semantic.rs:1076 in search_hybrid -> src-tauri/src/search/hybrid.rs:build_pool lexical
call src-tauri/src/commands/semantic.rs:1081 in search_hybrid -> src-tauri/src/search/hybrid.rs:ChunkCandidate lexical
call src-tauri/src/commands/semantic.rs:1103 in search_hybrid -> src-tauri/src/search/hybrid.rs:PoolEntry lexical +1
call src-tauri/src/commands/semantic.rs:1136 in search_hybrid -> src-tauri/src/commands/semantic.rs:ensure_reranker_loaded call
call src-tauri/src/commands/semantic.rs:1138 in search_hybrid -> src-tauri/src/semantic/search_timing.rs:RerankTiming lexical +1
call src-tauri/src/commands/semantic.rs:1163 in search_hybrid -> src-tauri/src/commands/semantic.rs:schedule_reranker_unload call
call src-tauri/src/commands/semantic.rs:1178 in search_hybrid -> src-tauri/src/semantic/filtering.rs:ScoreKind lexical
call src-tauri/src/commands/semantic.rs:1178 in search_hybrid -> src-tauri/src/semantic/filtering.rs:ScoreKind::for_search lexical
call src-tauri/src/commands/semantic.rs:1179 in search_hybrid -> src-tauri/src/semantic/filtering.rs:finalize_results lexical
call src-tauri/src/commands/semantic.rs:1180 in search_hybrid -> src-tauri/src/utils/logger.rs:debug_log lexical +2
call src-tauri/src/commands/semantic.rs:1221 in get_semantic_stats -> src-tauri/src/commands/semantic.rs:get_semantic_stats_inner call
call src-tauri/src/commands/semantic.rs:1239 in get_semantic_file_status -> src-tauri/src/db/mod.rs:with_db lexical
call src-tauri/src/commands/semantic.rs:1239 in get_semantic_file_status -> src-tauri/src/db/semantic_repo.rs:get_file_index_info lexical
call src-tauri/src/commands/semantic.rs:1254 in shutdown_semantic -> src-tauri/src/utils/logger.rs:debug_log lexical
call src-tauri/src/commands/semantic.rs:1262 in shutdown_semantic -> src-tauri/src/commands/semantic.rs:invalidate_search_cache call
call src-tauri/src/commands/semantic.rs:1284 in remove_semantic_file -> src-tauri/src/db/mod.rs:with_db_transaction lexical
call src-tauri/src/commands/semantic.rs:1285 in remove_semantic_file -> src-tauri/src/db/semantic_repo.rs:delete_chunks_for_path lexical
call src-tauri/src/commands/semantic.rs:1286 in remove_semantic_file -> src-tauri/src/db/semantic_repo.rs:delete_mtime lexical
call src-tauri/src/commands/semantic.rs:1293 in remove_semantic_file -> src-tauri/src/utils/logger.rs:debug_log lexical
call src-tauri/src/commands/semantic.rs:1294 in remove_semantic_file -> src-tauri/src/commands/semantic.rs:invalidate_search_cache call
call src-tauri/src/commands/semantic.rs:1311 in update_semantic_file -> src-tauri/src/semantic/chunker.rs:ChunkOptions lexical
call src-tauri/src/commands/semantic.rs:1311 in update_semantic_file -> src-tauri/src/semantic/chunker.rs:ChunkOptions::default lexical
call src-tauri/src/commands/semantic.rs:1312 in update_semantic_file -> src-tauri/src/semantic/chunker.rs:chunk_markdown lexical
call src-tauri/src/commands/semantic.rs:1316 in update_semantic_file -> src-tauri/src/db/mod.rs:with_db_transaction lexical +1
call src-tauri/src/commands/semantic.rs:1317 in update_semantic_file -> src-tauri/src/db/semantic_repo.rs:delete_chunks_for_path lexical
call src-tauri/src/commands/semantic.rs:1320 in update_semantic_file -> src-tauri/src/commands/semantic.rs:update_stored_mtime call +2
call src-tauri/src/commands/semantic.rs:1321 in update_semantic_file -> src-tauri/src/commands/semantic.rs:invalidate_search_cache call +1
call src-tauri/src/commands/semantic.rs:1328 in update_semantic_file -> src-tauri/src/db/mod.rs:with_db lexical +1
call src-tauri/src/commands/semantic.rs:1329 in update_semantic_file -> src-tauri/src/db/semantic_repo.rs:get_chunk_hashes_for_path lexical
call src-tauri/src/commands/semantic.rs:1331 in update_semantic_file -> src-tauri/src/semantic/update_plan.rs:plan_file_update lexical
call src-tauri/src/commands/semantic.rs:1334 in update_semantic_file -> src-tauri/src/semantic/update_plan.rs:UpdatePlan::is_noop lexical-method
call src-tauri/src/commands/semantic.rs:1335 in update_semantic_file -> src-tauri/src/utils/logger.rs:debug_log lexical +4
call src-tauri/src/commands/semantic.rs:1345 in update_semantic_file -> src-tauri/src/semantic/types.rs:Chunk lexical
call src-tauri/src/commands/semantic.rs:1351 in update_semantic_file -> src-tauri/src/db/semantic_repo.rs:get_chunk_embedding lexical
call src-tauri/src/commands/semantic.rs:1370 in update_semantic_file -> src-tauri/src/semantic/qos.rs:enter_utility_qos lexical
call src-tauri/src/commands/semantic.rs:1373 in update_semantic_file -> src-tauri/src/commands/semantic.rs:ensure_embedder_loaded call
call src-tauri/src/commands/semantic.rs:1391 in update_semantic_file -> src-tauri/src/semantic/types.rs:Chunk::embed_text lexical-method
call src-tauri/src/commands/semantic.rs:1394 in update_semantic_file -> src-tauri/src/utils/resource_usage.rs:EmbedPass lexical
call src-tauri/src/commands/semantic.rs:1394 in update_semantic_file -> src-tauri/src/utils/resource_usage.rs:EmbedPass::start lexical
call src-tauri/src/commands/semantic.rs:1395 in update_semantic_file -> src-tauri/src/semantic/embedder.rs:Embedder::embed_batch lexical-method
call src-tauri/src/commands/semantic.rs:1396 in update_semantic_file -> src-tauri/src/utils/logger.rs:is_debug_enabled lexical
call src-tauri/src/commands/semantic.rs:1403 in update_semantic_file -> src-tauri/src/commands/semantic.rs:schedule_embedder_unload call
call src-tauri/src/commands/semantic.rs:1416 in update_semantic_file -> src-tauri/src/db/semantic_repo.rs:delete_chunk_by_key lexical
call src-tauri/src/commands/semantic.rs:1422 in update_semantic_file -> src-tauri/src/db/semantic_repo.rs:insert_chunk lexical +1
call src-tauri/src/commands/semantic.rs:1501 in update_stored_mtime -> src-tauri/src/utils/logger.rs:debug_log lexical
call src-tauri/src/commands/semantic.rs:1504 in update_stored_mtime -> src-tauri/src/db/mod.rs:with_db lexical
call src-tauri/src/commands/semantic.rs:1505 in update_stored_mtime -> src-tauri/src/db/semantic_repo.rs:upsert_mtimes lexical
call src-tauri/src/commands/semantic.rs:1513 in get_semantic_stats_inner -> src-tauri/src/db/mod.rs:with_db lexical
call src-tauri/src/commands/semantic.rs:1514 in get_semantic_stats_inner -> src-tauri/src/db/semantic_repo.rs:count_chunks lexical
call src-tauri/src/commands/semantic.rs:1515 in get_semantic_stats_inner -> src-tauri/src/db/semantic_repo.rs:count_sources lexical
call src-tauri/src/commands/semantic.rs:1533 in cleanup_orphaned_chunks -> src-tauri/src/db/mod.rs:with_db_transaction lexical
call src-tauri/src/commands/semantic.rs:1534 in cleanup_orphaned_chunks -> src-tauri/src/db/semantic_repo.rs:get_distinct_sources lexical
call src-tauri/src/commands/semantic.rs:1539 in cleanup_orphaned_chunks -> src-tauri/src/db/semantic_repo.rs:delete_chunks_for_path lexical
call src-tauri/src/commands/semantic.rs:1541 in cleanup_orphaned_chunks -> src-tauri/src/utils/logger.rs:debug_log lexical +1
call src-tauri/src/commands/semantic.rs:1549 in cleanup_orphaned_chunks -> src-tauri/src/db/semantic_repo.rs:delete_orphaned_mtimes lexical
call src-tauri/src/commands/semantic.rs:1586 in clear_changed_files_without_chunks -> src-tauri/src/db/mod.rs:with_db_transaction lexical
call src-tauri/src/commands/semantic.rs:1588 in clear_changed_files_without_chunks -> src-tauri/src/db/semantic_repo.rs:delete_chunks_for_path lexical
call src-tauri/src/commands/semantic.rs:1590 in clear_changed_files_without_chunks -> src-tauri/src/db/semantic_repo.rs:upsert_mtimes lexical
call src-tauri/src/commands/semantic.rs:1635 in check_and_update_model_hash -> src-tauri/src/db/mod.rs:with_db lexical +1
call src-tauri/src/commands/semantic.rs:1635 in check_and_update_model_hash -> src-tauri/src/db/semantic_repo.rs:get_meta lexical
call src-tauri/src/commands/semantic.rs:1640 in check_and_update_model_hash -> src-tauri/src/db/semantic_repo.rs:upsert_meta lexical
## ipc-in
ipc-call src/lib/features/search/search.service.ts:351 in initSemanticSearch -> ipc:init_semantic_search -> src-tauri/src/commands/semantic.rs:371
ipc-call src/lib/features/search/SearchSection.svelte:68 in handleToggle -> ipc:is_semantic_model_available -> src-tauri/src/commands/semantic.rs:399
ipc-call src/lib/features/search/search.service.ts:345 in initSemanticSearch -> ipc:is_semantic_model_available -> src-tauri/src/commands/semantic.rs:399
ipc-call src/lib/features/search/SearchSection.svelte:29 in refreshRerankerStatus -> ipc:is_reranker_model_available -> src-tauri/src/commands/semantic.rs:406
ipc-call src/lib/features/search/SearchSection.svelte:46 in handleRerankerDownload -> ipc:download_reranker_model -> src-tauri/src/commands/semantic.rs:422
ipc-call src/lib/features/search/SearchSection.svelte:74 in handleToggle -> ipc:download_semantic_model -> src-tauri/src/commands/semantic.rs:452
ipc-call src/lib/features/search/search.service.ts:392 in buildSemanticIndex -> ipc:build_semantic_index -> src-tauri/src/commands/semantic.rs:483
ipc-call src/lib/features/search/search.service.ts:249 in performSearch -> ipc:search_semantic -> src-tauri/src/commands/semantic.rs:798
ipc-call src/lib/features/search/search.service.ts:150 in performSearch -> ipc:search_hybrid -> src-tauri/src/commands/semantic.rs:986
ipc-call src/lib/features/search/search.service.ts:354 in initSemanticSearch -> ipc:get_semantic_stats -> src-tauri/src/commands/semantic.rs:1220
ipc-call src/lib/features/search/SemanticIndexStatus.svelte:44 in $effect@29 -> ipc:get_semantic_file_status -> src-tauri/src/commands/semantic.rs:1235
ipc-call src/lib/app/lifecycle/app-lifecycle.service.ts:632 in teardownVault -> ipc:shutdown_semantic -> src-tauri/src/commands/semantic.rs:1253
ipc-call src/lib/core/filesystem/note-change.service.ts:222 in applyNoteChange -> ipc:remove_semantic_file -> src-tauri/src/commands/semantic.rs:1282
ipc-call src/lib/core/filesystem/note-change.service.ts:257 in applyNoteChange -> ipc:update_semantic_file -> src-tauri/src/commands/semantic.rs:1305
ipc-call src/lib/features/search/search.service.ts:326 in registerSearchIndexHook -> ipc:update_semantic_file -> src-tauri/src/commands/semantic.rs:1305
## effects
fx src-tauri/src/commands/semantic.rs:324 rust-spawn.spawn in schedule_reranker_unload
fx src-tauri/src/commands/semantic.rs:325 rust-timer.sleep in schedule_reranker_unload
fx src-tauri/src/commands/semantic.rs:336 rust-spawn.spawn in schedule_embedder_unload
fx src-tauri/src/commands/semantic.rs:337 rust-timer.sleep in schedule_embedder_unload
ev src-tauri/src/commands/semantic.rs:414 in emit_progress -> event:semantic-index-progress -> src/lib/features/search/search.service.ts:85 in startSemanticProgressListener
