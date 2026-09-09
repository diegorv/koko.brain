//! Pure retrieval metrics for the offline eval harness
//! (`examples/retrieval_eval.rs`).
//!
//! No I/O and no model access: the harness feeds ranked path lists in and
//! summaries come out, so every number the harness prints is testable here.
//! Paths are compared after `normalize_path`, at note granularity — the
//! fixture names notes, while semantic and hybrid results are chunks.

use std::collections::HashSet;

/// Normalizes a vault-relative path for comparison: trims whitespace and
/// strips a leading `./` or `/`. Fixture authors type paths by hand while
/// the search backends emit them from the index; this keeps a stray prefix
/// from turning a hit into a miss.
pub fn normalize_path(path: &str) -> String {
	let trimmed = path.trim();
	let without_dot = trimmed.strip_prefix("./").unwrap_or(trimmed);
	without_dot.trim_start_matches('/').to_string()
}

/// Collapses a chunk-level result list to unique normalized paths, keeping
/// first-occurrence order. Semantic and hybrid results carry several chunks
/// per note; recall is measured per note.
pub fn dedupe_paths<I, S>(paths: I) -> Vec<String>
where
	I: IntoIterator<Item = S>,
	S: AsRef<str>,
{
	let mut seen: HashSet<String> = HashSet::new();
	let mut out = Vec::new();
	for path in paths {
		let normalized = normalize_path(path.as_ref());
		if seen.insert(normalized.clone()) {
			out.push(normalized);
		}
	}
	out
}

/// Fraction of `expected` paths present in the first `k` entries of `ranked`.
/// Returns `None` when `expected` is empty: a "no relevant note" query has
/// no recall to measure.
pub fn recall_at_k(ranked: &[String], expected: &[String], k: usize) -> Option<f32> {
	if expected.is_empty() {
		return None;
	}
	let top: HashSet<String> = ranked.iter().take(k).map(|p| normalize_path(p)).collect();
	let hits = expected
		.iter()
		.filter(|e| top.contains(&normalize_path(e)))
		.count();
	Some(hits as f32 / expected.len() as f32)
}

/// Reciprocal rank (`1 / rank`, 1-indexed) of the first `expected` path
/// within the top `k` of `ranked`; `0.0` when none appears. Returns `None`
/// when `expected` is empty.
pub fn reciprocal_rank_at_k(ranked: &[String], expected: &[String], k: usize) -> Option<f32> {
	if expected.is_empty() {
		return None;
	}
	let wanted: HashSet<String> = expected.iter().map(|e| normalize_path(e)).collect();
	for (idx, path) in ranked.iter().take(k).enumerate() {
		if wanted.contains(&normalize_path(path)) {
			return Some(1.0 / (idx as f32 + 1.0));
		}
	}
	Some(0.0)
}

/// Arithmetic mean, `None` for an empty slice.
pub fn mean(values: &[f32]) -> Option<f32> {
	if values.is_empty() {
		return None;
	}
	Some(values.iter().sum::<f32>() / values.len() as f32)
}

/// Median (lower-middle average for even counts), `None` for an empty slice.
pub fn median(values: &[f32]) -> Option<f32> {
	if values.is_empty() {
		return None;
	}
	let mut sorted = values.to_vec();
	sorted.sort_by(|a, b| a.total_cmp(b));
	let mid = sorted.len() / 2;
	if sorted.len() % 2 == 1 {
		Some(sorted[mid])
	} else {
		Some((sorted[mid - 1] + sorted[mid]) / 2.0)
	}
}

/// One query's outcome in one search mode.
pub struct QueryEval {
	/// Unique paths returned, best first (already deduped by the caller).
	pub returned: Vec<String>,
	/// Paths the fixture marks as relevant; empty for "nothing relevant" queries.
	pub expected: Vec<String>,
	/// Wall-clock latency of the search call in milliseconds.
	pub latency_ms: f32,
}

/// Aggregate metrics for one search mode over a set of queries.
#[derive(serde::Serialize, serde::Deserialize, Debug, PartialEq, Clone)]
pub struct ModeSummary {
	/// Total queries evaluated in this mode.
	pub queries: usize,
	/// Queries that had at least one expected path (the recall denominator).
	pub queries_with_expected: usize,
	/// Mean recall@5 over `queries_with_expected`; `None` when that is zero.
	pub recall_at_5: Option<f32>,
	/// Mean recall@10 over `queries_with_expected`; `None` when that is zero.
	pub recall_at_10: Option<f32>,
	/// Mean reciprocal rank within the top 10; `None` when no query had expected paths.
	pub mrr_at_10: Option<f32>,
	/// Mean number of unique paths returned per query (filter behavior signal).
	pub mean_result_count: f32,
	/// Median search latency in milliseconds.
	pub p50_latency_ms: f32,
}

/// Aggregates per-query outcomes into a `ModeSummary`. Queries without
/// expected paths count toward `queries`, `mean_result_count` and latency
/// but are excluded from the recall and MRR means.
pub fn summarize(evals: &[QueryEval]) -> ModeSummary {
	let mut r5 = Vec::new();
	let mut r10 = Vec::new();
	let mut rr10 = Vec::new();
	let mut counts = Vec::new();
	let mut latencies = Vec::new();
	for eval in evals {
		counts.push(eval.returned.len() as f32);
		latencies.push(eval.latency_ms);
		if let Some(v) = recall_at_k(&eval.returned, &eval.expected, 5) {
			r5.push(v);
		}
		if let Some(v) = recall_at_k(&eval.returned, &eval.expected, 10) {
			r10.push(v);
		}
		if let Some(v) = reciprocal_rank_at_k(&eval.returned, &eval.expected, 10) {
			rr10.push(v);
		}
	}
	ModeSummary {
		queries: evals.len(),
		queries_with_expected: r10.len(),
		recall_at_5: mean(&r5),
		recall_at_10: mean(&r10),
		mrr_at_10: mean(&rr10),
		mean_result_count: mean(&counts).unwrap_or(0.0),
		p50_latency_ms: median(&latencies).unwrap_or(0.0),
	}
}

#[cfg(test)]
mod tests {
	use super::*;

	fn strs(items: &[&str]) -> Vec<String> {
		items.iter().map(|s| s.to_string()).collect()
	}

	fn close(a: f32, b: f32) -> bool {
		(a - b).abs() < 1e-6
	}

	// --- normalize_path ---

	#[test]
	fn normalize_path_strips_dot_slash_and_leading_slash() {
		assert_eq!(normalize_path("./notes/a.md"), "notes/a.md");
		assert_eq!(normalize_path("/notes/a.md"), "notes/a.md");
		assert_eq!(normalize_path("  notes/a.md \n"), "notes/a.md");
	}

	#[test]
	fn normalize_path_leaves_plain_relative_path_alone() {
		assert_eq!(normalize_path("notes/a.md"), "notes/a.md");
		assert_eq!(normalize_path(""), "");
	}

	// --- dedupe_paths ---

	#[test]
	fn dedupe_paths_keeps_first_occurrence_order() {
		let out = dedupe_paths(["b.md", "a.md", "b.md", "./a.md", "c.md"]);
		assert_eq!(out, strs(&["b.md", "a.md", "c.md"]));
	}

	#[test]
	fn dedupe_paths_empty_input() {
		let out = dedupe_paths(Vec::<String>::new());
		assert!(out.is_empty());
	}

	// --- recall_at_k ---

	#[test]
	fn recall_at_k_full_hit() {
		let ranked = strs(&["a.md", "b.md", "c.md"]);
		let expected = strs(&["a.md", "c.md"]);
		assert_eq!(recall_at_k(&ranked, &expected, 10), Some(1.0));
	}

	#[test]
	fn recall_at_k_partial_hit_respects_k() {
		let ranked = strs(&["x.md", "y.md", "a.md", "b.md"]);
		let expected = strs(&["a.md", "b.md"]);
		// Only the first 3 are considered: a.md is in, b.md is out.
		assert_eq!(recall_at_k(&ranked, &expected, 3), Some(0.5));
		assert_eq!(recall_at_k(&ranked, &expected, 2), Some(0.0));
	}

	#[test]
	fn recall_at_k_none_for_empty_expected() {
		let ranked = strs(&["a.md"]);
		assert_eq!(recall_at_k(&ranked, &[], 10), None);
	}

	#[test]
	fn recall_at_k_zero_for_empty_ranked() {
		let expected = strs(&["a.md"]);
		assert_eq!(recall_at_k(&[], &expected, 10), Some(0.0));
	}

	#[test]
	fn recall_at_k_normalizes_both_sides() {
		let ranked = strs(&["/notes/a.md"]);
		let expected = strs(&["./notes/a.md"]);
		assert_eq!(recall_at_k(&ranked, &expected, 10), Some(1.0));
	}

	// --- reciprocal_rank_at_k ---

	#[test]
	fn reciprocal_rank_uses_first_expected_hit() {
		let ranked = strs(&["x.md", "y.md", "a.md", "b.md"]);
		let expected = strs(&["b.md", "a.md"]);
		let rr = reciprocal_rank_at_k(&ranked, &expected, 10).unwrap();
		assert!(close(rr, 1.0 / 3.0), "rr={rr}");
	}

	#[test]
	fn reciprocal_rank_zero_when_outside_k() {
		let ranked = strs(&["x.md", "y.md", "a.md"]);
		let expected = strs(&["a.md"]);
		assert_eq!(reciprocal_rank_at_k(&ranked, &expected, 2), Some(0.0));
	}

	#[test]
	fn reciprocal_rank_none_for_empty_expected() {
		let ranked = strs(&["a.md"]);
		assert_eq!(reciprocal_rank_at_k(&ranked, &[], 10), None);
	}

	// --- mean / median ---

	#[test]
	fn mean_and_median_empty_are_none() {
		assert_eq!(mean(&[]), None);
		assert_eq!(median(&[]), None);
	}

	#[test]
	fn median_odd_and_even_counts() {
		assert_eq!(median(&[3.0, 1.0, 2.0]), Some(2.0));
		assert_eq!(median(&[4.0, 1.0, 3.0, 2.0]), Some(2.5));
	}

	// --- summarize ---

	#[test]
	fn summarize_excludes_expected_less_queries_from_recall_but_not_counts() {
		let evals = vec![
			QueryEval {
				returned: strs(&["a.md", "b.md"]),
				expected: strs(&["a.md"]),
				latency_ms: 10.0,
			},
			QueryEval {
				returned: strs(&["x.md", "y.md", "z.md", "w.md"]),
				expected: vec![],
				latency_ms: 30.0,
			},
			QueryEval {
				returned: strs(&["q.md", "r.md", "a.md"]),
				expected: strs(&["a.md", "missing.md"]),
				latency_ms: 20.0,
			},
		];
		let summary = summarize(&evals);
		assert_eq!(summary.queries, 3);
		assert_eq!(summary.queries_with_expected, 2);
		// recall@5: 1.0 and 0.5 -> 0.75
		assert!(close(summary.recall_at_5.unwrap(), 0.75));
		assert!(close(summary.recall_at_10.unwrap(), 0.75));
		// rr: 1.0 and 1/3 -> 0.6667
		assert!(close(summary.mrr_at_10.unwrap(), (1.0 + 1.0 / 3.0) / 2.0));
		// result counts 2, 4, 3 -> 3.0
		assert!(close(summary.mean_result_count, 3.0));
		assert!(close(summary.p50_latency_ms, 20.0));
	}

	#[test]
	fn summarize_empty_input() {
		let summary = summarize(&[]);
		assert_eq!(summary.queries, 0);
		assert_eq!(summary.queries_with_expected, 0);
		assert_eq!(summary.recall_at_5, None);
		assert_eq!(summary.recall_at_10, None);
		assert_eq!(summary.mrr_at_10, None);
		assert_eq!(summary.mean_result_count, 0.0);
		assert_eq!(summary.p50_latency_ms, 0.0);
	}

	#[test]
	fn summarize_all_expected_less_queries_has_none_recall() {
		let evals = vec![QueryEval {
			returned: strs(&["a.md"]),
			expected: vec![],
			latency_ms: 5.0,
		}];
		let summary = summarize(&evals);
		assert_eq!(summary.queries, 1);
		assert_eq!(summary.queries_with_expected, 0);
		assert_eq!(summary.recall_at_10, None);
		assert_eq!(summary.mrr_at_10, None);
		assert!(close(summary.mean_result_count, 1.0));
	}
}
