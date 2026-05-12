//! One-shot folder push from initiator to responder, over a Noise XX session.
//!
//! Wire protocol (control messages are JSON inside Noise transport frames;
//! file payload bytes ride as raw plaintext inside their own Noise frames):
//! 1. Initiator sends [`WireMessage::Manifest`] with the relative target
//!    path and every [`FileEntry`] to be transferred. Each entry's
//!    `rel_path` is relative to the source folder (so the receiver writes
//!    at `<vault>/<target_rel_path>/<rel_path>`).
//! 2. Responder replies with [`WireMessage::ManifestAck`]. `accepted=false`
//!    aborts the session before any payload is sent.
//! 3. For each [`FileEntry`] the initiator then sends, in order:
//!      [`WireMessage::FileStart`] (JSON),
//!      one or more raw byte frames each at most [`PUSH_FILE_CHUNK_BYTES`]
//!      bytes long (sent as plain `session.send(&bytes)` calls — NOT JSON),
//!      [`WireMessage::FileEnd`] (JSON).
//! 4. Initiator sends [`WireMessage::PushDone`].
//! 5. Responder sends [`WireMessage::PushAck`] with `files_received`.
//!
//! Apply is atomic on the receive side: every file is first written into
//! `<vault>/.kokobrain/incoming/<uuid>/<rel_path>` and renamed into place
//! only after [`WireMessage::PushDone`] arrives. On ANY error during
//! receive — path traversal attempt, I/O failure, transport error,
//! decoding error — the entire incoming subdir is deleted and the
//! function returns the error without leaving partial files visible to
//! the user.
//!
//! Path traversal defense applies three layers BEFORE any file handle is
//! opened on the receive side (see [`sanitize_rel_path`]):
//!   1. Reject any `rel_path` that is absolute (starts with `/` or `\`,
//!      or begins with a Windows drive letter), or that contains a
//!      segment equal to `..` (including back-slash separators).
//!   2. Resolve to an absolute path inside the prepared incoming root
//!      and call [`std::path::Path::canonicalize`] on its parent so we
//!      have a real, symlink-resolved location.
//!   3. Assert the canonical parent `starts_with` the canonical
//!      incoming root. Any violation returns
//!      [`PushError::PathTraversal`] — the receive loop then unwinds,
//!      removing the incoming dir.

use std::fmt;
use std::io;
use std::path::{Path, PathBuf};

use serde::{Deserialize, Serialize};
use tokio::io::{AsyncRead, AsyncWrite};
use uuid::Uuid;

use crate::sync::transport::{Session, TransportError};

/// Maximum number of payload bytes carried in a single raw chunk frame.
///
/// Each chunk is sent as one Noise transport message. The Noise XX
/// implementation we use caps a single plaintext at 65519 bytes
/// (`u16::MAX - 16` for the AES-GCM tag), so we stay safely under that
/// limit with a 60 KiB chunk. The constant is named with `BYTES` to
/// match the codebase convention (`MAX_FRAME_BYTES`, etc).
pub const PUSH_FILE_CHUNK_BYTES: usize = 60 * 1024;

/// Default name of the per-vault staging directory used during receive.
///
/// Each push creates a UUID-named subdir inside this directory so two
/// pushes in flight against the same vault cannot collide.
pub const INCOMING_DIR: &str = ".kokobrain/incoming";

/// Trigger an `on_progress` callback every time at least this many bytes
/// have moved since the last report. Combined with the per-file trigger
/// below, this keeps the UI responsive on both lots-of-small-files and
/// few-large-files workloads.
pub const PROGRESS_INTERVAL_BYTES: u64 = 256 * 1024;

/// Trigger an `on_progress` callback whenever this many additional files
/// have completed since the last report.
pub const PROGRESS_INTERVAL_FILES: u64 = 4;

/// One file in a push plan / manifest.
///
/// `rel_path` is always a forward-slash-separated path RELATIVE to the
/// source folder root (never absolute, never containing `..`). `size`
/// is the byte count read at planning time; the receive side trusts the
/// announced size only for progress reporting and the chunk loop count.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct FileEntry {
	/// Forward-slash path relative to the source folder. Sanitised on
	/// the receive side before any file handle is opened.
	pub rel_path: String,
	/// Byte count of the source file at planning time. Used to drive
	/// the per-file chunk loop and progress reporting.
	pub size: u64,
}

/// Outcome of [`plan_push`]: the ordered list of files to transfer plus
/// the total byte budget. Both fields are public so callers can surface
/// totals before initiating the push (e.g. as a "10 files, 4.2 MiB"
/// confirmation in the UI).
#[derive(Debug, Clone, PartialEq)]
pub struct PushPlan {
	/// Files to transfer, in deterministic order (depth-first by name).
	pub files: Vec<FileEntry>,
	/// Sum of `files[*].size`. Driven by what `metadata().len()`
	/// reported during planning.
	pub total_bytes: u64,
}

/// All errors that can surface from the push engine.
#[derive(Debug)]
pub enum PushError {
	/// Underlying filesystem I/O failure (open, read, write, rename, ...).
	Io(io::Error),
	/// Transport-layer failure — Noise error or socket I/O.
	Transport(TransportError),
	/// Failure to (de)serialise a [`WireMessage`].
	Serde(serde_json::Error),
	/// Responder refused the push during the manifest ack phase. The
	/// optional `reason` is whatever the responder included.
	Rejected {
		/// Human-readable reason supplied by the responder.
		reason: String,
	},
	/// Sender announced a path that fails [`sanitize_rel_path`]. The
	/// receive side aborts before opening any file.
	PathTraversal {
		/// The raw `rel_path` that triggered the rejection.
		rel_path: String,
	},
	/// Caller asked to plan a push from a path that does not exist or
	/// is not a directory.
	InvalidSource {
		/// Absolute path the caller passed in.
		path: PathBuf,
		/// Why the path was rejected (missing, not a directory, ...).
		reason: String,
	},
	/// The peer sent an unexpected control message at this protocol
	/// step. Includes the offending message tag for debugging.
	Protocol {
		/// Name of the message that was actually received.
		got: String,
		/// Name of the message that was expected.
		expected: String,
	},
}

impl fmt::Display for PushError {
	fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
		match self {
			PushError::Io(e) => write!(f, "i/o error: {e}"),
			PushError::Transport(e) => write!(f, "transport error: {e}"),
			PushError::Serde(e) => write!(f, "wire decode error: {e}"),
			PushError::Rejected { reason } => write!(f, "push rejected: {reason}"),
			PushError::PathTraversal { rel_path } => {
				write!(f, "path traversal blocked: {rel_path:?}")
			}
			PushError::InvalidSource { path, reason } => {
				write!(f, "invalid source {}: {reason}", path.display())
			}
			PushError::Protocol { got, expected } => {
				write!(f, "protocol error: expected {expected}, got {got}")
			}
		}
	}
}

impl std::error::Error for PushError {
	fn source(&self) -> Option<&(dyn std::error::Error + 'static)> {
		match self {
			PushError::Io(e) => Some(e),
			PushError::Transport(e) => Some(e),
			PushError::Serde(e) => Some(e),
			_ => None,
		}
	}
}

impl From<io::Error> for PushError {
	fn from(value: io::Error) -> Self {
		PushError::Io(value)
	}
}

impl From<TransportError> for PushError {
	fn from(value: TransportError) -> Self {
		PushError::Transport(value)
	}
}

impl From<serde_json::Error> for PushError {
	fn from(value: serde_json::Error) -> Self {
		PushError::Serde(value)
	}
}

/// Internal tagged enum carrying every control message on the wire.
///
/// Chunk payload bytes do NOT go through this enum — they ride as raw
/// `session.send(&bytes)` frames between [`WireMessage::FileStart`] and
/// [`WireMessage::FileEnd`]. Keeping payload off JSON avoids the >4x
/// inflation `Vec<u8>` suffers under default `serde_json` encoding.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(tag = "type")]
enum WireMessage {
	/// The single manifest sent at the very start of a push.
	Manifest {
		/// Where on the receiver's vault root to land the transferred
		/// files. May be empty (transfer into vault root directly).
		target_rel_path: String,
		/// Files about to be sent, in the order they will arrive.
		files: Vec<FileEntry>,
	},
	/// Receiver's reply to the manifest. `accepted=false` aborts.
	ManifestAck {
		/// Whether the receiver accepted the manifest.
		accepted: bool,
		/// Optional human-readable explanation when rejected.
		#[serde(skip_serializing_if = "Option::is_none")]
		reason: Option<String>,
	},
	/// Header for one file. Followed by `ceil(size / PUSH_FILE_CHUNK_BYTES)`
	/// raw chunk frames and a [`WireMessage::FileEnd`].
	FileStart {
		/// Relative path inside the manifest's target folder.
		rel_path: String,
		/// Total byte count for this file.
		size: u64,
	},
	/// Trailer marking the end of one file's chunk stream.
	FileEnd,
	/// Terminator sent by the initiator after the last `FileEnd`.
	PushDone,
	/// Final ack from the responder summarising the receive.
	PushAck {
		/// Number of files the responder actually wrote to disk.
		files_received: u64,
	},
}

// =============================================================================
// Planning
// =============================================================================

/// Walks `source_abs_path` recursively and returns the deterministic
/// transfer plan.
///
/// `source_abs_path` MUST be an existing directory. Returned `rel_path`s
/// are forward-slash separated, never empty, never starting with `/`.
///
/// Exclusion rules (applied at every directory level):
/// - Files / directories whose name starts with `.` (hidden).
/// - Directories named `.git`, `.kokobrain`, or `node_modules`.
/// - Anything that is a symlink (do not follow, do not include).
///
/// Files are ordered alphabetically per directory; directories are
/// recursed into before continuing with the next sibling, giving a
/// stable depth-first order that matches what the receiver will write.
pub fn plan_push(source_abs_path: &Path) -> Result<PushPlan, PushError> {
	let metadata = std::fs::symlink_metadata(source_abs_path).map_err(|e| {
		PushError::InvalidSource {
			path: source_abs_path.to_path_buf(),
			reason: format!("stat failed: {e}"),
		}
	})?;
	if !metadata.is_dir() {
		return Err(PushError::InvalidSource {
			path: source_abs_path.to_path_buf(),
			reason: "not a directory".into(),
		});
	}

	let mut files: Vec<FileEntry> = Vec::new();
	collect_files_recursive(source_abs_path, "", &mut files)?;

	files.sort_by(|a, b| a.rel_path.cmp(&b.rel_path));
	let total_bytes = files.iter().map(|f| f.size).sum();

	Ok(PushPlan { files, total_bytes })
}

/// Returns `true` if a single path component (the file or directory
/// name only, never a multi-segment string) should be skipped by
/// [`plan_push`].
///
/// Standalone for unit testability: the exclusion ruleset can be
/// asserted without spinning up real filesystem fixtures.
pub fn should_skip_component(name: &str) -> bool {
	if name.is_empty() || name == "." || name == ".." {
		return true;
	}
	if name.starts_with('.') {
		return true;
	}
	matches!(name, "node_modules")
}

/// Depth-first directory walker driven by [`plan_push`].
///
/// Skips entries that fail [`should_skip_component`] and any entry
/// whose `symlink_metadata().file_type().is_symlink()` is true.
fn collect_files_recursive(
	abs_dir: &Path,
	rel_prefix: &str,
	out: &mut Vec<FileEntry>,
) -> Result<(), PushError> {
	// Materialise + sort entries up front so the walk is deterministic
	// regardless of the OS's `read_dir` order.
	let mut entries: Vec<(String, PathBuf)> = std::fs::read_dir(abs_dir)?
		.filter_map(|res| res.ok())
		.filter_map(|entry| {
			let name = entry.file_name().to_string_lossy().to_string();
			Some((name, entry.path()))
		})
		.collect();
	entries.sort_by(|a, b| a.0.cmp(&b.0));

	for (name, path) in entries {
		if should_skip_component(&name) {
			continue;
		}
		let meta = match std::fs::symlink_metadata(&path) {
			Ok(m) => m,
			Err(_) => continue,
		};
		if meta.file_type().is_symlink() {
			continue;
		}
		let rel = if rel_prefix.is_empty() {
			name.clone()
		} else {
			format!("{rel_prefix}/{name}")
		};
		if meta.is_dir() {
			collect_files_recursive(&path, &rel, out)?;
		} else if meta.is_file() {
			out.push(FileEntry { rel_path: rel, size: meta.len() });
		}
		// Other kinds (sockets, fifos, ...) are silently skipped.
	}
	Ok(())
}

// =============================================================================
// Path traversal defense (standalone for unit tests)
// =============================================================================

/// Three-layer sanitiser that maps a peer-supplied `rel_path` into a
/// concrete absolute path under a trusted root, rejecting any traversal
/// attempt.
///
/// `vault_root` must be an already-existing absolute path; the function
/// canonicalises it once for the `starts_with` comparison. `target_rel_path`
/// is the manifest's per-push target (also peer-supplied, also sanitised).
/// `rel_path` is the per-file relative path inside the target.
///
/// Layers, in order:
/// 1. Reject `rel_path` (and each of its segments) if empty, equal to
///    `..`, or absolute (`/` or `\` prefix, or a Windows-style drive
///    letter). Same check applies independently to `target_rel_path`.
/// 2. Join `vault_root / target_rel_path / rel_path`. Canonicalise the
///    PARENT of that join (so we can produce a path for a file that
///    doesn't exist yet) plus the trusted `vault_root`.
/// 3. Assert the canonical parent `starts_with` the canonical vault
///    root. Any drift (symlinked escape, `..` smuggled through a name
///    component our layer-1 scan missed) returns
///    [`PushError::PathTraversal`].
pub fn sanitize_rel_path(
	vault_root: &Path,
	target_rel_path: &str,
	rel_path: &str,
) -> Result<PathBuf, PushError> {
	// Layer 1: lexical rejection on the components.
	check_relative_segments(target_rel_path, target_rel_path)?;
	check_relative_segments(rel_path, rel_path)?;

	// Build the prospective absolute path.
	let mut joined = vault_root.to_path_buf();
	if !target_rel_path.is_empty() {
		for seg in split_segments(target_rel_path) {
			joined.push(seg);
		}
	}
	for seg in split_segments(rel_path) {
		joined.push(seg);
	}

	// Layer 2 + 3: canonicalise the parent and check containment.
	let canonical_root = vault_root
		.canonicalize()
		.map_err(|e| PushError::Io(io::Error::new(e.kind(), format!("canonicalize vault: {e}"))))?;

	// The destination file may not exist yet (that's the whole point),
	// so canonicalise the parent directory. The parent is either the
	// canonical root itself (top-level file) or an ancestor we will
	// create in `prepare_dirs`. To avoid a TOCTOU on a not-yet-created
	// ancestor, canonicalise the deepest ancestor that DOES exist.
	let deepest_existing = deepest_existing_ancestor(&joined);
	let canonical_parent = deepest_existing.canonicalize().map_err(|e| {
		PushError::Io(io::Error::new(
			e.kind(),
			format!(
				"canonicalize ancestor {}: {e}",
				deepest_existing.display()
			),
		))
	})?;
	if !canonical_parent.starts_with(&canonical_root) {
		return Err(PushError::PathTraversal {
			rel_path: rel_path.to_string(),
		});
	}

	Ok(joined)
}

/// Walks ancestors of `p` and returns the first one that exists on
/// disk. `p` itself is checked first; falls back to the filesystem
/// root in the worst case (a path on a drive that doesn't exist at
/// all, which would already have failed the vault canonicalise).
fn deepest_existing_ancestor(p: &Path) -> PathBuf {
	let mut current: &Path = p;
	loop {
		if current.exists() {
			return current.to_path_buf();
		}
		match current.parent() {
			Some(parent) => current = parent,
			None => return current.to_path_buf(),
		}
	}
}

/// Returns segments split by either `/` or `\`. Empty segments
/// (from `a//b`, `\\a\\b`, ...) are filtered out so they don't
/// turn into spurious `Path::push("")` no-ops or mask traversal.
fn split_segments(s: &str) -> impl Iterator<Item = &str> {
	s.split(|c: char| c == '/' || c == '\\')
		.filter(|seg| !seg.is_empty())
}

/// Layer-1 lexical check shared by `target_rel_path` and `rel_path`.
///
/// `display_for_error` is the original string returned in
/// [`PushError::PathTraversal`] so the receiver-side logs identify the
/// offending input verbatim.
fn check_relative_segments(s: &str, display_for_error: &str) -> Result<(), PushError> {
	// Reject absolute paths.
	if let Some(first) = s.chars().next() {
		if first == '/' || first == '\\' {
			return Err(PushError::PathTraversal {
				rel_path: display_for_error.to_string(),
			});
		}
	}
	// Windows-style drive letter prefix, e.g. "C:\\evil".
	if s.len() >= 2 {
		let bytes = s.as_bytes();
		if bytes[1] == b':' && bytes[0].is_ascii_alphabetic() {
			return Err(PushError::PathTraversal {
				rel_path: display_for_error.to_string(),
			});
		}
	}
	for seg in s.split(|c: char| c == '/' || c == '\\') {
		if seg == ".." {
			return Err(PushError::PathTraversal {
				rel_path: display_for_error.to_string(),
			});
		}
		// Allow empty segments; `split_segments` filters them, and
		// they're equivalent to a path separator collapse.
	}
	Ok(())
}

// =============================================================================
// Send-side driver
// =============================================================================

/// Send-side. Drives the manifest + file-chunk protocol over `session`.
///
/// `source_abs_path` is the directory the plan was built against;
/// `target_rel_path` is what the receiver will prepend to every file.
/// `on_progress` is invoked at least every [`PROGRESS_INTERVAL_BYTES`]
/// of payload throughput AND at least every [`PROGRESS_INTERVAL_FILES`]
/// completed files. A final call is always made just before the
/// terminating [`WireMessage::PushDone`].
///
/// On a per-file I/O error mid-stream the session is left dangling —
/// callers should drop it. The function returns the error; the
/// receiver-side observes a closed stream and aborts cleanly.
pub async fn send_folder<S>(
	session: &mut Session<S>,
	source_abs_path: &Path,
	target_rel_path: &str,
	plan: &PushPlan,
	mut on_progress: impl FnMut(u64, u64),
) -> Result<u64, PushError>
where
	S: AsyncRead + AsyncWrite + Unpin + Send,
{
	// 1. Manifest.
	send_message(
		session,
		&WireMessage::Manifest {
			target_rel_path: target_rel_path.to_string(),
			files: plan.files.clone(),
		},
	)
	.await?;

	// 2. Manifest ack.
	match recv_message(session).await? {
		WireMessage::ManifestAck { accepted: true, .. } => {}
		WireMessage::ManifestAck { accepted: false, reason } => {
			return Err(PushError::Rejected {
				reason: reason.unwrap_or_else(|| "responder declined manifest".into()),
			});
		}
		other => {
			return Err(PushError::Protocol {
				got: wire_tag(&other).into(),
				expected: "ManifestAck".into(),
			});
		}
	}

	// 3. Per-file streaming.
	let mut bytes_done: u64 = 0;
	let mut files_done: u64 = 0;
	let mut bytes_since_progress: u64 = 0;
	let mut files_since_progress: u64 = 0;
	for entry in &plan.files {
		let abs_path = abs_join(source_abs_path, &entry.rel_path);
		send_message(
			session,
			&WireMessage::FileStart {
				rel_path: entry.rel_path.clone(),
				size: entry.size,
			},
		)
		.await?;

		let bytes = tokio::fs::read(&abs_path).await.map_err(PushError::Io)?;
		// The plan recorded the size at planning time; honour the manifest's
		// announced size even if the file changed underfoot. This keeps the
		// receive-side chunk loop deterministic.
		let send_len = bytes.len().min(entry.size as usize);
		let mut offset = 0;
		while offset < send_len {
			let end = (offset + PUSH_FILE_CHUNK_BYTES).min(send_len);
			session.send(&bytes[offset..end]).await?;
			let chunk = (end - offset) as u64;
			bytes_done += chunk;
			bytes_since_progress += chunk;
			if bytes_since_progress >= PROGRESS_INTERVAL_BYTES {
				on_progress(bytes_done, files_done);
				bytes_since_progress = 0;
			}
			offset = end;
		}

		send_message(session, &WireMessage::FileEnd).await?;
		files_done += 1;
		files_since_progress += 1;
		if files_since_progress >= PROGRESS_INTERVAL_FILES {
			on_progress(bytes_done, files_done);
			files_since_progress = 0;
		}
	}

	// 4. PushDone.
	on_progress(bytes_done, files_done);
	send_message(session, &WireMessage::PushDone).await?;

	// 5. PushAck.
	match recv_message(session).await? {
		WireMessage::PushAck { files_received } => Ok(files_received),
		other => Err(PushError::Protocol {
			got: wire_tag(&other).into(),
			expected: "PushAck".into(),
		}),
	}
}

// =============================================================================
// Receive-side driver
// =============================================================================

/// Receive-side. Reads the manifest, sanitises every announced path,
/// writes each file into a unique incoming staging directory, then —
/// on success — renames each file into place under
/// `<vault_abs_path>/<target_rel_path>/<rel_path>`.
///
/// Any error path (path traversal, transport error, I/O error,
/// unexpected message) results in the staging directory being deleted
/// before the function returns. No partial files are ever observable
/// at the final destination.
pub async fn receive_folder<S>(
	session: &mut Session<S>,
	vault_abs_path: &Path,
	mut on_progress: impl FnMut(u64, u64),
) -> Result<u64, PushError>
where
	S: AsyncRead + AsyncWrite + Unpin + Send,
{
	// 1. Manifest.
	let (target_rel_path, files) = match recv_message(session).await? {
		WireMessage::Manifest { target_rel_path, files } => (target_rel_path, files),
		other => {
			return Err(PushError::Protocol {
				got: wire_tag(&other).into(),
				expected: "Manifest".into(),
			});
		}
	};

	// Up-front Layer-1 check on every manifest entry. Doing this BEFORE
	// creating the staging directory means a malicious manifest never
	// causes a tmp dir to appear on disk.
	if let Err(e) = check_relative_segments(&target_rel_path, &target_rel_path) {
		send_manifest_ack(session, false, Some("invalid target path".into())).await?;
		return Err(e);
	}
	for entry in &files {
		if let Err(e) = check_relative_segments(&entry.rel_path, &entry.rel_path) {
			send_manifest_ack(session, false, Some("invalid file path".into())).await?;
			return Err(e);
		}
	}

	// 2. Prepare incoming staging dir.
	let incoming_root = vault_abs_path.join(INCOMING_DIR).join(Uuid::new_v4().to_string());
	if let Err(e) = tokio::fs::create_dir_all(&incoming_root).await {
		send_manifest_ack(session, false, Some(format!("staging dir: {e}"))).await?;
		return Err(PushError::Io(e));
	}

	// From here on, any error must wipe the staging dir before returning.
	let result =
		receive_files_into_staging(session, vault_abs_path, &incoming_root, &target_rel_path, &files, &mut on_progress)
			.await;

	match result {
		Ok(files_received) => {
			// 3. Atomic apply: move every staged file into place.
			let apply_outcome = apply_staging(
				vault_abs_path,
				&incoming_root,
				&target_rel_path,
				&files,
			)
			.await;
			// Whether apply succeeds or fails, the staging dir is no
			// longer needed.
			let _ = tokio::fs::remove_dir_all(&incoming_root).await;
			let count = apply_outcome?;
			// 4. Final ack to peer.
			send_message(session, &WireMessage::PushAck { files_received: count }).await?;
			Ok(files_received)
		}
		Err(e) => {
			let _ = tokio::fs::remove_dir_all(&incoming_root).await;
			Err(e)
		}
	}
}

/// Drives the inner per-file receive loop. Pulled out so the outer
/// function can run a single `remove_dir_all` cleanup on any error
/// path.
async fn receive_files_into_staging<S>(
	session: &mut Session<S>,
	vault_abs_path: &Path,
	incoming_root: &Path,
	target_rel_path: &str,
	files: &[FileEntry],
	on_progress: &mut impl FnMut(u64, u64),
) -> Result<u64, PushError>
where
	S: AsyncRead + AsyncWrite + Unpin + Send,
{
	// Validate target path resolves under the vault BEFORE accepting
	// the manifest. This is layer 2/3 of the traversal defense,
	// catching e.g. symlinked escapes that layer-1 segment rejection
	// cannot see.
	if !target_rel_path.is_empty() {
		let _ = sanitize_rel_path(vault_abs_path, target_rel_path, "")?;
	}

	send_manifest_ack(session, true, None).await?;

	let mut files_done: u64 = 0;
	let mut bytes_done: u64 = 0;
	let mut bytes_since_progress: u64 = 0;
	let mut files_since_progress: u64 = 0;
	for entry in files {
		// Pre-validate the final target path inside the real vault.
		// We don't write here — we write to staging — but doing the
		// layer-2/3 check up front mirrors the security boundary at
		// its semantic location.
		sanitize_rel_path(vault_abs_path, target_rel_path, &entry.rel_path)?;

		// Header.
		match recv_message(session).await? {
			WireMessage::FileStart { rel_path, size } => {
				if rel_path != entry.rel_path {
					return Err(PushError::Protocol {
						got: format!("FileStart({rel_path})"),
						expected: format!("FileStart({})", entry.rel_path),
					});
				}
				if size != entry.size {
					return Err(PushError::Protocol {
						got: format!("FileStart(size={size})"),
						expected: format!("FileStart(size={})", entry.size),
					});
				}
			}
			other => {
				return Err(PushError::Protocol {
					got: wire_tag(&other).into(),
					expected: "FileStart".into(),
				});
			}
		}

		// Layer-2/3 check on the staging path too — sanitise the
		// rel_path against the incoming root so a manifest segment
		// containing `..` smuggled through `split_segments` cannot
		// land outside the staging dir either.
		let staging_path = sanitize_rel_path(incoming_root, "", &entry.rel_path)?;
		if let Some(parent) = staging_path.parent() {
			tokio::fs::create_dir_all(parent).await.map_err(PushError::Io)?;
		}

		// Stream chunks until the announced size is reached, OR until
		// FileEnd arrives. We track both so a misbehaving sender that
		// over-counts cannot leave us blocked on a chunk that never
		// arrives.
		let mut received_bytes: u64 = 0;
		let mut file = tokio::fs::File::create(&staging_path).await.map_err(PushError::Io)?;
		loop {
			if received_bytes >= entry.size {
				// Expect FileEnd next.
				match recv_message(session).await? {
					WireMessage::FileEnd => break,
					other => {
						return Err(PushError::Protocol {
							got: wire_tag(&other).into(),
							expected: "FileEnd".into(),
						});
					}
				}
			}
			let chunk = session.recv().await?;
			if chunk.is_empty() {
				// An empty raw frame is meaningless mid-file. Treat
				// as a protocol violation.
				return Err(PushError::Protocol {
					got: "empty chunk".into(),
					expected: "non-empty chunk or FileEnd".into(),
				});
			}
			use tokio::io::AsyncWriteExt as _;
			file.write_all(&chunk).await.map_err(PushError::Io)?;
			received_bytes += chunk.len() as u64;
			bytes_done += chunk.len() as u64;
			bytes_since_progress += chunk.len() as u64;
			if bytes_since_progress >= PROGRESS_INTERVAL_BYTES {
				on_progress(bytes_done, files_done);
				bytes_since_progress = 0;
			}
		}
		use tokio::io::AsyncWriteExt as _;
		file.flush().await.map_err(PushError::Io)?;
		drop(file);
		files_done += 1;
		files_since_progress += 1;
		if files_since_progress >= PROGRESS_INTERVAL_FILES {
			on_progress(bytes_done, files_done);
			files_since_progress = 0;
		}
	}

	// Final PushDone.
	match recv_message(session).await? {
		WireMessage::PushDone => {}
		other => {
			return Err(PushError::Protocol {
				got: wire_tag(&other).into(),
				expected: "PushDone".into(),
			});
		}
	}

	on_progress(bytes_done, files_done);
	Ok(files_done)
}

/// Renames each staged file into its final destination under the vault.
/// Creates intermediate directories as needed. Returns the number of
/// files successfully placed.
async fn apply_staging(
	vault_abs_path: &Path,
	incoming_root: &Path,
	target_rel_path: &str,
	files: &[FileEntry],
) -> Result<u64, PushError> {
	let mut applied: u64 = 0;
	for entry in files {
		let src = sanitize_rel_path(incoming_root, "", &entry.rel_path)?;
		let dst = sanitize_rel_path(vault_abs_path, target_rel_path, &entry.rel_path)?;
		if let Some(parent) = dst.parent() {
			tokio::fs::create_dir_all(parent).await.map_err(PushError::Io)?;
		}
		tokio::fs::rename(&src, &dst).await.map_err(PushError::Io)?;
		applied += 1;
	}
	Ok(applied)
}

/// Builds an absolute path inside `root` from a forward-slash relative
/// path. Internal helper used by the SEND side only — the receive side
/// goes through [`sanitize_rel_path`] which is stricter.
fn abs_join(root: &Path, rel: &str) -> PathBuf {
	let mut p = root.to_path_buf();
	for seg in split_segments(rel) {
		p.push(seg);
	}
	p
}

// =============================================================================
// Tiny JSON-framed control-message I/O
// =============================================================================

/// Sends one control [`WireMessage`] as a JSON-encoded Noise frame.
async fn send_message<S>(session: &mut Session<S>, msg: &WireMessage) -> Result<(), PushError>
where
	S: AsyncRead + AsyncWrite + Unpin + Send,
{
	let bytes = serde_json::to_vec(msg)?;
	session.send(&bytes).await?;
	Ok(())
}

/// Receives one control [`WireMessage`]. Chunk-payload raw frames are
/// fetched via `session.recv()` directly by the per-file loop.
async fn recv_message<S>(session: &mut Session<S>) -> Result<WireMessage, PushError>
where
	S: AsyncRead + AsyncWrite + Unpin + Send,
{
	let bytes = session.recv().await?;
	let msg: WireMessage = serde_json::from_slice(&bytes)?;
	Ok(msg)
}

/// Convenience for the manifest ack path (most common reply).
async fn send_manifest_ack<S>(
	session: &mut Session<S>,
	accepted: bool,
	reason: Option<String>,
) -> Result<(), PushError>
where
	S: AsyncRead + AsyncWrite + Unpin + Send,
{
	send_message(session, &WireMessage::ManifestAck { accepted, reason }).await
}

/// Human-readable tag for a [`WireMessage`], used in
/// [`PushError::Protocol`] for debug logs.
fn wire_tag(msg: &WireMessage) -> &'static str {
	match msg {
		WireMessage::Manifest { .. } => "Manifest",
		WireMessage::ManifestAck { .. } => "ManifestAck",
		WireMessage::FileStart { .. } => "FileStart",
		WireMessage::FileEnd => "FileEnd",
		WireMessage::PushDone => "PushDone",
		WireMessage::PushAck { .. } => "PushAck",
	}
}
