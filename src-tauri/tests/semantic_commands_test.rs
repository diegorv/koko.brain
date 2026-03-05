use kokobrain_lib::commands::semantic::{
	check_and_update_model_hash, cleanup_orphaned_chunks, compute_model_hash,
};
use kokobrain_lib::db;
use kokobrain_lib::db::semantic_repo;
use std::sync::Mutex;
use tempfile::TempDir;

static TEST_LOCK: Mutex<()> = Mutex::new(());

fn setup() -> TempDir {
	let tmp = TempDir::new().unwrap();
	let _ = db::close_database();
	db::open_database(tmp.path()).unwrap();
	tmp
}

// --- compute_model_hash ---

#[test]
fn compute_model_hash_returns_empty_when_no_model() {
	let tmp = TempDir::new().unwrap();
	let hash = compute_model_hash(tmp.path());
	assert!(hash.is_empty(), "should return empty string when model file doesn't exist");
}

#[test]
fn compute_model_hash_returns_consistent_hash() {
	let tmp = TempDir::new().unwrap();
	let model_dir = tmp.path().join(".kokobrain").join("models").join("bge-m3");
	std::fs::create_dir_all(&model_dir).unwrap();
	std::fs::write(model_dir.join("model.onnx"), b"fake model content for testing").unwrap();

	let hash1 = compute_model_hash(tmp.path());
	let hash2 = compute_model_hash(tmp.path());
	assert!(!hash1.is_empty(), "hash should not be empty for existing file");
	assert_eq!(hash1, hash2, "same file should produce same hash");
}

#[test]
fn compute_model_hash_changes_with_different_content() {
	let tmp1 = TempDir::new().unwrap();
	let dir1 = tmp1.path().join(".kokobrain").join("models").join("bge-m3");
	std::fs::create_dir_all(&dir1).unwrap();
	std::fs::write(dir1.join("model.onnx"), b"model version 1").unwrap();

	let tmp2 = TempDir::new().unwrap();
	let dir2 = tmp2.path().join(".kokobrain").join("models").join("bge-m3");
	std::fs::create_dir_all(&dir2).unwrap();
	std::fs::write(dir2.join("model.onnx"), b"model version 2").unwrap();

	let hash1 = compute_model_hash(tmp1.path());
	let hash2 = compute_model_hash(tmp2.path());
	assert_ne!(hash1, hash2, "different content should produce different hash");
}

// --- check_and_update_model_hash ---

#[test]
fn check_and_update_model_hash_empty_hash_returns_false() {
	let _guard = TEST_LOCK.lock().unwrap();
	let _tmp = setup();

	let changed = check_and_update_model_hash("").unwrap();
	assert!(!changed, "empty hash should return false (no model)");

	db::close_database().unwrap();
}

#[test]
fn check_and_update_model_hash_first_time_returns_true() {
	let _guard = TEST_LOCK.lock().unwrap();
	let _tmp = setup();

	let changed = check_and_update_model_hash("abc123").unwrap();
	assert!(changed, "first hash should be treated as changed");

	db::close_database().unwrap();
}

#[test]
fn check_and_update_model_hash_same_hash_returns_false() {
	let _guard = TEST_LOCK.lock().unwrap();
	let _tmp = setup();

	check_and_update_model_hash("abc123").unwrap();
	let changed = check_and_update_model_hash("abc123").unwrap();
	assert!(!changed, "same hash should return false (no change)");

	db::close_database().unwrap();
}

#[test]
fn check_and_update_model_hash_different_hash_returns_true() {
	let _guard = TEST_LOCK.lock().unwrap();
	let _tmp = setup();

	check_and_update_model_hash("abc123").unwrap();
	let changed = check_and_update_model_hash("def456").unwrap();
	assert!(changed, "different hash should return true (model changed)");

	db::close_database().unwrap();
}

// --- cleanup_orphaned_chunks ---

#[test]
fn cleanup_orphaned_chunks_removes_missing_paths() {
	let _guard = TEST_LOCK.lock().unwrap();
	let _tmp = setup();

	// Insert chunks for two files
	db::with_db(|conn| {
		semantic_repo::insert_chunk(conn, "k1", "exists.md", "text1", None, 1, 5, "h1", b"emb1", 1000)?;
		semantic_repo::insert_chunk(conn, "k2", "deleted.md", "text2", None, 1, 5, "h2", b"emb2", 1000)?;
		Ok(())
	})
	.unwrap();

	// Only "exists.md" is still in the vault
	let existing = vec!["exists.md".to_string()];
	cleanup_orphaned_chunks(&existing).unwrap();

	// Verify: "deleted.md" chunks removed, "exists.md" chunks kept
	let remaining = db::with_db(|conn| semantic_repo::get_distinct_sources(conn)).unwrap();
	assert_eq!(remaining, vec!["exists.md".to_string()], "only existing file should remain");

	db::close_database().unwrap();
}

#[test]
fn cleanup_orphaned_chunks_no_orphans() {
	let _guard = TEST_LOCK.lock().unwrap();
	let _tmp = setup();

	db::with_db(|conn| {
		semantic_repo::insert_chunk(conn, "k1", "a.md", "text", None, 1, 5, "h1", b"emb", 1000)?;
		semantic_repo::insert_chunk(conn, "k2", "b.md", "text", None, 1, 5, "h2", b"emb", 1000)?;
		Ok(())
	})
	.unwrap();

	let existing = vec!["a.md".to_string(), "b.md".to_string()];
	cleanup_orphaned_chunks(&existing).unwrap();

	let count = db::with_db(|conn| semantic_repo::count_chunks(conn)).unwrap();
	assert_eq!(count, 2, "no chunks should be removed when all paths exist");

	db::close_database().unwrap();
}

#[test]
fn cleanup_orphaned_chunks_empty_index() {
	let _guard = TEST_LOCK.lock().unwrap();
	let _tmp = setup();

	let existing = vec!["a.md".to_string()];
	cleanup_orphaned_chunks(&existing).unwrap();

	let count = db::with_db(|conn| semantic_repo::count_chunks(conn)).unwrap();
	assert_eq!(count, 0, "should handle empty index gracefully");

	db::close_database().unwrap();
}

// --- atomic delete+insert per batch (regression for build_semantic_index) ---

#[test]
fn atomic_delete_insert_preserves_unprocessed_files() {
	let _guard = TEST_LOCK.lock().unwrap();
	let _tmp = setup();

	// Insert "old" chunks for files A, B, C (simulating existing index)
	db::with_db(|conn| {
		semantic_repo::insert_chunk(conn, "a:old", "a.md", "old text a", None, 1, 5, "ha_old", b"emb_old", 1000)?;
		semantic_repo::insert_chunk(conn, "b:old", "b.md", "old text b", None, 1, 5, "hb_old", b"emb_old", 1000)?;
		semantic_repo::insert_chunk(conn, "c:old", "c.md", "old text c", None, 1, 5, "hc_old", b"emb_old", 1000)?;
		Ok(())
	})
	.unwrap();

	// Simulate batch 1 succeeding: atomic delete+insert for file A only
	db::with_db_transaction(|conn| {
		semantic_repo::delete_chunks_for_path(conn, "a.md")?;
		semantic_repo::insert_chunk(conn, "a:new", "a.md", "new text a", None, 1, 10, "ha_new", b"emb_new", 2000)?;
		Ok(())
	})
	.unwrap();

	// Simulate batch 2 "failing" (never runs) — files B and C should keep old chunks

	// Verify: file A has new chunk, files B and C still have old chunks
	let sources = db::with_db(|conn| semantic_repo::get_distinct_sources(conn)).unwrap();
	assert_eq!(sources.len(), 3, "all three files should still have chunks");

	let count = db::with_db(|conn| semantic_repo::count_chunks(conn)).unwrap();
	assert_eq!(count, 3, "should have 3 chunks total (1 new for A, 1 old each for B and C)");

	// Verify file A's chunk was replaced (not duplicated)
	let all = db::with_db(|conn| semantic_repo::load_all_embeddings(conn)).unwrap();
	let a_chunks: Vec<_> = all.iter().filter(|c| c.source_path == "a.md").collect();
	assert_eq!(a_chunks.len(), 1, "file A should have exactly 1 chunk after replace");
	assert_eq!(a_chunks[0].content, "new text a", "file A should have the new content");

	db::close_database().unwrap();
}

#[test]
fn atomic_delete_insert_rolls_back_on_failure() {
	let _guard = TEST_LOCK.lock().unwrap();
	let _tmp = setup();

	// Insert old chunk for file A
	db::with_db(|conn| {
		semantic_repo::insert_chunk(conn, "a:old", "a.md", "old text", None, 1, 5, "h_old", b"emb", 1000)?;
		Ok(())
	})
	.unwrap();

	// Simulate a failed transaction: delete succeeds but insert fails
	let result: Result<(), String> = db::with_db_transaction(|conn| {
		semantic_repo::delete_chunks_for_path(conn, "a.md")?;
		// Force failure after delete
		Err("simulated embedding failure".to_string())
	});
	assert!(result.is_err(), "transaction should fail");

	// Old chunk should still exist (rollback)
	let count = db::with_db(|conn| semantic_repo::count_chunks(conn)).unwrap();
	assert_eq!(count, 1, "old chunk should be preserved after rollback");

	let all = db::with_db(|conn| semantic_repo::load_all_embeddings(conn)).unwrap();
	assert_eq!(all[0].content, "old text", "original content should be intact");

	db::close_database().unwrap();
}
