use kokobrain_lib::commands::semantic::{
	check_and_update_model_hash, cleanup_orphaned_chunks, clear_changed_files_without_chunks,
	compute_model_hash, deserialize_embedding, get_semantic_file_status, get_semantic_stats,
	is_reranker_model_available, is_semantic_model_available, search_hybrid, search_semantic,
	shutdown_semantic, update_semantic_file,
};
use kokobrain_lib::db;
use kokobrain_lib::db::semantic_repo;
use kokobrain_lib::semantic::chunker::{chunk_markdown, ChunkOptions};
use std::collections::HashSet;
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
		semantic_repo::insert_chunk(conn, "k1", "exists.md", "text1", None, &[], 1, 5, "h1", b"emb1", 1000)?;
		semantic_repo::insert_chunk(conn, "k2", "deleted.md", "text2", None, &[], 1, 5, "h2", b"emb2", 1000)?;
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
		semantic_repo::insert_chunk(conn, "k1", "a.md", "text", None, &[], 1, 5, "h1", b"emb", 1000)?;
		semantic_repo::insert_chunk(conn, "k2", "b.md", "text", None, &[], 1, 5, "h2", b"emb", 1000)?;
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

// --- get_chunk_hashes_for_path ---

#[test]
fn get_chunk_hashes_returns_hashes_for_path() {
	let _guard = TEST_LOCK.lock().unwrap();
	let _tmp = setup();

	db::with_db(|conn| {
		semantic_repo::insert_chunk(conn, "k1", "note.md", "text1", None, &[], 1, 5, "hash_a", b"emb1", 1000)?;
		semantic_repo::insert_chunk(conn, "k2", "note.md", "text2", None, &[], 6, 10, "hash_b", b"emb2", 1000)?;
		semantic_repo::insert_chunk(conn, "k3", "other.md", "text3", None, &[], 1, 5, "hash_c", b"emb3", 1000)?;
		Ok(())
	})
	.unwrap();

	let hashes = db::with_db(|conn| semantic_repo::get_chunk_hashes_for_path(conn, "note.md")).unwrap();
	assert_eq!(hashes.len(), 2, "should return hashes only for the requested path");
	assert_eq!(hashes.get("k1").unwrap(), "hash_a");
	assert_eq!(hashes.get("k2").unwrap(), "hash_b");

	db::close_database().unwrap();
}

#[test]
fn get_chunk_hashes_returns_empty_for_missing_path() {
	let _guard = TEST_LOCK.lock().unwrap();
	let _tmp = setup();

	let hashes = db::with_db(|conn| semantic_repo::get_chunk_hashes_for_path(conn, "nonexistent.md")).unwrap();
	assert!(hashes.is_empty(), "should return empty map for missing path");

	db::close_database().unwrap();
}

// --- delete_chunk_by_key ---

#[test]
fn delete_chunk_by_key_removes_single_chunk() {
	let _guard = TEST_LOCK.lock().unwrap();
	let _tmp = setup();

	db::with_db(|conn| {
		semantic_repo::insert_chunk(conn, "k1", "note.md", "text1", None, &[], 1, 5, "h1", b"emb1", 1000)?;
		semantic_repo::insert_chunk(conn, "k2", "note.md", "text2", None, &[], 6, 10, "h2", b"emb2", 1000)?;
		Ok(())
	})
	.unwrap();

	db::with_db(|conn| semantic_repo::delete_chunk_by_key(conn, "k1")).unwrap();

	let count = db::with_db(|conn| semantic_repo::count_chunks(conn)).unwrap();
	assert_eq!(count, 1, "only one chunk should remain after deleting by key");

	let remaining = db::with_db(|conn| semantic_repo::load_all_embeddings(conn)).unwrap();
	assert_eq!(remaining[0].key, "k2", "the remaining chunk should be k2");

	db::close_database().unwrap();
}

// --- atomic delete+insert per batch (regression for build_semantic_index) ---

#[test]
fn atomic_delete_insert_preserves_unprocessed_files() {
	let _guard = TEST_LOCK.lock().unwrap();
	let _tmp = setup();

	// Insert "old" chunks for files A, B, C (simulating existing index)
	db::with_db(|conn| {
		semantic_repo::insert_chunk(conn, "a:old", "a.md", "old text a", None, &[], 1, 5, "ha_old", b"emb_old", 1000)?;
		semantic_repo::insert_chunk(conn, "b:old", "b.md", "old text b", None, &[], 1, 5, "hb_old", b"emb_old", 1000)?;
		semantic_repo::insert_chunk(conn, "c:old", "c.md", "old text c", None, &[], 1, 5, "hc_old", b"emb_old", 1000)?;
		Ok(())
	})
	.unwrap();

	// Simulate batch 1 succeeding: atomic delete+insert for file A only
	db::with_db_transaction("test batch 1", |conn| {
		semantic_repo::delete_chunks_for_path(conn, "a.md")?;
		semantic_repo::insert_chunk(conn, "a:new", "a.md", "new text a", None, &[], 1, 10, "ha_new", b"emb_new", 2000)?;
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
		semantic_repo::insert_chunk(conn, "a:old", "a.md", "old text", None, &[], 1, 5, "h_old", b"emb", 1000)?;
		Ok(())
	})
	.unwrap();

	// Simulate a failed transaction: delete succeeds but insert fails
	let result: Result<(), String> = db::with_db_transaction("test rollback", |conn| {
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

// --- get_semantic_stats ---

#[test]
fn get_semantic_stats_returns_zeros_on_fresh_db() {
	let _guard = TEST_LOCK.lock().unwrap();
	let _tmp = setup();

	let stats = get_semantic_stats().unwrap();
	assert_eq!(stats.total_chunks, 0);
	assert_eq!(stats.total_sources, 0);
	assert!(!stats.model_loaded);

	db::close_database().unwrap();
}

#[test]
fn get_semantic_stats_reflects_inserted_chunks() {
	let _guard = TEST_LOCK.lock().unwrap();
	let _tmp = setup();

	db::with_db(|conn| {
		semantic_repo::insert_chunk(conn, "k1", "a.md", "text1", None, &[], 1, 5, "h1", b"emb1", 1000)?;
		semantic_repo::insert_chunk(conn, "k2", "a.md", "text2", None, &[], 6, 10, "h2", b"emb2", 1000)?;
		semantic_repo::insert_chunk(conn, "k3", "b.md", "text3", None, &[], 1, 5, "h3", b"emb3", 1000)?;
		Ok(())
	})
	.unwrap();

	let stats = get_semantic_stats().unwrap();
	assert_eq!(stats.total_chunks, 3);
	assert_eq!(stats.total_sources, 2);

	db::close_database().unwrap();
}

// --- shutdown_semantic ---

#[test]
fn shutdown_semantic_succeeds_when_no_model_loaded() {
	let result = shutdown_semantic();
	assert!(result.is_ok(), "shutdown should not panic when no model loaded");
}

#[test]
fn shutdown_semantic_idempotent() {
	shutdown_semantic().unwrap();
	shutdown_semantic().unwrap();
}

// --- cleanup_orphaned_chunks: all entries orphaned ---

#[test]
fn cleanup_orphaned_chunks_all_entries_orphaned() {
	let _guard = TEST_LOCK.lock().unwrap();
	let _tmp = setup();

	db::with_db(|conn| {
		semantic_repo::insert_chunk(conn, "k1", "gone1.md", "text", None, &[], 1, 5, "h1", b"emb", 1000)?;
		semantic_repo::insert_chunk(conn, "k2", "gone2.md", "text", None, &[], 1, 5, "h2", b"emb", 1000)?;
		Ok(())
	})
	.unwrap();

	cleanup_orphaned_chunks(&[]).unwrap();

	let count = db::with_db(|conn| semantic_repo::count_chunks(conn)).unwrap();
	assert_eq!(count, 0, "all chunks should be removed when no paths exist");

	db::close_database().unwrap();
}

// --- clear_changed_files_without_chunks (regression for build_semantic_index #3) ---

#[test]
fn clear_changed_files_without_chunks_drops_stale_and_persists_mtime() {
	let _guard = TEST_LOCK.lock().unwrap();
	let _tmp = setup();

	// Prior index: both files had chunks + an old stored mtime.
	db::with_db(|conn| {
		semantic_repo::insert_chunk(conn, "k1", "emptied.md", "old body", None, &[], 1, 5, "h1", b"e1", 1000)?;
		semantic_repo::insert_chunk(conn, "k2", "kept.md", "still here", None, &[], 1, 5, "h2", b"e2", 1000)?;
		semantic_repo::upsert_mtimes(conn, &[("emptied.md".to_string(), 100), ("kept.md".to_string(), 100)])?;
		Ok(())
	})
	.unwrap();

	// This build re-read both (new mtime 999); only "kept.md" produced chunks.
	// "emptied.md" was edited to nothing -> zero chunks.
	let changed = vec![("emptied.md".to_string(), 999), ("kept.md".to_string(), 999)];
	let mut chunked = HashSet::new();
	chunked.insert("kept.md".to_string());

	let cleared = clear_changed_files_without_chunks(&changed, &chunked).unwrap();
	assert_eq!(cleared, vec!["emptied.md".to_string()]);

	// Stale chunks for the emptied file are gone; the file that produced
	// chunks is untouched. (Pre-fix the emptied file's chunks lingered.)
	let sources = db::with_db(|conn| semantic_repo::get_distinct_sources(conn)).unwrap();
	assert_eq!(sources, vec!["kept.md".to_string()]);

	// The emptied file's mtime advanced to the new value, so it will NOT be
	// re-read on every future build. (Pre-fix it stayed at 100 forever.)
	let mtimes = db::with_db(|conn| semantic_repo::get_stored_mtimes(conn)).unwrap();
	assert_eq!(mtimes.get("emptied.md"), Some(&999));

	db::close_database().unwrap();
}

#[test]
fn clear_changed_files_without_chunks_noop_when_all_produced_chunks() {
	let _guard = TEST_LOCK.lock().unwrap();
	let _tmp = setup();

	db::with_db(|conn| {
		semantic_repo::insert_chunk(conn, "k1", "a.md", "text", None, &[], 1, 5, "h", b"e", 1000)?;
		Ok(())
	})
	.unwrap();

	let changed = vec![("a.md".to_string(), 5)];
	let mut chunked = HashSet::new();
	chunked.insert("a.md".to_string());

	let cleared = clear_changed_files_without_chunks(&changed, &chunked).unwrap();
	assert!(cleared.is_empty(), "nothing to clear when every changed file produced chunks");

	let count = db::with_db(|conn| semantic_repo::count_chunks(conn)).unwrap();
	assert_eq!(count, 1, "existing chunks must be left untouched");

	db::close_database().unwrap();
}

// ============================================================================
// Boundary tests (no ONNX model)
//
// EXCLUSION NOTE: `update_semantic_file`'s embed branch, `search_semantic`'s
// cosine/rerank ranking, and `search_hybrid`'s fused pipeline all require a
// real ONNX embedder session (`EMBEDDER` loaded from a multi-GB model on
// disk). Per the test-gap plan rule for semantic paths, those are exercised
// only up to the boundary: chunking, hash dedup, transaction management,
// mtime persistence, query guards, and per-file status — everything that
// runs BEFORE the first inference call. The inference paths themselves are
// covered by manual smoke testing with a downloaded model.
// ============================================================================

// --- search_semantic / search_hybrid query guards (pre-model early returns) ---

#[tokio::test]
async fn search_semantic_empty_query_returns_empty_without_model() {
	let results = search_semantic(String::new(), None, None).await.unwrap();
	assert!(results.is_empty(), "empty query must short-circuit to empty");
}

#[tokio::test]
async fn search_semantic_short_query_returns_empty_without_model() {
	let results = search_semantic("ab".to_string(), Some(10), Some(0.1))
		.await
		.unwrap();
	assert!(results.is_empty(), "queries under 3 chars must short-circuit");
}

#[tokio::test]
async fn search_semantic_whitespace_only_query_returns_empty() {
	let results = search_semantic("   \t  ".to_string(), None, None)
		.await
		.unwrap();
	assert!(results.is_empty(), "whitespace trims to empty -> short-circuit");
}

#[tokio::test]
async fn search_hybrid_short_query_returns_empty_without_model() {
	let results = search_hybrid("ab".to_string(), None).await.unwrap();
	assert!(results.is_empty(), "queries under 3 chars must short-circuit");
}

// --- is_semantic_model_available / is_reranker_model_available ---

#[test]
fn model_availability_commands_report_false_for_vault_without_models() {
	let tmp = TempDir::new().unwrap();
	let vault = tmp.path().to_string_lossy().to_string();
	assert!(!is_semantic_model_available(vault.clone()).unwrap());
	assert!(!is_reranker_model_available(vault).unwrap());
}

// --- get_semantic_file_status ---

#[test]
fn get_semantic_file_status_unindexed_file_reports_zero_chunks() {
	let _guard = TEST_LOCK.lock().unwrap();
	let _tmp = setup();

	let status = get_semantic_file_status("never-indexed.md".to_string()).unwrap();
	assert_eq!(status.chunk_count, 0);
	assert!(status.last_embedded_at.is_none());
	assert!(!status.model_loaded, "no model was ever initialized in tests");

	db::close_database().unwrap();
}

#[test]
fn get_semantic_file_status_indexed_file_reports_count_and_timestamp() {
	let _guard = TEST_LOCK.lock().unwrap();
	let _tmp = setup();

	db::with_db(|conn| {
		semantic_repo::insert_chunk(conn, "k1", "note.md", "text1", None, &[], 1, 5, "h1", b"e1", 1000)?;
		semantic_repo::insert_chunk(conn, "k2", "note.md", "text2", None, &[], 6, 10, "h2", b"e2", 2000)?;
		semantic_repo::insert_chunk(conn, "k3", "other.md", "text3", None, &[], 1, 5, "h3", b"e3", 3000)?;
		Ok(())
	})
	.unwrap();

	let status = get_semantic_file_status("note.md".to_string()).unwrap();
	assert_eq!(status.chunk_count, 2, "only the requested path's chunks count");
	assert_eq!(
		status.last_embedded_at,
		Some(2000),
		"lastEmbeddedAt is MAX(embedded_at) for the path"
	);

	db::close_database().unwrap();
}

#[test]
fn get_semantic_file_status_errors_when_database_closed() {
	let _guard = TEST_LOCK.lock().unwrap();
	let _ = db::close_database();

	let result = get_semantic_file_status("any.md".to_string());
	assert!(result.is_err(), "must propagate the closed-database error");
}

// --- update_semantic_file: zero-chunk / dedup / delete-only / error paths ---

#[tokio::test]
async fn update_semantic_file_empty_content_deletes_stale_chunks_and_persists_mtime() {
	let _guard = TEST_LOCK.lock().unwrap();
	let tmp = setup();
	let vault = tmp.path().to_string_lossy().to_string();

	// The file exists on disk but was emptied — zero chunks after re-chunking.
	std::fs::write(tmp.path().join("note.md"), "").unwrap();

	// Stale chunks from a previous index run.
	db::with_db(|conn| {
		semantic_repo::insert_chunk(conn, "stale1", "note.md", "old body", None, &[], 1, 5, "h1", b"e1", 1000)?;
		semantic_repo::insert_chunk(conn, "other", "other.md", "keep me", None, &[], 1, 5, "h2", b"e2", 1000)?;
		Ok(())
	})
	.unwrap();

	update_semantic_file("note.md".to_string(), String::new(), vault)
		.await
		.unwrap();

	// Stale chunks gone; unrelated file untouched.
	let sources = db::with_db(|conn| semantic_repo::get_distinct_sources(conn)).unwrap();
	assert_eq!(sources, vec!["other.md".to_string()]);

	// mtime persisted so build_semantic_index won't re-read this file.
	let mtimes = db::with_db(|conn| semantic_repo::get_stored_mtimes(conn)).unwrap();
	assert!(
		mtimes.get("note.md").copied().unwrap_or(-1) > 0,
		"mtime must be recorded for the emptied file"
	);

	db::close_database().unwrap();
}

#[tokio::test]
async fn update_semantic_file_unchanged_hashes_skip_embedding_entirely() {
	let _guard = TEST_LOCK.lock().unwrap();
	let tmp = setup();
	let vault = tmp.path().to_string_lossy().to_string();

	let content = "# Heading\n\nA body paragraph that is comfortably longer than the fifty character minimum chunk size.\n";
	std::fs::write(tmp.path().join("note.md"), content).unwrap();

	// Pre-insert exactly the chunks the chunker derives from `content`
	// (same keys + content hashes), simulating a prior successful index.
	let chunks = chunk_markdown("note.md", content, &ChunkOptions::default());
	assert!(!chunks.is_empty(), "fixture content must produce chunks");
	db::with_db(|conn| {
		for c in &chunks {
			semantic_repo::insert_chunk(
				conn,
				&c.key,
				&c.source_path,
				&c.content,
				c.heading.as_deref(),
				&c.parent_headings,
				c.line_start as i64,
				c.line_end as i64,
				&c.content_hash,
				b"prior-embedding",
				1000,
			)?;
		}
		Ok(())
	})
	.unwrap();

	// No embedder is loaded and no vault path was ever stored for lazy
	// reload — if the hash dedup failed and the command tried to embed,
	// this call would Err. Ok proves the skip path ran.
	update_semantic_file("note.md".to_string(), content.to_string(), vault)
		.await
		.unwrap();

	// Chunks are untouched (same count, same keys, same embeddings).
	let all = db::with_db(|conn| semantic_repo::load_all_embeddings(conn)).unwrap();
	assert_eq!(all.len(), chunks.len(), "no chunk may be added or deleted");
	for row in &all {
		assert_eq!(
			row.embedding_bytes, b"prior-embedding",
			"stored embeddings must not be overwritten on the skip path"
		);
	}

	// mtime persisted even on the skip path.
	let mtimes = db::with_db(|conn| semantic_repo::get_stored_mtimes(conn)).unwrap();
	assert!(mtimes.contains_key("note.md"));

	db::close_database().unwrap();
}

#[tokio::test]
async fn update_semantic_file_deletes_removed_chunks_without_needing_embedder() {
	let _guard = TEST_LOCK.lock().unwrap();
	let tmp = setup();
	let vault = tmp.path().to_string_lossy().to_string();

	let content = "# Heading\n\nA body paragraph that is comfortably longer than the fifty character minimum chunk size.\n";
	std::fs::write(tmp.path().join("note.md"), content).unwrap();

	// All current chunks already indexed (hashes match) + one stale chunk
	// whose key the new content no longer produces.
	let chunks = chunk_markdown("note.md", content, &ChunkOptions::default());
	db::with_db(|conn| {
		for c in &chunks {
			semantic_repo::insert_chunk(
				conn,
				&c.key,
				&c.source_path,
				&c.content,
				c.heading.as_deref(),
				&c.parent_headings,
				c.line_start as i64,
				c.line_end as i64,
				&c.content_hash,
				b"prior-embedding",
				1000,
			)?;
		}
		semantic_repo::insert_chunk(
			conn,
			"note.md#deleted-section-99",
			"note.md",
			"section that was removed",
			None,
			&[],
			90,
			99,
			"stalehash",
			b"stale-embedding",
			1000,
		)?;
		Ok(())
	})
	.unwrap();

	// chunks_to_embed is empty (all hashes match) but keys_to_delete is not:
	// the transaction must run WITHOUT the embedder and drop only the stale key.
	update_semantic_file("note.md".to_string(), content.to_string(), vault)
		.await
		.unwrap();

	let all = db::with_db(|conn| semantic_repo::load_all_embeddings(conn)).unwrap();
	assert_eq!(all.len(), chunks.len(), "exactly the stale chunk must be deleted");
	assert!(
		all.iter().all(|r| r.key != "note.md#deleted-section-99"),
		"the removed section's chunk must be gone"
	);

	db::close_database().unwrap();
}

#[tokio::test]
async fn update_semantic_file_rejects_path_traversal_outside_vault() {
	let _guard = TEST_LOCK.lock().unwrap();
	let _ = db::close_database();

	// Vault is a subdirectory; the target file exists OUTSIDE it, so the
	// canonicalize succeeds and the starts_with guard must fire.
	let outer = TempDir::new().unwrap();
	let vault_dir = outer.path().join("vault");
	std::fs::create_dir_all(&vault_dir).unwrap();
	std::fs::write(outer.path().join("outside.md"), "escape").unwrap();
	db::open_database(&vault_dir).unwrap();

	let result = update_semantic_file(
		"../outside.md".to_string(),
		String::new(),
		vault_dir.to_string_lossy().to_string(),
	)
	.await;

	assert!(result.is_err(), "escaping relative path must be rejected");
	assert!(
		result.unwrap_err().contains("Path traversal detected"),
		"error must name the traversal guard"
	);

	db::close_database().unwrap();
}

#[tokio::test]
async fn update_semantic_file_errors_when_file_missing_on_disk() {
	let _guard = TEST_LOCK.lock().unwrap();
	let tmp = setup();
	let vault = tmp.path().to_string_lossy().to_string();

	// Zero-chunk content reaches the mtime persistence step, which cannot
	// resolve a file that does not exist — the error must propagate.
	let result = update_semantic_file("ghost.md".to_string(), String::new(), vault).await;

	assert!(result.is_err(), "missing file must surface an error");
	assert!(
		result.unwrap_err().contains("Cannot resolve path"),
		"error must come from the path resolution step"
	);

	db::close_database().unwrap();
}

// --- deserialize_embedding (audit finding #12: malformed blob handling) ---

#[test]
fn deserialize_embedding_accepts_well_formed_blob() {
	// Two f32 values, little-endian: 1.0 and -2.0.
	let mut bytes = Vec::new();
	bytes.extend_from_slice(&1.0_f32.to_le_bytes());
	bytes.extend_from_slice(&(-2.0_f32).to_le_bytes());

	let emb = deserialize_embedding(&bytes).expect("well-formed blob must deserialize");

	assert_eq!(emb.len(), 2);
	assert!((emb[0] - 1.0).abs() < f32::EPSILON);
	assert!((emb[1] + 2.0).abs() < f32::EPSILON);
}

#[test]
fn deserialize_embedding_rejects_blob_with_trailing_bytes() {
	// 4 valid bytes + 1 orphan byte: previously chunks_exact(4) silently
	// dropped the remainder (audit finding #12); now the blob is rejected.
	let bad: &[u8] = &[0x00, 0x00, 0x80, 0x3F, 0xFF];

	assert!(
		deserialize_embedding(bad).is_none(),
		"blob with len % 4 != 0 must be rejected, not truncated"
	);
}

#[test]
fn deserialize_embedding_rejects_short_fragment() {
	assert!(deserialize_embedding(&[0x01, 0x02]).is_none());
}
