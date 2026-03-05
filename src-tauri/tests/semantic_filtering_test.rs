use kokobrain_lib::semantic::filtering::{adaptive_filter, format_score_distribution};
use kokobrain_lib::semantic::types::SemanticResult;

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
	// All scores very close together — gaps (0.001) well below 4% of top (0.02)
	let results = make_results(&[0.500, 0.499, 0.498, 0.497, 0.496]);
	let outcome = adaptive_filter(&results).unwrap();
	// Max gap = 0.001, threshold = 0.500 * 0.04 = 0.02 → NOT > threshold
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
	// 0.015 < 0.025 → gap filter does NOT trigger, falls back to stddev
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
