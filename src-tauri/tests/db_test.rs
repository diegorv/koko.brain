use kokobrain_lib::commands::db::open_vault_db;
use kokobrain_lib::db;
use std::fs;
use std::sync::Mutex;
use tempfile::TempDir;

/// Tests share the global DB static, so they must run serially.
/// This mutex ensures only one test accesses the DB at a time.
static TEST_LOCK: Mutex<()> = Mutex::new(());

#[test]
fn open_database_creates_kokobrain_dir_and_db_file() {
	let _guard = TEST_LOCK.lock().unwrap();
	let _ = db::close_database();

	let tmp = TempDir::new().unwrap();
	db::open_database(tmp.path()).unwrap();

	let db_path = tmp.path().join(".kokobrain").join("kokobrain.db");
	assert!(db_path.exists(), "kokobrain.db should be created");
	assert!(
		tmp.path().join(".kokobrain").is_dir(),
		".kokobrain directory should exist"
	);

	db::close_database().unwrap();
}

#[test]
fn open_database_creates_all_tables() {
	let _guard = TEST_LOCK.lock().unwrap();
	let _ = db::close_database();

	let tmp = TempDir::new().unwrap();
	db::open_database(tmp.path()).unwrap();

	db::with_db(|conn| {
		// Check snapshots table exists
		let count: i64 = conn
			.query_row(
				"SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='snapshots'",
				[],
				|row| row.get(0),
			)
			.map_err(|e| e.to_string())?;
		assert_eq!(count, 1, "snapshots table should exist");

		// Check notes_fts virtual table exists
		let count: i64 = conn
			.query_row(
				"SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='notes_fts'",
				[],
				|row| row.get(0),
			)
			.map_err(|e| e.to_string())?;
		assert_eq!(count, 1, "notes_fts table should exist");

		// Check chunks table exists
		let count: i64 = conn
			.query_row(
				"SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='chunks'",
				[],
				|row| row.get(0),
			)
			.map_err(|e| e.to_string())?;
		assert_eq!(count, 1, "chunks table should exist");

		Ok(())
	})
	.unwrap();

	db::close_database().unwrap();
}

#[test]
fn with_db_returns_error_when_database_not_open() {
	let _guard = TEST_LOCK.lock().unwrap();
	let _ = db::close_database();

	let result = db::with_db(|_conn| Ok(()));
	assert!(result.is_err());
	assert_eq!(result.unwrap_err(), "Database not open");
}

#[test]
fn with_db_works_after_open_database() {
	let _guard = TEST_LOCK.lock().unwrap();
	let _ = db::close_database();

	let tmp = TempDir::new().unwrap();
	db::open_database(tmp.path()).unwrap();

	let result = db::with_db(|conn| {
		let version: String = conn
			.query_row("SELECT sqlite_version()", [], |row| row.get(0))
			.map_err(|e| e.to_string())?;
		assert!(!version.is_empty());
		Ok(version)
	});
	assert!(result.is_ok());

	db::close_database().unwrap();
}

#[test]
fn close_database_then_with_db_returns_error() {
	let _guard = TEST_LOCK.lock().unwrap();
	let _ = db::close_database();

	let tmp = TempDir::new().unwrap();
	db::open_database(tmp.path()).unwrap();
	db::close_database().unwrap();

	let result = db::with_db(|_conn| Ok(()));
	assert!(result.is_err());
	assert_eq!(result.unwrap_err(), "Database not open");
}

#[test]
fn open_database_twice_reopen_works() {
	let _guard = TEST_LOCK.lock().unwrap();
	let _ = db::close_database();

	let tmp = TempDir::new().unwrap();
	db::open_database(tmp.path()).unwrap();
	// Second open should work without error (replaces connection)
	db::open_database(tmp.path()).unwrap();

	let result = db::with_db(|_conn| Ok(()));
	assert!(result.is_ok());

	db::close_database().unwrap();
}

#[test]
fn wal_mode_is_enabled() {
	let _guard = TEST_LOCK.lock().unwrap();
	let _ = db::close_database();

	let tmp = TempDir::new().unwrap();
	db::open_database(tmp.path()).unwrap();

	db::with_db(|conn| {
		let mode: String = conn
			.query_row("PRAGMA journal_mode", [], |row| row.get(0))
			.map_err(|e| e.to_string())?;
		assert_eq!(mode, "wal", "journal_mode should be WAL");
		Ok(())
	})
	.unwrap();

	db::close_database().unwrap();
}

#[test]
fn open_vault_db_rejects_non_existent_path() {
	let _guard = TEST_LOCK.lock().unwrap();
	let _ = db::close_database();

	let result = open_vault_db("/non/existent/vault/path".to_string());
	assert!(result.is_err());
	assert!(result
		.unwrap_err()
		.contains("Failed to resolve vault path"));
}

#[test]
fn open_vault_db_rejects_file_as_vault() {
	let _guard = TEST_LOCK.lock().unwrap();
	let _ = db::close_database();

	let tmp = TempDir::new().unwrap();
	let file_path = tmp.path().join("not-a-dir.md");
	fs::write(&file_path, "content").unwrap();

	let result = open_vault_db(file_path.to_string_lossy().to_string());
	assert!(result.is_err());
	assert!(result.unwrap_err().contains("not a directory"));
}
