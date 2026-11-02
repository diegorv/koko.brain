//! Answers one browser `invoke` against the desktop's state (proposal D9):
//! Read runs the desktop's code, Virtual returns a plausible result with no
//! shared-state effect, everything else is an error. Tauri-free: the caller
//! hands in the managed `VaultIndexState`.

use std::sync::atomic::{AtomicU32, Ordering};

use serde::de::DeserializeOwned;
use serde_json::{json, Value};

use crate::commands::search_index::IndexStats;
use crate::commands::vault::{index_delta_inner, project_note_record, CachedScanResult, ScanSource};
use crate::vault::index::UpdateResult;
use crate::vault::VaultIndexState;

use super::policy::{classify, fs_path_rule, is_meta_path, Class, FsOp, PathAccess};

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
		Some(Class::Virtual) => virtual_result(ctx, call),
		Some(Class::Read) => read(ctx, call),
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
/// case) and never a name for the settings file (a link to it).
fn require_vault_path(ctx: &HostContext, path: &str) -> Result<(), String> {
	let root = root(ctx)?;
	if path == root.trim_end_matches('/') {
		return Ok(());
	}
	let allowed = !is_meta_path(root, path)
		&& fs_path_rule(root, path, FsOp::Read) == PathAccess::Allow
		&& !is_settings_file(root, path);
	if allowed {
		Ok(())
	} else {
		Err(format!("Path is not available in the browser: {path}"))
	}
}

fn virtual_result(ctx: &HostContext, call: &Call) -> Result<Value, String> {
	let index_version = || ctx.index.read().map(|idx| idx.version()).map_err(|e| e.to_string());
	match call.cmd.as_str() {
		"plugin:fs|write_text_file" => {
			let path = header_path(&call.headers)?;
			match fs_path_rule(root(ctx)?, &path, FsOp::Write) {
				PathAccess::Allow => Ok(Value::Null),
				PathAccess::Deny => Err(format!("Writing is not available in the browser: {path}")),
			}
		}
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

/// The percent-encoded `path` header of a plugin-fs byte-body call.
fn header_path(headers: &Value) -> Result<String, String> {
	let raw = headers.get("path").and_then(Value::as_str).ok_or("Missing path header")?;
	percent_decode(raw).ok_or_else(|| "Invalid path header".to_string())
}

fn percent_decode(text: &str) -> Option<String> {
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
			let path: String = arg(args, "path")?;
			require_vault_path(ctx, &path)?;
			to_json(crate::commands::vault::scan_vault(path, arg(args, "sortBy")?)?)
		}
		"read_files_batch" => {
			let vault_path: String = arg(args, "vaultPath")?;
			if vault_path != root(ctx)? {
				return Err("vaultPath is not the open vault".into());
			}
			let paths: Vec<String> = arg(args, "paths")?;
			for path in &paths {
				require_vault_path(ctx, path)?;
			}
			to_json(crate::commands::files::read_files_batch(vault_path, paths)?)
		}
		"search_fts" => {
			root(ctx)?;
			to_json(crate::commands::search_index::search_fts(
				arg(args, "query")?,
				arg(args, "maxResults")?,
				arg(args, "fuzzy")?,
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
		"get_all_vault_entries_v2" => {
			let idx = index()?;
			let mut out: Vec<_> = idx.entries().values().cloned().collect();
			out.sort_by(|a, b| a.path.cmp(&b.path));
			to_json(out)
		}
		"get_all_tags_v2" => to_json(index()?.lookup_all_tags()),
		"get_all_tasks_v2" => to_json(index()?.lookup_all_tasks()),
		"get_tasks_in_section_v2" => to_json(crate::commands::vault::tasks_in_section_inner(
			&arg::<String>(args, "sectionTag")?,
			ctx.index,
		)?),
		"get_all_property_records" => {
			let idx = index()?;
			let mut out: Vec<_> = idx.entries().values().map(project_note_record).collect();
			out.sort_by(|a, b| a.path.cmp(&b.path));
			to_json(out)
		}
		"get_index_delta" => to_json(index_delta_inner(&*index()?, &arg::<Vec<String>>(args, "paths")?)),
		"plugin:fs|read_text_file" | "plugin:fs|read_file" => {
			let path = fs_arg_path(ctx, args, FsOp::Read)?;
			let bytes = std::fs::read(&path).map_err(|e| format!("failed to read file at path: {path}: {e}"))?;
			Ok(json!(redact_settings(root(ctx)?, &path, bytes)))
		}
		"plugin:fs|exists" => {
			let path = fs_arg_path(ctx, args, FsOp::Probe)?;
			// Follows links, as plugin-fs does: a dangling link does not exist.
			std::path::Path::new(&path)
				.try_exists()
				.map(|found| json!(found))
				.map_err(|e| format!("failed to check path {path}: {e}"))
		}
		"plugin:fs|read_dir" => {
			let path = fs_arg_path(ctx, args, FsOp::Read)?;
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
			let path = fs_arg_path(ctx, args, FsOp::Probe)?;
			let meta = std::fs::metadata(&path).map_err(|e| format!("failed to get metadata of path {path}: {e}"))?;
			Ok(file_info(&meta))
		}
		other => Err(format!("Read command has no browser handler: {other}")),
	}
}

/// The `path` arg of a plugin-fs call, after the path rules. A `baseDir`
/// option (paths relative to the Mac's app folders) is refused.
fn fs_arg_path(ctx: &HostContext, args: &Value, op: FsOp) -> Result<String, String> {
	if args.pointer("/options/baseDir").is_some_and(|v| !v.is_null()) {
		return Err("baseDir paths are not available in the browser".into());
	}
	let path: String = arg(args, "path")?;
	match fs_path_rule(root(ctx)?, &path, op) {
		PathAccess::Allow => Ok(path),
		PathAccess::Deny => Err(format!("Path is not available in the browser: {path}")),
	}
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
