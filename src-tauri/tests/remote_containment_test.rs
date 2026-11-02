//! Containment of browser calls (`remote::dispatch`, `remote::policy`):
//! every path a browser sends is resolved on disk and must stay inside the
//! vault the Mac has open, whatever links or spellings it goes through.
#![cfg(unix)]

use std::fs;
use std::os::unix::fs::symlink;
use std::sync::RwLock;

use kokobrain_lib::commands::vault::scan_vault_v2_inner;
use kokobrain_lib::remote::dispatch::{dispatch, Call, HostContext};
use kokobrain_lib::vault::index::VaultIndex;
use kokobrain_lib::vault::VaultIndexState;
use serde_json::{json, Value};
use tempfile::TempDir;

/// `<base>/vault` (the open vault) next to `<base>/outside` (a secret).
struct Sandbox {
	base: TempDir,
	index: VaultIndexState,
}

impl Sandbox {
	fn new() -> Self {
		let base = TempDir::new().unwrap();
		let vault = base.path().join("vault");
		fs::create_dir_all(vault.join("folder")).unwrap();
		fs::write(vault.join("note.md"), "# Note\n").unwrap();
		fs::write(vault.join("folder/other.md"), "other").unwrap();
		fs::create_dir(vault.join(".kokobrain")).unwrap();
		fs::write(vault.join(".kokobrain/settings.json"), r#"{"todoist":{"apiToken":"secret-token"}}"#).unwrap();
		fs::write(vault.join(".kokobrain/kokobrain.db"), "db").unwrap();
		fs::create_dir(vault.join(".git")).unwrap();
		fs::write(vault.join(".git/config"), "[core]").unwrap();
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

	fn link(&self, target: &str, rel: &str) {
		symlink(target, self.path(rel)).unwrap();
	}

	fn call_with(&self, cmd: &str, args: Value, headers: Value) -> Result<Value, String> {
		let ctx = HostContext { index: &self.index, vault_root: Some(self.root()) };
		dispatch(&ctx, &Call { cmd: cmd.into(), args, headers })
	}

	fn call(&self, cmd: &str, args: Value) -> Result<Value, String> {
		self.call_with(cmd, args, Value::Null)
	}

	/// Every fs read and probe of `path`, each of which must be refused
	/// with an error (never `false`, `[]` or empty bytes).
	fn assert_refused(&self, path: &str) {
		for cmd in ["plugin:fs|read_text_file", "plugin:fs|read_file", "plugin:fs|exists", "plugin:fs|stat", "plugin:fs|read_dir"] {
			let reply = self.call(cmd, json!({ "path": path }));
			let err = reply.expect_err(&format!("{cmd} {path} was not refused"));
			assert!(!err.is_empty(), "{cmd} {path}: empty error");
		}
	}

	fn write(&self, path: &str) -> Result<Value, String> {
		let headers = json!({ "path": path.replace('/', "%2F") });
		self.call_with("plugin:fs|write_text_file", Value::Null, headers)
	}
}

fn text(reply: &Value) -> String {
	let bytes: Vec<u8> = serde_json::from_value(reply.clone()).unwrap();
	String::from_utf8(bytes).unwrap()
}

fn leaks(reply: Result<Value, String>) -> bool {
	reply.is_ok_and(|v| v.to_string().contains("secret") || text(&v).contains("secret-token"))
}

#[test]
fn reads_inside_the_vault_still_work_through_a_linked_tmp_root() {
	// macOS temp dirs sit under /var, a link to /private/var: the host's own
	// root may be a link.
	let sb = Sandbox::new();
	assert_eq!(text(&sb.call("plugin:fs|read_text_file", json!({ "path": sb.path("note.md") })).unwrap()), "# Note\n");
	assert_eq!(sb.call("plugin:fs|exists", json!({ "path": sb.path("missing.md") })).unwrap(), json!(false));
	assert_eq!(sb.call("plugin:fs|read_dir", json!({ "path": sb.path("folder") })).unwrap()[0]["name"], "other.md");
	sb.link(&sb.path("folder"), "inner");
	assert_eq!(text(&sb.call("plugin:fs|read_file", json!({ "path": sb.path("inner/other.md") })).unwrap()), "other");
}

#[test]
fn dot_dot_traversal_is_refused() {
	let sb = Sandbox::new();
	sb.assert_refused(&sb.path("../outside/secret.md"));
	sb.assert_refused(&sb.path("folder/../../outside/secret.md"));
	sb.assert_refused(&sb.path("folder/../note.md"));
}

#[test]
fn absolute_paths_outside_the_vault_are_refused() {
	let sb = Sandbox::new();
	sb.assert_refused(&sb.base("outside/secret.md"));
	sb.assert_refused(&sb.base("outside"));
	sb.assert_refused("/etc/hosts");
	sb.assert_refused(&sb.base("vault2/x.md"));
}

#[test]
fn a_link_that_escapes_the_vault_is_refused() {
	let sb = Sandbox::new();
	sb.link(&sb.base("outside"), "out");
	sb.link(&sb.base("outside/secret.md"), "secret.md");
	sb.link(&sb.base("outside/missing.md"), "dangling.md");
	sb.link("../outside/secret.md", "relative.md");
	for rel in ["out", "out/secret.md", "out/missing.md", "secret.md", "dangling.md", "relative.md"] {
		sb.assert_refused(&sb.path(rel));
	}
	assert!(sb.write(&sb.path("out/x.json")).is_err());
}

#[test]
fn a_dangling_link_inside_the_vault_still_does_not_exist() {
	let sb = Sandbox::new();
	sb.link(&sb.path("gone.md"), "dangling.md");
	assert_eq!(sb.call("plugin:fs|exists", json!({ "path": sb.path("dangling.md") })).unwrap(), json!(false));
}

#[test]
fn a_symlinked_vault_root_is_refused() {
	let sb = Sandbox::new();
	symlink(sb.root(), sb.base("alias")).unwrap();
	sb.assert_refused(&sb.base("alias/note.md"));
	assert!(sb.call("scan_vault", json!({ "path": sb.base("alias"), "sortBy": "name" })).is_err());
	let batch = json!({ "vaultPath": sb.base("alias"), "paths": [sb.base("alias/note.md")] });
	assert!(sb.call("read_files_batch", batch).is_err());
	assert!(sb.call("get_backlinks_v2", json!({ "path": sb.base("alias/note.md") })).is_err());
	// A link inside the vault to its root resolves to the root itself.
	sb.link(&sb.root(), "self");
	assert!(sb.write(&sb.path("self")).is_err());
	sb.assert_refused(&sb.path("self/.kokobrain/settings.json"));
}

#[test]
fn a_case_variant_that_escapes_is_refused() {
	let sb = Sandbox::new();
	// On a case-insensitive volume `VAULT` is the vault; on a sensitive one it
	// is a separate folder. Either way the client did not name the open root.
	if fs::create_dir(sb.base("VAULT")).is_ok() {
		fs::write(sb.base("VAULT/secret.md"), "outside-secret").unwrap();
	}
	sb.assert_refused(&sb.base("VAULT/secret.md"));
	sb.assert_refused(&sb.base("VAULT/note.md"));
	sb.link(&sb.base("OUTSIDE"), "up");
	sb.assert_refused(&sb.path("up/secret.md"));
	sb.assert_refused(&sb.base("vault/../OUTSIDE/secret.md"));
}

#[test]
fn links_into_dot_directories_get_their_rules() {
	let sb = Sandbox::new();
	sb.link(&sb.path(".kokobrain"), "meta");
	sb.link(&sb.path(".git"), "git");
	let settings = sb.call("plugin:fs|read_text_file", json!({ "path": sb.path("meta/settings.json") }));
	assert!(!leaks(settings.clone()), "settings leaked through a link");
	assert!(text(&settings.unwrap()).contains("apiToken"));
	sb.assert_refused(&sb.path("meta/kokobrain.db"));
	assert!(sb.call("plugin:fs|read_dir", json!({ "path": sb.path("meta") })).is_err());
	sb.assert_refused(&sb.path("git/config"));
	sb.assert_refused(&sb.path("git"));
	assert!(sb.write(&sb.path("meta")).is_err());
	assert!(sb.write(&sb.path("git/config")).is_err());
}

#[test]
fn writes_are_refused_on_the_root_and_the_meta_and_git_directories() {
	let sb = Sandbox::new();
	for path in [sb.root(), sb.path(""), sb.path(".kokobrain"), sb.path(".kokobrain/"), sb.path(".git"), sb.path(".git/")] {
		assert!(sb.write(&path).is_err(), "{path}");
	}
	for cmd in ["plugin:fs|mkdir", "plugin:fs|remove", "plugin:fs|rename", "plugin:fs|write_file"] {
		for path in [sb.root(), sb.path(".kokobrain"), sb.path(".git")] {
			assert!(sb.call(cmd, json!({ "path": path, "oldPath": path, "newPath": path })).is_err(), "{cmd} {path}");
		}
	}
	assert!(fs::metadata(sb.path(".git/config")).is_ok() && fs::metadata(sb.path(".kokobrain/settings.json")).is_ok());
	// The .kokobrain/*.json rule from 02 still holds.
	assert_eq!(sb.write(&sb.path(".kokobrain/settings.json")).unwrap(), Value::Null);
}

#[test]
fn reads_under_other_dot_directories_are_refused() {
	let sb = Sandbox::new();
	fs::create_dir(sb.path(".obsidian")).unwrap();
	fs::write(sb.path(".obsidian/app.json"), "{}").unwrap();
	for rel in [".git", ".git/config", ".obsidian", ".obsidian/app.json"] {
		sb.assert_refused(&sb.path(rel));
	}
}

#[test]
fn no_spelling_of_the_settings_file_reaches_the_browser_unredacted() {
	let sb = Sandbox::new();
	for rel in [
		".KOKOBRAIN/settings.json",
		".kokobrain/SETTINGS.json",
		// KELVIN SIGN, the NFC/NFD variant: its canonical decomposition is
		// `K`, and APFS folds it to `k`.
		".\u{212A}okobrain/settings.json",
		// LATIN SMALL LETTER LONG S, which case-folds to `s`.
		".kokobrain/\u{017F}ettings.json",
		".kokobrain/../.kokobrain/settings.json",
		".kokobrain//settings.json",
		"/.kokobrain/settings.json",
		".kokobrain/settings.json/",
		".kokobrain/./settings.json",
	] {
		for cmd in ["plugin:fs|read_text_file", "plugin:fs|read_file"] {
			assert!(!leaks(sb.call(cmd, json!({ "path": sb.path(rel) }))), "{cmd} {rel}");
		}
		let batch = json!({ "vaultPath": sb.root(), "paths": [sb.path(rel)] });
		assert!(!leaks(sb.call("read_files_batch", batch)), "read_files_batch {rel}");
	}
	// An unrelated non-ASCII dot-dir is refused like any other dot-dir.
	sb.assert_refused(&sb.path(".kokobrain\u{0301}/settings.json"));
}

#[test]
fn every_path_command_is_refused_with_no_vault_open() {
	let sb = Sandbox::new();
	let ctx = HostContext { index: &sb.index, vault_root: None };
	let note = sb.path("note.md");
	for (cmd, args) in [
		("plugin:fs|read_text_file", json!({ "path": note })),
		("plugin:fs|exists", json!({ "path": note })),
		("plugin:fs|read_dir", json!({ "path": sb.root() })),
		("scan_vault", json!({ "path": sb.root(), "sortBy": "name" })),
		("read_files_batch", json!({ "vaultPath": sb.root(), "paths": [note] })),
		("get_backlinks_v2", json!({ "path": note })),
		("get_outgoing_links_v2", json!({ "path": note })),
		("get_unlinked_mentions_v2", json!({ "path": note })),
		("get_index_delta", json!({ "paths": [note] })),
		("update_note_in_index", json!({ "path": note, "content": "" })),
		("open_vault_db", json!({ "vaultPath": sb.root() })),
		("remove_from_search_index", json!({ "filePath": "note.md" })),
		("search_fts", json!({ "query": "x" })),
		// Virtual commands that leave their path arg out.
		("update_note_in_index", json!({})),
		("start_vault_watcher", json!({ "path": null })),
		("scan_vault_v2_cached", json!({})),
	] {
		let call = Call { cmd: cmd.into(), args, headers: Value::Null };
		let err = dispatch(&ctx, &call).expect_err(cmd);
		assert!(err.contains("No vault"), "{cmd}: {err}");
	}
}

#[test]
fn a_missing_path_arg_is_refused() {
	let sb = Sandbox::new();
	for (cmd, args) in [
		("update_note_in_index", json!({ "content": "" })),
		("start_vault_watcher", json!({})),
		("scan_vault_v2_cached", json!({ "path": null })),
		("read_files_batch", json!({ "paths": [sb.path("note.md")] })),
		("remove_from_search_index", json!({})),
	] {
		let err = sb.call(cmd, args).expect_err(cmd);
		assert!(err.contains("Missing argument"), "{cmd}: {err}");
	}
}

#[test]
fn tauri_command_paths_are_checked_against_the_host_root() {
	let sb = Sandbox::new();
	let outside = sb.base("outside/secret.md");
	sb.link(&sb.base("outside"), "out");
	for (cmd, args) in [
		("scan_vault", json!({ "path": sb.base("outside"), "sortBy": "name" })),
		("scan_vault", json!({ "path": sb.path("out"), "sortBy": "name" })),
		("scan_vault", json!({ "path": sb.path(".git"), "sortBy": "name" })),
		("read_files_batch", json!({ "vaultPath": sb.base("outside"), "paths": [outside] })),
		("read_files_batch", json!({ "vaultPath": sb.root(), "paths": [sb.path("out/secret.md")] })),
		("get_backlinks_v2", json!({ "path": outside })),
		("get_relationship_backlinks_v2", json!({ "path": sb.path("out/secret.md") })),
		("get_outgoing_links_v2", json!({ "path": sb.path("../outside/secret.md") })),
		("get_outgoing_unlinked_mentions_v2", json!({ "path": outside, "content": "" })),
		("get_unlinked_mentions_v2", json!({ "path": outside })),
		("get_index_delta", json!({ "paths": [sb.path("note.md"), outside] })),
		("update_note_in_index", json!({ "path": outside, "content": "" })),
		("remove_note_from_index", json!({ "path": outside })),
		("start_vault_watcher", json!({ "path": sb.base("outside") })),
		("open_vault_db", json!({ "vaultPath": sb.base("outside") })),
		("open_vault_db", json!({ "vaultPath": sb.path("folder") })),
		("build_search_index", json!({ "vaultPath": sb.base("outside") })),
		("init_semantic_search", json!({ "vaultPath": sb.base("outside") })),
		("update_search_index_file", json!({ "filePath": "../outside/secret.md", "content": "", "vaultPath": sb.root() })),
		("remove_from_search_index", json!({ "filePath": "/etc/hosts" })),
		("remove_semantic_file", json!({ "filePath": "out/secret.md" })),
		("update_semantic_file", json!({ "filePath": "note.md", "content": "", "vaultPath": sb.base("outside") })),
	] {
		let reply = sb.call(cmd, args.clone());
		assert!(reply.is_err(), "{cmd} {args} was not refused: {reply:?}");
	}
	// The same calls inside the vault go through.
	let batch = sb.call("read_files_batch", json!({ "vaultPath": sb.root(), "paths": [sb.path("note.md")] })).unwrap();
	assert!(batch.to_string().contains("# Note"), "{batch}");
	assert!(sb.call("get_index_delta", json!({ "paths": [sb.path("note.md"), sb.path("gone.md")] })).is_ok());
	assert!(sb.call("remove_from_search_index", json!({ "filePath": "folder/other.md" })).is_ok());
	assert!(sb.call("open_vault_db", json!({ "vaultPath": sb.root() })).is_ok());
}
