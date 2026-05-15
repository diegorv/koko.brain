//! Filesystem commands that mirror `@tauri-apps/plugin-fs` semantics so the
//! same operations are available over the embedded HTTP transport.
//!
//! Every call site in the frontend that previously imported from
//! `@tauri-apps/plugin-fs` now routes through `$lib/api`, which under
//! native Tauri keeps using the real plugin and under a regular browser
//! POSTs to `/api/invoke` -> these commands.
//!
//! Paths must be absolute. The codebase already enforces this invariant
//! end-to-end (vault index, watcher, editor tabs all use absolute paths),
//! so we do not re-implement `BaseDirectory` resolution here.
//!
//! Binary reads (`read_file`) return base64-encoded `String` so the
//! payload survives the JSON wire format used by HTTP. The frontend
//! wrapper decodes back to `Uint8Array` so call sites are unchanged.

use base64::{engine::general_purpose::STANDARD as B64, Engine as _};
use serde::{Deserialize, Serialize};

#[derive(Serialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct DirEntry {
	pub name: String,
	pub is_directory: bool,
	pub is_file: bool,
	pub is_symlink: bool,
}

#[derive(Deserialize, Debug, Default)]
#[serde(rename_all = "camelCase")]
pub struct MkdirOptions {
	#[serde(default)]
	pub recursive: bool,
}

#[derive(Deserialize, Debug, Default)]
#[serde(rename_all = "camelCase")]
pub struct WriteTextFileOptions {
	#[serde(default)]
	pub append: bool,
}

#[derive(Deserialize, Debug, Default)]
#[serde(rename_all = "camelCase")]
pub struct RemoveOptions {
	#[serde(default)]
	pub recursive: bool,
}

pub async fn read_text_file_core(path: String) -> Result<String, String> {
	tokio::fs::read_to_string(&path)
		.await
		.map_err(|e| format!("read_text_file({path}): {e}"))
}

pub async fn write_text_file_core(
	path: String,
	contents: String,
	options: WriteTextFileOptions,
) -> Result<(), String> {
	if options.append {
		// std::fs inside spawn_blocking — sync Drop guarantees the file is
		// flushed and closed before the future resolves. tokio::fs::File
		// has an async Drop that returns before the OS write lands when
		// the future returns immediately, which surfaced as missing tail
		// bytes when callers (e.g. the log writer) chain write -> read on
		// the same path.
		let p = path.clone();
		tokio::task::spawn_blocking(move || {
			use std::io::Write;
			let mut file = std::fs::OpenOptions::new()
				.create(true)
				.append(true)
				.open(&p)
				.map_err(|e| format!("write_text_file({p}) open: {e}"))?;
			file.write_all(contents.as_bytes())
				.map_err(|e| format!("write_text_file({p}) append: {e}"))
		})
		.await
		.map_err(|e| format!("write_text_file({path}) join: {e}"))?
	} else {
		tokio::fs::write(&path, contents)
			.await
			.map_err(|e| format!("write_text_file({path}): {e}"))
	}
}

pub async fn read_file_core(path: String) -> Result<String, String> {
	let bytes = tokio::fs::read(&path)
		.await
		.map_err(|e| format!("read_file({path}): {e}"))?;
	Ok(B64.encode(bytes))
}

pub async fn exists_core(path: String) -> Result<bool, String> {
	match tokio::fs::metadata(&path).await {
		Ok(_) => Ok(true),
		Err(err) if err.kind() == std::io::ErrorKind::NotFound => Ok(false),
		Err(err) => Err(format!("exists({path}): {err}")),
	}
}

pub async fn mkdir_core(path: String, options: MkdirOptions) -> Result<(), String> {
	let res = if options.recursive {
		tokio::fs::create_dir_all(&path).await
	} else {
		tokio::fs::create_dir(&path).await
	};
	res.map_err(|e| format!("mkdir({path}): {e}"))
}

pub async fn remove_core(path: String, options: RemoveOptions) -> Result<(), String> {
	let meta = tokio::fs::symlink_metadata(&path)
		.await
		.map_err(|e| format!("remove({path}) metadata: {e}"))?;
	let res = if meta.is_dir() {
		if options.recursive {
			tokio::fs::remove_dir_all(&path).await
		} else {
			tokio::fs::remove_dir(&path).await
		}
	} else {
		tokio::fs::remove_file(&path).await
	};
	res.map_err(|e| format!("remove({path}): {e}"))
}

pub async fn rename_core(old_path: String, new_path: String) -> Result<(), String> {
	tokio::fs::rename(&old_path, &new_path)
		.await
		.map_err(|e| format!("rename({old_path} -> {new_path}): {e}"))
}

pub async fn copy_file_core(from_path: String, to_path: String) -> Result<(), String> {
	tokio::fs::copy(&from_path, &to_path)
		.await
		.map(|_| ())
		.map_err(|e| format!("copy_file({from_path} -> {to_path}): {e}"))
}

pub async fn read_dir_core(path: String) -> Result<Vec<DirEntry>, String> {
	let mut entries = tokio::fs::read_dir(&path)
		.await
		.map_err(|e| format!("read_dir({path}): {e}"))?;
	let mut out = Vec::new();
	loop {
		match entries.next_entry().await {
			Ok(Some(entry)) => {
				let file_type = match entry.file_type().await {
					Ok(ft) => ft,
					Err(e) => return Err(format!("read_dir({path}) entry type: {e}")),
				};
				let name = entry.file_name().to_string_lossy().into_owned();
				out.push(DirEntry {
					name,
					is_directory: file_type.is_dir(),
					is_file: file_type.is_file(),
					is_symlink: file_type.is_symlink(),
				});
			}
			Ok(None) => break,
			Err(e) => return Err(format!("read_dir({path}) iter: {e}")),
		}
	}
	Ok(out)
}

#[tauri::command]
pub async fn fs_read_text_file(path: String) -> Result<String, String> {
	read_text_file_core(path).await
}

#[tauri::command]
pub async fn fs_write_text_file(
	path: String,
	contents: String,
	options: Option<WriteTextFileOptions>,
) -> Result<(), String> {
	write_text_file_core(path, contents, options.unwrap_or_default()).await
}

#[tauri::command]
pub async fn fs_read_file(path: String) -> Result<String, String> {
	read_file_core(path).await
}

#[tauri::command]
pub async fn fs_exists(path: String) -> Result<bool, String> {
	exists_core(path).await
}

#[tauri::command]
pub async fn fs_mkdir(path: String, options: Option<MkdirOptions>) -> Result<(), String> {
	mkdir_core(path, options.unwrap_or_default()).await
}

#[tauri::command]
pub async fn fs_remove(path: String, options: Option<RemoveOptions>) -> Result<(), String> {
	remove_core(path, options.unwrap_or_default()).await
}

#[tauri::command]
pub async fn fs_rename(old_path: String, new_path: String) -> Result<(), String> {
	rename_core(old_path, new_path).await
}

#[tauri::command]
pub async fn fs_copy_file(from_path: String, to_path: String) -> Result<(), String> {
	copy_file_core(from_path, to_path).await
}

#[tauri::command]
pub async fn fs_read_dir(path: String) -> Result<Vec<DirEntry>, String> {
	read_dir_core(path).await
}
