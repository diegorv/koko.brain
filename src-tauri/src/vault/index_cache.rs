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
use sha2::{Digest, Sha256};
use std::collections::BTreeMap;
use std::fs;
use std::io::Write;
use std::path::{Path, PathBuf};

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

/// SHA-256 hash of the (canonicalised, if possible) vault path,
/// truncated to the first 16 hex chars. Used both as the cache file
/// name and as the embedded `vault_path_hash` in the snapshot so a
/// mismatched-vault file is detected at load time.
///
/// Canonicalisation falls back to the input string if the path does
/// not exist on disk — useful in tests and for vaults that have been
/// moved (the moved vault simply doesn't match the cached hash,
/// triggering a full rescan).
pub fn hash_vault_path(vault_path: &str) -> String {
	let canonical = fs::canonicalize(vault_path)
		.ok()
		.and_then(|p| p.to_str().map(str::to_string))
		.unwrap_or_else(|| vault_path.to_string());
	let mut hasher = Sha256::new();
	hasher.update(canonical.as_bytes());
	let digest = hasher.finalize();
	hex_prefix(&digest, 16)
}

fn hex_prefix(bytes: &[u8], chars: usize) -> String {
	let mut s = String::with_capacity(chars);
	for byte in bytes {
		if s.len() >= chars {
			break;
		}
		s.push_str(&format!("{:02x}", byte));
	}
	s.truncate(chars);
	s
}

/// Resolve the on-disk cache file path for a given vault under the
/// supplied base directory (typically `<app_local_data_dir>/index`).
/// Creates the parent directory if missing. The file itself is NOT
/// created — only the directory. Filename: `<vault-hash>.bincode`.
///
/// Separates the base-dir parameter from any Tauri AppHandle so this
/// can be exercised in unit tests against a `tempfile::TempDir`.
/// The IPC-side resolver in Task 5 builds `<app_local_data_dir>/index`
/// from the AppHandle and passes it here.
pub fn cache_file_path(base_dir: &Path, vault_path: &str) -> Result<PathBuf, String> {
	fs::create_dir_all(base_dir).map_err(|e| {
		format!(
			"failed to create cache base dir {}: {e}",
			base_dir.display()
		)
	})?;
	let hash = hash_vault_path(vault_path);
	Ok(base_dir.join(format!("{hash}.bincode")))
}

/// Write `bytes` to `path` atomically via temp file + fsync + rename.
/// Existing file (if any) is overwritten on success.
///
/// The temp file name is process- + nanos-unique
/// (`<filename>.<pid>.<nanos>.tmp`) so concurrent writers (Task 3's
/// debounced background task could in theory race with a synchronous
/// flush on vault close) each get their own staging file. The final
/// rename is atomic on POSIX; whichever writer renames last wins, and
/// readers always see a complete file. Failed writes leave their
/// staging file behind — a one-line cleanup pass in Task 5 sweeps any
/// stale `.tmp` siblings older than 24h.
pub fn write_snapshot_atomic(path: &Path, bytes: &[u8]) -> Result<(), String> {
	let parent = path.parent().ok_or_else(|| {
		format!("cache file path has no parent directory: {}", path.display())
	})?;
	fs::create_dir_all(parent)
		.map_err(|e| format!("failed to create cache dir {}: {e}", parent.display()))?;
	let filename = path
		.file_name()
		.and_then(|f| f.to_str())
		.ok_or_else(|| format!("cache file path has no file name: {}", path.display()))?;
	let pid = std::process::id();
	let nanos = std::time::SystemTime::now()
		.duration_since(std::time::UNIX_EPOCH)
		.map(|d| d.as_nanos())
		.unwrap_or(0);
	let tmp_path = parent.join(format!("{filename}.{pid}.{nanos}.tmp"));
	{
		let mut file = fs::File::create(&tmp_path).map_err(|e| {
			format!("failed to open temp cache file {}: {e}", tmp_path.display())
		})?;
		file.write_all(bytes).map_err(|e| {
			format!("failed to write cache bytes to {}: {e}", tmp_path.display())
		})?;
		file.sync_all().map_err(|e| {
			format!("failed to fsync cache file {}: {e}", tmp_path.display())
		})?;
	}
	fs::rename(&tmp_path, path).map_err(|e| {
		// Best-effort cleanup of the orphan staging file before
		// returning the error.
		let _ = fs::remove_file(&tmp_path);
		format!(
			"failed to rename cache file {} -> {}: {e}",
			tmp_path.display(),
			path.display()
		)
	})?;
	Ok(())
}

/// Read raw cache bytes from `path`. Returns `Ok(None)` if the file
/// does not exist (first-launch path); `Err` on any other IO error.
pub fn read_snapshot_bytes(path: &Path) -> Result<Option<Vec<u8>>, String> {
	match fs::read(path) {
		Ok(bytes) => Ok(Some(bytes)),
		Err(err) if err.kind() == std::io::ErrorKind::NotFound => Ok(None),
		Err(err) => Err(format!(
			"failed to read cache file {}: {err}",
			path.display()
		)),
	}
}

/// Delete the cache file. No-op if the file does not exist. Used by
/// the corruption-recovery path in Task 5.
pub fn delete_snapshot(path: &Path) -> Result<(), String> {
	match fs::remove_file(path) {
		Ok(_) => Ok(()),
		Err(err) if err.kind() == std::io::ErrorKind::NotFound => Ok(()),
		Err(err) => Err(format!(
			"failed to delete cache file {}: {err}",
			path.display()
		)),
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

	#[test]
	fn hash_vault_path_is_stable_and_deterministic() {
		let h1 = hash_vault_path("/Users/diegorv/kokobrain-vault");
		let h2 = hash_vault_path("/Users/diegorv/kokobrain-vault");
		assert_eq!(h1, h2);
		assert_eq!(h1.len(), 16);
		// All hex chars
		assert!(h1.chars().all(|c| c.is_ascii_hexdigit()));
	}

	#[test]
	fn hash_vault_path_differs_for_different_paths() {
		let h1 = hash_vault_path("/Users/diegorv/vault-a");
		let h2 = hash_vault_path("/Users/diegorv/vault-b");
		assert_ne!(h1, h2);
	}

	#[test]
	fn cache_file_path_creates_parent_and_returns_bincode_filename() {
		let tmp = tempfile::tempdir().unwrap();
		let base = tmp.path().join("index");
		assert!(!base.exists(), "precondition: index dir should not exist");
		let cache_path = cache_file_path(&base, "/Users/diegorv/vault").unwrap();
		assert!(base.exists(), "cache_file_path should create the parent dir");
		assert_eq!(cache_path.parent(), Some(base.as_path()));
		let filename = cache_path.file_name().unwrap().to_str().unwrap();
		assert!(filename.ends_with(".bincode"));
		assert_eq!(filename.len(), 16 + ".bincode".len());
	}

	#[test]
	fn write_and_read_snapshot_roundtrip_via_disk() {
		let tmp = tempfile::tempdir().unwrap();
		let cache_path = tmp.path().join("vault.bincode");
		let entries = vec![sample_entry("/vault/a.md", "alpha")];
		let bytes = serialize_snapshot("hash".into(), 1_700_000_000, &entries).unwrap();
		write_snapshot_atomic(&cache_path, &bytes).unwrap();
		assert!(cache_path.exists(), "cache file should exist after write");

		let read_bytes = read_snapshot_bytes(&cache_path).unwrap().unwrap();
		assert_eq!(read_bytes, bytes);

		let snap = deserialize_snapshot(&read_bytes).unwrap();
		assert_eq!(snap.into_entries().unwrap(), entries);
	}

	#[test]
	fn read_snapshot_returns_none_when_file_missing() {
		let tmp = tempfile::tempdir().unwrap();
		let cache_path = tmp.path().join("missing.bincode");
		let result = read_snapshot_bytes(&cache_path).unwrap();
		assert!(result.is_none());
	}

	#[test]
	fn write_snapshot_atomic_overwrites_existing_file() {
		let tmp = tempfile::tempdir().unwrap();
		let cache_path = tmp.path().join("vault.bincode");

		let bytes_v1 = serialize_snapshot("hash".into(), 1_700_000_000, &[]).unwrap();
		write_snapshot_atomic(&cache_path, &bytes_v1).unwrap();
		assert_eq!(read_snapshot_bytes(&cache_path).unwrap().unwrap(), bytes_v1);

		let entries = vec![sample_entry("/vault/a.md", "alpha")];
		let bytes_v2 = serialize_snapshot("hash".into(), 1_700_000_001, &entries).unwrap();
		write_snapshot_atomic(&cache_path, &bytes_v2).unwrap();
		assert_eq!(read_snapshot_bytes(&cache_path).unwrap().unwrap(), bytes_v2);
	}

	#[test]
	fn write_snapshot_atomic_leaves_no_tmp_after_success() {
		let tmp = tempfile::tempdir().unwrap();
		let cache_path = tmp.path().join("vault.bincode");
		let bytes = serialize_snapshot("hash".into(), 1_700_000_000, &[]).unwrap();
		write_snapshot_atomic(&cache_path, &bytes).unwrap();
		// Walk the dir and assert no .tmp siblings remain.
		let leftover_tmps: Vec<_> = fs::read_dir(tmp.path())
			.unwrap()
			.filter_map(|e| e.ok())
			.filter(|e| e.path().extension().is_some_and(|x| x == "tmp"))
			.collect();
		assert!(
			leftover_tmps.is_empty(),
			"temp file should be renamed away; found: {leftover_tmps:?}"
		);
	}

	#[test]
	fn concurrent_writes_produce_valid_file() {
		// Two threads write distinct payloads back-to-back to the same
		// target. Whichever wins the final rename produces a valid,
		// fully-readable file — never partial bytes.
		let tmp = tempfile::tempdir().unwrap();
		let cache_path = tmp.path().join("vault.bincode");
		let bytes_a = serialize_snapshot(
			"hash".into(),
			1_700_000_000,
			&[sample_entry("/vault/a.md", "alpha")],
		)
		.unwrap();
		let bytes_b = serialize_snapshot(
			"hash".into(),
			1_700_000_001,
			&[sample_entry("/vault/b.md", "beta")],
		)
		.unwrap();
		let path_a = cache_path.clone();
		let path_b = cache_path.clone();
		let bytes_a_clone = bytes_a.clone();
		let bytes_b_clone = bytes_b.clone();
		let t_a = std::thread::spawn(move || write_snapshot_atomic(&path_a, &bytes_a_clone));
		let t_b = std::thread::spawn(move || write_snapshot_atomic(&path_b, &bytes_b_clone));
		t_a.join().unwrap().unwrap();
		t_b.join().unwrap().unwrap();

		let final_bytes = read_snapshot_bytes(&cache_path).unwrap().unwrap();
		assert!(final_bytes == bytes_a || final_bytes == bytes_b);
		// Either way, the file must deserialize cleanly — i.e. no
		// partial-write corruption.
		let snap = deserialize_snapshot(&final_bytes).unwrap();
		assert_eq!(snap.entry_count(), 1);
	}

	#[test]
	fn delete_snapshot_removes_existing_file() {
		let tmp = tempfile::tempdir().unwrap();
		let cache_path = tmp.path().join("vault.bincode");
		fs::write(&cache_path, b"garbage").unwrap();
		assert!(cache_path.exists());
		delete_snapshot(&cache_path).unwrap();
		assert!(!cache_path.exists());
	}

	#[test]
	fn delete_snapshot_is_noop_when_missing() {
		let tmp = tempfile::tempdir().unwrap();
		let cache_path = tmp.path().join("missing.bincode");
		assert!(delete_snapshot(&cache_path).is_ok());
	}
}
