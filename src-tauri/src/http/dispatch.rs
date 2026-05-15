//! Generic `/api/invoke` dispatcher. One match arm per Tauri command —
//! the arm deserializes its args, calls the same core function the
//! Tauri command calls, and serializes the result back to JSON. The
//! big match keeps the wiring discoverable: searching for a command
//! name lands on both the Tauri registration in `lib.rs::run` and the
//! HTTP arm below.
//!
//! Conventions:
//!   - Commands that take only plain types (`String`, `Vec<...>`,
//!     etc.) are invoked directly via the `#[tauri::command]` pub fn.
//!     No `_core` extraction is needed because the function body is
//!     already transport-agnostic.
//!   - Commands that take `tauri::State<'_, T>` extract `T` from the
//!     shared `AppHandle` (`state.app_handle.state::<T>()`) and pass
//!     `&*state` to the core fn. The Tauri-managed state instance is
//!     the same one the Tauri commands see, so a write from the
//!     browser is immediately visible to the native window.
//!   - Commands that emit events take a fresh `EventBus` clone from
//!     `AppState.bus`. The `_core` variants in their modules accept
//!     `&EventBus` (or owned `EventBus` for closures that outlive the
//!     call) so the dispatcher delegates without reproducing emit
//!     logic.
//!   - Per-arg structs live inline (one per arm) — keeps them close
//!     to the usage and avoids polluting command modules with
//!     transport-specific glue.
//!   - All arg structs use `#[serde(rename_all = "camelCase")]` to
//!     mirror the camelCase JS `invoke('cmd', { argOne })` shape the
//!     existing call sites already produce.

use axum::{http::StatusCode, Json};
use serde::Deserialize;
use serde_json::Value;
use serde_json::Value as JsonValue;
use tauri::Manager;

use crate::commands;
use crate::http::{bad_req, internal, not_found, AppState, InvokeErr};
use crate::vault::watcher::{self as vault_watcher, VaultWatcherState};
use crate::vault::VaultIndexState;
use commands::terminal::TerminalState;

/// Helper: bind args to a typed struct, returning the standard 400 on
/// bad shape. Generic so each arm can name its own arg struct.
fn parse_args<T: for<'de> Deserialize<'de>>(args: Value) -> Result<T, (StatusCode, Json<InvokeErr>)> {
	serde_json::from_value::<T>(args).map_err(|e| bad_req(format!("invalid args: {}", e)))
}

/// Helper: serialize a command result to JSON, mapping `Err(String)`
/// to a 500 and serialization failures (should be unreachable for our
/// types but stays defensive) likewise.
fn from_core<T: serde::Serialize>(r: Result<T, String>) -> Result<Value, (StatusCode, Json<InvokeErr>)> {
	let value = r.map_err(internal)?;
	serde_json::to_value(value).map_err(|e| internal(format!("serialize result: {}", e)))
}

/// The big match. New commands plug in here; the function stays a flat
/// list so each command addition lands as one self-contained block.
pub async fn dispatch_command(
	state: &AppState,
	cmd: &str,
	args: Value,
) -> Result<Value, (StatusCode, Json<InvokeErr>)> {
	match cmd {
		// ───────────────────────── db ─────────────────────────
		"open_vault_db" => {
			#[derive(Deserialize)]
			#[serde(rename_all = "camelCase")]
			struct Args { vault_path: String }
			let a: Args = parse_args(args)?;
			from_core(commands::db::open_vault_db(a.vault_path))
		}
		"close_vault_db" => from_core(commands::db::close_vault_db()),

		// ──────────────────────── debug ───────────────────────
		"set_tauri_debug_mode" => {
			#[derive(Deserialize)]
			#[serde(rename_all = "camelCase")]
			struct Args { enabled: bool }
			let a: Args = parse_args(args)?;
			from_core(commands::debug::set_tauri_debug_mode(a.enabled))
		}
		"get_process_memory" => from_core(commands::debug::get_process_memory()),

		// ──────────────────────── fonts ───────────────────────
		"list_system_fonts" => from_core(commands::fonts::list_system_fonts()),

		// ──────────────────────── files ───────────────────────
		"read_files_batch" => {
			#[derive(Deserialize)]
			#[serde(rename_all = "camelCase")]
			struct Args { vault_path: String, paths: Vec<String> }
			let a: Args = parse_args(args)?;
			from_core(commands::files::read_files_batch(a.vault_path, a.paths))
		}

		// ──────────────────────── search ──────────────────────
		"search_vault" => {
			#[derive(Deserialize)]
			#[serde(rename_all = "camelCase")]
			struct Args { vault_path: String, query: String }
			let a: Args = parse_args(args)?;
			from_core(commands::search::search_vault(a.vault_path, a.query))
		}

		// ─────────────────── search_index (FTS) ───────────────
		"build_search_index" => {
			#[derive(Deserialize)]
			#[serde(rename_all = "camelCase")]
			struct Args { vault_path: String }
			let a: Args = parse_args(args)?;
			from_core(commands::search_index::build_search_index(a.vault_path).await)
		}
		"search_fts" => {
			#[derive(Deserialize)]
			#[serde(rename_all = "camelCase")]
			struct Args { query: String, max_results: Option<usize>, fuzzy: Option<bool> }
			let a: Args = parse_args(args)?;
			from_core(commands::search_index::search_fts(a.query, a.max_results, a.fuzzy))
		}
		"update_search_index_file" => {
			#[derive(Deserialize)]
			#[serde(rename_all = "camelCase")]
			struct Args { file_path: String, content: String }
			let a: Args = parse_args(args)?;
			from_core(commands::search_index::update_search_index_file(a.file_path, a.content))
		}
		"remove_from_search_index" => {
			#[derive(Deserialize)]
			#[serde(rename_all = "camelCase")]
			struct Args { file_path: String }
			let a: Args = parse_args(args)?;
			from_core(commands::search_index::remove_from_search_index(a.file_path))
		}
		"get_search_index_stats" => from_core(commands::search_index::get_search_index_stats()),

		// ───────────────────── history (file) ─────────────────
		"save_snapshot" => {
			#[derive(Deserialize)]
			#[serde(rename_all = "camelCase")]
			struct Args { file_path: String, content: String }
			let a: Args = parse_args(args)?;
			from_core(commands::history::save_snapshot(a.file_path, a.content))
		}
		"get_file_history" => {
			#[derive(Deserialize)]
			#[serde(rename_all = "camelCase")]
			struct Args { file_path: String }
			let a: Args = parse_args(args)?;
			from_core(commands::history::get_file_history(a.file_path))
		}
		"get_snapshot_content" => {
			#[derive(Deserialize)]
			#[serde(rename_all = "camelCase")]
			struct Args { snapshot_id: i64 }
			let a: Args = parse_args(args)?;
			from_core(commands::history::get_snapshot_content(a.snapshot_id))
		}
		"compute_diff" => {
			#[derive(Deserialize)]
			#[serde(rename_all = "camelCase")]
			struct Args { old_content: String, new_content: String }
			let a: Args = parse_args(args)?;
			from_core(commands::history::compute_diff(a.old_content, a.new_content))
		}
		"cleanup_history" => {
			#[derive(Deserialize)]
			#[serde(rename_all = "camelCase")]
			struct Args { retention_days: u32 }
			let a: Args = parse_args(args)?;
			from_core(commands::history::cleanup_history(a.retention_days))
		}

		// ──────────────────────── crypto ──────────────────────
		"encrypt_content" => {
			#[derive(Deserialize)]
			#[serde(rename_all = "camelCase")]
			struct Args { content: String, vault_path: String }
			let a: Args = parse_args(args)?;
			from_core(commands::crypto::encrypt_content(a.content, a.vault_path))
		}
		"decrypt_content" => {
			#[derive(Deserialize)]
			#[serde(rename_all = "camelCase")]
			struct Args { iv: String, data: String, vault_path: String }
			let a: Args = parse_args(args)?;
			from_core(commands::crypto::decrypt_content(a.iv, a.data, a.vault_path))
		}
		"initialize_encryption" => {
			#[derive(Deserialize)]
			#[serde(rename_all = "camelCase")]
			struct Args { vault_path: String }
			let a: Args = parse_args(args)?;
			from_core(commands::crypto::initialize_encryption(a.vault_path))
		}
		"ensure_encryption_key" => {
			#[derive(Deserialize)]
			#[serde(rename_all = "camelCase")]
			struct Args { vault_path: String }
			let a: Args = parse_args(args)?;
			from_core(commands::crypto::ensure_encryption_key(a.vault_path))
		}
		"has_encryption_key" => {
			#[derive(Deserialize)]
			#[serde(rename_all = "camelCase")]
			struct Args { vault_path: String }
			let a: Args = parse_args(args)?;
			from_core(commands::crypto::has_encryption_key(a.vault_path))
		}
		"get_recovery_key" => {
			#[derive(Deserialize)]
			#[serde(rename_all = "camelCase")]
			struct Args { vault_path: String }
			let a: Args = parse_args(args)?;
			from_core(commands::crypto::get_recovery_key(a.vault_path))
		}
		"restore_from_recovery_key" => {
			#[derive(Deserialize)]
			#[serde(rename_all = "camelCase")]
			struct Args { vault_path: String, recovery_key: String }
			let a: Args = parse_args(args)?;
			from_core(commands::crypto::restore_from_recovery_key(a.vault_path, a.recovery_key))
		}
		"lock_encryption" => from_core(commands::crypto::lock_encryption()),

		// ──────────────────────── vault ───────────────────────
		"scan_vault" => {
			#[derive(Deserialize)]
			#[serde(rename_all = "camelCase")]
			struct Args { path: String, sort_by: String }
			let a: Args = parse_args(args)?;
			from_core(commands::vault::scan_vault(a.path, a.sort_by))
		}
		"scan_vault_v2" => {
			#[derive(Deserialize)]
			#[serde(rename_all = "camelCase")]
			struct Args { path: String }
			let a: Args = parse_args(args)?;
			let vidx = state.app_handle.state::<VaultIndexState>();
			from_core(commands::vault::scan_vault_v2_core(&state.bus, &vidx, &a.path))
		}
		"get_backlinks_v2" => {
			#[derive(Deserialize)]
			#[serde(rename_all = "camelCase")]
			struct Args { path: String }
			let a: Args = parse_args(args)?;
			let vidx = state.app_handle.state::<VaultIndexState>();
			let result: Result<_, String> = (|| {
				let idx = vidx.read().map_err(|e| format!("VaultIndex lock poisoned: {}", e))?;
				Ok(idx.lookup_backlinks(&a.path))
			})();
			from_core(result)
		}
		"get_outgoing_links_v2" => {
			#[derive(Deserialize)]
			#[serde(rename_all = "camelCase")]
			struct Args { path: String }
			let a: Args = parse_args(args)?;
			let vidx = state.app_handle.state::<VaultIndexState>();
			let result: Result<_, String> = (|| {
				let idx = vidx.read().map_err(|e| format!("VaultIndex lock poisoned: {}", e))?;
				Ok(idx.lookup_outgoing_links(&a.path))
			})();
			from_core(result)
		}
		"get_outgoing_unlinked_mentions_v2" => {
			#[derive(Deserialize)]
			#[serde(rename_all = "camelCase")]
			struct Args { path: String, content: String }
			let a: Args = parse_args(args)?;
			let vidx = state.app_handle.state::<VaultIndexState>();
			let result: Result<_, String> = (|| {
				let idx = vidx.read().map_err(|e| format!("VaultIndex lock poisoned: {}", e))?;
				Ok(idx.lookup_outgoing_unlinked_mentions(&a.path, &a.content))
			})();
			from_core(result)
		}
		"get_all_vault_entries_v2" => {
			let vidx = state.app_handle.state::<VaultIndexState>();
			let result: Result<_, String> = (|| {
				let idx = vidx.read().map_err(|e| format!("VaultIndex lock poisoned: {}", e))?;
				let mut out: Vec<_> = idx.entries().values().cloned().collect();
				out.sort_by(|a, b| a.path.cmp(&b.path));
				Ok(out)
			})();
			from_core(result)
		}
		"get_unlinked_mentions_v2" => {
			#[derive(Deserialize)]
			#[serde(rename_all = "camelCase")]
			struct Args { path: String }
			let a: Args = parse_args(args)?;
			// Phase 1: snapshot under a brief read lock.
			let (note_name, candidate_paths) = {
				let vidx = state.app_handle.state::<VaultIndexState>();
				let idx = vidx.read().map_err(|e| internal(format!("VaultIndex lock poisoned: {}", e)))?;
				let cs = idx.unlinked_mentions_candidates(&a.path);
				(cs.note_name, cs.candidate_paths)
			};
			let matched_paths: Vec<String> = tokio::task::spawn_blocking(move || {
				crate::vault::index::match_unlinked_mentions(&note_name, candidate_paths)
			})
			.await
			.map_err(|e| internal(format!("get_unlinked_mentions_v2 join: {}", e)))?;
			let mut results = {
				let vidx = state.app_handle.state::<VaultIndexState>();
				let idx = vidx.read().map_err(|e| internal(format!("VaultIndex lock poisoned: {}", e)))?;
				idx.lookup_entries(&matched_paths)
			};
			results.sort_by(|a, b| a.title.to_lowercase().cmp(&b.title.to_lowercase()));
			from_core::<Vec<crate::vault::entry::NoteEntry>>(Ok(results))
		}
		"update_note_in_index" => {
			#[derive(Deserialize)]
			#[serde(rename_all = "camelCase")]
			struct Args { path: String, content: String }
			let a: Args = parse_args(args)?;
			let vidx = state.app_handle.state::<VaultIndexState>();
			from_core(commands::vault::update_note_in_index_core(&state.bus, &vidx, a.path, &a.content))
		}
		"get_all_tags_v2" => {
			let vidx = state.app_handle.state::<VaultIndexState>();
			let result: Result<_, String> = (|| {
				let idx = vidx.read().map_err(|e| format!("VaultIndex lock poisoned: {}", e))?;
				Ok(idx.lookup_all_tags())
			})();
			from_core(result)
		}
		"get_notes_with_tag_v2" => {
			#[derive(Deserialize)]
			#[serde(rename_all = "camelCase")]
			struct Args { tag: String }
			let a: Args = parse_args(args)?;
			let vidx = state.app_handle.state::<VaultIndexState>();
			let result: Result<_, String> = (|| {
				let idx = vidx.read().map_err(|e| format!("VaultIndex lock poisoned: {}", e))?;
				Ok(idx.lookup_notes_with_tag(&a.tag))
			})();
			from_core(result)
		}
		"get_all_tasks_v2" => {
			let vidx = state.app_handle.state::<VaultIndexState>();
			let result: Result<_, String> = (|| {
				let idx = vidx.read().map_err(|e| format!("VaultIndex lock poisoned: {}", e))?;
				Ok(idx.lookup_all_tasks())
			})();
			from_core(result)
		}
		"get_tasks_in_path_v2" => {
			#[derive(Deserialize)]
			#[serde(rename_all = "camelCase")]
			struct Args { path: String }
			let a: Args = parse_args(args)?;
			let vidx = state.app_handle.state::<VaultIndexState>();
			let result: Result<_, String> = (|| {
				let idx = vidx.read().map_err(|e| format!("VaultIndex lock poisoned: {}", e))?;
				Ok(idx.lookup_tasks_in_path(&a.path))
			})();
			from_core(result)
		}
		"get_tasks_in_section_v2" => {
			#[derive(Deserialize)]
			#[serde(rename_all = "camelCase")]
			struct Args { section_tag: String }
			let a: Args = parse_args(args)?;
			let vidx = state.app_handle.state::<VaultIndexState>();
			let result: Result<_, String> = (|| {
				let idx = vidx.read().map_err(|e| format!("VaultIndex lock poisoned: {}", e))?;
				use crate::vault::parsing::extract_tasks_from_section;
				use crate::vault::task::{display_name, FileTaskGroup};
				let mut out: Vec<FileTaskGroup> = Vec::new();
				for entry in idx.entries().values() {
					let content = match std::fs::read_to_string(&entry.path) {
						Ok(c) => c,
						Err(_) => continue,
					};
					let tasks = extract_tasks_from_section(&content, &a.section_tag);
					if !tasks.is_empty() {
						out.push(FileTaskGroup {
							file_path: entry.path.clone(),
							file_name: display_name(&entry.path),
							modified_at: entry.modified_at,
							tasks,
						});
					}
				}
				out.sort_by(|a, b| b.modified_at.cmp(&a.modified_at));
				Ok(out)
			})();
			from_core(result)
		}
		"toggle_task_status" => {
			#[derive(Deserialize)]
			#[serde(rename_all = "camelCase")]
			struct Args { path: String, line_number: usize }
			let a: Args = parse_args(args)?;
			let vidx = state.app_handle.state::<VaultIndexState>();
			from_core(commands::vault::toggle_task_status_core(&state.bus, &vidx, &a.path, a.line_number))
		}
		"remove_note_from_index" => {
			#[derive(Deserialize)]
			#[serde(rename_all = "camelCase")]
			struct Args { path: String }
			let a: Args = parse_args(args)?;
			let vidx = state.app_handle.state::<VaultIndexState>();
			from_core(commands::vault::remove_note_from_index_core(&state.bus, &vidx, &a.path))
		}
		"query_notes_by_property" => {
			#[derive(Deserialize)]
			#[serde(rename_all = "camelCase")]
			struct Args { key: String, value: JsonValue }
			let a: Args = parse_args(args)?;
			let vidx = state.app_handle.state::<VaultIndexState>();
			let result: Result<_, String> = (|| {
				let idx = vidx.read().map_err(|e| format!("VaultIndex lock poisoned: {}", e))?;
				Ok(idx.lookup_notes_by_property(&a.key, &a.value))
			})();
			from_core(result)
		}
		"get_property_values" => {
			#[derive(Deserialize)]
			#[serde(rename_all = "camelCase")]
			struct Args { key: String }
			let a: Args = parse_args(args)?;
			let vidx = state.app_handle.state::<VaultIndexState>();
			let result: Result<_, String> = (|| {
				let idx = vidx.read().map_err(|e| format!("VaultIndex lock poisoned: {}", e))?;
				Ok(idx.lookup_property_values(&a.key))
			})();
			from_core(result)
		}
		"get_note_properties" => {
			#[derive(Deserialize)]
			#[serde(rename_all = "camelCase")]
			struct Args { path: String }
			let a: Args = parse_args(args)?;
			let vidx = state.app_handle.state::<VaultIndexState>();
			let result: Result<_, String> = (|| {
				let idx = vidx.read().map_err(|e| format!("VaultIndex lock poisoned: {}", e))?;
				Ok(idx.lookup_note_properties(&a.path))
			})();
			from_core(result)
		}
		"get_all_property_records" => {
			let vidx = state.app_handle.state::<VaultIndexState>();
			let result: Result<_, String> = (|| {
				let idx = vidx.read().map_err(|e| format!("VaultIndex lock poisoned: {}", e))?;
				use crate::vault::entry::NoteRecord;
				let mut out: Vec<NoteRecord> = idx
					.entries()
					.values()
					.map(|entry| {
						let path = &entry.path;
						let name = path
							.rsplit('/')
							.next()
							.unwrap_or(path.as_str())
							.to_string();
						let (basename, ext) = match name.rfind('.') {
							Some(idx) if idx > 0 => (name[..idx].to_string(), name[idx..].to_string()),
							_ => (name.clone(), String::new()),
						};
						let folder = match path.rfind('/') {
							Some(idx) if idx > 0 => path[..idx].to_string(),
							_ => String::new(),
						};
						NoteRecord {
							path: path.clone(),
							name,
							basename,
							folder,
							ext,
							mtime: entry.modified_at.saturating_mul(1000),
							ctime: entry.created_at.saturating_mul(1000),
							size: entry.size,
							properties: entry.frontmatter.clone(),
						}
					})
					.collect();
				out.sort_by(|a, b| a.path.cmp(&b.path));
				Ok(out)
			})();
			from_core(result)
		}
		"create_note" => {
			#[derive(Deserialize)]
			#[serde(rename_all = "camelCase")]
			struct Args { path: String, content: String }
			let a: Args = parse_args(args)?;
			let vidx = state.app_handle.state::<VaultIndexState>();
			from_core(commands::vault::create_note_core(&state.bus, &vidx, a.path, a.content))
		}
		"create_folder" => {
			#[derive(Deserialize)]
			#[serde(rename_all = "camelCase")]
			struct Args { path: String }
			let a: Args = parse_args(args)?;
			from_core(commands::vault::create_folder(a.path))
		}

		// ─────────────────────── watcher ──────────────────────
		"start_vault_watcher" => {
			#[derive(Deserialize)]
			#[serde(rename_all = "camelCase")]
			struct Args { path: String }
			let a: Args = parse_args(args)?;
			let w = state.app_handle.state::<VaultWatcherState>();
			from_core(vault_watcher::start_vault_watcher_core(state.bus.clone(), &w, a.path))
		}
		"stop_vault_watcher" => {
			let w = state.app_handle.state::<VaultWatcherState>();
			from_core(vault_watcher::stop_vault_watcher_core(&w))
		}

		// ─────────────────────── terminal ─────────────────────
		"spawn_terminal" => {
			#[derive(Deserialize)]
			#[serde(rename_all = "camelCase")]
			struct Args { cwd: String, rows: u16, cols: u16 }
			let a: Args = parse_args(args)?;
			let t = state.app_handle.state::<TerminalState>();
			from_core(commands::terminal::spawn_terminal_core(state.bus.clone(), &t, a.cwd, a.rows, a.cols))
		}
		"write_terminal" => {
			#[derive(Deserialize)]
			#[serde(rename_all = "camelCase")]
			struct Args { session_id: String, data: String }
			let a: Args = parse_args(args)?;
			let t = state.app_handle.state::<TerminalState>();
			from_core(commands::terminal::write_terminal_core(&t, a.session_id, a.data))
		}
		"resize_terminal" => {
			#[derive(Deserialize)]
			#[serde(rename_all = "camelCase")]
			struct Args { session_id: String, rows: u16, cols: u16 }
			let a: Args = parse_args(args)?;
			let t = state.app_handle.state::<TerminalState>();
			from_core(commands::terminal::resize_terminal_core(&t, a.session_id, a.rows, a.cols))
		}
		"kill_terminal" => {
			#[derive(Deserialize)]
			#[serde(rename_all = "camelCase")]
			struct Args { session_id: String }
			let a: Args = parse_args(args)?;
			let t = state.app_handle.state::<TerminalState>();
			from_core(commands::terminal::kill_terminal_core(&t, a.session_id))
		}
		"kill_all_terminals" => {
			let t = state.app_handle.state::<TerminalState>();
			from_core(commands::terminal::kill_all_terminals_core(&t))
		}

		// ──────────────────────── mcp ─────────────────────────
		"set_mcp_enabled" => {
			#[derive(Deserialize)]
			#[serde(rename_all = "camelCase")]
			struct Args { enabled: bool }
			let a: Args = parse_args(args)?;
			let dir = state
				.app_handle
				.path()
				.app_config_dir()
				.map_err(|e| internal(format!("Could not resolve app_config_dir: {}", e)))?;
			from_core(
				crate::mcp::config::write_mcp_enabled(&dir, a.enabled)
					.map_err(|e| format!("Failed to write mcp.json: {}", e)),
			)
		}
		"get_mcp_enabled" => {
			let dir = state
				.app_handle
				.path()
				.app_config_dir()
				.map_err(|e| internal(format!("Could not resolve app_config_dir: {}", e)))?;
			from_core::<bool>(Ok(crate::mcp::config::is_mcp_enabled(&dir)))
		}

		// ───────────────────── update channel ─────────────────
		"check_for_update_on_channel" => {
			// The updater command needs a `tauri::Webview` because the
			// returned `Update` is stored in the webview's resource table
			// for a follow-up `download_and_install`. The browser
			// transport doesn't have a webview-scoped resource table —
			// the resource id we return points into the FIRST native
			// webview, which only matters when the user later calls
			// `plugin:updater|download_and_install`. That plugin command
			// isn't exposed by our dispatcher (it lives in the updater
			// plugin's own IPC surface). So `check_for_update_on_channel`
			// returns metadata fine over HTTP, but the subsequent
			// install step is native-only — match the documented browser
			// limitation in the plan file.
			let _ = args;
			Err(internal(
				"check_for_update_on_channel is native-only; the updater flow does not work over HTTP",
			))
		}

		// ──────────────────────── semantic ────────────────────
		"init_semantic_search" => {
			#[derive(Deserialize)]
			#[serde(rename_all = "camelCase")]
			struct Args { vault_path: String }
			let a: Args = parse_args(args)?;
			from_core(commands::semantic::init_semantic_search(a.vault_path).await)
		}
		"is_semantic_model_available" => {
			#[derive(Deserialize)]
			#[serde(rename_all = "camelCase")]
			struct Args { vault_path: String }
			let a: Args = parse_args(args)?;
			from_core(commands::semantic::is_semantic_model_available(a.vault_path))
		}
		"is_reranker_model_available" => {
			#[derive(Deserialize)]
			#[serde(rename_all = "camelCase")]
			struct Args { vault_path: String }
			let a: Args = parse_args(args)?;
			from_core(commands::semantic::is_reranker_model_available(a.vault_path))
		}
		"download_reranker_model" => {
			#[derive(Deserialize)]
			#[serde(rename_all = "camelCase")]
			struct Args { vault_path: String }
			let a: Args = parse_args(args)?;
			from_core(commands::semantic::download_reranker_model_core(state.bus.clone(), a.vault_path).await)
		}
		"download_semantic_model" => {
			#[derive(Deserialize)]
			#[serde(rename_all = "camelCase")]
			struct Args { vault_path: String }
			let a: Args = parse_args(args)?;
			from_core(commands::semantic::download_semantic_model_core(state.bus.clone(), a.vault_path).await)
		}
		"build_semantic_index" => {
			#[derive(Deserialize)]
			#[serde(rename_all = "camelCase")]
			struct Args { vault_path: String }
			let a: Args = parse_args(args)?;
			from_core(commands::semantic::build_semantic_index_core(state.bus.clone(), a.vault_path).await)
		}
		"search_semantic" => {
			#[derive(Deserialize)]
			#[serde(rename_all = "camelCase")]
			struct Args { query: String, max_results: Option<usize>, min_score: Option<f32> }
			let a: Args = parse_args(args)?;
			from_core(commands::semantic::search_semantic(a.query, a.max_results, a.min_score).await)
		}
		"search_hybrid" => {
			#[derive(Deserialize)]
			#[serde(rename_all = "camelCase")]
			struct Args { query: String, max_results: Option<usize> }
			let a: Args = parse_args(args)?;
			from_core(commands::semantic::search_hybrid(a.query, a.max_results).await)
		}
		"get_semantic_stats" => from_core(commands::semantic::get_semantic_stats()),
		"get_semantic_file_status" => {
			#[derive(Deserialize)]
			#[serde(rename_all = "camelCase")]
			struct Args { file_path: String }
			let a: Args = parse_args(args)?;
			from_core(commands::semantic::get_semantic_file_status(a.file_path))
		}
		"update_semantic_file" => {
			#[derive(Deserialize)]
			#[serde(rename_all = "camelCase")]
			struct Args { file_path: String, content: String, vault_path: String }
			let a: Args = parse_args(args)?;
			from_core(commands::semantic::update_semantic_file(a.file_path, a.content, a.vault_path).await)
		}
		"debug_semantic_embeddings" => from_core(commands::semantic::debug_semantic_embeddings().await),
		"shutdown_semantic" => from_core(commands::semantic::shutdown_semantic()),

		// ─────────────────── unknown command ──────────────────
		_ => Err(not_found(cmd)),
	}
}
