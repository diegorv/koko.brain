use kokobrain_lib::utils::fs::{
	collect_markdown_paths, collect_markdown_paths_with_mtime, is_markdown_filename,
};
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

#[test]
fn skips_nested_hidden_directories() {
	// Audit 2026-05-22 (#121): the scan filters dot-prefixed segments at
	// any depth, not just at the vault root. This test pins that behaviour
	// so the watcher's matching `is_inside_hidden_dir` predicate stays
	// in lock-step. A regression here would re-introduce the index drift
	// between watcher-driven incremental updates and `scan_vault_v2`.
	let tmp = setup();
	let nested_hidden = tmp.path().join("notes").join(".archive");
	fs::create_dir_all(&nested_hidden).unwrap();
	fs::write(nested_hidden.join("note.md"), "should not be indexed").unwrap();
	let visible_nested = tmp.path().join("notes").join("visible.md");
	fs::create_dir_all(visible_nested.parent().unwrap()).unwrap();
	fs::write(&visible_nested, "indexed").unwrap();

	let entries = collect_markdown_paths(tmp.path(), &[]).unwrap();
	let rels: Vec<&str> = entries.iter().map(|(r, _)| r.as_str()).collect();
	assert!(
		rels.iter().any(|r| r.ends_with("visible.md")),
		"visible note must be indexed: got {rels:?}"
	);
	assert!(
		!rels.iter().any(|r| r.contains(".archive")),
		"nested .archive subtree must be skipped at any depth: got {rels:?}"
	);
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

// --- collect_markdown_paths_with_mtime ---

#[test]
fn with_mtime_collects_files_and_returns_positive_mtime() {
	let tmp = setup();
	fs::write(tmp.path().join("note.md"), "# Hello").unwrap();

	let entries = collect_markdown_paths_with_mtime(tmp.path(), &[]).unwrap();
	assert_eq!(entries.len(), 1);
	assert_eq!(entries[0].0, "note.md");
	assert!(entries[0].2 > 0, "mtime should be a positive unix timestamp");
}

#[test]
fn with_mtime_returns_same_files_as_without_mtime() {
	let tmp = setup();
	let sub = tmp.path().join("sub");
	fs::create_dir_all(&sub).unwrap();
	fs::write(tmp.path().join("a.md"), "a").unwrap();
	fs::write(sub.join("b.md"), "b").unwrap();
	fs::write(tmp.path().join("skip.txt"), "not md").unwrap();

	let without = collect_markdown_paths(tmp.path(), &[]).unwrap();
	let with_mtime = collect_markdown_paths_with_mtime(tmp.path(), &[]).unwrap();

	let mut paths_without: Vec<&str> = without.iter().map(|(p, _)| p.as_str()).collect();
	let mut paths_with: Vec<&str> = with_mtime.iter().map(|(p, _, _)| p.as_str()).collect();
	paths_without.sort();
	paths_with.sort();

	assert_eq!(paths_without, paths_with, "both functions should return the same file paths");
}

#[test]
fn with_mtime_excludes_folders() {
	let tmp = setup();
	let excluded = tmp.path().join("hidden");
	fs::create_dir_all(&excluded).unwrap();
	fs::write(excluded.join("secret.md"), "x").unwrap();
	fs::write(tmp.path().join("visible.md"), "y").unwrap();

	let entries = collect_markdown_paths_with_mtime(tmp.path(), &["hidden"]).unwrap();
	assert_eq!(entries.len(), 1);
	assert_eq!(entries[0].0, "visible.md");
}

// --- Audit Tier 1 #6: case-insensitive markdown extension matching ---

#[test]
fn is_markdown_filename_lowercase_md() {
	assert!(is_markdown_filename("note.md"));
	assert!(is_markdown_filename("note.markdown"));
}

#[test]
fn is_markdown_filename_uppercase_md() {
	// On case-preserving APFS, files saved with capital extension exist as
	// `Note.MD` on disk. Pre-fix they were silently dropped from the index.
	assert!(is_markdown_filename("Note.MD"));
	assert!(is_markdown_filename("Note.MARKDOWN"));
}

#[test]
fn is_markdown_filename_mixed_case() {
	assert!(is_markdown_filename("note.Md"));
	assert!(is_markdown_filename("note.mD"));
	assert!(is_markdown_filename("Note.MarkDown"));
}

#[test]
fn is_markdown_filename_rejects_other_extensions() {
	assert!(!is_markdown_filename("note.txt"));
	assert!(!is_markdown_filename("note.mdx"));
	assert!(!is_markdown_filename("note"));
	assert!(!is_markdown_filename(""));
	assert!(!is_markdown_filename("note.md.tmp")); // editor's atomic-save tmp file
}

#[test]
fn is_markdown_filename_handles_dotfiles() {
	// `.md` as the only "name" — edge case but must not panic.
	assert!(is_markdown_filename(".md"));
	assert!(is_markdown_filename(".MD"));
}

#[test]
fn collects_uppercase_md_files() {
	// End-to-end: create `Note.MD` and verify it shows up in the walk.
	// On case-preserving APFS, the file lives as-named.
	let tmp = setup();
	fs::write(tmp.path().join("Note.MD"), "# Hello").unwrap();
	fs::write(tmp.path().join("Other.MARKDOWN"), "# Other").unwrap();
	fs::write(tmp.path().join("nope.txt"), "ignored").unwrap();

	let entries = collect_markdown_paths(tmp.path(), &[]).unwrap();
	let mut names: Vec<&str> = entries.iter().map(|(p, _)| p.as_str()).collect();
	names.sort();
	assert_eq!(names, vec!["Note.MD", "Other.MARKDOWN"]);
}

#[test]
fn collects_mixed_case_md_files() {
	let tmp = setup();
	fs::write(tmp.path().join("a.md"), "lower").unwrap();
	fs::write(tmp.path().join("B.Md"), "title").unwrap();
	fs::write(tmp.path().join("c.mD"), "tail").unwrap();

	let entries = collect_markdown_paths(tmp.path(), &[]).unwrap();
	assert_eq!(entries.len(), 3);
}
