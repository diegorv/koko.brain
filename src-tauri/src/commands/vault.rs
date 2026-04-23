use crate::utils::fs as vault_fs;
use crate::utils::logger::debug_log;
use crate::vault::entry::NoteEntry;
use crate::vault::VaultIndexState;
use serde::Serialize;
use std::cmp::Ordering;
use std::fs;
use std::path::Path;
use std::time::UNIX_EPOCH;
use tauri::State;

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
