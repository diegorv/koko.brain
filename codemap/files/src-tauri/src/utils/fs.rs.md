# file card src-tauri/src/utils/fs.rs
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src-tauri/src/utils/fs.rs ' codemap/files
file src-tauri/src/utils/fs.rs rust L351 module src-tauri/src/utils in8 t2 t:inline
## imported-by
imp src-tauri/src/commands/db.rs:2 -> src-tauri/src/utils/fs.rs self
imp src-tauri/src/commands/files.rs:1 -> src-tauri/src/utils/fs.rs self
imp src-tauri/src/commands/search_index.rs:6 -> src-tauri/src/utils/fs.rs self
imp src-tauri/src/commands/semantic.rs:16 -> src-tauri/src/utils/fs.rs self
imp src-tauri/src/commands/vault.rs:2 -> src-tauri/src/utils/fs.rs self
imp src-tauri/src/quick_capture/commands.rs:211 -> src-tauri/src/utils/fs.rs validate_vault_path
imp src-tauri/src/vault/entry.rs:12 -> src-tauri/src/utils/fs.rs is_view_filename
imp src-tauri/src/vault/index.rs:13 -> src-tauri/src/utils/fs.rs is_view_filename
## reach
in2 src-tauri/src/utils/fs.rs 5 files in 2 modules: src-tauri/src/vault(4) src-tauri/src(1)
out2 src-tauri/src/utils/fs.rs 0 files in 0 modules: -
## tests
test src-tauri/tests/utils_fs_test.rs imports src-tauri/src/utils/fs.rs
test src-tauri/tests/vault_watcher_test.rs imports src-tauri/src/utils/fs.rs
## symbols
sym src-tauri/src/utils/fs.rs:16 fn write_atomic(path: &str, content: &str) -> Result<(), String> L21 | Writes `content` to `path` atomically: the bytes go to a temp file in the same directory (same filesystem, so the rename is atomic), then the temp file is rena…
by src-tauri/src/utils/fs.rs:write_atomic <- src-tauri/src/commands/vault.rs:425 in propagate_type_rename_inner lexical +5
sym src-tauri/src/utils/fs.rs:62 fn validate_vault_path(vault_path: &str) -> Result<PathBuf, String> L9 | Validates and canonicalizes a vault path.
by src-tauri/src/utils/fs.rs:validate_vault_path <- src-tauri/src/commands/db.rs:9 in open_vault_db lexical
by src-tauri/src/utils/fs.rs:validate_vault_path <- src-tauri/src/commands/files.rs:31 in read_files_batch lexical
by src-tauri/src/utils/fs.rs:validate_vault_path <- src-tauri/src/commands/search_index.rs:59 in build_search_index_inner lexical
by src-tauri/src/utils/fs.rs:validate_vault_path <- src-tauri/src/commands/vault.rs:133 in scan_vault_inner lexical +6
by src-tauri/src/utils/fs.rs:validate_vault_path <- src-tauri/src/quick_capture/commands.rs:211 in import_staged_shot_in lexical
sym src-tauri/src/utils/fs.rs:73 type MarkdownEntry L1 | A collected markdown file entry: (relative_path, absolute_path).
sym src-tauri/src/utils/fs.rs:77 type MarkdownEntryWithMtime L1 | A collected markdown file entry with modification time: (relative_path, absolute_path, mtime_secs).
sym src-tauri/src/utils/fs.rs:85 type MarkdownEntryWithMetadata L1 | A collected markdown file entry with full metadata: `(relative_path, absolute_path, mtime_secs, ctime_secs, size_bytes)`.
sym src-tauri/src/utils/fs.rs:92 fn collect_markdown_paths(vault_root: &Path, excluded_folders: &[&str],) -> Result<Vec<MarkdownEntry>, String> L8 | Recursively collects the VaultIndex's file paths from a vault directory.
sym src-tauri/src/utils/fs.rs:107 fn collect_markdown_paths_with_mtime(vault_root: &Path, excluded_folders: &[&str],) -> Result<Vec<MarkdownEntryWithMtime>, String> L8 | The search walk: collects only the files `is_search_indexed_filename` accepts (`.md` / `.markdown`, no `.view`), with the modification times from the metadata …
by src-tauri/src/utils/fs.rs:collect_markdown_paths_with_mtime <- src-tauri/src/commands/search_index.rs:62 in build_search_index_inner lexical
by src-tauri/src/utils/fs.rs:collect_markdown_paths_with_mtime <- src-tauri/src/commands/semantic.rs:525 in build_semantic_index_inner lexical
sym src-tauri/src/utils/fs.rs:121 fn collect_markdown_paths_with_metadata(vault_root: &Path, excluded_folders: &[&str],) -> Result<Vec<MarkdownEntryWithMetadata>, String> L8 | Like `collect_markdown_paths` (the same file set, `.view` included) but also captures mtime, ctime and size.
by src-tauri/src/utils/fs.rs:collect_markdown_paths_with_metadata <- src-tauri/src/commands/vault.rs:230 in collect_v2_entries lexical +1
sym src-tauri/src/utils/fs.rs:143 fn is_markdown_filename(file_name: &str) -> bool L4 | Returns true when `file_name` ends with `.md`, `.markdown` or `.view`, case-INSENSITIVELY: a file that belongs in the VaultIndex.
by src-tauri/src/utils/fs.rs:is_markdown_filename <- src-tauri/src/commands/vault.rs:330 in update_note_in_index_inner lexical +1
sym src-tauri/src/utils/fs.rs:149 fn is_view_filename(file_name: &str) -> bool L3 | Returns true when the filename has a `.view` extension (case-insensitive).
by src-tauri/src/utils/fs.rs:is_view_filename <- src-tauri/src/commands/vault.rs:1335 in rename_note_inner lexical +2
by src-tauri/src/utils/fs.rs:is_view_filename <- src-tauri/src/vault/entry.rs:246 in NoteEntry::from_content_full lexical
by src-tauri/src/utils/fs.rs:is_view_filename <- src-tauri/src/vault/index.rs:100 in is_link_target lexical
sym src-tauri/src/utils/fs.rs:155 fn is_search_indexed_filename(file_name: &str) -> bool L3 | True for a file that gets FTS5 rows and embeddings.
by src-tauri/src/utils/fs.rs:is_search_indexed_filename <- src-tauri/src/commands/search_index.rs:282 in rename_in_search_index_inner lexical
by src-tauri/src/utils/fs.rs:is_search_indexed_filename <- src-tauri/src/commands/vault.rs:778 in confined_note_path lexical
## locals
local src-tauri/src/utils/fs.rs:43 fn keep_created_time(target: &str, tmp: &str) L10
local src-tauri/src/utils/fs.rs:159 fn walk_dir(dir: &Path, vault_root: &Path, entries: &mut Vec<MarkdownEntry>, excluded_folders: &[&str], depth: usize,) -> Result<(… L53
local src-tauri/src/utils/fs.rs:213 fn walk_dir_with_mtime(dir: &Path, vault_root: &Path, entries: &mut Vec<MarkdownEntryWithMtime>, excluded_folders: &[&str], depth: usize,) ->… L55
local src-tauri/src/utils/fs.rs:269 fn walk_dir_with_metadata(dir: &Path, vault_root: &Path, entries: &mut Vec<MarkdownEntryWithMetadata>, excluded_folders: &[&str], depth: usize,)… L62
## calls
call src-tauri/src/utils/fs.rs:31 in write_atomic -> src-tauri/src/utils/fs.rs:keep_created_time call
call src-tauri/src/utils/fs.rs:97 in collect_markdown_paths -> src-tauri/src/utils/fs.rs:walk_dir call
call src-tauri/src/utils/fs.rs:112 in collect_markdown_paths_with_mtime -> src-tauri/src/utils/fs.rs:walk_dir_with_mtime call
call src-tauri/src/utils/fs.rs:126 in collect_markdown_paths_with_metadata -> src-tauri/src/utils/fs.rs:walk_dir_with_metadata call
call src-tauri/src/utils/fs.rs:156 in is_search_indexed_filename -> src-tauri/src/utils/fs.rs:is_markdown_filename call
call src-tauri/src/utils/fs.rs:156 in is_search_indexed_filename -> src-tauri/src/utils/fs.rs:is_view_filename call
call src-tauri/src/utils/fs.rs:200 in walk_dir -> src-tauri/src/utils/fs.rs:walk_dir call
call src-tauri/src/utils/fs.rs:201 in walk_dir -> src-tauri/src/utils/fs.rs:is_markdown_filename call
call src-tauri/src/utils/fs.rs:250 in walk_dir_with_mtime -> src-tauri/src/utils/fs.rs:walk_dir_with_mtime call
call src-tauri/src/utils/fs.rs:251 in walk_dir_with_mtime -> src-tauri/src/utils/fs.rs:is_search_indexed_filename call
call src-tauri/src/utils/fs.rs:306 in walk_dir_with_metadata -> src-tauri/src/utils/fs.rs:walk_dir_with_metadata call
call src-tauri/src/utils/fs.rs:307 in walk_dir_with_metadata -> src-tauri/src/utils/fs.rs:is_markdown_filename call
## effects
fx src-tauri/src/utils/fs.rs:27 rust-fs.write in write_atomic
fx src-tauri/src/utils/fs.rs:28 rust-fs.remove_file in write_atomic
fx src-tauri/src/utils/fs.rs:32 rust-fs.rename in write_atomic
fx src-tauri/src/utils/fs.rs:33 rust-fs.remove_file in write_atomic
