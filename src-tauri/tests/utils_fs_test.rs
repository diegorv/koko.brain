use kokobrain_lib::utils::fs::{
	collect_markdown_paths, collect_markdown_paths_with_metadata,
	collect_markdown_paths_with_mtime, is_markdown_filename, validate_vault_path,
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

// --- validate_vault_path ---

#[test]
fn validate_vault_path_returns_canonical_dir() {
	let tmp = setup();
	let expected = tmp.path().canonicalize().unwrap();

	let result = validate_vault_path(tmp.path().to_str().unwrap()).unwrap();
	assert_eq!(result, expected, "must return the canonicalized path");
	assert!(result.is_dir());
	assert!(result.is_absolute());
}

#[cfg(unix)]
#[test]
fn validate_vault_path_resolves_symlink_to_target() {
	// Callers must receive the resolved target so subsequent filesystem
	// operations cannot be redirected through the symlink (TOCTOU guard).
	let tmp = setup();
	let real = tmp.path().join("real_vault");
	fs::create_dir_all(&real).unwrap();
	let link = tmp.path().join("vault_link");
	std::os::unix::fs::symlink(&real, &link).unwrap();

	let result = validate_vault_path(link.to_str().unwrap()).unwrap();
	assert_eq!(result, real.canonicalize().unwrap());
}

#[test]
fn validate_vault_path_rejects_non_existent_path() {
	let err = validate_vault_path("/tmp/koko_does_not_exist_9999").unwrap_err();
	assert!(
		err.contains("Failed to resolve vault path"),
		"unexpected error message: {err}"
	);
}

#[test]
fn validate_vault_path_rejects_file_path() {
	let tmp = setup();
	let file = tmp.path().join("note.md");
	fs::write(&file, "# not a directory").unwrap();

	let err = validate_vault_path(file.to_str().unwrap()).unwrap_err();
	assert!(
		err.contains("not a directory"),
		"unexpected error message: {err}"
	);
}

#[test]
fn validate_vault_path_rejects_empty_string() {
	let err = validate_vault_path("").unwrap_err();
	assert!(
		err.contains("Failed to resolve vault path"),
		"empty path must fail canonicalization: {err}"
	);
}

// --- collect_markdown_paths_with_metadata ---

#[test]
fn with_metadata_returns_mtime_ctime_and_exact_size() {
	let tmp = setup();
	let content = "# Hello metadata\n\nSome body text.";
	fs::write(tmp.path().join("note.md"), content).unwrap();

	let entries = collect_markdown_paths_with_metadata(tmp.path(), &[]).unwrap();
	assert_eq!(entries.len(), 1);
	let (rel, abs, mtime, ctime, size) = &entries[0];
	assert_eq!(rel, "note.md");
	assert!(abs.is_absolute());
	assert!(abs.ends_with("note.md"));
	assert!(*mtime > 0, "mtime should be a positive unix timestamp");
	// ctime is documented as 0 on filesystems without creation time.
	assert!(*ctime >= 0);
	#[cfg(target_os = "macos")]
	assert!(*ctime > 0, "APFS exposes creation time");
	assert_eq!(*size, content.len() as u64, "size must match bytes on disk");
}

#[test]
fn with_metadata_returns_same_files_as_base_walk() {
	let tmp = setup();
	let sub = tmp.path().join("sub");
	fs::create_dir_all(&sub).unwrap();
	fs::write(tmp.path().join("a.md"), "a").unwrap();
	fs::write(sub.join("b.md"), "b").unwrap();
	fs::write(tmp.path().join("skip.txt"), "not md").unwrap();

	let without = collect_markdown_paths(tmp.path(), &[]).unwrap();
	let with_metadata = collect_markdown_paths_with_metadata(tmp.path(), &[]).unwrap();

	let mut paths_without: Vec<&str> = without.iter().map(|(p, _)| p.as_str()).collect();
	let mut paths_with: Vec<&str> =
		with_metadata.iter().map(|(p, _, _, _, _)| p.as_str()).collect();
	paths_without.sort();
	paths_with.sort();

	assert_eq!(
		paths_without, paths_with,
		"both walk variants must return the same file set"
	);
}

#[test]
fn with_metadata_skips_hidden_and_excluded_folders() {
	let tmp = setup();
	let hidden = tmp.path().join(".kokobrain");
	fs::create_dir_all(&hidden).unwrap();
	fs::write(hidden.join("internal.md"), "hidden").unwrap();
	let excluded = tmp.path().join("_templates");
	fs::create_dir_all(&excluded).unwrap();
	fs::write(excluded.join("tmpl.md"), "excluded").unwrap();
	fs::write(tmp.path().join("visible.md"), "ok").unwrap();

	let entries = collect_markdown_paths_with_metadata(tmp.path(), &["_templates"]).unwrap();
	assert_eq!(entries.len(), 1);
	assert_eq!(entries[0].0, "visible.md");
}

#[test]
fn with_metadata_empty_vault_returns_empty() {
	let tmp = setup();
	let entries = collect_markdown_paths_with_metadata(tmp.path(), &[]).unwrap();
	assert!(entries.is_empty());
}

#[test]
fn with_metadata_non_existent_vault_returns_error() {
	let result = collect_markdown_paths_with_metadata(
		std::path::Path::new("/tmp/does_not_exist_9999"),
		&[],
	);
	assert!(result.is_err());
}
