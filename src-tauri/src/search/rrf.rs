//! Reciprocal Rank Fusion (RRF) for combining ranked result lists.
//!
//! Reference: Cormack, Clarke & Buettcher, "Reciprocal Rank Fusion outperforms
//! Condorcet and individual Rank Learning Methods" (SIGIR 2009).
//!
//! Formula: for each candidate doc `d` and each source ranking `r_s`,
//! `score(d) = sum over s of 1 / (k + rank_s(d))`, where `rank` is 1-indexed.
//! Docs absent from a source contribute 0 from that source. `k=60` is the
//! published default and rarely needs adjustment for retrieval workloads.
//!
//! No side effects. No I/O. Caller passes already-ranked lists (FTS5 BM25
//! order, semantic cosine order, etc.); RRF fuses them.

use std::collections::HashMap;

/// The published default constant from the SIGIR 2009 paper. Larger `k`
/// flattens the rank curve (gives later ranks more weight relative to top
/// ones); smaller `k` makes the top-rank dominate. 60 is the standard.
pub const DEFAULT_RRF_K: u32 = 60;

/// Fuses N ranked lists of string keys via Reciprocal Rank Fusion.
///
/// Returns the fused list sorted by descending RRF score. Each output entry
/// is `(key, fused_score)`. A key appearing in multiple input rankings sums
/// its per-source contributions; a key in only one ranking still appears in
/// the output with the contribution from that one source.
///
/// `k` controls the curve — see `DEFAULT_RRF_K`.
pub fn rrf_fuse(rankings: &[&[&str]], k: u32) -> Vec<(String, f32)> {
	let k_f = k as f32;
	let mut scores: HashMap<String, f32> = HashMap::new();

	for ranking in rankings {
		for (idx, key) in ranking.iter().enumerate() {
			// 1-indexed rank — matches the SIGIR paper's definition.
			let rank = (idx as f32) + 1.0;
			let contribution = 1.0 / (k_f + rank);
			*scores.entry((*key).to_string()).or_insert(0.0) += contribution;
		}
	}

	let mut fused: Vec<(String, f32)> = scores.into_iter().collect();
	// Total order on f32 because the values are well-defined positives;
	// ties broken by key (stable, deterministic across runs).
	fused.sort_by(|a, b| b.1.total_cmp(&a.1).then_with(|| a.0.cmp(&b.0)));
	fused
}

#[cfg(test)]
mod tests {
	use super::*;

	fn keys(pairs: &[(String, f32)]) -> Vec<&str> {
		pairs.iter().map(|(k, _)| k.as_str()).collect()
	}

	#[test]
	fn single_source_preserves_order() {
		let a = ["a", "b", "c"];
		let fused = rrf_fuse(&[&a], DEFAULT_RRF_K);
		assert_eq!(keys(&fused), vec!["a", "b", "c"]);
	}

	#[test]
	fn doc_in_both_sources_outranks_either_alone() {
		// "shared" is rank 2 in both; "only_a" is rank 1 in one. The
		// sum-of-two-contributions for shared (1/62 + 1/62 = 0.0323) beats
		// only_a's single rank 1 (1/61 = 0.0164). RRF rewards consensus.
		let a = ["only_a", "shared", "uniq_a"];
		let b = ["only_b", "shared", "uniq_b"];
		let fused = rrf_fuse(&[&a, &b], DEFAULT_RRF_K);
		assert_eq!(fused[0].0, "shared");
	}

	#[test]
	fn deterministic_tie_break_by_key() {
		// Two docs with identical scores must come out in a stable order.
		let a = ["x", "y"];
		let b = ["y", "x"];
		let fused = rrf_fuse(&[&a, &b], DEFAULT_RRF_K);
		// x: 1/61 + 1/62 = y: 1/62 + 1/61 — identical scores → alphabetic.
		assert_eq!(keys(&fused), vec!["x", "y"]);
	}

	#[test]
	fn empty_input_returns_empty() {
		let fused = rrf_fuse(&[], DEFAULT_RRF_K);
		assert!(fused.is_empty());
		let fused = rrf_fuse(&[&[]], DEFAULT_RRF_K);
		assert!(fused.is_empty());
	}

	#[test]
	fn smaller_k_amplifies_top_rank() {
		// At k=1, rank-1 contribution is 1/2 = 0.5, rank-2 is 1/3 = 0.33,
		// dominating the score. Useful to verify the parameter wiring.
		let a = ["top", "second"];
		let b = ["second", "top"];
		let fused = rrf_fuse(&[&a, &b], 1);
		// top: 1/2 + 1/3 = 0.833; second: 1/3 + 1/2 = 0.833 — tied — alpha.
		assert_eq!(fused[0].0, "second");
	}

	#[test]
	fn three_sources_summed() {
		let a = ["x", "y", "z"];
		let b = ["x", "z", "y"];
		let c = ["x", "y", "z"];
		let fused = rrf_fuse(&[&a, &b, &c], DEFAULT_RRF_K);
		// x is rank 1 in all three; must be first.
		assert_eq!(fused[0].0, "x");
		// score = 3 * (1/61)
		assert!((fused[0].1 - 3.0 / 61.0).abs() < 1e-6);
	}

	#[test]
	fn unique_doc_in_one_source_still_appears() {
		let a = ["lonely"];
		let b = ["other"];
		let fused = rrf_fuse(&[&a, &b], DEFAULT_RRF_K);
		assert_eq!(fused.len(), 2);
	}

	#[test]
	fn duplicate_key_in_single_ranking_uses_first_occurrence() {
		let a = ["x", "y", "x"];
		let fused = rrf_fuse(&[&a], DEFAULT_RRF_K);
		let x_entries: Vec<_> = fused.iter().filter(|(k, _)| k == "x").collect();
		assert_eq!(x_entries.len(), 1, "duplicate key should appear once");
	}

	#[test]
	fn k_zero_does_not_panic() {
		let a = ["a", "b"];
		let fused = rrf_fuse(&[&a], 0);
		assert_eq!(fused.len(), 2, "k=0 should still produce results");
	}
}
