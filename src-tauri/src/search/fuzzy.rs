use rusqlite::Connection;
use std::collections::HashSet;

/// Computes Levenshtein edit distance between two strings (case-insensitive).
pub fn levenshtein(a: &str, b: &str) -> usize {
	let a_lower = a.to_lowercase();
	let b_lower = b.to_lowercase();
	let a_chars: Vec<char> = a_lower.chars().collect();
	let b_chars: Vec<char> = b_lower.chars().collect();
	let m = a_chars.len();
	let n = b_chars.len();

	let mut prev = vec![0usize; n + 1];
	let mut curr = vec![0usize; n + 1];

	for j in 0..=n {
		prev[j] = j;
	}

	for i in 1..=m {
		curr[0] = i;
		for j in 1..=n {
			let cost = if a_chars[i - 1] == b_chars[j - 1] {
				0
			} else {
				1
			};
			curr[j] = (prev[j] + 1)
				.min(curr[j - 1] + 1)
				.min(prev[j - 1] + cost);
		}
		std::mem::swap(&mut prev, &mut curr);
	}

	prev[n]
}

/// Auto-selects max edit distance based on term length (character count, not bytes).
pub fn auto_distance(term: &str) -> usize {
	match term.chars().count() {
		0..=2 => 0, // too short for fuzzy
		3..=5 => 1, // 1 edit allowed
		_ => 2,     // 2 edits allowed
	}
}

/// Expands a query term to include fuzzy matches from the FTS5 vocabulary.
/// Uses the centralized `db::fts_repo::expand_vocab_terms` for the DB query,
/// then filters by Levenshtein distance locally.
pub fn expand_fuzzy_terms(conn: &Connection, term: &str) -> Result<Vec<String>, String> {
	let max_dist = auto_distance(term);
	if max_dist == 0 {
		return Ok(vec![term.to_lowercase()]);
	}

	let term_lower = term.to_lowercase();

	// Use first char prefix to reduce candidate set from vocab table
	let first_char: String = term_lower.chars().take(1).collect();
	let pattern = format!("{}%", first_char);

	let candidates = crate::db::fts_repo::expand_vocab_terms(conn, &pattern, 500)?;

	let mut result = vec![term_lower.clone()];
	let mut seen = HashSet::new();
	seen.insert(term_lower.clone());
	for candidate in candidates {
		if levenshtein(&term_lower, &candidate) <= max_dist && seen.insert(candidate.clone()) {
			result.push(candidate);
		}
	}
	Ok(result)
}

#[cfg(test)]
mod tests {
	use super::*;

	// --- levenshtein ---

	#[test]
	fn levenshtein_identical_strings() {
		assert_eq!(levenshtein("hello", "hello"), 0);
	}

	#[test]
	fn levenshtein_both_empty() {
		assert_eq!(levenshtein("", ""), 0);
	}

	#[test]
	fn levenshtein_one_empty() {
		assert_eq!(levenshtein("", "abc"), 3);
		assert_eq!(levenshtein("abc", ""), 3);
	}

	#[test]
	fn levenshtein_single_substitution() {
		assert_eq!(levenshtein("cat", "car"), 1);
	}

	#[test]
	fn levenshtein_single_insertion() {
		assert_eq!(levenshtein("cat", "cats"), 1);
	}

	#[test]
	fn levenshtein_single_deletion() {
		assert_eq!(levenshtein("cats", "cat"), 1);
	}

	#[test]
	fn levenshtein_case_insensitive() {
		assert_eq!(levenshtein("Hello", "hello"), 0);
		assert_eq!(levenshtein("WORLD", "world"), 0);
	}

	#[test]
	fn levenshtein_unicode() {
		// e (composed) vs e - 1 edit
		assert_eq!(levenshtein("café", "cafe"), 1);
	}

	#[test]
	fn levenshtein_completely_different() {
		assert_eq!(levenshtein("abc", "xyz"), 3);
	}

	#[test]
	fn levenshtein_transposition_is_two_edits() {
		// Levenshtein (not Damerau-Levenshtein) treats transposition as 2 edits
		assert_eq!(levenshtein("ab", "ba"), 2);
	}

	#[test]
	fn levenshtein_single_char_strings() {
		assert_eq!(levenshtein("a", "a"), 0);
		assert_eq!(levenshtein("a", "b"), 1);
	}

	#[test]
	fn levenshtein_symmetric() {
		assert_eq!(levenshtein("kitten", "sitting"), levenshtein("sitting", "kitten"));
	}

	#[test]
	fn levenshtein_classic_example() {
		// Classic textbook example: kitten -> sitting = 3
		assert_eq!(levenshtein("kitten", "sitting"), 3);
	}

	// --- auto_distance ---

	#[test]
	fn auto_distance_empty_string() {
		assert_eq!(auto_distance(""), 0);
	}

	#[test]
	fn auto_distance_short_terms_return_zero() {
		assert_eq!(auto_distance("a"), 0);
		assert_eq!(auto_distance("ab"), 0);
	}

	#[test]
	fn auto_distance_medium_terms_return_one() {
		assert_eq!(auto_distance("abc"), 1);
		assert_eq!(auto_distance("abcd"), 1);
		assert_eq!(auto_distance("abcde"), 1);
	}

	#[test]
	fn auto_distance_long_terms_return_two() {
		assert_eq!(auto_distance("abcdef"), 2);
		assert_eq!(auto_distance("abcdefghij"), 2);
	}

	#[test]
	fn auto_distance_boundary_values() {
		// Boundary: 2 chars -> 0, 3 chars -> 1
		assert_eq!(auto_distance("ab"), 0);
		assert_eq!(auto_distance("abc"), 1);
		// Boundary: 5 chars -> 1, 6 chars -> 2
		assert_eq!(auto_distance("abcde"), 1);
		assert_eq!(auto_distance("abcdef"), 2);
	}

	#[test]
	fn auto_distance_unicode_counts_chars_not_bytes() {
		// "ao" = 2 chars but 4 bytes in UTF-8 -> should return 0 (too short)
		assert_eq!(auto_distance("ão"), 0);
		// "acao" = 4 chars but 7 bytes -> should return 1 (medium)
		assert_eq!(auto_distance("ação"), 1);
		// "cafe" = 4 chars but 5 bytes -> should return 1 (medium)
		assert_eq!(auto_distance("café"), 1);
		// "codigo" = 6 chars but 8 bytes -> should return 2 (long)
		assert_eq!(auto_distance("código"), 2);
	}
}
