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
