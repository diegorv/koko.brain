use crate::db;
use crate::semantic::embedder::Embedder;
use crate::semantic::model::ModelManager;
use crate::utils::logger::debug_log;
use std::path::Path;
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::{Arc, Mutex};

/// Global embedder instance. Lazy-loaded on demand, auto-unloaded after idle timeout.
pub(crate) static EMBEDDER: Mutex<Option<Embedder>> = Mutex::new(None);

/// Stored vault path for lazy-reloading the embedder after it's been unloaded.
pub(crate) static VAULT_PATH: Mutex<Option<String>> = Mutex::new(None);

/// Generation counter for debounced unload. Each use bumps this; only the latest
/// scheduled unload fires (if the generation hasn't changed since scheduling).
pub(crate) static UNLOAD_GENERATION: AtomicU64 = AtomicU64::new(0);

/// Seconds of inactivity before the embedder is automatically unloaded to free memory.
pub(crate) const EMBEDDER_IDLE_TIMEOUT_SECS: u64 = 120;

/// Cached pre-deserialized embeddings to avoid reloading from DB on every search.
pub(crate) static SEARCH_CACHE: Mutex<Option<Arc<Vec<CachedChunk>>>> = Mutex::new(None);

/// A chunk with its embedding already deserialized from bytes to f32.
pub(crate) struct CachedChunk {
	pub(crate) key: String,
	pub(crate) source_path: String,
	pub(crate) content: String,
	pub(crate) heading: Option<String>,
	pub(crate) line_start: usize,
	pub(crate) line_end: usize,
	pub(crate) embedding: Vec<f32>,
}

/// Clears the search cache. Must be called after any index modification.
pub(crate) fn invalidate_search_cache() {
	if let Ok(mut cache) = SEARCH_CACHE.lock() {
		*cache = None;
		debug_log("SEMANTIC", "Search cache invalidated");
	}
}

/// Loads embeddings from DB into cache, or returns the existing cache.
pub(crate) fn get_or_load_cache() -> Result<Arc<Vec<CachedChunk>>, String> {
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

/// Unloads the ONNX model to free memory (typically ~2-4 GB RSS).
pub(crate) fn unload_embedder() {
	if let Ok(mut guard) = EMBEDDER.lock() {
		if guard.is_some() {
			*guard = None;
			debug_log("SEMANTIC", "Embedder unloaded to free memory");
		}
	}
}

/// Ensures the embedder is loaded, reloading from stored vault path if needed.
/// Returns an error if no vault path is stored (init_semantic_search was never called).
pub(crate) fn ensure_embedder_loaded() -> Result<(), String> {
	{
		let guard = EMBEDDER.lock().map_err(|e| format!("Lock error: {e}"))?;
		if guard.is_some() {
			return Ok(());
		}
	}

	let vault_path = {
		let vp = VAULT_PATH.lock().map_err(|e| format!("Lock error: {e}"))?;
		vp.clone().ok_or_else(|| "No vault path stored — init_semantic_search was never called".to_string())?
	};

	debug_log("SEMANTIC", "Lazy-reloading embedder...");
	let manager = ModelManager::new(Path::new(&vault_path));
	if !manager.is_model_available() {
		return Err("Model not available on disk".to_string());
	}
	let embedder = Embedder::load(&manager.model_path())?;
	let mut guard = EMBEDDER.lock().map_err(|e| format!("Lock error: {e}"))?;
	*guard = Some(embedder);
	debug_log("SEMANTIC", "Embedder lazy-reloaded");
	Ok(())
}

/// Schedules an embedder unload after the idle timeout. Uses a generation counter
/// so that subsequent calls cancel previous timers — only the latest one fires.
pub(crate) fn schedule_embedder_unload() {
	let gen_id = UNLOAD_GENERATION.fetch_add(1, Ordering::SeqCst) + 1;
	tokio::spawn(async move {
		tokio::time::sleep(std::time::Duration::from_secs(EMBEDDER_IDLE_TIMEOUT_SECS)).await;
		if UNLOAD_GENERATION.load(Ordering::SeqCst) == gen_id {
			unload_embedder();
		}
	});
}
