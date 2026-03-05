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

	// If the largest gap is significant (>4% of top score), cut there
	let gap_threshold = top_score * 0.04;
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
