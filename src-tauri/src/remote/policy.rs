//! What a browser session may do with each IPC command (proposal D10).
//!
//! `POLICY` lists every command registered with `generate_handler!` and
//! every plugin command the frontend sends. `src/tests/lib/contracts/
//! ipc-parity.test.ts` fails when a registered command is missing here, and
//! `remote-policy-plugins.test.ts` fails when a plugin command the frontend
//! reaches is missing. A `plugin:<name>|*` row classifies every command of
//! that plugin; an exact row wins over it.

/// How the host answers one command from a browser session.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Class {
	/// Runs the desktop's code against the shared state and returns its result.
	Read,
	/// Acknowledged with a plausible result; touches no shared state.
	Virtual,
	/// Refused with an error.
	Denied,
}

/// One row per command. Write arrives with the browser's save (Issue 08).
pub const POLICY: &[(&str, Class)] = &[
	// commands::db: the desktop owns the database.
	("open_vault_db", Class::Virtual),
	("close_vault_db", Class::Virtual),
	// commands::history
	("save_snapshot", Class::Denied),
	("get_file_history", Class::Denied),
	("get_snapshot_content", Class::Denied),
	("compute_diff", Class::Read),
	("cleanup_history", Class::Virtual),
	// commands::vault
	("scan_vault", Class::Read),
	("scan_vault_v2", Class::Denied),
	("scan_vault_v2_cached", Class::Virtual),
	("save_vault_cache", Class::Virtual),
	("get_backlinks_v2", Class::Read),
	("get_relationship_backlinks_v2", Class::Read),
	("get_outgoing_links_v2", Class::Read),
	("get_outgoing_unlinked_mentions_v2", Class::Read),
	("get_all_vault_entries_v2", Class::Read),
	("get_unlinked_mentions_v2", Class::Denied),
	("update_note_in_index", Class::Virtual),
	("propagate_type_rename", Class::Denied),
	("get_all_tags_v2", Class::Read),
	("get_all_tasks_v2", Class::Read),
	("get_tasks_in_section_v2", Class::Read),
	("toggle_task_status", Class::Denied),
	("remove_note_from_index", Class::Virtual),
	("rename_note", Class::Denied),
	("get_all_property_records", Class::Read),
	("get_index_delta", Class::Read),
	("create_note", Class::Denied),
	("create_folder", Class::Denied),
	// commands::watcher: the desktop's watcher stays in place.
	("start_vault_watcher", Class::Virtual),
	("stop_vault_watcher", Class::Virtual),
	// commands::files
	("read_files_batch", Class::Read),
	// commands::search_index
	("build_search_index", Class::Virtual),
	("search_fts", Class::Read),
	("update_search_index_file", Class::Virtual),
	("remove_from_search_index", Class::Virtual),
	// commands::semantic: reported unavailable, so the browser never loads a model.
	("init_semantic_search", Class::Virtual),
	("is_semantic_model_available", Class::Virtual),
	("build_semantic_index", Class::Denied),
	("search_semantic", Class::Denied),
	("search_hybrid", Class::Denied),
	("get_semantic_stats", Class::Denied),
	("get_semantic_file_status", Class::Denied),
	("update_semantic_file", Class::Virtual),
	("remove_semantic_file", Class::Virtual),
	("download_semantic_model", Class::Virtual),
	("is_reranker_model_available", Class::Virtual),
	("download_reranker_model", Class::Virtual),
	("shutdown_semantic", Class::Virtual),
	// Process-wide flags stay the desktop's.
	("set_tauri_debug_mode", Class::Virtual),
	("get_process_memory", Class::Virtual),
	("configure_sentry", Class::Virtual),
	("list_system_fonts", Class::Denied),
	("check_for_update_on_channel", Class::Virtual),
	// The browser must not drive the server it is talking to.
	("start_remote_server", Class::Virtual),
	("stop_remote_server", Class::Virtual),
	// quick_capture: Mac clipboard and windows.
	("capture_clipboard_now", Class::Denied),
	("open_composer", Class::Denied),
	("dismiss_composer", Class::Denied),
	("submit_composer_capture", Class::Denied),
	// plugin:fs, per command; paths are further checked by `fs_path_rule`.
	("plugin:fs|read_text_file", Class::Read),
	("plugin:fs|read_file", Class::Read),
	("plugin:fs|exists", Class::Read),
	("plugin:fs|read_dir", Class::Read),
	("plugin:fs|stat", Class::Read),
	("plugin:fs|write_text_file", Class::Virtual),
	("plugin:fs|write_file", Class::Denied),
	("plugin:fs|mkdir", Class::Denied),
	("plugin:fs|remove", Class::Denied),
	("plugin:fs|rename", Class::Denied),
	("plugin:fs|copy_file", Class::Denied),
	// Window chrome and event wiring are acknowledged; events reach the
	// browser in Issue 07.
	("plugin:window|*", Class::Virtual),
	("plugin:webview|*", Class::Virtual),
	("plugin:event|*", Class::Virtual),
	("plugin:deep-link|*", Class::Virtual),
	("plugin:resources|*", Class::Virtual),
	// Mac-side UI, clipboard, network and process control.
	("plugin:dialog|*", Class::Denied),
	("plugin:opener|*", Class::Denied),
	("plugin:clipboard-manager|*", Class::Denied),
	("plugin:http|*", Class::Denied),
	("plugin:process|*", Class::Denied),
	("plugin:updater|*", Class::Denied),
	("plugin:path|*", Class::Denied),
];

/// The class of `cmd`, `None` when it is not in `POLICY` (treated as Denied).
pub fn classify(cmd: &str) -> Option<Class> {
	if let Some((_, class)) = POLICY.iter().find(|(name, _)| *name == cmd) {
		return Some(*class);
	}
	let (plugin, _) = cmd.split_once('|')?;
	POLICY
		.iter()
		.find(|(name, _)| name.strip_suffix("|*") == Some(plugin))
		.map(|(_, class)| *class)
}

/// What the path rules allow for one fs access.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum PathAccess {
	/// Go ahead (read) or acknowledge (Virtual write).
	Allow,
	/// Refuse.
	Deny,
}

/// The kind of fs access a plugin command makes.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum FsOp {
	/// `exists` / `stat`: metadata only.
	Probe,
	/// `read_text_file` / `read_file` / `read_dir`.
	Read,
	/// `write_text_file`, which the host drops.
	Write,
}

/// The vault's metadata folder.
const META: &str = ".kokobrain";

/// `path` relative to `root`, without the separating `/`; `None` when it is
/// not under `<root>/`.
fn relative<'p>(root: &str, path: &'p str) -> Option<&'p str> {
	path.strip_prefix(root.trim_end_matches('/'))?.strip_prefix('/')
}

/// Whether `path` is in the vault's `.kokobrain/` folder (or is it), however
/// the client spells it: the first non-empty segment is compared without
/// case, as APFS does by default.
pub fn is_meta_path(root: &str, path: &str) -> bool {
	relative(root, path)
		.and_then(|rel| rel.split('/').find(|seg| !seg.is_empty()))
		.is_some_and(|first| first.eq_ignore_ascii_case(META))
}

/// Lexical path rule by prefix (canonical containment is Issue 03). The path
/// must sit inside `<root>/` with no empty, `.` or `..` segment (one trailing
/// `/` is fine). Under `.kokobrain/`, spelled exactly so (a case variant names
/// the same folder on APFS and is refused), only direct `*.json` children may
/// be read or (dropped) written; the directory itself may only be probed
/// (settings save checks it before writing). Any other write is denied.
pub fn fs_path_rule(root: &str, path: &str, op: FsOp) -> PathAccess {
	let Some(rel) = relative(root, path) else {
		return PathAccess::Deny;
	};
	let rel = rel.strip_suffix('/').unwrap_or(rel);
	let segments: Vec<&str> = rel.split('/').collect();
	if segments.iter().any(|seg| seg.is_empty() || *seg == ".." || *seg == ".") || rel.contains('\0') {
		return PathAccess::Deny;
	}
	if segments[0].eq_ignore_ascii_case(META) {
		if segments[0] != META {
			return PathAccess::Deny;
		}
		return match (&segments[1..], op) {
			([], FsOp::Probe) => PathAccess::Allow,
			([child], _) if child.ends_with(".json") => PathAccess::Allow,
			_ => PathAccess::Deny,
		};
	}
	match op {
		FsOp::Write => PathAccess::Deny,
		FsOp::Probe | FsOp::Read => PathAccess::Allow,
	}
}
