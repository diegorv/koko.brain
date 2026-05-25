use crate::semantic::types::SemanticResult;

/// Result of adaptive filtering, includes the filtered results and a log message.
pub struct FilterOutcome {
	/// How many results to keep (truncate to this index).
	pub keep_count: usize,
	/// Diagnostic log message describing what was applied.
	pub log_message: String,
}

/// Applies adaptive filtering to remove noise from semantic search results.
///
/// Two strategies are tried in order:
/// 1. **Gap filter**: finds the largest gap between consecutive scores.
///    If the gap exceeds 4% of the top score, results are cut at that point.
/// 2. **Dynamic min filter** (fallback): computes `mean - 1*stddev` as a dynamic
///    minimum score and removes results below it.
///
/// Requires at least 3 results to apply any filtering. Returns `None` if
/// filtering is not applicable (fewer than 3 results).
pub fn adaptive_filter(results: &[SemanticResult]) -> Option<FilterOutcome> {
	if results.len() < 3 {
		return None;
	}

	let scores: Vec<f32> = results.iter().map(|r| r.score).collect();
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

	// If the largest gap is significant (>4% of top score magnitude), cut there.
	// abs() prevents negative reranker logits from making the threshold negative
	// (which would cause any trivial gap to trigger the filter).
	let gap_threshold = top_score.abs() * 0.04;
	if max_gap > gap_threshold && gap_idx < scores.len() - 1 {
		let cut_at = gap_idx + 1;
		return Some(FilterOutcome {
			keep_count: cut_at,
			log_message: format!(
				"Gap filter: cut at #{} (gap={:.4}, threshold={:.4})",
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

	let keep_count = results.iter().filter(|r| r.score >= dynamic_min).count();
	let removed = results.len() - keep_count;

	Some(FilterOutcome {
		keep_count,
		log_message: format!(
			"Dynamic min filter: {:.4} (mean={:.4} - stddev={:.4}), removed {}",
			dynamic_min, mean, stddev, removed
		),
	})
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
		assert!(adaptive_filter(&results).is_none());
	}

	#[test]
	fn filter_returns_none_for_empty() {
		let results: Vec<SemanticResult> = vec![];
		assert!(adaptive_filter(&results).is_none());
	}

	#[test]
	fn filter_gap_detection_cuts_at_largest_gap() {
		// Scores: 0.9, 0.85, 0.80 then big gap to 0.50, 0.45
		let results = make_results(&[0.90, 0.85, 0.80, 0.50, 0.45]);
		let outcome = adaptive_filter(&results).unwrap();
		// Gap between 0.80 and 0.50 = 0.30 is much bigger than 4% of 0.90 = 0.036
		assert_eq!(outcome.keep_count, 3);
		assert!(outcome.log_message.contains("Gap filter"));
	}

	#[test]
	fn filter_gap_detection_with_clear_separation() {
		// Top result clearly separated from rest
		let results = make_results(&[0.95, 0.60, 0.58, 0.55]);
		let outcome = adaptive_filter(&results).unwrap();
		// Gap between 0.95 and 0.60 = 0.35, threshold = 0.038
		assert_eq!(outcome.keep_count, 1);
		assert!(outcome.log_message.contains("Gap filter"));
	}

	#[test]
	fn filter_falls_back_to_stddev_when_no_significant_gap() {
		// All scores very close together -- gaps (0.001) well below 4% of top (0.02)
		let results = make_results(&[0.500, 0.499, 0.498, 0.497, 0.496]);
		let outcome = adaptive_filter(&results).unwrap();
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
		let outcome = adaptive_filter(&results).unwrap();
		// Gap between 0.77 and 0.30 = 0.47, threshold = 0.80 * 0.04 = 0.032
		// Gap filter should catch this
		assert_eq!(outcome.keep_count, 4);
		assert!(outcome.log_message.contains("Gap filter"));
	}

	#[test]
	fn filter_identical_scores() {
		let results = make_results(&[0.70, 0.70, 0.70, 0.70]);
		let outcome = adaptive_filter(&results).unwrap();
		// All gaps are 0, threshold = 0.70 * 0.04 = 0.028
		// Falls back to dynamic min: stddev = 0, dynamic_min = 0.70
		assert!(outcome.log_message.contains("Dynamic min filter"));
		assert_eq!(outcome.keep_count, 4);
	}

	#[test]
	fn filter_exactly_3_results() {
		let results = make_results(&[0.90, 0.50, 0.40]);
		let outcome = adaptive_filter(&results).unwrap();
		// Gap between 0.90 and 0.50 = 0.40, threshold = 0.036
		assert_eq!(outcome.keep_count, 1);
	}

	#[test]
	fn filter_does_not_cut_small_gaps_in_realistic_semantic_scores() {
		// Regression: "comida" query returned scores clustered in 0.61-0.63 range.
		// The old 2% threshold (0.013) cut after #1 because the gap to #2 was 0.015.
		// With 4% threshold (0.025), these small gaps are preserved.
		let results = make_results(&[0.633, 0.618, 0.615, 0.610, 0.605, 0.598]);
		let outcome = adaptive_filter(&results).unwrap();
		// Max gap = 0.633 - 0.618 = 0.015, threshold = 0.633 * 0.04 = 0.025
		// 0.015 < 0.025 -> gap filter does NOT trigger, falls back to stddev
		assert!(outcome.log_message.contains("Dynamic min filter"));
		assert!(outcome.keep_count >= 4);
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
