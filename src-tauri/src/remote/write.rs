//! Checked note writes from a browser session (proposal 4.3, with the base
//! taken from the editor tab): a write lands only when the disk still holds
//! the text the browser's tab is based on, so the browser never overwrites a
//! version it has not seen. Tauri-free; the dispatcher has already checked
//! containment and hands in the canonical path.
//!
//! The target is opened with `O_NOFOLLOW` and read and written through the
//! same descriptor, so a link swapped in after the containment check cannot
//! redirect the write out of the vault.

use std::fs::{File, OpenOptions};
use std::io::{ErrorKind, Read, Seek, SeekFrom, Write};
use std::path::Path;
use std::sync::Mutex;

use sha2::{Digest, Sha256};

/// Start of the error message of a refused stale write. `remote::rpc` gives
/// such an error its own JSON-RPC code, which the browser maps to its
/// conflict error.
pub const CONFLICT_PREFIX: &str = "Conflict: ";

/// One checked write at a time across every session: the compare and the
/// write must not interleave with another browser's write to the same note.
static WRITE_LOCK: Mutex<()> = Mutex::new(());

/// File bytes as the frontend sees them (`TextDecoder`, UTF-8): invalid
/// sequences become U+FFFD and a leading BOM is dropped.
pub fn disk_text(bytes: &[u8]) -> String {
	let text = String::from_utf8_lossy(bytes);
	text.strip_prefix('\u{FEFF}').unwrap_or(&text).to_string()
}

fn sha256(text: &str) -> [u8; 32] {
	Sha256::digest(text.as_bytes()).into()
}

fn conflict(path: &Path) -> String {
	format!("{CONFLICT_PREFIX}the note changed on the Mac: {}", path.display())
}

fn open_error(path: &Path, err: std::io::Error) -> String {
	// ELOOP: the final component is a link (`O_NOFOLLOW`).
	#[cfg(unix)]
	if err.raw_os_error() == Some(libc::ELOOP) {
		return format!("Path is not available in the browser: {}", path.display());
	}
	format!("failed to open file at path: {}: {err}", path.display())
}

#[cfg(unix)]
fn options() -> OpenOptions {
	use std::os::unix::fs::OpenOptionsExt;
	let mut options = OpenOptions::new();
	options.custom_flags(libc::O_NOFOLLOW);
	options
}

#[cfg(not(unix))]
fn options() -> OpenOptions {
	OpenOptions::new()
}

/// Creates `path` with `text`; refused when anything (a file, a folder, a
/// link) is already there.
fn create(path: &Path, text: &str) -> Result<(), String> {
	let mut file = options().write(true).create_new(true).open(path).map_err(|e| {
		if e.kind() == ErrorKind::AlreadyExists {
			format!("File already exists: {}", path.display())
		} else {
			open_error(path, e)
		}
	})?;
	file.write_all(text.as_bytes()).map_err(|e| format!("failed to write file at path: {}: {e}", path.display()))
}

/// Creates the note at `path` with `text`. Refused when anything is there.
pub fn create_new(path: &Path, text: &str) -> Result<(), String> {
	let _guard = WRITE_LOCK.lock().map_err(|e| e.to_string())?;
	create(path, text)
}

/// Writes `text` to `path` when the disk still holds `base`.
///
/// - Existing file: accepted when the SHA-256 of its text (`disk_text`)
///   equals that of `base`, or that of `text` (a retry of a write that
///   already landed; nothing is written then). Otherwise a conflict. No
///   `base` is refused: the browser must not overwrite a note it never
///   loaded.
/// - Missing file: created when there is no `base` and `create_missing`;
///   with a `base` it is a conflict (the note was deleted on the Mac).
pub fn write_checked(path: &Path, text: &str, base: Option<&str>, create_missing: bool) -> Result<(), String> {
	let _guard = WRITE_LOCK.lock().map_err(|e| e.to_string())?;
	let mut file: File = match options().read(true).write(true).open(path) {
		Ok(file) => file,
		Err(e) if e.kind() == ErrorKind::NotFound => {
			return match base {
				Some(_) => Err(conflict(path)),
				None if create_missing => create(path, text),
				None => Err(format!("failed to open file at path: {}: {e}", path.display())),
			};
		}
		Err(e) => return Err(open_error(path, e)),
	};
	let Some(base) = base else {
		return Err(format!("Refusing to overwrite a note the browser has not loaded: {}", path.display()));
	};
	let mut bytes = Vec::new();
	file.read_to_end(&mut bytes).map_err(|e| format!("failed to read file at path: {}: {e}", path.display()))?;
	let disk = sha256(&disk_text(&bytes));
	if disk == sha256(text) {
		return Ok(());
	}
	if disk != sha256(base) {
		return Err(conflict(path));
	}
	let io = |e: std::io::Error| format!("failed to write file at path: {}: {e}", path.display());
	file.set_len(0).map_err(io)?;
	file.seek(SeekFrom::Start(0)).map_err(io)?;
	file.write_all(text.as_bytes()).map_err(io)
}
