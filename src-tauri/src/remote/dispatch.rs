//! Answers one browser `invoke` against the desktop's state (proposal D9):
//! Read runs the desktop's code, Virtual returns a plausible result with no
//! shared-state effect, Write changes the vault through the checked write
//! (`remote::write`), everything else is an error. Tauri-free: the caller
//! hands in the managed `VaultIndexState`.

use std::path::Path;
use std::sync::atomic::{AtomicU32, Ordering};

use serde::de::DeserializeOwned;
use serde_json::{json, Value};

use crate::commands::search_index::IndexStats;
use crate::commands::vault::{index_delta_inner, project_note_record, CachedScanResult, ScanSource};
use crate::vault::index::{match_unlinked_mentions, UpdateResult};
use crate::vault::VaultIndexState;

use super::policy::{
	canonical_in_vault, classify, fs_path_rule, is_meta_path, Class, FsOp, PathAccess, PathArg, PATH_ARGS,
};
use super::write::{create_new, disk_text, write_checked};

/// What one dispatch can see of the desktop.
pub struct HostContext<'a> {
	/// The desktop's vault index (read only).
	pub index: &'a VaultIndexState,
	/// The vault the desktop has open, `None` when none is.
	pub vault_root: Option<String>,
}

/// One `invoke` from the browser, as the stand-in sends it.
#[derive(Debug, Clone, Default)]
pub struct Call {
	/// Command name, `plugin:<name>|<cmd>` for plugin commands.
	pub cmd: String,
	/// The JSON args (`null` for byte-body calls such as `write_text_file`).
	pub args: Value,
	/// `options.headers` of the call (plugin-fs puts the write path there).
	pub headers: Value,
}

/// Ids handed out by the Virtual `plugin:event|listen`.
static NEXT_LISTENER_ID: AtomicU32 = AtomicU32::new(1);

/// Runs `call` under the policy table.
pub fn dispatch(ctx: &HostContext, call: &Call) -> Result<Value, String> {
	let cmd = call.cmd.as_str();
	match classify(cmd) {
		None => Err(format!("Command is not classified for the browser: {cmd}")),
		Some(Class::Denied) => Err(format!("Command is not available in the browser: {cmd}")),
		Some(Class::Virtual) => {
			check_path_args(ctx, call)?;
			virtual_result(ctx, call)
		}
		Some(Class::Read) => {
			check_path_args(ctx, call)?;
			read(ctx, call)
		}
		Some(Class::Write) => {
			check_path_args(ctx, call)?;
			write(ctx, call)
		}
	}
}

/// Refuses `call` when one of its `PATH_ARGS` does not pass, before the
/// command runs. Every `PATH_ARGS` arg is required: a missing or `null` one
/// is refused too, because Virtual commands never parse their args.
fn check_path_args(ctx: &HostContext, call: &Call) -> Result<(), String> {
	let mut rows = PATH_ARGS.iter().filter(|(cmd, _, _)| *cmd == call.cmd).peekable();
	if rows.peek().is_some() {
		root(ctx)?;
	}
	for (_, name, kind) in rows {
		let values: Vec<&Value> = match call.args.get(*name) {
			None | Some(Value::Null) => return Err(format!("Missing argument `{name}`")),
			Some(Value::Array(items)) => items.iter().collect(),
			Some(value) => vec![value],
		};
		for value in values {
			let path = value.as_str().ok_or_else(|| format!("Invalid argument `{name}`: not a path"))?;
			match kind {
				PathArg::Inside => require_vault_path(ctx, path)?,
				PathArg::Root => require_root(ctx, path)?,
				PathArg::Relative => {
					if path.is_empty() || path.starts_with('/') {
						return Err(format!("Path is not available in the browser: {path}"));
					}
					require_vault_path(ctx, &format!("{}/{path}", root(ctx)?.trim_end_matches('/')))?;
				}
			}
		}
	}
	Ok(())
}

/// `path` names the vault the Mac has open, spelled as the Mac spells it.
fn require_root(ctx: &HostContext, path: &str) -> Result<(), String> {
	let root = root(ctx)?.trim_end_matches('/');
	if path.strip_suffix('/').unwrap_or(path) == root {
		Ok(())
	} else {
		Err(format!("Path is not the vault open on the Mac: {path}"))
	}
}

fn arg<T: DeserializeOwned>(args: &Value, name: &str) -> Result<T, String> {
	serde_json::from_value(args.get(name).cloned().unwrap_or(Value::Null))
		.map_err(|e| format!("Invalid argument `{name}`: {e}"))
}

fn to_json<T: serde::Serialize>(value: T) -> Result<Value, String> {
	serde_json::to_value(value).map_err(|e| e.to_string())
}

fn root<'c>(ctx: &'c HostContext) -> Result<&'c str, String> {
	ctx.vault_root.as_deref().ok_or_else(|| "No vault is open on the Mac".to_string())
}

/// The root itself or a path inside it, never under `.kokobrain/` (in any
/// case) or another dot segment and never a name for the settings file (a
/// link to it). Checked on the client's spelling and on the canonical one.
fn require_vault_path(ctx: &HostContext, path: &str) -> Result<(), String> {
	vault_path_rule(root(ctx)?, path, true).map(|_| ())
}

/// The canonical spelling of a vault file the browser may load through
/// `/v1/asset/`: the rule of `require_vault_path`, without the root itself.
/// The file is then read at the canonical path.
pub fn asset_path(root: &str, path: &str) -> Result<String, String> {
	vault_path_rule(root, path, false)
}

/// The one containment rule behind `require_vault_path` and `asset_path`:
/// inside `<root>/` (or the root, with `allow_root`), never under
/// `.kokobrain/` (in any case) or another dot segment and never a name for
/// the settings file. Checked on the client's spelling and on the canonical
/// one; returns the canonical path.
fn vault_path_rule(root: &str, path: &str, allow_root: bool) -> Result<String, String> {
	let refused = || format!("Path is not available in the browser: {path}");
	let allowed = |root: &str, path: &str| {
		(allow_root && path == root.trim_end_matches('/'))
			|| (!is_meta_path(root, path) && fs_path_rule(root, path, FsOp::Read) == PathAccess::Allow)
	};
	if !allowed(root, path) {
		return Err(refused());
	}
	let (canon_root, canon) = canonical_in_vault(root, path).map_err(|e| format!("{}: {e}", refused()))?;
	if allowed(&canon_root, &canon) && !is_settings_file(&canon_root, &canon) {
		Ok(canon)
	} else {
		Err(refused())
	}
}

/// The canonical root and path of a plugin-fs access, after the path rules
/// pass on the client's spelling and on the canonical one.
fn fs_check(ctx: &HostContext, path: &str, op: FsOp) -> Result<(String, String), String> {
	let root = root(ctx)?;
	let refused = || format!("Path is not available in the browser: {path}");
	if fs_path_rule(root, path, op) == PathAccess::Deny {
		return Err(refused());
	}
	let (canon_root, canon) = canonical_in_vault(root, path).map_err(|e| format!("{}: {e}", refused()))?;
	match fs_path_rule(&canon_root, &canon, op) {
		PathAccess::Allow => Ok((canon_root, canon)),
		PathAccess::Deny => Err(refused()),
	}
}

fn virtual_result(ctx: &HostContext, call: &Call) -> Result<Value, String> {
	let index_version = || ctx.index.read().map(|idx| idx.version()).map_err(|e| e.to_string());
	match call.cmd.as_str() {
		"scan_vault_v2_cached" => {
			let entry_count = ctx.index.read().map_err(|e| e.to_string())?.entries().len();
			to_json(CachedScanResult { source: ScanSource::Cache, entry_count, load_ms: 0, files_reread: 0 })
		}
		"update_note_in_index" | "remove_note_from_index" => {
			to_json(UpdateResult { version: index_version()?, ..UpdateResult::default() })
		}
		"build_search_index" => to_json(IndexStats { total_documents: 0, added: 0, updated: 0, removed: 0, unchanged: 0 }),
		"cleanup_history" | "get_process_memory" => Ok(json!(0)),
		"init_semantic_search"
		| "is_semantic_model_available"
		| "is_reranker_model_available"
		| "download_semantic_model"
		| "download_reranker_model" => Ok(json!(false)),
		"plugin:event|listen" => Ok(json!(NEXT_LISTENER_ID.fetch_add(1, Ordering::Relaxed))),
		_ => Ok(Value::Null),
	}
}

/// The canonical spelling of a note or folder the browser writes: the
/// plugin-fs write rule (`fs_check`), never under `.kokobrain/`.
fn note_target(ctx: &HostContext, path: &str) -> Result<String, String> {
	let (canon_root, canon) = fs_check(ctx, path, FsOp::Write)?;
	if is_meta_path(&canon_root, &canon) || is_meta_path(root(ctx)?, path) {
		return Err(format!("Writing is not available in the browser: {path}"));
	}
	Ok(canon)
}

fn write(ctx: &HostContext, call: &Call) -> Result<Value, String> {
	let args = &call.args;
	match call.cmd.as_str() {
		"plugin:fs|write_text_file" => {
			let path = header_path(&call.headers)?;
			let (canon_root, canon) = fs_check(ctx, &path, FsOp::Write)
				.map_err(|_| format!("Writing is not available in the browser: {path}"))?;
			// `.kokobrain/*.json` writes (settings and the like) stay dropped:
			// the Mac's files keep its values.
			if is_meta_path(&canon_root, &canon) {
				return Ok(Value::Null);
			}
			let text: String = arg(args, "text")?;
			let base = call.headers.get("base").and_then(Value::as_str);
			// plugin-fs's `options` header, a JSON string (absent when the
			// caller passed none).
			let options: Value = call
				.headers
				.get("options")
				.and_then(Value::as_str)
				.and_then(|raw| serde_json::from_str(raw).ok())
				.unwrap_or(Value::Null);
			let flag = |key: &str| options.get(key).and_then(Value::as_bool);
			if flag("append") == Some(true) {
				return Err(format!("Appending is not available in the browser: {path}"));
			}
			if flag("createNew") == Some(true) {
				return create_new(Path::new(&canon), &text).map(|_| Value::Null);
			}
			write_checked(Path::new(&canon), &text, base, flag("create") != Some(false)).map(|_| Value::Null)
		}
		"plugin:fs|mkdir" => {
			if args.pointer("/options/baseDir").is_some_and(|v| !v.is_null()) {
				return Err("baseDir paths are not available in the browser".into());
			}
			let canon = note_target(ctx, &arg::<String>(args, "path")?)?;
			let recursive = args.pointer("/options/recursive").and_then(Value::as_bool).unwrap_or(false);
			let made = if recursive { std::fs::create_dir_all(&canon) } else { std::fs::create_dir(&canon) };
			made.map(|_| Value::Null).map_err(|e| format!("failed to create directory {canon}: {e}"))
		}
		"create_note" => {
			let canon = note_target(ctx, &arg::<String>(args, "path")?)?;
			create_new(Path::new(&canon), &arg::<String>(args, "content")?)?;
			// The Mac's watcher indexes the new note from disk.
			let version = ctx.index.read().map(|idx| idx.version()).map_err(|e| e.to_string())?;
			to_json(UpdateResult { version, ..UpdateResult::default() })
		}
		"create_folder" => {
			let canon = note_target(ctx, &arg::<String>(args, "path")?)?;
			std::fs::create_dir_all(&canon).map(|_| Value::Null).map_err(|e| format!("mkdir failed for {canon}: {e}"))
		}
		"save_snapshot" => {
			// The disk content, not the client's: the history must hold what
			// the Mac has, whatever the browser claims it wrote.
			let rel: String = arg(args, "filePath")?;
			let canon = require_vault_file(ctx, &format!("{}/{rel}", root(ctx)?.trim_end_matches('/')))?;
			let bytes = std::fs::read(&canon).map_err(|e| format!("failed to read file at path: {canon}: {e}"))?;
			to_json(crate::commands::history::save_snapshot_blocking(&rel, &disk_text(&bytes))?)
		}
		other => Err(format!("Write command has no browser handler: {other}")),
	}
}

/// The canonical spelling of a vault file, under the rule of `require_vault_path`.
fn require_vault_file(ctx: &HostContext, path: &str) -> Result<String, String> {
	vault_path_rule(root(ctx)?, path, false)
}

/// The percent-encoded `path` header of a plugin-fs byte-body call.
fn header_path(headers: &Value) -> Result<String, String> {
	let raw = headers.get("path").and_then(Value::as_str).ok_or("Missing path header")?;
	percent_decode(raw).ok_or_else(|| "Invalid path header".to_string())
}

/// `text` with its `%XX` escapes decoded; `None` when an escape is
/// malformed or the bytes are not UTF-8.
pub(super) fn percent_decode(text: &str) -> Option<String> {
	let bytes = text.as_bytes();
	let mut out = Vec::with_capacity(bytes.len());
	let mut i = 0;
	while i < bytes.len() {
		if bytes[i] == b'%' {
			let hex = std::str::from_utf8(bytes.get(i + 1..i + 3)?).ok()?;
			out.push(u8::from_str_radix(hex, 16).ok()?);
			i += 3;
		} else {
			out.push(bytes[i]);
			i += 1;
		}
	}
	String::from_utf8(out).ok()
}

fn read(ctx: &HostContext, call: &Call) -> Result<Value, String> {
	let args = &call.args;
	let index = || ctx.index.read().map_err(|e| format!("VaultIndex lock poisoned: {e}"));
	match call.cmd.as_str() {
		"scan_vault" => {
			to_json(crate::commands::vault::scan_vault_inner(arg(args, "path")?, arg(args, "sortBy")?)?)
		}
		"read_files_batch" => {
			// The host's root, never the client's `vaultPath` (checked by the path gate).
			let paths: Vec<String> = arg(args, "paths")?;
			to_json(crate::commands::files::read_files_batch(root(ctx)?.to_string(), paths)?)
		}
		"search_fts" => {
			root(ctx)?;
			// The command's own defaults; the session thread calls the sync body.
			let query: String = arg(args, "query")?;
			let max_results: Option<usize> = arg(args, "maxResults")?;
			let fuzzy: Option<bool> = arg(args, "fuzzy")?;
			let trimmed = query.trim();
			if trimmed.is_empty() {
				return to_json(Vec::<crate::commands::search_index::FtsSearchResult>::new());
			}
			to_json(crate::commands::search_index::search_fts_inner(
				trimmed,
				max_results.unwrap_or(50),
				fuzzy.unwrap_or(false),
			)?)
		}
		"compute_diff" => to_json(crate::commands::history::compute_diff(
			arg(args, "oldContent")?,
			arg(args, "newContent")?,
		)?),
		"get_backlinks_v2" => to_json(index()?.lookup_backlinks(&arg::<String>(args, "path")?)),
		"get_relationship_backlinks_v2" => {
			to_json(index()?.lookup_relationship_backlinks(&arg::<String>(args, "path")?))
		}
		"get_outgoing_links_v2" => to_json(index()?.lookup_outgoing_links(&arg::<String>(args, "path")?)),
		"get_outgoing_unlinked_mentions_v2" => to_json(
			index()?.lookup_outgoing_unlinked_mentions(&arg::<String>(args, "path")?, &arg::<String>(args, "content")?),
		),
		"get_unlinked_mentions_v2" => {
			// As the desktop command: candidates under the lock, disk reads without it.
			let path: String = arg(args, "path")?;
			let candidates = index()?.unlinked_mentions_candidates(&path);
			let matched = match_unlinked_mentions(&candidates.note_name, candidates.candidate_paths);
			let mut out = index()?.lookup_entries(&matched);
			out.sort_by_key(|a| a.title.to_lowercase());
			to_json(out)
		}
		"get_all_vault_entries_v2" => {
			let idx = index()?;
			let mut out: Vec<_> = idx.entries().values().cloned().collect();
			out.sort_by(|a, b| a.path.cmp(&b.path));
			to_json(out)
		}
		"get_all_tags_v2" => to_json(index()?.lookup_all_tags()),
		"get_all_tasks_v2" => to_json(index()?.lookup_all_tasks()),
		"get_all_property_records" => {
			let idx = index()?;
			let mut out: Vec<_> = idx.entries().values().map(project_note_record).collect();
			out.sort_by(|a, b| a.path.cmp(&b.path));
			to_json(out)
		}
		"get_index_delta" => to_json(index_delta_inner(&*index()?, &arg::<Vec<String>>(args, "paths")?)),
		"plugin:fs|read_text_file" | "plugin:fs|read_file" => {
			let (canon_root, path) = fs_arg_path(ctx, args, FsOp::Read)?;
			let bytes = std::fs::read(&path).map_err(|e| format!("failed to read file at path: {path}: {e}"))?;
			Ok(json!(redact_settings(&canon_root, &path, bytes)))
		}
		"plugin:fs|exists" => {
			let (_, path) = fs_arg_path(ctx, args, FsOp::Probe)?;
			// Follows links, as plugin-fs does: a dangling link does not exist.
			std::path::Path::new(&path)
				.try_exists()
				.map(|found| json!(found))
				.map_err(|e| format!("failed to check path {path}: {e}"))
		}
		"plugin:fs|read_dir" => {
			let (_, path) = fs_arg_path(ctx, args, FsOp::Read)?;
			let mut out = Vec::new();
			for entry in std::fs::read_dir(&path).map_err(|e| format!("failed to read directory {path}: {e}"))? {
				let entry = entry.map_err(|e| e.to_string())?;
				let ft = entry.file_type().map_err(|e| e.to_string())?;
				out.push(json!({
					"name": entry.file_name().to_string_lossy(),
					"isDirectory": ft.is_dir(),
					"isFile": ft.is_file(),
					"isSymlink": ft.is_symlink(),
				}));
			}
			Ok(Value::Array(out))
		}
		"plugin:fs|stat" => {
			let (_, path) = fs_arg_path(ctx, args, FsOp::Probe)?;
			let meta = std::fs::metadata(&path).map_err(|e| format!("failed to get metadata of path {path}: {e}"))?;
			Ok(file_info(&meta))
		}
		other => Err(format!("Read command has no browser handler: {other}")),
	}
}

/// The canonical root and path of a plugin-fs call's `path` arg, after the
/// path rules (`fs_check`); the call then runs on the canonical path. A
/// `baseDir` option (paths relative to the Mac's app folders) is refused.
fn fs_arg_path(ctx: &HostContext, args: &Value, op: FsOp) -> Result<(String, String), String> {
	if args.pointer("/options/baseDir").is_some_and(|v| !v.is_null()) {
		return Err("baseDir paths are not available in the browser".into());
	}
	let path: String = arg(args, "path")?;
	fs_check(ctx, &path, op)
}

/// Whether `path` names the vault's settings file: spelled so in any case
/// (APFS ignores case), or the same file on disk (a symlink or hard link).
fn is_settings_file(root: &str, path: &str) -> bool {
	let settings = format!("{}/.kokobrain/settings.json", root.trim_end_matches('/'));
	if path.eq_ignore_ascii_case(&settings) {
		return true;
	}
	#[cfg(unix)]
	{
		use std::os::unix::fs::MetadataExt;
		if let (Ok(a), Ok(b)) = (std::fs::metadata(path), std::fs::metadata(&settings)) {
			return a.dev() == b.dev() && a.ino() == b.ino();
		}
	}
	false
}

/// The vault's `settings.json` with `todoist.apiToken` blanked; any other
/// file unchanged. Which file was read decides, not how the path is spelled
/// (`is_settings_file`). A settings file that does not parse is served as is.
fn redact_settings(root: &str, path: &str, bytes: Vec<u8>) -> Vec<u8> {
	if !is_settings_file(root, path) {
		return bytes;
	}
	let Ok(mut value) = serde_json::from_slice::<Value>(&bytes) else { return bytes };
	if let Some(token) = value.pointer_mut("/todoist/apiToken") {
		*token = json!("");
	}
	serde_json::to_vec_pretty(&value).unwrap_or(bytes)
}

fn millis(time: std::io::Result<std::time::SystemTime>) -> Value {
	time.ok()
		.and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
		.map(|d| json!(d.as_millis() as u64))
		.unwrap_or(Value::Null)
}

/// The `FileInfo` shape plugin-fs returns for `stat`.
fn file_info(meta: &std::fs::Metadata) -> Value {
	#[cfg(unix)]
	use std::os::unix::fs::MetadataExt;
	let mut info = json!({
		"isFile": meta.is_file(),
		"isDirectory": meta.is_dir(),
		"isSymlink": meta.file_type().is_symlink(),
		"size": meta.len(),
		"mtime": millis(meta.modified()),
		"atime": millis(meta.accessed()),
		"birthtime": millis(meta.created()),
		"readonly": meta.permissions().readonly(),
		"fileAttributes": Value::Null,
	});
	#[cfg(unix)]
	{
		let extra = json!({
			"dev": meta.dev(), "ino": meta.ino(), "mode": meta.mode(), "nlink": meta.nlink(),
			"uid": meta.uid(), "gid": meta.gid(), "rdev": meta.rdev(),
			"blksize": meta.blksize(), "blocks": meta.blocks(),
		});
		if let (Some(info), Some(extra)) = (info.as_object_mut(), extra.as_object()) {
			info.extend(extra.clone());
		}
	}
	info
}
