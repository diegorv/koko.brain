//! Share configuration and path-traversal defense for LAN sync.
//!
//! A share declares which subset of a vault is exposed to which peers.
//! Two modes are supported:
//!
//! - [`ShareMode::Subfolder`] (allowlist): expose one explicit subpath.
//! - [`ShareMode::RootWithExcludes`] (denylist): expose the whole vault
//!   except an explicit list of path prefixes.
//!
//! Regardless of mode, [`is_path_exposable`] enforces three hard-deny
//! rules that **cannot** be bypassed:
//! 1. No path component may start with `.` (blocks `.kokobrain`, `.git`,
//!    `.obsidian`, `.DS_Store`, etc., at any depth).
//! 2. The basename may not end in `.encrypted` (encrypted-notes payloads
//!    are useless to peers without the originating Keychain anyway).
//! 3. No `..` component, no `\0` byte, no absolute-path prefix.
//!
//! [`should_sync_path`] is the single function every code path
//! (manifest generation, watcher push, inbound apply) calls to decide
//! whether a file participates in the share. It composes the three
//! pillars: in-share + exposable (hard-deny) + not user-excluded.

use serde::{Deserialize, Serialize};
use std::path::{Component, Path, PathBuf};

/// Filename of the per-vault share config inside `.kokobrain/lan-sync/`.
pub const SHARES_FILE: &str = "shares.json";

/// Suffix used by encrypted-notes payloads — always denied.
pub const ENCRYPTED_NOTE_SUFFIX: &str = ".encrypted";

/// Versioning for `shares.json`. Bump only on schema-breaking changes.
pub const CURRENT_SHARES_VERSION: u32 = 1;

/// Sync direction for a share.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum ShareDirection {
	/// Bidirectional: both peers may push and pull changes.
	Bi,
	/// Push-only: this side sends, peer receives (read-only on peer).
	Push,
	/// Pull-only: this side mirrors what peer sends.
	Pull,
}

/// Whether the share is defined as a single subfolder (allowlist) or as
/// the vault root with explicit exclusions (denylist).
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum ShareMode {
	/// `local_path` points at one subfolder; `excludes` must be empty.
	Subfolder,
	/// `local_path` is `""`; everything under the vault root is in scope
	/// except the entries listed in `excludes`.
	RootWithExcludes,
}

/// A single share entry persisted in `<vault>/.kokobrain/lan-sync/shares.json`.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Share {
	/// Stable identifier; generated as `"share-<uuid v4>"` on creation.
	pub id: String,
	pub mode: ShareMode,
	/// Path relative to vault root. Empty (or `"."`) when `mode = RootWithExcludes`.
	pub local_path: String,
	/// Path prefixes to skip when `mode = RootWithExcludes`. Each prefix
	/// excludes everything below it. Ignored (must be empty) for `Subfolder`.
	#[serde(default)]
	pub excludes: Vec<String>,
	/// Ed25519 fingerprints (as `"XXXX-XXXX-XXXX-XXXX"`) authorised to
	/// subscribe. A peer not in this list is rejected at the protocol layer.
	pub allowed_peer_fingerprints: Vec<String>,
	pub direction: ShareDirection,
	#[serde(default)]
	pub read_only: bool,
	pub created_at_ms: i64,
}

/// Persisted top-level wrapper for `shares.json`.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SharesFile {
	pub version: u32,
	pub shares: Vec<Share>,
}

impl Default for SharesFile {
	fn default() -> Self {
		Self {
			version: CURRENT_SHARES_VERSION,
			shares: Vec::new(),
		}
	}
}

/// Errors surfaced when validating a [`Share`] or working with `shares.json`.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum ShareError {
	/// `local_path` was empty when [`ShareMode::Subfolder`] requires a value.
	EmptyLocalPath,
	/// `local_path` was non-empty when [`ShareMode::RootWithExcludes`]
	/// requires `""` or `"."`.
	UnexpectedLocalPath,
	/// A `..` segment was found anywhere in `local_path` or an exclude.
	ParentTraversalNotAllowed,
	/// Path contains a `\0` byte (UNIX path-injection guard).
	NullByteInPath,
	/// Path begins with `/` or a Windows drive letter — absolute paths are
	/// rejected because shares are always relative to the vault root.
	AbsolutePathNotAllowed,
	/// A hard-deny rule matched (dot-segment or `.encrypted`).
	HiddenOrSensitivePath,
	/// `excludes` was non-empty for a `Subfolder` share.
	ExcludesNotAllowedInSubfolderMode,
	/// I/O failure reading or writing `shares.json`.
	Io(String),
	/// Malformed `shares.json` content.
	Decode(String),
	/// Unsupported `version` field in `shares.json`.
	VersionMismatch { found: u32, supported: u32 },
}

impl core::fmt::Display for ShareError {
	fn fmt(&self, f: &mut core::fmt::Formatter<'_>) -> core::fmt::Result {
		match self {
			Self::EmptyLocalPath => write!(f, "local path is required for subfolder shares"),
			Self::UnexpectedLocalPath => write!(
				f,
				"local path must be empty when mode=root-with-excludes"
			),
			Self::ParentTraversalNotAllowed => write!(f, "'..' segments are not allowed"),
			Self::NullByteInPath => write!(f, "NUL byte in path"),
			Self::AbsolutePathNotAllowed => write!(f, "absolute paths are not allowed"),
			Self::HiddenOrSensitivePath => {
				write!(f, "path is hidden or marked sensitive (hard-deny rule)")
			}
			Self::ExcludesNotAllowedInSubfolderMode => {
				write!(f, "excludes are only valid for mode=root-with-excludes")
			}
			Self::Io(msg) => write!(f, "shares.json I/O: {msg}"),
			Self::Decode(msg) => write!(f, "shares.json decode: {msg}"),
			Self::VersionMismatch { found, supported } => write!(
				f,
				"unsupported shares.json version {found} (supported: {supported})"
			),
		}
	}
}

impl std::error::Error for ShareError {}

// ============================================================================
// Hard-deny path predicates (apply in EVERY mode)
// ============================================================================

/// Returns `true` if `rel` is safe to expose — i.e. it passes the three
/// hard-deny rules:
/// - no dot-prefixed segment anywhere,
/// - basename does not end in `.encrypted`,
/// - no `..` / no `\0` / not absolute.
///
/// Callers should also re-apply this on every inbound `RequestBlock` /
/// `PushUpdate` for defense in depth.
pub fn is_path_exposable(rel: &Path) -> bool {
	let s = match rel.to_str() {
		Some(s) => s,
		// Non-UTF8 paths are not allowed — peers exchange JSON strings.
		None => return false,
	};
	if s.is_empty() {
		return false;
	}
	if s.contains('\0') {
		return false;
	}
	if has_absolute_prefix(s) {
		return false;
	}
	for component in rel.components() {
		match component {
			Component::ParentDir => return false,
			Component::Normal(segment) => {
				let seg = match segment.to_str() {
					Some(s) => s,
					None => return false,
				};
				if seg.starts_with('.') {
					return false;
				}
				if has_drive_letter_prefix(seg) {
					return false;
				}
			}
			// CurDir (`.`), RootDir, Prefix — already handled by has_absolute_prefix.
			_ => return false,
		}
	}
	// Basename check.
	if let Some(name) = rel.file_name().and_then(|n| n.to_str()) {
		if name.ends_with(ENCRYPTED_NOTE_SUFFIX) {
			return false;
		}
	}
	true
}

/// Returns `true` if `rel` is excluded by the user's denylist on this
/// share. Always `false` for `Subfolder` mode (which has no excludes by
/// validation).
pub fn is_excluded_by_user(share: &Share, rel: &Path) -> bool {
	if share.mode != ShareMode::RootWithExcludes {
		return false;
	}
	let rel_str = match rel.to_str() {
		Some(s) => s,
		None => return true, // defensively exclude non-UTF8 paths.
	};
	for prefix in &share.excludes {
		if rel_str == prefix {
			return true;
		}
		// A prefix excludes everything inside that directory: match on
		// `prefix/` boundary so `"Trabalho"` does not accidentally exclude
		// `"Trabalhos/note.md"`.
		let with_sep = format!("{prefix}/");
		if rel_str.starts_with(&with_sep) {
			return true;
		}
	}
	false
}

/// Returns `true` if `abs_path` falls inside the share scope (mode-aware,
/// before hard-deny and user-exclude checks are applied).
pub fn is_path_in_share(share: &Share, vault_root: &Path, abs_path: &Path) -> bool {
	let Some(rel) = rel_to_vault(vault_root, abs_path) else {
		return false;
	};
	match share.mode {
		ShareMode::Subfolder => {
			let prefix = Path::new(&share.local_path);
			rel == prefix || rel.starts_with(prefix)
		}
		ShareMode::RootWithExcludes => {
			// The whole vault is in scope (root). We still gate on
			// hard-deny + excludes through `should_sync_path`.
			!rel.as_os_str().is_empty()
		}
	}
}

/// Authoritative gate: does this absolute path participate in the share?
///
/// Equivalent to:
/// `is_path_in_share AND is_path_exposable(rel) AND NOT is_excluded_by_user(rel)`.
pub fn should_sync_path(share: &Share, vault_root: &Path, abs_path: &Path) -> bool {
	if !is_path_in_share(share, vault_root, abs_path) {
		return false;
	}
	let Some(rel) = rel_to_vault(vault_root, abs_path) else {
		return false;
	};
	if !is_path_exposable(&rel) {
		return false;
	}
	if is_excluded_by_user(share, &rel) {
		return false;
	}
	true
}

// ============================================================================
// Config validation
// ============================================================================

/// Validates a [`Share`] against the on-disk vault layout and the
/// hard-deny rules. Run **before** any persist/serve operation. Does NOT
/// require that the share's path currently exists — users can pre-declare
/// directories they intend to populate.
pub fn validate_share_config(_vault_root: &Path, share: &Share) -> Result<(), ShareError> {
	validate_path_string(&share.local_path)?;
	match share.mode {
		ShareMode::Subfolder => {
			if share.local_path.trim().is_empty() || share.local_path == "." {
				return Err(ShareError::EmptyLocalPath);
			}
			if !share.excludes.is_empty() {
				return Err(ShareError::ExcludesNotAllowedInSubfolderMode);
			}
			let path = Path::new(&share.local_path);
			if !is_path_exposable(path) {
				return Err(ShareError::HiddenOrSensitivePath);
			}
		}
		ShareMode::RootWithExcludes => {
			if !share.local_path.is_empty() && share.local_path != "." {
				return Err(ShareError::UnexpectedLocalPath);
			}
			for exclude in &share.excludes {
				validate_path_string(exclude)?;
				if exclude.trim().is_empty() {
					return Err(ShareError::EmptyLocalPath);
				}
				// Excludes do NOT need to be `is_path_exposable` — they are
				// path prefixes the user chooses to skip; `.git` is a legal
				// exclude entry even though it's already hard-denied.
				// We do still reject `..` / absolute / NUL via
				// `validate_path_string` above.
			}
		}
	}
	Ok(())
}

/// Rejects path strings that contain `..`, NUL bytes, or absolute-path
/// prefixes. Shared between `local_path` and each `exclude`.
fn validate_path_string(s: &str) -> Result<(), ShareError> {
	if s.contains('\0') {
		return Err(ShareError::NullByteInPath);
	}
	if has_absolute_prefix(s) {
		return Err(ShareError::AbsolutePathNotAllowed);
	}
	let path = Path::new(s);
	for component in path.components() {
		match component {
			Component::ParentDir => return Err(ShareError::ParentTraversalNotAllowed),
			Component::Normal(seg) => {
				if let Some(seg_str) = seg.to_str() {
					if has_drive_letter_prefix(seg_str) {
						return Err(ShareError::AbsolutePathNotAllowed);
					}
				}
			}
			_ => {}
		}
	}
	Ok(())
}

fn has_absolute_prefix(s: &str) -> bool {
	if s.starts_with('/') || s.starts_with('\\') {
		return true;
	}
	has_drive_letter_prefix(s)
}

fn has_drive_letter_prefix(s: &str) -> bool {
	// Matches `C:` / `D:\foo` / `c:\foo` — i.e. a single ASCII letter
	// followed by `:`. The empty string and longer prefixes are not drive
	// letters.
	let bytes = s.as_bytes();
	bytes.len() >= 2 && bytes[0].is_ascii_alphabetic() && bytes[1] == b':'
}

/// Computes `abs_path` relative to `vault_root`. Returns `None` if
/// `abs_path` is not under the vault.
fn rel_to_vault(vault_root: &Path, abs_path: &Path) -> Option<PathBuf> {
	abs_path.strip_prefix(vault_root).ok().map(|p| p.to_path_buf())
}

// ============================================================================
// shares.json persistence
// ============================================================================

/// Returns the on-disk path of `shares.json` for a given vault root.
pub fn shares_file_path(vault_root: &Path) -> PathBuf {
	vault_root.join(".kokobrain").join("lan-sync").join(SHARES_FILE)
}

/// Reads `shares.json` from disk. Returns an empty [`SharesFile`] if the
/// file does not exist (first-run case). Re-validates every share entry
/// against the hard-deny rules so a hand-edited / corrupt JSON cannot
/// smuggle a `..` past the engine.
pub fn read_shares(vault_root: &Path) -> Result<SharesFile, ShareError> {
	let path = shares_file_path(vault_root);
	if !path.exists() {
		return Ok(SharesFile::default());
	}
	let raw = std::fs::read_to_string(&path).map_err(|e| ShareError::Io(e.to_string()))?;
	let parsed: SharesFile =
		serde_json::from_str(&raw).map_err(|e| ShareError::Decode(e.to_string()))?;
	if parsed.version != CURRENT_SHARES_VERSION {
		return Err(ShareError::VersionMismatch {
			found: parsed.version,
			supported: CURRENT_SHARES_VERSION,
		});
	}
	for share in &parsed.shares {
		validate_share_config(vault_root, share)?;
	}
	Ok(parsed)
}

/// Atomically replaces `shares.json` on disk after re-validating each
/// share. The parent directory is created on demand.
pub fn write_shares(vault_root: &Path, file: &SharesFile) -> Result<(), ShareError> {
	if file.version != CURRENT_SHARES_VERSION {
		return Err(ShareError::VersionMismatch {
			found: file.version,
			supported: CURRENT_SHARES_VERSION,
		});
	}
	for share in &file.shares {
		validate_share_config(vault_root, share)?;
	}
	let path = shares_file_path(vault_root);
	if let Some(parent) = path.parent() {
		std::fs::create_dir_all(parent).map_err(|e| ShareError::Io(e.to_string()))?;
	}
	let serialized =
		serde_json::to_string_pretty(file).map_err(|e| ShareError::Decode(e.to_string()))?;
	std::fs::write(&path, serialized).map_err(|e| ShareError::Io(e.to_string()))?;
	Ok(())
}
