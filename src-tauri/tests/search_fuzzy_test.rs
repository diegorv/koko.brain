use kokobrain_lib::db;
use kokobrain_lib::search::fuzzy::{auto_distance, expand_fuzzy_terms, levenshtein};
use std::sync::Mutex;
use tempfile::TempDir;

/// Tests that use the global DB must run serially.
static TEST_LOCK: Mutex<()> = Mutex::new(());

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
	// é (composed) vs e — 1 edit
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
	// Classic textbook example: kitten → sitting = 3
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
	// Boundary: 2 chars → 0, 3 chars → 1
	assert_eq!(auto_distance("ab"), 0);
	assert_eq!(auto_distance("abc"), 1);
	// Boundary: 5 chars → 1, 6 chars → 2
	assert_eq!(auto_distance("abcde"), 1);
	assert_eq!(auto_distance("abcdef"), 2);
}

#[test]
fn auto_distance_unicode_counts_chars_not_bytes() {
	// "ão" = 2 chars but 4 bytes in UTF-8 → should return 0 (too short)
	assert_eq!(auto_distance("ão"), 0);
	// "ação" = 4 chars but 7 bytes → should return 1 (medium)
	assert_eq!(auto_distance("ação"), 1);
	// "café" = 4 chars but 5 bytes → should return 1 (medium)
	assert_eq!(auto_distance("café"), 1);
	// "código" = 6 chars but 8 bytes → should return 2 (long)
	assert_eq!(auto_distance("código"), 2);
}

// --- expand_fuzzy_terms ---

fn setup_db() -> TempDir {
	let tmp = TempDir::new().unwrap();
	let _ = db::close_database();
	db::open_database(tmp.path()).unwrap();
	tmp
}

fn teardown() {
	let _ = db::close_database();
}

/// Inserts entries into FTS to populate the vocab table.
fn populate_vocab(words: &[&str]) {
	db::with_db(|conn| {
		for (i, word) in words.iter().enumerate() {
			let path = format!("note{}.md", i);
			conn.execute(
				"INSERT INTO notes_fts(path, title, content, headings, tags) VALUES (?1, ?2, ?3, '', '')",
				rusqlite::params![path, word, word],
			)
			.map_err(|e| e.to_string())?;
		}
		Ok(())
	})
	.unwrap();
}

#[test]
fn expand_short_term_returns_only_lowercased() {
	let _guard = TEST_LOCK.lock().unwrap();
	let _tmp = setup_db();

	populate_vocab(&["at", "ax", "an"]);

	db::with_db(|conn| {
		let result = expand_fuzzy_terms(conn, "at")?;
		// ≤2 chars → auto_distance = 0, no fuzzy expansion
		assert_eq!(result, vec!["at"]);
		Ok(())
	})
	.unwrap();

	teardown();
}

#[test]
fn expand_short_term_lowercases_input() {
	let _guard = TEST_LOCK.lock().unwrap();
	let _tmp = setup_db();

	db::with_db(|conn| {
		let result = expand_fuzzy_terms(conn, "AB")?;
		assert_eq!(result, vec!["ab"]);
		Ok(())
	})
	.unwrap();

	teardown();
}

#[test]
fn expand_medium_term_finds_distance_one_matches() {
	let _guard = TEST_LOCK.lock().unwrap();
	let _tmp = setup_db();

	// "cat" (3 chars) → auto_distance = 1
	// "car" is distance 1 from "cat", "can" is distance 1, "dog" is distance 3
	populate_vocab(&["cat", "car", "can", "dog"]);

	db::with_db(|conn| {
		let result = expand_fuzzy_terms(conn, "cat")?;
		assert!(result.contains(&"cat".to_string()), "should contain original term");
		assert!(result.contains(&"car".to_string()), "car is distance 1");
		assert!(result.contains(&"can".to_string()), "can is distance 1");
		assert!(!result.contains(&"dog".to_string()), "dog is distance 3");
		Ok(())
	})
	.unwrap();

	teardown();
}

#[test]
fn expand_long_term_finds_distance_two_matches() {
	let _guard = TEST_LOCK.lock().unwrap();
	let _tmp = setup_db();

	// "kitten" (6 chars) → auto_distance = 2
	populate_vocab(&["kitten", "kittens", "bitten", "mitten", "kitchen"]);

	db::with_db(|conn| {
		let result = expand_fuzzy_terms(conn, "kitten")?;
		assert!(result.contains(&"kitten".to_string()), "should contain original");
		assert!(result.contains(&"kittens".to_string()), "kittens is distance 1");
		// "bitten" starts with 'b' but fuzzy uses first char prefix filter ('k')
		// so it won't be found via the vocab query
		assert!(!result.contains(&"bitten".to_string()), "bitten starts with 'b', filtered by prefix");
		assert!(result.contains(&"kitchen".to_string()), "kitchen starts with 'k' and is distance 2");
		Ok(())
	})
	.unwrap();

	teardown();
}

#[test]
fn expand_original_term_always_first() {
	let _guard = TEST_LOCK.lock().unwrap();
	let _tmp = setup_db();

	populate_vocab(&["rust", "ruse", "rush"]);

	db::with_db(|conn| {
		let result = expand_fuzzy_terms(conn, "rust")?;
		assert_eq!(result[0], "rust", "original term must be first");
		Ok(())
	})
	.unwrap();

	teardown();
}

#[test]
fn expand_empty_vocab_returns_only_term() {
	let _guard = TEST_LOCK.lock().unwrap();
	let _tmp = setup_db();

	// No entries in FTS, vocab is empty
	db::with_db(|conn| {
		let result = expand_fuzzy_terms(conn, "hello")?;
		assert_eq!(result, vec!["hello"]);
		Ok(())
	})
	.unwrap();

	teardown();
}

#[test]
fn expand_no_duplicates() {
	let _guard = TEST_LOCK.lock().unwrap();
	let _tmp = setup_db();

	// Insert "rust" multiple times in different docs
	populate_vocab(&["rust", "rust", "rush"]);

	db::with_db(|conn| {
		let result = expand_fuzzy_terms(conn, "rust")?;
		let unique_count = result.len();
		let mut deduped = result.clone();
		deduped.sort();
		deduped.dedup();
		assert_eq!(unique_count, deduped.len(), "should have no duplicates");
		Ok(())
	})
	.unwrap();

	teardown();
}
