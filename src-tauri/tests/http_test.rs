use kokobrain_lib::http::is_valid_frontend_dist;
use std::fs;
use tempfile::TempDir;

#[test]
fn rejects_nonexistent_path() {
	let tmp = TempDir::new().unwrap();
	let missing = tmp.path().join("does-not-exist");
	assert!(!is_valid_frontend_dist(&missing));
}

#[test]
fn rejects_file_path() {
	let tmp = TempDir::new().unwrap();
	let file = tmp.path().join("not-a-dir");
	fs::write(&file, "x").unwrap();
	assert!(!is_valid_frontend_dist(&file));
}

#[test]
fn rejects_directory_without_index_html() {
	let tmp = TempDir::new().unwrap();
	let dir = tmp.path().join("build");
	fs::create_dir_all(&dir).unwrap();
	fs::write(dir.join("foo.txt"), "").unwrap();
	assert!(!is_valid_frontend_dist(&dir));
}

#[test]
fn rejects_directory_with_index_html_as_subdir() {
	let tmp = TempDir::new().unwrap();
	let dir = tmp.path().join("build");
	fs::create_dir_all(dir.join("index.html")).unwrap();
	assert!(!is_valid_frontend_dist(&dir));
}

#[test]
fn accepts_directory_with_index_html_file() {
	let tmp = TempDir::new().unwrap();
	let dir = tmp.path().join("build");
	fs::create_dir_all(&dir).unwrap();
	fs::write(dir.join("index.html"), "<html></html>").unwrap();
	assert!(is_valid_frontend_dist(&dir));
}

#[test]
fn rejects_cargo_build_scripts_dir_shape() {
	let tmp = TempDir::new().unwrap();
	let dir = tmp.path().join("build");
	fs::create_dir_all(dir.join("ahash-66981dd41b0d992c")).unwrap();
	fs::create_dir_all(dir.join("anyhow-70cd94bdc0ada339")).unwrap();
	assert!(!is_valid_frontend_dist(&dir));
}
