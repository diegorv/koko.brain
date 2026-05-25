use kokobrain_lib::db;
use kokobrain_lib::search::fuzzy::expand_fuzzy_terms;
use std::sync::Mutex;
use tempfile::TempDir;

/// Tests that use the global DB must run serially.
static TEST_LOCK: Mutex<()> = Mutex::new(());

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
