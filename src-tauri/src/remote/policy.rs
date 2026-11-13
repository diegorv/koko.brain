//! What a browser session may do with each IPC command (proposal D10).
//!
//! `POLICY` lists every command registered with `generate_handler!` and
//! every plugin command the frontend sends. `src/tests/lib/contracts/
//! ipc-parity.test.ts` fails when a registered command is missing here, and
//! `remote-policy-plugins.test.ts` fails when a plugin command the frontend
//! reaches is missing. A `plugin:<name>|*` row classifies every command of
//! that plugin; an exact row wins over it.

use std::ffi::OsString;
use std::path::{Component, Path, PathBuf};

/// How the host answers one command from a browser session.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Class {
	/// Runs the desktop's code against the shared state and returns its result.
	Read,
	/// Acknowledged with a plausible result; touches no shared state.
	Virtual,
	/// Writes to the vault through the host's checked write
	/// (`remote::write`): a note write lands only on the version the
	/// browser's tab is based on.
	Write,
	/// Refused with an error.
	Denied,
}

/// One row per command.
pub const POLICY: &[(&str, Class)] = &[
	// commands::db: the desktop owns the database.
	("open_vault_db", Class::Virtual),
	("close_vault_db", Class::Virtual),
	// commands::history
	// The host snapshots the disk content, not the client's.
	("save_snapshot", Class::Write),
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
	("get_unlinked_mentions_v2", Class::Read),
	("update_note_in_index", Class::Virtual),
	("propagate_type_rename", Class::Denied),
	("get_all_tags_v2", Class::Read),
	("get_all_tasks_v2", Class::Read),
	("toggle_task_status", Class::Denied),
	("write_task_lines", Class::Denied),
	("write_task_text", Class::Denied),
	("remove_note_from_index", Class::Virtual),
	("rename_note", Class::Denied),
	("get_all_property_records", Class::Read),
	("get_index_delta", Class::Read),
	("create_note", Class::Write),
	("create_folder", Class::Write),
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
	("rename_in_search_index", Class::Virtual),
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
	("set_main_thread_heartbeat", Class::Virtual),
	("get_process_memory", Class::Virtual),
	("configure_sentry", Class::Virtual),
	("list_system_fonts", Class::Denied),
	("check_for_update_on_channel", Class::Virtual),
	// The browser must not drive the server it is talking to.
	("start_remote_server", Class::Virtual),
	("stop_remote_server", Class::Virtual),
	// commands::app_exit: only the desktop's own flush may let its exit go on.
	("confirm_exit", Class::Denied),
	// quick_capture: Mac clipboard and windows.
	("capture_clipboard_now", Class::Denied),
	("open_composer", Class::Denied),
	("dismiss_composer", Class::Denied),
	("submit_composer_capture", Class::Denied),
	("import_staged_shot", Class::Denied),
	("report_composer_capture_result", Class::Denied),
	// Vault mods run on the desktop only.
	("read_mod_data", Class::Denied),
	("write_mod_data", Class::Denied),
	// Todoist sync is the desktop's.
	("todoist_read_kv", Class::Denied),
	("todoist_read_links", Class::Denied),
	("todoist_read_sections", Class::Denied),
	("todoist_read_log", Class::Denied),
	("todoist_append_log", Class::Denied),
	("todoist_commit_state", Class::Denied),
	// plugin:fs, per command; paths are further checked by `fs_path_rule`.
	("plugin:fs|read_text_file", Class::Read),
	("plugin:fs|read_file", Class::Read),
	("plugin:fs|exists", Class::Read),
	("plugin:fs|read_dir", Class::Read),
	("plugin:fs|stat", Class::Read),
	("plugin:fs|write_text_file", Class::Write),
	("plugin:fs|write_file", Class::Denied),
	("plugin:fs|mkdir", Class::Write),
	("plugin:fs|remove", Class::Denied),
	("plugin:fs|rename", Class::Denied),
	("plugin:fs|copy_file", Class::Denied),
	// Window chrome and event wiring are acknowledged; the allowlisted events
	// reach the browser as session frames (`remote::events`).
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
	/// Go ahead.
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
	/// `write_text_file` / `mkdir` (a `.kokobrain/` write is dropped).
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

/// Path rule on one spelling of a path; the dispatcher applies it to the
/// client's spelling and again to the canonical one (`canonical_in_vault`).
/// The path must sit inside `<root>/` (the root itself is refused) with no
/// empty, `.` or `..` segment (one trailing `/` is fine). Under `.kokobrain/`,
/// spelled exactly so (a case variant names the same folder on APFS and is
/// refused), only direct `*.json` children may be read or (dropped) written;
/// the directory itself may only be probed (settings save checks it before
/// writing). Any other dot segment (`.git`, other dot-dirs, dot-files) is
/// refused for every op; `scan_vault` never lists them. Any other path in the
/// vault may be read and written (a write then goes through the checked
/// write, `remote::write`). On APFS every spelling of `.kokobrain` starts with an ASCII `.`, so
/// this lexical pass is the first line; the guarantee is the re-check on the
/// canonical spelling, which also covers file systems that ignore some code
/// points when comparing names (HFS+, not tested).
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
			([child], _) if child.ends_with(".json") && !child.starts_with('.') => PathAccess::Allow,
			_ => PathAccess::Deny,
		};
	}
	if segments.iter().any(|seg| seg.starts_with('.')) {
		return PathAccess::Deny;
	}
	PathAccess::Allow
}

/// How a Tauri command's path argument is checked.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum PathArg {
	/// An absolute host path: the vault root or a path inside it, never under
	/// a dot segment and never a name for the settings file.
	Inside,
	/// Must name the open vault root itself.
	Root,
	/// A vault-relative key (FTS5 / semantic rows), checked as `<root>/<key>`.
	Relative,
}

/// Every path-like argument (string, or array of strings) of every command a
/// browser may run (Read or Virtual), by its JSON name. The dispatcher refuses
/// the call before it runs when one does not pass. `ipc-parity.test.ts` fails
/// when an arg whose name contains `path` has no row here; plugin-fs paths are
/// checked by `fs_path_rule` instead.
pub const PATH_ARGS: &[(&str, &str, PathArg)] = &[
	("open_vault_db", "vaultPath", PathArg::Root),
	("scan_vault", "path", PathArg::Inside),
	("scan_vault_v2_cached", "path", PathArg::Root),
	("save_vault_cache", "path", PathArg::Root),
	("get_backlinks_v2", "path", PathArg::Inside),
	("get_relationship_backlinks_v2", "path", PathArg::Inside),
	("get_outgoing_links_v2", "path", PathArg::Inside),
	("get_outgoing_unlinked_mentions_v2", "path", PathArg::Inside),
	("get_unlinked_mentions_v2", "path", PathArg::Inside),
	("update_note_in_index", "path", PathArg::Inside),
	("remove_note_from_index", "path", PathArg::Inside),
	("get_index_delta", "paths", PathArg::Inside),
	("create_note", "path", PathArg::Inside),
	("create_folder", "path", PathArg::Inside),
	("save_snapshot", "filePath", PathArg::Relative),
	("start_vault_watcher", "path", PathArg::Root),
	("read_files_batch", "vaultPath", PathArg::Root),
	("read_files_batch", "paths", PathArg::Inside),
	("build_search_index", "vaultPath", PathArg::Root),
	("update_search_index_file", "filePath", PathArg::Relative),
	("update_search_index_file", "vaultPath", PathArg::Root),
	("remove_from_search_index", "filePath", PathArg::Relative),
	("init_semantic_search", "vaultPath", PathArg::Root),
	("is_semantic_model_available", "vaultPath", PathArg::Root),
	("is_reranker_model_available", "vaultPath", PathArg::Root),
	("download_semantic_model", "vaultPath", PathArg::Root),
	("download_reranker_model", "vaultPath", PathArg::Root),
	("update_semantic_file", "filePath", PathArg::Relative),
	("update_semantic_file", "vaultPath", PathArg::Root),
	("remove_semantic_file", "filePath", PathArg::Relative),
];

/// Links followed while resolving one path, as `MAXSYMLINKS` on macOS.
const MAX_LINKS: u32 = 32;

/// `path` with every link resolved: the deepest existing ancestor is
/// canonicalized and the missing rest appended. A dangling link is followed
/// to its target, so it cannot point a later read or write out of the vault.
fn resolve(path: &Path, hops: u32) -> Result<PathBuf, String> {
	let mut existing = path.to_path_buf();
	let mut tail: Vec<OsString> = Vec::new();
	loop {
		if let Ok(canon) = existing.canonicalize() {
			let mut out = canon;
			out.extend(tail.iter().rev());
			return Ok(out);
		}
		if let Ok(target) = std::fs::read_link(&existing) {
			if hops == 0 {
				return Err("Too many links".into());
			}
			let mut next = existing.parent().unwrap_or(Path::new("/")).join(target);
			next.extend(tail.iter().rev());
			return resolve(&next, hops - 1);
		}
		match existing.components().next_back() {
			Some(Component::Normal(name)) => tail.push(name.to_os_string()),
			// `..` or `.` in a missing part cannot be resolved without guessing.
			_ => return Err("Path cannot be resolved".into()),
		}
		existing.pop();
	}
}

/// The canonical vault root and the canonical spelling of `path`: every link
/// resolved, on disk. Refused when the root cannot be resolved or `path` does
/// not resolve to the root or a path under it. Both come from the same
/// resolver, so a contained path always starts with the root's components;
/// no case-folded comparison is needed, and a spelling it cannot match is
/// refused, the safe side.
pub fn canonical_in_vault(root: &str, path: &str) -> Result<(String, String), String> {
	let canon_root = Path::new(root).canonicalize().map_err(|e| format!("The vault folder is not available: {e}"))?;
	let canon = resolve(Path::new(path), MAX_LINKS)?;
	if !canon.starts_with(&canon_root) {
		return Err("Path is outside the vault".into());
	}
	match (canon_root.to_str(), canon.to_str()) {
		(Some(r), Some(p)) => Ok((r.to_string(), p.to_string())),
		_ => Err("Path is not valid UTF-8".into()),
	}
}
