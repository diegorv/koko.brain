use crate::utils::fs as vault_fs;
use crate::utils::logger::debug_log;
use serde::Serialize;
use std::fs;
use std::path::Path;

/// Result of reading a single file in a batch operation.
/// Per-file errors are captured individually so the batch never fails entirely.
#[derive(Serialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct FileReadResult {
	pub path: String,
	pub content: Option<String>,
	pub error: Option<String>,
}

/// Reads the text content of multiple files in a single call.
/// All paths must be within `vault_path` — paths outside the vault are rejected
/// to prevent arbitrary file reads if the frontend is compromised.
/// Returns a result per file — individual read failures are captured in the result,
/// not propagated as a batch error.
#[tauri::command]
pub fn read_files_batch(
	vault_path: String,
	paths: Vec<String>,
) -> Result<Vec<FileReadResult>, String> {
	let start = std::time::Instant::now();
	debug_log("FILES", format!("Reading batch of {} files", paths.len()));

	let vault_root = vault_fs::validate_vault_path(&vault_path)?;

	let mut results = Vec::with_capacity(paths.len());

	for path in paths {
		// Validate that the path is within the vault directory
		let canonical = match Path::new(&path).canonicalize() {
			Ok(p) => p,
			Err(e) => {
				results.push(FileReadResult {
					path,
					content: None,
					error: Some(format!("Failed to resolve path: {e}")),
				});
				continue;
			}
		};

		if !canonical.starts_with(&vault_root) {
			debug_log(
				"FILES",
				format!("Rejected path outside vault: {}", path),
			);
			results.push(FileReadResult {
				path,
				content: None,
				error: Some("Path is outside vault directory".to_string()),
			});
			continue;
		}

		// Use canonical path for reading to prevent TOCTOU race conditions
		match fs::read_to_string(&canonical) {
			Ok(content) => results.push(FileReadResult {
				path,
				content: Some(content),
				error: None,
			}),
			Err(e) => results.push(FileReadResult {
				path,
				content: None,
				error: Some(e.to_string()),
			}),
		}
	}

	let ok = results.iter().filter(|r| r.error.is_none()).count();
	let err = results.iter().filter(|r| r.error.is_some()).count();
	debug_log(
		"FILES",
		format!("Batch complete: {} ok, {} failed in {}ms", ok, err, start.elapsed().as_millis()),
	);
	Ok(results)
}
