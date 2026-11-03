//! Tests for the `[SEMANTIC] timing` line (`src/semantic/search_timing.rs`)
//! that `search_semantic` and `search_hybrid` write once per search.

use std::time::Duration;

use kokobrain_lib::semantic::search_timing::{
	CacheTiming, HybridTiming, RerankTiming, SearchTiming,
};

fn ms(n: u64) -> Duration {
	Duration::from_millis(n)
}

fn semantic_timing() -> SearchTiming {
	SearchTiming {
		total: ms(11_400),
		cache: CacheTiming { hit: false, load: ms(2_900) },
		embedder: ms(60),
		embedder_reloaded: true,
		cosine: ms(400),
		chunks: 156_885,
		hybrid: None,
		rerank: RerankTiming::Ran {
			ensure: ms(500),
			inference: ms(7_400),
			candidates: 50,
		},
		finalize: ms(1),
	}
}

#[test]
fn semantic_summary_has_every_stage_on_one_line() {
	let t = semantic_timing();
	assert_eq!(
		t.summary(),
		"timing mode=semantic total_ms=11400 cache=miss cache_ms=2900 embedder_ms=60 embedder_reloaded=true \
		 cosine_ms=400 chunks=156885 rerank_ensure_ms=500 rerank_ms=7400 rerank_candidates=50 \
		 finalize_ms=1 other_ms=139"
	);
	assert!(!t.summary().contains('\n'));
}

#[test]
fn hybrid_summary_adds_fts_rrf_and_pool() {
	let t = SearchTiming {
		total: ms(20_200),
		cache: CacheTiming { hit: true, load: ms(0) },
		embedder: ms(70),
		embedder_reloaded: false,
		cosine: ms(450),
		chunks: 156_885,
		hybrid: Some(HybridTiming { fts: ms(800), rrf: ms(1), pool: ms(120) }),
		rerank: RerankTiming::Ran {
			ensure: ms(0),
			inference: ms(18_700),
			candidates: 50,
		},
		finalize: ms(2),
	};
	assert_eq!(
		t.summary(),
		"timing mode=hybrid total_ms=20200 cache=hit cache_ms=0 embedder_ms=70 embedder_reloaded=false \
		 cosine_ms=450 chunks=156885 fts_ms=800 rrf_ms=1 pool_ms=120 rerank_ensure_ms=0 rerank_ms=18700 \
		 rerank_candidates=50 finalize_ms=2 other_ms=57"
	);
}

#[test]
fn other_is_total_minus_the_stages() {
	let t = semantic_timing();
	let stages = ms(2_900 + 60 + 400 + 500 + 7_400 + 1);
	assert_eq!(t.other(), t.total - stages);
	assert_eq!(t.other(), ms(139));
}

#[test]
fn other_saturates_at_zero_when_stages_exceed_total() {
	let mut t = semantic_timing();
	t.total = ms(10);
	assert_eq!(t.other(), Duration::ZERO);
	assert!(t.summary().ends_with("other_ms=0"));
}

#[test]
fn skipped_rerank_replaces_the_rerank_fields() {
	let mut t = semantic_timing();
	t.rerank = RerankTiming::Skipped;
	let line = t.summary();
	assert!(line.contains(" rerank=skipped "), "{line}");
	assert!(!line.contains("rerank_ms"), "{line}");
	assert!(!line.contains("rerank_candidates"), "{line}");
	// The skipped rerank no longer counts as a stage, so its time moves to other.
	assert_eq!(t.other(), ms(11_400 - 2_900 - 60 - 400 - 1));
}
