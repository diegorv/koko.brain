use crate::rag::config::RetrievalConfig;
use crate::semantic::embedder::cosine_similarity;
use crate::semantic::runtime::{
	ensure_embedder_loaded, ensure_reranker_loaded, get_or_load_cache,
	schedule_embedder_unload, schedule_reranker_unload, EMBEDDER, RERANKER,
};
use serde::Serialize;

/// One chunk surfaced by retrieval. Carries enough context for the LLM
/// prompt builder (text + heading) and for the UI's source-jump click
/// (path + line numbers).
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RetrievedChunk {
	/// Vault-relative path of the source markdown file.
	pub path: String,
	/// Heading chain. Currently a single-element vec (the immediate section
	/// heading) because the chunks table only stores one heading per chunk;
	/// the type stays a Vec for forward compatibility with multi-level
	/// heading paths.
	pub heading_path: Vec<String>,
	/// Full chunk text as stored in the index.
	pub text: String,
	/// Reranker logit (raw, not sigmoid'd). Use the relative ordering, not
	/// the absolute magnitude.
	pub score: f32,
	/// 1-indexed inclusive line range in the source file.
	pub line_start: usize,
	pub line_end: usize,
}

/// Runs the retrieval pipeline: embed query → cosine top-K from cache →
/// reranker → top-N. Both `vector_top_k` and `final_top_k` are pulled from
/// the caller's `RetrievalConfig` so the same code services both `rag_search`
/// (preview) and `rag_chat` (full pipeline).
pub async fn retrieve(
	query: String,
	config: RetrievalConfig,
) -> Result<Vec<RetrievedChunk>, String> {
	let trimmed = query.trim().to_string();
	if trimmed.is_empty() {
		return Ok(Vec::new());
	}

	// Inference is CPU-bound and ONNX is not Send-safe across `.await` points,
	// so wrap the whole pipeline in spawn_blocking. The reranker dominates
	// wall time; the embedder query is ~30 ms but still benefits.
	tokio::task::spawn_blocking(move || retrieve_blocking(trimmed, config))
		.await
		.map_err(|e| format!("RAG retrieval task join error: {e}"))?
}

fn retrieve_blocking(
	query: String,
	config: RetrievalConfig,
) -> Result<Vec<RetrievedChunk>, String> {
	// ---- 1. Embed the query ----
	ensure_embedder_loaded()?;
	let query_vec: Vec<f32> = {
		// Scope the lock as tightly as possible. `search_semantic` and
		// `build_semantic_index` also contend for the embedder; holding the
		// lock past inference would block them unnecessarily.
		let mut guard = EMBEDDER.try_lock().map_err(|_| {
			"Embedder is busy (indexing or another search in progress). \
			 Try again in a moment."
				.to_string()
		})?;
		let embedder = guard.as_mut().ok_or("Embedder not initialized")?;
		embedder.embed(&query)?
	};
	schedule_embedder_unload();

	// ---- 2. Cosine top-K against the deserialized chunk cache ----
	let cached = get_or_load_cache()?;
	if cached.is_empty() {
		return Ok(Vec::new());
	}

	let mut scored: Vec<(usize, f32)> = cached
		.iter()
		.enumerate()
		.map(|(i, chunk)| (i, cosine_similarity(&query_vec, &chunk.embedding)))
		.collect();
	scored.sort_by(|a, b| b.1.total_cmp(&a.1));
	scored.truncate(config.vector_top_k.max(config.final_top_k));

	if scored.is_empty() {
		return Ok(Vec::new());
	}

	// ---- 3. Rerank the candidates ----
	ensure_reranker_loaded()?;

	let candidates_text: Vec<&str> = scored
		.iter()
		.map(|(i, _)| cached[*i].content.as_str())
		.collect();

	let ranked = {
		let mut guard = RERANKER.try_lock().map_err(|_| {
			"Reranker is busy. Try again in a moment.".to_string()
		})?;
		let reranker = guard.as_mut().ok_or("Reranker not initialized")?;
		reranker.rerank(&query, &candidates_text)?
	};
	schedule_reranker_unload();

	// ---- 4. Map top-N back to RetrievedChunk ----
	let final_n = config.final_top_k.min(ranked.len());
	let out: Vec<RetrievedChunk> = ranked
		.into_iter()
		.take(final_n)
		.map(|r| {
			let cache_idx = scored[r.index].0;
			let chunk = &cached[cache_idx];
			let heading_path = chunk
				.heading
				.as_ref()
				.map(|h| vec![h.clone()])
				.unwrap_or_default();
			RetrievedChunk {
				path: chunk.source_path.clone(),
				heading_path,
				text: chunk.content.clone(),
				score: r.score,
				line_start: chunk.line_start,
				line_end: chunk.line_end,
			}
		})
		.collect();

	Ok(out)
}
