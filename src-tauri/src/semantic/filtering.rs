use crate::semantic::types::SemanticResult;

/// Result of adaptive filtering, includes the filtered results and a log message.
pub struct FilterOutcome {
	/// How many results to keep (truncate to this index).
	pub keep_count: usize,
	/// Diagnostic log message describing what was applied.
	pub log_message: String,
}

/// Which scale `SemanticResult::score` is on. Decides how the gap filter
/// judges "a significant gap".
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ScoreKind {
	/// Cosine similarity in `[0, 1]`: a ratio scale with a meaningful zero,
	/// so a gap is judged relative to the top score (`COSINE_GAP_RATIO`).
	Cosine,
	/// Cross-encoder logit (log-odds): an interval scale whose zero is
	/// arbitrary and whose range differs per query, so a ratio of the top
	/// raw score is meaningless — a top logit near zero would make any gap
	/// "significant", a strongly negative top would make none. The scores
	/// are mapped through the sigmoid to probabilities first (`sigmoid`),
	/// which have a meaningful zero, and the `COSINE_GAP_RATIO` rule then
	/// applies. In probability space one logit step counts for little among
	/// confident results (p near 1) and for a lot in the tail (p near 0),
	/// which is where a nonsense query lands and where the list should be
	/// cut short. An absolute threshold in logit units (1.0, tried first)
	/// never fired on that flat, very negative tail and left those lists
	/// long.
	Logit,
	/// Reciprocal-rank-fusion score (hybrid mode without a reranker). Derived
	/// from ranks alone, it carries no relevance magnitude: the "gap" between
	/// a path both legs agreed on and a path only one leg found is a fixed
	/// artefact of `1/(k+rank)`, not evidence about the query. No gap
	/// filtering is applied; the list is only truncated.
	Rrf,
}

/// Cosine rule: a gap counts when it exceeds this fraction of the top score.
/// 4% keeps clustered real matches (0.61-0.63 for a broad query) together;
/// 2% split them (see the "comida" regression test).
pub const COSINE_GAP_RATIO: f32 = 0.04;

/// Logistic function: maps a logit (log-odds) to a probability in `[0, 1]`.
/// In f32 it saturates to exactly 0.0 or 1.0 beyond roughly +-88; on a
/// list sorted by score that only ever yields equal neighbours (gap 0),
/// never a false cut.
fn sigmoid(x: f32) -> f32 {
	1.0 / (1.0 + (-x).exp())
}

/// Applies adaptive filtering to remove noise from semantic search results.
///
/// Two strategies are tried in order:
/// 1. **Gap filter**: finds the largest gap between consecutive scores.
///    If the gap is significant for `kind` (see `ScoreKind`), results are
///    cut at that point.
/// 2. **Dynamic min filter** (fallback): computes `mean - 1*stddev` as a dynamic
///    minimum score and removes results below it. Scale-free, so it is the
///    same for both kinds.
///
/// Requires at least 3 results to apply any filtering. Returns `None` if
/// filtering is not applicable (fewer than 3 results).
pub fn adaptive_filter(results: &[SemanticResult], kind: ScoreKind) -> Option<FilterOutcome> {
	if results.len() < 3 || kind == ScoreKind::Rrf {
		return None;
	}

	// Logits become probabilities so that both kinds below are ratio
	// scales; the fallback runs on the same transformed values.
	let scores: Vec<f32> = match kind {
		ScoreKind::Logit => results.iter().map(|r| sigmoid(r.score)).collect(),
		ScoreKind::Cosine | ScoreKind::Rrf => results.iter().map(|r| r.score).collect(),
	};
	let top_score = scores[0];

	// Find the largest gap between consecutive scores
	let mut max_gap = 0.0f32;
	let mut gap_idx = 0usize;
	for i in 0..scores.len() - 1 {
		let gap = scores[i] - scores[i + 1];
		if gap > max_gap {
			max_gap = gap;
			gap_idx = i;
		}
	}

	// If the largest gap is significant, cut there: relative to the top
	// score (abs() only guards a degenerate negative cosine; probabilities
	// are never negative). For `Logit` the logged gap and threshold are in
	// probability units, unlike the raw logits printed around it.
	let scale = match kind {
		ScoreKind::Logit => "Logit, sigmoid p",
		ScoreKind::Cosine => "Cosine",
		ScoreKind::Rrf => "Rrf",
	};
	let gap_threshold = top_score.abs() * COSINE_GAP_RATIO;
	if max_gap > gap_threshold && gap_idx < scores.len() - 1 {
		let cut_at = gap_idx + 1;
		return Some(FilterOutcome {
			keep_count: cut_at,
			log_message: format!(
				"Gap filter ({scale}): cut at #{} (gap={:.4}, threshold={:.4})",
				cut_at, max_gap, gap_threshold
			),
		});
	}

	// Fallback: dynamic min score (mean - 1*stddev)
	let mean = scores.iter().sum::<f32>() / scores.len() as f32;
	let variance =
		scores.iter().map(|s| (s - mean).powi(2)).sum::<f32>() / scores.len() as f32;
	let stddev = variance.sqrt();
	let dynamic_min = mean - stddev;

	let keep_count = scores.iter().filter(|s| **s >= dynamic_min).count();
	let removed = results.len() - keep_count;

	Some(FilterOutcome {
		keep_count,
		log_message: format!(
			"Dynamic min filter ({scale}): {:.4} (mean={:.4} - stddev={:.4}), removed {}",
			dynamic_min, mean, stddev, removed
		),
	})
}

/// Final step shared by `search_semantic` and `search_hybrid`: truncate to
/// `limit`, run `adaptive_filter` for `kind` on what is left, and truncate
/// again to its `keep_count`. Returns the filter outcome so the caller can
/// log it; `None` means only the `limit` truncation happened.
pub fn finalize_results(
	candidates: &mut Vec<SemanticResult>,
	limit: usize,
	kind: ScoreKind,
) -> Option<FilterOutcome> {
	candidates.truncate(limit);
	let outcome = adaptive_filter(candidates, kind)?;
	candidates.truncate(outcome.keep_count);
	Some(outcome)
}

/// Logs diagnostic information about score distribution.
/// Returns the formatted log lines (caller can eprintln them).
pub fn format_score_distribution(
	query: &str,
	results: &[SemanticResult],
	query_embedding_dims: usize,
	query_embedding_norm: f32,
) -> String {
	if results.is_empty() {
		return String::new();
	}

	let scores: Vec<f32> = results.iter().map(|r| r.score).collect();
	let min = scores.iter().cloned().fold(f32::INFINITY, f32::min);
	let max = scores.iter().cloned().fold(f32::NEG_INFINITY, f32::max);
	let mean = scores.iter().sum::<f32>() / scores.len() as f32;
	let variance =
		scores.iter().map(|s| (s - mean).powi(2)).sum::<f32>() / scores.len() as f32;
	let stddev = variance.sqrt();

	let mut out = String::new();
	out.push_str(&format!("Query: {:?}\n", query));
	out.push_str(&format!(
		"Scores: n={}, min={:.6}, max={:.6}, mean={:.6}, stddev={:.6}, spread={:.6}\n",
		scores.len(),
		min,
		max,
		mean,
		stddev,
		max - min
	));
	out.push_str(&format!(
		"Query embedding: dims={}, norm={:.6}\n",
		query_embedding_dims, query_embedding_norm
	));

	for (i, r) in results.iter().take(5).enumerate() {
		out.push_str(&format!(
			"  #{}: score={:.6} path={:?} heading={:?}\n",
			i + 1,
			r.score,
			r.source_path,
			r.heading,
		));
	}

	if results.len() > 5 {
		out.push_str("  ...\n");
		for r in results.iter().rev().take(3).collect::<Vec<_>>().into_iter().rev() {
			out.push_str(&format!(
				"  score={:.6} path={:?} heading={:?}\n",
				r.score, r.source_path, r.heading,
			));
		}
	}

	out
}

#[cfg(test)]
mod tests {
	use super::*;
	use crate::semantic::types::SemanticResult;

	fn make_result(score: f32) -> SemanticResult {
		SemanticResult {
			key: format!("test#{:.2}", score),
			source_path: "test.md".to_string(),
			content: "chunk content".to_string(),
			heading: None,
			line_start: 1,
			line_end: 10,
			score,
		}
	}

	fn make_results(scores: &[f32]) -> Vec<SemanticResult> {
		scores.iter().map(|&s| make_result(s)).collect()
	}

	// --- adaptive_filter ---

	#[test]
	fn filter_returns_none_for_fewer_than_3_results() {
		let results = make_results(&[0.9, 0.8]);
		assert!(adaptive_filter(&results, ScoreKind::Cosine).is_none());
	}

	#[test]
	fn filter_returns_none_for_empty() {
		let results: Vec<SemanticResult> = vec![];
		assert!(adaptive_filter(&results, ScoreKind::Cosine).is_none());
	}

	#[test]
	fn filter_gap_detection_cuts_at_largest_gap() {
		// Scores: 0.9, 0.85, 0.80 then big gap to 0.50, 0.45
		let results = make_results(&[0.90, 0.85, 0.80, 0.50, 0.45]);
		let outcome = adaptive_filter(&results, ScoreKind::Cosine).unwrap();
		// Gap between 0.80 and 0.50 = 0.30 is much bigger than 4% of 0.90 = 0.036
		assert_eq!(outcome.keep_count, 3);
		assert!(outcome.log_message.contains("Gap filter"));
	}

	#[test]
	fn filter_gap_detection_with_clear_separation() {
		// Top result clearly separated from rest
		let results = make_results(&[0.95, 0.60, 0.58, 0.55]);
		let outcome = adaptive_filter(&results, ScoreKind::Cosine).unwrap();
		// Gap between 0.95 and 0.60 = 0.35, threshold = 0.038
		assert_eq!(outcome.keep_count, 1);
		assert!(outcome.log_message.contains("Gap filter"));
	}

	#[test]
	fn filter_falls_back_to_stddev_when_no_significant_gap() {
		// All scores very close together -- gaps (0.001) well below 4% of top (0.02)
		let results = make_results(&[0.500, 0.499, 0.498, 0.497, 0.496]);
		let outcome = adaptive_filter(&results, ScoreKind::Cosine).unwrap();
		// Max gap = 0.001, threshold = 0.500 * 0.04 = 0.02 -> NOT > threshold
		// Falls back to dynamic min filter
		assert!(outcome.log_message.contains("Dynamic min filter"));
		// With these close scores, most or all should be kept
		assert!(outcome.keep_count >= 3);
	}

	#[test]
	fn filter_stddev_removes_outliers() {
		// Most scores high, one low outlier
		let results = make_results(&[0.80, 0.79, 0.78, 0.77, 0.30]);
		let outcome = adaptive_filter(&results, ScoreKind::Cosine).unwrap();
		// Gap between 0.77 and 0.30 = 0.47, threshold = 0.80 * 0.04 = 0.032
		// Gap filter should catch this
		assert_eq!(outcome.keep_count, 4);
		assert!(outcome.log_message.contains("Gap filter"));
	}

	#[test]
	fn filter_identical_scores() {
		let results = make_results(&[0.70, 0.70, 0.70, 0.70]);
		let outcome = adaptive_filter(&results, ScoreKind::Cosine).unwrap();
		// All gaps are 0, threshold = 0.70 * 0.04 = 0.028
		// Falls back to dynamic min: stddev = 0, dynamic_min = 0.70
		assert!(outcome.log_message.contains("Dynamic min filter"));
		assert_eq!(outcome.keep_count, 4);
	}

	#[test]
	fn filter_exactly_3_results() {
		let results = make_results(&[0.90, 0.50, 0.40]);
		let outcome = adaptive_filter(&results, ScoreKind::Cosine).unwrap();
		// Gap between 0.90 and 0.50 = 0.40, threshold = 0.036
		assert_eq!(outcome.keep_count, 1);
	}

	#[test]
	fn filter_does_not_cut_small_gaps_in_realistic_semantic_scores() {
		// Regression: "comida" query returned scores clustered in 0.61-0.63 range.
		// The old 2% threshold (0.013) cut after #1 because the gap to #2 was 0.015.
		// With 4% threshold (0.025), these small gaps are preserved.
		let results = make_results(&[0.633, 0.618, 0.615, 0.610, 0.605, 0.598]);
		let outcome = adaptive_filter(&results, ScoreKind::Cosine).unwrap();
		// Max gap = 0.633 - 0.618 = 0.015, threshold = 0.633 * 0.04 = 0.025
		// 0.015 < 0.025 -> gap filter does NOT trigger, falls back to stddev
		assert!(outcome.log_message.contains("Dynamic min filter"));
		assert!(outcome.keep_count >= 4);
	}

	// --- adaptive_filter, ScoreKind::Logit ---

	#[test]
	fn sigmoid_maps_logits_to_probabilities() {
		assert!((sigmoid(0.0) - 0.5).abs() < 1e-6);
		assert!(sigmoid(4.0) > 0.98 && sigmoid(4.0) < 1.0);
		assert!(sigmoid(-4.0) < 0.02 && sigmoid(-4.0) > 0.0);
		assert!(sigmoid(-80.0) > 0.0, "reranker tail (-7..-12) is far from the f32 edge");
		assert_eq!(sigmoid(-100.0), 0.0, "saturation is exact, not NaN");
	}

	#[test]
	fn logit_near_zero_top_with_small_steps_does_not_collapse_to_one_result() {
		// Regression for the ratio-of-raw-top rule: top logit 0.3 gave a
		// threshold of 0.012, so the 0.05 steps below cut everything after
		// #1. In probability space the steps are ~0.012 against a 0.023
		// threshold, so the fallback runs.
		let results = make_results(&[0.30, 0.25, 0.20, 0.15]);
		let outcome = adaptive_filter(&results, ScoreKind::Logit).unwrap();
		assert!(outcome.log_message.contains("Dynamic min filter"), "{}", outcome.log_message);
		assert!(outcome.keep_count >= 3, "keep_count={}", outcome.keep_count);
	}

	#[test]
	fn logit_clear_gap_cuts_regardless_of_sign() {
		// Positive top: 5.0, 4.5 | 1.0, 0.5 — p 0.993, 0.989 | 0.731, 0.622.
		let positive = make_results(&[5.0, 4.5, 1.0, 0.5]);
		let outcome = adaptive_filter(&positive, ScoreKind::Logit).unwrap();
		assert_eq!(outcome.keep_count, 2);
		assert!(outcome.log_message.contains("Gap filter (Logit"));

		// Negative top (nothing strongly relevant): -1.0, -1.5 | -4.0, -4.2 —
		// p 0.269, 0.182 | 0.018, 0.015. The largest step is still the real
		// 2.5-logit cliff, not the first step.
		let negative = make_results(&[-1.0, -1.5, -4.0, -4.2]);
		let outcome = adaptive_filter(&negative, ScoreKind::Logit).unwrap();
		assert_eq!(outcome.keep_count, 2);
	}

	#[test]
	fn logit_same_step_counts_less_among_confident_results() {
		// A 0.5-logit step at the top of a confident list (3.0 -> 2.5) is a
		// 0.029 probability gap under a 0.038 threshold: no cut. The same
		// step at p = 0.5 (0.0 -> -0.5) is a 0.122 gap over 0.02: cut.
		let confident = make_results(&[3.0, 2.5, 2.4, 2.3]);
		let outcome = adaptive_filter(&confident, ScoreKind::Logit).unwrap();
		assert!(outcome.log_message.contains("Dynamic min filter"), "{}", outcome.log_message);

		let midway = make_results(&[0.0, -0.5, -0.6, -0.7]);
		let outcome = adaptive_filter(&midway, ScoreKind::Logit).unwrap();
		assert_eq!(outcome.keep_count, 1);
		assert!(outcome.log_message.contains("Gap filter (Logit"));
	}

	#[test]
	fn logit_flat_negative_tail_is_cut_short() {
		// A nonsense query: every candidate deeply negative, no cliff in
		// logit units (steps of 0.3-0.7). The absolute 1.0 rule never fired
		// here and its stddev fallback kept 5 of these 6; in probability
		// space the relative steps are large, so the list is cut at the
		// largest one.
		let results = make_results(&[-7.2, -7.5, -8.2, -8.4, -8.5, -9.1]);
		let outcome = adaptive_filter(&results, ScoreKind::Logit).unwrap();
		assert!(outcome.log_message.contains("Gap filter (Logit"), "{}", outcome.log_message);
		assert!(outcome.keep_count <= 2, "keep_count={}", outcome.keep_count);
	}

	#[test]
	fn logit_tight_cluster_falls_back_to_stddev() {
		let results = make_results(&[2.0, 1.9, 1.8, 1.7, 1.6]);
		let outcome = adaptive_filter(&results, ScoreKind::Logit).unwrap();
		assert!(outcome.log_message.contains("Dynamic min filter"), "{}", outcome.log_message);
		assert!(outcome.keep_count >= 3);
	}

	#[test]
	fn logit_kind_differs_from_cosine_on_the_same_raw_scores() {
		// Four confident logits one unit apart. Read as cosine the first
		// 1.0 step is 12.5% of the top and cuts at #1; read as logits they
		// are p 0.9997..0.9933, no step above 4% of the top, no cut. Same
		// input, the kind decides — this is the whole point of the enum.
		let results = make_results(&[8.0, 7.0, 6.0, 5.0]);
		let cosine = adaptive_filter(&results, ScoreKind::Cosine).unwrap();
		let logit = adaptive_filter(&results, ScoreKind::Logit).unwrap();
		assert_eq!(cosine.keep_count, 1);
		assert!(logit.log_message.contains("Dynamic min filter"), "{}", logit.log_message);
		assert!(logit.keep_count >= 3, "keep_count={}", logit.keep_count);
	}

	#[test]
	fn logit_fallback_drops_the_tail_outlier() {
		// Confident list whose steps (p 0.9997 .. 0.9608) all stay under 4%
		// of the top, so the gap rule does not fire; the mean - stddev floor
		// (0.975 in probability space) drops only the last one.
		let results = make_results(&[8.0, 7.0, 6.0, 5.0, 4.0, 3.2]);
		let outcome = adaptive_filter(&results, ScoreKind::Logit).unwrap();
		assert!(outcome.log_message.contains("Dynamic min filter"), "{}", outcome.log_message);
		assert_eq!(outcome.keep_count, 5);
	}

	#[test]
	fn logit_fewer_than_3_results_is_none() {
		let results = make_results(&[4.0, -2.0]);
		assert!(adaptive_filter(&results, ScoreKind::Logit).is_none());
	}

	// --- adaptive_filter, ScoreKind::Rrf ---

	#[test]
	fn rrf_never_gap_filters_even_with_large_gaps() {
		// Two paths in both legs (~0.032) then one-leg paths (~0.016): a 50%
		// step that the cosine rule would cut on. RRF magnitudes are rank
		// artefacts, so nothing is filtered.
		let results = make_results(&[0.0328, 0.0323, 0.0164, 0.0161, 0.0159]);
		assert!(adaptive_filter(&results, ScoreKind::Rrf).is_none());
	}

	// --- finalize_results ---

	#[test]
	fn finalize_truncates_to_limit_then_cuts_at_gap() {
		// Limit drops the last two; the gap rule then cuts after #3.
		let mut results = make_results(&[0.90, 0.85, 0.80, 0.50, 0.45, 0.40, 0.35]);
		let outcome = finalize_results(&mut results, 5, ScoreKind::Cosine).unwrap();
		assert_eq!(outcome.keep_count, 3);
		assert_eq!(results.len(), 3);
		assert!((results[2].score - 0.80).abs() < 1e-6);
	}

	#[test]
	fn finalize_with_limit_below_3_only_truncates() {
		let mut results = make_results(&[0.90, 0.20, 0.10, 0.05]);
		assert!(finalize_results(&mut results, 2, ScoreKind::Cosine).is_none());
		assert_eq!(results.len(), 2);
	}

	#[test]
	fn finalize_rrf_only_truncates() {
		let mut results = make_results(&[0.0328, 0.0164, 0.0161, 0.0159]);
		assert!(finalize_results(&mut results, 3, ScoreKind::Rrf).is_none());
		assert_eq!(results.len(), 3);
	}

	#[test]
	fn finalize_logit_applies_the_sigmoid_rule() {
		let mut results = make_results(&[5.0, 4.5, 1.0, 0.5]);
		let outcome = finalize_results(&mut results, 20, ScoreKind::Logit).unwrap();
		assert!(outcome.log_message.contains("Gap filter (Logit"));
		assert_eq!(results.len(), 2);
	}

	#[test]
	fn finalize_empty_and_zero_limit() {
		let mut empty: Vec<SemanticResult> = vec![];
		assert!(finalize_results(&mut empty, 20, ScoreKind::Logit).is_none());
		let mut results = make_results(&[0.9, 0.8, 0.7]);
		assert!(finalize_results(&mut results, 0, ScoreKind::Cosine).is_none());
		assert!(results.is_empty());
	}

	// --- format_score_distribution ---

	#[test]
	fn format_score_distribution_empty_results() {
		let output = format_score_distribution("test query", &[], 768, 1.0);
		assert!(output.is_empty());
	}

	#[test]
	fn format_score_distribution_includes_query() {
		let results = make_results(&[0.9, 0.8, 0.7]);
		let output = format_score_distribution("hello world", &results, 768, 1.0);
		assert!(output.contains("hello world"));
	}

	#[test]
	fn format_score_distribution_includes_stats() {
		let results = make_results(&[0.9, 0.8, 0.7]);
		let output = format_score_distribution("test", &results, 768, 1.0);
		assert!(output.contains("n=3"));
		assert!(output.contains("dims=768"));
		assert!(output.contains("norm="));
	}

	#[test]
	fn format_score_distribution_shows_top_results() {
		let results = make_results(&[0.9, 0.8, 0.7]);
		let output = format_score_distribution("test", &results, 768, 1.0);
		assert!(output.contains("#1:"));
		assert!(output.contains("#2:"));
		assert!(output.contains("#3:"));
	}

	#[test]
	fn format_score_distribution_shows_ellipsis_for_many() {
		let results = make_results(&[0.9, 0.85, 0.8, 0.75, 0.7, 0.65, 0.6]);
		let output = format_score_distribution("test", &results, 768, 1.0);
		assert!(output.contains("..."));
		assert!(output.contains("#5:"));
	}

	#[test]
	fn format_score_distribution_single_result() {
		let results = make_results(&[0.9]);
		let output = format_score_distribution("test", &results, 768, 1.0);
		assert!(output.contains("n=1"));
		assert!(output.contains("#1:"));
	}
}
