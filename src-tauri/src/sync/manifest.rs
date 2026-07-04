//! Folder walking, content hashing, and relative-path validation shared by
//! the sync server (reads exposed folders) and engine (writes downloads).

use std::path::Path;

use sha2::{Digest, Sha256};

use super::protocol::FileMeta;

/// Validate a vault-relative path from config or the wire.
/// Rejects: empty, absolute, backslashes, `:` (Windows drive/ADS), `..`,
/// empty components, and any dot-prefixed component (hidden files and dirs
/// never sync).
pub fn validate_rel_path(rel: &str) -> Result<(), String> {
	if rel.is_empty() {
		return Err("empty path".to_string());
	}
	if rel.starts_with('/') || rel.contains('\\') || rel.contains(':') {
		return Err(format!("invalid path: {rel}"));
	}
	for comp in rel.split('/') {
		if comp.is_empty() || comp.starts_with('.') {
			return Err(format!("invalid path component in: {rel}"));
		}
	}
	Ok(())
}

/// Lowercase hex SHA-256 (same formatting as commands/history.rs).
pub fn hash_bytes(bytes: &[u8]) -> String {
	Sha256::digest(bytes).iter().map(|b| format!("{:02x}", b)).collect()
}

/// Hash a file's content.
pub fn hash_file(path: &Path) -> Result<String, String> {
	let bytes = std::fs::read(path).map_err(|e| format!("read {} failed: {e}", path.display()))?;
	Ok(hash_bytes(&bytes))
}

/// Walk `folder` (vault-relative) under `vault_root` and list every regular
/// file, sorted by rel_path. Skips dot-prefixed entries, symlinks, and
/// non-UTF-8 names. Result paths are vault-relative with `/` separators.
pub fn build_manifest(vault_root: &Path, folder: &str) -> Result<Vec<FileMeta>, String> {
	validate_rel_path(folder)?;
	let start = vault_root.join(folder);
	if !start.is_dir() {
		return Err(format!("folder not found: {folder}"));
	}
	let mut files = Vec::new();
	let mut stack = vec![start];
	while let Some(dir) = stack.pop() {
		let entries = std::fs::read_dir(&dir).map_err(|e| format!("read_dir {} failed: {e}", dir.display()))?;
		for entry in entries {
			let entry = entry.map_err(|e| format!("read_dir entry failed: {e}"))?;
			let name = entry.file_name();
			let Some(name) = name.to_str() else { continue };
			if name.starts_with('.') {
				continue;
			}
			let ftype = entry.file_type().map_err(|e| format!("file_type failed: {e}"))?;
			if ftype.is_symlink() {
				continue;
			}
			let path = entry.path();
			if ftype.is_dir() {
				stack.push(path);
				continue;
			}
			if !ftype.is_file() {
				continue;
			}
			let meta = entry.metadata().map_err(|e| format!("metadata failed: {e}"))?;
			let rel = path.strip_prefix(vault_root).map_err(|_| "path outside vault".to_string())?;
			let rel_path = rel
				.components()
				.map(|c| c.as_os_str().to_string_lossy().into_owned())
				.collect::<Vec<_>>()
				.join("/");
			files.push(FileMeta { rel_path, size: meta.len(), sha256: hash_file(&path)? });
		}
	}
	files.sort_by(|a, b| a.rel_path.cmp(&b.rel_path));
	Ok(files)
}

#[cfg(test)]
mod tests {
	use super::*;

	#[test]
	fn validate_rel_path_accepts_normal_paths() {
		assert!(validate_rel_path("Notes").is_ok());
		assert!(validate_rel_path("Notes/sub dir/a b.md").is_ok());
	}

	#[test]
	fn validate_rel_path_rejects_escapes_and_hidden() {
		for bad in ["", "/abs", "a/../b", "..", "a//b", ".hidden/x", "a/.git/c", "a\\b", "C:/x"] {
			assert!(validate_rel_path(bad).is_err(), "should reject: {bad}");
		}
	}

	#[test]
	fn hash_bytes_matches_known_sha256() {
		// sha256("abc")
		assert_eq!(
			hash_bytes(b"abc"),
			"ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"
		);
	}

	#[test]
	fn build_manifest_lists_nested_files_sorted_and_skips_hidden() {
		let dir = tempfile::tempdir().unwrap();
		let root = dir.path();
		std::fs::create_dir_all(root.join("Notes/sub")).unwrap();
		std::fs::create_dir_all(root.join("Notes/.hidden")).unwrap();
		std::fs::write(root.join("Notes/b.md"), "bee").unwrap();
		std::fs::write(root.join("Notes/sub/a.md"), "aye").unwrap();
		std::fs::write(root.join("Notes/.dotfile"), "x").unwrap();
		std::fs::write(root.join("Notes/.hidden/c.md"), "sea").unwrap();
		let files = build_manifest(root, "Notes").unwrap();
		let paths: Vec<&str> = files.iter().map(|f| f.rel_path.as_str()).collect();
		assert_eq!(paths, vec!["Notes/b.md", "Notes/sub/a.md"]);
		assert_eq!(files[0].size, 3);
		assert_eq!(files[0].sha256, hash_bytes(b"bee"));
	}

	#[cfg(unix)]
	#[test]
	fn build_manifest_skips_symlinks() {
		let dir = tempfile::tempdir().unwrap();
		let root = dir.path();
		std::fs::create_dir_all(root.join("Notes")).unwrap();
		std::fs::write(root.join("outside.md"), "secret").unwrap();
		std::os::unix::fs::symlink(root.join("outside.md"), root.join("Notes/link.md")).unwrap();
		let files = build_manifest(root, "Notes").unwrap();
		assert!(files.is_empty());
	}

	#[test]
	fn build_manifest_missing_folder_errors() {
		let dir = tempfile::tempdir().unwrap();
		assert!(build_manifest(dir.path(), "Nope").is_err());
	}
}
