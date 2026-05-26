//! Integration tests for the persistent VaultIndex cache.

use kokobrain_lib::vault::entry::NoteEntry;
use kokobrain_lib::vault::index_cache::{
	self, cache_file_path, deserialize_snapshot, read_snapshot, serialize_snapshot, write_snapshot,
	IndexSnapshot, INDEX_SCHEMA_VERSION,
};
use std::collections::BTreeMap;
use std::fs;
use tempfile::TempDir;

fn make_entry(path: &str, mtime: i64) -> NoteEntry {
	NoteEntry {
		path: path.to_string(),
		title: path.rsplit('/').next().unwrap_or(path).to_string(),
		modified_at: mtime,
		..Default::default()
	}
}


#[test]
fn roundtrip_with_frontmatter_values() {
	let entries = vec![NoteEntry {
		path: "/vault/note.md".to_string(),
		title: "note".to_string(),
		frontmatter: BTreeMap::from([
			("type".to_string(), serde_json::json!("project")),
			("tags".to_string(), serde_json::json!(["rust", "dev"])),
			("nested".to_string(), serde_json::json!({"key": "value"})),
		]),
		tags: vec!["rust".to_string()],
		modified_at: 1700000000,
		size: 1024,
		..Default::default()
	}];

	let snapshot = IndexSnapshot {
		schema_version: INDEX_SCHEMA_VERSION,
		vault_path_hash: "test".to_string(),
		written_at_secs: 1700000000,
		entries,
	};

	let bytes = serialize_snapshot(&snapshot).unwrap();
	let restored = deserialize_snapshot(&bytes).unwrap();

	assert_eq!(restored.entries[0].frontmatter.len(), 3);
	assert_eq!(
		restored.entries[0].frontmatter["tags"],
		serde_json::json!(["rust", "dev"])
	);
	assert_eq!(
		restored.entries[0].frontmatter["nested"],
		serde_json::json!({"key": "value"})
	);
}

#[test]
fn write_and_read_snapshot_roundtrip() {
	let tmp = TempDir::new().unwrap();
	fs::create_dir_all(tmp.path().join(".kokobrain")).unwrap();
	let vault = tmp.path().to_string_lossy().to_string();

	let entries = vec![
		make_entry("/vault/a.md", 100),
		make_entry("/vault/b.md", 200),
	];

	write_snapshot(&vault, &entries).unwrap();

	let restored = read_snapshot(&vault).unwrap().unwrap();
	assert_eq!(restored.schema_version, INDEX_SCHEMA_VERSION);
	assert_eq!(restored.entries.len(), 2);
	assert_eq!(restored.entries[0].path, "/vault/a.md");
	assert_eq!(restored.entries[1].modified_at, 200);
}

#[test]
fn read_snapshot_returns_none_when_missing() {
	let tmp = TempDir::new().unwrap();
	let vault = tmp.path().to_string_lossy().to_string();
	assert!(read_snapshot(&vault).unwrap().is_none());
}

#[test]
fn corrupt_cache_returns_error() {
	let tmp = TempDir::new().unwrap();
	let vault = tmp.path().to_string_lossy().to_string();
	let path = cache_file_path(&vault);
	fs::create_dir_all(path.parent().unwrap()).unwrap();
	fs::write(&path, b"not valid msgpack").unwrap();

	let result = read_snapshot(&vault);
	assert!(result.is_err());
}

#[test]
fn schema_version_mismatch_detectable() {
	let snapshot = IndexSnapshot {
		schema_version: 999,
		vault_path_hash: "test".to_string(),
		written_at_secs: 0,
		entries: vec![],
	};

	let bytes = serialize_snapshot(&snapshot).unwrap();
	let restored = deserialize_snapshot(&bytes).unwrap();
	assert_ne!(restored.schema_version, INDEX_SCHEMA_VERSION);
}

#[test]
fn atomic_write_no_tmp_left_behind() {
	let tmp = TempDir::new().unwrap();
	fs::create_dir_all(tmp.path().join(".kokobrain")).unwrap();
	let vault = tmp.path().to_string_lossy().to_string();

	write_snapshot(&vault, &[make_entry("/a.md", 100)]).unwrap();

	let cache = cache_file_path(&vault);
	assert!(cache.exists());
	assert!(!cache.with_extension("msgpack.tmp").exists());
}

#[test]
fn overwrite_preserves_atomicity() {
	let tmp = TempDir::new().unwrap();
	fs::create_dir_all(tmp.path().join(".kokobrain")).unwrap();
	let vault = tmp.path().to_string_lossy().to_string();

	// Write initial
	write_snapshot(&vault, &[make_entry("/a.md", 100)]).unwrap();
	// Overwrite
	write_snapshot(&vault, &[make_entry("/a.md", 200), make_entry("/b.md", 300)]).unwrap();

	let restored = read_snapshot(&vault).unwrap().unwrap();
	assert_eq!(restored.entries.len(), 2);
	assert_eq!(restored.entries[0].modified_at, 200);
}

#[test]
fn large_entry_set_roundtrips() {
	let entries: Vec<NoteEntry> = (0..1000)
		.map(|i| NoteEntry {
			path: format!("/vault/note-{i}.md"),
			title: format!("note-{i}"),
			tags: vec![format!("tag-{}", i % 10)],
			modified_at: 1700000000 + i,
			size: 1024 + i as u64,
			snippet: format!("Snippet for note {i}"),
			..Default::default()
		})
		.collect();

	let snapshot = IndexSnapshot {
		schema_version: INDEX_SCHEMA_VERSION,
		vault_path_hash: "test".to_string(),
		written_at_secs: 1700000000,
		entries: entries.clone(),
	};

	let bytes = serialize_snapshot(&snapshot).unwrap();
	let restored = deserialize_snapshot(&bytes).unwrap();

	assert_eq!(restored.entries.len(), 1000);
	assert_eq!(restored.entries[500].path, "/vault/note-500.md");
	assert_eq!(restored.entries[999].tags, vec!["tag-9"]);
}
