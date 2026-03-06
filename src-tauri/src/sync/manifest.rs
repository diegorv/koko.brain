use globset::{Glob, GlobSetBuilder};
use sha2::{Digest, Sha256};
use std::collections::HashMap;
use std::path::Path;

use crate::utils::fs::collect_markdown_paths;

/// A single file entry in a sync manifest.
#[derive(serde::Serialize, serde::Deserialize, Debug, Clone, PartialEq)]
pub struct FileEntry {
	/// Relative path from vault root (e.g. `"notes/hello.md"`).
	pub path: String,
	/// Hex-encoded SHA-256 hash of the file content.
	pub sha256: String,
	/// Last modification time as unix timestamp (seconds).
	pub mtime: u64,
}

/// A sync manifest listing all syncable files in a vault.
#[derive(serde::Serialize, serde::Deserialize, Debug, Clone)]
pub struct SyncManifest {
	/// All files included in this manifest.
	pub files: Vec<FileEntry>,
	/// Unix timestamp (seconds) when this manifest was generated.
	pub generated_at: u64,
}

/// Result of comparing a file between local, remote, and baseline manifests.
#[derive(Debug, Clone, PartialEq)]
pub enum FileDiff {
	/// File is identical on both sides — no action needed.
	Identical,
	/// File changed only on remote — pull from peer.
	PullFromPeer,
	/// File changed only locally — push to peer.
	PushToPeer,
	/// File changed on both sides — conflict.
	Conflict,
	/// File was deleted locally (present in baseline + remote, absent locally).
	DeleteLocal,
	/// File was deleted on remote (present in baseline + locally, absent on remote).
	DeleteRemote,
	/// One side deleted, the other modified — keep the modified version.
	DeleteModifyConflict {
		/// Which side has the modified version.
		modified_side: Side,
	},
}

/// Indicates which peer holds a particular version.
#[derive(Debug, Clone, Copy, PartialEq)]
pub enum Side {
	Local,
	Remote,
}

// ---------------------------------------------------------------------------
// Hardcoded exclusions
// ---------------------------------------------------------------------------

/// Files and directories that are never synced, regardless of user config.
const HARDCODED_EXCLUDES: &[&str] = &[
	"noted.db",
	"noted.db-wal",
	"noted.db-shm",
	".noted/trash/",
	".noted/sync-identity",
	".noted/sync-local.json",
	".noted/sync-state.json",
];

/// Files inside `.noted/` that ARE allowed to sync.
const NOTED_DIR_ALLOWLIST: &[&str] = &["vault-id", "settings.json"];

// ---------------------------------------------------------------------------
// Allowlist logic
// ---------------------------------------------------------------------------

/// Checks whether a path is allowed to sync.
///
/// A path is allowed only if it is NOT in the hardcoded exclusions AND matches
/// at least one user-configured glob in `allowed_paths`. If `allowed_paths` is
/// empty, no user files are allowed (system files in `.noted/` are handled
/// separately by `build_manifest`).
pub fn is_allowed(path: &str, allowed_paths: &[String]) -> bool {
	// Hardcoded excludes always reject
	for pattern in HARDCODED_EXCLUDES {
		if pattern.ends_with('/') {
			let prefix = pattern.trim_end_matches('/');
			if path.starts_with(prefix) && (path.len() == prefix.len() || path.as_bytes()[prefix.len()] == b'/') {
				return false;
			}
		} else if path == *pattern {
			return false;
		}
	}

	// Empty allowlist = nothing allowed
	if allowed_paths.is_empty() {
		return false;
	}

	// Check user-configured allow globs
	let mut builder = GlobSetBuilder::new();
	for pattern in allowed_paths {
		if let Ok(glob) = Glob::new(pattern) {
			builder.add(glob);
		}
	}
	if let Ok(set) = builder.build() {
		return set.is_match(path);
	}

	false
}

// ---------------------------------------------------------------------------
// Manifest building
// ---------------------------------------------------------------------------

/// Builds a sync manifest for the given vault, respecting the allowlist.
///
/// Collects:
/// 1. All `.md` / `.markdown` files that match `allowed_paths` globs
/// 2. System files from `.noted/` (vault-id, settings.json) — always included
///
/// Hardcoded exclusions (db, trash, etc.) are always rejected regardless of allowlist.
pub fn build_manifest(
	vault_path: &str,
	allowed_paths: &[String],
) -> Result<SyncManifest, String> {
	let vault_root = Path::new(vault_path);
	let mut entries = Vec::new();

	// 1. Collect markdown files matching the allowlist
	let md_files = collect_markdown_paths(vault_root, &[])
		.map_err(|e| format!("Failed to collect markdown files: {e}"))?;

	for (rel_path, abs_path) in &md_files {
		if !is_allowed(rel_path, allowed_paths) {
			continue;
		}
		match build_file_entry(vault_root, rel_path, abs_path) {
			Ok(entry) => entries.push(entry),
			Err(e) => {
				eprintln!("[SYNC:MANIFEST] Warning: skipping {rel_path}: {e}");
			}
		}
	}

	// 2. Collect system .noted/ files (always synced, not subject to user allowlist)
	let noted_dir = vault_root.join(".noted");
	if noted_dir.is_dir() {
		for allowed in NOTED_DIR_ALLOWLIST {
			let abs_path = noted_dir.join(allowed);
			if abs_path.is_file() {
				let rel_path = format!(".noted/{allowed}");
				// Only check hardcoded excludes (not user allowlist)
				let hardcoded_blocked = HARDCODED_EXCLUDES.iter().any(|p| rel_path == *p);
				if !hardcoded_blocked {
					match build_file_entry(vault_root, &rel_path, &abs_path) {
						Ok(entry) => entries.push(entry),
						Err(e) => {
							eprintln!("[SYNC:MANIFEST] Warning: skipping {rel_path}: {e}");
						}
					}
				}
			}
		}
	}

	let generated_at = std::time::SystemTime::now()
		.duration_since(std::time::UNIX_EPOCH)
		.unwrap_or_default()
		.as_secs();

	Ok(SyncManifest {
		files: entries,
		generated_at,
	})
}

/// Maximum file size for manifest inclusion (10 MB).
const MAX_FILE_SIZE_BYTES: u64 = 10 * 1024 * 1024;

/// Builds a `FileEntry` for a single file.
fn build_file_entry(
	_vault_root: &Path,
	rel_path: &str,
	abs_path: &Path,
) -> Result<FileEntry, String> {
	// Check file size before reading into memory
	let file_size = std::fs::metadata(abs_path)
		.map_err(|e| format!("Failed to stat {rel_path}: {e}"))?
		.len();
	if file_size > MAX_FILE_SIZE_BYTES {
		return Err(format!("File too large ({file_size} bytes): {rel_path}"));
	}

	let content =
		std::fs::read(abs_path).map_err(|e| format!("Failed to read {rel_path}: {e}"))?;

	let sha256 = hex_encode(&Sha256::digest(&content));

	let mtime = std::fs::metadata(abs_path)
		.and_then(|m| m.modified())
		.ok()
		.and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
		.map(|d| d.as_secs())
		.unwrap_or(0);

	Ok(FileEntry {
		path: rel_path.to_string(),
		sha256,
		mtime,
	})
}

// ---------------------------------------------------------------------------
// Three-way diff
// ---------------------------------------------------------------------------

/// Diffs local and remote manifests against an optional baseline.
///
/// - **With baseline** (subsequent syncs): three-way diff detecting push, pull,
///   conflict, delete-local, delete-remote, and delete-modify-conflict.
/// - **Without baseline** (first sync): two-way comparison — same hash = skip,
///   different hash = conflict, file only on one side = pull/push.
pub fn diff_manifests(
	local: &SyncManifest,
	remote: &SyncManifest,
	baseline: Option<&SyncManifest>,
) -> Vec<(String, FileDiff)> {
	let local_map: HashMap<&str, &FileEntry> =
		local.files.iter().map(|f| (f.path.as_str(), f)).collect();
	let remote_map: HashMap<&str, &FileEntry> =
		remote.files.iter().map(|f| (f.path.as_str(), f)).collect();

	let mut results = Vec::new();

	match baseline {
		Some(base) => {
			let base_map: HashMap<&str, &FileEntry> =
				base.files.iter().map(|f| (f.path.as_str(), f)).collect();
			diff_with_baseline(&local_map, &remote_map, &base_map, &mut results);
		}
		None => {
			diff_without_baseline(&local_map, &remote_map, &mut results);
		}
	}

	results
}

/// Three-way diff with a baseline manifest.
fn diff_with_baseline(
	local: &HashMap<&str, &FileEntry>,
	remote: &HashMap<&str, &FileEntry>,
	baseline: &HashMap<&str, &FileEntry>,
	results: &mut Vec<(String, FileDiff)>,
) {
	// Collect all unique paths
	let mut all_paths: Vec<&str> = Vec::new();
	for key in local.keys().chain(remote.keys()).chain(baseline.keys()) {
		if !all_paths.contains(key) {
			all_paths.push(key);
		}
	}

	for path in all_paths {
		let in_local = local.get(path);
		let in_remote = remote.get(path);
		let in_base = baseline.get(path);

		let diff = match (in_local, in_remote, in_base) {
			// Present everywhere
			(Some(l), Some(r), Some(b)) => {
				let l_changed = l.sha256 != b.sha256;
				let r_changed = r.sha256 != b.sha256;
				match (l_changed, r_changed) {
					(false, false) => FileDiff::Identical,
					(true, false) => FileDiff::PushToPeer,
					(false, true) => FileDiff::PullFromPeer,
					(true, true) => {
						if l.sha256 == r.sha256 {
							FileDiff::Identical // Both changed identically
						} else {
							FileDiff::Conflict
						}
					}
				}
			}
			// Present on both sides but not in baseline → new since last sync
			(Some(l), Some(r), None) => {
				if l.sha256 == r.sha256 {
					FileDiff::Identical
				} else {
					FileDiff::Conflict
				}
			}
			// Only local + baseline → remote deleted
			(Some(l), None, Some(b)) => {
				if l.sha256 != b.sha256 {
					FileDiff::DeleteModifyConflict {
						modified_side: Side::Local,
					}
				} else {
					FileDiff::DeleteRemote
				}
			}
			// Only remote + baseline → local deleted
			(None, Some(r), Some(b)) => {
				if r.sha256 != b.sha256 {
					FileDiff::DeleteModifyConflict {
						modified_side: Side::Remote,
					}
				} else {
					FileDiff::DeleteLocal
				}
			}
			// Only local (new file) → push
			(Some(_), None, None) => FileDiff::PushToPeer,
			// Only remote (new file) → pull
			(None, Some(_), None) => FileDiff::PullFromPeer,
			// Only in baseline (both deleted) → no-op
			(None, None, Some(_)) => continue,
			// Not anywhere — shouldn't happen
			(None, None, None) => continue,
		};

		results.push((path.to_string(), diff));
	}
}

/// Two-way diff for first sync (no baseline).
fn diff_without_baseline(
	local: &HashMap<&str, &FileEntry>,
	remote: &HashMap<&str, &FileEntry>,
	results: &mut Vec<(String, FileDiff)>,
) {
	// Collect all unique paths
	let mut all_paths: Vec<&str> = Vec::new();
	for key in local.keys().chain(remote.keys()) {
		if !all_paths.contains(key) {
			all_paths.push(key);
		}
	}

	for path in all_paths {
		let diff = match (local.get(path), remote.get(path)) {
			(Some(l), Some(r)) => {
				if l.sha256 == r.sha256 {
					FileDiff::Identical
				} else {
					FileDiff::Conflict
				}
			}
			(Some(_), None) => FileDiff::PushToPeer,
			(None, Some(_)) => FileDiff::PullFromPeer,
			(None, None) => continue,
		};
		results.push((path.to_string(), diff));
	}
}

/// Encodes bytes as lowercase hex string.
fn hex_encode(bytes: &[u8]) -> String {
	bytes.iter().map(|b| format!("{b:02x}")).collect()
}
