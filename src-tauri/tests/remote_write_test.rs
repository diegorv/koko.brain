//! Browser writes (`remote::write`, the Write arms of `remote::dispatch`):
//! a note write lands only on the version the browser's tab is based on, and
//! every write stays inside the vault.
#![cfg(unix)]

use std::fs;
use std::os::unix::fs::symlink;
use std::path::Path;
use std::sync::{Mutex, RwLock};

use kokobrain_lib::commands::history::{get_file_history, get_snapshot_content};
use kokobrain_lib::commands::vault::scan_vault_v2_inner;
use kokobrain_lib::db;
use kokobrain_lib::remote::dispatch::{dispatch, Call, HostContext};
use kokobrain_lib::remote::write::{disk_text, write_checked, CONFLICT_PREFIX};
use kokobrain_lib::vault::index::VaultIndex;
use kokobrain_lib::vault::VaultIndexState;
use serde_json::{json, Value};
use tempfile::TempDir;

/// The history DB is a process-wide static.
static DB_LOCK: Mutex<()> = Mutex::new(());

const NOTE: &str = "# Note\nfirst\n";

/// `<base>/vault` (the open vault) next to `<base>/outside`.
struct Sandbox {
	base: TempDir,
	index: VaultIndexState,
}

impl Sandbox {
	fn new() -> Self {
		let base = TempDir::new().unwrap();
		let vault = base.path().join("vault");
		fs::create_dir_all(vault.join("folder")).unwrap();
		fs::write(vault.join("note.md"), NOTE).unwrap();
		fs::create_dir(vault.join(".kokobrain")).unwrap();
		fs::write(vault.join(".kokobrain/settings.json"), "{}").unwrap();
		fs::create_dir(base.path().join("outside")).unwrap();
		fs::write(base.path().join("outside/secret.md"), "outside-secret").unwrap();
		let index = RwLock::new(VaultIndex::default());
		scan_vault_v2_inner(&vault.to_string_lossy(), &index).unwrap();
		Self { base, index }
	}

	fn base(&self, rel: &str) -> String {
		format!("{}/{rel}", self.base.path().to_string_lossy())
	}

	fn root(&self) -> String {
		self.base("vault")
	}

	fn path(&self, rel: &str) -> String {
		self.base(&format!("vault/{rel}"))
	}

	fn read(&self, rel: &str) -> String {
		fs::read_to_string(self.path(rel)).unwrap()
	}

	fn call_with(&self, cmd: &str, args: Value, headers: Value) -> Result<Value, String> {
		let ctx = HostContext { index: &self.index, vault_root: Some(self.root()) };
		dispatch(&ctx, &Call { cmd: cmd.into(), args, headers })
	}

	fn call(&self, cmd: &str, args: Value) -> Result<Value, String> {
		self.call_with(cmd, args, Value::Null)
	}

	/// `plugin:fs|write_text_file` as the browser sends it: the body as
	/// `text`, the path percent-encoded and the base in the headers.
	fn write(&self, path: &str, text: &str, base: Option<&str>) -> Result<Value, String> {
		self.write_with(path, text, base, "{}")
	}

	/// `write` with plugin-fs's `options` header (a JSON string).
	fn write_with(&self, path: &str, text: &str, base: Option<&str>, options: &str) -> Result<Value, String> {
		let mut headers = json!({ "path": path.replace('/', "%2F"), "options": options });
		if let Some(base) = base {
			headers["base"] = json!(base);
		}
		self.call_with("plugin:fs|write_text_file", json!({ "text": text }), headers)
	}
}

#[test]
fn a_write_on_the_base_lands() {
	let sb = Sandbox::new();
	assert_eq!(sb.write(&sb.path("note.md"), "# Note\nbrowser\n", Some(NOTE)).unwrap(), Value::Null);
	assert_eq!(sb.read("note.md"), "# Note\nbrowser\n");
}

#[test]
fn a_stale_write_is_refused_with_no_change_on_disk() {
	let sb = Sandbox::new();
	fs::write(sb.path("note.md"), "# Note\nedited on the Mac\n").unwrap();
	let err = sb.write(&sb.path("note.md"), "# Note\nbrowser\n", Some(NOTE)).unwrap_err();
	assert!(err.starts_with(CONFLICT_PREFIX), "{err}");
	assert_eq!(sb.read("note.md"), "# Note\nedited on the Mac\n");
}

#[test]
fn a_retry_after_a_landed_write_is_accepted() {
	let sb = Sandbox::new();
	sb.write(&sb.path("note.md"), "# Note\nbrowser\n", Some(NOTE)).unwrap();
	// The ack was lost: the same write again, with the same (now old) base.
	assert_eq!(sb.write(&sb.path("note.md"), "# Note\nbrowser\n", Some(NOTE)).unwrap(), Value::Null);
	assert_eq!(sb.read("note.md"), "# Note\nbrowser\n");
}

#[test]
fn a_write_to_an_existing_file_with_no_base_is_refused() {
	let sb = Sandbox::new();
	let err = sb.write(&sb.path("note.md"), "overwritten", None).unwrap_err();
	assert!(!err.starts_with(CONFLICT_PREFIX), "{err}");
	assert_eq!(sb.read("note.md"), NOTE);
}

#[test]
fn a_write_with_no_base_creates_a_missing_file() {
	let sb = Sandbox::new();
	sb.write(&sb.path("folder/new.md"), "# New\n", None).unwrap();
	assert_eq!(sb.read("folder/new.md"), "# New\n");
}

#[test]
fn a_write_with_a_base_to_a_note_deleted_on_the_mac_is_a_conflict() {
	let sb = Sandbox::new();
	fs::remove_file(sb.path("note.md")).unwrap();
	let err = sb.write(&sb.path("note.md"), "# Note\nbrowser\n", Some(NOTE)).unwrap_err();
	assert!(err.starts_with(CONFLICT_PREFIX), "{err}");
	assert!(!Path::new(&sb.path("note.md")).exists());
}

#[test]
fn the_base_is_compared_with_the_disk_text_as_the_frontend_decodes_it() {
	let sb = Sandbox::new();
	// A BOM is not part of the text the editor loaded; invalid UTF-8 is U+FFFD.
	fs::write(sb.path("bom.md"), b"\xEF\xBB\xBFhello \xFF\n").unwrap();
	assert_eq!(disk_text(&fs::read(sb.path("bom.md")).unwrap()), "hello \u{FFFD}\n");
	sb.write(&sb.path("bom.md"), "hello world\n", Some("hello \u{FFFD}\n")).unwrap();
	assert_eq!(sb.read("bom.md"), "hello world\n");
}

#[test]
fn writes_outside_the_vault_are_refused() {
	let sb = Sandbox::new();
	symlink(sb.base("outside"), sb.path("out")).unwrap();
	let secret = sb.base("outside/secret.md");
	for path in [secret.clone(), sb.path("out/secret.md"), sb.path("../outside/secret.md"), sb.path(".git/x.md")] {
		assert!(sb.write(&path, "pwned", Some("outside-secret")).is_err(), "{path}");
		assert!(sb.write(&path, "pwned", None).is_err(), "{path}");
	}
	assert!(sb.write(&sb.path("out/new.md"), "pwned", None).is_err());
	assert!(sb.call("create_note", json!({ "path": sb.path("out/new.md"), "content": "pwned" })).is_err());
	assert!(sb.call("create_folder", json!({ "path": sb.path("out/dir") })).is_err());
	assert!(sb.call("plugin:fs|mkdir", json!({ "path": sb.path("out/dir") })).is_err());
	assert_eq!(fs::read_to_string(&secret).unwrap(), "outside-secret");
	assert_eq!(fs::read_dir(sb.base("outside")).unwrap().count(), 1);
}

#[test]
fn a_link_swapped_in_after_the_check_does_not_redirect_the_write() {
	let sb = Sandbox::new();
	// The dispatcher's containment check resolved this path to a vault file;
	// before the write opens it, the file is replaced by a link out of the vault.
	let checked = Path::new(&sb.path("note.md")).canonicalize().unwrap();
	fs::remove_file(&checked).unwrap();
	symlink(sb.base("outside/secret.md"), &checked).unwrap();
	assert!(write_checked(&checked, "pwned", Some("outside-secret"), true).is_err());
	assert!(write_checked(&checked, "pwned", None, true).is_err());
	assert_eq!(fs::read_to_string(sb.base("outside/secret.md")).unwrap(), "outside-secret");
}

#[test]
fn kokobrain_json_writes_stay_dropped() {
	let sb = Sandbox::new();
	assert_eq!(sb.write(&sb.path(".kokobrain/settings.json"), "{\"x\":1}", None).unwrap(), Value::Null);
	assert_eq!(sb.read(".kokobrain/settings.json"), "{}");
	assert!(sb.call("create_note", json!({ "path": sb.path(".kokobrain/x.json"), "content": "" })).is_err());
	assert!(sb.call("plugin:fs|mkdir", json!({ "path": sb.path(".kokobrain"), "options": { "recursive": true } })).is_err());
}

#[test]
fn create_note_creates_only_a_missing_note() {
	let sb = Sandbox::new();
	let version = sb.index.read().unwrap().version();
	let result = sb.call("create_note", json!({ "path": sb.path("folder/fresh.md"), "content": "# Fresh\n" })).unwrap();
	assert_eq!(sb.read("folder/fresh.md"), "# Fresh\n");
	// The Mac's watcher indexes it from disk; the host does not.
	assert_eq!(result["version"], version);
	assert_eq!(sb.index.read().unwrap().version(), version);
	let err = sb.call("create_note", json!({ "path": sb.path("note.md"), "content": "x" })).unwrap_err();
	assert!(err.contains("already exists"), "{err}");
	assert_eq!(sb.read("note.md"), NOTE);
}

#[test]
fn folders_are_created_inside_the_vault() {
	let sb = Sandbox::new();
	sb.call("create_folder", json!({ "path": sb.path("a/b") })).unwrap();
	assert!(Path::new(&sb.path("a/b")).is_dir());
	sb.call("plugin:fs|mkdir", json!({ "path": sb.path("c/d"), "options": { "recursive": true } })).unwrap();
	assert!(Path::new(&sb.path("c/d")).is_dir());
	assert!(sb.call("plugin:fs|mkdir", json!({ "path": sb.path("e/f") })).is_err());
	assert!(sb.call("create_folder", json!({ "path": sb.root() })).is_err());
}

#[test]
fn save_snapshot_stores_the_disk_content_not_the_clients() {
	let _guard = DB_LOCK.lock().unwrap();
	let sb = Sandbox::new();
	let db_dir = TempDir::new().unwrap();
	let _ = db::close_database();
	db::open_database(db_dir.path()).unwrap();

	let saved = sb.call("save_snapshot", json!({ "filePath": "note.md", "content": "client claims this" }));
	let history = get_file_history("note.md".into());
	db::close_database().unwrap();
	assert_eq!(saved.unwrap(), json!(true));
	let history = history.unwrap();
	assert_eq!(history.len(), 1);

	db::open_database(db_dir.path()).unwrap();
	let content = get_snapshot_content(history[0].id);
	db::close_database().unwrap();
	assert_eq!(content.unwrap(), NOTE);
}

#[test]
fn save_snapshot_outside_the_vault_is_refused() {
	let sb = Sandbox::new();
	for rel in ["../outside/secret.md", "/etc/hosts", ".kokobrain/settings.json"] {
		assert!(sb.call("save_snapshot", json!({ "filePath": rel, "content": "" })).is_err(), "{rel}");
	}
}

#[test]
fn create_false_does_not_recreate_a_missing_note() {
	let sb = Sandbox::new();
	let err = sb.write_with(&sb.path("folder/gone.md"), "text", None, r#"{"create":false}"#).unwrap_err();
	assert!(!err.starts_with(CONFLICT_PREFIX), "{err}");
	assert!(!Path::new(&sb.path("folder/gone.md")).exists());
	// An existing note is still written on its base.
	sb.write_with(&sb.path("note.md"), "# Note\nbrowser\n", Some(NOTE), r#"{"create":false}"#).unwrap();
	assert_eq!(sb.read("note.md"), "# Note\nbrowser\n");
}

#[test]
fn an_append_write_is_refused() {
	let sb = Sandbox::new();
	assert!(sb.write_with(&sb.path("note.md"), "more", Some(NOTE), r#"{"append":true}"#).is_err());
	assert!(sb.write_with(&sb.path("folder/log.md"), "line", None, r#"{"append":true}"#).is_err());
	assert_eq!(sb.read("note.md"), NOTE);
	assert!(!Path::new(&sb.path("folder/log.md")).exists());
}

#[test]
fn create_new_refuses_an_existing_note() {
	let sb = Sandbox::new();
	assert!(sb.write_with(&sb.path("note.md"), "x", Some(NOTE), r#"{"createNew":true}"#).is_err());
	assert_eq!(sb.read("note.md"), NOTE);
	sb.write_with(&sb.path("folder/fresh.md"), "fresh", None, r#"{"createNew":true}"#).unwrap();
	assert_eq!(sb.read("folder/fresh.md"), "fresh");
}
