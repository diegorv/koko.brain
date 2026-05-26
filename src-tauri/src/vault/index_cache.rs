//! Persistent snapshot codec for the `VaultIndex`.
//!
//! Serializes `Vec<NoteEntry>` to a versioned JSON file. Reverse indexes
//! are NOT persisted — they are rebuilt at load time via
//! `VaultIndex::build`. JSON chosen over bincode because `NoteEntry`
//! contains `serde_json::Value` fields (frontmatter) which require
//! `deserialize_any` — unsupported by non-self-describing formats.

use crate::vault::entry::NoteEntry;
use serde::{Deserialize, Serialize};

/// Bumped whenever `NoteEntry` shape changes in any way that affects
/// serialization (field add/remove/reorder/type change). Mismatch on
/// load -> discard cache -> full scan.
pub const INDEX_SCHEMA_VERSION: u32 = 1;

/// Top-level envelope persisted to disk.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IndexSnapshot {
	pub schema_version: u32,
	/// First 16 hex chars of sha256(canonicalize(vault_path)).
	pub vault_path_hash: String,
	/// Unix timestamp (seconds) when this snapshot was written.
	pub written_at_secs: i64,
	/// The per-note metadata entries that seed `VaultIndex::build`.
	pub entries: Vec<NoteEntry>,
}

/// Serializes a snapshot to JSON bytes.
pub fn serialize_snapshot(snapshot: &IndexSnapshot) -> Result<Vec<u8>, String> {
	serde_json::to_vec(snapshot).map_err(|e| format!("snapshot serialize failed: {e}"))
}

/// Deserializes a snapshot from JSON bytes. Returns an error on
/// truncation, corruption, or any decode failure.
pub fn deserialize_snapshot(bytes: &[u8]) -> Result<IndexSnapshot, String> {
	serde_json::from_slice(bytes).map_err(|e| format!("snapshot deserialize failed: {e}"))
}

/// Returns the path to the cache file for the given vault.
/// Location: `<vault_path>/.kokobrain/vault-index.json`.
pub fn cache_file_path(vault_path: &str) -> std::path::PathBuf {
	std::path::PathBuf::from(vault_path)
		.join(".kokobrain")
		.join("vault-index.json")
}

/// Writes bytes to disk atomically: write to .tmp, fsync, rename.
/// Parent directory is created if missing.
pub fn write_snapshot_atomic(path: &std::path::Path, bytes: &[u8]) -> Result<(), String> {
	use std::fs;
	use std::io::Write;

	if let Some(parent) = path.parent() {
		fs::create_dir_all(parent)
			.map_err(|e| format!("create cache dir failed: {e}"))?;
	}

	let tmp_path = path.with_extension("json.tmp");

	let mut file = fs::File::create(&tmp_path)
		.map_err(|e| format!("create tmp cache file failed: {e}"))?;
	file.write_all(bytes)
		.map_err(|e| format!("write cache bytes failed: {e}"))?;
	file.sync_all()
		.map_err(|e| format!("fsync cache file failed: {e}"))?;
	drop(file);

	fs::rename(&tmp_path, path)
		.map_err(|e| format!("rename cache file failed: {e}"))?;

	Ok(())
}

/// Reads the cache file from disk. Returns None if the file does not
/// exist; returns Err on read/parse failures.
pub fn read_snapshot(vault_path: &str) -> Result<Option<IndexSnapshot>, String> {
	let path = cache_file_path(vault_path);
	match std::fs::read(&path) {
		Ok(bytes) => {
			let snapshot = deserialize_snapshot(&bytes)?;
			Ok(Some(snapshot))
		}
		Err(e) if e.kind() == std::io::ErrorKind::NotFound => Ok(None),
		Err(e) => Err(format!("read cache file failed: {e}")),
	}
}

/// Writes a snapshot to the cache file atomically.
pub fn write_snapshot(vault_path: &str, entries: &[NoteEntry]) -> Result<(), String> {
	let snapshot = IndexSnapshot {
		schema_version: INDEX_SCHEMA_VERSION,
		vault_path_hash: vault_path.to_string(),
		written_at_secs: chrono::Utc::now().timestamp(),
		entries: entries.to_vec(),
	};
	let bytes = serialize_snapshot(&snapshot)?;
	let path = cache_file_path(vault_path);
	write_snapshot_atomic(&path, &bytes)
}

#[cfg(test)]
mod tests {
	use super::*;
	use crate::vault::entry::NoteEntry;
	use std::collections::BTreeMap;

	fn sample_entries() -> Vec<NoteEntry> {
		vec![
			NoteEntry {
				path: "/vault/note-one.md".to_string(),
				title: "note-one".to_string(),
				tags: vec!["rust".to_string(), "dev".to_string()],
				modified_at: 1700000000,
				created_at: 1699000000,
				size: 1234,
				word_count: 42,
				snippet: "Hello world".to_string(),
				..Default::default()
			},
			NoteEntry {
				path: "/vault/sub/note-two.md".to_string(),
				title: "note-two".to_string(),
				frontmatter: BTreeMap::from([
					("type".to_string(), serde_json::json!("project")),
					("status".to_string(), serde_json::json!("active")),
				]),
				modified_at: 1700001000,
				created_at: 1699001000,
				size: 5678,
				word_count: 100,
				snippet: "Another note".to_string(),
				..Default::default()
			},
		]
	}

	#[test]
	fn roundtrip_snapshot() {
		let snapshot = IndexSnapshot {
			schema_version: INDEX_SCHEMA_VERSION,
			vault_path_hash: "abcdef0123456789".to_string(),
			written_at_secs: 1700000000,
			entries: sample_entries(),
		};

		let bytes = serialize_snapshot(&snapshot).unwrap();
		let restored = deserialize_snapshot(&bytes).unwrap();

		assert_eq!(restored.schema_version, INDEX_SCHEMA_VERSION);
		assert_eq!(restored.vault_path_hash, "abcdef0123456789");
		assert_eq!(restored.written_at_secs, 1700000000);
		assert_eq!(restored.entries.len(), 2);
		assert_eq!(restored.entries[0].path, "/vault/note-one.md");
		assert_eq!(restored.entries[0].tags, vec!["rust", "dev"]);
		assert_eq!(restored.entries[1].frontmatter.len(), 2);
	}

	#[test]
	fn version_mismatch_still_deserializes() {
		let snapshot = IndexSnapshot {
			schema_version: 999,
			vault_path_hash: "abcdef0123456789".to_string(),
			written_at_secs: 1700000000,
			entries: sample_entries(),
		};

		let bytes = serialize_snapshot(&snapshot).unwrap();
		let restored = deserialize_snapshot(&bytes).unwrap();
		// Caller checks version; deserialize itself succeeds
		assert_eq!(restored.schema_version, 999);
	}

	#[test]
	fn truncated_input_errors() {
		let snapshot = IndexSnapshot {
			schema_version: INDEX_SCHEMA_VERSION,
			vault_path_hash: "abcdef0123456789".to_string(),
			written_at_secs: 1700000000,
			entries: sample_entries(),
		};

		let bytes = serialize_snapshot(&snapshot).unwrap();
		// Truncate to half
		let truncated = &bytes[..bytes.len() / 2];
		let result = deserialize_snapshot(truncated);
		assert!(result.is_err());
	}

	#[test]
	fn empty_entries_roundtrip() {
		let snapshot = IndexSnapshot {
			schema_version: INDEX_SCHEMA_VERSION,
			vault_path_hash: "0000000000000000".to_string(),
			written_at_secs: 0,
			entries: vec![],
		};

		let bytes = serialize_snapshot(&snapshot).unwrap();
		let restored = deserialize_snapshot(&bytes).unwrap();
		assert_eq!(restored.entries.len(), 0);
	}

	#[test]
	fn corrupt_bytes_errors() {
		let result = deserialize_snapshot(&[0xFF, 0xFE, 0xFD, 0x00, 0x01]);
		assert!(result.is_err());
	}

	#[test]
	fn cache_file_path_resolves_correctly() {
		let path = cache_file_path("/Users/foo/my-vault");
		assert_eq!(
			path,
			std::path::PathBuf::from("/Users/foo/my-vault/.kokobrain/vault-index.json")
		);
	}

	#[test]
	fn atomic_write_roundtrip() {
		let dir = tempfile::tempdir().unwrap();
		let cache_path = dir.path().join("vault-index.json");

		let snapshot = IndexSnapshot {
			schema_version: INDEX_SCHEMA_VERSION,
			vault_path_hash: "test".to_string(),
			written_at_secs: 1700000000,
			entries: sample_entries(),
		};
		let bytes = serialize_snapshot(&snapshot).unwrap();
		write_snapshot_atomic(&cache_path, &bytes).unwrap();

		let read_bytes = std::fs::read(&cache_path).unwrap();
		let restored = deserialize_snapshot(&read_bytes).unwrap();
		assert_eq!(restored.entries.len(), 2);
		assert_eq!(restored.entries[0].path, "/vault/note-one.md");

		// No .tmp file left behind
		assert!(!cache_path.with_extension("json.tmp").exists());
	}

	#[test]
	fn write_and_read_snapshot() {
		let dir = tempfile::tempdir().unwrap();
		let vault_path = dir.path().join("vault");
		std::fs::create_dir_all(vault_path.join(".kokobrain")).unwrap();
		let vault_str = vault_path.to_string_lossy().to_string();

		write_snapshot(&vault_str, &sample_entries()).unwrap();

		let restored = read_snapshot(&vault_str).unwrap().unwrap();
		assert_eq!(restored.schema_version, INDEX_SCHEMA_VERSION);
		assert_eq!(restored.entries.len(), 2);
	}

	#[test]
	fn read_snapshot_missing_file_returns_none() {
		let dir = tempfile::tempdir().unwrap();
		let vault_str = dir.path().to_string_lossy().to_string();
		let result = read_snapshot(&vault_str).unwrap();
		assert!(result.is_none());
	}

	#[test]
	fn atomic_write_creates_parent_dir() {
		let dir = tempfile::tempdir().unwrap();
		let cache_path = dir.path().join("nested").join("dir").join("cache.json");

		let bytes = serialize_snapshot(&IndexSnapshot {
			schema_version: INDEX_SCHEMA_VERSION,
			vault_path_hash: "x".to_string(),
			written_at_secs: 0,
			entries: vec![],
		})
		.unwrap();

		write_snapshot_atomic(&cache_path, &bytes).unwrap();
		assert!(cache_path.exists());
	}
}
