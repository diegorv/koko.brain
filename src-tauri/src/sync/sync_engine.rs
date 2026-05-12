//! Manifest diffing, conflict resolution, and atomic-write apply for
//! LAN sync.
//!
//! Pure helpers ([`diff_manifests`], [`paginate_manifest`],
//! [`build_conflict_filename`]) live alongside the I/O-bound apply
//! path ([`apply_inbound_update`], [`apply_inbound_delete`],
//! [`save_conflict_copy`], [`cleanup_orphan_tmp_files`]) so callers
//! can exercise the LWW rules without touching disk.
//!
//! Atomic write pattern: every inbound payload is written to
//! `<dest>.kbsync-tmp-<uuid>`, fsynced, then renamed to `<dest>`. A
//! crash mid-write leaves either the old content or no file at all,
//! never a half-written destination. Orphans from earlier crashes
//! are cleaned up on startup by [`cleanup_orphan_tmp_files`].

use std::collections::BTreeMap;
use std::path::{Path, PathBuf};

use crate::sync::protocol::ManifestEntry;

/// Outcome of comparing a single path across two manifests.
///
/// "Winner" is decided by the LWW rule:
/// `(lamport, mtime_ms)` tuple lexicographic — Lamport first, mtime as
/// a tiebreaker. If both fingerprints match all four fields, no diff
/// is emitted (idempotent no-op).
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum DiffEntry {
	/// Path exists remotely but not locally — pull it.
	AddedRemote(ManifestEntry),
	/// Path exists locally but not remotely — push it.
	AddedLocal(ManifestEntry),
	/// Path exists on both sides; the remote version wins under LWW.
	RemoteWins(ManifestEntry),
	/// Path exists on both sides; the local version wins under LWW.
	LocalWins(ManifestEntry),
}

/// Compares `local` against `remote` and returns the set of actions
/// needed to converge. Both inputs are full manifests for a single
/// share. Order in the output is by `path_rel` ascending for
/// determinism.
pub fn diff_manifests(
	local: &[ManifestEntry],
	remote: &[ManifestEntry],
) -> Vec<DiffEntry> {
	let local_map: BTreeMap<&str, &ManifestEntry> =
		local.iter().map(|e| (e.path_rel.as_str(), e)).collect();
	let remote_map: BTreeMap<&str, &ManifestEntry> =
		remote.iter().map(|e| (e.path_rel.as_str(), e)).collect();

	let mut out: Vec<DiffEntry> = Vec::new();
	// Iterate the union of paths in sorted order.
	let mut all_paths: Vec<&str> = local_map.keys().copied().collect();
	for p in remote_map.keys() {
		if !local_map.contains_key(p) {
			all_paths.push(p);
		}
	}
	all_paths.sort();

	for path in all_paths {
		match (local_map.get(path), remote_map.get(path)) {
			(None, Some(r)) => out.push(DiffEntry::AddedRemote((*r).clone())),
			(Some(l), None) => out.push(DiffEntry::AddedLocal((*l).clone())),
			(Some(l), Some(r)) => {
				if entries_equal(l, r) {
					continue;
				}
				match lww_winner(l, r) {
					Winner::Remote => out.push(DiffEntry::RemoteWins((*r).clone())),
					Winner::Local => out.push(DiffEntry::LocalWins((*l).clone())),
				}
			}
			(None, None) => unreachable!(),
		}
	}
	out
}

/// Returns `true` if `local` and `remote` agree on everything that
/// would otherwise drive a sync action (kind, hash, size). Lamport
/// and mtime drift below the hash level is intentionally ignored.
fn entries_equal(local: &ManifestEntry, remote: &ManifestEntry) -> bool {
	local.kind == remote.kind
		&& local.size == remote.size
		&& local.sha256_hash == remote.sha256_hash
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum Winner {
	Local,
	Remote,
}

/// LWW: lexicographic on `(lamport, mtime_ms)`. Ties broken by
/// `origin_fingerprint` lexicographic (deterministic across runs).
fn lww_winner(local: &ManifestEntry, remote: &ManifestEntry) -> Winner {
	match (remote.lamport, remote.mtime_ms).cmp(&(local.lamport, local.mtime_ms)) {
		std::cmp::Ordering::Greater => Winner::Remote,
		std::cmp::Ordering::Less => Winner::Local,
		std::cmp::Ordering::Equal => {
			if remote.origin_fingerprint > local.origin_fingerprint {
				Winner::Remote
			} else {
				Winner::Local
			}
		}
	}
}

// ============================================================================
// Apply inbound updates (atomic writes + conflict file generation)
// ============================================================================

/// Tmp file suffix used while an inbound payload is being written.
/// The leading dot keeps the file hidden in most file managers; the
/// UUID protects against races between concurrent writers.
pub const TMP_PREFIX: &str = ".kbsync-tmp-";

/// Errors surfaced by the inbound apply path.
#[derive(Debug)]
pub enum ApplyError {
	/// I/O failure during a read/write/rename/canonicalize.
	Io(String),
	/// `path_rel` failed Camera-2 path validation (`..`, NUL, absolute,
	/// dot-segment) — should never happen for trusted-peer messages
	/// but the defense-in-depth check stops at the inbound boundary.
	InvalidPath(String),
	/// `path_rel` resolved outside the share root — symlink attack
	/// or TOCTOU race; reject before any I/O.
	OutsideShare(String),
	/// Tried to apply an update that would clobber an open editor
	/// buffer; this is currently informational only (the
	/// "don't overwrite open buffer" follow-up TODO).
	WouldOverwriteOpenBuffer,
}

impl core::fmt::Display for ApplyError {
	fn fmt(&self, f: &mut core::fmt::Formatter<'_>) -> core::fmt::Result {
		match self {
			Self::Io(msg) => write!(f, "apply io: {msg}"),
			Self::InvalidPath(p) => write!(f, "invalid path: {p:?}"),
			Self::OutsideShare(p) => write!(f, "path resolves outside share: {p:?}"),
			Self::WouldOverwriteOpenBuffer => {
				write!(f, "would overwrite an open editor buffer")
			}
		}
	}
}

impl std::error::Error for ApplyError {}

impl From<std::io::Error> for ApplyError {
	fn from(e: std::io::Error) -> Self {
		ApplyError::Io(e.to_string())
	}
}

/// Outcome of an inbound apply call. Drives the `lan-sync:conflict-saved`
/// event emission.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum ApplyOutcome {
	/// The inbound payload was applied; the previous local copy did
	/// not exist or was identical (no conflict).
	Applied,
	/// The inbound payload was applied AND a conflict copy of the
	/// previous local content was saved as `<path>.conflict-...`.
	AppliedWithConflict { conflict_path: PathBuf },
	/// The inbound payload was ignored because the local copy wins
	/// under LWW or because the hashes already matched.
	IgnoredLocalWins,
	/// The inbound payload was ignored because hashes already matched
	/// (idempotent no-op).
	IgnoredIdempotent,
}

/// Camera-2 inbound path validation: rejects `..`, NUL, absolute
/// prefixes, and dot-segments. Pulled out so callers can pre-validate
/// without committing to a full apply.
pub fn validate_inbound_path(path_rel: &str) -> Result<PathBuf, ApplyError> {
	if path_rel.is_empty() || path_rel == "." {
		return Err(ApplyError::InvalidPath(path_rel.to_string()));
	}
	if path_rel.contains('\0') {
		return Err(ApplyError::InvalidPath(path_rel.to_string()));
	}
	if path_rel.starts_with('/') || path_rel.starts_with('\\') {
		return Err(ApplyError::InvalidPath(path_rel.to_string()));
	}
	// Windows drive letter (e.g. "C:\...") — reject early.
	let bytes = path_rel.as_bytes();
	if bytes.len() >= 2 && bytes[0].is_ascii_alphabetic() && bytes[1] == b':' {
		return Err(ApplyError::InvalidPath(path_rel.to_string()));
	}
	let parsed = PathBuf::from(path_rel);
	for component in parsed.components() {
		use std::path::Component;
		match component {
			Component::ParentDir => return Err(ApplyError::InvalidPath(path_rel.to_string())),
			Component::Normal(s) => {
				let seg = s.to_string_lossy();
				if seg.starts_with('.') {
					return Err(ApplyError::InvalidPath(path_rel.to_string()));
				}
			}
			Component::CurDir => {} // tolerated; canonicalize drops it
			_ => return Err(ApplyError::InvalidPath(path_rel.to_string())),
		}
	}
	Ok(parsed)
}

/// Camera-3 path resolution: joins `path_rel` under `share_root`,
/// strictly_starts_with-checks the result against `share_root`. Use
/// this immediately before opening for read/write so any TOCTOU
/// window between validation and the open() syscall is minimal.
pub fn safe_resolve_under_share(
	share_root: &Path,
	path_rel: &str,
) -> Result<PathBuf, ApplyError> {
	let rel = validate_inbound_path(path_rel)?;
	let candidate = share_root.join(&rel);

	// If the candidate exists, canonicalize and check strict prefix —
	// resolves any symlink in the chain.
	if candidate.exists() {
		let canon = candidate
			.canonicalize()
			.map_err(|e| ApplyError::Io(e.to_string()))?;
		let share_canon = share_root
			.canonicalize()
			.map_err(|e| ApplyError::Io(e.to_string()))?;
		if !canon.starts_with(&share_canon) {
			return Err(ApplyError::OutsideShare(path_rel.to_string()));
		}
		return Ok(canon);
	}

	// Destination doesn't exist yet — canonicalize the parent and
	// reattach the filename. This is the write path; the parent must
	// exist (or we create it below) and must live inside the share.
	if let Some(parent) = candidate.parent() {
		std::fs::create_dir_all(parent).map_err(|e| ApplyError::Io(e.to_string()))?;
		let parent_canon = parent
			.canonicalize()
			.map_err(|e| ApplyError::Io(e.to_string()))?;
		let share_canon = share_root
			.canonicalize()
			.map_err(|e| ApplyError::Io(e.to_string()))?;
		if !parent_canon.starts_with(&share_canon) {
			return Err(ApplyError::OutsideShare(path_rel.to_string()));
		}
		let filename = rel
			.file_name()
			.ok_or_else(|| ApplyError::InvalidPath(path_rel.to_string()))?;
		return Ok(parent_canon.join(filename));
	}
	Err(ApplyError::InvalidPath(path_rel.to_string()))
}

/// Composes the conflict filename for the LOSER of a sync conflict:
/// `<basename>.conflict-<peer8>-<YYYYMMDDhhmmss>.<ext>`. Extension is
/// preserved if present; basename keeps its remaining stem.
///
/// `peer_short` is expected to be 8 uppercase hex chars (e.g. via
/// [`crate::sync::identity::short_fingerprint`]).
/// `timestamp_compact` is a string in the form produced by
/// `chrono::Utc::now().format("%Y%m%d%H%M%S")`; pulled out as a
/// parameter so tests can pin it.
pub fn build_conflict_filename(
	original: &Path,
	peer_short: &str,
	timestamp_compact: &str,
) -> PathBuf {
	let stem = original
		.file_stem()
		.map(|s| s.to_string_lossy().to_string())
		.unwrap_or_default();
	let ext = original
		.extension()
		.map(|s| format!(".{}", s.to_string_lossy()))
		.unwrap_or_default();
	let new_name = format!("{stem}.conflict-{peer_short}-{timestamp_compact}{ext}");
	original
		.parent()
		.map(|p| p.join(&new_name))
		.unwrap_or_else(|| PathBuf::from(new_name))
}

/// Renames the current file at `original` to a `.conflict-<peer>-<ts>`
/// sibling. Returns the conflict path. Errors if `original` doesn't
/// exist or the rename fails.
pub fn save_conflict_copy(
	original: &Path,
	peer_short: &str,
	timestamp_compact: &str,
) -> Result<PathBuf, ApplyError> {
	let dest = build_conflict_filename(original, peer_short, timestamp_compact);
	std::fs::rename(original, &dest).map_err(|e| ApplyError::Io(e.to_string()))?;
	Ok(dest)
}

/// Writes `content` atomically to `dest`. Steps:
/// 1. Write to `<dest>.kbsync-tmp-<uuid>`.
/// 2. Sync the tmp file to disk (`fsync`).
/// 3. Rename tmp → dest (atomic on POSIX + ReFS/NTFS).
pub fn atomic_write(dest: &Path, content: &[u8]) -> Result<(), ApplyError> {
	use std::io::Write;
	if let Some(parent) = dest.parent() {
		std::fs::create_dir_all(parent).map_err(|e| ApplyError::Io(e.to_string()))?;
	}
	let dest_name = dest
		.file_name()
		.ok_or_else(|| ApplyError::Io("destination has no filename".to_string()))?
		.to_string_lossy()
		.to_string();
	let tmp_name = format!("{TMP_PREFIX}{}-{}", dest_name, uuid::Uuid::new_v4());
	let tmp = dest.with_file_name(&tmp_name);
	{
		let mut file =
			std::fs::File::create(&tmp).map_err(|e| ApplyError::Io(e.to_string()))?;
		file.write_all(content)
			.map_err(|e| ApplyError::Io(e.to_string()))?;
		file.sync_all()
			.map_err(|e| ApplyError::Io(e.to_string()))?;
	}
	std::fs::rename(&tmp, dest).map_err(|e| ApplyError::Io(e.to_string()))?;
	Ok(())
}

/// Cleans up orphan tmp files left by previous crashes inside
/// `share_root`. Walks the directory tree once; removes any file
/// whose basename starts with [`TMP_PREFIX`] and whose mtime is older
/// than `older_than_seconds` (default `60` is plenty for an
/// in-progress sync to finish or visibly fail).
pub fn cleanup_orphan_tmp_files(
	share_root: &Path,
	older_than_seconds: u64,
) -> Result<usize, ApplyError> {
	use std::time::{Duration, SystemTime};
	if !share_root.exists() {
		return Ok(0);
	}
	let cutoff = SystemTime::now() - Duration::from_secs(older_than_seconds);
	let mut removed = 0usize;
	let mut stack: Vec<PathBuf> = vec![share_root.to_path_buf()];
	while let Some(dir) = stack.pop() {
		let read_dir = match std::fs::read_dir(&dir) {
			Ok(r) => r,
			Err(_) => continue,
		};
		for entry in read_dir.flatten() {
			let path = entry.path();
			let metadata = match entry.metadata() {
				Ok(m) => m,
				Err(_) => continue,
			};
			if metadata.is_dir() {
				stack.push(path);
				continue;
			}
			let name = entry.file_name().to_string_lossy().to_string();
			if !name.starts_with(TMP_PREFIX) {
				continue;
			}
			let too_recent = metadata
				.modified()
				.map(|m| m > cutoff)
				.unwrap_or(false);
			if too_recent {
				continue;
			}
			if std::fs::remove_file(&path).is_ok() {
				removed += 1;
			}
		}
	}
	Ok(removed)
}

/// Applies an inbound `PushUpdate` payload to disk under `share_root`,
/// respecting the LWW rule against the optional `local` state.
///
/// Returns:
/// - `Applied` — destination didn't exist OR local lost cleanly and
///   the previous content was identical / absent.
/// - `AppliedWithConflict { conflict_path }` — local lost LWW AND
///   had divergent content; saved the old version as a conflict
///   sibling before writing the new one.
/// - `IgnoredLocalWins` — local wins under LWW; caller may need to
///   push the local version proactively.
/// - `IgnoredIdempotent` — hashes already match.
pub fn apply_inbound_update(
	share_root: &Path,
	path_rel: &str,
	new_content: &[u8],
	new_hash: &str,
	new_mtime_ms: i64,
	new_lamport: u64,
	new_origin_fp: &str,
	local: Option<&InboundLocalState>,
	peer_short: &str,
	timestamp_compact: &str,
) -> Result<ApplyOutcome, ApplyError> {
	let dest = safe_resolve_under_share(share_root, path_rel)?;

	let local_state = local.cloned().unwrap_or_default();
	if local_state.exists && local_state.hash == new_hash {
		return Ok(ApplyOutcome::IgnoredIdempotent);
	}

	if local_state.exists {
		let winner = lww_remote_wins(
			local_state.lamport,
			local_state.mtime_ms,
			&local_state.origin_fp,
			new_lamport,
			new_mtime_ms,
			new_origin_fp,
		);
		if !winner {
			return Ok(ApplyOutcome::IgnoredLocalWins);
		}
		// Remote wins: snapshot the local content as a conflict sibling
		// BEFORE overwriting so users never lose silently.
		let conflict_path = save_conflict_copy(&dest, peer_short, timestamp_compact)?;
		atomic_write(&dest, new_content)?;
		return Ok(ApplyOutcome::AppliedWithConflict { conflict_path });
	}

	// No local copy yet (or first time).
	atomic_write(&dest, new_content)?;
	Ok(ApplyOutcome::Applied)
}

/// Applies an inbound `Delete` payload (tombstone) to disk. Same LWW
/// rule as [`apply_inbound_update`]. When the local copy loses AND
/// had divergent content, the local copy is saved as a conflict
/// sibling so deletion never destroys unique local edits silently.
pub fn apply_inbound_delete(
	share_root: &Path,
	path_rel: &str,
	delete_mtime_ms: i64,
	delete_lamport: u64,
	delete_origin_fp: &str,
	local: Option<&InboundLocalState>,
	peer_short: &str,
	timestamp_compact: &str,
) -> Result<ApplyOutcome, ApplyError> {
	let dest = safe_resolve_under_share(share_root, path_rel)?;

	let local_state = local.cloned().unwrap_or_default();
	if !local_state.exists {
		return Ok(ApplyOutcome::IgnoredIdempotent);
	}

	let winner = lww_remote_wins(
		local_state.lamport,
		local_state.mtime_ms,
		&local_state.origin_fp,
		delete_lamport,
		delete_mtime_ms,
		delete_origin_fp,
	);
	if !winner {
		return Ok(ApplyOutcome::IgnoredLocalWins);
	}

	// Remote tombstone wins. If local content diverges from the last
	// hash recorded in `local`, save it as conflict before removing.
	let conflict_path = save_conflict_copy(&dest, peer_short, timestamp_compact)?;
	Ok(ApplyOutcome::AppliedWithConflict { conflict_path })
}

/// Applies an inbound directory create. Empty directories are
/// first-class entities in the manifest so a vault structure like
/// `Projects/empty-dir/` survives the round trip. Idempotent — when
/// the destination already exists as a directory, returns
/// `IgnoredIdempotent`. When it exists as a file, returns an error so
/// we don't silently swap kinds.
pub fn apply_inbound_directory_create(
	share_root: &Path,
	path_rel: &str,
) -> Result<ApplyOutcome, ApplyError> {
	let dest = safe_resolve_under_share(share_root, path_rel)?;
	if dest.exists() {
		if dest.is_dir() {
			return Ok(ApplyOutcome::IgnoredIdempotent);
		}
		return Err(ApplyError::InvalidPath(format!(
			"{path_rel} exists as a file; refusing to replace with a directory"
		)));
	}
	std::fs::create_dir_all(&dest).map_err(|e| ApplyError::Io(e.to_string()))?;
	Ok(ApplyOutcome::Applied)
}

/// Applies an inbound directory delete. Only removes the directory
/// when it is empty — non-empty directories indicate the peer's
/// manifest got out of sync with local state (orphan files) and we
/// must not destroy unsynced content. Idempotent for missing dirs.
pub fn apply_inbound_directory_delete(
	share_root: &Path,
	path_rel: &str,
) -> Result<ApplyOutcome, ApplyError> {
	let dest = safe_resolve_under_share(share_root, path_rel)?;
	if !dest.exists() {
		return Ok(ApplyOutcome::IgnoredIdempotent);
	}
	if !dest.is_dir() {
		return Err(ApplyError::InvalidPath(format!(
			"{path_rel} exists but is not a directory"
		)));
	}
	// remove_dir fails if the directory is non-empty — that is the
	// safety net we want.
	match std::fs::remove_dir(&dest) {
		Ok(()) => Ok(ApplyOutcome::Applied),
		Err(e) if e.kind() == std::io::ErrorKind::DirectoryNotEmpty => {
			Ok(ApplyOutcome::IgnoredLocalWins)
		}
		Err(e) => Err(ApplyError::Io(e.to_string())),
	}
}

/// Scans `share_root` recursively and returns every empty directory's
/// relative path. Used when building the local manifest so we don't
/// rely on the file walker (which usually only yields files) to
/// surface empty directories.
///
/// `should_include` is the gate the share rules apply (hard-deny + user
/// excludes). Directories whose relative path fails the predicate are
/// skipped along with their entire subtree.
pub fn collect_empty_directories<F>(
	share_root: &Path,
	should_include: F,
) -> Result<Vec<String>, ApplyError>
where
	F: Fn(&str) -> bool,
{
	let mut out = Vec::new();
	let mut stack: Vec<PathBuf> = vec![share_root.to_path_buf()];
	while let Some(dir) = stack.pop() {
		let rel = dir
			.strip_prefix(share_root)
			.ok()
			.map(|p| p.to_string_lossy().to_string())
			.unwrap_or_default();
		// Skip the share root itself from the manifest (it's implicit).
		let is_root = rel.is_empty();
		if !is_root && !should_include(&rel) {
			continue;
		}
		let entries: Vec<_> = match std::fs::read_dir(&dir) {
			Ok(r) => r.flatten().collect(),
			Err(_) => continue,
		};
		let mut has_visible_child = false;
		for entry in &entries {
			let path = entry.path();
			let metadata = match entry.metadata() {
				Ok(m) => m,
				Err(_) => continue,
			};
			let child_rel = path
				.strip_prefix(share_root)
				.ok()
				.map(|p| p.to_string_lossy().to_string())
				.unwrap_or_default();
			if !should_include(&child_rel) {
				continue;
			}
			if metadata.is_dir() {
				stack.push(path);
				has_visible_child = true; // dir counts as content
			} else if metadata.is_file() {
				has_visible_child = true;
			}
		}
		if !is_root && !has_visible_child {
			// Replace platform separator so manifest entries are
			// always `/`-separated regardless of OS.
			out.push(rel.replace(std::path::MAIN_SEPARATOR, "/"));
		}
	}
	Ok(out)
}

/// Local file state passed in alongside the inbound message. Mirrors
/// the relevant subset of [`crate::sync::state_db::FileStateRow`].
/// `exists = false` short-circuits the LWW path.
#[derive(Debug, Clone, Default, PartialEq, Eq)]
pub struct InboundLocalState {
	pub exists: bool,
	pub hash: String,
	pub mtime_ms: i64,
	pub lamport: u64,
	pub origin_fp: String,
}

fn lww_remote_wins(
	local_lamport: u64,
	local_mtime_ms: i64,
	local_origin_fp: &str,
	remote_lamport: u64,
	remote_mtime_ms: i64,
	remote_origin_fp: &str,
) -> bool {
	match (remote_lamport, remote_mtime_ms).cmp(&(local_lamport, local_mtime_ms)) {
		std::cmp::Ordering::Greater => true,
		std::cmp::Ordering::Less => false,
		std::cmp::Ordering::Equal => remote_origin_fp > local_origin_fp,
	}
}

// ============================================================================
// Manifest paginated (slice the entries list into bounded chunks).
// ============================================================================

/// Page slicing for `AppMsg::Manifest`. Returns the manifest split
/// into chunks of up to `chunk_size` entries; the last chunk carries
/// `is_last_page = true` so the receiver knows when to stop waiting.
pub fn paginate_manifest(
	entries: Vec<ManifestEntry>,
	chunk_size: usize,
) -> Vec<(Vec<ManifestEntry>, bool)> {
	if entries.is_empty() {
		return vec![(vec![], true)];
	}
	let chunk_size = chunk_size.max(1);
	let mut out = Vec::new();
	let total = entries.len();
	let mut iter = entries.into_iter();
	let mut emitted = 0;
	while emitted < total {
		let take = chunk_size.min(total - emitted);
		let mut chunk = Vec::with_capacity(take);
		for _ in 0..take {
			chunk.push(iter.next().unwrap());
		}
		emitted += take;
		let is_last = emitted == total;
		out.push((chunk, is_last));
	}
	out
}
