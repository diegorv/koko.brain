use kokobrain_lib::sync::protocol::EntryKind;
use kokobrain_lib::sync::state_db::{
	bump_lamport, bump_manifest_version, delete_file_state, delete_tombstone, get_file_state,
	get_tombstone, list_file_states, merge_remote_lamport, open_in_memory, open_state_db,
	read_share_state, set_last_seen_peer_addr, state_db_path, upsert_file_state,
	upsert_tombstone, FileStateRow, TombstoneRow,
};

fn sample_file(share: &str, path: &str, lamport: u64) -> FileStateRow {
	FileStateRow {
		share_id: share.to_string(),
		path_rel: path.to_string(),
		kind: EntryKind::File,
		mtime_ms: 1_700_000_000_000,
		lamport,
		sha256_hash: "abc".repeat(20).chars().take(64).collect(),
		size: 1024,
		origin_fingerprint: "A1B2C3D4E5F60708".to_string(),
	}
}

// ============================================================================
// Schema bootstrap
// ============================================================================

#[test]
fn open_state_db_creates_file_and_schema() {
	let tmp = tempfile::tempdir().unwrap();
	let conn = open_state_db(tmp.path()).unwrap();
	assert!(state_db_path(tmp.path()).exists());
	// Tables exist (querying nothing returns Ok).
	let _ = read_share_state(&conn, "any").unwrap();
}

#[test]
fn open_state_db_is_idempotent() {
	let tmp = tempfile::tempdir().unwrap();
	let _ = open_state_db(tmp.path()).unwrap();
	let conn = open_state_db(tmp.path()).unwrap();
	let _ = read_share_state(&conn, "any").unwrap();
}

// ============================================================================
// share_state
// ============================================================================

#[test]
fn read_share_state_returns_default_when_missing() {
	let conn = open_in_memory().unwrap();
	let state = read_share_state(&conn, "share-1").unwrap();
	assert_eq!(state.lamport, 0);
	assert_eq!(state.manifest_version, 0);
	assert_eq!(state.last_seen_peer_addr, None);
}

#[test]
fn bump_lamport_increments_by_one() {
	let conn = open_in_memory().unwrap();
	assert_eq!(bump_lamport(&conn, "share-1").unwrap(), 1);
	assert_eq!(bump_lamport(&conn, "share-1").unwrap(), 2);
	assert_eq!(bump_lamport(&conn, "share-1").unwrap(), 3);
	assert_eq!(read_share_state(&conn, "share-1").unwrap().lamport, 3);
}

#[test]
fn bump_lamport_is_per_share() {
	let conn = open_in_memory().unwrap();
	bump_lamport(&conn, "share-a").unwrap();
	bump_lamport(&conn, "share-a").unwrap();
	bump_lamport(&conn, "share-b").unwrap();
	assert_eq!(read_share_state(&conn, "share-a").unwrap().lamport, 2);
	assert_eq!(read_share_state(&conn, "share-b").unwrap().lamport, 1);
}

#[test]
fn bump_lamport_is_atomic_under_concurrent_writers() {
	// Spawn N threads, each owning its own SQLite connection to the same
	// on-disk database, and have them all bump the same share's Lamport
	// clock M times. If the increment were a read-modify-write outside
	// a transaction, two threads could read the same value and write it
	// back, losing at least one tick. With the SQL-side atomic
	// `lamport = lamport + 1` the final value must be exactly N*M.
	let tmp = tempfile::tempdir().unwrap();
	// Initialise the file + schema before threads race on open.
	let _seed = open_state_db(tmp.path()).unwrap();
	let vault_root = tmp.path().to_path_buf();

	let threads = 16usize;
	let per_thread = 50usize;
	let mut handles = Vec::with_capacity(threads);
	for _ in 0..threads {
		let root = vault_root.clone();
		handles.push(std::thread::spawn(move || {
			let conn = open_state_db(&root).expect("worker open");
			for _ in 0..per_thread {
				bump_lamport(&conn, "share-race").expect("bump");
			}
		}));
	}
	for h in handles {
		h.join().expect("worker joined");
	}
	let conn = open_state_db(&vault_root).unwrap();
	let final_lamport = read_share_state(&conn, "share-race").unwrap().lamport;
	assert_eq!(
		final_lamport,
		(threads * per_thread) as u64,
		"lost ticks under concurrent bump_lamport"
	);
}

#[test]
fn merge_remote_lamport_takes_max_plus_one() {
	let conn = open_in_memory().unwrap();
	bump_lamport(&conn, "s").unwrap(); // local = 1
	bump_lamport(&conn, "s").unwrap(); // local = 2
	let result = merge_remote_lamport(&conn, "s", 10).unwrap();
	assert_eq!(result, 11);
}

#[test]
fn merge_remote_lamport_when_local_is_higher() {
	let conn = open_in_memory().unwrap();
	for _ in 0..20 {
		bump_lamport(&conn, "s").unwrap();
	}
	let result = merge_remote_lamport(&conn, "s", 5).unwrap();
	assert_eq!(result, 21);
}

#[test]
fn bump_manifest_version_increments() {
	let conn = open_in_memory().unwrap();
	assert_eq!(bump_manifest_version(&conn, "s").unwrap(), 1);
	assert_eq!(bump_manifest_version(&conn, "s").unwrap(), 2);
}

#[test]
fn lamport_and_manifest_version_are_independent() {
	let conn = open_in_memory().unwrap();
	bump_lamport(&conn, "s").unwrap();
	bump_lamport(&conn, "s").unwrap();
	bump_manifest_version(&conn, "s").unwrap();
	let state = read_share_state(&conn, "s").unwrap();
	assert_eq!(state.lamport, 2);
	assert_eq!(state.manifest_version, 1);
}

#[test]
fn set_last_seen_peer_addr_round_trips() {
	let conn = open_in_memory().unwrap();
	set_last_seen_peer_addr(&conn, "s", Some("192.168.1.4:31337")).unwrap();
	assert_eq!(
		read_share_state(&conn, "s").unwrap().last_seen_peer_addr,
		Some("192.168.1.4:31337".to_string())
	);
	set_last_seen_peer_addr(&conn, "s", None).unwrap();
	assert_eq!(read_share_state(&conn, "s").unwrap().last_seen_peer_addr, None);
}

// ============================================================================
// file_state
// ============================================================================

#[test]
fn upsert_and_get_file_state() {
	let conn = open_in_memory().unwrap();
	let row = sample_file("s", "note.md", 1);
	upsert_file_state(&conn, &row).unwrap();
	let got = get_file_state(&conn, "s", "note.md").unwrap().unwrap();
	assert_eq!(got, row);
}

#[test]
fn upsert_replaces_existing_row() {
	let conn = open_in_memory().unwrap();
	let row1 = sample_file("s", "note.md", 1);
	upsert_file_state(&conn, &row1).unwrap();
	let mut row2 = row1.clone();
	row2.lamport = 42;
	row2.sha256_hash = "newhash".repeat(8);
	upsert_file_state(&conn, &row2).unwrap();
	let got = get_file_state(&conn, "s", "note.md").unwrap().unwrap();
	assert_eq!(got.lamport, 42);
	assert!(got.sha256_hash.starts_with("newhash"));
}

#[test]
fn get_file_state_returns_none_when_missing() {
	let conn = open_in_memory().unwrap();
	assert!(get_file_state(&conn, "s", "missing.md").unwrap().is_none());
}

#[test]
fn file_state_kind_round_trips_for_directory() {
	let conn = open_in_memory().unwrap();
	let mut row = sample_file("s", "empty-dir", 1);
	row.kind = EntryKind::Directory;
	row.size = 0;
	row.sha256_hash = String::new();
	upsert_file_state(&conn, &row).unwrap();
	let got = get_file_state(&conn, "s", "empty-dir").unwrap().unwrap();
	assert_eq!(got.kind, EntryKind::Directory);
}

#[test]
fn list_file_states_returns_sorted() {
	let conn = open_in_memory().unwrap();
	upsert_file_state(&conn, &sample_file("s", "zzz.md", 1)).unwrap();
	upsert_file_state(&conn, &sample_file("s", "aaa.md", 2)).unwrap();
	upsert_file_state(&conn, &sample_file("s", "mmm.md", 3)).unwrap();
	let rows = list_file_states(&conn, "s").unwrap();
	let paths: Vec<&str> = rows.iter().map(|r| r.path_rel.as_str()).collect();
	assert_eq!(paths, vec!["aaa.md", "mmm.md", "zzz.md"]);
}

#[test]
fn list_file_states_isolates_per_share() {
	let conn = open_in_memory().unwrap();
	upsert_file_state(&conn, &sample_file("share-a", "a.md", 1)).unwrap();
	upsert_file_state(&conn, &sample_file("share-b", "b.md", 1)).unwrap();
	let a = list_file_states(&conn, "share-a").unwrap();
	let b = list_file_states(&conn, "share-b").unwrap();
	assert_eq!(a.len(), 1);
	assert_eq!(b.len(), 1);
	assert_eq!(a[0].path_rel, "a.md");
	assert_eq!(b[0].path_rel, "b.md");
}

#[test]
fn delete_file_state_returns_true_on_hit() {
	let conn = open_in_memory().unwrap();
	upsert_file_state(&conn, &sample_file("s", "a.md", 1)).unwrap();
	assert!(delete_file_state(&conn, "s", "a.md").unwrap());
	assert!(!delete_file_state(&conn, "s", "a.md").unwrap()); // already gone
}

// ============================================================================
// tombstones
// ============================================================================

#[test]
fn tombstone_round_trip() {
	let conn = open_in_memory().unwrap();
	let row = TombstoneRow {
		share_id: "s".to_string(),
		path_rel: "old.md".to_string(),
		deleted_at_mtime_ms: 1_700_000_000_000,
		deleted_at_lamport: 5,
		origin_fingerprint: "A1B2C3D4E5F60708".to_string(),
	};
	upsert_tombstone(&conn, &row).unwrap();
	let got = get_tombstone(&conn, "s", "old.md").unwrap().unwrap();
	assert_eq!(got, row);
}

#[test]
fn get_tombstone_returns_none_when_missing() {
	let conn = open_in_memory().unwrap();
	assert!(get_tombstone(&conn, "s", "missing.md").unwrap().is_none());
}

#[test]
fn delete_tombstone_works() {
	let conn = open_in_memory().unwrap();
	upsert_tombstone(
		&conn,
		&TombstoneRow {
			share_id: "s".to_string(),
			path_rel: "x.md".to_string(),
			deleted_at_mtime_ms: 0,
			deleted_at_lamport: 0,
			origin_fingerprint: "AA".to_string(),
		},
	)
	.unwrap();
	assert!(delete_tombstone(&conn, "s", "x.md").unwrap());
	assert!(get_tombstone(&conn, "s", "x.md").unwrap().is_none());
}
