use base64::{engine::general_purpose::STANDARD as B64, Engine as _};
use kokobrain_lib::commands::fs::{
	copy_file_core, exists_core, mkdir_core, read_dir_core, read_file_core, read_text_file_core,
	remove_core, rename_core, write_text_file_core, MkdirOptions, RemoveOptions,
	WriteTextFileOptions,
};
use std::fs;
use tempfile::TempDir;
use tokio::runtime::Runtime;

fn rt() -> Runtime {
	Runtime::new().unwrap()
}

#[test]
fn read_text_file_roundtrips() {
	let rt = rt();
	let tmp = TempDir::new().unwrap();
	let p = tmp.path().join("a.md");
	fs::write(&p, "hello").unwrap();
	let out = rt
		.block_on(read_text_file_core(p.to_string_lossy().into()))
		.unwrap();
	assert_eq!(out, "hello");
}

#[test]
fn read_text_file_propagates_missing_file() {
	let rt = rt();
	let tmp = TempDir::new().unwrap();
	let p = tmp.path().join("missing.md");
	let err = rt
		.block_on(read_text_file_core(p.to_string_lossy().into()))
		.unwrap_err();
	assert!(err.contains("read_text_file"));
}

#[test]
fn write_text_file_writes_atomically() {
	let rt = rt();
	let tmp = TempDir::new().unwrap();
	let p = tmp.path().join("b.md");
	rt.block_on(write_text_file_core(
		p.to_string_lossy().into(),
		"body".into(),
		WriteTextFileOptions::default(),
	))
	.unwrap();
	assert_eq!(fs::read_to_string(&p).unwrap(), "body");
}

#[test]
fn write_text_file_truncates_by_default() {
	let rt = rt();
	let tmp = TempDir::new().unwrap();
	let p = tmp.path().join("c.md");
	fs::write(&p, "old long content").unwrap();
	rt.block_on(write_text_file_core(
		p.to_string_lossy().into(),
		"new".into(),
		WriteTextFileOptions::default(),
	))
	.unwrap();
	assert_eq!(fs::read_to_string(&p).unwrap(), "new");
}

#[test]
fn write_text_file_appends_when_option_set() {
	let rt = rt();
	let tmp = TempDir::new().unwrap();
	let p = tmp.path().join("d.md");
	fs::write(&p, "first ").unwrap();
	rt.block_on(write_text_file_core(
		p.to_string_lossy().into(),
		"second".into(),
		WriteTextFileOptions { append: true },
	))
	.unwrap();
	assert_eq!(fs::read_to_string(&p).unwrap(), "first second");
}

#[test]
fn write_text_file_append_creates_when_missing() {
	let rt = rt();
	let tmp = TempDir::new().unwrap();
	let p = tmp.path().join("e.md");
	rt.block_on(write_text_file_core(
		p.to_string_lossy().into(),
		"only".into(),
		WriteTextFileOptions { append: true },
	))
	.unwrap();
	assert_eq!(fs::read_to_string(&p).unwrap(), "only");
}

#[test]
fn read_file_returns_base64_bytes() {
	let rt = rt();
	let tmp = TempDir::new().unwrap();
	let p = tmp.path().join("bin");
	let bytes: Vec<u8> = (0..=255).collect();
	fs::write(&p, &bytes).unwrap();
	let b64 = rt
		.block_on(read_file_core(p.to_string_lossy().into()))
		.unwrap();
	let decoded = B64.decode(b64.as_bytes()).unwrap();
	assert_eq!(decoded, bytes);
}

#[test]
fn exists_returns_false_for_missing_path() {
	let rt = rt();
	let tmp = TempDir::new().unwrap();
	let p = tmp.path().join("nope");
	assert!(!rt
		.block_on(exists_core(p.to_string_lossy().into()))
		.unwrap());
}

#[test]
fn exists_returns_true_for_existing_dir() {
	let rt = rt();
	let tmp = TempDir::new().unwrap();
	assert!(rt
		.block_on(exists_core(tmp.path().to_string_lossy().into()))
		.unwrap());
}

#[test]
fn mkdir_non_recursive_fails_when_parent_missing() {
	let rt = rt();
	let tmp = TempDir::new().unwrap();
	let nested = tmp.path().join("a").join("b");
	let res = rt.block_on(mkdir_core(
		nested.to_string_lossy().into(),
		MkdirOptions { recursive: false },
	));
	assert!(res.is_err());
}

#[test]
fn mkdir_recursive_creates_full_chain() {
	let rt = rt();
	let tmp = TempDir::new().unwrap();
	let nested = tmp.path().join("a").join("b").join("c");
	rt.block_on(mkdir_core(
		nested.to_string_lossy().into(),
		MkdirOptions { recursive: true },
	))
	.unwrap();
	assert!(nested.is_dir());
}

#[test]
fn remove_file_deletes_file() {
	let rt = rt();
	let tmp = TempDir::new().unwrap();
	let p = tmp.path().join("x");
	fs::write(&p, "").unwrap();
	rt.block_on(remove_core(
		p.to_string_lossy().into(),
		RemoveOptions::default(),
	))
	.unwrap();
	assert!(!p.exists());
}

#[test]
fn remove_dir_recursive_deletes_tree() {
	let rt = rt();
	let tmp = TempDir::new().unwrap();
	let dir = tmp.path().join("d");
	fs::create_dir_all(dir.join("inner")).unwrap();
	fs::write(dir.join("inner").join("f"), "").unwrap();
	rt.block_on(remove_core(
		dir.to_string_lossy().into(),
		RemoveOptions { recursive: true },
	))
	.unwrap();
	assert!(!dir.exists());
}

#[test]
fn remove_non_empty_dir_without_recursive_errors() {
	let rt = rt();
	let tmp = TempDir::new().unwrap();
	let dir = tmp.path().join("d");
	fs::create_dir(&dir).unwrap();
	fs::write(dir.join("f"), "").unwrap();
	assert!(rt
		.block_on(remove_core(
			dir.to_string_lossy().into(),
			RemoveOptions::default(),
		))
		.is_err());
}

#[test]
fn rename_moves_file() {
	let rt = rt();
	let tmp = TempDir::new().unwrap();
	let old = tmp.path().join("a");
	let new = tmp.path().join("b");
	fs::write(&old, "x").unwrap();
	rt.block_on(rename_core(
		old.to_string_lossy().into(),
		new.to_string_lossy().into(),
	))
	.unwrap();
	assert!(!old.exists());
	assert_eq!(fs::read_to_string(&new).unwrap(), "x");
}

#[test]
fn copy_file_duplicates_bytes() {
	let rt = rt();
	let tmp = TempDir::new().unwrap();
	let a = tmp.path().join("a");
	let b = tmp.path().join("b");
	fs::write(&a, "data").unwrap();
	rt.block_on(copy_file_core(
		a.to_string_lossy().into(),
		b.to_string_lossy().into(),
	))
	.unwrap();
	assert_eq!(fs::read_to_string(&a).unwrap(), "data");
	assert_eq!(fs::read_to_string(&b).unwrap(), "data");
}

#[test]
fn read_dir_lists_entries_with_types() {
	let rt = rt();
	let tmp = TempDir::new().unwrap();
	fs::write(tmp.path().join("file.txt"), "").unwrap();
	fs::create_dir(tmp.path().join("subdir")).unwrap();
	let mut entries = rt
		.block_on(read_dir_core(tmp.path().to_string_lossy().into()))
		.unwrap();
	entries.sort_by(|a, b| a.name.cmp(&b.name));
	assert_eq!(entries.len(), 2);
	assert_eq!(entries[0].name, "file.txt");
	assert!(entries[0].is_file);
	assert!(!entries[0].is_directory);
	assert_eq!(entries[1].name, "subdir");
	assert!(entries[1].is_directory);
	assert!(!entries[1].is_file);
}

#[test]
fn read_dir_errors_for_missing_path() {
	let rt = rt();
	let tmp = TempDir::new().unwrap();
	let missing = tmp.path().join("nope");
	assert!(rt
		.block_on(read_dir_core(missing.to_string_lossy().into()))
		.is_err());
}
