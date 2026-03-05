use crate::db;
use crate::utils::logger::debug_log;
use sha2::{Digest, Sha256};
use similar::TextDiff;
use std::time::{SystemTime, UNIX_EPOCH};

// Re-export for tests and other consumers
pub use crate::db::history_repo::SnapshotInfo;

/// A single line in a unified diff.
#[derive(serde::Serialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct DiffLine {
	#[serde(rename = "type")]
	pub line_type: String,
	pub content: String,
	#[serde(skip_serializing_if = "Option::is_none")]
	pub old_line_num: Option<u64>,
	#[serde(skip_serializing_if = "Option::is_none")]
	pub new_line_num: Option<u64>,
}

/// Returns the current time in milliseconds since UNIX epoch.
fn now_ms() -> u64 {
	SystemTime::now()
		.duration_since(UNIX_EPOCH)
		.unwrap_or_default()
		.as_millis()
		.try_into()
		.unwrap_or(u64::MAX)
}

/// Saves a snapshot of file content if its hash differs from the last snapshot.
/// Returns true if a new snapshot was created, false if deduplicated.
#[tauri::command]
pub fn save_snapshot(file_path: String, content: String) -> Result<bool, String> {
	debug_log("HISTORY", format!("Saving snapshot: {} ({} bytes)", file_path, content.len()));
	let hash = format!("{:x}", Sha256::digest(content.as_bytes()));
	let size = content.len() as i64;
	let created_at = now_ms() as i64;

	db::with_db(|conn| {
		if let Some(last) = db::history_repo::find_latest_hash(conn, &file_path)? {
			if last == hash {
				debug_log("HISTORY", "Snapshot deduped (same hash)");
				return Ok(false);
			}
		}

		db::history_repo::insert_snapshot(conn, &file_path, &content, &hash, size, created_at)?;
		debug_log("HISTORY", "Snapshot created");
		Ok(true)
	})
}

/// Lists all snapshots for a file, newest first.
#[tauri::command]
pub fn get_file_history(file_path: String) -> Result<Vec<SnapshotInfo>, String> {
	db::with_db(|conn| db::history_repo::list_snapshots(conn, &file_path))
}

/// Reads the full content of a specific snapshot.
#[tauri::command]
pub fn get_snapshot_content(snapshot_id: i64) -> Result<String, String> {
	db::with_db(|conn| db::history_repo::get_snapshot_by_id(conn, snapshot_id))
}

/// Computes a line-by-line diff between two strings.
/// Pure computation — no database access.
#[tauri::command]
pub fn compute_diff(old_content: String, new_content: String) -> Result<Vec<DiffLine>, String> {
	let diff = TextDiff::from_lines(&old_content, &new_content);
	let mut lines = Vec::new();
	let mut old_line: u64 = 1;
	let mut new_line: u64 = 1;

	for change in diff.iter_all_changes() {
		match change.tag() {
			similar::ChangeTag::Equal => {
				lines.push(DiffLine {
					line_type: "equal".to_string(),
					content: change.value().to_string(),
					old_line_num: Some(old_line),
					new_line_num: Some(new_line),
				});
				old_line += 1;
				new_line += 1;
			}
			similar::ChangeTag::Delete => {
				lines.push(DiffLine {
					line_type: "delete".to_string(),
					content: change.value().to_string(),
					old_line_num: Some(old_line),
					new_line_num: None,
				});
				old_line += 1;
			}
			similar::ChangeTag::Insert => {
				lines.push(DiffLine {
					line_type: "insert".to_string(),
					content: change.value().to_string(),
					old_line_num: None,
					new_line_num: Some(new_line),
				});
				new_line += 1;
			}
		}
	}

	Ok(lines)
}

/// Deletes old snapshots by retention policy.
/// - Recent (within retention_days): keep all
/// - Medium (retention_days..retention_days+30): keep 1 per day per file (latest)
/// - Old (beyond retention_days+30): delete all
/// Returns the count of deleted rows.
#[tauri::command]
pub fn cleanup_history(retention_days: u32) -> Result<u32, String> {
	let now = now_ms() as i64;
	// Clamp to 100 years to prevent integer overflow in millisecond arithmetic
	let days = (retention_days as i64).min(36500);
	let cutoff_recent = now - days * 86_400 * 1000;
	let cutoff_daily = cutoff_recent - 30 * 86400 * 1000;

	db::with_db_transaction(|conn| {
		let old_deleted = db::history_repo::delete_old_snapshots(conn, cutoff_daily)?;
		let medium_deleted =
			db::history_repo::delete_medium_duplicates(conn, cutoff_daily, cutoff_recent)?;
		let total = old_deleted + medium_deleted;
		debug_log("HISTORY", format!("Cleanup: removed {} snapshots (retention: {} days)", total, retention_days));
		Ok(total)
	})
}
