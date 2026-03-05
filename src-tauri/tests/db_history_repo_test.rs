use kokobrain_lib::db::{history_repo, schema};
use rusqlite::Connection;

fn setup_db() -> Connection {
	let conn = Connection::open_in_memory().unwrap();
	schema::create_tables(&conn).unwrap();
	conn
}

#[test]
fn find_latest_hash_returns_none_when_empty() {
	let conn = setup_db();
	let result = history_repo::find_latest_hash(&conn, "test.md").unwrap();
	assert!(result.is_none());
}

#[test]
fn find_latest_hash_returns_last_inserted() {
	let conn = setup_db();
	history_repo::insert_snapshot(&conn, "test.md", "v1", "hash_a", 2, 1000).unwrap();
	history_repo::insert_snapshot(&conn, "test.md", "v2", "hash_b", 2, 2000).unwrap();

	let result = history_repo::find_latest_hash(&conn, "test.md").unwrap();
	assert_eq!(result, Some("hash_b".to_string()));
}

#[test]
fn find_latest_hash_isolates_by_file() {
	let conn = setup_db();
	history_repo::insert_snapshot(&conn, "a.md", "content", "hash_a", 7, 1000).unwrap();
	history_repo::insert_snapshot(&conn, "b.md", "content", "hash_b", 7, 2000).unwrap();

	assert_eq!(
		history_repo::find_latest_hash(&conn, "a.md").unwrap(),
		Some("hash_a".to_string())
	);
	assert_eq!(
		history_repo::find_latest_hash(&conn, "b.md").unwrap(),
		Some("hash_b".to_string())
	);
}

#[test]
fn insert_and_list_snapshots() {
	let conn = setup_db();
	history_repo::insert_snapshot(&conn, "test.md", "content1", "h1", 8, 1000).unwrap();
	history_repo::insert_snapshot(&conn, "test.md", "content2", "h2", 8, 2000).unwrap();

	let list = history_repo::list_snapshots(&conn, "test.md").unwrap();
	assert_eq!(list.len(), 2);
	// Newest first
	assert_eq!(list[0].timestamp, 2000);
	assert_eq!(list[1].timestamp, 1000);
}

#[test]
fn list_snapshots_empty_for_unknown_file() {
	let conn = setup_db();
	let list = history_repo::list_snapshots(&conn, "nonexistent.md").unwrap();
	assert!(list.is_empty());
}

#[test]
fn get_snapshot_by_id_returns_content() {
	let conn = setup_db();
	history_repo::insert_snapshot(&conn, "test.md", "hello world", "h1", 11, 1000).unwrap();

	let list = history_repo::list_snapshots(&conn, "test.md").unwrap();
	let content = history_repo::get_snapshot_by_id(&conn, list[0].id).unwrap();
	assert_eq!(content, "hello world");
}

#[test]
fn get_snapshot_by_id_error_for_invalid_id() {
	let conn = setup_db();
	let result = history_repo::get_snapshot_by_id(&conn, 9999);
	assert!(result.is_err());
}

#[test]
fn delete_old_snapshots_removes_before_cutoff() {
	let conn = setup_db();
	history_repo::insert_snapshot(&conn, "test.md", "old", "h1", 3, 100).unwrap();
	history_repo::insert_snapshot(&conn, "test.md", "new", "h2", 3, 2000).unwrap();

	let deleted = history_repo::delete_old_snapshots(&conn, 1000).unwrap();
	assert_eq!(deleted, 1);

	let list = history_repo::list_snapshots(&conn, "test.md").unwrap();
	assert_eq!(list.len(), 1);
	assert_eq!(list[0].timestamp, 2000);
}

#[test]
fn delete_old_snapshots_returns_zero_when_nothing_to_delete() {
	let conn = setup_db();
	let deleted = history_repo::delete_old_snapshots(&conn, 1000).unwrap();
	assert_eq!(deleted, 0);
}

#[test]
fn delete_medium_duplicates_keeps_latest_per_day() {
	let conn = setup_db();
	// Same day (day = created_at / 86400000)
	let day_ms: i64 = 86400000;
	let base = day_ms * 10; // day 10

	// 3 snapshots on day 10, same file
	history_repo::insert_snapshot(&conn, "test.md", "v1", "h1", 2, base).unwrap();
	history_repo::insert_snapshot(&conn, "test.md", "v2", "h2", 2, base + 1000).unwrap();
	history_repo::insert_snapshot(&conn, "test.md", "v3", "h3", 2, base + 2000).unwrap();

	// cutoff_daily = base - 1, cutoff_recent = base + day_ms
	let deleted = history_repo::delete_medium_duplicates(&conn, base - 1, base + day_ms).unwrap();
	assert_eq!(deleted, 2, "should delete 2 older snapshots from the same day");

	let list = history_repo::list_snapshots(&conn, "test.md").unwrap();
	assert_eq!(list.len(), 1, "only latest per day should remain");
}
