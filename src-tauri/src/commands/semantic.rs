use crate::db;
use crate::semantic::chunker::{chunk_markdown, ChunkOptions};
use crate::semantic::embedder::{cosine_similarity, Embedder};
use crate::semantic::filtering;
use crate::semantic::model::ModelManager;
use crate::semantic::types::{SemanticProgress, SemanticResult, SemanticStats};
use crate::utils::fs as vault_fs;
use crate::utils::logger::debug_log;
use sha2::{Digest, Sha256};
use std::collections::HashSet;
use std::path::Path;
use std::sync::{Arc, Mutex};
use tauri::{AppHandle, Emitter};

/// Global embedder instance, loaded once on `init_semantic_search`.
static EMBEDDER: Mutex<Option<Embedder>> = Mutex::new(None);

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
			.map(|row| {
				let embedding: Vec<f32> = row
					.embedding_bytes
					.chunks_exact(4)
					.map(|bytes| f32::from_le_bytes([bytes[0], bytes[1], bytes[2], bytes[3]]))
					.collect();
				CachedChunk {
					key: row.key,
					source_path: row.source_path,
					content: row.content,
					heading: row.heading,
					line_start: row.line_start as usize,
					line_end: row.line_end as usize,
					embedding,
				}
			})
			.collect();
		Ok(chunks)
	})?;

	let arc = Arc::new(chunks);
	*cache = Some(Arc::clone(&arc));
	debug_log("SEMANTIC", format!("Search cache loaded: {} chunks", arc.len()));
	Ok(arc)
}

/// Loads the ONNX model into the static embedder. Call once after vault open.
/// Runs model loading on a blocking thread to avoid freezing the UI.
#[tauri::command]
pub async fn init_semantic_search(vault_path: String) -> Result<bool, String> {
	tokio::task::spawn_blocking(move || {
		let manager = ModelManager::new(Path::new(&vault_path));
		if !manager.is_model_available() {
			return Ok(false);
		}

		let embedder = Embedder::load(&manager.model_path())?;
		let mut guard = EMBEDDER.lock().map_err(|e| format!("Lock error: {e}"))?;
		*guard = Some(embedder);
		Ok(true)
	})
	.await
	.map_err(|e| format!("Task join error: {e}"))?
}

/// Checks if the ONNX model files are available on disk.
#[tauri::command]
pub fn is_semantic_model_available(vault_path: String) -> Result<bool, String> {
	let manager = ModelManager::new(Path::new(&vault_path));
	Ok(manager.is_model_available())
}

/// Downloads the ONNX model from HuggingFace Hub, emitting progress events.
#[tauri::command]
pub async fn download_semantic_model(vault_path: String, app: AppHandle) -> Result<bool, String> {
	let manager = ModelManager::new(Path::new(&vault_path));
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

		let file_entries = vault_fs::collect_markdown_paths(vault, EXCLUDED_FOLDERS)?;
		let stored_mtimes = db::with_db(|conn| db::semantic_repo::get_stored_mtimes(conn))?;

		let total_files = file_entries.len();
		let mut changed_files: Vec<(String, String, i64)> = Vec::new();
		let mut all_paths: Vec<String> = Vec::new();

		for (rel_path, abs_path) in &file_entries {
			all_paths.push(rel_path.clone());
			let mtime = std::fs::metadata(abs_path)
				.and_then(|m| m.modified())
				.ok()
				.and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
				.map(|d| d.as_secs() as i64)
				.unwrap_or_else(|| {
					debug_log("SEMANTIC", format!("Failed to read mtime for {}, defaulting to 0", rel_path));
					0
				});

			let stored = stored_mtimes.get(rel_path).copied().unwrap_or(-1);
			if model_changed || mtime != stored {
				if let Ok(content) = std::fs::read_to_string(abs_path) {
					changed_files.push((rel_path.clone(), content, mtime));
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
		let batch_size = 32;
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
			let texts: Vec<String> = batch
				.iter()
				.map(|&i| all_chunks[i].content.clone())
				.collect();

			// Run ONNX inference on blocking thread to avoid starving the async runtime
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
				db::with_db_transaction(|conn| {
					for path in &paths_to_delete {
						db::semantic_repo::delete_chunks_for_path(conn, path)?;
					}

					let now = std::time::SystemTime::now()
						.duration_since(std::time::UNIX_EPOCH)
						.map(|d| d.as_millis() as i64)
						.unwrap_or(0);

					for (key, source_path, content, heading, line_start, line_end, content_hash, embedding_bytes) in &db_entries {
						db::semantic_repo::insert_chunk(
							conn,
							key,
							source_path,
							content,
							heading.as_deref(),
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

		// Embed the query text (try_lock to avoid blocking during indexing)
		let query_embedding = {
			let mut guard = EMBEDDER.try_lock().map_err(|_| {
				"Semantic search is temporarily unavailable while indexing is in progress"
					.to_string()
			})?;
			let embedder = guard.as_mut().ok_or("Embedder not initialized")?;
			embedder.embed(&trimmed)?
		};

		// Load chunks from cache (avoids re-reading DB + re-deserializing on every search)
		let cached_chunks = get_or_load_cache()?;

		let mut results: Vec<SemanticResult> = cached_chunks
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

		// Sort by score descending and limit
		results.sort_by(|a, b| b.score.total_cmp(&a.score));
		results.truncate(limit);

		// Adaptive filtering: remove noise based on score distribution
		if let Some(outcome) = filtering::adaptive_filter(&results) {
			debug_log("SEMANTIC", &outcome.log_message);
			results.truncate(outcome.keep_count);
		}

		// Log score distribution for diagnostics
		if !results.is_empty() {
			let q_norm: f32 = query_embedding.iter().map(|x| x * x).sum::<f32>().sqrt();
			let log = filtering::format_score_distribution(
				&trimmed,
				&results,
				query_embedding.len(),
				q_norm,
			);
			debug_log("SEMANTIC", log.trim_end());
		}

		Ok(results)
	})
	.await
	.map_err(|e| format!("Task join error: {e}"))?
}

/// Returns statistics about the semantic search index.
#[tauri::command]
pub fn get_semantic_stats() -> Result<SemanticStats, String> {
	get_semantic_stats_inner()
}

/// Releases the ONNX model and clears the search cache.
/// Call during vault teardown or when switching vaults.
#[tauri::command]
pub fn shutdown_semantic() -> Result<(), String> {
	debug_log("SEMANTIC", "Shutting down: releasing model + clearing cache");
	if let Ok(mut guard) = EMBEDDER.lock() {
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
			db::with_db_transaction(|conn| {
				db::semantic_repo::delete_chunks_for_path(conn, &file_path)
			})?;
			update_stored_mtime(&file_path, &vault_path)?;
			invalidate_search_cache();
			return Ok(());
		}

		// Embed new chunks FIRST, before any DB modification.
		// If embedding fails, old chunks remain untouched in the DB.
		let embeddings = {
			let mut guard = EMBEDDER.lock().map_err(|e| format!("Lock error: {e}"))?;
			let embedder = match guard.as_mut() {
				Some(e) => e,
				None => {
				debug_log("SEMANTIC", format!("Skipped update for {}: embedder not loaded", file_path));
				return Ok(());
			}
			};

			let text_refs: Vec<&str> = chunks.iter().map(|c| c.content.as_str()).collect();
			embedder.embed_batch(&text_refs)?
		}; // EMBEDDER guard dropped here — prevents deadlock with DB lock

		// Delete old + insert new in a single transaction.
		// If insert fails, delete is rolled back — no data loss.
		db::with_db_transaction(|conn| {
			db::semantic_repo::delete_chunks_for_path(conn, &file_path)?;

			let now = std::time::SystemTime::now()
				.duration_since(std::time::UNIX_EPOCH)
				.map(|d| d.as_millis() as i64)
				.unwrap_or(0);

			for (i, chunk) in chunks.iter().enumerate() {
				let embedding_bytes: Vec<u8> = embeddings[i]
					.iter()
					.flat_map(|f| f.to_le_bytes())
					.collect();

				db::semantic_repo::insert_chunk(
					conn,
					&chunk.key,
					&chunk.source_path,
					&chunk.content,
					chunk.heading.as_deref(),
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
		invalidate_search_cache();
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
	let mtime = std::fs::metadata(&abs_path)
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
	let model_loaded = EMBEDDER.lock().map(|g| g.is_some()).unwrap_or(false);

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
	db::with_db_transaction(|conn| {
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

/// Computes a SHA-256 hash of the first 8KB of the model file for quick change detection.
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
			let result = hasher.finalize();
			format!("{:x}", result)
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
