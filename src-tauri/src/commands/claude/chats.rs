//! The Claude panel's own copy of each chat, one file per chat at
//! `<vault>/.kokobrain/claude/chats/<chatId>.json`. The content is an opaque
//! string here; its schema lives in the frontend (`claude.logic.ts`). The
//! scan and the watcher skip `.kokobrain`, so these files are never indexed.
//!
//! Rust builds every path from a chat id it checked first, so these commands
//! give `std::fs`, which the plugin-fs ACL does not cover, no way to reach any
//! other file (like `mod_data_path` in `commands/vault.rs`).

use crate::utils::fs as vault_fs;
use serde::Serialize;
use std::path::{Path, PathBuf};
use std::time::UNIX_EPOCH;
use uuid::Uuid;

/// One saved chat, as `claude_chat_list` returns it.
#[derive(Debug, PartialEq, Serialize, ts_rs::TS)]
#[ts(export)]
#[serde(rename_all = "camelCase")]
pub struct ClaudeChatEntry {
	/// The chat's id, the file name without `.json`.
	pub chat_id: String,
	/// The file's modification time, in ms since the Unix epoch.
	pub modified_ms: u64,
}

/// True for a UUID in canonical form: lowercase and hyphenated. Braced,
/// `urn:` and simple forms parse too, so the round trip decides.
fn is_canonical_chat_id(chat_id: &str) -> bool {
	Uuid::parse_str(chat_id).is_ok_and(|id| id.hyphenated().to_string() == chat_id)
}

/// `<vault>/.kokobrain/claude/chats`. Errors when the vault is not a reachable folder.
fn chats_dir(vault_path: &str) -> Result<PathBuf, String> {
	Ok(vault_fs::validate_vault_path(vault_path)?.join(".kokobrain").join("claude").join("chats"))
}

/// The file of `chat_id`, refused unless the id is a canonical UUID.
fn chat_path(vault_path: &str, chat_id: &str) -> Result<PathBuf, String> {
	if !is_canonical_chat_id(chat_id) {
		return Err(format!("Invalid chat id: {chat_id}"));
	}
	Ok(chats_dir(vault_path)?.join(format!("{chat_id}.json")))
}

/// Writes a chat through `write_atomic`, creating missing folders: a crash
/// mid-write leaves the old file, never a truncated one.
#[tauri::command(async)]
pub fn claude_chat_write(vault_path: String, chat_id: String, content: String) -> Result<(), String> {
	let path = chat_path(&vault_path, &chat_id)?;
	if let Some(dir) = path.parent() {
		std::fs::create_dir_all(dir).map_err(|e| format!("mkdir failed for {}: {}", dir.display(), e))?;
	}
	vault_fs::write_atomic(&path.to_string_lossy(), &content)
}

/// Reads a chat, `None` only when its file is not there. Invalid UTF-8 and
/// every other read failure are errors, so the caller never takes an
/// unreadable chat for a missing one.
#[tauri::command(async)]
pub fn claude_chat_read(vault_path: String, chat_id: String) -> Result<Option<String>, String> {
	let path = chat_path(&vault_path, &chat_id)?;
	let bytes = match std::fs::read(&path) {
		Ok(bytes) => bytes,
		Err(e) if e.kind() == std::io::ErrorKind::NotFound => return Ok(None),
		Err(e) => return Err(format!("read failed for {}: {}", path.display(), e)),
	};
	String::from_utf8(bytes)
		.map(Some)
		.map_err(|_| format!("read failed for {}: not valid UTF-8", path.display()))
}

/// The vault's saved chats, newest modification first. A missing folder
/// gives an empty list. Only regular files named `<chatId>.json` count, which
/// also leaves out `write_atomic`'s temp files.
#[tauri::command(async)]
pub fn claude_chat_list(vault_path: String) -> Result<Vec<ClaudeChatEntry>, String> {
	let dir = chats_dir(&vault_path)?;
	let entries = match std::fs::read_dir(&dir) {
		Ok(entries) => entries,
		Err(e) if e.kind() == std::io::ErrorKind::NotFound => return Ok(Vec::new()),
		Err(e) => return Err(format!("read_dir failed for {}: {}", dir.display(), e)),
	};
	let mut chats: Vec<ClaudeChatEntry> = entries.filter_map(|entry| chat_entry(&entry.ok()?.path())).collect();
	chats.sort_by(|a, b| b.modified_ms.cmp(&a.modified_ms).then_with(|| a.chat_id.cmp(&b.chat_id)));
	Ok(chats)
}

/// The list entry of `path`, or `None` when it is not a chat file or its
/// metadata cannot be read (a file deleted while listing).
fn chat_entry(path: &Path) -> Option<ClaudeChatEntry> {
	let chat_id = path.file_name()?.to_str()?.strip_suffix(".json")?;
	if !is_canonical_chat_id(chat_id) {
		return None;
	}
	let meta = std::fs::metadata(path).ok()?;
	if !meta.is_file() {
		return None;
	}
	let modified = meta.modified().ok()?.duration_since(UNIX_EPOCH).ok()?;
	Some(ClaudeChatEntry { chat_id: chat_id.to_string(), modified_ms: modified.as_millis() as u64 })
}
