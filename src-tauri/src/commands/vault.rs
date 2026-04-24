use crate::utils::fs as vault_fs;
use crate::utils::logger::debug_log;
use crate::vault::entry::NoteEntry;
use crate::vault::VaultIndexState;
use serde::Serialize;
use std::cmp::Ordering;
use std::fs;
use std::path::Path;
use std::time::UNIX_EPOCH;
use std::path::{Path as StdPath, PathBuf};
use tauri::{AppHandle, Emitter, State};

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

/// Scans a vault and returns one enriched `NoteEntry` per markdown note.
///
/// For each `.md` / `.markdown` file: reads content, parses frontmatter,
/// extracts wikilinks + tags, counts words, and builds a snippet. Individual
/// file-read failures are logged and skipped so one unreadable note never
/// aborts the whole scan. The returned list is in the order the walker
/// produces (depth-first, dirs-first per level) — callers that need a
/// specific order should sort the result.
///
/// Side effect (Phase 2.3): the scanned entries also populate the
/// managed `VaultIndexState` via `VaultIndex::build`, so subsequent
/// reads through `get_backlinks_v2` / `get_outgoing_links_v2` (Phase 2.4+)
/// see the freshly-built reverse index. The returned `Vec<NoteEntry>`
/// is still the source of truth for the TS side until Phase 3 migrates
/// consumers off the per-call payload.
#[tauri::command]
pub fn scan_vault_v2(
	vault_path: String,
	index_state: State<'_, VaultIndexState>,
) -> Result<Vec<NoteEntry>, String> {
	let start = std::time::Instant::now();
	debug_log("VAULT", format!("scan_vault_v2: {}", vault_path));
	let root = vault_fs::validate_vault_path(&vault_path)?;
	let files = vault_fs::collect_markdown_paths_with_mtime(&root, &[])?;
	let total = files.len();

	let mut entries = Vec::with_capacity(total);
	let mut read_failures = 0usize;

	for (_rel, abs, mtime_secs) in files {
		let content = match fs::read_to_string(&abs) {
			Ok(c) => c,
			Err(err) => {
				debug_log(
					"VAULT",
					format!("scan_vault_v2: skipped {} ({})", abs.display(), err),
				);
				read_failures += 1;
				continue;
			}
		};
		let modified_at = u64::try_from(mtime_secs.saturating_mul(1_000)).ok();
		let path_str = abs.to_string_lossy().to_string();
		entries.push(NoteEntry::from_content(&path_str, &content, modified_at));
	}

	// Publish the freshly-built index to managed state so future read commands
	// see the up-to-date reverse backlinks map. build() is O(N) wrt entries
	// but only runs once per vault open / refresh.
	{
		let mut idx = index_state
			.write()
			.map_err(|_| "VaultIndex lock poisoned".to_string())?;
		idx.build(entries.clone());
	}

	debug_log(
		"VAULT",
		format!(
			"scan_vault_v2: {} entries ({} read failures) in {}ms",
			entries.len(),
			read_failures,
			start.elapsed().as_millis()
		),
	);
	Ok(entries)
}

/// Name of the Tauri event emitted by `update_note_in_index` (and, later,
/// by watcher-driven updaters in Phase 9). All consumer panels in the
/// frontend listen on this single channel and re-invoke their read
/// command on receipt — see the consumer panel pattern in ADR 0025.
pub const VAULT_INDEX_UPDATED_EVENT: &str = "vault-index-updated";

/// Common flow for frontmatter-mutating commands: read file, apply an
/// in-memory text transform, write back, reindex, emit the event. Returns
/// the `UpdateResult` so callers can also refresh their own local state.
fn write_and_reindex(
	path: &str,
	new_content: String,
	app: &AppHandle,
	index_state: &State<'_, VaultIndexState>,
) -> Result<crate::vault::index::UpdateResult, String> {
	fs::write(path, &new_content).map_err(|e| format!("Failed to write {}: {}", path, e))?;

	let modified_at = fs::metadata(path)
		.ok()
		.and_then(|m| m.modified().ok())
		.and_then(|t| t.duration_since(UNIX_EPOCH).ok())
		.and_then(|d| u64::try_from(d.as_millis()).ok());

	let entry = NoteEntry::from_content(path, &new_content, modified_at);
	let result = {
		let mut idx = index_state
			.write()
			.map_err(|_| "VaultIndex lock poisoned".to_string())?;
		idx.update_entry(entry)
	};

	if let Err(err) = app.emit(VAULT_INDEX_UPDATED_EVENT, &result) {
		debug_log(
			"VAULT",
			format!("write_and_reindex: emit failed ({})", err),
		);
	}

	Ok(result)
}

/// Writes a scalar value to the `key` frontmatter field of the note at
/// `path`. Creates the key if absent, creates the frontmatter block if
/// absent. Rejects non-scalar values and block-valued existing keys
/// (callers see the error returned from
/// `vault::frontmatter_writer::update_frontmatter`).
///
/// Goes through the editor save pipeline contract (read → mutate → write
/// → reindex → emit). Intended for Properties Panel writes when the
/// target file is NOT the currently open editor tab; editor-local writes
/// should go through `view.dispatch` so the live buffer stays
/// authoritative.
#[tauri::command]
pub fn update_frontmatter_v2(
	path: String,
	key: String,
	value: serde_json::Value,
	app: AppHandle,
	index_state: State<'_, VaultIndexState>,
) -> Result<crate::vault::index::UpdateResult, String> {
	let content = fs::read_to_string(&path)
		.map_err(|e| format!("Failed to read {}: {}", path, e))?;
	let new_content =
		crate::vault::frontmatter_writer::update_frontmatter(&content, &key, &value)?;
	write_and_reindex(&path, new_content, &app, &index_state)
}

/// Removes the `key` frontmatter field from the note at `path`. Block
/// values (block arrays / nested maps) are removed cleanly including
/// their continuation lines. No-op when the key is absent; still
/// re-indexes because the re-read of the file may pick up concurrent
/// changes.
#[tauri::command]
pub fn delete_frontmatter_key_v2(
	path: String,
	key: String,
	app: AppHandle,
	index_state: State<'_, VaultIndexState>,
) -> Result<crate::vault::index::UpdateResult, String> {
	let content = fs::read_to_string(&path)
		.map_err(|e| format!("Failed to read {}: {}", path, e))?;
	let new_content = crate::vault::frontmatter_writer::delete_frontmatter_key(&content, &key)?;
	write_and_reindex(&path, new_content, &app, &index_state)
}

/// Renames a frontmatter key, preserving its value. Rejects when the new
/// key already exists, or when old_key == new_key, or when new_key is
/// empty.
#[tauri::command]
pub fn rename_frontmatter_key_v2(
	path: String,
	old_key: String,
	new_key: String,
	app: AppHandle,
	index_state: State<'_, VaultIndexState>,
) -> Result<crate::vault::index::UpdateResult, String> {
	let content = fs::read_to_string(&path)
		.map_err(|e| format!("Failed to read {}: {}", path, e))?;
	let new_content =
		crate::vault::frontmatter_writer::rename_frontmatter_key(&content, &old_key, &new_key)?;
	write_and_reindex(&path, new_content, &app, &index_state)
}

// --- File operations (Phase 8.6) ---

/// Creates a new markdown note at `path` with the given content. Parent
/// directories are created if missing. Errors if the target file already
/// exists (refuses to clobber). Emits `vault-index-updated` on success.
///
/// `content` is written as-is — the caller is expected to have already
/// applied any template processing on the TS side (template engine stays
/// in TS as a pure string function per ADR 0025).
#[tauri::command]
pub fn create_note(
	path: String,
	content: String,
	app: AppHandle,
	index_state: State<'_, VaultIndexState>,
) -> Result<crate::vault::index::UpdateResult, String> {
	let target = PathBuf::from(&path);
	if target.exists() {
		return Err(format!("File already exists: {}", path));
	}
	if let Some(parent) = target.parent() {
		if !parent.as_os_str().is_empty() && !parent.exists() {
			fs::create_dir_all(parent)
				.map_err(|e| format!("Failed to create parent directory: {}", e))?;
		}
	}
	fs::write(&target, &content).map_err(|e| format!("Failed to create note: {}", e))?;
	write_and_reindex(&path, content, &app, &index_state)
}

/// Moves a note from `old_path` to `new_path`. Validates that the new path
/// does not already exist, then fs-renames the file, drops the old entry
/// from the VaultIndex, and indexes the content at the new path. Parent
/// directories for the new path are created if missing.
///
/// Known limitation: other notes' outgoing wikilinks pointing at the old
/// filename stem silently break after rename. A future "rewrite refs"
/// feature can chase those down; for now the rename is a pure file-level
/// operation + index update.
#[tauri::command]
pub fn rename_note(
	old_path: String,
	new_path: String,
	app: AppHandle,
	index_state: State<'_, VaultIndexState>,
) -> Result<crate::vault::index::UpdateResult, String> {
	if old_path == new_path {
		return Err("old_path and new_path must differ".to_string());
	}
	let new_target = PathBuf::from(&new_path);
	if new_target.exists() {
		return Err(format!("Destination already exists: {}", new_path));
	}
	if let Some(parent) = new_target.parent() {
		if !parent.as_os_str().is_empty() && !parent.exists() {
			fs::create_dir_all(parent)
				.map_err(|e| format!("Failed to create parent directory: {}", e))?;
		}
	}
	fs::rename(&old_path, &new_target).map_err(|e| format!("Failed to rename: {}", e))?;

	// Drop the old entry + reindex the new one with its updated path.
	{
		let mut idx = index_state
			.write()
			.map_err(|_| "VaultIndex lock poisoned".to_string())?;
		idx.remove_entry(&old_path);
	}
	let content = fs::read_to_string(&new_path)
		.map_err(|e| format!("Failed to read renamed file: {}", e))?;
	write_and_reindex(&new_path, content, &app, &index_state)
}

/// Deletes a note at `path`. Removes from the VaultIndex first (so the
/// UI can re-render cleanly before the fs operation), then deletes the
/// file. Errors if the file doesn't exist. Emits `vault-index-updated`.
///
/// Uses `std::fs::remove_file` — does NOT move to the system trash. The
/// caller is expected to handle trash logic on the TS side (the existing
/// trash service integration) if it wants recoverable deletes.
#[tauri::command]
pub fn delete_note(
	path: String,
	app: AppHandle,
	index_state: State<'_, VaultIndexState>,
) -> Result<crate::vault::index::UpdateResult, String> {
	let target = StdPath::new(&path);
	if !target.exists() {
		return Err(format!("File does not exist: {}", path));
	}
	let (removed, version) = {
		let mut idx = index_state
			.write()
			.map_err(|_| "VaultIndex lock poisoned".to_string())?;
		(idx.remove_entry(&path), idx.version())
	};
	fs::remove_file(&target).map_err(|e| format!("Failed to delete: {}", e))?;

	let result = crate::vault::index::UpdateResult {
		changed: vec![path.clone()],
		affected: if removed { vec![path.clone()] } else { Vec::new() },
		version,
	};
	if let Err(err) = app.emit(VAULT_INDEX_UPDATED_EVENT, &result) {
		debug_log("VAULT", format!("delete_note: emit failed ({})", err));
	}
	Ok(result)
}

/// Creates a folder at `path`, including any missing parent components.
/// No-op when the folder already exists. Does not touch the `VaultIndex`
/// (folders aren't indexed entries) and does not emit
/// `vault-index-updated` — consumers that display the file tree should
/// listen on the existing watcher / scan events.
#[tauri::command]
pub fn create_folder(path: String) -> Result<(), String> {
	fs::create_dir_all(&path)
		.map_err(|e| format!("Failed to create folder {}: {}", path, e))
}

/// Parses the supplied content into a `NoteEntry` (via Phase 1 extractors),
/// inserts or replaces it in the managed `VaultIndex` (via Phase 2.5's
/// `update_entry`), and emits `vault-index-updated` carrying the
/// `UpdateResult`. Intended to be called by the frontend editor service
/// on save, not on every keystroke.
///
/// The note's mtime is read from disk at call time so the entry carries a
/// fresh timestamp; if the stat fails (e.g. the save completes after this
/// call), `modified_at` falls back to `None`.
#[tauri::command]
pub fn update_note_in_index(
	path: String,
	content: String,
	app: AppHandle,
	index_state: State<'_, VaultIndexState>,
) -> Result<crate::vault::index::UpdateResult, String> {
	let modified_at = fs::metadata(&path)
		.ok()
		.and_then(|m| m.modified().ok())
		.and_then(|t| t.duration_since(UNIX_EPOCH).ok())
		.and_then(|d| u64::try_from(d.as_millis()).ok());

	let entry = NoteEntry::from_content(&path, &content, modified_at);

	let result = {
		let mut idx = index_state
			.write()
			.map_err(|_| "VaultIndex lock poisoned".to_string())?;
		idx.update_entry(entry)
	};

	// Emit to the frontend so every consumer panel re-fetches against the
	// latest VaultIndex revision. Emit errors are logged but not returned —
	// a failed emit should not fail the index mutation (which already
	// succeeded inside the write lock).
	if let Err(err) = app.emit(VAULT_INDEX_UPDATED_EVENT, &result) {
		debug_log(
			"VAULT",
			format!("update_note_in_index: emit failed ({})", err),
		);
	}

	Ok(result)
}

/// Returns every note that wikilinks to `path`, sorted by title for stable UI
/// ordering. Reads the reverse backlinks map that was populated by the
/// preceding `scan_vault_v2` call (or maintained incrementally by Phase 2.6's
/// `update_note_in_index`), so the answer is O(K) where K is the number of
/// backlinks — not O(N) over the whole vault.
///
/// Returns an empty list when the path is unknown or has no backlinks.
#[tauri::command]
pub fn get_backlinks_v2(
	path: String,
	index_state: State<'_, VaultIndexState>,
) -> Result<Vec<NoteEntry>, String> {
	let idx = index_state
		.read()
		.map_err(|_| "VaultIndex lock poisoned".to_string())?;
	let source_paths = idx.backlinks_of(&path);
	let mut entries: Vec<NoteEntry> = source_paths
		.iter()
		.filter_map(|src| idx.entry_for_path(src).cloned())
		.collect();
	entries.sort_by(|a, b| a.title.to_lowercase().cmp(&b.title.to_lowercase()));
	Ok(entries)
}

/// Aggregate list of every tag in the vault with count + file paths,
/// sorted by name (case-insensitive). First-occurrence casing preserved
/// (mirrors TS `aggregateTags`).
#[tauri::command]
pub fn get_all_tags_v2(
	index_state: State<'_, VaultIndexState>,
) -> Result<Vec<crate::vault::index::TagAggregate>, String> {
	let idx = index_state
		.read()
		.map_err(|_| "VaultIndex lock poisoned".to_string())?;
	Ok(idx.all_tags())
}

/// Returns every note whose frontmatter `key` has a value that canonicalises
/// to `value`. For array properties any element match counts. Comparison is
/// exact on the canonical string form (use the same canonicalisation the
/// Rust side uses: numbers as `.to_string()`, bools `true`/`false`, null
/// `null`).
#[tauri::command]
pub fn query_notes_by_property_v2(
	key: String,
	value: String,
	index_state: State<'_, VaultIndexState>,
) -> Result<Vec<NoteEntry>, String> {
	let idx = index_state
		.read()
		.map_err(|_| "VaultIndex lock poisoned".to_string())?;
	let paths = idx.notes_with_property(&key, &value);
	let mut entries: Vec<NoteEntry> = paths
		.iter()
		.filter_map(|p| idx.entry_for_path(p).cloned())
		.collect();
	entries.sort_by(|a, b| a.title.to_lowercase().cmp(&b.title.to_lowercase()));
	Ok(entries)
}

/// Distinct canonicalised values present for `key` across the vault, sorted.
/// Used by Collection toolbars to build filter dropdowns.
#[tauri::command]
pub fn get_property_values_v2(
	key: String,
	index_state: State<'_, VaultIndexState>,
) -> Result<Vec<String>, String> {
	let idx = index_state
		.read()
		.map_err(|_| "VaultIndex lock poisoned".to_string())?;
	Ok(idx.property_values(&key))
}

/// The raw frontmatter map of the note at `path` (empty when unknown).
/// Useful for panels that want to render the entire property set.
#[tauri::command]
pub fn get_note_properties_v2(
	path: String,
	index_state: State<'_, VaultIndexState>,
) -> Result<std::collections::HashMap<String, serde_json::Value>, String> {
	let idx = index_state
		.read()
		.map_err(|_| "VaultIndex lock poisoned".to_string())?;
	Ok(idx.note_properties(&path))
}

/// Returns every note (full `NoteEntry`) that carries the given tag.
/// Lookup is case-insensitive. Sorted by title for stable UI.
#[tauri::command]
pub fn get_notes_with_tag_v2(
	tag: String,
	index_state: State<'_, VaultIndexState>,
) -> Result<Vec<NoteEntry>, String> {
	let idx = index_state
		.read()
		.map_err(|_| "VaultIndex lock poisoned".to_string())?;
	let paths = idx.notes_with_tag(&tag);
	let mut entries: Vec<NoteEntry> = paths
		.iter()
		.filter_map(|p| idx.entry_for_path(p).cloned())
		.collect();
	entries.sort_by(|a, b| a.title.to_lowercase().cmp(&b.title.to_lowercase()));
	Ok(entries)
}

/// Scans the supplied `content` (the editor's current buffer, which may differ
/// from disk when the user is typing) for plain-text mentions of every other
/// note's title that the source at `path` does NOT already wikilink to.
/// Excludes mentions inside `[[…]]`, frontmatter, and fenced code. Matches
/// TS `findOutgoingUnlinkedMentions` semantics.
///
/// Returns the list sorted by note name (case-insensitive).
#[tauri::command]
pub fn get_outgoing_unlinked_mentions_v2(
	path: String,
	content: String,
	index_state: State<'_, VaultIndexState>,
) -> Result<Vec<crate::vault::index::OutgoingUnlinkedMention>, String> {
	let idx = index_state
		.read()
		.map_err(|_| "VaultIndex lock poisoned".to_string())?;
	Ok(idx.outgoing_unlinked_mentions_of(&path, &content))
}

/// Returns every note the source at `path` outgoing-links to. Targets are
/// resolved via the cached `by_filename` map (same rules as
/// `get_backlinks_v2`); unresolved wikilinks and self-links are omitted.
/// Results sorted by title for stable UI ordering.
///
/// Empty list when the source path is unknown or has no resolved outgoing
/// links. O(K) over the source's outgoing links — no full-vault scan.
#[tauri::command]
pub fn get_outgoing_links_v2(
	path: String,
	index_state: State<'_, VaultIndexState>,
) -> Result<Vec<NoteEntry>, String> {
	let idx = index_state
		.read()
		.map_err(|_| "VaultIndex lock poisoned".to_string())?;
	let resolved_paths = idx.outgoing_links_of(&path);
	let mut entries: Vec<NoteEntry> = resolved_paths
		.iter()
		.filter_map(|p| idx.entry_for_path(p).cloned())
		.collect();
	entries.sort_by(|a, b| a.title.to_lowercase().cmp(&b.title.to_lowercase()));
	Ok(entries)
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
