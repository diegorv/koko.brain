use crate::utils::fs as vault_fs;
use crate::utils::logger::debug_log;
use crate::vault::entry::NoteEntry;
use serde::Serialize;
use std::cmp::Ordering;
use std::fs;
use std::path::Path;
use std::time::UNIX_EPOCH;

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

/// Scans a vault and returns a `NoteEntry` for every markdown file under it.
///
/// This is the additive Phase 1.5 surface: an enriched view with title,
/// frontmatter, outgoing links, tags, modification time, body word count,
/// and a leading-paragraph snippet. The Phase 2 `VaultIndex` builds on top
/// of these entries; Phase 3 starts migrating consumers to read from
/// `VaultIndex` instead of the per-feature TS stores.
///
/// The original `scan_vault` (which returns the recursive `FileNode` tree
/// the file explorer needs) is not affected and continues to be the source
/// of truth for tree shape. `scan_vault_v2` only emits markdown leaves and
/// uses absolute paths everywhere (CLAUDE.md Indexing & Watcher item 5).
///
/// Per-file read failures are logged via `debug_log("VAULT-V2", ...)` and
/// silently skipped — one unreadable file must not poison the whole scan.
/// The whole-directory failure path (e.g. permission denied on the vault
/// root) still propagates as an `Err`.
#[tauri::command]
pub fn scan_vault_v2(path: String) -> Result<Vec<NoteEntry>, String> {
	let start = std::time::Instant::now();
	debug_log("VAULT-V2", format!("scan_vault_v2: starting on {}", path));
	let root = vault_fs::validate_vault_path(&path)?;
	let entries = vault_fs::collect_markdown_paths_with_mtime(&root, &[])?;
	let total = entries.len();
	let mut notes: Vec<NoteEntry> = Vec::with_capacity(total);
	let mut skipped = 0usize;

	for (_rel, abs, mtime) in entries {
		let abs_path_str = abs.to_string_lossy().to_string();
		match fs::read_to_string(&abs) {
			Ok(content) => {
				notes.push(NoteEntry::from_content(abs_path_str, &content, mtime));
			}
			Err(err) => {
				skipped += 1;
				debug_log(
					"VAULT-V2",
					format!("scan_vault_v2: skipping {} ({})", abs_path_str, err),
				);
			}
		}
	}

	debug_log(
		"VAULT-V2",
		format!(
			"scan_vault_v2: {} entries ({} skipped) in {}ms",
			notes.len(),
			skipped,
			start.elapsed().as_millis(),
		),
	);
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
