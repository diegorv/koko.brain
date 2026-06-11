use crate::db;
use crate::semantic::chunker::{chunk_markdown, ChunkOptions};
use crate::semantic::embedder::{cosine_similarity, Embedder};
use crate::semantic::filtering;
use crate::semantic::model::ModelManager;
use crate::semantic::reranker::Reranker;
use crate::semantic::types::{SemanticFileStatus, SemanticProgress, SemanticResult, SemanticStats};
use crate::utils::fs as vault_fs;
use crate::utils::logger::debug_log;
use sha2::{Digest, Sha256};
use std::collections::HashSet;
use std::path::Path;
use std::sync::atomic::{AtomicBool, AtomicU64, Ordering};
use std::sync::{Arc, Mutex};
use tauri::{AppHandle, Emitter};

/// Global embedder instance. Lazy-loaded on demand, auto-unloaded after idle timeout.
static EMBEDDER: Mutex<Option<Embedder>> = Mutex::new(None);

/// Stored vault path for lazy-reloading the embedder after it's been unloaded.
static VAULT_PATH: Mutex<Option<String>> = Mutex::new(None);

/// Generation counter for debounced unload. Each use bumps this; only the latest
/// scheduled unload fires (if the generation hasn't changed since scheduling).
static UNLOAD_GENERATION: AtomicU64 = AtomicU64::new(0);

/// Tracks whether the embedder was successfully loaded at least once this session.
/// Stays true even after idle/post-index unloads (the model lazy-reloads on demand).
/// Reset only on `shutdown_semantic` (vault close / switch).
static MODEL_AVAILABLE: AtomicBool = AtomicBool::new(false);

/// Seconds of inactivity before the embedder is automatically unloaded to free memory.
const EMBEDDER_IDLE_TIMEOUT_SECS: u64 = 120;

/// Global reranker instance. Lazy-loaded on first rerank call, auto-unloaded
/// after `RERANKER_IDLE_TIMEOUT_SECS` of inactivity. The reranker model is
/// optional — if the file isn't on disk, `search_semantic` falls back to
/// pure cosine ranking and emits a debug log.
static RERANKER: Mutex<Option<Reranker>> = Mutex::new(None);

/// Independent generation counter for the reranker's debounced unload.
static RERANKER_UNLOAD_GENERATION: AtomicU64 = AtomicU64::new(0);

/// Seconds of inactivity before the reranker is automatically unloaded
/// (~571MB INT8 ONNX session). Same 120s policy as the embedder.
const RERANKER_IDLE_TIMEOUT_SECS: u64 = 120;

/// Top-N candidates fetched from cosine ranking before they get passed to the
/// reranker. The reranker promotes/demotes within this pool, so make it big
/// enough that the truly-relevant doc is almost always in the pool, small
/// enough that 50 pair inferences finish under ~500ms on CPU.
const RERANK_CANDIDATE_POOL: usize = 50;

/// Cached pre-deserialized embeddings to avoid reloading from DB on every search.
static SEARCH_CACHE: Mutex<Option<Arc<Vec<CachedChunk>>>> = Mutex::new(None);

/// Guard to prevent concurrent `build_semantic_index` invocations.
/// Only one build can run at a time; subsequent calls skip with a log message.
static BUILD_LOCK: tokio::sync::Mutex<()> = tokio::sync::Mutex::const_new(());

/// A chunk with its embedding already deserialized from bytes to f32.
struct CachedChunk {
	key: String,
	source_path: String,
	content: String,
	heading: Option<String>,
	line_start: usize,
	line_end: usize,
	embedding: Vec<f32>,
}

/// Clears the search cache. Must be called after any index modification.
fn invalidate_search_cache() {
	if let Ok(mut cache) = SEARCH_CACHE.lock() {
		*cache = None;
		debug_log("SEMANTIC", "Search cache invalidated");
	}
}

/// Deserializes an embedding blob (little-endian f32s) or returns `None` for
/// a malformed blob whose length is not a multiple of 4. The embedder always
/// emits dim*4 bytes, so a remainder means DB corruption; truncating it
/// silently (the old `chunks_exact` behavior, audit finding #12) produced a
/// vector that never matched anything with no diagnostic signal.
pub fn deserialize_embedding(bytes: &[u8]) -> Option<Vec<f32>> {
	if bytes.len() % 4 != 0 {
		return None;
	}
	Some(
		bytes
			.chunks_exact(4)
			.map(|b| f32::from_le_bytes([b[0], b[1], b[2], b[3]]))
			.collect(),
	)
}

/// Loads embeddings from DB into cache, or returns the existing cache.
fn get_or_load_cache() -> Result<Arc<Vec<CachedChunk>>, String> {
	let mut cache = SEARCH_CACHE.lock().map_err(|e| format!("Lock error: {e}"))?;
	if let Some(ref cached) = *cache {
		debug_log("SEMANTIC", format!("Search cache hit ({} chunks)", cached.len()));
		return Ok(Arc::clone(cached));
	}

	debug_log("SEMANTIC", "Search cache miss — loading from DB");
	let chunks = db::with_db(|conn| {
		let rows = db::semantic_repo::load_all_embeddings(conn)?;
		let chunks: Vec<CachedChunk> = rows
			.into_iter()
			.filter_map(|row| {
				let Some(embedding) = deserialize_embedding(&row.embedding_bytes) else {
					debug_log(
						"SEMANTIC",
						format!(
							"Warning: skipping chunk {} — malformed embedding blob ({} bytes, not a multiple of 4)",
							row.key,
							row.embedding_bytes.len()
						),
					);
					return None;
				};
				Some(CachedChunk {
					key: row.key,
					source_path: row.source_path,
					content: row.content,
					heading: row.heading,
					line_start: row.line_start as usize,
					line_end: row.line_end as usize,
					embedding,
				})
			})
			.collect();
		Ok(chunks)
	})?;

	let arc = Arc::new(chunks);
	*cache = Some(Arc::clone(&arc));
	debug_log("SEMANTIC", format!("Search cache loaded: {} chunks", arc.len()));
	Ok(arc)
}

/// Unloads the ONNX model to free memory (typically ~2-4 GB RSS).
fn unload_embedder() {
	if let Ok(mut guard) = EMBEDDER.lock() {
		if guard.is_some() {
			*guard = None;
			debug_log("SEMANTIC", "Embedder unloaded to free memory");
		}
	}
}

/// Ensures the embedder is loaded, reloading from stored vault path if needed.
/// Returns an error if no vault path is stored (init_semantic_search was never called).
fn ensure_embedder_loaded() -> Result<(), String> {
	// Hold the lock across the entire load so a concurrent caller blocks
	// here, then observes `Some(_)` on its turn instead of also loading.
	let mut guard = EMBEDDER.lock().map_err(|e| format!("Lock error: {e}"))?;
	if guard.is_some() {
		return Ok(());
	}

	let vault_path = {
		let vp = VAULT_PATH.lock().map_err(|e| format!("Lock error: {e}"))?;
		vp.clone().ok_or_else(|| "No vault path stored — init_semantic_search was never called".to_string())?
	};

	debug_log("SEMANTIC", "Lazy-reloading embedder...");
	let manager = ModelManager::for_embedder(Path::new(&vault_path));
	if !manager.is_model_available() {
		return Err("Model not available on disk".to_string());
	}
	let expected_dim = manager
		.embedding_dimensions()
		.ok_or_else(|| "Embedder model has no declared embedding_dimensions in the registry".to_string())?;
	let embedder = Embedder::load(&manager.model_path(), expected_dim)?;
	*guard = Some(embedder);
	debug_log("SEMANTIC", "Embedder lazy-reloaded");
	Ok(())
}

/// Unloads the reranker model to free memory (~571MB).
fn unload_reranker() {
	if let Ok(mut guard) = RERANKER.lock() {
		if guard.is_some() {
			*guard = None;
			debug_log("RERANKER", "Reranker unloaded to free memory");
		}
	}
}

/// Lazy-loads the reranker if its files are on disk. Returns `Ok(true)` when
/// the reranker is ready, `Ok(false)` when the model isn't downloaded yet
/// (caller should fall back to cosine-only ranking). Errors are reserved for
/// corrupt model files or session-construction failures.
fn ensure_reranker_loaded() -> Result<bool, String> {
	// Hold the lock across the entire load so a concurrent caller blocks
	// here, then observes `Some(_)` on its turn instead of also loading.
	let mut guard = RERANKER.lock().map_err(|e| format!("Lock error: {e}"))?;
	if guard.is_some() {
		return Ok(true);
	}

	let vault_path = {
		let vp = VAULT_PATH.lock().map_err(|e| format!("Lock error: {e}"))?;
		match vp.clone() {
			Some(p) => p,
			None => return Ok(false),
		}
	};

	let manager = ModelManager::for_reranker(Path::new(&vault_path));
	if !manager.is_model_available() {
		// Not an error — reranker is opt-in via download.
		return Ok(false);
	}

	debug_log("RERANKER", "Lazy-loading reranker...");
	let reranker = Reranker::load(&manager.model_path())?;
	*guard = Some(reranker);
	debug_log("RERANKER", "Reranker lazy-loaded");
	Ok(true)
}

/// Schedules a reranker unload after the idle timeout. Independent generation
/// counter from the embedder so the two unload timers don't interfere.
fn schedule_reranker_unload() {
	let gen = RERANKER_UNLOAD_GENERATION.fetch_add(1, Ordering::SeqCst) + 1;
	tokio::spawn(async move {
		tokio::time::sleep(std::time::Duration::from_secs(RERANKER_IDLE_TIMEOUT_SECS)).await;
		if RERANKER_UNLOAD_GENERATION.load(Ordering::SeqCst) == gen {
			unload_reranker();
		}
	});
}

/// Schedules an embedder unload after the idle timeout. Uses a generation counter
/// so that subsequent calls cancel previous timers — only the latest one fires.
fn schedule_embedder_unload() {
	let gen = UNLOAD_GENERATION.fetch_add(1, Ordering::SeqCst) + 1;
	tokio::spawn(async move {
		tokio::time::sleep(std::time::Duration::from_secs(EMBEDDER_IDLE_TIMEOUT_SECS)).await;
		if UNLOAD_GENERATION.load(Ordering::SeqCst) == gen {
			unload_embedder();
		}
	});
}

/// Loads the ONNX model into the static embedder. Call once after vault open.
/// Runs model loading on a blocking thread to avoid freezing the UI.
#[tauri::command]
pub async fn init_semantic_search(vault_path: String) -> Result<bool, String> {
	tokio::task::spawn_blocking(move || {
		// Store vault path for lazy-reloading after idle unload
		if let Ok(mut vp) = VAULT_PATH.lock() {
			*vp = Some(vault_path.clone());
		}

		let manager = ModelManager::for_embedder(Path::new(&vault_path));
		if !manager.is_model_available() {
			return Ok(false);
		}

		let expected_dim = manager
			.embedding_dimensions()
			.ok_or_else(|| "Embedder model has no declared embedding_dimensions in the registry".to_string())?;
		let embedder = Embedder::load(&manager.model_path(), expected_dim)?;
		let mut guard = EMBEDDER.lock().map_err(|e| format!("Lock error: {e}"))?;
		*guard = Some(embedder);
		MODEL_AVAILABLE.store(true, Ordering::SeqCst);
		Ok(true)
	})
	.await
	.map_err(|e| format!("Task join error: {e}"))?
}

/// Checks if the ONNX model files are available on disk.
#[tauri::command]
pub fn is_semantic_model_available(vault_path: String) -> Result<bool, String> {
	let manager = ModelManager::for_embedder(Path::new(&vault_path));
	Ok(manager.is_model_available())
}

/// Checks if the reranker model files are available on disk.
#[tauri::command]
pub fn is_reranker_model_available(vault_path: String) -> Result<bool, String> {
	let manager = ModelManager::for_reranker(Path::new(&vault_path));
	Ok(manager.is_model_available())
}

/// Downloads the BGE-reranker-v2-m3 INT8 ONNX model (~571MB) into
/// `.kokobrain/models/bge-reranker-v2-m3/`. Emits progress on the same
/// `semantic-index-progress` channel under the `downloading-reranker` phase.
#[tauri::command]
pub async fn download_reranker_model(vault_path: String, app: AppHandle) -> Result<bool, String> {
	let manager = ModelManager::for_reranker(Path::new(&vault_path));
	if manager.is_model_available() {
		return Ok(true);
	}

	manager
		.download_model(|progress| {
			let _ = app.emit(
				"semantic-index-progress",
				SemanticProgress {
					phase: "downloading-reranker".to_string(),
					current: (progress * 100.0) as usize,
					total: 100,
					message: format!("Downloading reranker... {}%", (progress * 100.0) as usize),
				},
			);
		})
		.await?;

	Ok(true)
}

/// Downloads the ONNX model from HuggingFace Hub, emitting progress events.
#[tauri::command]
pub async fn download_semantic_model(vault_path: String, app: AppHandle) -> Result<bool, String> {
	let manager = ModelManager::for_embedder(Path::new(&vault_path));
	if manager.is_model_available() {
		return Ok(true);
	}

	manager
		.download_model(|progress| {
			let _ = app.emit(
				"semantic-index-progress",
				SemanticProgress {
					phase: "downloading".to_string(),
					current: (progress * 100.0) as usize,
					total: 100,
					message: format!("Downloading model... {}%", (progress * 100.0) as usize),
				},
			);
		})
		.await?;

	Ok(true)
}

/// Builds the semantic index: chunks all markdown files, embeds changed chunks, stores in DB.
/// Emits `semantic-index-progress` events via the app handle.
/// Detects model changes (e.g. E5 → BGE-M3) and forces full re-embedding when needed.
/// Heavy I/O and inference run on blocking threads to keep the UI responsive.
/// Only one build runs at a time — concurrent calls are skipped.
#[tauri::command]
pub async fn build_semantic_index(
	vault_path: String,
	app: AppHandle,
) -> Result<SemanticStats, String> {
	let guard = BUILD_LOCK.try_lock();
	if guard.is_err() {
		debug_log(
			"SEMANTIC",
			"build_semantic_index already running — skipping concurrent call",
		);
		return get_semantic_stats_inner();
	}
	// Hold _guard for the duration of the build; released on drop.
	let _guard = guard.unwrap();

	let vault_for_phase1 = vault_path.clone();

	// Phase 1: Collect files, check mtimes, read changed files (all blocking I/O)
	let (changed_files, all_paths, model_changed) = tokio::task::spawn_blocking(move || {
		let vault = Path::new(&vault_for_phase1);
		let model_hash = compute_model_hash(vault);
		let model_changed = check_and_update_model_hash(&model_hash)?;
		if model_changed {
			debug_log(
				"SEMANTIC",
				"Model changed — clearing all embeddings for full re-index",
			);
			db::with_db(|conn| db::semantic_repo::clear_all_chunks(conn))?;
		}

		let file_entries = vault_fs::collect_markdown_paths_with_mtime(vault, EXCLUDED_FOLDERS)?;
		let stored_mtimes = db::with_db(|conn| db::semantic_repo::get_stored_mtimes(conn))?;

		let total_files = file_entries.len();
		let mut changed_files: Vec<(String, String, i64)> = Vec::new();
		let mut all_paths: Vec<String> = Vec::new();

		for (rel_path, abs_path, mtime) in &file_entries {
			all_paths.push(rel_path.clone());

			let stored = stored_mtimes.get(rel_path).copied().unwrap_or(-1);
			if model_changed || *mtime != stored {
				if let Ok(content) = std::fs::read_to_string(abs_path) {
					changed_files.push((rel_path.clone(), content, *mtime));
				}
			}
		}

		debug_log(
			"SEMANTIC",
			format!(
				"Files: {} total, {} changed (skipped {} unchanged)",
				total_files,
				changed_files.len(),
				total_files - changed_files.len()
			),
		);

		Ok::<_, String>((changed_files, all_paths, model_changed))
	})
	.await
	.map_err(|e| format!("Task join error: {e}"))??;

	// If nothing changed, skip chunking + embedding entirely
	if changed_files.is_empty() && !model_changed {
		debug_log(
			"SEMANTIC",
			"No changes detected — skipping chunking + embedding",
		);
		let all_paths_clone = all_paths.clone();
		tokio::task::spawn_blocking(move || cleanup_orphaned_chunks(&all_paths_clone))
			.await
			.map_err(|e| format!("Task join error: {e}"))??;
		return get_semantic_stats_inner();
	}

	// Phase 2: Chunk changed files (CPU-bound, run on blocking thread)
	let changed_files_for_chunk = changed_files.clone();
	let all_chunks = tokio::task::spawn_blocking(move || {
		let options = ChunkOptions::default();
		let mut all_chunks = Vec::new();
		for (rel_path, content, _mtime) in &changed_files_for_chunk {
			let chunks = chunk_markdown(rel_path, content, &options);
			all_chunks.extend(chunks);
		}
		// Old chunks are NOT deleted here — deletion happens atomically with
		// insertion in Phase 3 to prevent data loss if embedding fails mid-batch.
		Ok::<_, String>(all_chunks)
	})
	.await
	.map_err(|e| format!("Task join error: {e}"))??;

	// Phase 2.5: changed files that produced no chunks (emptied / below the
	// min-chunk threshold) never enter an embed batch, so Phase 3 won't clear
	// their stale chunks or advance their mtime. Handle them here. (Owned
	// copies so nothing borrows `all_chunks` into Phase 3.)
	let changed_for_empty: Vec<(String, i64)> =
		changed_files.iter().map(|(p, _, m)| (p.clone(), *m)).collect();
	let chunked_paths: HashSet<String> =
		all_chunks.iter().map(|c| c.source_path.clone()).collect();
	let cleared_empty = tokio::task::spawn_blocking(move || {
		clear_changed_files_without_chunks(&changed_for_empty, &chunked_paths)
	})
	.await
	.map_err(|e| format!("Task join error: {e}"))??;
	if !cleared_empty.is_empty() {
		debug_log(
			"SEMANTIC",
			format!(
				"{} changed file(s) produced no chunks — cleared stale chunks + persisted mtime",
				cleared_empty.len()
			),
		);
	}

	let changed_paths: Vec<String> = changed_files.iter().map(|(p, _, _)| p.clone()).collect();
	let _ = app.emit(
		"semantic-index-progress",
		SemanticProgress {
			phase: "chunking".to_string(),
			current: changed_paths.len(),
			total: changed_paths.len(),
			message: format!("Chunked {} files", changed_paths.len()),
		},
	);

	// Phase 3: Embed new/changed chunks — run each batch on blocking thread.
	// Old chunks are deleted atomically with insertion (per-batch transaction).
	// Mtimes are saved incrementally: once a file's last chunk is embedded,
	// its mtime is persisted in the same transaction. This enables resuming
	// from where we left off if the app is closed mid-embedding.
	let total_to_embed = all_chunks.len();
	let mut deleted_paths: HashSet<String> = HashSet::new();
	if total_to_embed > 0 {
		let batch_size = 4;
		let chunk_indices: Vec<usize> = (0..all_chunks.len()).collect();

		// Build path → mtime lookup for incremental mtime saves
		let path_to_mtime: std::collections::HashMap<String, i64> = changed_files
			.iter()
			.map(|(p, _, m)| (p.clone(), *m))
			.collect();

		// For each source_path, find the index of its last chunk in all_chunks.
		// Chunks are contiguous per file (Phase 2 iterates files sequentially).
		// Once a batch includes a file's last chunk, that file is fully embedded.
		let mut last_chunk_idx: std::collections::HashMap<String, usize> =
			std::collections::HashMap::new();
		for (idx, chunk) in all_chunks.iter().enumerate() {
			last_chunk_idx.insert(chunk.source_path.clone(), idx);
		}

		for (batch_idx, batch) in chunk_indices.chunks(batch_size).enumerate() {
			// `embed_text()` prepends parent_headings so the model sees topical
			// context (e.g. "Stoicism > Practical applications > Daily journaling")
			// before the chunk body. Display `content` stays original.
			let texts: Vec<String> = batch
				.iter()
				.map(|&i| all_chunks[i].embed_text())
				.collect();

			// Run ONNX inference on blocking thread to avoid starving the async runtime
			let total_batches = (all_chunks.len() + batch_size - 1) / batch_size;
			debug_log("EMBEDDER", format!("Index batch {}/{} — {} chunks", batch_idx + 1, total_batches, batch.len()));
			let embeddings = tokio::task::spawn_blocking(move || {
				let mut guard = EMBEDDER.lock().map_err(|e| format!("Lock error: {e}"))?;
				let embedder = guard.as_mut().ok_or("Embedder not initialized")?;
				let text_refs: Vec<&str> = texts.iter().map(|s| s.as_str()).collect();
				embedder.embed_batch(&text_refs)
			})
			.await
			.map_err(|e| format!("Task join error: {e}"))??;

			// Collect source_paths in this batch that haven't been cleaned yet
			let paths_to_delete: Vec<String> = batch
				.iter()
				.map(|&i| all_chunks[i].source_path.clone())
				.collect::<HashSet<_>>()
				.into_iter()
				.filter(|p| !deleted_paths.contains(p))
				.collect();
			deleted_paths.extend(paths_to_delete.iter().cloned());

			// Collect data for DB insert (owned values for spawn_blocking)
			let db_entries: Vec<_> = batch
				.iter()
				.enumerate()
				.map(|(j, &chunk_idx)| {
					let chunk = &all_chunks[chunk_idx];
					let embedding_bytes: Vec<u8> = embeddings[j]
						.iter()
						.flat_map(|f| f.to_le_bytes())
						.collect();
					(
						chunk.key.clone(),
						chunk.source_path.clone(),
						chunk.content.clone(),
						chunk.heading.clone(),
						chunk.parent_headings.clone(),
						chunk.line_start as i64,
						chunk.line_end as i64,
						chunk.content_hash.clone(),
						embedding_bytes,
					)
				})
				.collect();

			// Find files whose last chunk is in this batch — they are fully embedded
			// and their mtime can be saved to enable resuming on restart.
			let batch_end = *batch.last().unwrap_or(&0);
			let batch_paths: HashSet<String> = batch
				.iter()
				.map(|&i| all_chunks[i].source_path.clone())
				.collect();
			let completed_mtimes: Vec<(String, i64)> = batch_paths
				.iter()
				.filter(|p| last_chunk_idx.get(*p).copied().unwrap_or(0) <= batch_end)
				.filter_map(|p| path_to_mtime.get(p).map(|&m| (p.clone(), m)))
				.collect();

			// Delete old + insert new + save completed mtimes in a single transaction.
			// If insert fails, delete is rolled back — no data loss.
			tokio::task::spawn_blocking(move || {
				db::with_db_transaction("semantic index batch", |conn| {
					for path in &paths_to_delete {
						db::semantic_repo::delete_chunks_for_path(conn, path)?;
					}

					let now = std::time::SystemTime::now()
						.duration_since(std::time::UNIX_EPOCH)
						.map(|d| d.as_millis() as i64)
						.unwrap_or(0);

					for (key, source_path, content, heading, parent_headings, line_start, line_end, content_hash, embedding_bytes) in &db_entries {
						db::semantic_repo::insert_chunk(
							conn,
							key,
							source_path,
							content,
							heading.as_deref(),
							parent_headings,
							*line_start,
							*line_end,
							content_hash,
							embedding_bytes,
							now,
						)?;
					}

					// Persist mtimes for fully-embedded files (enables resume on restart)
					if !completed_mtimes.is_empty() {
						db::semantic_repo::upsert_mtimes(conn, &completed_mtimes)?;
					}
					Ok(())
				})
			})
			.await
			.map_err(|e| format!("Task join error: {e}"))??;

			let processed = (batch_idx + 1) * batch_size;
			let _ = app.emit(
				"semantic-index-progress",
				SemanticProgress {
					phase: "embedding".to_string(),
					current: processed.min(total_to_embed),
					total: total_to_embed,
					message: format!(
						"Embedding chunks... {}/{}",
						processed.min(total_to_embed),
						total_to_embed
					),
				},
			);
		}
	}

	// Phase 4: Clean up orphaned chunks (blocking I/O)
	// Mtimes are already saved incrementally per-batch in Phase 3.
	tokio::task::spawn_blocking(move || cleanup_orphaned_chunks(&all_paths))
		.await
		.map_err(|e| format!("Task join error: {e}"))??;

	invalidate_search_cache();

	// Unload the embedder immediately after indexing to free ~2-4 GB of RSS.
	// Subsequent search/update calls will lazy-reload as needed.
	unload_embedder();

	get_semantic_stats_inner()
}

/// Searches semantic index by embedding the query and computing cosine similarity.
/// Runs inference and similarity computation on a blocking thread.
#[tauri::command]
pub async fn search_semantic(
	query: String,
	max_results: Option<usize>,
	min_score: Option<f32>,
) -> Result<Vec<SemanticResult>, String> {
	let trimmed = query.trim().to_string();
	if trimmed.is_empty() || trimmed.chars().count() < 3 {
		return Ok(Vec::new());
	}

	tokio::task::spawn_blocking(move || {
		let limit = max_results.unwrap_or(20);
		let threshold = min_score.unwrap_or(0.3);

		// Lazy-reload embedder if it was unloaded after indexing
		ensure_embedder_loaded()?;

		// Embed the query text (try_lock to avoid blocking during indexing)
		let query_embedding = {
			let mut guard = EMBEDDER.try_lock().map_err(|_| {
				"Semantic search is temporarily unavailable while indexing is in progress"
					.to_string()
			})?;
			let embedder = guard.as_mut().ok_or("Embedder not initialized")?;
			embedder.embed(&trimmed)?
		};

		// Schedule auto-unload after idle timeout
		schedule_embedder_unload();

		// Load chunks from cache (avoids re-reading DB + re-deserializing on every search)
		let cached_chunks = get_or_load_cache()?;

		// Stage 1: cosine ranking. Filter on the user-supplied min_score (still
		// cheap), then keep enough candidates to feed the reranker. When the
		// reranker is not available we collapse this back to the old single
		// stage by skipping rerank below.
		let mut candidates: Vec<SemanticResult> = cached_chunks
			.iter()
			.map(|chunk| {
				let score = cosine_similarity(&query_embedding, &chunk.embedding);
				SemanticResult {
					key: chunk.key.clone(),
					source_path: chunk.source_path.clone(),
					content: chunk.content.clone(),
					heading: chunk.heading.clone(),
					line_start: chunk.line_start,
					line_end: chunk.line_end,
					score,
				}
			})
			.filter(|r| r.score >= threshold)
			.collect();
		candidates.sort_by(|a, b| b.score.total_cmp(&a.score));

		// Stage 2: rerank the top RERANK_CANDIDATE_POOL with BGE-reranker-v2-m3
		// when its model is on disk. We replace each candidate's `score` with
		// the rerank logit so adaptive filtering downstream sees the more
		// meaningful signal. If the reranker isn't downloaded we silently fall
		// back to cosine ordering — search still works, just at lower quality.
		let pool_size = RERANK_CANDIDATE_POOL.min(candidates.len());
		let used_reranker = if pool_size > 0 && ensure_reranker_loaded()? {
			let mut pool: Vec<SemanticResult> = candidates.drain(..pool_size).collect();
			let docs: Vec<&str> = pool.iter().map(|r| r.content.as_str()).collect();
			let rerank_scores = {
				let mut guard = RERANKER
					.try_lock()
					.map_err(|_| "Reranker temporarily busy".to_string())?;
				let reranker = guard
					.as_mut()
					.ok_or("Reranker not loaded — should be unreachable after ensure_reranker_loaded")?;
				reranker.rerank(&trimmed, &docs)?
			};
			schedule_reranker_unload();

			for (r, s) in pool.iter_mut().zip(rerank_scores.iter()) {
				r.score = *s;
			}
			pool.sort_by(|a, b| b.score.total_cmp(&a.score));
			candidates = pool;
			true
		} else {
			false
		};

		// Limit + adaptive filter on whichever score the user is seeing
		candidates.truncate(limit);
		if let Some(outcome) = filtering::adaptive_filter(&candidates) {
			debug_log("SEMANTIC", &outcome.log_message);
			candidates.truncate(outcome.keep_count);
		}

		if !candidates.is_empty() {
			let q_norm: f32 = query_embedding.iter().map(|x| x * x).sum::<f32>().sqrt();
			let log = filtering::format_score_distribution(
				&trimmed,
				&candidates,
				query_embedding.len(),
				q_norm,
			);
			debug_log(
				"SEMANTIC",
				format!("reranker={}\n{}", used_reranker, log.trim_end()),
			);
		}

		Ok(candidates)
	})
	.await
	.map_err(|e| format!("Task join error: {e}"))?
}

/// Hybrid search: fuses FTS5 (BM25) and semantic (cosine) results via RRF,
/// then reranks the top-50 with the BGE cross-encoder when available.
///
/// Pipeline:
/// 1. In parallel: FTS top-30 paths, semantic top-30 chunks.
/// 2. Reduce semantic chunks to a path ranking (best chunk per path,
///    order preserved).
/// 3. RRF the two path rankings (k=60).
/// 4. For each path in the fused top-50, pick its best-scoring semantic
///    chunk to hand to the reranker. Paths that only matched in FTS are
///    skipped (MVP limitation — the semantic indexer covers the full vault
///    so this only affects files filtered out at index time).
/// 5. Rerank with `Reranker::rerank` if the model is on disk; otherwise
///    keep RRF order.
/// 6. Sort by final score, truncate to `max_results`.
#[tauri::command]
pub async fn search_hybrid(
	query: String,
	max_results: Option<usize>,
) -> Result<Vec<SemanticResult>, String> {
	let trimmed = query.trim().to_string();
	if trimmed.chars().count() < 3 {
		return Ok(Vec::new());
	}

	tokio::task::spawn_blocking(move || {
		let limit = max_results.unwrap_or(20);
		const SOURCE_TOP_N: usize = 30;
		const FUSED_POOL: usize = RERANK_CANDIDATE_POOL;

		// 1a. FTS top-N paths
		let fts_results = crate::commands::search_index::search_fts_inner(&trimmed, SOURCE_TOP_N, false)?;
		let fts_paths: Vec<String> = fts_results.iter().map(|r| r.path.clone()).collect();

		// 1b. Semantic top-N chunks (cosine only — we don't want to pay
		// reranker latency on this candidate pass; the rerank happens after RRF).
		ensure_embedder_loaded()?;
		let query_embedding = {
			let mut guard = EMBEDDER.try_lock().map_err(|_| {
				"Semantic search is temporarily unavailable while indexing is in progress"
					.to_string()
			})?;
			let embedder = guard.as_mut().ok_or("Embedder not initialized")?;
			embedder.embed(&trimmed)?
		};
		schedule_embedder_unload();
		let cached_chunks = get_or_load_cache()?;

		// Rank ALL chunks by cosine, take top SOURCE_TOP_N.
		let mut sem_ranked: Vec<(f32, &CachedChunk)> = cached_chunks
			.iter()
			.map(|c| (cosine_similarity(&query_embedding, &c.embedding), c))
			.collect();
		sem_ranked.sort_by(|a, b| b.0.total_cmp(&a.0));
		sem_ranked.truncate(SOURCE_TOP_N * 4); // headroom for path dedupe

		// 2. Reduce to per-path ranking, preserving discovery order. Best
		// chunk per path is the one we'll hand to the reranker downstream.
		let mut best_chunk_for_path: std::collections::HashMap<String, &CachedChunk> =
			std::collections::HashMap::new();
		let mut sem_paths: Vec<String> = Vec::new();
		for (_score, chunk) in &sem_ranked {
			if !best_chunk_for_path.contains_key(&chunk.source_path) {
				best_chunk_for_path.insert(chunk.source_path.clone(), chunk);
				sem_paths.push(chunk.source_path.clone());
				if sem_paths.len() >= SOURCE_TOP_N {
					break;
				}
			}
		}

		// 3. RRF on the two path rankings.
		let fts_refs: Vec<&str> = fts_paths.iter().map(|s| s.as_str()).collect();
		let sem_refs: Vec<&str> = sem_paths.iter().map(|s| s.as_str()).collect();
		let fused = crate::search::rrf::rrf_fuse(
			&[&fts_refs, &sem_refs],
			crate::search::rrf::DEFAULT_RRF_K,
		);

		// 4. Materialize a candidate list backed by real semantic chunks.
		let mut candidates: Vec<SemanticResult> = Vec::with_capacity(FUSED_POOL);
		for (path, rrf_score) in fused.iter().take(FUSED_POOL) {
			if let Some(chunk) = best_chunk_for_path.get(path) {
				candidates.push(SemanticResult {
					key: chunk.key.clone(),
					source_path: chunk.source_path.clone(),
					content: chunk.content.clone(),
					heading: chunk.heading.clone(),
					line_start: chunk.line_start,
					line_end: chunk.line_end,
					// Provisional score — reranker overwrites if available.
					score: *rrf_score,
				});
			}
		}

		// 5. Rerank the candidate pool with the BGE cross-encoder when
		// available; replace `score` with the rerank logit.
		let used_reranker = !candidates.is_empty() && ensure_reranker_loaded()?;
		if used_reranker {
			let docs: Vec<&str> = candidates.iter().map(|c| c.content.as_str()).collect();
			let scores = {
				let mut guard = RERANKER
					.try_lock()
					.map_err(|_| "Reranker temporarily busy".to_string())?;
				let reranker = guard.as_mut().ok_or("Reranker not loaded")?;
				reranker.rerank(&trimmed, &docs)?
			};
			schedule_reranker_unload();
			for (c, s) in candidates.iter_mut().zip(scores.iter()) {
				c.score = *s;
			}
			candidates.sort_by(|a, b| b.score.total_cmp(&a.score));
		}

		candidates.truncate(limit);

		debug_log(
			"SEMANTIC",
			format!(
				"hybrid: fts={} sem={} fused={} reranker={} returned={}",
				fts_paths.len(),
				sem_paths.len(),
				fused.len(),
				used_reranker,
				candidates.len()
			),
		);

		Ok(candidates)
	})
	.await
	.map_err(|e| format!("Task join error: {e}"))?
}

/// Returns statistics about the semantic search index.
#[tauri::command]
pub fn get_semantic_stats() -> Result<SemanticStats, String> {
	get_semantic_stats_inner()
}

/// Returns per-file indexing status for the given vault-relative path.
/// Used by the status-bar widget on the active markdown tab.
///
/// `file_path` must be vault-relative (same convention as `update_semantic_file`).
/// Returns `chunkCount = 0` and `lastEmbeddedAt = None` when the file is not
/// indexed; `modelLoaded` reflects the live embedder state independent of the
/// per-file query so the UI can distinguish "not indexed" from "semantic off".
#[tauri::command]
pub fn get_semantic_file_status(file_path: String) -> Result<SemanticFileStatus, String> {
	let model_loaded = MODEL_AVAILABLE.load(Ordering::SeqCst);
	let (chunk_count, last_embedded_at) =
		db::with_db(|conn| db::semantic_repo::get_file_index_info(conn, &file_path))?;
	Ok(SemanticFileStatus {
		chunk_count,
		last_embedded_at,
		model_loaded,
	})
}

/// Releases the ONNX model and clears the search cache.
/// Call during vault teardown or when switching vaults.
#[tauri::command]
pub fn shutdown_semantic() -> Result<(), String> {
	debug_log("SEMANTIC", "Shutting down: releasing model + clearing cache");
	MODEL_AVAILABLE.store(false, Ordering::SeqCst);
	if let Ok(mut guard) = EMBEDDER.lock() {
		*guard = None;
	}
	if let Ok(mut guard) = RERANKER.lock() {
		*guard = None;
	}
	invalidate_search_cache();
	Ok(())
}

/// Re-chunks and re-embeds a single file (called on save).
/// Runs on a blocking thread to avoid freezing the UI during inference.
#[tauri::command]
pub async fn update_semantic_file(
	file_path: String,
	content: String,
	vault_path: String,
) -> Result<(), String> {
	tokio::task::spawn_blocking(move || {
		let options = ChunkOptions::default();
		let chunks = chunk_markdown(&file_path, &content, &options);

		if chunks.is_empty() {
			// No content to index — delete old chunks atomically
			db::with_db_transaction("semantic delete empty file", |conn| {
				db::semantic_repo::delete_chunks_for_path(conn, &file_path)
			})?;
			update_stored_mtime(&file_path, &vault_path)?;
			invalidate_search_cache();
			return Ok(());
		}

		// Compare content hashes to find which chunks actually changed.
		// This avoids expensive ONNX inference when content hasn't changed.
		let existing_hashes = db::with_db(|conn| {
			db::semantic_repo::get_chunk_hashes_for_path(conn, &file_path)
		})?;

		let new_keys: std::collections::HashSet<&str> = chunks.iter().map(|c| c.key.as_str()).collect();
		let chunks_to_embed: Vec<&crate::semantic::types::Chunk> = chunks
			.iter()
			.filter(|chunk| {
				existing_hashes
					.get(&chunk.key)
					.map_or(true, |stored_hash| stored_hash != &chunk.content_hash)
			})
			.collect();
		let keys_to_delete: Vec<&str> = existing_hashes
			.keys()
			.filter(|k| !new_keys.contains(k.as_str()))
			.map(|k| k.as_str())
			.collect();

		// All chunk keys match AND all hashes match — nothing to do
		if chunks_to_embed.is_empty() && keys_to_delete.is_empty() {
			debug_log("SEMANTIC", format!("Skipped update for {} — all {} chunks unchanged", file_path, chunks.len()));
			update_stored_mtime(&file_path, &vault_path)?;
			return Ok(());
		}

		// Embed only changed/new chunks FIRST, before any DB modification.
		// If embedding fails, old chunks remain untouched in the DB.
		let embeddings = if !chunks_to_embed.is_empty() {
			// Lazy-reload embedder if it was unloaded after indexing
			ensure_embedder_loaded()?;

			let mut guard = EMBEDDER.lock().map_err(|e| format!("Lock error: {e}"))?;
			let embedder = match guard.as_mut() {
				Some(e) => e,
				None => {
					debug_log("SEMANTIC", format!("Skipped update for {}: embedder not loaded", file_path));
					return Ok(());
				}
			};

			// Embed the SAME projection the bulk indexer uses (`embed_text()` =
			// heading tree + body), NOT raw `content`. The bulk path embeds
			// `chunk.embed_text()` and `content_hash` is the hash of that same
			// projection (see Chunk docs), so embedding raw `content` here both
			// (a) places the vector in a different region than every bulk-indexed
			// chunk and (b) is masked by the hash skip-logic (hash still matches),
			// making the divergence sticky. Use embed_text() to stay consistent.
			let texts: Vec<String> = chunks_to_embed.iter().map(|c| c.embed_text()).collect();
			debug_log("EMBEDDER", format!("File update — {} changed of {} total chunks for {}", texts.len(), chunks.len(), file_path));
			let text_refs: Vec<&str> = texts.iter().map(|s| s.as_str()).collect();
			let result = embedder.embed_batch(&text_refs)?;

			// Schedule auto-unload after idle timeout (guard must be dropped first)
			drop(guard);
			schedule_embedder_unload();

			result
		} else {
			vec![]
		};

		// Apply changes in a single transaction:
		// 1. Delete removed chunks (keys that no longer exist)
		// 2. Upsert changed/new chunks with fresh embeddings
		db::with_db_transaction("semantic update file", |conn| {
			for key in &keys_to_delete {
				db::semantic_repo::delete_chunk_by_key(conn, key)?;
			}

			let now = std::time::SystemTime::now()
				.duration_since(std::time::UNIX_EPOCH)
				.map(|d| d.as_millis() as i64)
				.unwrap_or(0);

			for (chunk, embedding) in chunks_to_embed.iter().zip(embeddings.iter()) {
				let embedding_bytes: Vec<u8> = embedding
					.iter()
					.flat_map(|f| f.to_le_bytes())
					.collect();

				db::semantic_repo::insert_chunk(
					conn,
					&chunk.key,
					&chunk.source_path,
					&chunk.content,
					chunk.heading.as_deref(),
					&chunk.parent_headings,
					chunk.line_start as i64,
					chunk.line_end as i64,
					&chunk.content_hash,
					&embedding_bytes,
					now,
				)?;
			}
			Ok(())
		})?;

		// Update mtime so build_semantic_index doesn't re-process this file
		update_stored_mtime(&file_path, &vault_path)?;
		if !chunks_to_embed.is_empty() || !keys_to_delete.is_empty() {
			invalidate_search_cache();
		}
		Ok(())
	})
	.await
	.map_err(|e| format!("Task join error: {e}"))?
}

/// Diagnostic: tests embedding quality with known query-passage pairs.
/// Call manually to verify the model produces well-separated scores.
/// Runs on a blocking thread to avoid freezing the UI.
#[tauri::command]
pub async fn debug_semantic_embeddings() -> Result<String, String> {
	tokio::task::spawn_blocking(|| {
		ensure_embedder_loaded()?;
		let mut guard = EMBEDDER.lock().map_err(|e| format!("Lock error: {e}"))?;
		let embedder = guard.as_mut().ok_or("Embedder not initialized")?;

		let test_pairs: Vec<(&str, &str, bool)> = vec![
			(
				"Comida",
				"Receita de feijoada brasileira com arroz, farofa e couve",
				true,
			),
			(
				"Comida",
				"Bolo de chocolate com cobertura de brigadeiro",
				true,
			),
			(
				"Comida",
				"Notes from therapy session about managing anxiety and stress",
				false,
			),
			(
				"Comida",
				"Git workflow and branch management best practices",
				false,
			),
			(
				"travel recommendations",
				"Travel guide for Lisbon Portugal with restaurants and sightseeing",
				true,
			),
			(
				"travel recommendations",
				"Recipe for homemade pasta carbonara with fresh ingredients",
				false,
			),
		];

		let mut output = String::from("[DIAG] Embedding quality test:\n");
		for (query, passage, expected_relevant) in &test_pairs {
			let q_emb = embedder.embed(query)?;
			let p_emb = embedder.embed(passage)?;
			let score = cosine_similarity(&q_emb, &p_emb);
			let label = if *expected_relevant {
				"RELEVANT"
			} else {
				"IRRELEVANT"
			};
			let line = format!(
				"  {} vs {} => {:.6} (expected: {})\n",
				query,
				&passage[..passage.len().min(60)],
				score,
				label
			);
			debug_log("DIAG", line.trim());
			output.push_str(&line);
		}

		// Also check stored embeddings from DB
		output.push_str("\n[DIAG] Sample stored embeddings from DB:\n");
		let sample = db::with_db(|conn| db::semantic_repo::get_sample_chunks(conn, 5))?;
		for s in &sample {
			let line = format!(
				"  path={:?} heading={:?} embedding_bytes={} (dims={})",
				s.source_path, s.heading, s.embedding_bytes_len, s.embedding_bytes_len / 4
			);
			debug_log("DIAG", &line);
			output.push_str(&line);
			output.push('\n');
		}

		schedule_embedder_unload();
		Ok(output)
	})
	.await
	.map_err(|e| format!("Task join error: {e}"))?
}

// --- Private helpers ---

/// Folders excluded from semantic indexing (templates, system folders).
const EXCLUDED_FOLDERS: &[&str] = &["_templates"];

/// Reads the real filesystem mtime and stores it in semantic_meta.
/// Uses the actual file modification time (matching what `build_semantic_index` reads)
/// to prevent redundant re-indexing on the next build.
fn update_stored_mtime(file_path: &str, vault_path: &str) -> Result<(), String> {
	let vault_root = Path::new(vault_path)
		.canonicalize()
		.map_err(|e| format!("Invalid vault path: {e}"))?;
	let abs_path = vault_root.join(file_path);
	let abs_canonical = abs_path
		.canonicalize()
		.map_err(|e| format!("Cannot resolve path {}: {e}", file_path))?;
	if !abs_canonical.starts_with(&vault_root) {
		return Err(format!("Path traversal detected: {}", file_path));
	}
	let mtime = std::fs::metadata(&abs_canonical)
		.and_then(|m| m.modified())
		.ok()
		.and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
		.map(|d| d.as_secs() as i64)
		.unwrap_or_else(|| {
			debug_log("SEMANTIC", format!("Failed to read mtime for {}, defaulting to 0", file_path));
			0
		});
	db::with_db(|conn| {
		db::semantic_repo::upsert_mtimes(conn, &[(file_path.to_string(), mtime)])
	})
}

/// Inner implementation of get_semantic_stats (non-command, reusable).
fn get_semantic_stats_inner() -> Result<SemanticStats, String> {
	let model_loaded = MODEL_AVAILABLE.load(Ordering::SeqCst);

	db::with_db(|conn| {
		let total_chunks = db::semantic_repo::count_chunks(conn)?;
		let total_sources = db::semantic_repo::count_sources(conn)?;

		Ok(SemanticStats {
			total_chunks,
			total_sources,
			model_loaded,
		})
	})
}

/// Removes chunks and mtime entries whose source files no longer exist in the vault.
/// Uses a transaction to ensure all orphan deletions are atomic.
pub fn cleanup_orphaned_chunks(existing_paths: &[String]) -> Result<(), String> {
	let path_set: HashSet<&str> = existing_paths.iter().map(|s| s.as_str()).collect();
	db::with_db_transaction("semantic orphan cleanup", |conn| {
		let indexed_paths = db::semantic_repo::get_distinct_sources(conn)?;

		for path in &indexed_paths {
			if !path_set.contains(path.as_str()) {
				db::semantic_repo::delete_chunks_for_path(conn, path)?;
				debug_log(
					"SEMANTIC",
					format!("Removed orphaned chunks for: {}", path),
				);
			}
		}

		// Clean up stale mtime entries for deleted files
		let mtimes_deleted = db::semantic_repo::delete_orphaned_mtimes(conn, &path_set)?;
		if mtimes_deleted > 0 {
			debug_log(
				"SEMANTIC",
				format!("Removed {} orphaned mtime entries", mtimes_deleted),
			);
		}

		Ok(())
	})
}

/// Clears chunks + persists the new mtime for every changed file that
/// produced ZERO chunks (emptied, frontmatter-only, or below the min-chunk
/// threshold). `changed` is `(rel_path, mtime)` for every file re-read this
/// build; `chunked` is the set of rel_paths that produced at least one chunk.
/// Returns the rel_paths that were cleared.
///
/// Without this, the bulk `build_semantic_index` neither deletes such a
/// file's now-stale chunks (Phase 3 only touches paths that appear in an
/// embed batch) nor advances its mtime — so its orphaned embeddings keep
/// surfacing in search AND the file is re-read + re-chunked on every build
/// forever. Phase 4's `cleanup_orphaned_chunks` cannot help: the file still
/// exists on disk, so it is not orphaned. Mirrors the zero-chunk branch of
/// `update_semantic_file`. Runs in a single transaction.
pub fn clear_changed_files_without_chunks(
	changed: &[(String, i64)],
	chunked: &HashSet<String>,
) -> Result<Vec<String>, String> {
	let empty: Vec<(String, i64)> = changed
		.iter()
		.filter(|(p, _)| !chunked.contains(p))
		.cloned()
		.collect();
	if empty.is_empty() {
		return Ok(Vec::new());
	}
	db::with_db_transaction("semantic clear empty changed files", |conn| {
		for (path, _) in &empty {
			db::semantic_repo::delete_chunks_for_path(conn, path)?;
		}
		db::semantic_repo::upsert_mtimes(conn, &empty)?;
		Ok(())
	})?;
	Ok(empty.into_iter().map(|(p, _)| p).collect())
}

/// Identifier for the embedding recipe — the contract between chunking + embedding.
/// Bump whenever the recipe changes (chunker logic, embed-text format, model swap,
/// or anything that would make stored embeddings semantically stale). Mixed into
/// `compute_model_hash` so a recipe change invalidates the index just like a model
/// file swap does, triggering a full reindex on the next launch.
const EMBED_RECIPE_VERSION: &str = "v3-phase1-chunking";

/// Computes a SHA-256 hash of the first 8KB of the model file plus the embed recipe
/// version, for quick change detection. Either the model bytes changing or the
/// recipe version bumping forces a full reindex.
pub fn compute_model_hash(vault: &Path) -> String {
	let model_path = vault
		.join(".kokobrain")
		.join("models")
		.join("bge-m3")
		.join("model.onnx");
	match std::fs::File::open(&model_path) {
		Ok(mut file) => {
			let mut buf = vec![0u8; 8192];
			let n = std::io::Read::read(&mut file, &mut buf).unwrap_or(0);
			let mut hasher = Sha256::new();
			hasher.update(&buf[..n]);
			hasher.update(b"|recipe:");
			hasher.update(EMBED_RECIPE_VERSION.as_bytes());
			let result = hasher.finalize();
			result.iter().map(|b| format!("{:02x}", b)).collect()
		}
		Err(_) => String::new(),
	}
}

/// Checks if the model hash changed since last build. Updates the stored hash.
/// Returns true if the model changed (embeddings need to be rebuilt).
pub fn check_and_update_model_hash(current_hash: &str) -> Result<bool, String> {
	if current_hash.is_empty() {
		return Ok(false);
	}

	let stored_hash: Option<String> =
		db::with_db(|conn| db::semantic_repo::get_meta(conn, "model_hash"))?;

	let changed = stored_hash.as_deref() != Some(current_hash);

	if changed {
		db::with_db(|conn| db::semantic_repo::upsert_meta(conn, "model_hash", current_hash))?;
	}

	Ok(changed)
}
