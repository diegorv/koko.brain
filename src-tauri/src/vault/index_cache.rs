//! Persistent on-disk snapshot of the parsed `VaultIndex` entries.
//!
//! Reverse indexes (`by_path`, `backlinks`, `tags_index`,
//! `properties_index`) are intentionally NOT persisted — they are
//! reconstructed at load time via `VaultIndex::build_from_entries` in
//! ~30 ms on the 5,755-note vault. Keeping the on-disk format limited
//! to the source `Vec<NoteEntry>` lets the index-derivation logic
//! evolve without bumping `INDEX_SCHEMA_VERSION`.
//!
//! Format: bincode 2.x with the serde compat layer. Pure (de)serialize
//! helpers live here; IO (atomic write, cache file path resolution)
//! lands in Task 2.
//!
//! Corruption is treated as routine: any decode error returns `Err`
//! and callers delete the file + fall back to a full scan. The cache
//! is always disposable.

use bincode::config;
use bincode::serde::{decode_from_slice, encode_to_vec};
use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;

use crate::vault::entry::{NoteEntry, WikiLink};
use crate::vault::task::Task;

/// Schema version of the on-disk snapshot. Bump whenever
/// `PersistedNoteEntry`'s bincode layout changes (any field
/// add/remove/reorder/type change). Mismatched versions are silently
/// invalidated at load time — the next launch does a full scan and
/// overwrites the file. No migration logic; the cache is always
/// disposable.
pub const INDEX_SCHEMA_VERSION: u32 = 1;

/// On-disk representation of a single note entry.
///
/// Mirrors `NoteEntry` except for `frontmatter`, which is stored as a
/// JSON string. `serde_json::Value` cannot round-trip through bincode
/// because bincode is a non-self-describing format and the enum's
/// untagged variants require `deserialize_any`. JSON-stringifying the
/// frontmatter at the cache boundary sidesteps the limitation without
/// touching the live `NoteEntry` shape that the rest of the codebase
/// (and IPC) consumes.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
struct PersistedNoteEntry {
	path: String,
	title: String,
	frontmatter_json: String,
	outgoing_links: Vec<WikiLink>,
	tags: Vec<String>,
	modified_at: i64,
	created_at: i64,
	size: u64,
	word_count: usize,
	snippet: String,
	tasks: Vec<Task>,
}

impl PersistedNoteEntry {
	fn from_note_entry(entry: &NoteEntry) -> Result<Self, String> {
		let frontmatter_json = serde_json::to_string(&entry.frontmatter)
			.map_err(|e| format!("serialize frontmatter failed for {}: {e}", entry.path))?;
		Ok(Self {
			path: entry.path.clone(),
			title: entry.title.clone(),
			frontmatter_json,
			outgoing_links: entry.outgoing_links.clone(),
			tags: entry.tags.clone(),
			modified_at: entry.modified_at,
			created_at: entry.created_at,
			size: entry.size,
			word_count: entry.word_count,
			snippet: entry.snippet.clone(),
			tasks: entry.tasks.clone(),
		})
	}

	fn into_note_entry(self) -> Result<NoteEntry, String> {
		let frontmatter: BTreeMap<String, serde_json::Value> =
			serde_json::from_str(&self.frontmatter_json).map_err(|e| {
				format!(
					"deserialize frontmatter failed for {}: {e}",
					self.path
				)
			})?;
		Ok(NoteEntry {
			path: self.path,
			title: self.title,
			frontmatter,
			outgoing_links: self.outgoing_links,
			tags: self.tags,
			modified_at: self.modified_at,
			created_at: self.created_at,
			size: self.size,
			word_count: self.word_count,
			snippet: self.snippet,
			tasks: self.tasks,
		})
	}
}

/// Top-level on-disk snapshot. `schema_version` and `vault_path_hash`
/// gate load: mismatches are treated as a corrupted cache and the file
/// is deleted by the caller. `written_at_secs` is informational only
/// (telemetry / debugging — does NOT participate in validation).
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct IndexSnapshot {
	pub schema_version: u32,
	pub vault_path_hash: String,
	pub written_at_secs: i64,
	entries: Vec<PersistedNoteEntry>,
}

impl IndexSnapshot {
	/// Convert the persisted entries back into live `NoteEntry`s.
	/// Returns `Err` if any frontmatter JSON fails to parse — that
	/// indicates a corrupt cache and the caller should delete the
	/// file and fall back to a full scan.
	pub fn into_entries(self) -> Result<Vec<NoteEntry>, String> {
		self.entries
			.into_iter()
			.map(PersistedNoteEntry::into_note_entry)
			.collect()
	}

	/// Number of entries in the snapshot. Useful for telemetry without
	/// triggering the JSON-parse pass that `into_entries` does.
	pub fn entry_count(&self) -> usize {
		self.entries.len()
	}
}

/// Serialize a snapshot to bincode bytes. Pure function; no IO.
///
/// `vault_path_hash` should be the SHA-256 prefix of the canonicalised
/// vault path (computed by the cache-file resolver in Task 2). It is
/// embedded in the snapshot so a cache file picked up from the wrong
/// directory (manually copied, vault renamed, etc.) is detected.
///
/// Returns `Err` if any entry's frontmatter cannot be JSON-stringified
/// (extremely rare — `serde_json::Value` is always stringifiable, so
/// the failure path is effectively unreachable in practice but
/// surfaced explicitly to avoid silent data loss).
pub fn serialize_snapshot(
	vault_path_hash: String,
	written_at_secs: i64,
	entries: &[NoteEntry],
) -> Result<Vec<u8>, String> {
	let persisted: Vec<PersistedNoteEntry> = entries
		.iter()
		.map(PersistedNoteEntry::from_note_entry)
		.collect::<Result<_, _>>()?;
	let snapshot = IndexSnapshot {
		schema_version: INDEX_SCHEMA_VERSION,
		vault_path_hash,
		written_at_secs,
		entries: persisted,
	};
	encode_to_vec(&snapshot, config::standard())
		.map_err(|e| format!("bincode serialize failed: {e}"))
}

/// Deserialize a snapshot from bincode bytes. Pure function; no IO.
///
/// Returns the snapshot on success. On any decode error — truncated
/// input, format-version mismatch in bincode itself, NoteEntry shape
/// change — returns `Err` with a context message. Callers should treat
/// the cache as corrupt, delete the file, and fall back to a full
/// scan via `scan_vault_v2`.
///
/// Schema version is NOT enforced here so the caller can distinguish
/// "decode error" from "wrong version" for telemetry purposes. Use
/// `validate_schema_version` after a successful decode.
pub fn deserialize_snapshot(bytes: &[u8]) -> Result<IndexSnapshot, String> {
	let (snapshot, _bytes_read): (IndexSnapshot, usize) =
		decode_from_slice(bytes, config::standard())
			.map_err(|e| format!("bincode deserialize failed: {e}"))?;
	Ok(snapshot)
}

/// Check the snapshot's schema version against `INDEX_SCHEMA_VERSION`.
/// Returns `Err` with a log-friendly message on mismatch.
pub fn validate_schema_version(snapshot: &IndexSnapshot) -> Result<(), String> {
	if snapshot.schema_version == INDEX_SCHEMA_VERSION {
		Ok(())
	} else {
		Err(format!(
			"index cache schema version mismatch: file has {}, expected {}",
			snapshot.schema_version, INDEX_SCHEMA_VERSION
		))
	}
}

/// Check the snapshot's vault-path hash against the expected hash for
/// the currently open vault. Returns `Err` with a log-friendly message
/// on mismatch (e.g. cache file copied between vault directories,
/// vault moved on disk).
pub fn validate_vault_path_hash(
	snapshot: &IndexSnapshot,
	expected_hash: &str,
) -> Result<(), String> {
	if snapshot.vault_path_hash == expected_hash {
		Ok(())
	} else {
		Err(format!(
			"index cache vault-path hash mismatch: file has {}, expected {}",
			snapshot.vault_path_hash, expected_hash
		))
	}
}

#[cfg(test)]
mod tests {
	use super::*;
	use std::collections::BTreeMap;

	fn sample_entry(path: &str, tag: &str) -> NoteEntry {
		NoteEntry {
			path: path.to_string(),
			title: "sample".to_string(),
			frontmatter: BTreeMap::new(),
			outgoing_links: Vec::new(),
			tags: vec![tag.to_string()],
			modified_at: 1_700_000_000,
			created_at: 1_699_000_000,
			size: 42,
			word_count: 7,
			snippet: "hello world".to_string(),
			tasks: Vec::new(),
		}
	}

	#[test]
	fn roundtrips_empty_snapshot() {
		let bytes = serialize_snapshot("hash-abc".into(), 1_700_000_000, &[]).unwrap();
		let snap = deserialize_snapshot(&bytes).unwrap();
		assert_eq!(snap.schema_version, INDEX_SCHEMA_VERSION);
		assert_eq!(snap.vault_path_hash, "hash-abc");
		assert_eq!(snap.written_at_secs, 1_700_000_000);
		assert_eq!(snap.entry_count(), 0);
		assert!(snap.into_entries().unwrap().is_empty());
	}

	#[test]
	fn roundtrips_snapshot_with_entries() {
		let entries = vec![
			sample_entry("/vault/a.md", "alpha"),
			sample_entry("/vault/b.md", "beta"),
			sample_entry("/vault/c.md", "gamma"),
		];
		let bytes = serialize_snapshot("hash-xyz".into(), 1_700_000_001, &entries).unwrap();
		let snap = deserialize_snapshot(&bytes).unwrap();
		assert_eq!(snap.entry_count(), 3);
		assert_eq!(snap.into_entries().unwrap(), entries);
	}

	#[test]
	fn roundtrips_snapshot_with_rich_frontmatter() {
		let mut frontmatter = BTreeMap::new();
		frontmatter.insert("title".to_string(), serde_json::json!("My Note"));
		frontmatter.insert(
			"tags".to_string(),
			serde_json::json!(["alpha", "beta"]),
		);
		frontmatter.insert("draft".to_string(), serde_json::json!(true));
		frontmatter.insert("priority".to_string(), serde_json::json!(3));
		frontmatter.insert("nested".to_string(), serde_json::json!({"a": 1, "b": [2, 3]}));
		let entry = NoteEntry {
			path: "/vault/rich.md".to_string(),
			title: "Rich".to_string(),
			frontmatter,
			outgoing_links: Vec::new(),
			tags: vec!["alpha".to_string(), "beta".to_string()],
			modified_at: 1_700_000_002,
			created_at: 1_699_000_000,
			size: 128,
			word_count: 12,
			snippet: "abc".to_string(),
			tasks: Vec::new(),
		};
		let bytes =
			serialize_snapshot("hash".into(), 1_700_000_002, &[entry.clone()]).unwrap();
		let snap = deserialize_snapshot(&bytes).unwrap();
		assert_eq!(snap.into_entries().unwrap(), vec![entry]);
	}

	#[test]
	fn deserialize_rejects_truncated_input() {
		let entries = vec![
			sample_entry("/vault/a.md", "alpha"),
			sample_entry("/vault/b.md", "beta"),
		];
		let bytes = serialize_snapshot("hash".into(), 1_700_000_003, &entries).unwrap();
		// Drop the last 8 bytes — should land somewhere inside the
		// entries Vec and trigger a decode failure.
		let truncated = &bytes[..bytes.len().saturating_sub(8)];
		assert!(deserialize_snapshot(truncated).is_err());
	}

	#[test]
	fn deserialize_rejects_empty_input() {
		assert!(deserialize_snapshot(&[]).is_err());
	}

	#[test]
	fn deserialize_rejects_garbage() {
		let garbage: Vec<u8> = (0u8..200).collect();
		assert!(deserialize_snapshot(&garbage).is_err());
	}

	#[test]
	fn validate_schema_version_accepts_current() {
		let snap = IndexSnapshot {
			schema_version: INDEX_SCHEMA_VERSION,
			vault_path_hash: "x".into(),
			written_at_secs: 0,
			entries: vec![],
		};
		assert!(validate_schema_version(&snap).is_ok());
	}

	#[test]
	fn validate_schema_version_rejects_mismatch() {
		let snap = IndexSnapshot {
			schema_version: INDEX_SCHEMA_VERSION.wrapping_add(1),
			vault_path_hash: "x".into(),
			written_at_secs: 0,
			entries: vec![],
		};
		let err = validate_schema_version(&snap).unwrap_err();
		assert!(err.contains("schema version mismatch"));
	}

	#[test]
	fn validate_vault_path_hash_accepts_match() {
		let snap = IndexSnapshot {
			schema_version: INDEX_SCHEMA_VERSION,
			vault_path_hash: "abc".into(),
			written_at_secs: 0,
			entries: vec![],
		};
		assert!(validate_vault_path_hash(&snap, "abc").is_ok());
	}

	#[test]
	fn validate_vault_path_hash_rejects_mismatch() {
		let snap = IndexSnapshot {
			schema_version: INDEX_SCHEMA_VERSION,
			vault_path_hash: "abc".into(),
			written_at_secs: 0,
			entries: vec![],
		};
		let err = validate_vault_path_hash(&snap, "xyz").unwrap_err();
		assert!(err.contains("vault-path hash mismatch"));
	}
}
