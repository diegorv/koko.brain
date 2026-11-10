use crate::events::VAULT_INDEX_UPDATED_EVENT;
use crate::utils::fs as vault_fs;
use crate::utils::logger::{debug_log, is_debug_enabled};
use crate::vault::entry::{NoteEntry, NoteRecord, OutgoingLink, OutgoingUnlinkedMention, RelationshipBacklink};
use crate::vault::index::{match_unlinked_mentions, UpdateResult, VaultIndex};
use crate::vault::parsing::{
	extract_tasks_from_section, parse_task_line, rewrite_type_in_frontmatter, set_task_status_in_content,
};
use crate::vault::task::{display_name, FileTaskGroup, TagAggregate, TaskStatus, ToggleTaskResult};
use crate::vault::task_lines::{
	apply_task_line_edits, TaskLineEditOutcome, TaskLineEdits, TaskLinesOutcome, TaskLinesWriteResult,
};
use crate::vault::VaultIndexState;
use serde::Serialize;
use std::cmp::Ordering;
use std::fs;
use std::path::Path;
use std::sync::Mutex;
use std::time::{Instant, UNIX_EPOCH};
use tauri::{Emitter, Manager};

/// Maximum recursion depth for directory traversal (prevents symlink loops / extreme nesting).
const MAX_DEPTH: usize = 64;

/// RAII guard that traces the entry and exit of a Tauri command body to the
/// debug log (only when debug mode is on — `debug_log` is a no-op otherwise).
/// Construction emits `enter <name>`; drop emits `exit <name> after Nms`.
///
/// Used to localise UI freezes that may be caused by long-running Rust IPCs
/// during the 2026-04-29 freeze investigation. If a command enters but never
/// exits in the log, we know which command stalled. Drop fires on every
/// return path (including `?` propagation), so coverage is automatic.
struct CmdTrace {
	name: &'static str,
	start: Instant,
}

impl CmdTrace {
	fn new(name: &'static str) -> Self {
		debug_log("VAULT-CMD", format!("enter {}", name));
		CmdTrace {
			name,
			start: Instant::now(),
		}
	}
}

impl Drop for CmdTrace {
	fn drop(&mut self) {
		debug_log(
			"VAULT-CMD",
			format!("exit {} after {}ms", self.name, self.start.elapsed().as_millis()),
		);
	}
}

/// Vault path whose shape was last logged, so a full rebuild of the same
/// vault does not repeat the session facts.
static SHAPE_LOGGED_FOR: Mutex<Option<String>> = Mutex::new(None);

/// Logs the vault shape and the Rust build profile once per vault path,
/// right after a full index build. Skipped while debug logging is off so
/// the one line is not spent where nobody reads it.
fn log_vault_shape_once(path: &str, idx: &VaultIndex) {
	if !is_debug_enabled() {
		return;
	}
	let mut last = SHAPE_LOGGED_FOR.lock().unwrap_or_else(|e| e.into_inner());
	if last.as_deref() == Some(path) {
		return;
	}
	*last = Some(path.to_string());
	let shape = idx.shape();
	let profile = if cfg!(debug_assertions) { "debug" } else { "release" };
	debug_log(
		"SESSION",
		format!(
			"vault notes={} with_tasks={} tag_roots={} tag_pairs={} dirs={} rust_profile={}",
			shape.notes, shape.notes_with_tasks, shape.tag_roots, shape.tag_pairs, shape.dirs, profile,
		),
	);
}

/// A single entry (file or folder) in the vault's file tree.
/// Serializes to camelCase; `FileTreeNode` (fs.types.ts) extends this type.
#[derive(Serialize, Clone, Debug, ts_rs::TS)]
#[ts(export)]
#[serde(rename_all = "camelCase")]
pub struct FileNode {
    /// Display name (e.g. "note.md").
    pub name: String,
    /// Absolute path on disk.
    pub path: String,
    /// Whether this node is a directory.
    pub is_directory: bool,
    /// Sorted child nodes; only present for directories.
    #[serde(skip_serializing_if = "Option::is_none")]
    #[ts(optional)]
    pub children: Option<Vec<FileNode>>,
    /// Last-modified timestamp in ms, used for "date modified" sorting.
    #[serde(skip_serializing_if = "Option::is_none")]
    #[ts(optional)]
    pub modified_at: Option<u64>,
    /// Creation timestamp in ms, used by the calendar to group files by date.
    #[serde(skip_serializing_if = "Option::is_none")]
    #[ts(optional)]
    pub created_at: Option<u64>,
}

/// Recursively scans a vault directory and returns the full file tree with metadata.
/// Skips hidden files/directories (dot-prefixed), which includes the `.kokobrain` internal folder.
/// Sorting is applied at each level: directories first, then by `sort_by` strategy.
///
/// The command is `async` so the directory walk runs on a blocking worker
/// thread via `spawn_blocking`: a synchronous `fn` command runs on the app
/// main thread and stalls the window for the whole scan (up to ~2.4 s
/// measured). Same rationale as `build_search_index`
/// (commands/search_index.rs).
#[tauri::command]
pub async fn scan_vault(path: String, sort_by: String) -> Result<Vec<FileNode>, String> {
	tokio::task::spawn_blocking(move || {
		let _trace = CmdTrace::new("scan_vault");
		scan_vault_inner(path, sort_by)
	})
	.await
	.map_err(|e| format!("scan_vault task join error: {e}"))?
}

/// Synchronous implementation of `scan_vault`, exposed for tests.
pub fn scan_vault_inner(path: String, sort_by: String) -> Result<Vec<FileNode>, String> {
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
        // Skip (don't abort) on a per-entry stat failure: a file deleted/renamed
        // mid-scan, or one the process can't stat, must not wipe the whole tree.
        // Mirrors the Err(_) => continue in utils::fs::walk_dir.
        let metadata = match fs::symlink_metadata(&file_path) {
            Ok(m) => m,
            Err(_) => continue,
        };

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

/// The canonical vault root as a string: the prefix `collect_v2_entries`
/// builds every entry path from, so `VaultIndex` can resolve a path-style
/// wikilink at its vault-relative path.
fn canonical_vault_root(path: &str) -> Result<String, String> {
	Ok(vault_fs::validate_vault_path(path)?.to_string_lossy().to_string())
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
///
/// Invariant (issue 49): index membership is exactly what
/// `collect_markdown_paths_with_metadata` walks, i.e. `.md` / `.markdown`
/// / `.view` per `vault_fs::is_markdown_filename`. Every insertion path
/// funnels through here (`create_note`, `update_note_in_index`,
/// `propagate_type_rename_inner`, `toggle_task_status_inner`), so the
/// guard below is what keeps the incremental side and the full-rescan
/// side from disagreeing. Without it a `.canvas` / `.kanban` /
/// `.collection` save inserted an entry that lived until the next
/// `VaultIndex::build` silently dropped it.
pub fn update_note_in_index_inner(
	idx: &mut VaultIndex,
	path: String,
	content: &str,
	mtime: i64,
) -> UpdateResult {
	if !vault_fs::is_markdown_filename(&path) {
		return UpdateResult {
			version: idx.version(),
			..Default::default()
		};
	}
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
	let _trace = CmdTrace::new("update_note_in_index");
	let mtime = read_file_mtime_secs(&path).unwrap_or(0);
	let result = {
		let mut idx = state
			.write()
			.map_err(|e| format!("VaultIndex lock poisoned: {}", e))?;
		update_note_in_index_inner(&mut idx, path, &content, mtime)
	};
	if result.changed {
		if let Err(emit_err) = app.emit(VAULT_INDEX_UPDATED_EVENT, &result) {
			debug_log(
				"VAULT-V2",
				format!(
					"update_note_in_index: vault-index-updated emit failed: {}",
					emit_err,
				),
			);
		}
	}
	Ok(result)
}

/// Inner half of `propagate_type_rename`: rewrites `_type: old` ->
/// `_type: new` in every member note (entries whose `is_a == old_type`)
/// and updates the index entry in lock-step with each disk write. Member
/// notes are matched via the index's `is_a` (already casing-normalized);
/// the on-disk rewrite applies the same normalization rule, so lowercase
/// or alias-keyed (`type:`) frontmatter is caught too. Per-file I/O
/// failures are logged and skipped — the rename proceeds for the
/// remaining members. Returns the updated count and the members'
/// `UpdateResult`s folded with [`UpdateResult::absorb`] (its `version`
/// reflects all updates, `upserted` lists every rewritten member) for the
/// caller to emit.
pub fn propagate_type_rename_inner(
	idx: &mut VaultIndex,
	old_type: &str,
	new_type: &str,
) -> (usize, Option<UpdateResult>) {
	let member_paths: Vec<String> = idx
		.entries()
		.values()
		.filter(|e| e.is_a.as_deref() == Some(old_type))
		.map(|e| e.path.clone())
		.collect();

	let mut updated = 0usize;
	let mut last_result: Option<UpdateResult> = None;
	for path in member_paths {
		let content = match std::fs::read_to_string(&path) {
			Ok(c) => c,
			Err(e) => {
				debug_log(
					"VAULT-V2",
					format!("propagate_type_rename: read failed for {}: {}", path, e),
				);
				continue;
			}
		};
		let Some(new_content) = rewrite_type_in_frontmatter(&content, old_type, new_type) else {
			continue;
		};
		if let Err(e) = vault_fs::write_atomic(&path, &new_content) {
			debug_log(
				"VAULT-V2",
				format!("propagate_type_rename: write failed for {}: {}", path, e),
			);
			continue;
		}
		let mtime = read_file_mtime_secs(&path).unwrap_or(0);
		let step = update_note_in_index_inner(idx, path, &new_content, mtime);
		match last_result.as_mut() {
			Some(acc) => acc.absorb(step),
			None => last_result = Some(step),
		}
		updated += 1;
	}
	(updated, last_result)
}

/// Tauri command: propagates a type rename to all member notes —
/// rewrites their `_type:` frontmatter from `old_type` to `new_type` in
/// one pass and reindexes each file. The definition note itself is NOT
/// touched (its `_type` is `Type`); the caller renames it via the
/// regular file-rename flow first. Emits `vault-index-updated` once at
/// the end (lock dropped first, mirroring `update_note_in_index`).
/// Returns the number of member notes updated.
#[tauri::command]
pub fn propagate_type_rename(
	app: tauri::AppHandle,
	state: tauri::State<'_, VaultIndexState>,
	old_type: String,
	new_type: String,
) -> Result<usize, String> {
	let _trace = CmdTrace::new("propagate_type_rename");
	let (updated, last_result) = {
		let mut idx = state
			.write()
			.map_err(|e| format!("VaultIndex lock poisoned: {}", e))?;
		propagate_type_rename_inner(&mut idx, &old_type, &new_type)
	};
	if let Some(result) = last_result {
		if let Err(emit_err) = app.emit(VAULT_INDEX_UPDATED_EVENT, &result) {
			debug_log(
				"VAULT-V2",
				format!(
					"propagate_type_rename: vault-index-updated emit failed: {}",
					emit_err,
				),
			);
		}
	}
	Ok(updated)
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
	let _trace = CmdTrace::new("get_backlinks_v2");
	let idx = state
		.read()
		.map_err(|e| format!("VaultIndex lock poisoned: {}", e))?;
	Ok(idx.lookup_backlinks(&path))
}

/// Returns notes that reference `path` via frontmatter relationship fields
/// (`belongs_to`, `related_to`, or custom wikilink-bearing fields).
#[tauri::command]
pub fn get_relationship_backlinks_v2(
	path: String,
	state: tauri::State<'_, VaultIndexState>,
) -> Result<Vec<RelationshipBacklink>, String> {
	let _trace = CmdTrace::new("get_relationship_backlinks_v2");
	let idx = state
		.read()
		.map_err(|e| format!("VaultIndex lock poisoned: {}", e))?;
	Ok(idx.lookup_relationship_backlinks(&path))
}

/// Returns the outgoing wikilinks of `path`, each resolved against the
/// managed `VaultIndex` resolution caches (so callers know which links are
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
	let _trace = CmdTrace::new("get_outgoing_links_v2");
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
	let _trace = CmdTrace::new("get_outgoing_unlinked_mentions_v2");
	let idx = state
		.read()
		.map_err(|e| format!("VaultIndex lock poisoned: {}", e))?;
	Ok(idx.lookup_outgoing_unlinked_mentions(&path, &content))
}

/// Returns every `NoteEntry` in the vault index, sorted by path. Phase
/// 11.5a — supports TS-side consumers (graph view, kb-api / queryjs,
/// file-icons frontmatter scan, search fallback, wikilink completion
/// alias loop) that previously iterated `noteIndexStore.noteContents` /
/// `noteIndexStore.noteIndex` to walk every note's metadata.
///
/// The returned `Vec<NoteEntry>` is a clone of the index entries — safe
/// for downstream sort/filter without affecting the live index. Reads
/// under a shared lock; safe to call concurrently with other readers.
#[tauri::command]
pub fn get_all_vault_entries_v2(
	state: tauri::State<'_, VaultIndexState>,
) -> Result<Vec<NoteEntry>, String> {
	let _trace = CmdTrace::new("get_all_vault_entries_v2");
	let idx = state
		.read()
		.map_err(|e| format!("VaultIndex lock poisoned: {}", e))?;
	let mut out: Vec<NoteEntry> = idx.entries().values().cloned().collect();
	out.sort_by(|a, b| a.path.cmp(&b.path));
	Ok(out)
}

/// Returns notes whose body mentions `path`'s note name in plain text
/// (after frontmatter / fenced-code stripping and Unicode word-boundary
/// checks) but do NOT have a wikilink to `path`. Sorted by title for
/// stable UI ordering.
///
/// Three-phase split so the runtime worker is freed almost immediately:
///   Phase 1 (locked, ~1-5 ms): snapshot the search term + candidate
///     path strings via `unlinked_mentions_candidates`. Cheap — just
///     clones ~2000 String paths.
///   Phase 2 (unlocked, ~400-600 ms, spawn_blocking): disk reads +
///     word-boundary matching via `match_unlinked_mentions`. Returns
///     the matched-path subset (typically 1-20 paths).
///   Phase 3 (locked, ~µs): re-acquire the read lock to clone the
///     full `NoteEntry` for each matched path. Tiny because M is tiny.
///
/// The 2026-04-29 dogfood showed that an earlier two-phase split —
/// where Phase 1 cloned the full candidate `NoteEntry`s before the
/// `spawn_blocking` — left the runtime worker busy on ~50-100 ms of
/// allocations, queueing concurrent `readTextFile` and
/// `fetchBacklinksV2` IPCs behind it (`openFileInEditor:fresh` p95
/// climbed back to 85 ms). Cloning JUST the path strings drops Phase 1
/// to ~1-5 ms; the runtime worker is freed within microseconds of the
/// `spawn_blocking`, and concurrent IPCs flow through other workers.
#[tauri::command]
pub async fn get_unlinked_mentions_v2(
	path: String,
	state: tauri::State<'_, VaultIndexState>,
) -> Result<Vec<NoteEntry>, String> {
	let _trace = CmdTrace::new("get_unlinked_mentions_v2");
	// Phase 1: cheap snapshot under a brief read lock.
	let candidates = {
		let idx = state
			.read()
			.map_err(|e| format!("VaultIndex lock poisoned: {}", e))?;
		idx.unlinked_mentions_candidates(&path)
	};

	let note_name = candidates.note_name;
	let candidate_paths = candidates.candidate_paths;

	// Phase 2: disk reads + matching. No lock; runs on a blocking
	// thread so the runtime worker is free for other commands.
	let matched_paths: Vec<String> =
		tokio::task::spawn_blocking(move || match_unlinked_mentions(&note_name, candidate_paths))
			.await
			.map_err(|e| format!("get_unlinked_mentions_v2 task join error: {}", e))?;

	// Phase 3: re-acquire the read lock for a tiny per-match lookup.
	let mut results = {
		let idx = state
			.read()
			.map_err(|e| format!("VaultIndex lock poisoned: {}", e))?;
		idx.lookup_entries(&matched_paths)
	};
	results.sort_by_key(|a| a.title.to_lowercase());
	Ok(results)
}

/// Returns the flat list of tag aggregates (one per distinct tag), sorted
/// alphabetically. Phase 7.3 — replaces `tags.service.ts::buildTagIndex`'s
/// JS-side aggregation. The frontend builds the tree from this output via
/// the existing `buildTagTree` / `sortTagTree` helpers.
#[tauri::command]
pub fn get_all_tags_v2(
	state: tauri::State<'_, VaultIndexState>,
) -> Result<Vec<TagAggregate>, String> {
	let _trace = CmdTrace::new("get_all_tags_v2");
	let idx = state
		.read()
		.map_err(|e| format!("VaultIndex lock poisoned: {}", e))?;
	Ok(idx.lookup_all_tags())
}

/// Returns every file's tasks grouped by file, sorted by `modifiedAt`
/// descending. Files with zero tasks are filtered out. Phase 7.3 —
/// replaces `tasks.service.ts::buildTaskIndex`'s JS-side aggregation.
#[tauri::command]
pub fn get_all_tasks_v2(
	state: tauri::State<'_, VaultIndexState>,
) -> Result<Vec<FileTaskGroup>, String> {
	let _trace = CmdTrace::new("get_all_tasks_v2");
	let idx = state
		.read()
		.map_err(|e| format!("VaultIndex lock poisoned: {}", e))?;
	Ok(idx.lookup_all_tasks())
}

/// A note that may hold tasks in a matching section: the path to read and
/// the `modified_at` the result group carries.
#[derive(Debug, Clone)]
pub struct SectionTaskCandidate {
	/// Absolute file path.
	pub path: String,
	/// Last-modified timestamp (seconds) from the index entry.
	pub modified_at: i64,
}

/// Picks the notes `tasks_in_section` has to read: those whose index entry
/// has at least one task. Exact, not a heuristic: `NoteEntry.tasks` is
/// `extract_tasks` over the full content, and `extract_tasks_from_section`
/// runs the same line split, fence logic and `parse_task_line` behind an
/// extra heading gate, so a note with no tasks has no section tasks.
pub fn section_task_candidates<'a>(
	entries: impl IntoIterator<Item = &'a NoteEntry>,
) -> Vec<SectionTaskCandidate> {
	entries
		.into_iter()
		.filter(|e| !e.tasks.is_empty())
		.map(|e| SectionTaskCandidate {
			path: e.path.clone(),
			modified_at: e.modified_at,
		})
		.collect()
}

/// Reads each candidate through `read`, keeps the tasks under headings
/// that contain `section_tag`, and returns the non-empty groups sorted by
/// `modified_at` descending. A read failure is logged and the note skipped,
/// so one vanished file does not fail the whole query.
pub fn tasks_in_section(
	candidates: Vec<SectionTaskCandidate>,
	section_tag: &str,
	mut read: impl FnMut(&str) -> std::io::Result<String>,
) -> Vec<FileTaskGroup> {
	debug_log(
		"VAULT-V2",
		format!("get_tasks_in_section_v2: reading {} notes with tasks", candidates.len()),
	);
	let mut out: Vec<FileTaskGroup> = Vec::new();
	for candidate in candidates {
		let content = match read(&candidate.path) {
			Ok(c) => c,
			Err(err) => {
				debug_log(
					"VAULT-V2",
					format!(
						"get_tasks_in_section_v2: read failed for {} ({}); skipping",
						candidate.path, err
					),
				);
				continue;
			}
		};
		let tasks = extract_tasks_from_section(&content, section_tag);
		if !tasks.is_empty() {
			out.push(FileTaskGroup {
				file_name: display_name(&candidate.path),
				file_path: candidate.path,
				modified_at: candidate.modified_at,
				tasks,
			});
		}
	}
	out.sort_by_key(|g| std::cmp::Reverse(g.modified_at));
	out
}

/// Returns tasks across the vault filtered by section heading: only tasks
/// whose containing heading text contains `section_tag` are emitted. The
/// `VaultIndex` does not store headings, so this command reads from disk
/// every note whose index entry has tasks (`section_task_candidates`).
///
/// Async so Tauri runs it off the app main thread. The candidates are
/// copied under a brief read guard and the files are read on a blocking
/// thread with the guard released, so writers such as
/// `update_note_in_index` (which take `.write()`) do not wait on disk I/O.
#[tauri::command]
pub async fn get_tasks_in_section_v2(
	section_tag: String,
	state: tauri::State<'_, VaultIndexState>,
) -> Result<Vec<FileTaskGroup>, String> {
	let _trace = CmdTrace::new("get_tasks_in_section_v2");
	let candidates = {
		let idx = state
			.read()
			.map_err(|e| format!("VaultIndex lock poisoned: {}", e))?;
		section_task_candidates(idx.entries().values())
	};
	tokio::task::spawn_blocking(move || {
		tasks_in_section(candidates, &section_tag, |p| std::fs::read_to_string(p))
	})
	.await
	.map_err(|e| format!("get_tasks_in_section_v2 task join error: {}", e))
}

/// Pure-logic implementation behind `toggle_task_status`. Reads the
/// current file content and re-parses the task at `line_number`. When that
/// line no longer holds a task with `expected_text` and `expected_status`
/// (the Tasks list can lag disk by seconds), nothing is written and the
/// result is `stale`. Otherwise the checkbox is set to `target`, the new
/// content is written back, and the diff applied to the `VaultIndex` is
/// returned. `Task.text` excludes the checkbox, which is why the status is
/// compared too.
/// Tests construct a tmpdir + an in-memory `VaultIndex`, call this
/// directly, and assert on disk + index state without a Tauri AppHandle.
pub fn toggle_task_status_inner(
	idx: &mut VaultIndex,
	path: &str,
	line_number: usize,
	expected_text: &str,
	expected_status: TaskStatus,
	target: TaskStatus,
) -> Result<ToggleTaskResult, String> {
	let original = std::fs::read_to_string(path)
		.map_err(|e| format!("read failed for {}: {}", path, e))?;
	let holds_expected = line_number
		.checked_sub(1)
		.and_then(|i| original.split('\n').nth(i))
		.and_then(|line| parse_task_line(line, line_number))
		.is_some_and(|task| task.text == expected_text && task.status == expected_status);
	let updated = if holds_expected {
		set_task_status_in_content(&original, line_number, target)
	} else {
		original.clone()
	};
	if updated == original {
		// No-op: stale line, or `target` is already the line's status.
		// Skip the disk write and the index update entirely.
		return Ok(ToggleTaskResult {
			updated_content: original,
			update_result: UpdateResult {
				version: idx.version(),
				..Default::default()
			},
			stale: !holds_expected,
		});
	}
	vault_fs::write_atomic(path, &updated)?;
	let mtime = read_file_mtime_secs(path).unwrap_or(0);
	let result = update_note_in_index_inner(idx, path.to_string(), &updated, mtime);
	Ok(ToggleTaskResult {
		updated_content: updated,
		update_result: result,
		stale: false,
	})
}

/// Tauri command: toggles a task's checkbox on disk + in the managed
/// `VaultIndex`. Replaces the direct `writeTextFile` call at
/// `tasks.service.ts:113` (a known JS write-surface violator from the
/// Phase 11.5 audit list). Phase 7.4.
///
/// Flow:
///   1. Read file from disk.
///   2. If the line at `line_number` no longer holds a task with
///      `expected_text` and `expected_status`: return a no-op result with
///      `stale: true`.
///   3. Set the checkbox to `target` via `set_task_status_in_content`; if
///      that leaves the content unchanged, return a no-op result.
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
	expected_text: String,
	expected_status: TaskStatus,
	target: TaskStatus,
) -> Result<ToggleTaskResult, String> {
	let _trace = CmdTrace::new("toggle_task_status");
	let result = {
		let mut idx = state
			.write()
			.map_err(|e| format!("VaultIndex lock poisoned: {}", e))?;
		toggle_task_status_inner(
			&mut idx,
			&path,
			line_number,
			&expected_text,
			expected_status,
			target,
		)?
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

/// Joins a vault-relative note path onto the canonical `root`. Refuses a
/// path that is empty, absolute, holds a `.` or `..` segment, is not `.md` /
/// `.markdown`, or reaches outside `root` through a symlink (checked on the
/// file, or on its nearest existing ancestor when it does not exist yet).
fn confined_note_path(root: &Path, rel_path: &str) -> Result<std::path::PathBuf, String> {
	let rel = Path::new(rel_path);
	let plain = rel.components().next().is_some()
		&& rel.components().all(|c| matches!(c, std::path::Component::Normal(_)));
	if !plain || !vault_fs::is_search_indexed_filename(rel_path) {
		return Err(format!("Refusing a note path that is not vault-relative Markdown: {:?}", rel_path));
	}
	let path = root.join(rel);
	let existing = path
		.ancestors()
		.find(|p| fs::symlink_metadata(p).is_ok())
		.ok_or_else(|| format!("No existing ancestor for {}", path.display()))?;
	let canonical = existing
		.canonicalize()
		.map_err(|e| format!("Failed to resolve {}: {}", existing.display(), e))?;
	if !canonical.starts_with(root) {
		return Err(format!("Refusing a note path outside the vault: {:?}", rel_path));
	}
	Ok(path)
}

/// Pure-logic implementation behind `write_task_lines`: checks the root,
/// confines the path, applies `edits` through `apply_task_line_edits`, and
/// writes and indexes the note only when the batch changed it. A missing note
/// is never created here: the caller creates it through `create_note`, so the
/// explorer and the note-change owner see a `create`, then calls again.
pub fn write_task_lines_inner(
	idx: &mut VaultIndex,
	vault_root: &str,
	rel_path: &str,
	edits: &TaskLineEdits,
) -> Result<TaskLinesWriteResult, String> {
	let root = vault_fs::validate_vault_path(vault_root)?;
	if idx.vault_root() != Some(root.to_string_lossy().as_ref()) {
		return Err(format!("Refusing to write task lines: {} is not the open vault", vault_root));
	}
	let path = confined_note_path(&root, rel_path)?;
	let path_str = path.to_string_lossy().to_string();
	let original = match fs::read_to_string(&path) {
		Ok(content) => Some(content),
		Err(e) if e.kind() == std::io::ErrorKind::NotFound => None,
		Err(e) => return Err(format!("read failed for {}: {}", path_str, e)),
	};
	let no_write = |outcome, content, stale| TaskLinesWriteResult {
		outcome,
		content,
		stale,
		update_result: UpdateResult {
			version: idx.version(),
			..Default::default()
		},
	};
	let updated = match apply_task_line_edits(original.as_deref().unwrap_or(""), edits)? {
		TaskLineEditOutcome::Stale(stale) => return Ok(no_write(TaskLinesOutcome::Stale, None, Some(stale))),
		TaskLineEditOutcome::Applied(updated) => updated,
	};
	let Some(original) = original else {
		// A batch that adds no text would only create an empty note.
		if updated.trim().is_empty() {
			return Ok(no_write(TaskLinesOutcome::Unchanged, None, None));
		}
		return Ok(no_write(TaskLinesOutcome::Missing, None, None));
	};
	if updated == original {
		return Ok(no_write(TaskLinesOutcome::Unchanged, Some(original), None));
	}
	vault_fs::write_atomic(&path_str, &updated)?;
	let mtime = read_file_mtime_secs(&path_str).unwrap_or(0);
	let update_result = update_note_in_index_inner(idx, path_str, &updated, mtime);
	Ok(TaskLinesWriteResult {
		outcome: TaskLinesOutcome::Written,
		content: Some(updated),
		stale: None,
		update_result,
	})
}

/// Tauri command: replaces, inserts and removes task lines in the note at
/// `rel_path` under `vault_root`, all or nothing, located by `🆔 td-…`
/// anchor plus the expected line (todoist-bisync design rule 12). Refuses a
/// root other than the open vault. Writes atomically, updates the
/// `VaultIndex` and emits `vault-index-updated` like `toggle_task_status`,
/// with the lock dropped first.
#[tauri::command]
pub fn write_task_lines(
	app: tauri::AppHandle,
	state: tauri::State<'_, VaultIndexState>,
	vault_root: String,
	rel_path: String,
	edits: TaskLineEdits,
) -> Result<TaskLinesWriteResult, String> {
	let _trace = CmdTrace::new("write_task_lines");
	let result = {
		let mut idx = state
			.write()
			.map_err(|e| format!("VaultIndex lock poisoned: {}", e))?;
		write_task_lines_inner(&mut idx, &vault_root, &rel_path, &edits)?
	};
	if result.update_result.changed {
		if let Err(emit_err) = app.emit(VAULT_INDEX_UPDATED_EVENT, &result.update_result) {
			debug_log(
				"VAULT-V2",
				format!("write_task_lines: vault-index-updated emit failed: {}", emit_err),
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
pub fn project_note_record(entry: &NoteEntry) -> NoteRecord {
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
	let mut properties = entry.frontmatter.clone();
	if let Some(ref is_a) = entry.is_a {
		properties.insert("_type".to_string(), serde_json::Value::String(is_a.clone()));
	} else if properties.get("_type") == Some(&serde_json::Value::Null) {
		// A bare `type:` is "" on the TS edit path (ADR 0029 reads `key:` as
		// ""), which cannot tell it from `type: ""` after the parse.
		properties.insert("_type".to_string(), serde_json::Value::String(String::new()));
	}
	properties.insert("organized".to_string(), serde_json::Value::Bool(entry.organized));
	properties.insert("archived".to_string(), serde_json::Value::Bool(entry.archived));
	properties.insert("favorite".to_string(), serde_json::Value::Bool(entry.favorite));
	// Override `tags` with the merged frontmatter+inline set so Collection
	// filters (`file.tags`, `file.hasTag`) see body `#tags`, matching QueryJS
	// and the docs contract (`file.tags` = frontmatter + inline).
	properties.insert("tags".to_string(), serde_json::json!(entry.tags));
	if !entry.belongs_to.is_empty() {
		properties.insert("_belongs_to".to_string(), serde_json::json!(entry.belongs_to));
	}
	if !entry.related_to.is_empty() {
		properties.insert("_related_to".to_string(), serde_json::json!(entry.related_to));
	}
	if !entry.has_many.is_empty() {
		properties.insert("_has_many".to_string(), serde_json::json!(entry.has_many));
	}
	NoteRecord {
		path: path.clone(),
		name,
		basename,
		folder,
		ext,
		mtime: entry.modified_at.saturating_mul(1000),
		ctime: entry.created_at.saturating_mul(1000),
		size: entry.size,
		properties,
	}
}

/// Returns every entry projected as a `NoteRecord` — the shape the TS
/// `collection.service::buildPropertyIndex` consumes. Replaces the
/// per-file TS frontmatter parse + metadata join. Phase 8.3.
#[tauri::command]
pub fn get_all_property_records(
	state: tauri::State<'_, VaultIndexState>,
) -> Result<Vec<NoteRecord>, String> {
	let _trace = CmdTrace::new("get_all_property_records");
	let idx = state
		.read()
		.map_err(|e| format!("VaultIndex lock poisoned: {}", e))?;
	let mut out: Vec<NoteRecord> = idx.entries().values().map(project_note_record).collect();
	// Stable order — paths aren't guaranteed by HashMap iteration.
	out.sort_by(|a, b| a.path.cmp(&b.path));
	Ok(out)
}

/// The index state of a set of paths, in the two shapes the frontend
/// snapshots hold: the `get_all_vault_entries_v2` entry and the
/// `get_all_property_records` record. Both sorted by path; a path that is
/// not in the index appears in neither.
#[derive(Debug, Clone, Serialize, ts_rs::TS)]
#[ts(export)]
#[serde(rename_all = "camelCase")]
pub struct IndexDelta {
	/// Entries of the requested paths still in the index.
	pub entries: Vec<NoteEntry>,
	/// The same entries projected as property records.
	pub records: Vec<NoteRecord>,
}

/// Builds the [`IndexDelta`] for `paths` from `idx`. Unknown paths are
/// skipped, duplicates collapse.
pub fn index_delta_inner(idx: &VaultIndex, paths: &[String]) -> IndexDelta {
	let wanted: std::collections::BTreeSet<&String> = paths.iter().collect();
	let entries: Vec<NoteEntry> = wanted
		.into_iter()
		.filter_map(|p| idx.entries().get(p).cloned())
		.collect();
	let records = entries.iter().map(project_note_record).collect();
	IndexDelta { entries, records }
}

/// Returns the entries and property records of `paths` only, so the
/// `vault-index-updated` listener can patch its snapshots for the paths an
/// event reported instead of re-reading the whole vault.
#[tauri::command]
pub fn get_index_delta(
	state: tauri::State<'_, VaultIndexState>,
	paths: Vec<String>,
) -> Result<IndexDelta, String> {
	let _trace = CmdTrace::new("get_index_delta");
	let idx = state
		.read()
		.map_err(|e| format!("VaultIndex lock poisoned: {}", e))?;
	Ok(index_delta_inner(&idx, &paths))
}

/// Rejects a write target that could escape the vault before any disk write.
/// These commands call `std::fs` directly, which (unlike the `plugin-fs`
/// API) is NOT gated by Tauri's filesystem ACL, so the target must be
/// validated here. A path is rejected when it is not absolute, or when it
/// contains a `..` (parent-dir) component — the vector behind the audit
/// finding, where a crafted `[[../../x]]` wikilink makes the FE build
/// `{vault}/../../x.md` and plant a file outside the vault. Only true `..`
/// path segments are rejected; a filename with literal dots (e.g.
/// `a..b.md`) is a `Normal` component and is allowed.
pub fn ensure_safe_write_path(path: &str) -> Result<(), String> {
	let p = Path::new(path);
	if !p.is_absolute() {
		return Err(format!("Refusing to write to a non-absolute path: {}", path));
	}
	if p.components().any(|c| matches!(c, std::path::Component::ParentDir)) {
		return Err(format!(
			"Refusing to write to a path containing '..': {}",
			path
		));
	}
	Ok(())
}

/// Atomically creates a new note at `path` with the given `content`.
/// Errors when the file already exists OR the parent directory doesn't
/// exist. Updates the managed `VaultIndex` and emits
/// `vault-index-updated` after dropping the lock. Phase 8.6.
///
/// Caller responsibilities: ensure `path` is absolute; pre-process any
/// template content (template processing stays TS-side per the plan). On
/// success, also call `markRecentSave(path)` from the FE so the watcher's
/// self-save filter picks up this write and skips the rebuild. The target
/// is validated by `ensure_safe_write_path` before any write — `std::fs`
/// is not covered by the plugin-fs ACL.
#[tauri::command]
pub fn create_note(
	app: tauri::AppHandle,
	state: tauri::State<'_, VaultIndexState>,
	path: String,
	content: String,
) -> Result<UpdateResult, String> {
	let _trace = CmdTrace::new("create_note");
	ensure_safe_write_path(&path)?;
	if Path::new(&path).exists() {
		return Err(format!("File already exists: {}", path));
	}
	vault_fs::write_atomic(&path, &content)?;
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
/// The target is validated by `ensure_safe_write_path` before any write —
/// `std::fs` is not covered by the plugin-fs ACL.
#[tauri::command]
pub fn create_folder(path: String) -> Result<(), String> {
	let _trace = CmdTrace::new("create_folder");
	ensure_safe_write_path(&path)?;
	std::fs::create_dir_all(&path).map_err(|e| format!("mkdir failed for {}: {}", path, e))
}

/// `<vault_path>/.kokobrain/mods/<mod_id>/data.json`. Rust builds the path,
/// with a fixed file name, so that `std::fs`, which the plugin-fs ACL does not
/// cover, gets no general way to read or overwrite a file. The check on `mod_id`
/// only keeps it one path segment; the manifest rules are `parseModManifest`'s.
/// Errors when the vault is not a reachable folder.
fn mod_data_path(vault_path: &str, mod_id: &str) -> Result<std::path::PathBuf, String> {
	let vault = vault_fs::validate_vault_path(vault_path)?;
	let is_one_segment = !mod_id.is_empty()
		&& mod_id
			.bytes()
			.all(|b| b.is_ascii_lowercase() || b.is_ascii_digit() || b == b'-');
	if !is_one_segment {
		return Err(format!("Invalid mod id: {}", mod_id));
	}
	Ok(vault.join(".kokobrain").join("mods").join(mod_id).join("data.json"))
}

/// Writes a mod's data through `write_atomic`, creating missing folders: a
/// crash mid-write leaves the old file, never a truncated one. It touches no
/// `VaultIndex` and emits nothing.
#[tauri::command]
pub fn write_mod_data(vault_path: String, mod_id: String, content: String) -> Result<(), String> {
	let _trace = CmdTrace::new("write_mod_data");
	let path = mod_data_path(&vault_path, &mod_id)?;
	if let Some(dir) = path.parent() {
		std::fs::create_dir_all(dir).map_err(|e| format!("mkdir failed for {}: {}", dir.display(), e))?;
	}
	vault_fs::write_atomic(&path.to_string_lossy(), &content)
}

/// Reads a mod's data as raw bytes, `None` only when the file is not there. A
/// plain `exists` check would not do: it reports any error as "not there", and
/// a mod that then saves replaces the file it could not reach. Bytes rather than
/// text so the frontend can tell invalid UTF-8 from a lossy decode. Off the main
/// thread, like the plugin-fs read it replaces: a sync `fn` command would freeze
/// the window on a large file or a stalled disk.
#[tauri::command(async)]
pub fn read_mod_data(vault_path: String, mod_id: String) -> Result<Option<Vec<u8>>, String> {
	let _trace = CmdTrace::new("read_mod_data");
	let path = mod_data_path(&vault_path, &mod_id)?;
	match std::fs::read(&path) {
		Ok(bytes) => Ok(Some(bytes)),
		Err(e) if e.kind() == std::io::ErrorKind::NotFound => Ok(None),
		Err(e) => Err(format!("read failed for {}: {}", path.display(), e)),
	}
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
	let _trace = CmdTrace::new("remove_note_from_index");
	let result = {
		let mut idx = state
			.write()
			.map_err(|e| format!("VaultIndex lock poisoned: {}", e))?;
		idx.remove_entry(&path)
	};
	if result.changed {
		if let Err(emit_err) = app.emit(VAULT_INDEX_UPDATED_EVENT, &result) {
			debug_log(
				"VAULT-V2",
				format!(
					"remove_note_from_index: vault-index-updated emit failed: {}",
					emit_err,
				),
			);
		}
	}
	Ok(result)
}

/// Re-keys the managed `VaultIndex` after a rename or move of `from` to
/// `to`. Handles both cases with one walk: the entry stored under `from`
/// itself (file rename) plus every entry stored under the `from + '/'`
/// prefix (folder rename or move). The `/` boundary is what keeps a
/// sibling like `/v/dirty.md` from being swept up by a rename of `/v/dir`.
///
/// Each matched key is removed and re-inserted under its new path via
/// [`NoteEntry::with_path`], so the reverse indexes (`backlinks`,
/// `tags_index`, `properties_index`, `by_path`) follow the file instead
/// of being rebuilt from disk. Within one extension family no file is
/// re-read: every `NoteEntry` field except `title` is path-independent.
/// A rename across the `.md` / `.view` boundary changes how the file
/// parses, so that one key is re-read at its new path
/// (`reparse_across_view_boundary`).
///
/// Issue 49 invariant: a key whose NEW path is not `.md` / `.markdown` /
/// `.view` per `vault_fs::is_markdown_filename` is DROPPED rather than
/// re-inserted, so a `.md` -> `.canvas` rename cannot smuggle an entry
/// into the index that the next full rescan would silently discard. See
/// the `update_note_in_index_inner` doc comment for the same guard on
/// the insertion side.
///
/// Children are processed one at a time, so mid-loop the index holds a
/// mix of old and new child paths. That cannot break resolution AMONG
/// the renamed children: wikilink resolution goes through the resolution
/// caches (`by_path` by stem, `by_file_name` by file name), and a target
/// that does name a directory (`[[dir/foo.md]]`) is re-credited when its
/// child is re-inserted (the retro scan in `update_entry`), so the steps
/// still reach the full-rebuild end state. It can
/// re-assign a stem shared with a note OUTSIDE the renamed subtree,
/// because `remove_entry` promotes the surviving duplicate into the
/// `by_path` slot and `update_entry` is first-write-wins, so the
/// re-inserted child does not reclaim it. That end state is one a
/// scan-order-ambiguous full rebuild could also produce, so it is not a
/// divergence worth a two-phase pass. Do not "fix" this into one.
///
/// Returns every step's `UpdateResult` folded with
/// [`UpdateResult::absorb`] (mirroring `propagate_type_rename_inner`), so
/// `removed` / `upserted` list every old and new path, or `None` when
/// nothing matched. The
/// caller uses `None` to suppress the `vault-index-updated` emit. The
/// disk-side rename stays TS-side in `fs.service.ts`; this command owns
/// the index only (ADR 0025).
pub fn rename_note_inner(idx: &mut VaultIndex, from: &str, to: &str) -> Option<UpdateResult> {
	let prefix = format!("{}/", from);
	// Sorted so the emitted `UpdateResult` is reproducible; `entries()` is
	// a HashMap and would otherwise yield a different last result per run.
	let mut old_paths: Vec<String> = idx
		.entries()
		.keys()
		.filter(|p| p.as_str() == from || p.starts_with(&prefix))
		.cloned()
		.collect();
	old_paths.sort();

	let mut last_result: Option<UpdateResult> = None;
	for old_path in old_paths {
		let new_path = if old_path == from {
			to.to_string()
		} else {
			format!("{}{}", to, &old_path[from.len()..])
		};
		let Some(old_entry) = idx.entries().get(&old_path).cloned() else {
			continue;
		};
		let mut step = idx.remove_entry(&old_path);
		if vault_fs::is_markdown_filename(&new_path) {
			let entry = if vault_fs::is_view_filename(&old_path) == vault_fs::is_view_filename(&new_path) {
				old_entry.with_path(new_path)
			} else {
				reparse_across_view_boundary(old_entry, new_path)
			};
			step.absorb(idx.update_entry(entry));
		}
		match last_result.as_mut() {
			Some(acc) => acc.absorb(step),
			None => last_result = Some(step),
		}
	}
	last_result
}

/// Builds the entry of a file renamed across the `.md` / `.view` boundary by
/// re-reading it at `new_path`. The rename keeps the mtime, so the cached scan
/// would reuse whatever this returns: on a read error a `.view` target still
/// gets the stripped view shape over the old frontmatter, never the old note
/// parse. A `.md` target falls back to `with_path`, since a view entry carries
/// no links, tags or tasks to go stale.
fn reparse_across_view_boundary(old_entry: NoteEntry, new_path: String) -> NoteEntry {
	match fs::read_to_string(&new_path) {
		Ok(content) => NoteEntry::from_content_full(
			new_path,
			&content,
			old_entry.modified_at,
			old_entry.created_at,
			old_entry.size,
		),
		Err(e) => {
			debug_log("VAULT-V2", format!("rename_note: re-read of {} failed: {}", new_path, e));
			if vault_fs::is_view_filename(&new_path) {
				NoteEntry::from_view_frontmatter(
					new_path,
					old_entry.frontmatter,
					old_entry.modified_at,
					old_entry.created_at,
					old_entry.size,
				)
			} else {
				old_entry.with_path(new_path)
			}
		}
	}
}

/// Tauri command: re-keys the managed `VaultIndex` for a renamed or moved
/// path. Called by the FE filesystem service AFTER the disk rename and
/// BEFORE the per-path removal sweep. Reversed, the sweep would delete
/// the very entries this command needs to re-key.
///
/// Unlike `create_note`, this command does NOT own its disk operation:
/// the rename itself runs TS-side through `plugin-fs`. Emits
/// `vault-index-updated` once, after the write lock is dropped, and only
/// when something was actually re-keyed.
#[tauri::command]
pub fn rename_note(
	app: tauri::AppHandle,
	state: tauri::State<'_, VaultIndexState>,
	from: String,
	to: String,
) -> Result<Option<UpdateResult>, String> {
	let _trace = CmdTrace::new("rename_note");
	let result = {
		let mut idx = state
			.write()
			.map_err(|e| format!("VaultIndex lock poisoned: {}", e))?;
		rename_note_inner(&mut idx, &from, &to)
	};
	if let Some(ref update) = result {
		if let Err(emit_err) = app.emit(VAULT_INDEX_UPDATED_EVENT, update) {
			debug_log(
				"VAULT-V2",
				format!("rename_note: vault-index-updated emit failed: {}", emit_err),
			);
		}
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
/// `{ changed: true, fullRescan: true, version: <new> }`. `fullRescan`
/// signals "full rebuild — re-fetch from scratch" to consumers; the
/// incremental mutations list their paths in `upserted` / `removed`
/// instead. The lock is dropped
/// BEFORE emitting so reactive consumers can immediately re-read the
/// fresh index without contending with the write guard.
///
/// The command is `async` so the CPU + I/O work (full vault walk +
/// per-file parse, ~1.8 s on a 5,755-note vault) is offloaded to a
/// blocking worker thread via `spawn_blocking`. A synchronous `fn`
/// command would run on the main Tauri IPC thread and block every other
/// `invoke()` / `listen()` call for the duration of the scan — same
/// rationale as `build_search_index` (commands/search_index.rs).
#[tauri::command]
pub async fn scan_vault_v2(
	app: tauri::AppHandle,
	path: String,
) -> Result<Vec<NoteEntry>, String> {
	tokio::task::spawn_blocking(move || {
		let _trace = CmdTrace::new("scan_vault_v2");
		let state = app.state::<VaultIndexState>();
		let (notes, new_version) = scan_vault_v2_inner(&path, &state)?;
		emit_index_updated(&app, new_version);
		Ok(notes)
	})
	.await
	.map_err(|e| format!("scan_vault_v2 task join error: {e}"))?
}

/// Synchronous implementation of `scan_vault_v2`: collects every
/// markdown entry and rebuilds the managed `VaultIndex`. Returns the
/// entries plus the post-build index version — the caller is
/// responsible for emitting `vault-index-updated` with that version.
/// Exposed for state-free tests (takes a plain `RwLock<VaultIndex>`
/// instead of `tauri::State`); production goes through the async
/// command above.
pub fn scan_vault_v2_inner(
	path: &str,
	state: &VaultIndexState,
) -> Result<(Vec<NoteEntry>, u64), String> {
	let notes = collect_v2_entries(path)?;
	let root = canonical_vault_root(path)?;
	let build_start = std::time::Instant::now();
	let new_version = {
		let mut idx = state
			.write()
			.map_err(|e| format!("VaultIndex lock poisoned: {}", e))?;
		idx.build_with_root(&root, notes.clone());
		log_vault_shape_once(path, &idx);
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
	Ok((notes, new_version))
}

/// Result payload for `scan_vault_v2_cached`, reporting how the index
/// was loaded so the frontend can log telemetry.
#[derive(Debug, Clone, Serialize, ts_rs::TS)]
#[ts(export)]
#[serde(rename_all = "camelCase")]
pub struct CachedScanResult {
	/// How the index was loaded.
	pub source: ScanSource,
	pub entry_count: usize,
	pub load_ms: u64,
	pub files_reread: usize,
}

/// How `scan_vault_v2_cached` loaded the index. Serialized snake_case, the
/// literals the frontend logs.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, ts_rs::TS)]
#[ts(export)]
#[serde(rename_all = "snake_case")]
pub enum ScanSource {
	/// Loaded from the snapshot with no file changed on disk.
	Cache,
	/// Loaded from the snapshot, then some files were re-read or dropped.
	CacheReconciled,
	/// The cache was missing or invalid and a full scan ran.
	FullScan,
}

/// Loads the vault index from the on-disk cache if available, falling
/// back to a full `scan_vault_v2` on cache miss or corruption. When
/// loading from cache, performs an mtime reconciliation: walks the vault
/// for current file metadata, re-reads only files whose mtime changed,
/// adds new files, and drops deleted entries.
///
/// `async` + `spawn_blocking` for the same reason as `scan_vault_v2`:
/// even a pure cache hit stat-walks the whole vault and clones every
/// entry, and a cache miss runs the full parse — none of that may run
/// on the IPC thread.
#[tauri::command]
pub async fn scan_vault_v2_cached(
	app: tauri::AppHandle,
	path: String,
) -> Result<CachedScanResult, String> {
	tokio::task::spawn_blocking(move || {
		let _trace = CmdTrace::new("scan_vault_v2_cached");
		let state = app.state::<VaultIndexState>();
		let (result, new_version) = scan_vault_v2_cached_inner(&path, &state)?;
		emit_index_updated(&app, new_version);
		Ok(result)
	})
	.await
	.map_err(|e| format!("scan_vault_v2_cached task join error: {e}"))?
}

/// Synchronous implementation of `scan_vault_v2_cached`. Returns the
/// scan telemetry plus the post-build index version — the caller emits
/// `vault-index-updated`. Exposed for state-free tests; production goes
/// through the async command above.
pub fn scan_vault_v2_cached_inner(
	path: &str,
	state: &VaultIndexState,
) -> Result<(CachedScanResult, u64), String> {
	use crate::vault::index_cache;

	let start = Instant::now();

	// Try loading the cache
	let snapshot = match index_cache::read_snapshot(path) {
		Ok(Some(snap)) => {
			if snap.schema_version != index_cache::INDEX_SCHEMA_VERSION {
				debug_log(
					"VAULT-CACHE",
					format!(
						"schema version mismatch: expected {}, got {} — full scan",
						index_cache::INDEX_SCHEMA_VERSION,
						snap.schema_version,
					),
				);
				None
			} else {
				Some(snap)
			}
		}
		Ok(None) => {
			debug_log("VAULT-CACHE", "no cache file found — full scan".to_string());
			None
		}
		Err(e) => {
			debug_log("VAULT-CACHE", format!("cache read error: {e} — full scan"));
			// Delete corrupt cache file
			let cache_path = index_cache::cache_file_path(path);
			if let Err(del_err) = std::fs::remove_file(&cache_path) {
				debug_log("VAULT-CACHE", format!("failed to delete corrupt cache: {del_err}"));
			}
			None
		}
	};

	// Cache miss -> full scan (existing path)
	let Some(snapshot) = snapshot else {
		let notes = collect_v2_entries(path)?;
		let root = canonical_vault_root(path)?;
		let build_start = Instant::now();
		let entry_count = notes.len();
		let new_version = {
			let mut idx = state
				.write()
				.map_err(|e| format!("VaultIndex lock poisoned: {e}"))?;
			idx.build_with_root(&root, notes.clone());
			log_vault_shape_once(path, &idx);
			idx.version()
		};
		debug_log(
			"VAULT-CACHE",
			format!(
				"full scan: {} entries, build {}ms",
				entry_count,
				build_start.elapsed().as_millis(),
			),
		);
		// Write cache for next boot
		if let Err(e) = index_cache::write_snapshot(path, &notes) {
			debug_log("VAULT-CACHE", format!("cache write failed: {e}"));
		}
		return Ok((
			CachedScanResult {
				source: ScanSource::FullScan,
				entry_count,
				load_ms: start.elapsed().as_millis() as u64,
				files_reread: entry_count,
			},
			new_version,
		));
	};

	// Cache hit -> mtime reconciliation
	debug_log(
		"VAULT-CACHE",
		format!("cache loaded: {} entries", snapshot.entries.len()),
	);

	// Build a map of cached entries by path for O(1) lookup
	let mut cached_by_path: std::collections::HashMap<String, NoteEntry> = snapshot
		.entries
		.into_iter()
		.map(|e| (e.path.clone(), e))
		.collect();

	// Walk disk for current file metadata (path + mtime + ctime + size)
	let root = vault_fs::validate_vault_path(path)?;
	let disk_entries = vault_fs::collect_markdown_paths_with_metadata(&root, &[])?;

	let mut final_entries: Vec<NoteEntry> = Vec::with_capacity(disk_entries.len());
	let mut files_reread: usize = 0;

	for (_rel, abs, mtime, ctime, size) in &disk_entries {
		let abs_str = abs.to_string_lossy().to_string();

		if let Some(cached) = cached_by_path.remove(&abs_str) {
			if cached.modified_at == *mtime {
				// Unchanged — use cached entry
				final_entries.push(cached);
			} else {
				// mtime changed — re-read; fallback to stale cache on failure
				match fs::read_to_string(abs) {
					Ok(content) => {
						final_entries.push(NoteEntry::from_content_full(
							abs_str, &content, *mtime, *ctime, *size,
						));
						files_reread += 1;
					}
					Err(err) => {
						debug_log(
							"VAULT-CACHE",
							format!("re-read failed, keeping cached: {abs_str}: {err}"),
						);
						final_entries.push(cached);
					}
				}
			}
		} else {
			// New file (not in cache) — read
			match fs::read_to_string(abs) {
				Ok(content) => {
					final_entries.push(NoteEntry::from_content_full(
						abs_str, &content, *mtime, *ctime, *size,
					));
					files_reread += 1;
				}
				Err(err) => {
					debug_log(
						"VAULT-CACHE",
						format!("skip new file {abs_str}: {err}"),
					);
				}
			}
		}
	}

	// Anything left in cached_by_path was deleted from disk — dropped
	let deleted_count = cached_by_path.len();
	if deleted_count > 0 {
		debug_log(
			"VAULT-CACHE",
			format!("{deleted_count} cached entries no longer on disk (deleted)"),
		);
	}

	let entry_count = final_entries.len();
	let build_start = Instant::now();
	let new_version = {
		let mut idx = state
			.write()
			.map_err(|e| format!("VaultIndex lock poisoned: {e}"))?;
		idx.build_with_root(&root.to_string_lossy(), final_entries.clone());
		log_vault_shape_once(path, &idx);
		idx.version()
	};

	debug_log(
		"VAULT-CACHE",
		format!(
			"reconciled: {} entries (reread={}, deleted={}), build {}ms, total {}ms",
			entry_count,
			files_reread,
			deleted_count,
			build_start.elapsed().as_millis(),
			start.elapsed().as_millis(),
		),
	);

	// Update cache if anything changed
	if files_reread > 0 || deleted_count > 0 {
		if let Err(e) = index_cache::write_snapshot(path, &final_entries) {
			debug_log("VAULT-CACHE", format!("cache write failed: {e}"));
		}
	}

	let source = if files_reread == 0 && deleted_count == 0 {
		ScanSource::Cache
	} else {
		ScanSource::CacheReconciled
	};

	Ok((
		CachedScanResult {
			source,
			entry_count,
			load_ms: start.elapsed().as_millis() as u64,
			files_reread,
		},
		new_version,
	))
}

/// Emits the `vault-index-updated` event with the given version.
fn emit_index_updated(app: &tauri::AppHandle, version: u64) {
	let payload = UpdateResult {
		changed: true,
		version,
		full_rescan: true,
		..Default::default()
	};
	if let Err(e) = app.emit(VAULT_INDEX_UPDATED_EVENT, &payload) {
		debug_log(
			"VAULT-CACHE",
			format!("vault-index-updated emit failed: {e}"),
		);
	}
}

/// Saves the current in-memory VaultIndex entries to the disk cache.
/// Called from the frontend on vault teardown so the next boot can
/// load from cache.
#[tauri::command]
pub fn save_vault_cache(
	path: String,
	state: tauri::State<'_, VaultIndexState>,
) -> Result<(), String> {
	use crate::vault::index_cache;

	let _trace = CmdTrace::new("save_vault_cache");
	let idx = state
		.read()
		.map_err(|e| format!("VaultIndex lock poisoned: {e}"))?;
	let entries: Vec<NoteEntry> = idx.entries().values().cloned().collect();
	drop(idx);
	index_cache::write_snapshot(&path, &entries)?;
	debug_log(
		"VAULT-CACHE",
		format!("saved cache: {} entries", entries.len()),
	);
	Ok(())
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
            _ => natural_cmp(&a.name, &b.name),
        }
    });
}

/// Case-insensitive natural order: runs of ASCII digits compare by numeric
/// value, so "Note 2" sorts before "Note 10". Names that tie ("v9" / "v09",
/// "a" / "A") fall back to the plain lowercase compare, then the raw name, so
/// the order stays total and the scan output deterministic.
pub fn natural_cmp(a: &str, b: &str) -> Ordering {
    let (la, lb) = (a.to_lowercase(), b.to_lowercase());
    let (mut ia, mut ib) = (la.chars().peekable(), lb.chars().peekable());
    loop {
        let ord = match (ia.peek().copied(), ib.peek().copied()) {
            (None, None) => break,
            (None, Some(_)) => Ordering::Less,
            (Some(_), None) => Ordering::Greater,
            (Some(ca), Some(cb)) if ca.is_ascii_digit() && cb.is_ascii_digit() => {
                let (ra, rb) = (take_digits(&mut ia), take_digits(&mut ib));
                // Compared as text after trimming zeros so runs longer than
                // u64 cannot overflow: a longer run is the bigger number.
                let (ta, tb) = (ra.trim_start_matches('0'), rb.trim_start_matches('0'));
                ta.len().cmp(&tb.len()).then_with(|| ta.cmp(tb))
            }
            (Some(ca), Some(cb)) => {
                ia.next();
                ib.next();
                ca.cmp(&cb)
            }
        };
        if ord != Ordering::Equal {
            return ord;
        }
    }
    la.cmp(&lb).then_with(|| a.cmp(b))
}

fn take_digits(it: &mut std::iter::Peekable<std::str::Chars<'_>>) -> String {
    let mut run = String::new();
    while let Some(c) = it.next_if(|c| c.is_ascii_digit()) {
        run.push(c);
    }
    run
}
