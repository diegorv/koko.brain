use kokobrain_lib::commands::history::*;
use kokobrain_lib::db;
use std::sync::Mutex;
use tempfile::TempDir;

/// Tests share the global DB static, so they must run serially.
static TEST_LOCK: Mutex<()> = Mutex::new(());

fn setup() -> TempDir {
	let tmp = TempDir::new().unwrap();
	let _ = db::close_database();
	db::open_database(tmp.path()).unwrap();
	tmp
}

// --- save_snapshot ---

#[test]
fn save_snapshot_creates_new_snapshot() {
	let _guard = TEST_LOCK.lock().unwrap();
	let _tmp = setup();

	let created = save_snapshot("notes/hello.md".into(), "Hello world".into()).unwrap();
	assert!(created, "should create a new snapshot");

	let history = get_file_history("notes/hello.md".into()).unwrap();
	assert_eq!(history.len(), 1);
	assert_eq!(history[0].size, 11); // "Hello world".len()

	db::close_database().unwrap();
}

#[test]
fn save_snapshot_deduplicates_identical_content() {
	let _guard = TEST_LOCK.lock().unwrap();
	let _tmp = setup();

	save_snapshot("notes/a.md".into(), "same content".into()).unwrap();
	let created = save_snapshot("notes/a.md".into(), "same content".into()).unwrap();
	assert!(!created, "should be deduplicated");

	let history = get_file_history("notes/a.md".into()).unwrap();
	assert_eq!(history.len(), 1, "only one snapshot should exist");

	db::close_database().unwrap();
}

#[test]
fn save_snapshot_creates_new_for_different_content() {
	let _guard = TEST_LOCK.lock().unwrap();
	let _tmp = setup();

	save_snapshot("notes/a.md".into(), "version 1".into()).unwrap();
	let created = save_snapshot("notes/a.md".into(), "version 2".into()).unwrap();
	assert!(created, "different content should create new snapshot");

	let history = get_file_history("notes/a.md".into()).unwrap();
	assert_eq!(history.len(), 2);

	db::close_database().unwrap();
}

// --- get_file_history ---

#[test]
fn get_file_history_returns_empty_for_unknown_file() {
	let _guard = TEST_LOCK.lock().unwrap();
	let _tmp = setup();

	let history = get_file_history("nonexistent.md".into()).unwrap();
	assert!(history.is_empty());

	db::close_database().unwrap();
}

#[test]
fn get_file_history_returns_newest_first() {
	let _guard = TEST_LOCK.lock().unwrap();
	let _tmp = setup();

	save_snapshot("notes/a.md".into(), "v1".into()).unwrap();
	save_snapshot("notes/a.md".into(), "v2".into()).unwrap();
	save_snapshot("notes/a.md".into(), "v3".into()).unwrap();

	let history = get_file_history("notes/a.md".into()).unwrap();
	assert_eq!(history.len(), 3);
	// Newest first: timestamps should be non-increasing
	assert!(history[0].timestamp >= history[1].timestamp);
	assert!(history[1].timestamp >= history[2].timestamp);

	db::close_database().unwrap();
}

#[test]
fn get_file_history_isolates_by_file_path() {
	let _guard = TEST_LOCK.lock().unwrap();
	let _tmp = setup();

	save_snapshot("notes/a.md".into(), "content a".into()).unwrap();
	save_snapshot("notes/b.md".into(), "content b".into()).unwrap();

	let history_a = get_file_history("notes/a.md".into()).unwrap();
	assert_eq!(history_a.len(), 1);

	let history_b = get_file_history("notes/b.md".into()).unwrap();
	assert_eq!(history_b.len(), 1);

	db::close_database().unwrap();
}

// --- get_snapshot_content ---

#[test]
fn get_snapshot_content_returns_correct_content() {
	let _guard = TEST_LOCK.lock().unwrap();
	let _tmp = setup();

	save_snapshot("notes/a.md".into(), "Hello snapshot".into()).unwrap();
	let history = get_file_history("notes/a.md".into()).unwrap();
	let id = history[0].id;

	let content = get_snapshot_content(id).unwrap();
	assert_eq!(content, "Hello snapshot");

	db::close_database().unwrap();
}

#[test]
fn get_snapshot_content_returns_error_for_invalid_id() {
	let _guard = TEST_LOCK.lock().unwrap();
	let _tmp = setup();

	let result = get_snapshot_content(999999);
	assert!(result.is_err());

	db::close_database().unwrap();
}

// --- compute_diff ---

#[test]
fn compute_diff_identical_content() {
	let lines = compute_diff("hello\n".into(), "hello\n".into()).unwrap();
	assert_eq!(lines.len(), 1);
	assert_eq!(lines[0].line_type, "equal");
	assert_eq!(lines[0].content, "hello\n");
}

#[test]
fn compute_diff_insertion() {
	let lines = compute_diff("a\n".into(), "a\nb\n".into()).unwrap();
	assert_eq!(lines.len(), 2);
	assert_eq!(lines[0].line_type, "equal");
	assert_eq!(lines[1].line_type, "insert");
	assert_eq!(lines[1].content, "b\n");
	assert!(lines[1].old_line_num.is_none());
	assert!(lines[1].new_line_num.is_some());
}

#[test]
fn compute_diff_deletion() {
	let lines = compute_diff("a\nb\n".into(), "a\n".into()).unwrap();
	assert_eq!(lines.len(), 2);
	assert_eq!(lines[0].line_type, "equal");
	assert_eq!(lines[1].line_type, "delete");
	assert_eq!(lines[1].content, "b\n");
	assert!(lines[1].old_line_num.is_some());
	assert!(lines[1].new_line_num.is_none());
}

#[test]
fn compute_diff_replacement() {
	let lines = compute_diff("old line\n".into(), "new line\n".into()).unwrap();
	// Should have a delete + insert (or vice versa)
	let delete_count = lines.iter().filter(|l| l.line_type == "delete").count();
	let insert_count = lines.iter().filter(|l| l.line_type == "insert").count();
	assert_eq!(delete_count, 1);
	assert_eq!(insert_count, 1);
}

#[test]
fn compute_diff_empty_inputs() {
	let lines = compute_diff("".into(), "".into()).unwrap();
	assert!(lines.is_empty());
}

#[test]
fn compute_diff_line_numbers_are_correct() {
	let lines = compute_diff("a\nb\nc\n".into(), "a\nX\nc\n".into()).unwrap();
	// Line 1: equal "a\n" (old=1, new=1)
	// Line 2: delete "b\n" (old=2)
	// Line 3: insert "X\n" (new=2)
	// Line 4: equal "c\n" (old=3, new=3)
	let equal_lines: Vec<_> = lines.iter().filter(|l| l.line_type == "equal").collect();
	assert_eq!(equal_lines.len(), 2);
	assert_eq!(equal_lines[0].old_line_num, Some(1));
	assert_eq!(equal_lines[0].new_line_num, Some(1));
}

// --- cleanup_history ---

#[test]
fn cleanup_history_deletes_old_snapshots() {
	let _guard = TEST_LOCK.lock().unwrap();
	let _tmp = setup();

	// Insert a snapshot with a very old timestamp manually
	db::with_db(|conn| {
		conn.execute(
			"INSERT INTO snapshots (file_path, content, hash, size, created_at) VALUES (?1, ?2, ?3, ?4, ?5)",
			rusqlite::params!["old.md", "old content", "oldhash", 11, 1000],
		)
		.map_err(|e| e.to_string())?;
		Ok(())
	})
	.unwrap();

	// Also insert a recent one
	save_snapshot("recent.md".into(), "recent content".into()).unwrap();

	let deleted = cleanup_history(7).unwrap();
	assert!(deleted >= 1, "should delete the old snapshot");

	// Recent should still be there
	let history = get_file_history("recent.md".into()).unwrap();
	assert_eq!(history.len(), 1);

	// Old should be gone
	let history = get_file_history("old.md".into()).unwrap();
	assert_eq!(history.len(), 0);

	db::close_database().unwrap();
}

#[test]
fn cleanup_history_uses_transaction_for_both_delete_phases() {
	let _guard = TEST_LOCK.lock().unwrap();
	let _tmp = setup();

	// Insert snapshots at different ages to exercise both delete phases:
	// - "very old" (timestamp 1000) → should be deleted by delete_old_snapshots
	// - "medium old" (timestamp within medium range) → candidates for dedup
	db::with_db(|conn| {
		// Very old snapshot — will be deleted by old phase
		conn.execute(
			"INSERT INTO snapshots (file_path, content, hash, size, created_at) VALUES (?1, ?2, ?3, ?4, ?5)",
			rusqlite::params!["old.md", "old content", "oldhash1", 11, 1000],
		).map_err(|e| e.to_string())?;

		// Medium-age duplicates on the same day (same file, same day bucket)
		// These are within retention_days+30 range → medium dedup applies
		let now_ms: i64 = std::time::SystemTime::now()
			.duration_since(std::time::UNIX_EPOCH)
			.unwrap()
			.as_millis() as i64;
		let medium_age = now_ms - 10 * 86_400_000; // 10 days ago

		conn.execute(
			"INSERT INTO snapshots (file_path, content, hash, size, created_at) VALUES (?1, ?2, ?3, ?4, ?5)",
			rusqlite::params!["medium.md", "v1", "hash_m1", 2, medium_age],
		).map_err(|e| e.to_string())?;
		conn.execute(
			"INSERT INTO snapshots (file_path, content, hash, size, created_at) VALUES (?1, ?2, ?3, ?4, ?5)",
			rusqlite::params!["medium.md", "v2", "hash_m2", 2, medium_age + 1],
		).map_err(|e| e.to_string())?;

		Ok(())
	}).unwrap();

	// Retention = 7 days means:
	// - cutoff_recent = now - 7 days
	// - cutoff_daily = now - 37 days
	// "old.md" at timestamp 1000 is way before cutoff_daily → deleted
	// "medium.md" at 10 days ago is between cutoff_daily and cutoff_recent → dedup to 1/day
	let deleted = cleanup_history(7).unwrap();
	assert!(deleted >= 1, "should delete at least the very old snapshot");

	// Verify old snapshot is gone
	let old_history = get_file_history("old.md".into()).unwrap();
	assert_eq!(old_history.len(), 0, "very old snapshot should be deleted");

	// Verify medium file still has at least one snapshot (deduped, not deleted entirely)
	let medium_history = get_file_history("medium.md".into()).unwrap();
	assert!(medium_history.len() >= 1, "medium-age file should retain at least one snapshot per day");

	db::close_database().unwrap();
}

#[test]
fn cleanup_history_returns_zero_when_nothing_to_delete() {
	let _guard = TEST_LOCK.lock().unwrap();
	let _tmp = setup();

	save_snapshot("notes/a.md".into(), "content".into()).unwrap();

	let deleted = cleanup_history(30).unwrap();
	assert_eq!(deleted, 0);

	db::close_database().unwrap();
}
