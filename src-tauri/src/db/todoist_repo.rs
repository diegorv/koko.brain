//! SQL over the Todoist sync tables (`todoist_kv`, `todoist_task_link`,
//! `todoist_section_link`, `todoist_sync_log`), created in
//! `schema::create_tables`.

use rusqlite::{params, Connection};

/// Rows `todoist_sync_log` keeps; older rows are dropped on append.
pub const SYNC_LOG_LIMIT: i64 = 1000;

/// One `todoist_kv` row: a scalar of the sync state (`sync_token`, `user_id`, ...).
#[derive(serde::Serialize, serde::Deserialize, Debug, Clone, PartialEq, Eq, ts_rs::TS)]
#[ts(export)]
#[serde(rename_all = "camelCase")]
pub struct TodoistKvEntry {
	/// State key, e.g. `sync_token`.
	pub key: String,
	/// Stored value as text.
	pub value: String,
}

/// One `todoist_task_link` row: the link between an anchored task line and its Todoist item.
#[derive(serde::Serialize, serde::Deserialize, Debug, Clone, PartialEq, Eq, ts_rs::TS)]
#[ts(export)]
#[serde(rename_all = "camelCase")]
pub struct TodoistTaskLink {
	/// The line's anchor value (`td-...`), the primary key.
	pub anchor: String,
	/// Todoist item id; null until a brain-born task's `item_add` is acknowledged.
	pub todoist_id: Option<String>,
	/// Vault-relative path of the note holding the line.
	pub note_rel_path: String,
	/// JSON of the values parsed from the line as last written or seen.
	pub local_base: Option<String>,
	/// JSON of the raw Todoist values last seen.
	pub remote_base: Option<String>,
	/// uuid of a sent `item_add` not yet acknowledged.
	pub pending_uuid: Option<String>,
	/// JSON of a pending close or reopen (uuid + type) not yet acknowledged.
	pub pending_cmd: Option<String>,
	/// Consecutive cycles the anchored line or item was not observed.
	pub miss_count: u32,
	/// Whether the link is frozen (duplicate anchor): no pushes, no creates.
	pub frozen: bool,
}

/// One `todoist_section_link` row: a Todoist section and the `##` heading of
/// its project note.
#[derive(serde::Serialize, serde::Deserialize, Debug, Clone, PartialEq, Eq, ts_rs::TS)]
#[ts(export)]
#[serde(rename_all = "camelCase")]
pub struct TodoistSectionLink {
	/// Todoist section id, the primary key.
	pub todoist_section_id: String,
	/// Todoist project the section belongs to.
	pub project_id: String,
	/// The heading text (without `## `) as last written or seen.
	pub heading: String,
}

/// One state commit applied in a single transaction: kv rows (the `sync_token`
/// among them), link upserts and deletes, section link upserts and deletes.
#[derive(serde::Deserialize, Debug, Clone, ts_rs::TS)]
#[ts(export)]
#[serde(rename_all = "camelCase")]
pub struct TodoistStateCommit {
	/// kv rows to insert or replace.
	pub kv: Vec<TodoistKvEntry>,
	/// Links to insert or replace, keyed by anchor.
	pub upsert_links: Vec<TodoistTaskLink>,
	/// Anchors whose links are deleted.
	pub delete_anchors: Vec<String>,
	/// Section links to insert or replace, keyed by section id.
	#[serde(default)]
	#[ts(optional)]
	pub upsert_sections: Option<Vec<TodoistSectionLink>>,
	/// Section ids whose links are deleted.
	#[serde(default)]
	#[ts(optional)]
	pub delete_section_ids: Option<Vec<String>>,
}

/// A sync log entry to append; the time is set when it is stored.
#[derive(serde::Deserialize, Debug, Clone, ts_rs::TS)]
#[ts(export)]
#[serde(rename_all = "camelCase")]
pub struct TodoistSyncLogInput {
	/// Entry kind, e.g. `conflict`, `detach`, `frozen`, `skipped`, `command-error`.
	pub kind: String,
	/// Anchor of the line the entry is about, when there is one.
	pub anchor: Option<String>,
	/// Human-readable text.
	pub message: String,
}

/// One stored `todoist_sync_log` row.
#[derive(serde::Serialize, Debug, Clone, PartialEq, Eq, ts_rs::TS)]
#[ts(export)]
#[serde(rename_all = "camelCase")]
pub struct TodoistSyncLogEntry {
	/// Row id, increasing with insertion order.
	pub id: i64,
	/// Unix time in milliseconds when the entry was stored.
	pub created_at: i64,
	/// Entry kind.
	pub kind: String,
	/// Anchor of the line the entry is about, when there is one.
	pub anchor: Option<String>,
	/// Human-readable text.
	pub message: String,
}

/// Every kv row, sorted by key.
pub fn read_kv(conn: &Connection) -> Result<Vec<TodoistKvEntry>, String> {
	let mut stmt = conn
		.prepare("SELECT key, value FROM todoist_kv ORDER BY key")
		.map_err(|e| format!("Failed to prepare todoist_kv query: {e}"))?;
	let rows = stmt
		.query_map([], |row| Ok(TodoistKvEntry { key: row.get(0)?, value: row.get(1)? }))
		.map_err(|e| format!("Failed to read todoist_kv: {e}"))?;
	rows.collect::<Result<_, _>>().map_err(|e| format!("Failed to read todoist_kv row: {e}"))
}

/// Every link, sorted by anchor.
pub fn read_links(conn: &Connection) -> Result<Vec<TodoistTaskLink>, String> {
	let mut stmt = conn
		.prepare(
			"SELECT anchor, todoist_id, note_rel_path, local_base, remote_base, pending_uuid, pending_cmd, miss_count, frozen
			 FROM todoist_task_link ORDER BY anchor",
		)
		.map_err(|e| format!("Failed to prepare todoist_task_link query: {e}"))?;
	let rows = stmt
		.query_map([], |row| {
			Ok(TodoistTaskLink {
				anchor: row.get(0)?,
				todoist_id: row.get(1)?,
				note_rel_path: row.get(2)?,
				local_base: row.get(3)?,
				remote_base: row.get(4)?,
				pending_uuid: row.get(5)?,
				pending_cmd: row.get(6)?,
				miss_count: row.get::<_, i64>(7)?.clamp(0, u32::MAX as i64) as u32,
				frozen: row.get(8)?,
			})
		})
		.map_err(|e| format!("Failed to read todoist_task_link: {e}"))?;
	rows.collect::<Result<_, _>>().map_err(|e| format!("Failed to read todoist_task_link row: {e}"))
}

/// Applies `commit` on `conn`. Run it inside a transaction: an error part way
/// leaves earlier statements applied until the caller rolls back.
pub fn apply_commit(conn: &Connection, commit: &TodoistStateCommit) -> Result<(), String> {
	for entry in &commit.kv {
		conn.execute(
			"INSERT OR REPLACE INTO todoist_kv (key, value) VALUES (?1, ?2)",
			params![entry.key, entry.value],
		)
		.map_err(|e| format!("Failed to write todoist_kv: {e}"))?;
	}
	for link in &commit.upsert_links {
		if link.anchor.is_empty() {
			return Err("Todoist link with an empty anchor".to_string());
		}
		conn.execute(
			"INSERT OR REPLACE INTO todoist_task_link
				(anchor, todoist_id, note_rel_path, local_base, remote_base, pending_uuid, pending_cmd, miss_count, frozen)
			 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
			params![
				link.anchor,
				link.todoist_id,
				link.note_rel_path,
				link.local_base,
				link.remote_base,
				link.pending_uuid,
				link.pending_cmd,
				link.miss_count,
				link.frozen
			],
		)
		.map_err(|e| format!("Failed to write todoist_task_link: {e}"))?;
	}
	for anchor in &commit.delete_anchors {
		conn.execute("DELETE FROM todoist_task_link WHERE anchor = ?1", [anchor])
			.map_err(|e| format!("Failed to delete todoist_task_link: {e}"))?;
	}
	for section in commit.upsert_sections.iter().flatten() {
		conn.execute(
			"INSERT OR REPLACE INTO todoist_section_link (todoist_section_id, project_id, heading) VALUES (?1, ?2, ?3)",
			params![section.todoist_section_id, section.project_id, section.heading],
		)
		.map_err(|e| format!("Failed to write todoist_section_link: {e}"))?;
	}
	for id in commit.delete_section_ids.iter().flatten() {
		conn.execute("DELETE FROM todoist_section_link WHERE todoist_section_id = ?1", [id])
			.map_err(|e| format!("Failed to delete todoist_section_link: {e}"))?;
	}
	Ok(())
}

/// Every section link, sorted by section id.
pub fn read_sections(conn: &Connection) -> Result<Vec<TodoistSectionLink>, String> {
	let mut stmt = conn
		.prepare("SELECT todoist_section_id, project_id, heading FROM todoist_section_link ORDER BY todoist_section_id")
		.map_err(|e| format!("Failed to prepare todoist_section_link query: {e}"))?;
	let rows = stmt
		.query_map([], |row| {
			Ok(TodoistSectionLink { todoist_section_id: row.get(0)?, project_id: row.get(1)?, heading: row.get(2)? })
		})
		.map_err(|e| format!("Failed to read todoist_section_link: {e}"))?;
	rows.collect::<Result<_, _>>().map_err(|e| format!("Failed to read todoist_section_link row: {e}"))
}

/// Appends `entries` stamped with `created_at`, then drops every row older
/// than the newest [`SYNC_LOG_LIMIT`]. Run it inside a transaction.
pub fn append_log(conn: &Connection, entries: &[TodoistSyncLogInput], created_at: i64) -> Result<(), String> {
	for entry in entries {
		conn.execute(
			"INSERT INTO todoist_sync_log (created_at, kind, anchor, message) VALUES (?1, ?2, ?3, ?4)",
			params![created_at, entry.kind, entry.anchor, entry.message],
		)
		.map_err(|e| format!("Failed to write todoist_sync_log: {e}"))?;
	}
	conn.execute(
		"DELETE FROM todoist_sync_log WHERE id <= (SELECT id FROM todoist_sync_log ORDER BY id DESC LIMIT 1 OFFSET ?1)",
		[SYNC_LOG_LIMIT],
	)
	.map_err(|e| format!("Failed to trim todoist_sync_log: {e}"))?;
	Ok(())
}

/// The newest `limit` log rows, newest first.
pub fn read_log(conn: &Connection, limit: i64) -> Result<Vec<TodoistSyncLogEntry>, String> {
	let mut stmt = conn
		.prepare("SELECT id, created_at, kind, anchor, message FROM todoist_sync_log ORDER BY id DESC LIMIT ?1")
		.map_err(|e| format!("Failed to prepare todoist_sync_log query: {e}"))?;
	let rows = stmt
		.query_map([limit], |row| {
			Ok(TodoistSyncLogEntry {
				id: row.get(0)?,
				created_at: row.get(1)?,
				kind: row.get(2)?,
				anchor: row.get(3)?,
				message: row.get(4)?,
			})
		})
		.map_err(|e| format!("Failed to read todoist_sync_log: {e}"))?;
	rows.collect::<Result<_, _>>().map_err(|e| format!("Failed to read todoist_sync_log row: {e}"))
}
