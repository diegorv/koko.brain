use crate::utils::fs as vault_fs;
use crate::utils::logger::debug_log;
use crate::vault::entry::{NoteEntry, NoteRecord, OutgoingLink, OutgoingUnlinkedMention, RelationshipBacklink};
use crate::vault::index::{match_unlinked_mentions, UpdateResult, VaultIndex};
use crate::vault::parsing::{extract_tasks_from_section, rewrite_type_in_frontmatter, toggle_task_in_content};
use crate::vault::task::{display_name, FileTaskGroup, TagAggregate, ToggleTaskResult};
use crate::vault::{VaultIndexState, VAULT_INDEX_UPDATED_EVENT};
use serde::Serialize;
use std::cmp::Ordering;
use std::fs;
use std::path::Path;
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
	let _trace = CmdTrace::new("scan_vault");
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
/// remaining members. Returns the updated count and the last
/// `UpdateResult` (whose `version` reflects all updates) for the caller
/// to emit.
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
	let mut last_result = None;
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
		last_result = Some(update_note_in_index_inner(idx, path, &new_content, mtime));
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
	results.sort_by(|a, b| a.title.to_lowercase().cmp(&b.title.to_lowercase()));
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
	let _trace = CmdTrace::new("get_tasks_in_section_v2");
	let idx = state
		.read()
		.map_err(|e| format!("VaultIndex lock poisoned: {}", e))?;
	let mut out: Vec<FileTaskGroup> = Vec::new();
	for entry in idx.entries().values() {
		// Audit Tier 2 #8: log read failures instead of silently treating the
		// file as empty. A file that vanished between the index scan and this
		// read (deleted via Finder, moved, permission flipped) used to drop
		// out of the result without any signal — the user's tasks panel
		// would silently miss tasks for that file. Logging makes the partial
		// result auditable; we still continue so a single bad file doesn't
		// block the rest of the section query.
		let content = match std::fs::read_to_string(&entry.path) {
			Ok(c) => c,
			Err(err) => {
				debug_log(
					"VAULT-V2",
					format!(
						"get_tasks_in_section_v2: read failed for {} ({}); skipping",
						entry.path, err
					),
				);
				continue;
			}
		};
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
	vault_fs::write_atomic(path, &updated)?;
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
	let _trace = CmdTrace::new("toggle_task_status");
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
	Ok((notes, new_version))
}

/// Result payload for `scan_vault_v2_cached`, reporting how the index
/// was loaded so the frontend can log telemetry.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CachedScanResult {
	/// "cache" if loaded from snapshot without changes, "cache_reconciled"
	/// if loaded from snapshot but some files needed re-reading,
	/// "full_scan" if cache was missing/invalid and a full scan ran.
	pub source: String,
	pub entry_count: usize,
	pub load_ms: u64,
	pub files_reread: usize,
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
			let cache_path = index_cache::cache_file_path(&path);
			if let Err(del_err) = std::fs::remove_file(&cache_path) {
				debug_log("VAULT-CACHE", format!("failed to delete corrupt cache: {del_err}"));
			}
			None
		}
	};

	// Cache miss -> full scan (existing path)
	let Some(snapshot) = snapshot else {
		let notes = collect_v2_entries(&path)?;
		let build_start = Instant::now();
		let entry_count = notes.len();
		let new_version = {
			let mut idx = state
				.write()
				.map_err(|e| format!("VaultIndex lock poisoned: {e}"))?;
			idx.build(notes.clone());
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
				source: "full_scan".to_string(),
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
	let root = vault_fs::validate_vault_path(&path)?;
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
		idx.build(final_entries.clone());
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
		"cache"
	} else {
		"cache_reconciled"
	};

	Ok((
		CachedScanResult {
			source: source.to_string(),
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
		affected: Vec::new(),
		version,
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
            _ => a.name.to_lowercase().cmp(&b.name.to_lowercase()),
        }
    });
}
