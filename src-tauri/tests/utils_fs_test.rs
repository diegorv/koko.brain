use kokobrain_lib::utils::fs::collect_markdown_paths;
use std::fs;
use tempfile::TempDir;

fn setup() -> TempDir {
	TempDir::new().unwrap()
}

// --- basic collection ---

#[test]
fn collects_md_files() {
	let tmp = setup();
	fs::write(tmp.path().join("note.md"), "# Hello").unwrap();
	fs::write(tmp.path().join("readme.txt"), "not markdown").unwrap();

	let entries = collect_markdown_paths(tmp.path(), &[]).unwrap();
	assert_eq!(entries.len(), 1);
	assert_eq!(entries[0].0, "note.md");
}

#[test]
fn collects_markdown_extension() {
	let tmp = setup();
	fs::write(tmp.path().join("note.markdown"), "# Hello").unwrap();

	let entries = collect_markdown_paths(tmp.path(), &[]).unwrap();
	assert_eq!(entries.len(), 1);
	assert_eq!(entries[0].0, "note.markdown");
}

#[test]
fn collects_both_md_and_markdown() {
	let tmp = setup();
	fs::write(tmp.path().join("a.md"), "a").unwrap();
	fs::write(tmp.path().join("b.markdown"), "b").unwrap();

	let entries = collect_markdown_paths(tmp.path(), &[]).unwrap();
	assert_eq!(entries.len(), 2);
}

// --- nested directories ---

#[test]
fn collects_nested_files() {
	let tmp = setup();
	let sub = tmp.path().join("folder").join("sub");
	fs::create_dir_all(&sub).unwrap();
	fs::write(sub.join("deep.md"), "deep").unwrap();

	let entries = collect_markdown_paths(tmp.path(), &[]).unwrap();
	assert_eq!(entries.len(), 1);

	let rel = &entries[0].0;
	assert!(rel.contains("folder"));
	assert!(rel.contains("sub"));
	assert!(rel.ends_with("deep.md"));
}

// --- hidden files and directories ---

#[test]
fn skips_hidden_files() {
	let tmp = setup();
	fs::write(tmp.path().join(".hidden.md"), "secret").unwrap();
	fs::write(tmp.path().join("visible.md"), "public").unwrap();

	let entries = collect_markdown_paths(tmp.path(), &[]).unwrap();
	assert_eq!(entries.len(), 1);
	assert_eq!(entries[0].0, "visible.md");
}

#[test]
fn skips_hidden_directories() {
	let tmp = setup();
	let hidden = tmp.path().join(".hidden");
	fs::create_dir_all(&hidden).unwrap();
	fs::write(hidden.join("note.md"), "secret").unwrap();
	fs::write(tmp.path().join("visible.md"), "public").unwrap();

	let entries = collect_markdown_paths(tmp.path(), &[]).unwrap();
	assert_eq!(entries.len(), 1);
	assert_eq!(entries[0].0, "visible.md");
}

// --- excluded folders ---

#[test]
fn excludes_specified_folders() {
	let tmp = setup();
	let templates = tmp.path().join("_templates");
	fs::create_dir_all(&templates).unwrap();
	fs::write(templates.join("template.md"), "tmpl").unwrap();
	fs::write(tmp.path().join("note.md"), "note").unwrap();

	let entries = collect_markdown_paths(tmp.path(), &["_templates"]).unwrap();
	assert_eq!(entries.len(), 1);
	assert_eq!(entries[0].0, "note.md");
}

#[test]
fn no_exclusions_collects_all() {
	let tmp = setup();
	let templates = tmp.path().join("_templates");
	fs::create_dir_all(&templates).unwrap();
	fs::write(templates.join("template.md"), "tmpl").unwrap();
	fs::write(tmp.path().join("note.md"), "note").unwrap();

	let entries = collect_markdown_paths(tmp.path(), &[]).unwrap();
	assert_eq!(entries.len(), 2);
}

// --- symlinks ---

#[cfg(unix)]
#[test]
fn skips_symlinks() {
	let tmp = setup();
	fs::write(tmp.path().join("real.md"), "content").unwrap();
	std::os::unix::fs::symlink(
		tmp.path().join("real.md"),
		tmp.path().join("link.md"),
	)
	.unwrap();

	let entries = collect_markdown_paths(tmp.path(), &[]).unwrap();
	assert_eq!(entries.len(), 1);
	assert_eq!(entries[0].0, "real.md");
}

#[cfg(unix)]
#[test]
fn skips_symlinked_directories() {
	let tmp = setup();
	let real_dir = tmp.path().join("real_dir");
	fs::create_dir_all(&real_dir).unwrap();
	fs::write(real_dir.join("note.md"), "content").unwrap();
	std::os::unix::fs::symlink(&real_dir, tmp.path().join("link_dir")).unwrap();

	let entries = collect_markdown_paths(tmp.path(), &[]).unwrap();
	assert_eq!(entries.len(), 1);
	assert!(entries[0].0.starts_with("real_dir"));
}

// --- empty vault ---

#[test]
fn empty_vault_returns_empty() {
	let tmp = setup();
	let entries = collect_markdown_paths(tmp.path(), &[]).unwrap();
	assert!(entries.is_empty());
}

// --- relative paths ---

#[test]
fn returns_relative_paths() {
	let tmp = setup();
	let sub = tmp.path().join("notes");
	fs::create_dir_all(&sub).unwrap();
	fs::write(sub.join("hello.md"), "hi").unwrap();

	let entries = collect_markdown_paths(tmp.path(), &[]).unwrap();
	let (rel, abs) = &entries[0];
	assert!(!rel.starts_with('/'), "relative path should not start with /");
	assert!(abs.is_absolute(), "absolute path should be absolute");
	assert!(abs.ends_with("hello.md"));
}

// --- non-existent vault ---

#[test]
fn non_existent_vault_returns_error() {
	let result = collect_markdown_paths(std::path::Path::new("/tmp/does_not_exist_9999"), &[]);
	assert!(result.is_err());
}

// --- ignores non-markdown files ---

#[test]
fn ignores_non_markdown_files() {
	let tmp = setup();
	fs::write(tmp.path().join("image.png"), &[0u8; 10]).unwrap();
	fs::write(tmp.path().join("data.json"), "{}").unwrap();
	fs::write(tmp.path().join("script.js"), "//").unwrap();
	fs::write(tmp.path().join("note.md"), "hello").unwrap();

	let entries = collect_markdown_paths(tmp.path(), &[]).unwrap();
	assert_eq!(entries.len(), 1);
	assert_eq!(entries[0].0, "note.md");
}
