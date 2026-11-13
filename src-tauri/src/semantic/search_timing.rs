//! Per-stage timing of one `search_semantic` / `search_hybrid` call, written
//! as a single `[SEMANTIC] timing ...` log line so `grep "timing"` over a
//! session log reads as a table. Pure: the commands measure, this formats.

use std::time::Duration;

/// Search-cache lookup (`get_or_load_cache`).
#[derive(Debug, Clone, Copy)]
pub struct CacheTiming {
	/// The cache was already populated.
	pub hit: bool,
	/// Time spent in the lookup, the DB load on a miss.
	pub load: Duration,
}

/// Stages only `search_hybrid` runs.
#[derive(Debug, Clone, Copy)]
pub struct HybridTiming {
	/// The FTS top-N query.
	pub fts: Duration,
	/// `rrf_fuse` over the two path rankings.
	pub rrf: Duration,
	/// `build_pool` plus materializing its entries as candidates.
	pub pool: Duration,
}

/// Cross-encoder rerank stage.
#[derive(Debug, Clone, Copy)]
pub enum RerankTiming {
	/// No rerank ran: the model is not on disk, or there were no candidates.
	Skipped,
	/// The reranker scored the candidate pool.
	Ran {
		/// `ensure_reranker_loaded`, the lazy load when the model was unloaded.
		ensure: Duration,
		/// Building the rerank texts plus `Reranker::rerank`.
		inference: Duration,
		/// Number of (query, doc) pairs scored.
		candidates: usize,
	},
}

/// Stage durations of one search.
#[derive(Debug, Clone, Copy)]
pub struct SearchTiming {
	/// Wall time from the start of the blocking task to the end of finalize.
	pub total: Duration,
	/// Cache lookup.
	pub cache: CacheTiming,
	/// `ensure_embedder_loaded` plus the query `embed`.
	pub embedder: Duration,
	/// The embedder was lazy-reloaded for this search.
	pub embedder_reloaded: bool,
	/// The cosine scan over every chunk, with its sort.
	pub cosine: Duration,
	/// Number of chunks the cosine scan scored.
	pub chunks: usize,
	/// Hybrid-only stages; `None` for a semantic search.
	pub hybrid: Option<HybridTiming>,
	/// Rerank stage.
	pub rerank: RerankTiming,
	/// Gap filter and truncation (`finalize_results`).
	pub finalize: Duration,
}

impl SearchTiming {
	/// `total` minus every measured stage, saturating at zero: time spent
	/// outside the named stages.
	pub fn other(&self) -> Duration {
		let mut stages = self.cache.load + self.embedder + self.cosine + self.finalize;
		if let Some(h) = self.hybrid {
			stages += h.fts + h.rrf + h.pool;
		}
		if let RerankTiming::Ran { ensure, inference, .. } = self.rerank {
			stages += ensure + inference;
		}
		self.total.saturating_sub(stages)
	}

	/// The one-row log line, `key=value` tokens separated by spaces.
	pub fn summary(&self) -> String {
		let mut parts = vec![
			"timing".to_string(),
			format!("mode={}", if self.hybrid.is_some() { "hybrid" } else { "semantic" }),
			format!("total_ms={}", self.total.as_millis()),
			format!("cache={}", if self.cache.hit { "hit" } else { "miss" }),
			format!("cache_ms={}", self.cache.load.as_millis()),
			format!("embedder_ms={}", self.embedder.as_millis()),
			format!("embedder_reloaded={}", self.embedder_reloaded),
			format!("cosine_ms={}", self.cosine.as_millis()),
			format!("chunks={}", self.chunks),
		];
		if let Some(h) = self.hybrid {
			parts.push(format!("fts_ms={}", h.fts.as_millis()));
			parts.push(format!("rrf_ms={}", h.rrf.as_millis()));
			parts.push(format!("pool_ms={}", h.pool.as_millis()));
		}
		match self.rerank {
			RerankTiming::Skipped => parts.push("rerank=skipped".to_string()),
			RerankTiming::Ran { ensure, inference, candidates } => {
				parts.push(format!("rerank_ensure_ms={}", ensure.as_millis()));
				parts.push(format!("rerank_ms={}", inference.as_millis()));
				parts.push(format!("rerank_candidates={}", candidates));
			}
		}
		parts.push(format!("finalize_ms={}", self.finalize.as_millis()));
		parts.push(format!("other_ms={}", self.other().as_millis()));
		parts.join(" ")
	}
}
