use crate::utils::fs as vault_fs;
use crate::utils::logger::debug_log;
use crate::vault::entry::{NoteEntry, NoteRecord, OutgoingLink, OutgoingUnlinkedMention};
use crate::vault::index::{UpdateResult, VaultIndex};
use crate::vault::parsing::{extract_tasks_from_section, toggle_task_in_content};
use crate::vault::task::{display_name, FileTaskGroup, TagAggregate, Task, ToggleTaskResult};
use crate::vault::{VaultIndexState, VAULT_INDEX_UPDATED_EVENT};
use serde::Serialize;
use serde_json::Value as JsonValue;
use std::cmp::Ordering;
use std::collections::BTreeMap;
use std::fs;
use std::path::Path;
use std::time::UNIX_EPOCH;
use tauri::Emitter;

/// Maximum recursion depth for directory traversal (prevents symlink loops / extreme nesting).
const MAX_DEPTH: usize = 64;

/// A single entry (file or folder) in the vault's file tree.
/// Serializes to camelCase to match the TypeScript `FileTreeNode` interface.
#[derive(Serialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct FileNode {
    pub name: String,
    pub path: String,
    pub is_directory: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub children: Option<Vec<FileNode>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub modified_at: Option<u64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub created_at: Option<u64>,
}

/// Recursively scans a vault directory and returns the full file tree with metadata.
/// Skips hidden files/directories (dot-prefixed), which includes the `.kokobrain` internal folder.
/// Sorting is applied at each level: directories first, then by `sort_by` strategy.
#[tauri::command]
pub fn scan_vault(path: String, sort_by: String) -> Result<Vec<FileNode>, String> {
    let start = std::time::Instant::now();
    debug_log("VAULT", format!("Scanning: {}, sort: {}", path, sort_by));
    let root = vault_fs::validate_vault_path(&path)?;
    let result = scan_dir(&root, &sort_by, 0)?;
    debug_log("VAULT", format!("Scan complete: {} top-level items in {}ms", result.len(), start.elapsed().as_millis()));
    Ok(result)
}

fn scan_dir(dir: &Path, sort_by: &str, depth: usize) -> Result<Vec<FileNode>, String> {
    if depth >= MAX_DEPTH {
        return Ok(Vec::new());
    }

    let entries = fs::read_dir(dir).map_err(|e| format!("Failed to read directory: {}", e))?;
    let mut nodes: Vec<FileNode> = Vec::new();

    for entry in entries {
        let entry = entry.map_err(|e| format!("Failed to read entry: {}", e))?;
        let file_name = entry.file_name().to_string_lossy().to_string();

        if file_name.starts_with('.') {
            continue;
        }

        let file_path = entry.path();

        // Use symlink_metadata (lstat) for atomic symlink check + metadata read,
        // eliminating the TOCTOU window between is_symlink() and metadata().
        let metadata = fs::symlink_metadata(&file_path)
            .map_err(|e| format!("Failed to read metadata for {}: {}", file_name, e))?;

        // Skip symlinks to prevent loops and path traversal
        if metadata.file_type().is_symlink() {
            continue;
        }

        let is_directory = metadata.is_dir();

        let modified_at = metadata
            .modified()
            .ok()
            .and_then(|t| t.duration_since(UNIX_EPOCH).ok())
            .map(|d| u64::try_from(d.as_millis()).unwrap_or(u64::MAX));

        let created_at = metadata
            .created()
            .ok()
            .and_then(|t| t.duration_since(UNIX_EPOCH).ok())
            .map(|d| u64::try_from(d.as_millis()).unwrap_or(u64::MAX));

        let children = if is_directory {
            Some(scan_dir(&file_path, sort_by, depth + 1)?)
        } else {
            None
        };

        nodes.push(FileNode {
            name: file_name,
            path: file_path.to_string_lossy().to_string(),
            is_directory,
            children,
            modified_at,
            created_at,
        });
    }

    sort_nodes(&mut nodes, sort_by);
    Ok(nodes)
}

/// Walks a vault and builds a `Vec<NoteEntry>` from every markdown file
/// under it. This is the pure I/O + parsing path used by the Tauri
/// command `scan_vault_v2` and by tests that want to exercise scanning
/// without paying the cost of acquiring the managed `VaultIndexState`
/// write lock.
///
/// Per-file read failures are logged via `debug_log("VAULT-V2", ...)` and
/// silently skipped — one unreadable file must not poison the whole scan.
/// Whole-directory failures (permission denied on the vault root, path
/// is not a directory) propagate as `Err`.
pub fn collect_v2_entries(path: &str) -> Result<Vec<NoteEntry>, String> {
	let start = std::time::Instant::now();
	debug_log(
		"VAULT-V2",
		format!("collect_v2_entries: starting on {}", path),
	);
	let root = vault_fs::validate_vault_path(path)?;
	let entries = vault_fs::collect_markdown_paths_with_metadata(&root, &[])?;
	let total = entries.len();
	let mut notes: Vec<NoteEntry> = Vec::with_capacity(total);
	let mut skipped = 0usize;

	for (_rel, abs, mtime, ctime, size) in entries {
		let abs_path_str = abs.to_string_lossy().to_string();
		match fs::read_to_string(&abs) {
			Ok(content) => {
				notes.push(NoteEntry::from_content_full(
					abs_path_str,
					&content,
					mtime,
					ctime,
					size,
				));
			}
			Err(err) => {
				skipped += 1;
				debug_log(
					"VAULT-V2",
					format!("collect_v2_entries: skipping {} ({})", abs_path_str, err),
				);
			}
		}
	}

	debug_log(
		"VAULT-V2",
		format!(
			"collect_v2_entries: {} entries ({} skipped) in {}ms",
			notes.len(),
			skipped,
			start.elapsed().as_millis(),
		),
	);
	Ok(notes)
}

/// Reads a file's `modified` timestamp as seconds since the UNIX epoch.
/// Returns `None` on any I/O or system-time failure (file missing,
/// permission denied, system clock before epoch, etc.). The Phase 2.6
/// caller falls back to `0` so a missing mtime never aborts the index
/// mutation.
fn read_file_mtime_secs(path: &str) -> Option<i64> {
	std::fs::metadata(path)
		.ok()?
		.modified()
		.ok()?
		.duration_since(UNIX_EPOCH)
		.ok()
		.map(|d| d.as_secs() as i64)
}

/// Reads `(mtime, ctime, size)` from the filesystem. Returns `(0, 0, 0)`
/// when any field can't be obtained — matches the lenient behaviour of
/// `read_file_mtime_secs`. Phase 8 — `update_note_in_index` uses this to
/// keep `NoteEntry.{created_at, size}` fresh on every save.
fn read_file_metadata(path: &str) -> (i64, i64, u64) {
	let metadata = match std::fs::metadata(path) {
		Ok(m) => m,
		Err(_) => return (0, 0, 0),
	};
	let mtime = metadata
		.modified()
		.ok()
		.and_then(|t| t.duration_since(UNIX_EPOCH).ok())
		.map(|d| d.as_secs() as i64)
		.unwrap_or(0);
	let ctime = metadata
		.created()
		.ok()
		.and_then(|t| t.duration_since(UNIX_EPOCH).ok())
		.map(|d| d.as_secs() as i64)
		.unwrap_or(0);
	let size = metadata.len();
	(mtime, ctime, size)
}

/// Pure-logic implementation behind the `update_note_in_index` Tauri
/// command. Builds a `NoteEntry` from `(path, content, mtime)` via the
/// Phase 1.5 constructor and applies it through `VaultIndex::update_entry`.
/// Tests construct an in-memory `VaultIndex`, call this directly, and
/// inspect the returned `UpdateResult` without needing a Tauri AppHandle.
pub fn update_note_in_index_inner(
	idx: &mut VaultIndex,
	path: String,
	content: &str,
	mtime: i64,
) -> UpdateResult {
	// Read ctime + size at call time; Phase 8 added these to `NoteEntry`
	// for kb-api parity. mtime is the only cheap one to thread through
	// from the caller (already known by save hooks); the others are read
	// fresh per call. Cost: one stat per save — well below the watcher
	// debounce overhead.
	let (_mtime_disk, ctime, size) = read_file_metadata(&path);
	let entry = NoteEntry::from_content_full(path, content, mtime, ctime, size);
	idx.update_entry(entry)
}

/// Tauri command: updates a single note's metadata in the managed
/// `VaultIndex` and emits `vault-index-updated` with the resulting
/// `UpdateResult` payload.
///
/// Reads the file's mtime from disk at call time (fallback to 0 on any
/// I/O error). The mutation runs under a write lock; the lock is dropped
/// BEFORE the event is emitted so consumers reacting to
/// `vault-index-updated` can immediately re-read the index without
/// contending. Emit failures are logged via `debug_log("VAULT-V2", ...)`
/// and ignored — the mutation has already been committed and rolling it
/// back would create an inconsistent state.
#[tauri::command]
pub fn update_note_in_index(
	app: tauri::AppHandle,
	state: tauri::State<'_, VaultIndexState>,
	path: String,
	content: String,
) -> Result<UpdateResult, String> {
	let mtime = read_file_mtime_secs(&path).unwrap_or(0);
	let result = {
		let mut idx = state
			.write()
			.map_err(|e| format!("VaultIndex lock poisoned: {}", e))?;
		update_note_in_index_inner(&mut idx, path, &content, mtime)
	};
	if let Err(emit_err) = app.emit(VAULT_INDEX_UPDATED_EVENT, &result) {
		debug_log(
			"VAULT-V2",
			format!(
				"update_note_in_index: vault-index-updated emit failed: {}",
				emit_err,
			),
		);
	}
	Ok(result)
}

/// Returns every `NoteEntry` whose outgoing links resolve to `path`,
/// sorted by title (case-insensitive) for stable UI ordering. Reads
/// from the managed `VaultIndex` under a shared lock; safe to call
/// concurrently with other readers.
///
/// Returns an empty vector when no backlinks are recorded for `path`
/// (or when the path is unknown to the index entirely).
#[tauri::command]
pub fn get_backlinks_v2(
	path: String,
	state: tauri::State<'_, VaultIndexState>,
) -> Result<Vec<NoteEntry>, String> {
	let idx = state
		.read()
		.map_err(|e| format!("VaultIndex lock poisoned: {}", e))?;
	Ok(idx.lookup_backlinks(&path))
}

/// Returns the outgoing wikilinks of `path`, each resolved against the
/// managed `VaultIndex.by_path` cache (so callers know which links are
/// broken vs which target real notes). Reads under a shared lock; empty
/// vector when `path` is unknown to the index.
///
/// Phase 6.1 of the perf refactor — moves outgoing-link resolution off
/// the JS main thread.
#[tauri::command]
pub fn get_outgoing_links_v2(
	path: String,
	state: tauri::State<'_, VaultIndexState>,
) -> Result<Vec<OutgoingLink>, String> {
	let idx = state
		.read()
		.map_err(|e| format!("VaultIndex lock poisoned: {}", e))?;
	Ok(idx.lookup_outgoing_links(&path))
}

/// Returns notes whose names appear as plain text in `content` but are
/// NOT already linked from `path` via wikilinks. Sorted by `note_name`
/// (case-insensitive) for stable UI ordering. Reads under a shared lock.
///
/// `content` is passed in by the frontend (active tab content) because
/// the index doesn't store full per-note bodies — only `snippet`.
///
/// Phase 6.2 of the perf refactor — moves the unlinked-mention scan
/// (Unicode word-boundary checks, frontmatter/code stripping) off the
/// JS main thread.
#[tauri::command]
pub fn get_outgoing_unlinked_mentions_v2(
	path: String,
	content: String,
	state: tauri::State<'_, VaultIndexState>,
) -> Result<Vec<OutgoingUnlinkedMention>, String> {
	let idx = state
		.read()
		.map_err(|e| format!("VaultIndex lock poisoned: {}", e))?;
	Ok(idx.lookup_outgoing_unlinked_mentions(&path, &content))
}

/// Returns the flat list of tag aggregates (one per distinct tag), sorted
/// alphabetically. Phase 7.3 — replaces `tags.service.ts::buildTagIndex`'s
/// JS-side aggregation. The frontend builds the tree from this output via
/// the existing `buildTagTree` / `sortTagTree` helpers.
#[tauri::command]
pub fn get_all_tags_v2(
	state: tauri::State<'_, VaultIndexState>,
) -> Result<Vec<TagAggregate>, String> {
	let idx = state
		.read()
		.map_err(|e| format!("VaultIndex lock poisoned: {}", e))?;
	Ok(idx.lookup_all_tags())
}

/// Returns every `NoteEntry` whose tags contain `tag` (case-insensitively;
/// any leading `#` on the input is stripped). Phase 7.3.
#[tauri::command]
pub fn get_notes_with_tag_v2(
	tag: String,
	state: tauri::State<'_, VaultIndexState>,
) -> Result<Vec<NoteEntry>, String> {
	let idx = state
		.read()
		.map_err(|e| format!("VaultIndex lock poisoned: {}", e))?;
	Ok(idx.lookup_notes_with_tag(&tag))
}

/// Returns every file's tasks grouped by file, sorted by `modifiedAt`
/// descending. Files with zero tasks are filtered out. Phase 7.3 —
/// replaces `tasks.service.ts::buildTaskIndex`'s JS-side aggregation.
#[tauri::command]
pub fn get_all_tasks_v2(
	state: tauri::State<'_, VaultIndexState>,
) -> Result<Vec<FileTaskGroup>, String> {
	let idx = state
		.read()
		.map_err(|e| format!("VaultIndex lock poisoned: {}", e))?;
	Ok(idx.lookup_all_tasks())
}

/// Returns the parsed task list for the entry at `path`. Empty when
/// `path` is unknown to the index or has no tasks. Phase 7.3.
#[tauri::command]
pub fn get_tasks_in_path_v2(
	path: String,
	state: tauri::State<'_, VaultIndexState>,
) -> Result<Vec<Task>, String> {
	let idx = state
		.read()
		.map_err(|e| format!("VaultIndex lock poisoned: {}", e))?;
	Ok(idx.lookup_tasks_in_path(&path))
}

/// Returns tasks across the vault filtered by section heading: only tasks
/// whose containing heading text contains `section_tag` are emitted. The
/// `VaultIndex` does not store headings, so this command reads each note's
/// raw content from disk and runs `extract_tasks_from_section` per file.
/// Cost is N file reads per call — acceptable because the section filter
/// is fired only when the user types a non-empty filter (debounced 400ms
/// in `TasksView.svelte`). Phase 7.3.
#[tauri::command]
pub fn get_tasks_in_section_v2(
	section_tag: String,
	state: tauri::State<'_, VaultIndexState>,
) -> Result<Vec<FileTaskGroup>, String> {
	let idx = state
		.read()
		.map_err(|e| format!("VaultIndex lock poisoned: {}", e))?;
	let mut out: Vec<FileTaskGroup> = Vec::new();
	for entry in idx.entries().values() {
		let content = std::fs::read_to_string(&entry.path).unwrap_or_default();
		let tasks = extract_tasks_from_section(&content, &section_tag);
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
}

/// Pure-logic implementation behind `toggle_task_status`. Reads the
/// current file content, toggles the checkbox at `line_number`, writes
/// the new content back, and returns the diff applied to the `VaultIndex`.
/// Tests construct a tmpdir + an in-memory `VaultIndex`, call this
/// directly, and assert on disk + index state without a Tauri AppHandle.
pub fn toggle_task_status_inner(
	idx: &mut VaultIndex,
	path: &str,
	line_number: usize,
) -> Result<ToggleTaskResult, String> {
	let original = std::fs::read_to_string(path)
		.map_err(|e| format!("read failed for {}: {}", path, e))?;
	let updated = toggle_task_in_content(&original, line_number);
	if updated == original {
		// No-op: line out of bounds, no checkbox on the line, etc.
		// Skip the disk write and the index update entirely.
		return Ok(ToggleTaskResult {
			updated_content: original,
			update_result: UpdateResult {
				changed: false,
				affected: Vec::new(),
				version: idx.version(),
			},
		});
	}
	std::fs::write(path, &updated)
		.map_err(|e| format!("write failed for {}: {}", path, e))?;
	let mtime = read_file_mtime_secs(path).unwrap_or(0);
	let result = update_note_in_index_inner(idx, path.to_string(), &updated, mtime);
	Ok(ToggleTaskResult {
		updated_content: updated,
		update_result: result,
	})
}

/// Tauri command: toggles a task's checkbox on disk + in the managed
/// `VaultIndex`. Replaces the direct `writeTextFile` call at
/// `tasks.service.ts:113` (a known JS write-surface violator from the
/// Phase 11.5 audit list). Phase 7.4.
///
/// Flow:
///   1. Read file from disk.
///   2. Toggle line via `toggle_task_in_content`.
///   3. If unchanged (out of bounds or no checkbox): return no-op result.
///   4. Else: write to disk, update VaultIndex via the Phase 2.6 helper.
///   5. Emit `vault-index-updated` after dropping the write lock.
///
/// The lock is released BEFORE the emit so consumers reacting to the
/// event can immediately re-read the index without contending. Emit
/// failures are logged and ignored (the mutation has already committed).
#[tauri::command]
pub fn toggle_task_status(
	app: tauri::AppHandle,
	state: tauri::State<'_, VaultIndexState>,
	path: String,
	line_number: usize,
) -> Result<ToggleTaskResult, String> {
	let result = {
		let mut idx = state
			.write()
			.map_err(|e| format!("VaultIndex lock poisoned: {}", e))?;
		toggle_task_status_inner(&mut idx, &path, line_number)?
	};
	if result.update_result.changed {
		if let Err(emit_err) = app.emit(VAULT_INDEX_UPDATED_EVENT, &result.update_result) {
			debug_log(
				"VAULT-V2",
				format!(
					"toggle_task_status: vault-index-updated emit failed: {}",
					emit_err,
				),
			);
		}
	}
	Ok(result)
}

// ============================================================================
// Phase 8 — Property + file-op commands
// ============================================================================

/// Projects a `NoteEntry` into the `NoteRecord` shape consumed by the TS
/// `collection.service` / kb-api. Computes name / basename / folder /
/// ext from the path, converts seconds → milliseconds for mtime/ctime
/// (TS-side expectation; matches the existing `FileTreeNode` units).
fn project_note_record(entry: &NoteEntry) -> NoteRecord {
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
}

/// Returns every `NoteEntry` whose `frontmatter[key]` equals `value`
/// (canonical-JSON equality). Phase 8.3.
#[tauri::command]
pub fn query_notes_by_property(
	key: String,
	value: JsonValue,
	state: tauri::State<'_, VaultIndexState>,
) -> Result<Vec<NoteEntry>, String> {
	let idx = state
		.read()
		.map_err(|e| format!("VaultIndex lock poisoned: {}", e))?;
	Ok(idx.lookup_notes_by_property(&key, &value))
}

/// Returns every distinct value the index has seen for `key`. Used by
/// the Properties Panel's value autocomplete. Phase 8.3.
#[tauri::command]
pub fn get_property_values(
	key: String,
	state: tauri::State<'_, VaultIndexState>,
) -> Result<Vec<JsonValue>, String> {
	let idx = state
		.read()
		.map_err(|e| format!("VaultIndex lock poisoned: {}", e))?;
	Ok(idx.lookup_property_values(&key))
}

/// Returns the entry's frontmatter map at `path`, or empty when the
/// path is unknown to the index. Phase 8.3.
#[tauri::command]
pub fn get_note_properties(
	path: String,
	state: tauri::State<'_, VaultIndexState>,
) -> Result<BTreeMap<String, JsonValue>, String> {
	let idx = state
		.read()
		.map_err(|e| format!("VaultIndex lock poisoned: {}", e))?;
	Ok(idx.lookup_note_properties(&path))
}

/// Returns every entry projected as a `NoteRecord` — the shape the TS
/// `collection.service::buildPropertyIndex` consumes. Replaces the
/// per-file TS frontmatter parse + metadata join. Phase 8.3.
#[tauri::command]
pub fn get_all_property_records(
	state: tauri::State<'_, VaultIndexState>,
) -> Result<Vec<NoteRecord>, String> {
	let idx = state
		.read()
		.map_err(|e| format!("VaultIndex lock poisoned: {}", e))?;
	let mut out: Vec<NoteRecord> = idx.entries().values().map(project_note_record).collect();
	// Stable order — paths aren't guaranteed by HashMap iteration.
	out.sort_by(|a, b| a.path.cmp(&b.path));
	Ok(out)
}

/// Atomically creates a new note at `path` with the given `content`.
/// Errors when the file already exists OR the parent directory doesn't
/// exist. Updates the managed `VaultIndex` and emits
/// `vault-index-updated` after dropping the lock. Phase 8.6.
///
/// Caller responsibilities: ensure `path` is absolute (validated against
/// the vault root by Tauri's plugin-fs ACL at the OS layer); pre-process
/// any template content (template processing stays TS-side per the plan).
/// On success, also call `markRecentSave(path)` from the FE so the
/// watcher's self-save filter picks up this write and skips the rebuild.
#[tauri::command]
pub fn create_note(
	app: tauri::AppHandle,
	state: tauri::State<'_, VaultIndexState>,
	path: String,
	content: String,
) -> Result<UpdateResult, String> {
	if Path::new(&path).exists() {
		return Err(format!("File already exists: {}", path));
	}
	std::fs::write(&path, &content).map_err(|e| format!("write failed for {}: {}", path, e))?;
	let mtime = read_file_mtime_secs(&path).unwrap_or(0);
	let result = {
		let mut idx = state
			.write()
			.map_err(|e| format!("VaultIndex lock poisoned: {}", e))?;
		update_note_in_index_inner(&mut idx, path, &content, mtime)
	};
	if let Err(emit_err) = app.emit(VAULT_INDEX_UPDATED_EVENT, &result) {
		debug_log(
			"VAULT-V2",
			format!("create_note: vault-index-updated emit failed: {}", emit_err),
		);
	}
	Ok(result)
}

/// Creates a directory (recursive — equivalent to TS `mkdir(path, {
/// recursive: true })`). No-op when the directory already exists.
/// Doesn't touch the `VaultIndex` (folders aren't notes). Phase 8.6.
#[tauri::command]
pub fn create_folder(path: String) -> Result<(), String> {
	std::fs::create_dir_all(&path).map_err(|e| format!("mkdir failed for {}: {}", path, e))
}

/// Tauri command: removes a single note from the managed `VaultIndex`.
/// Used by the FE filesystem service after a delete / rename / move so
/// the Rust-fed panels (Tags, Backlinks, Outgoing Links, Tasks) drop the
/// deleted file's contributions immediately. Without this call, deleted
/// files linger in `tags_index` and `backlinks` until the next
/// `scan_vault_v2` rebuild. Phase 7.5 (added during the FE migration).
///
/// Lock is released BEFORE the emit so consumers reacting to
/// `vault-index-updated` can immediately re-read the index.
#[tauri::command]
pub fn remove_note_from_index(
	app: tauri::AppHandle,
	state: tauri::State<'_, VaultIndexState>,
	path: String,
) -> Result<UpdateResult, String> {
	let result = {
		let mut idx = state
			.write()
			.map_err(|e| format!("VaultIndex lock poisoned: {}", e))?;
		idx.remove_entry(&path)
	};
	if let Err(emit_err) = app.emit(VAULT_INDEX_UPDATED_EVENT, &result) {
		debug_log(
			"VAULT-V2",
			format!(
				"remove_note_from_index: vault-index-updated emit failed: {}",
				emit_err,
			),
		);
	}
	Ok(result)
}

/// Tauri command: scans a vault and rebuilds the managed `VaultIndex`.
/// Returns the same `Vec<NoteEntry>` produced by [`collect_v2_entries`]
/// so the frontend has the data without an extra round-trip.
///
/// The original `scan_vault` (which returns the recursive `FileNode` tree
/// the file explorer needs) is not affected and continues to be the
/// source of truth for tree shape. `scan_vault_v2` only emits markdown
/// leaves and uses absolute paths everywhere (CLAUDE.md Indexing &
/// Watcher item 5).
///
/// After the rebuild commits, emits `vault-index-updated` with
/// `{ changed: true, affected: [], version: <new> }`. `affected: []`
/// signals "full rebuild — re-fetch from scratch" to consumers; the
/// non-empty `affected` slot is reserved for incremental
/// `update_note_in_index` mutations (Phase 2.6). The lock is dropped
/// BEFORE emitting so reactive consumers can immediately re-read the
/// fresh index without contending with the write guard.
#[tauri::command]
pub fn scan_vault_v2(
	app: tauri::AppHandle,
	path: String,
	state: tauri::State<'_, VaultIndexState>,
) -> Result<Vec<NoteEntry>, String> {
	let notes = collect_v2_entries(&path)?;
	let build_start = std::time::Instant::now();
	let new_version = {
		let mut idx = state
			.write()
			.map_err(|e| format!("VaultIndex lock poisoned: {}", e))?;
		idx.build(notes.clone());
		debug_log(
			"VAULT-V2",
			format!(
				"scan_vault_v2: VaultIndex.build({} entries) in {}ms, version={}",
				notes.len(),
				build_start.elapsed().as_millis(),
				idx.version(),
			),
		);
		idx.version()
	};
	let payload = UpdateResult {
		changed: true,
		affected: Vec::new(),
		version: new_version,
	};
	if let Err(emit_err) = app.emit(VAULT_INDEX_UPDATED_EVENT, &payload) {
		debug_log(
			"VAULT-V2",
			format!(
				"scan_vault_v2: vault-index-updated emit failed: {}",
				emit_err,
			),
		);
	}
	Ok(notes)
}

fn sort_nodes(nodes: &mut [FileNode], sort_by: &str) {
    nodes.sort_by(|a, b| {
        // Directories always come first
        if a.is_directory != b.is_directory {
            return if a.is_directory {
                Ordering::Less
            } else {
                Ordering::Greater
            };
        }
        match sort_by {
            "modified" => {
                let b_mod = b.modified_at.unwrap_or(0);
                let a_mod = a.modified_at.unwrap_or(0);
                b_mod.cmp(&a_mod) // newest first
            }
            _ => a.name.to_lowercase().cmp(&b.name.to_lowercase()),
        }
    });
}
