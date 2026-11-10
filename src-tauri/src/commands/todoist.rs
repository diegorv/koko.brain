//! IPC over the Todoist sync state in `kokobrain.db`. Every command takes the
//! vault root the caller believes is open and refuses a mismatch
//! (`db::with_vault_db`), so a sync cycle that outlived a vault switch cannot
//! touch the next vault's state.
//!
//! Async + `spawn_blocking`: a sync command runs on the main thread, and the
//! `DB` mutex can be held for a whole semantic search-cache load.

use crate::db;
use crate::db::todoist_repo::{self, SYNC_LOG_LIMIT};
use std::time::{SystemTime, UNIX_EPOCH};

pub use crate::db::todoist_repo::{
	TodoistKvEntry, TodoistStateCommit, TodoistSyncLogEntry, TodoistSyncLogInput, TodoistTaskLink,
};

/// Runs `f` on the blocking pool and flattens the join error into the result.
async fn blocking<T, F>(f: F) -> Result<T, String>
where
	F: FnOnce() -> Result<T, String> + Send + 'static,
	T: Send + 'static,
{
	tokio::task::spawn_blocking(f).await.map_err(|e| format!("Task join error: {e}"))?
}

/// Every `todoist_kv` row, sorted by key.
#[tauri::command]
pub async fn todoist_read_kv(vault_path: String) -> Result<Vec<TodoistKvEntry>, String> {
	blocking(move || db::with_vault_db(&vault_path, todoist_repo::read_kv)).await
}

/// Every `todoist_task_link` row, sorted by anchor.
#[tauri::command]
pub async fn todoist_read_links(vault_path: String) -> Result<Vec<TodoistTaskLink>, String> {
	blocking(move || db::with_vault_db(&vault_path, todoist_repo::read_links)).await
}

/// Writes kv rows (the `sync_token` among them), link upserts and link
/// deletes in one transaction: all of it lands, or none of it.
#[tauri::command]
pub async fn todoist_commit_state(vault_path: String, commit: TodoistStateCommit) -> Result<(), String> {
	blocking(move || {
		db::with_vault_db_transaction(&vault_path, "todoist_commit_state", |conn| {
			todoist_repo::apply_commit(conn, &commit)
		})
	})
	.await
}

/// Appends sync log entries and keeps only the newest 1000 rows.
#[tauri::command]
pub async fn todoist_append_log(vault_path: String, entries: Vec<TodoistSyncLogInput>) -> Result<(), String> {
	let created_at = SystemTime::now()
		.duration_since(UNIX_EPOCH)
		.map(|d| i64::try_from(d.as_millis()).unwrap_or(i64::MAX))
		.unwrap_or_default();
	blocking(move || {
		db::with_vault_db_transaction(&vault_path, "todoist_append_log", |conn| {
			todoist_repo::append_log(conn, &entries, created_at)
		})
	})
	.await
}

/// The newest `limit` sync log rows (default: all kept rows), newest first.
#[tauri::command]
pub async fn todoist_read_log(vault_path: String, limit: Option<u32>) -> Result<Vec<TodoistSyncLogEntry>, String> {
	let limit = limit.map_or(SYNC_LOG_LIMIT, i64::from);
	blocking(move || db::with_vault_db(&vault_path, |conn| todoist_repo::read_log(conn, limit))).await
}
