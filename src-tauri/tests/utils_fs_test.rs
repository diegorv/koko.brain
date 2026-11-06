use kokobrain_lib::commands::vault::{
	propagate_type_rename_inner, toggle_task_status_inner, update_note_in_index_inner, write_mod_data,
};
use kokobrain_lib::utils::fs::{
	collect_markdown_paths, collect_markdown_paths_with_metadata,
	collect_markdown_paths_with_mtime, is_markdown_filename, is_search_indexed_filename,
	validate_vault_path, write_atomic,
};
use kokobrain_lib::vault::index::VaultIndex;
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
	fs::write(tmp.path().join("image.png"), [0u8; 10]).unwrap();
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

/// The mtime walk feeds the FTS5 and semantic builds, which skip `.view`;
/// the metadata walk feeds the VaultIndex, which keeps it.
#[test]
fn with_mtime_skips_view_files_that_the_metadata_walk_keeps() {
	let tmp = setup();
	fs::write(tmp.path().join("a.md"), "# A").unwrap();
	fs::write(tmp.path().join("b.view"), "name: B").unwrap();
	fs::write(tmp.path().join("c.VIEW"), "name: C").unwrap();

	let searchable: Vec<String> = collect_markdown_paths_with_mtime(tmp.path(), &[])
		.unwrap()
		.into_iter()
		.map(|(rel, _, _)| rel)
		.collect();
	assert_eq!(searchable, vec!["a.md"]);

	let mut indexed: Vec<String> = collect_markdown_paths_with_metadata(tmp.path(), &[])
		.unwrap()
		.into_iter()
		.map(|(rel, _, _, _, _)| rel)
		.collect();
	indexed.sort();
	assert_eq!(indexed, vec!["a.md", "b.view", "c.VIEW"]);
}

#[test]
fn is_search_indexed_filename_excludes_views_and_non_markdown() {
	assert!(is_search_indexed_filename("note.md"));
	assert!(is_search_indexed_filename("Note.MARKDOWN"));
	assert!(is_search_indexed_filename("dir.view/a.md"));
	assert!(!is_search_indexed_filename("projects.view"));
	assert!(!is_search_indexed_filename("Projects.VIEW"));
	assert!(!is_search_indexed_filename("board.kanban"));
	assert!(!is_search_indexed_filename("folder"));
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

// --- write_atomic ---

#[test]
fn write_atomic_creates_new_file_with_content() {
	let tmp = setup();
	let path = tmp.path().join("note.md");
	write_atomic(path.to_str().unwrap(), "hello").unwrap();
	assert_eq!(fs::read_to_string(&path).unwrap(), "hello");
}

#[test]
fn write_atomic_replaces_existing_content() {
	let tmp = setup();
	let path = tmp.path().join("note.md");
	fs::write(&path, "old").unwrap();
	write_atomic(path.to_str().unwrap(), "new").unwrap();
	assert_eq!(fs::read_to_string(&path).unwrap(), "new");
}

#[test]
fn write_atomic_leaves_no_temp_file_behind() {
	let tmp = setup();
	let path = tmp.path().join("note.md");
	write_atomic(path.to_str().unwrap(), "content").unwrap();
	let entries: Vec<_> = fs::read_dir(tmp.path())
		.unwrap()
		.map(|e| e.unwrap().file_name().to_string_lossy().to_string())
		.collect();
	assert_eq!(entries, vec!["note.md"], "only the target file must remain: {entries:?}");
}

#[test]
fn write_atomic_errors_when_parent_dir_missing() {
	let tmp = setup();
	let path = tmp.path().join("missing-dir/note.md");
	let result = write_atomic(path.to_str().unwrap(), "content");
	assert!(result.is_err());
}

#[cfg(target_os = "macos")]
#[test]
fn write_atomic_keeps_the_creation_time_of_an_existing_target() {
	use std::os::macos::fs::FileTimesExt;
	use std::time::{Duration, UNIX_EPOCH};

	let tmp = setup();
	let path = tmp.path().join("note.md");
	fs::write(&path, "old").unwrap();
	let created = UNIX_EPOCH + Duration::from_secs(1_600_000_000);
	fs::File::options()
		.write(true)
		.open(&path)
		.unwrap()
		.set_times(fs::FileTimes::new().set_created(created))
		.unwrap();

	write_atomic(path.to_str().unwrap(), "new").unwrap();

	assert_eq!(fs::read_to_string(&path).unwrap(), "new");
	assert_eq!(fs::metadata(&path).unwrap().created().unwrap(), created);
}

#[test]
fn write_atomic_errors_on_read_only_target_instead_of_replacing_it() {
	let tmp = setup();
	let path = tmp.path().join("locked.md");
	fs::write(&path, "protected").unwrap();
	let mut perms = fs::metadata(&path).unwrap().permissions();
	perms.set_readonly(true);
	fs::set_permissions(&path, perms).unwrap();

	let result = write_atomic(path.to_str().unwrap(), "overwrite");

	assert!(result.is_err(), "read-only target must stay an error");
	assert_eq!(fs::read_to_string(&path).unwrap(), "protected");
}

// --- write_atomic failure paths ---
//
// A failed write cannot be provoked in-process without limiting the whole test
// binary, so these run an ignored `child_*` test in a new process: under a file
// size limit the temp file is created and its write then fails, and SIGXFSZ is
// ignored so the write returns an error instead of killing the child. A child
// does nothing without CHILD_DIR, so a run with `--ignored` stays harmless.

#[cfg(unix)]
const CHILD_DIR: &str = "WRITE_ATOMIC_CHILD_DIR";
/// Far over the limit of `ulimit -f 1` (512 or 1024 bytes, depending on the `sh`).
#[cfg(unix)]
const OVER_LIMIT: usize = 1024 * 1024;

#[cfg(unix)]
fn run_child(child: &str, dir: &std::path::Path, size_limit: bool) {
	let limit = if size_limit { "trap '' XFSZ; ulimit -f 1; " } else { "" };
	let output = std::process::Command::new("sh")
		.arg("-c")
		.arg(format!("{limit}exec \"$0\" --exact {child} --ignored"))
		.arg(std::env::current_exe().unwrap())
		.env(CHILD_DIR, dir)
		.output()
		.unwrap();
	let stdout = String::from_utf8_lossy(&output.stdout);
	// Without "1 passed", a renamed child would match nothing and exit 0.
	assert!(
		output.status.success() && stdout.contains("1 passed"),
		"child {child}: {stdout}\n{}",
		String::from_utf8_lossy(&output.stderr)
	);
}

#[cfg(unix)]
fn child_dir() -> Option<std::path::PathBuf> {
	std::env::var_os(CHILD_DIR).map(std::path::PathBuf::from)
}

fn sorted_names(dir: &std::path::Path) -> Vec<String> {
	let mut names: Vec<String> = fs::read_dir(dir)
		.unwrap()
		.map(|e| e.unwrap().file_name().to_string_lossy().to_string())
		.collect();
	names.sort();
	names
}

fn text_path(dir: &std::path::Path, name: &str) -> String {
	dir.join(name).to_string_lossy().to_string()
}

#[cfg(unix)]
fn assert_write_error(result: Result<(), String>) {
	let error = result.expect_err("the write should fail");
	assert!(error.starts_with("write failed for "), "unexpected error: {error}");
}

#[cfg(unix)]
#[test]
#[ignore = "child of the failed-write tests"]
fn child_large_write_fails() {
	let Some(dir) = child_dir() else { return };

	assert_write_error(write_atomic(&text_path(&dir, "data.json"), &"x".repeat(OVER_LIMIT)));
}

#[cfg(unix)]
#[test]
fn write_atomic_failed_write_leaves_the_target_its_times_and_the_folder_as_they_were() {
	let tmp = TempDir::new().unwrap();
	let target = tmp.path().join("data.json");
	fs::write(&target, "old").unwrap();
	// Names that look like a temp file but are not this write's: the cleanup must not touch them.
	fs::write(tmp.path().join("data.json.tmp-1-2"), "other temp").unwrap();
	fs::write(tmp.path().join("data.json.tmp"), "not a temp").unwrap();
	fs::write(tmp.path().join("other.md"), "a note").unwrap();
	let before = fs::metadata(&target).unwrap();

	run_child("child_large_write_fails", tmp.path(), true);

	assert_eq!(
		sorted_names(tmp.path()),
		vec!["data.json", "data.json.tmp", "data.json.tmp-1-2", "other.md"]
	);
	assert_eq!(fs::read_to_string(&target).unwrap(), "old");
	assert_eq!(fs::read_to_string(tmp.path().join("data.json.tmp-1-2")).unwrap(), "other temp");
	assert_eq!(fs::read_to_string(tmp.path().join("data.json.tmp")).unwrap(), "not a temp");
	assert_eq!(fs::read_to_string(tmp.path().join("other.md")).unwrap(), "a note");
	let after = fs::metadata(&target).unwrap();
	assert_eq!(after.modified().unwrap(), before.modified().unwrap());
	assert_eq!(after.created().ok(), before.created().ok());
}

#[cfg(unix)]
#[test]
fn write_atomic_failed_write_without_a_target_creates_nothing() {
	let tmp = TempDir::new().unwrap();

	run_child("child_large_write_fails", tmp.path(), true);

	assert_eq!(sorted_names(tmp.path()), Vec::<String>::new());
}

#[cfg(unix)]
#[test]
#[ignore = "child of write_atomic_repeated_failures_leave_nothing_behind"]
fn child_repeated_failures() {
	let Some(dir) = child_dir() else { return };
	let path = text_path(&dir, "data.json");

	for _ in 0..25 {
		assert_write_error(write_atomic(&path, &"x".repeat(OVER_LIMIT)));
	}
}

#[cfg(unix)]
#[test]
fn write_atomic_repeated_failures_leave_nothing_behind() {
	let tmp = TempDir::new().unwrap();
	fs::write(tmp.path().join("data.json"), "old").unwrap();

	run_child("child_repeated_failures", tmp.path(), true);

	assert_eq!(sorted_names(tmp.path()), vec!["data.json"]);
	assert_eq!(fs::read_to_string(tmp.path().join("data.json")).unwrap(), "old");
}

#[cfg(unix)]
#[test]
#[ignore = "child of write_atomic_retry_after_a_failure_succeeds"]
fn child_retry_after_failure() {
	let Some(dir) = child_dir() else { return };
	let path = text_path(&dir, "data.json");

	assert_write_error(write_atomic(&path, &"x".repeat(OVER_LIMIT)));
	write_atomic(&path, "small").expect("a write under the limit");
}

#[cfg(unix)]
#[test]
fn write_atomic_retry_after_a_failure_succeeds() {
	let tmp = TempDir::new().unwrap();
	fs::write(tmp.path().join("data.json"), "old").unwrap();

	run_child("child_retry_after_failure", tmp.path(), true);

	assert_eq!(sorted_names(tmp.path()), vec!["data.json"]);
	assert_eq!(fs::read_to_string(tmp.path().join("data.json")).unwrap(), "small");
}

#[cfg(unix)]
#[test]
#[ignore = "child of write_atomic_failures_do_not_disturb_concurrent_writes_that_succeed"]
fn child_mixed_concurrent_writes() {
	let Some(dir) = child_dir() else { return };
	let path = text_path(&dir, "data.json");
	write_atomic(&path, "small-seed").expect("seed");
	let done = std::sync::Arc::new(std::sync::atomic::AtomicBool::new(false));

	let reader = {
		let (path, done) = (path.clone(), done.clone());
		std::thread::spawn(move || {
			while !done.load(std::sync::atomic::Ordering::Relaxed) {
				let text = fs::read_to_string(&path).expect("the target always exists");
				assert!(text.starts_with("small-"), "reader saw {} bytes of a failed write", text.len());
			}
		})
	};
	let writers: Vec<_> = (0..6)
		.map(|t| {
			let path = path.clone();
			std::thread::spawn(move || {
				for i in 0..40 {
					write_atomic(&path, &format!("small-{t}-{i}")).expect("a write under the limit");
					assert_write_error(write_atomic(&path, &"x".repeat(OVER_LIMIT)));
				}
			})
		})
		.collect();
	for writer in writers {
		writer.join().expect("writer");
	}
	done.store(true, std::sync::atomic::Ordering::Relaxed);
	reader.join().expect("reader");
}

#[cfg(unix)]
#[test]
fn write_atomic_failures_do_not_disturb_concurrent_writes_that_succeed() {
	let tmp = TempDir::new().unwrap();

	run_child("child_mixed_concurrent_writes", tmp.path(), true);

	assert_eq!(sorted_names(tmp.path()), vec!["data.json"]);
	assert!(fs::read_to_string(tmp.path().join("data.json")).unwrap().starts_with("small-"));
}

/// The first write of a process uses sequence 0, so a child can occupy its temp name.
#[cfg(unix)]
fn first_temp_name() -> String {
	format!("data.json.tmp-{}-0", std::process::id())
}

#[cfg(unix)]
#[test]
#[ignore = "child of write_atomic_failed_write_removes_a_stale_temp_file_of_the_same_name"]
fn child_stale_temp_of_the_same_name() {
	let Some(dir) = child_dir() else { return };
	let stale = dir.join(first_temp_name());
	fs::write(&stale, "stale").unwrap();

	assert_write_error(write_atomic(&text_path(&dir, "data.json"), &"x".repeat(OVER_LIMIT)));

	assert!(!stale.exists());
}

#[cfg(unix)]
#[test]
fn write_atomic_failed_write_removes_a_stale_temp_file_of_the_same_name() {
	let tmp = TempDir::new().unwrap();
	fs::write(tmp.path().join("data.json"), "old").unwrap();

	run_child("child_stale_temp_of_the_same_name", tmp.path(), true);

	assert_eq!(sorted_names(tmp.path()), vec!["data.json"]);
	assert_eq!(fs::read_to_string(tmp.path().join("data.json")).unwrap(), "old");
}

/// A directory at the temp name fails the write and then the cleanup too.
#[cfg(unix)]
#[test]
#[ignore = "child of write_atomic_failed_cleanup_keeps_the_write_error_and_removes_nothing"]
fn child_cleanup_fails_too() {
	let Some(dir) = child_dir() else { return };
	let occupied = dir.join(first_temp_name());
	fs::create_dir(&occupied).unwrap();
	fs::write(occupied.join("inside"), "kept").unwrap();

	let error = write_atomic(&text_path(&dir, "data.json"), "content").expect_err("the write should fail");

	assert!(error.starts_with("write failed for "), "unexpected error: {error}");
	assert_eq!(fs::read_to_string(occupied.join("inside")).unwrap(), "kept");
}

#[cfg(unix)]
#[test]
fn write_atomic_failed_cleanup_keeps_the_write_error_and_removes_nothing() {
	let tmp = TempDir::new().unwrap();
	fs::write(tmp.path().join("data.json"), "old").unwrap();

	run_child("child_cleanup_fails_too", tmp.path(), false);

	assert_eq!(fs::read_to_string(tmp.path().join("data.json")).unwrap(), "old");
	assert_eq!(sorted_names(tmp.path()).len(), 2);
}

/// Skipped as root, which ignores directory permissions.
#[cfg(unix)]
#[test]
fn write_atomic_in_a_read_only_folder_errors_and_leaves_the_target() {
	use std::os::unix::fs::PermissionsExt;

	let tmp = TempDir::new().unwrap();
	let target = tmp.path().join("data.json");
	fs::write(&target, "old").unwrap();
	fs::set_permissions(tmp.path(), fs::Permissions::from_mode(0o555)).unwrap();
	let ignores_permissions = fs::write(tmp.path().join("probe"), "").is_ok();

	let result = write_atomic(&target.to_string_lossy(), "new");
	let names = sorted_names(tmp.path());
	let text = fs::read_to_string(&target).unwrap();
	fs::set_permissions(tmp.path(), fs::Permissions::from_mode(0o755)).unwrap();

	if ignores_permissions {
		return;
	}
	assert_write_error(result);
	assert_eq!(names, vec!["data.json"]);
	assert_eq!(text, "old");
}

#[test]
fn write_atomic_rename_failure_leaves_no_temp_file_and_a_directory_target_intact() {
	let tmp = TempDir::new().unwrap();
	let target = tmp.path().join("data.json");
	fs::create_dir(&target).unwrap();
	fs::write(target.join("keep"), "kept").unwrap();

	let error = write_atomic(&target.to_string_lossy(), "x").expect_err("the rename should fail");

	assert!(error.starts_with("rename failed for "), "unexpected error: {error}");
	assert_eq!(sorted_names(tmp.path()), vec!["data.json"]);
	assert_eq!(fs::read_to_string(target.join("keep")).unwrap(), "kept");
}

#[test]
fn write_atomic_keeps_text_exactly_and_writes_empty_content() {
	let tmp = TempDir::new().unwrap();
	let path = text_path(tmp.path(), "data.json");

	for text in ["Ação ☕ 日本語\n\t\"quoted\"\r\n", "", "\u{feff}with a BOM", "\0"] {
		write_atomic(&path, text).unwrap();
		assert_eq!(fs::read_to_string(&path).unwrap(), text);
	}
	assert_eq!(sorted_names(tmp.path()), vec!["data.json"]);
}

#[test]
fn write_atomic_concurrent_writers_never_expose_a_partial_file_or_leave_a_temp() {
	let tmp = TempDir::new().unwrap();
	let path = text_path(tmp.path(), "data.json");
	let size = 256 * 1024;
	write_atomic(&path, &"a".repeat(size)).unwrap();
	let done = std::sync::Arc::new(std::sync::atomic::AtomicBool::new(false));

	let reader = {
		let (path, done) = (path.clone(), done.clone());
		std::thread::spawn(move || {
			while !done.load(std::sync::atomic::Ordering::Relaxed) {
				let bytes = fs::read(&path).expect("the target always exists");
				assert_eq!(bytes.len(), size, "reader saw a partial file");
				assert!(bytes.iter().all(|b| *b == bytes[0]), "reader saw two writes mixed");
			}
		})
	};
	let writers: Vec<_> = ["b", "c", "d", "e", "f", "g", "h", "i"]
		.into_iter()
		.map(|fill| {
			let path = path.clone();
			std::thread::spawn(move || {
				for _ in 0..30 {
					write_atomic(&path, &fill.repeat(size)).expect("write");
				}
			})
		})
		.collect();
	for writer in writers {
		writer.join().expect("writer");
	}
	done.store(true, std::sync::atomic::Ordering::Relaxed);
	reader.join().expect("reader");

	assert_eq!(sorted_names(tmp.path()), vec!["data.json"]);
}

// --- The real callers of write_atomic, when its write fails ---

/// Long enough that rewriting it goes over the child's file size limit.
#[cfg(unix)]
fn long_note(head: &str) -> String {
	format!("{head}{}\n", "padding line\n".repeat(1000))
}

#[cfg(unix)]
const TASK_NOTE_HEAD: &str = "# Tasks\n- [ ] Buy milk\n";

#[cfg(unix)]
#[test]
#[ignore = "child of toggle_task_with_a_failed_write_keeps_the_note_and_the_index"]
fn child_toggle_task() {
	let Some(dir) = child_dir() else { return };
	let path = text_path(&dir, "tasks.md");
	let content = fs::read_to_string(&path).unwrap();
	let mut idx = VaultIndex::default();
	update_note_in_index_inner(&mut idx, path.clone(), &content, 0);
	let version = idx.version();

	let error = toggle_task_status_inner(&mut idx, &path, 2).err().expect("the write should fail");

	assert!(error.starts_with("write failed for "), "unexpected error: {error}");
	assert_eq!(idx.version(), version);
}

#[cfg(unix)]
#[test]
fn toggle_task_with_a_failed_write_keeps_the_note_and_the_index() {
	let tmp = TempDir::new().unwrap();
	let content = long_note(TASK_NOTE_HEAD);
	fs::write(tmp.path().join("tasks.md"), &content).unwrap();

	run_child("child_toggle_task", tmp.path(), true);

	assert_eq!(sorted_names(tmp.path()), vec!["tasks.md"]);
	assert_eq!(fs::read_to_string(tmp.path().join("tasks.md")).unwrap(), content);
}

#[cfg(unix)]
#[test]
#[ignore = "child of type_rename_with_a_failed_write_keeps_the_note_and_the_index"]
fn child_type_rename() {
	let Some(dir) = child_dir() else { return };
	let path = text_path(&dir, "member.md");
	let content = fs::read_to_string(&path).unwrap();
	let mut idx = VaultIndex::default();
	update_note_in_index_inner(&mut idx, path.clone(), &content, 0);

	let (updated, last) = propagate_type_rename_inner(&mut idx, "Project", "Initiative");

	assert_eq!(updated, 0);
	assert!(last.is_none());
	assert_eq!(idx.entries()[&path].is_a.as_deref(), Some("Project"));
}

#[cfg(unix)]
#[test]
fn type_rename_with_a_failed_write_keeps_the_note_and_the_index() {
	let tmp = TempDir::new().unwrap();
	let content = long_note("---\n_type: Project\n---\n\n");
	fs::write(tmp.path().join("member.md"), &content).unwrap();

	run_child("child_type_rename", tmp.path(), true);

	assert_eq!(sorted_names(tmp.path()), vec!["member.md"]);
	assert_eq!(fs::read_to_string(tmp.path().join("member.md")).unwrap(), content);
}

#[cfg(unix)]
#[test]
#[ignore = "child of write_mod_data_with_a_failed_write_keeps_the_saved_data"]
fn child_write_mod_data() {
	let Some(dir) = child_dir() else { return };

	let result = write_mod_data(dir.to_string_lossy().to_string(), "habits".to_string(), "x".repeat(OVER_LIMIT));

	assert_write_error(result);
}

#[cfg(unix)]
#[test]
fn write_mod_data_with_a_failed_write_keeps_the_saved_data() {
	let tmp = TempDir::new().unwrap();
	let dir = tmp.path().join(".kokobrain/mods/habits");
	fs::create_dir_all(&dir).unwrap();
	fs::write(dir.join("data.json"), "{\"saved\":true}").unwrap();

	run_child("child_write_mod_data", tmp.path(), true);

	assert_eq!(sorted_names(&dir), vec!["data.json"]);
	assert_eq!(fs::read_to_string(dir.join("data.json")).unwrap(), "{\"saved\":true}");
}
