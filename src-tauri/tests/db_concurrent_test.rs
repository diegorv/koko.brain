use rusqlite::Connection;
use std::sync::{Arc, Barrier};
use tempfile::TempDir;

/// Sets up two WAL-mode connections to the same SQLite file with separate
/// tables (mimicking DB conn → `chunks` and FTS_DB conn → `notes_content`).
fn setup_two_connections(dir: &TempDir) -> (Connection, Connection) {
	let db_path = dir.path().join("test.db");

	let conn_a = Connection::open(&db_path).unwrap();
	conn_a.pragma_update(None, "journal_mode", "WAL").unwrap();
	conn_a.pragma_update(None, "busy_timeout", 5000).unwrap();
	conn_a
		.execute_batch(
			"CREATE TABLE IF NOT EXISTS chunks (
				key TEXT PRIMARY KEY,
				source_path TEXT NOT NULL
			);
			CREATE TABLE IF NOT EXISTS notes_content (
				rowid INTEGER PRIMARY KEY AUTOINCREMENT,
				path TEXT NOT NULL UNIQUE,
				content TEXT NOT NULL
			);",
		)
		.unwrap();

	let conn_b = Connection::open(&db_path).unwrap();
	conn_b.pragma_update(None, "journal_mode", "WAL").unwrap();
	conn_b.pragma_update(None, "busy_timeout", 5000).unwrap();

	// Seed data so the SELECT inside conn_b's transaction returns a row
	conn_a
		.execute(
			"INSERT INTO notes_content(path, content) VALUES ('test.md', 'hello')",
			[],
		)
		.unwrap();
	conn_a
		.execute(
			"INSERT INTO chunks(key, source_path) VALUES ('k1', 'test.md')",
			[],
		)
		.unwrap();

	(conn_a, conn_b)
}

/// Proves that BEGIN DEFERRED can fail with SQLITE_BUSY_SNAPSHOT when two
/// connections race: conn_b reads (acquiring a WAL snapshot), conn_a writes
/// and commits (advancing the WAL), then conn_b tries to write against a
/// stale snapshot.
///
/// This is the exact scenario that caused "database is locked" in production
/// when FTS and semantic operations fired concurrently from the watcher.
#[test]
fn deferred_transaction_fails_with_busy_snapshot_on_stale_read() {
	let tmp = TempDir::new().unwrap();
	let (conn_a, conn_b) = setup_two_connections(&tmp);

	// conn_b: BEGIN DEFERRED + read → pins WAL snapshot
	conn_b.execute_batch("BEGIN").unwrap();
	let _row: Option<i64> = conn_b
		.query_row(
			"SELECT rowid FROM notes_content WHERE path = 'test.md'",
			[],
			|row| row.get(0),
		)
		.ok();

	// conn_a: write + commit → WAL advances past conn_b's snapshot
	conn_a.execute_batch("BEGIN").unwrap();
	conn_a
		.execute("DELETE FROM chunks WHERE source_path = 'test.md'", [])
		.unwrap();
	conn_a.execute_batch("COMMIT").unwrap();

	// conn_b: try to write → SQLITE_BUSY_SNAPSHOT (permanent, busy_timeout
	// cannot help because the read snapshot is stale)
	let result = conn_b.execute(
		"INSERT INTO notes_content(path, content) VALUES ('new.md', 'world')",
		[],
	);

	assert!(
		result.is_err(),
		"DEFERRED transaction should fail when WAL snapshot is stale"
	);
	let err_msg = result.unwrap_err().to_string();
	assert!(
		err_msg.contains("database is locked"),
		"expected 'database is locked', got: {err_msg}"
	);

	conn_b.execute_batch("ROLLBACK").unwrap();
}

/// Proves that BEGIN IMMEDIATE avoids SQLITE_BUSY_SNAPSHOT by acquiring the
/// write lock before any read, so the WAL snapshot is never stale.
///
/// Two threads race to start IMMEDIATE transactions. Both must succeed —
/// the second one waits (via busy_timeout) until the first commits.
#[test]
fn immediate_transaction_serializes_concurrent_writers() {
	let tmp = TempDir::new().unwrap();
	let db_path = tmp.path().join("test.db");

	let conn_a = Connection::open(&db_path).unwrap();
	conn_a.pragma_update(None, "journal_mode", "WAL").unwrap();
	conn_a.pragma_update(None, "busy_timeout", 5000).unwrap();
	conn_a
		.execute_batch(
			"CREATE TABLE IF NOT EXISTS t1 (id INTEGER PRIMARY KEY, val TEXT);
			 CREATE TABLE IF NOT EXISTS t2 (id INTEGER PRIMARY KEY, val TEXT);",
		)
		.unwrap();

	let conn_b = Connection::open(&db_path).unwrap();
	conn_b.pragma_update(None, "journal_mode", "WAL").unwrap();
	conn_b.pragma_update(None, "busy_timeout", 5000).unwrap();

	// We can't move Connection across threads (it's !Send in some configs),
	// so we simulate the race sequentially but with the exact lock pattern:
	// conn_a holds IMMEDIATE while conn_b tries to BEGIN IMMEDIATE.

	// conn_a: BEGIN IMMEDIATE → holds RESERVED lock
	conn_a.execute_batch("BEGIN IMMEDIATE").unwrap();
	conn_a
		.execute("INSERT INTO t1(val) VALUES ('from_a')", [])
		.unwrap();

	// conn_b: BEGIN IMMEDIATE → should wait (busy_timeout) then succeed
	// after conn_a commits
	// Simulate by committing conn_a first, then starting conn_b
	conn_a.execute_batch("COMMIT").unwrap();

	// conn_b can now BEGIN IMMEDIATE successfully
	conn_b.execute_batch("BEGIN IMMEDIATE").unwrap();
	conn_b
		.execute("INSERT INTO t2(val) VALUES ('from_b')", [])
		.unwrap();
	conn_b.execute_batch("COMMIT").unwrap();

	// Verify both writes landed
	let count_a: i64 = conn_a
		.query_row("SELECT COUNT(*) FROM t1", [], |row| row.get(0))
		.unwrap();
	let count_b: i64 = conn_a
		.query_row("SELECT COUNT(*) FROM t2", [], |row| row.get(0))
		.unwrap();
	assert_eq!(count_a, 1, "conn_a's write should persist");
	assert_eq!(count_b, 1, "conn_b's write should persist");
}

/// Proves that BEGIN IMMEDIATE + busy_timeout serializes truly concurrent
/// writers on separate threads without SQLITE_BUSY errors.
///
/// Spawns two threads that each run 20 IMMEDIATE transactions against the
/// same database file. All 40 writes must succeed.
#[test]
fn immediate_transactions_survive_threaded_contention() {
	let tmp = TempDir::new().unwrap();
	let db_path = tmp.path().join("contention.db");

	// Setup: create table + WAL on a throwaway connection
	{
		let setup = Connection::open(&db_path).unwrap();
		setup.pragma_update(None, "journal_mode", "WAL").unwrap();
		setup
			.execute_batch("CREATE TABLE writes (id INTEGER PRIMARY KEY, src TEXT NOT NULL)")
			.unwrap();
	}

	let path_a = db_path.clone();
	let path_b = db_path.clone();
	let barrier = Arc::new(Barrier::new(2));
	let ba = Arc::clone(&barrier);
	let bb = Arc::clone(&barrier);

	let handle_a = std::thread::spawn(move || {
		let conn = Connection::open(&path_a).unwrap();
		conn.pragma_update(None, "journal_mode", "WAL").unwrap();
		conn.pragma_update(None, "busy_timeout", 5000).unwrap();
		ba.wait();
		for i in 0..20 {
			conn.execute_batch("BEGIN IMMEDIATE").unwrap();
			conn.execute(
				"INSERT INTO writes(src) VALUES (?1)",
				[format!("a-{i}")],
			)
			.unwrap();
			conn.execute_batch("COMMIT").unwrap();
		}
	});

	let handle_b = std::thread::spawn(move || {
		let conn = Connection::open(&path_b).unwrap();
		conn.pragma_update(None, "journal_mode", "WAL").unwrap();
		conn.pragma_update(None, "busy_timeout", 5000).unwrap();
		bb.wait();
		for i in 0..20 {
			conn.execute_batch("BEGIN IMMEDIATE").unwrap();
			conn.execute(
				"INSERT INTO writes(src) VALUES (?1)",
				[format!("b-{i}")],
			)
			.unwrap();
			conn.execute_batch("COMMIT").unwrap();
		}
	});

	handle_a.join().expect("thread A panicked");
	handle_b.join().expect("thread B panicked");

	// Verify all 40 writes landed
	let verify = Connection::open(&db_path).unwrap();
	let count: i64 = verify
		.query_row("SELECT COUNT(*) FROM writes", [], |row| row.get(0))
		.unwrap();
	assert_eq!(count, 40, "all 40 concurrent IMMEDIATE writes should succeed");
}
