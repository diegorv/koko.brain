//! Pure candidate assembly for `search_hybrid`.
//!
//! After RRF fuses the FTS and semantic path rankings, every fused path needs
//! one representative chunk to hand to the cross-encoder. Before this module
//! existed, the representative came from the semantic top-N only, so a path
//! that just the FTS leg surfaced had no chunk and was silently dropped —
//! the lexical leg could reorder results but never add one. The assembler
//! here picks a chunk for *every* fused path from the full chunk list:
//! the chunk with the most literal query-term hits (content + heading),
//! tie-broken by cosine similarity. For paraphrase queries no chunk has a
//! hit, so the pick collapses to "best cosine chunk" — the previous rule.
//!
//! No I/O. The caller streams chunks in; only chunks whose path is in the
//! fused list are inspected, so the pass is O(N) hash lookups with the
//! lowercase-fold paid only for fused paths.

use std::collections::{HashMap, HashSet};

/// One chunk as seen by the assembler. `cosine` is its similarity to the
/// query embedding; `heading` is the local section heading, if any.
pub struct ChunkCandidate<'a> {
	/// Vault-relative path of the note this chunk belongs to.
	pub path: &'a str,
	/// Section heading, counted toward term hits alongside `content`.
	pub heading: Option<&'a str>,
	/// Chunk body.
	pub content: &'a str,
	/// Cosine similarity between the chunk embedding and the query embedding.
	pub cosine: f32,
}

/// A chosen representative: which fused entry it stands for and the index of
/// the chunk in the caller's chunk sequence (enumeration order of the
/// iterator passed to `assemble_candidates`).
#[derive(Debug, PartialEq, Eq, Clone, Copy)]
pub struct Pick {
	/// Index into the `fused` slice.
	pub fused_index: usize,
	/// Index into the chunk sequence the caller streamed in.
	pub chunk_index: usize,
}

/// Splits a query into lowercase, deduplicated terms on non-alphanumeric
/// boundaries. Tokens shorter than two characters are dropped — they hit
/// almost every chunk and carry no signal.
///
/// This is a literal-match approximation of what FTS5 does (unicode61 with
/// diacritic folding); a term FTS matched through diacritic folding or fuzzy
/// expansion may score zero hits here, in which case the cosine tie-break
/// decides. Good enough: the reranker arbitrates the final order.
pub fn query_terms(query: &str) -> Vec<String> {
	let mut seen: HashSet<String> = HashSet::new();
	let mut out = Vec::new();
	for raw in query.split(|c: char| !c.is_alphanumeric()) {
		if raw.chars().count() < 2 {
			continue;
		}
		let term = raw.to_lowercase();
		if seen.insert(term.clone()) {
			out.push(term);
		}
	}
	out
}

/// Counts how many distinct `terms` occur (case-insensitively) in `content`
/// or `heading`. Returns 0 for an empty term list.
pub fn term_hits(content: &str, heading: Option<&str>, terms: &[String]) -> usize {
	if terms.is_empty() {
		return 0;
	}
	let mut haystack = content.to_lowercase();
	if let Some(h) = heading {
		haystack.push('\n');
		haystack.push_str(&h.to_lowercase());
	}
	terms.iter().filter(|t| haystack.contains(t.as_str())).count()
}

/// Picks one representative chunk per fused path, in fused order, up to
/// `pool` picks.
///
/// Rule per path: most term hits wins; ties go to the higher cosine; a
/// remaining tie keeps the earlier chunk. Paths with no chunk in the stream
/// are skipped and do not consume a pool slot. A path listed twice in
/// `fused` is resolved at its first position only.
pub fn assemble_candidates<'a, I>(
	fused: &[(String, f32)],
	chunks: I,
	terms: &[String],
	pool: usize,
) -> Vec<Pick>
where
	I: IntoIterator<Item = ChunkCandidate<'a>>,
{
	if pool == 0 || fused.is_empty() {
		return Vec::new();
	}

	let mut position: HashMap<&str, usize> = HashMap::with_capacity(fused.len());
	for (idx, (path, _)) in fused.iter().enumerate() {
		position.entry(path.as_str()).or_insert(idx);
	}

	// (hits, cosine, chunk_index) for the best chunk seen so far per fused entry.
	let mut best: Vec<Option<(usize, f32, usize)>> = vec![None; fused.len()];
	for (chunk_index, chunk) in chunks.into_iter().enumerate() {
		let Some(&pos) = position.get(chunk.path) else {
			continue;
		};
		let hits = term_hits(chunk.content, chunk.heading, terms);
		let better = match best[pos] {
			None => true,
			Some((best_hits, best_cos, _)) => {
				hits > best_hits || (hits == best_hits && chunk.cosine > best_cos)
			}
		};
		if better {
			best[pos] = Some((hits, chunk.cosine, chunk_index));
		}
	}

	let mut picks = Vec::with_capacity(pool.min(fused.len()));
	for (fused_index, entry) in best.iter().enumerate() {
		if let Some((_, _, chunk_index)) = entry {
			picks.push(Pick {
				fused_index,
				chunk_index: *chunk_index,
			});
			if picks.len() >= pool {
				break;
			}
		}
	}
	picks
}

#[cfg(test)]
mod tests {
	use super::*;

	fn fused(paths: &[&str]) -> Vec<(String, f32)> {
		paths
			.iter()
			.enumerate()
			.map(|(i, p)| (p.to_string(), 1.0 / (61.0 + i as f32)))
			.collect()
	}

	fn chunk<'a>(path: &'a str, heading: Option<&'a str>, content: &'a str, cosine: f32) -> ChunkCandidate<'a> {
		ChunkCandidate {
			path,
			heading,
			content,
			cosine,
		}
	}

	fn terms(q: &str) -> Vec<String> {
		query_terms(q)
	}

	// --- query_terms ---

	#[test]
	fn query_terms_lowercases_splits_and_dedupes() {
		assert_eq!(
			query_terms("Marcus Aurelius, marcus & the-Stoics"),
			vec!["marcus", "aurelius", "the", "stoics"]
		);
	}

	#[test]
	fn query_terms_drops_single_char_tokens_and_handles_empty() {
		assert_eq!(query_terms("a b c ok"), vec!["ok"]);
		assert!(query_terms("").is_empty());
		assert!(query_terms("   ").is_empty());
	}

	#[test]
	fn query_terms_keeps_code_identifiers_whole() {
		assert_eq!(query_terms("applyNoteChange"), vec!["applynotechange"]);
	}

	// --- term_hits ---

	#[test]
	fn term_hits_counts_distinct_terms_case_insensitively() {
		let t = terms("stoic journaling");
		assert_eq!(term_hits("A Stoic writes. STOIC again.", None, &t), 1);
		assert_eq!(term_hits("journaling with a stoic", None, &t), 2);
		assert_eq!(term_hits("unrelated", None, &t), 0);
	}

	#[test]
	fn term_hits_includes_heading() {
		let t = terms("journaling");
		assert_eq!(term_hits("body without the word", Some("Daily Journaling"), &t), 1);
	}

	#[test]
	fn term_hits_zero_for_empty_terms() {
		assert_eq!(term_hits("anything", Some("x"), &[]), 0);
	}

	// --- assemble_candidates ---

	#[test]
	fn fts_only_path_is_materialized() {
		// "lex.md" is in the fused list (came from FTS) but would have had no
		// chunk under the old semantic-only rule.
		let f = fused(&["sem.md", "lex.md"]);
		let chunks = vec![
			chunk("sem.md", None, "semantic body", 0.9),
			chunk("lex.md", None, "mentions applyNoteChange once", 0.1),
		];
		let picks = assemble_candidates(&f, chunks, &terms("applyNoteChange"), 50);
		assert_eq!(
			picks,
			vec![
				Pick { fused_index: 0, chunk_index: 0 },
				Pick { fused_index: 1, chunk_index: 1 },
			]
		);
	}

	#[test]
	fn prefers_term_hit_chunk_over_higher_cosine_chunk() {
		let f = fused(&["a.md"]);
		let chunks = vec![
			chunk("a.md", None, "high cosine, no term", 0.95),
			chunk("a.md", None, "low cosine but has RRF here", 0.20),
		];
		let picks = assemble_candidates(&f, chunks, &terms("rrf"), 50);
		assert_eq!(picks, vec![Pick { fused_index: 0, chunk_index: 1 }]);
	}

	#[test]
	fn heading_hit_counts_toward_pick() {
		let f = fused(&["a.md"]);
		let chunks = vec![
			chunk("a.md", Some("Intro"), "nothing here", 0.9),
			chunk("a.md", Some("Daily journaling"), "body text", 0.5),
		];
		let picks = assemble_candidates(&f, chunks, &terms("journaling"), 50);
		assert_eq!(picks, vec![Pick { fused_index: 0, chunk_index: 1 }]);
	}

	#[test]
	fn equal_hits_fall_back_to_cosine() {
		let f = fused(&["a.md"]);
		let chunks = vec![
			chunk("a.md", None, "term here", 0.4),
			chunk("a.md", None, "term here too", 0.8),
			chunk("a.md", None, "term", 0.6),
		];
		let picks = assemble_candidates(&f, chunks, &terms("term"), 50);
		assert_eq!(picks, vec![Pick { fused_index: 0, chunk_index: 1 }]);
	}

	#[test]
	fn no_hits_anywhere_uses_best_cosine_like_before() {
		let f = fused(&["a.md"]);
		let chunks = vec![
			chunk("a.md", None, "alpha", 0.3),
			chunk("a.md", None, "beta", 0.7),
		];
		let picks = assemble_candidates(&f, chunks, &terms("paraphrase query"), 50);
		assert_eq!(picks, vec![Pick { fused_index: 0, chunk_index: 1 }]);
	}

	#[test]
	fn exact_tie_keeps_earlier_chunk() {
		let f = fused(&["a.md"]);
		let chunks = vec![chunk("a.md", None, "x", 0.5), chunk("a.md", None, "y", 0.5)];
		let picks = assemble_candidates(&f, chunks, &[], 50);
		assert_eq!(picks, vec![Pick { fused_index: 0, chunk_index: 0 }]);
	}

	#[test]
	fn path_without_chunks_is_skipped_and_does_not_consume_pool() {
		let f = fused(&["ghost.md", "a.md", "b.md"]);
		let chunks = vec![chunk("a.md", None, "a", 0.5), chunk("b.md", None, "b", 0.5)];
		let picks = assemble_candidates(&f, chunks, &[], 2);
		assert_eq!(
			picks,
			vec![
				Pick { fused_index: 1, chunk_index: 0 },
				Pick { fused_index: 2, chunk_index: 1 },
			]
		);
	}

	#[test]
	fn pool_cap_and_fused_order_are_respected() {
		let f = fused(&["c.md", "a.md", "b.md"]);
		let chunks = vec![
			chunk("a.md", None, "a", 0.9),
			chunk("b.md", None, "b", 0.9),
			chunk("c.md", None, "c", 0.1),
		];
		let picks = assemble_candidates(&f, chunks, &[], 2);
		// Fused order (c, a), not cosine order, and only two picks.
		assert_eq!(
			picks,
			vec![
				Pick { fused_index: 0, chunk_index: 2 },
				Pick { fused_index: 1, chunk_index: 0 },
			]
		);
	}

	#[test]
	fn duplicate_fused_path_resolves_at_first_position_only() {
		let f = fused(&["a.md", "a.md"]);
		let chunks = vec![chunk("a.md", None, "a", 0.5)];
		let picks = assemble_candidates(&f, chunks, &[], 50);
		assert_eq!(picks, vec![Pick { fused_index: 0, chunk_index: 0 }]);
	}

	#[test]
	fn empty_inputs_yield_empty() {
		let chunks = vec![chunk("a.md", None, "a", 0.5)];
		assert!(assemble_candidates(&[], chunks, &[], 50).is_empty());
		let f = fused(&["a.md"]);
		assert!(assemble_candidates(&f, Vec::<ChunkCandidate>::new(), &[], 50).is_empty());
		let chunks = vec![chunk("a.md", None, "a", 0.5)];
		assert!(assemble_candidates(&f, chunks, &[], 0).is_empty());
	}
}
