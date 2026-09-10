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
//! A fused path with *no* chunk at all (a file saved before the semantic
//! indexer caught up, or one that produced no chunks) still has nothing to
//! pick, so it is materialized from its FTS row instead: the snippet becomes
//! the result body and the RRF score the provisional score. That keeps text
//! mode's hits a subset of the hybrid rerank pool. `build_pool` merges the
//! two streams by fused rank and caps the result — the caller never sees the
//! seam.
//!
//! No I/O. The caller streams chunks in; only chunks whose path is in the
//! fused list are inspected, so the pass is O(N) hash lookups with the
//! lowercase-fold paid only for fused paths.

use std::collections::{HashMap, HashSet};

use crate::semantic::types::SemanticResult;

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

/// English and Portuguese function words dropped from the term list.
///
/// Matched literally against the already-lowercased token, so the accented
/// forms are spelled out: `query_terms` does not fold diacritics.
const STOP_WORDS: &[&str] = &[
	// en
	"the", "and", "for", "with", "that", "this", "from", "are", "was", "you", "your", "what", "how",
	"when", "which", "not", "but", "can",
	// pt
	"que", "para", "com", "uma", "dos", "das", "por", "como", "não", "mais", "sobre", "pelo", "pela",
	"ser", "isso", "quando", "onde", "mas",
];

/// Splits a query into lowercase, deduplicated terms on non-alphanumeric
/// boundaries. Tokens shorter than three characters and the `STOP_WORDS`
/// function words are dropped: `term_hits` is a boundary-less substring
/// match, so "que" hits inside "porque", "com" inside "commit" and "not"
/// inside "note", and the "most hits wins" rule degenerates into "the
/// longest chunk wins".
///
/// The three-character floor also drops short identifiers ("ai", "go", "js").
/// Acceptable: a dropped term only costs a worse representative chunk for a
/// path RRF has already fused, never a path and never an FTS match.
///
/// This is a literal-match approximation of what FTS5 does (unicode61 with
/// diacritic folding); a term FTS matched through diacritic folding or fuzzy
/// expansion may score zero hits here, in which case the cosine tie-break
/// decides. Good enough: the reranker arbitrates the final order.
pub fn query_terms(query: &str) -> Vec<String> {
	let mut seen: HashSet<String> = HashSet::new();
	let mut out = Vec::new();
	for raw in query.split(|c: char| !c.is_alphanumeric()) {
		if raw.chars().count() < 3 {
			continue;
		}
		let term = raw.to_lowercase();
		if STOP_WORDS.contains(&term.as_str()) {
			continue;
		}
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

/// Builds a `SemanticResult` for a fused path that has no chunk in the
/// semantic index, out of its FTS row.
///
/// `snippet` is the FTS5 `snippet()` column, so the `<mark>` / `</mark>`
/// highlight tags are stripped (the `...` ellipses FTS5 inserts are kept —
/// they are honest about the elision). `heading` is `None` and the line
/// numbers are 0, which the frontend clamps to the top of the file: without
/// a chunk there is no section to point at. The key is `<path>#fts`; it
/// cannot collide with a chunk key for the same path because `build_pool`
/// only ever synthesizes a path the assembler found no chunk for.
///
/// `rrf` is the provisional score, overwritten by the reranker when it runs.
fn synthesize_from_fts(path: &str, snippet: &str, rrf: f32) -> SemanticResult {
	SemanticResult {
		key: format!("{path}#fts"),
		source_path: path.to_string(),
		content: snippet.replace("<mark>", "").replace("</mark>", ""),
		heading: None,
		line_start: 0,
		line_end: 0,
		score: rrf,
	}
}

/// Materializes the fused entries `assemble_candidates` could not pick a
/// chunk for, in fused order, from the FTS snippets in `snippets`. Each
/// entry is paired with its index into `fused` so `build_pool` can merge it
/// back among the picks by rank.
///
/// A fused path is synthesized only when no pick stands for it and the FTS
/// leg carries a snippet for it. `build_pool` runs the assembler with no
/// cap, so "has no pick" is exactly "has no chunk in the stream" — never "a
/// chunk-backed path that fell outside the cap", which would put two entries
/// in the pool for one path. A snippet that is empty once the `<mark>` tags
/// come off (an FTS match that landed in the title, headings or tags column
/// of a body-less note) is dropped rather than spending a pool slot on a
/// blank row the cross-encoder cannot judge. Duplicate fused paths yield at
/// most one entry.
fn synthesize_fts_only(
	fused: &[(String, f32)],
	picks: &[Pick],
	snippets: &HashMap<&str, &str>,
) -> Vec<(usize, SemanticResult)> {
	let mut seen: HashSet<&str> = picks
		.iter()
		.filter_map(|p| fused.get(p.fused_index).map(|(path, _)| path.as_str()))
		.collect();

	let mut out = Vec::new();
	for (fused_index, (path, rrf)) in fused.iter().enumerate() {
		let Some(snippet) = snippets.get(path.as_str()) else {
			continue;
		};
		if !seen.insert(path.as_str()) {
			continue;
		}
		let entry = synthesize_from_fts(path, snippet, *rrf);
		if entry.content.trim().is_empty() {
			continue;
		}
		out.push((fused_index, entry));
	}
	out
}

/// One entry of the rerank pool, in fused order.
pub enum PoolEntry {
	/// A fused path represented by one of its chunks.
	Chunk(Pick),
	/// A fused path with no chunk at all, materialized from its FTS row.
	Fts(SemanticResult),
}

/// Assembles the whole rerank pool for `fused`, in fused order, capped at
/// `pool` entries.
///
/// Every fused path with at least one chunk in `chunks` contributes its
/// representative chunk (`assemble_candidates`); every remaining fused path
/// the FTS leg carries a usable snippet for contributes a synthesized entry.
/// The assembler runs uncapped and the cut to `pool` happens only after the
/// two streams are merged by fused rank, so a top-ranked chunkless path is
/// never displaced by a chunk pick ranked below it — the whole point of
/// synthesizing at all.
pub fn build_pool<'a, I>(
	fused: &[(String, f32)],
	chunks: I,
	terms: &[String],
	snippets: &HashMap<&str, &str>,
	pool: usize,
) -> Vec<PoolEntry>
where
	I: IntoIterator<Item = ChunkCandidate<'a>>,
{
	if pool == 0 {
		return Vec::new();
	}

	let picks = assemble_candidates(fused, chunks, terms, fused.len());
	let synthesized = synthesize_fts_only(fused, &picks, snippets);

	// Both streams are already ascending in `fused_index` and their index
	// sets are disjoint, so a stable sort interleaves them by fused rank.
	let mut merged: Vec<(usize, PoolEntry)> = picks
		.iter()
		.map(|p| (p.fused_index, PoolEntry::Chunk(*p)))
		.chain(
			synthesized
				.into_iter()
				.map(|(fused_index, result)| (fused_index, PoolEntry::Fts(result))),
		)
		.collect();
	merged.sort_by_key(|(fused_index, _)| *fused_index);
	merged.truncate(pool);
	merged.into_iter().map(|(_, entry)| entry).collect()
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
		// "the" used to survive here; it is now a STOP_WORDS entry.
		assert_eq!(
			query_terms("Marcus Aurelius, marcus & the-Stoics"),
			vec!["marcus", "aurelius", "stoics"]
		);
	}

	#[test]
	fn query_terms_drops_short_tokens_and_handles_empty() {
		// Was "a b c ok" -> ["ok"] under the 1-char rule; the floor is now 3
		// characters, so the 2-char "ok" goes too.
		assert!(query_terms("a b c ok").is_empty());
		assert!(query_terms("").is_empty());
		assert!(query_terms("   ").is_empty());
	}

	#[test]
	fn query_terms_drops_two_char_tokens_but_keeps_content_words() {
		assert_eq!(query_terms("js ai kb embeddings"), vec!["embeddings"]);
	}

	#[test]
	fn query_terms_keeps_code_identifiers_whole() {
		assert_eq!(query_terms("applyNoteChange"), vec!["applynotechange"]);
	}

	#[test]
	fn query_terms_drops_stop_words_from_a_portuguese_paraphrase() {
		assert_eq!(
			query_terms("Como é que eu faço para não perder mais os anexos das notas?"),
			vec!["faço", "perder", "anexos", "notas"]
		);
	}

	#[test]
	fn query_terms_folds_case_on_accented_stop_words() {
		// to_lowercase() is unicode-aware, so the accented stop words match in
		// any casing; query_terms still does not fold the accent itself.
		assert!(query_terms("NÃO").is_empty());
		assert_eq!(query_terms("Sessão"), vec!["sessão"]);
	}

	#[test]
	fn query_terms_all_stop_words_yields_empty_list() {
		// The pt-side twin lives in term_hits_zero_when_the_query_is_only_stop_words.
		assert!(query_terms("what can you do with this").is_empty());
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

	#[test]
	fn term_hits_zero_when_the_query_is_only_stop_words() {
		let t = terms("mais sobre isso");
		assert!(t.is_empty());
		assert_eq!(term_hits("fala mais sobre isso aqui", Some("Sobre"), &t), 0);
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
	fn mixed_query_ignores_substring_only_stop_word_hits() {
		// The regression this change exists for. Old terms were ["para", "não",
		// "perder", "anexos"], giving the long chunk 3 hits ("para" inside
		// "separar", "não" inside "nãozinho", plus "perder") against 2 for the
		// short one, so the long chunk won on substring noise. With the stop
		// words gone the terms are ["perder", "anexos"] and the short chunk that
		// actually carries both wins on hits, not cosine: its cosine is lower.
		let f = fused(&["a.md"]);
		let chunks = vec![
			chunk("a.md", None, "como separar nãozinho de tudo sem perder o fio da meada", 0.2),
			chunk("a.md", None, "anexos perder", 0.1),
		];
		let picks = assemble_candidates(&f, chunks, &terms("para não perder anexos"), 50);
		assert_eq!(picks, vec![Pick { fused_index: 0, chunk_index: 1 }]);
	}

	#[test]
	fn all_stop_word_query_falls_back_to_cosine() {
		// Every token is a stop word, so no chunk can out-hit another and the
		// pick collapses to the highest cosine even though the longer chunk
		// contains all of them as substrings.
		let f = fused(&["a.md"]);
		let chunks = vec![
			chunk("a.md", None, "mais sobre isso, com uma nota grande e desde sempre", 0.2),
			chunk("a.md", None, "curto", 0.9),
		];
		let picks = assemble_candidates(&f, chunks, &terms("mais sobre isso"), 50);
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

	// --- synthesize_from_fts ---

	fn snippets<'a>(pairs: &[(&'a str, &'a str)]) -> HashMap<&'a str, &'a str> {
		pairs.iter().copied().collect()
	}

	#[test]
	fn synthesize_from_fts_strips_mark_tags_and_zeroes_lines() {
		let r = synthesize_from_fts("notes/a.md", "...an <mark>anexo</mark> here...", 0.25);
		assert_eq!(r.key, "notes/a.md#fts");
		assert_eq!(r.source_path, "notes/a.md");
		assert_eq!(r.content, "...an anexo here...");
		assert_eq!(r.heading, None);
		assert_eq!(r.line_start, 0);
		assert_eq!(r.line_end, 0);
		assert_eq!(r.score, 0.25);
	}

	#[test]
	fn synthesize_from_fts_handles_an_empty_snippet() {
		let r = synthesize_from_fts("a.md", "", 0.1);
		assert_eq!(r.content, "");
		assert_eq!(r.key, "a.md#fts");
	}

	// --- synthesize_fts_only ---

	#[test]
	fn chunkless_fused_path_is_synthesized_from_its_fts_row() {
		let f = fused(&["ghost.md", "a.md"]);
		let chunks = vec![chunk("a.md", None, "a", 0.5)];
		let picks = assemble_candidates(&f, chunks, &[], f.len());
		assert_eq!(picks, vec![Pick { fused_index: 1, chunk_index: 0 }]);

		let s = snippets(&[("ghost.md", "brand <mark>new</mark> file"), ("a.md", "a")]);
		let synth = synthesize_fts_only(&f, &picks, &s);
		assert_eq!(synth.len(), 1);
		assert_eq!(synth[0].0, 0);
		assert_eq!(synth[0].1.source_path, "ghost.md");
		assert_eq!(synth[0].1.content, "brand new file");
		assert_eq!(synth[0].1.score, f[0].1);
	}

	#[test]
	fn path_with_chunks_is_never_synthesized() {
		let f = fused(&["a.md", "b.md"]);
		let chunks = vec![chunk("a.md", None, "a", 0.5), chunk("b.md", None, "b", 0.5)];
		let picks = assemble_candidates(&f, chunks, &[], f.len());
		let s = snippets(&[("a.md", "a"), ("b.md", "b")]);
		assert!(synthesize_fts_only(&f, &picks, &s).is_empty());
	}

	#[test]
	fn chunkless_path_without_an_fts_snippet_is_left_out() {
		// Only the FTS leg can surface a chunkless path, so a fused entry with
		// no snippet cannot be synthesized (nothing to put in `content`).
		let f = fused(&["ghost.md"]);
		let picks = assemble_candidates(&f, Vec::<ChunkCandidate>::new(), &[], f.len());
		assert!(picks.is_empty());
		assert!(synthesize_fts_only(&f, &picks, &snippets(&[])).is_empty());
	}

	#[test]
	fn chunkless_path_with_a_blank_snippet_is_left_out() {
		// An FTS match in the title / headings / tags column snippets the
		// content column with no marks; a body-less note yields "".
		let f = fused(&["ghost.md", "spaces.md"]);
		let picks = assemble_candidates(&f, Vec::<ChunkCandidate>::new(), &[], f.len());
		let s = snippets(&[("ghost.md", ""), ("spaces.md", "  \n ")]);
		assert!(synthesize_fts_only(&f, &picks, &s).is_empty());
	}

	#[test]
	fn synthesized_entries_keep_fused_order() {
		let f = fused(&["g1.md", "a.md", "g2.md"]);
		let chunks = vec![chunk("a.md", None, "a", 0.5)];
		let picks = assemble_candidates(&f, chunks, &[], f.len());
		let s = snippets(&[("g1.md", "one"), ("g2.md", "two"), ("a.md", "a")]);
		let synth = synthesize_fts_only(&f, &picks, &s);
		let entries: Vec<(usize, &str)> =
			synth.iter().map(|(i, r)| (*i, r.source_path.as_str())).collect();
		assert_eq!(entries, vec![(0, "g1.md"), (2, "g2.md")]);
	}

	#[test]
	fn duplicate_chunkless_fused_path_is_synthesized_once() {
		let f = fused(&["ghost.md", "ghost.md"]);
		let picks = assemble_candidates(&f, Vec::<ChunkCandidate>::new(), &[], f.len());
		let s = snippets(&[("ghost.md", "once")]);
		assert_eq!(synthesize_fts_only(&f, &picks, &s).len(), 1);
	}

	#[test]
	fn duplicate_fused_path_with_a_pick_is_not_also_synthesized() {
		// `assemble_candidates` resolves a duplicate at its first position
		// only, so the second position has no pick — matching by path, not by
		// fused index, is what keeps it out of the synthesized list.
		let f = fused(&["a.md", "a.md"]);
		let chunks = vec![chunk("a.md", None, "a", 0.5)];
		let picks = assemble_candidates(&f, chunks, &[], f.len());
		let s = snippets(&[("a.md", "a")]);
		assert!(synthesize_fts_only(&f, &picks, &s).is_empty());
	}

	#[test]
	fn synthesize_fts_only_handles_empty_inputs() {
		let s = snippets(&[("a.md", "a")]);
		assert!(synthesize_fts_only(&[], &[], &s).is_empty());
		let f = fused(&["a.md"]);
		assert!(synthesize_fts_only(&f, &[], &snippets(&[])).is_empty());
	}

	// --- build_pool ---

	/// Compact view of a pool: `Ok(fused_index)` for a chunk pick,
	/// `Err(path)` for a synthesized entry.
	fn pool_shape(entries: &[PoolEntry]) -> Vec<Result<usize, String>> {
		entries
			.iter()
			.map(|e| match e {
				PoolEntry::Chunk(p) => Ok(p.fused_index),
				PoolEntry::Fts(r) => Err(r.source_path.clone()),
			})
			.collect()
	}

	#[test]
	fn build_pool_interleaves_picks_and_synthesized_by_fused_rank() {
		let f = fused(&["g1.md", "a.md", "g2.md", "b.md"]);
		let chunks = vec![chunk("a.md", None, "a", 0.5), chunk("b.md", None, "b", 0.5)];
		let s = snippets(&[("g1.md", "one"), ("g2.md", "two")]);
		let entries = build_pool(&f, chunks, &[], &s, 50);
		assert_eq!(
			pool_shape(&entries),
			vec![Err("g1.md".to_string()), Ok(1), Err("g2.md".to_string()), Ok(3)]
		);
	}

	#[test]
	fn build_pool_keeps_a_top_ranked_chunkless_path_when_picks_would_fill_the_cap() {
		// The regression that made the fix a no-op: with the cap applied to
		// the picks alone, 50 chunk-backed paths left zero slots and even a
		// chunkless path at fused rank 0 was dropped.
		let mut paths = vec!["ghost.md".to_string()];
		paths.extend((0..60).map(|i| format!("c{i}.md")));
		let refs: Vec<&str> = paths.iter().map(|s| s.as_str()).collect();
		let f = fused(&refs);
		let chunks: Vec<ChunkCandidate> = refs[1..]
			.iter()
			.map(|p| chunk(p, None, "body", 0.5))
			.collect();
		let s = snippets(&[("ghost.md", "brand new file")]);

		let entries = build_pool(&f, chunks, &[], &s, 50);
		assert_eq!(entries.len(), 50);
		match &entries[0] {
			PoolEntry::Fts(r) => assert_eq!(r.source_path, "ghost.md"),
			PoolEntry::Chunk(_) => panic!("the top-ranked chunkless path was displaced"),
		}
		// The cap still bites: the 11 lowest-ranked chunk picks fell off.
		assert!(matches!(entries[49], PoolEntry::Chunk(Pick { fused_index: 49, .. })));
	}

	#[test]
	fn build_pool_honours_a_zero_cap_and_empty_fused() {
		let f = fused(&["a.md"]);
		let chunks = vec![chunk("a.md", None, "a", 0.5)];
		assert!(build_pool(&f, chunks, &[], &snippets(&[]), 0).is_empty());
		assert!(build_pool(&[], Vec::<ChunkCandidate>::new(), &[], &snippets(&[("a.md", "a")]), 50)
			.is_empty());
	}
}
