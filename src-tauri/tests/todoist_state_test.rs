// `TEST_LOCK` serializes tests over the process-global database and is held
// across `.await` on purpose; each `#[tokio::test]` owns its runtime, so the
// guard cannot block another task on the same executor.
#![allow(clippy::await_holding_lock)]

use kokobrain_lib::commands::todoist::*;
use kokobrain_lib::db;
use std::sync::Mutex;
use tempfile::TempDir;

/// Tests share the global DB static, so they must run serially.
static TEST_LOCK: Mutex<()> = Mutex::new(());

fn setup() -> (TempDir, String) {
	let tmp = TempDir::new().unwrap();
	let _ = db::close_database();
	db::open_database(tmp.path()).unwrap();
	let root = tmp.path().to_string_lossy().into_owned();
	(tmp, root)
}

fn link(anchor: &str, todoist_id: Option<&str>) -> TodoistTaskLink {
	TodoistTaskLink {
		anchor: anchor.into(),
		todoist_id: todoist_id.map(Into::into),
		note_rel_path: "Todoist/Work.md".into(),
		local_base: Some(r#"{"content":"a"}"#.into()),
		remote_base: None,
		pending_uuid: None,
		pending_cmd: None,
		miss_count: 0,
		frozen: false,
	}
}

fn kv(key: &str, value: &str) -> TodoistKvEntry {
	TodoistKvEntry { key: key.into(), value: value.into() }
}

fn commit(kv_rows: Vec<TodoistKvEntry>, upsert: Vec<TodoistTaskLink>, delete: Vec<&str>) -> TodoistStateCommit {
	TodoistStateCommit {
		kv: kv_rows,
		upsert_links: upsert,
		delete_anchors: delete.into_iter().map(Into::into).collect(),
		upsert_sections: None,
		delete_section_ids: None,
	}
}

fn section(id: &str, project_id: &str, heading: &str) -> TodoistSectionLink {
	TodoistSectionLink { todoist_section_id: id.into(), project_id: project_id.into(), heading: heading.into() }
}

fn section_commit(upsert: Vec<TodoistSectionLink>, delete: Vec<&str>) -> TodoistStateCommit {
	TodoistStateCommit {
		upsert_sections: Some(upsert),
		delete_section_ids: Some(delete.into_iter().map(Into::into).collect()),
		..commit(vec![kv("sync_token", "tok-s")], vec![], vec![])
	}
}

fn log(kind: &str, message: &str) -> TodoistSyncLogInput {
	TodoistSyncLogInput { kind: kind.into(), anchor: None, message: message.into(), replace_id: None }
}

#[test]
fn schema_creates_the_four_todoist_tables() {
	let _guard = TEST_LOCK.lock().unwrap();
	let (tmp, _root) = setup();
	db::close_database().unwrap();

	let conn = rusqlite::Connection::open(tmp.path().join(".kokobrain/kokobrain.db")).unwrap();
	let mut stmt = conn
		.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name LIKE 'todoist_%' ORDER BY name")
		.unwrap();
	let names: Vec<String> = stmt.query_map([], |r| r.get(0)).unwrap().map(Result::unwrap).collect();
	assert_eq!(names, vec!["todoist_kv", "todoist_section_link", "todoist_sync_log", "todoist_task_link"]);

	let mut cols = conn.prepare("SELECT name FROM pragma_table_info('todoist_task_link') ORDER BY cid").unwrap();
	let cols: Vec<String> = cols.query_map([], |r| r.get(0)).unwrap().map(Result::unwrap).collect();
	assert_eq!(
		cols,
		vec![
			"anchor",
			"todoist_id",
			"note_rel_path",
			"local_base",
			"remote_base",
			"pending_uuid",
			"pending_cmd",
			"miss_count",
			"frozen"
		]
	);

	let mut cols = conn.prepare("SELECT name FROM pragma_table_info('todoist_section_link') ORDER BY cid").unwrap();
	let cols: Vec<String> = cols.query_map([], |r| r.get(0)).unwrap().map(Result::unwrap).collect();
	assert_eq!(cols, vec!["todoist_section_id", "project_id", "heading"]);
}

#[tokio::test]
async fn empty_store_reads_as_empty_lists() {
	let _guard = TEST_LOCK.lock().unwrap();
	let (_tmp, root) = setup();

	assert!(todoist_read_kv(root.clone()).await.unwrap().is_empty());
	assert!(todoist_read_links(root.clone()).await.unwrap().is_empty());
	assert!(todoist_read_sections(root.clone()).await.unwrap().is_empty());
	assert!(todoist_read_log(root, None).await.unwrap().is_empty());

	db::close_database().unwrap();
}

#[tokio::test]
async fn commit_writes_section_links_with_the_token_and_reads_them_back_by_id() {
	let _guard = TEST_LOCK.lock().unwrap();
	let (_tmp, root) = setup();

	todoist_commit_state(root.clone(), section_commit(vec![section("s2", "work", "Later"), section("s1", "work", "Now")], vec![]))
		.await
		.unwrap();

	assert_eq!(
		todoist_read_sections(root.clone()).await.unwrap(),
		vec![section("s1", "work", "Now"), section("s2", "work", "Later")]
	);
	assert_eq!(todoist_read_kv(root.clone()).await.unwrap(), vec![kv("sync_token", "tok-s")]);

	db::close_database().unwrap();
}

#[tokio::test]
async fn commit_replaces_a_section_link_by_id_and_deletes_section_ids() {
	let _guard = TEST_LOCK.lock().unwrap();
	let (_tmp, root) = setup();

	todoist_commit_state(root.clone(), section_commit(vec![section("s1", "work", "Now"), section("s2", "work", "Later")], vec![]))
		.await
		.unwrap();
	todoist_commit_state(root.clone(), section_commit(vec![section("s1", "work", "Today")], vec!["s2"]))
		.await
		.unwrap();

	assert_eq!(todoist_read_sections(root.clone()).await.unwrap(), vec![section("s1", "work", "Today")]);

	db::close_database().unwrap();
}

#[tokio::test]
async fn a_commit_without_section_fields_leaves_the_section_links_alone() {
	let _guard = TEST_LOCK.lock().unwrap();
	let (_tmp, root) = setup();

	todoist_commit_state(root.clone(), section_commit(vec![section("s1", "work", "Now")], vec![]))
		.await
		.unwrap();
	todoist_commit_state(root.clone(), commit(vec![kv("sync_token", "tok-2")], vec![link("td-a", None)], vec![]))
		.await
		.unwrap();

	assert_eq!(todoist_read_sections(root.clone()).await.unwrap(), vec![section("s1", "work", "Now")]);

	db::close_database().unwrap();
}

#[tokio::test]
async fn a_failed_commit_rolls_back_its_section_links() {
	let _guard = TEST_LOCK.lock().unwrap();
	let (_tmp, root) = setup();

	let mut bad = section_commit(vec![section("s1", "work", "Now")], vec![]);
	bad.upsert_links = vec![link("", None)];
	assert!(todoist_commit_state(root.clone(), bad).await.unwrap_err().contains("anchor"));

	assert!(todoist_read_sections(root.clone()).await.unwrap().is_empty());

	db::close_database().unwrap();
}

#[test]
fn a_commit_without_section_fields_deserializes_from_the_ts_shape() {
	let commit: TodoistStateCommit = serde_json::from_str(r#"{"kv":[],"upsertLinks":[],"deleteAnchors":[]}"#).unwrap();
	assert!(commit.upsert_sections.is_none());
	assert!(commit.delete_section_ids.is_none());

	let commit: TodoistStateCommit = serde_json::from_str(
		r#"{"kv":[],"upsertLinks":[],"deleteAnchors":[],"upsertSections":[{"todoistSectionId":"s1","projectId":"p","heading":"H"}],"deleteSectionIds":["s2"]}"#,
	)
	.unwrap();
	assert_eq!(commit.upsert_sections, Some(vec![section("s1", "p", "H")]));
	assert_eq!(commit.delete_section_ids, Some(vec!["s2".to_string()]));
}

#[tokio::test]
async fn commit_writes_kv_and_links_and_reads_them_back() {
	let _guard = TEST_LOCK.lock().unwrap();
	let (_tmp, root) = setup();

	let mut b = link("td-b", None);
	b.pending_uuid = Some("uuid-1".into());
	b.pending_cmd = Some(r#"{"type":"item_close"}"#.into());
	b.miss_count = 2;
	b.frozen = true;
	todoist_commit_state(
		root.clone(),
		commit(vec![kv("sync_token", "tok-1"), kv("user_id", "u1")], vec![link("td-a", Some("123")), b], vec![]),
	)
	.await
	.unwrap();

	let kv_rows = todoist_read_kv(root.clone()).await.unwrap();
	assert_eq!(kv_rows, vec![kv("sync_token", "tok-1"), kv("user_id", "u1")]);

	let links = todoist_read_links(root.clone()).await.unwrap();
	assert_eq!(links.len(), 2);
	assert_eq!(links[0], link("td-a", Some("123")));
	assert_eq!(links[1].pending_uuid.as_deref(), Some("uuid-1"));
	assert_eq!(links[1].pending_cmd.as_deref(), Some(r#"{"type":"item_close"}"#));
	assert_eq!(links[1].miss_count, 2);
	assert!(links[1].frozen);
	assert_eq!(links[1].todoist_id, None);

	db::close_database().unwrap();
}

#[tokio::test]
async fn commit_updates_existing_rows_and_deletes_anchors() {
	let _guard = TEST_LOCK.lock().unwrap();
	let (_tmp, root) = setup();

	todoist_commit_state(
		root.clone(),
		commit(vec![kv("sync_token", "tok-1")], vec![link("td-a", None), link("td-b", Some("2"))], vec![]),
	)
	.await
	.unwrap();

	let mut a = link("td-a", Some("1"));
	a.remote_base = Some(r#"{"content":"x"}"#.into());
	todoist_commit_state(root.clone(), commit(vec![kv("sync_token", "tok-2")], vec![a.clone()], vec!["td-b"]))
		.await
		.unwrap();

	assert_eq!(todoist_read_kv(root.clone()).await.unwrap(), vec![kv("sync_token", "tok-2")]);
	assert_eq!(todoist_read_links(root.clone()).await.unwrap(), vec![a]);

	db::close_database().unwrap();
}

#[tokio::test]
async fn failed_commit_rolls_back_the_sync_token_and_every_link() {
	let _guard = TEST_LOCK.lock().unwrap();
	let (_tmp, root) = setup();

	todoist_commit_state(root.clone(), commit(vec![kv("sync_token", "tok-1")], vec![link("td-a", None)], vec![]))
		.await
		.unwrap();

	// The empty anchor is rejected after the token and the first link were written.
	let result = todoist_commit_state(
		root.clone(),
		commit(vec![kv("sync_token", "tok-2")], vec![link("td-c", None), link("", None)], vec!["td-a"]),
	)
	.await;
	assert!(result.unwrap_err().contains("anchor"));

	assert_eq!(todoist_read_kv(root.clone()).await.unwrap(), vec![kv("sync_token", "tok-1")]);
	assert_eq!(todoist_read_links(root.clone()).await.unwrap(), vec![link("td-a", None)]);

	db::close_database().unwrap();
}

#[tokio::test]
async fn log_append_keeps_the_newest_1000_rows() {
	let _guard = TEST_LOCK.lock().unwrap();
	let (_tmp, root) = setup();

	let entries: Vec<TodoistSyncLogInput> = (0..1005).map(|i| log("detach", &format!("m{i}"))).collect();
	todoist_append_log(root.clone(), entries).await.unwrap();

	let all = todoist_read_log(root.clone(), Some(5000)).await.unwrap();
	assert_eq!(all.len(), 1000);
	assert_eq!(all[0].message, "m1004", "newest first");
	assert_eq!(all[999].message, "m5", "the five oldest are gone");
	assert_eq!(all[0].kind, "detach");

	let newest = todoist_read_log(root.clone(), Some(2)).await.unwrap();
	assert_eq!(newest.iter().map(|e| e.message.as_str()).collect::<Vec<_>>(), vec!["m1004", "m1003"]);

	db::close_database().unwrap();
}

#[tokio::test]
async fn log_keeps_the_anchor_and_a_timestamp() {
	let _guard = TEST_LOCK.lock().unwrap();
	let (_tmp, root) = setup();

	let entry = TodoistSyncLogInput { kind: "conflict".into(), anchor: Some("td-a".into()), message: "lost: x".into(), replace_id: None };
	todoist_append_log(root.clone(), vec![entry]).await.unwrap();

	let rows = todoist_read_log(root, None).await.unwrap();
	assert_eq!(rows.len(), 1);
	assert_eq!(rows[0].anchor.as_deref(), Some("td-a"));
	assert!(rows[0].created_at > 0);

	db::close_database().unwrap();
}

#[tokio::test]
async fn log_replace_id_rewrites_the_newest_row_in_place() {
	let _guard = TEST_LOCK.lock().unwrap();
	let (_tmp, root) = setup();

	todoist_append_log(root.clone(), vec![log("detach", "event"), log("cycle", "first")]).await.unwrap();
	let newest = todoist_read_log(root.clone(), Some(1)).await.unwrap()[0].clone();

	let replace = TodoistSyncLogInput { replace_id: Some(newest.id), ..log("cycle", "second") };
	todoist_append_log(root.clone(), vec![replace]).await.unwrap();

	let rows = todoist_read_log(root.clone(), None).await.unwrap();
	assert_eq!(rows.iter().map(|e| (e.id, e.message.as_str())).collect::<Vec<_>>(), vec![(newest.id, "second"), (newest.id - 1, "event")]);
	assert!(rows[0].created_at >= newest.created_at);

	db::close_database().unwrap();
}

#[tokio::test]
async fn log_replace_id_of_an_older_row_appends_instead() {
	let _guard = TEST_LOCK.lock().unwrap();
	let (_tmp, root) = setup();

	todoist_append_log(root.clone(), vec![log("cycle", "first"), log("detach", "event")]).await.unwrap();
	let older = todoist_read_log(root.clone(), None).await.unwrap()[1].clone();

	let replace = TodoistSyncLogInput { replace_id: Some(older.id), ..log("cycle", "second") };
	todoist_append_log(root.clone(), vec![replace]).await.unwrap();

	let rows = todoist_read_log(root.clone(), None).await.unwrap();
	assert_eq!(rows.iter().map(|e| e.message.as_str()).collect::<Vec<_>>(), vec!["second", "event", "first"]);

	db::close_database().unwrap();
}

#[tokio::test]
async fn every_command_refuses_a_vault_that_is_not_the_open_one() {
	let _guard = TEST_LOCK.lock().unwrap();
	// The other vault gets its own database first, so its path canonicalizes and
	// the refusal comes from the open-vault comparison (a real vault switch).
	let other = TempDir::new().unwrap();
	let _ = db::close_database();
	db::open_database(other.path()).unwrap();
	db::close_database().unwrap();
	let (_tmp, root) = setup();
	assert!(other.path().join(".kokobrain/kokobrain.db").exists());
	let other_root = other.path().to_string_lossy().into_owned();

	let errors = vec![
		todoist_read_kv(other_root.clone()).await.unwrap_err(),
		todoist_read_links(other_root.clone()).await.unwrap_err(),
		todoist_read_sections(other_root.clone()).await.unwrap_err(),
		todoist_read_log(other_root.clone(), None).await.unwrap_err(),
		todoist_commit_state(other_root.clone(), commit(vec![kv("sync_token", "x")], vec![link("td-a", None)], vec![]))
			.await
			.unwrap_err(),
		todoist_append_log(other_root, vec![log("detach", "x")]).await.unwrap_err(),
	];
	for err in errors {
		assert!(err.contains("not the open vault"), "{err}");
	}

	// Nothing reached the open vault's store.
	assert!(todoist_read_kv(root.clone()).await.unwrap().is_empty());
	assert!(todoist_read_links(root.clone()).await.unwrap().is_empty());
	assert!(todoist_read_log(root, None).await.unwrap().is_empty());

	db::close_database().unwrap();
}

#[cfg(unix)]
#[tokio::test]
async fn a_symlinked_path_to_the_open_vault_is_accepted() {
	let _guard = TEST_LOCK.lock().unwrap();
	let (tmp, _root) = setup();
	let links_dir = TempDir::new().unwrap();
	let alias = links_dir.path().join("alias");
	std::os::unix::fs::symlink(tmp.path(), &alias).unwrap();

	let alias_root = alias.to_string_lossy().into_owned();
	todoist_commit_state(alias_root.clone(), commit(vec![kv("sync_token", "t")], vec![], vec![]))
		.await
		.unwrap();
	assert_eq!(todoist_read_kv(alias_root).await.unwrap(), vec![kv("sync_token", "t")]);

	db::close_database().unwrap();
}

#[tokio::test]
async fn commands_fail_when_no_database_is_open() {
	let _guard = TEST_LOCK.lock().unwrap();
	let (_tmp, root) = setup();
	db::close_database().unwrap();

	assert!(todoist_read_kv(root).await.unwrap_err().contains("Database not open"));
}
