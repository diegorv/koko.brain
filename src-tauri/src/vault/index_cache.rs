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

/// Computes the vault path hash used as the cache file name component.
/// Returns the first 16 hex chars of sha256(canonicalize(vault_path)).
pub fn vault_path_hash(vault_path: &str) -> Result<String, String> {
	let canonical = std::fs::canonicalize(vault_path)
		.map_err(|e| format!("canonicalize vault path failed: {e}"))?;
	use sha2::Digest;
	let hash = sha2::Sha256::digest(canonical.to_string_lossy().as_bytes());
	Ok(hash[..8].iter().map(|b| format!("{b:02x}")).collect())
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
}
