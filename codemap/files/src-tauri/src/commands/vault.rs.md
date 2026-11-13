# file card src-tauri/src/commands/vault.rs
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src-tauri/src/commands/vault.rs ' codemap/files
sections: imports, imported-by, reach, tests, symbols, locals, calls, ipc-in, effects
file src-tauri/src/commands/vault.rs rust L1843 module src-tauri/src/commands in1 t10
## imports
imp src-tauri/src/commands/vault.rs:1 -> src-tauri/src/events.rs VAULT_INDEX_UPDATED_EVENT
imp src-tauri/src/commands/vault.rs:2 -> src-tauri/src/utils/fs.rs self
imp src-tauri/src/commands/vault.rs:3 -> src-tauri/src/utils/logger.rs debug_log,is_debug_enabled
imp src-tauri/src/commands/vault.rs:4 -> src-tauri/src/vault/entry.rs NoteEntry,NoteRecord,OutgoingLink,OutgoingUnlinkedMention,RelationshipBacklink
imp src-tauri/src/commands/vault.rs:5 -> src-tauri/src/vault/index.rs match_unlinked_mentions,UpdateResult,VaultIndex
imp src-tauri/src/commands/vault.rs:6 -> src-tauri/src/vault/parsing.rs parse_task_line,rewrite_type_in_frontmatter,set_task_status_in_content,set_task_text_in_content
imp src-tauri/src/commands/vault.rs:9 -> src-tauri/src/vault/task.rs FileTaskGroup,TagAggregate,TaskStatus,TaskTextWriteResult,ToggleTaskResult
imp src-tauri/src/commands/vault.rs:10 -> src-tauri/src/vault/task_lines.rs apply_task_line_edits,TaskLineEditOutcome,TaskLineEdits,TaskLinesOutcome,TaskLinesWriteResult
imp src-tauri/src/commands/vault.rs:13 -> src-tauri/src/vault/mod.rs VaultIndexState
imp src-tauri/src/commands/vault.rs:1551 -> src-tauri/src/vault/index_cache.rs self
imp src-tauri/src/commands/vault.rs:1768 -> src-tauri/src/vault/index_cache.rs self
## imported-by
imp src-tauri/src/lib.rs:339 -> src-tauri/src/commands/vault.rs scan_vault
imp src-tauri/src/lib.rs:340 -> src-tauri/src/commands/vault.rs scan_vault_v2
imp src-tauri/src/lib.rs:341 -> src-tauri/src/commands/vault.rs scan_vault_v2_cached
imp src-tauri/src/lib.rs:342 -> src-tauri/src/commands/vault.rs save_vault_cache
imp src-tauri/src/lib.rs:343 -> src-tauri/src/commands/vault.rs get_backlinks_v2
imp src-tauri/src/lib.rs:344 -> src-tauri/src/commands/vault.rs get_relationship_backlinks_v2
imp src-tauri/src/lib.rs:345 -> src-tauri/src/commands/vault.rs get_outgoing_links_v2
imp src-tauri/src/lib.rs:346 -> src-tauri/src/commands/vault.rs get_outgoing_unlinked_mentions_v2
imp src-tauri/src/lib.rs:347 -> src-tauri/src/commands/vault.rs get_all_vault_entries_v2
imp src-tauri/src/lib.rs:348 -> src-tauri/src/commands/vault.rs get_unlinked_mentions_v2
imp src-tauri/src/lib.rs:349 -> src-tauri/src/commands/vault.rs update_note_in_index
imp src-tauri/src/lib.rs:350 -> src-tauri/src/commands/vault.rs propagate_type_rename
imp src-tauri/src/lib.rs:351 -> src-tauri/src/commands/vault.rs get_all_tags_v2
imp src-tauri/src/lib.rs:352 -> src-tauri/src/commands/vault.rs get_all_tasks_v2
imp src-tauri/src/lib.rs:353 -> src-tauri/src/commands/vault.rs toggle_task_status
imp src-tauri/src/lib.rs:354 -> src-tauri/src/commands/vault.rs write_task_lines
imp src-tauri/src/lib.rs:355 -> src-tauri/src/commands/vault.rs write_task_text
imp src-tauri/src/lib.rs:356 -> src-tauri/src/commands/vault.rs remove_note_from_index
imp src-tauri/src/lib.rs:357 -> src-tauri/src/commands/vault.rs rename_note
imp src-tauri/src/lib.rs:358 -> src-tauri/src/commands/vault.rs get_all_property_records
imp src-tauri/src/lib.rs:359 -> src-tauri/src/commands/vault.rs get_index_delta
imp src-tauri/src/lib.rs:360 -> src-tauri/src/commands/vault.rs create_note
imp src-tauri/src/lib.rs:361 -> src-tauri/src/commands/vault.rs create_folder
imp src-tauri/src/lib.rs:362 -> src-tauri/src/commands/vault.rs write_mod_data
imp src-tauri/src/lib.rs:363 -> src-tauri/src/commands/vault.rs read_mod_data
## reach
in2 src-tauri/src/commands/vault.rs 1 files in 1 modules: src-tauri/src(1)
out2 src-tauri/src/commands/vault.rs 1 files in 1 modules: src-tauri/src/vault(1)
## tests
test src-tauri/tests/commands/vault_test.rs imports src-tauri/src/commands/vault.rs
test src-tauri/tests/ipc_contracts_test.rs imports src-tauri/src/commands/vault.rs
test src-tauri/tests/utils_fs_test.rs imports src-tauri/src/commands/vault.rs
test src-tauri/tests/vault_file_ops_test.rs imports src-tauri/src/commands/vault.rs
test src-tauri/tests/vault_natural_sort_parity_test.rs imports src-tauri/src/commands/vault.rs
test src-tauri/tests/vault_task_lines_test.rs imports src-tauri/src/commands/vault.rs
test src-tauri/tests/vault_task_test.rs imports src-tauri/src/commands/vault.rs
test src-tauri/tests/vault_task_text_test.rs imports src-tauri/src/commands/vault.rs
test src-tauri/tests/vault_type_rename_test.rs imports src-tauri/src/commands/vault.rs
test src-tauri/tests/vault_watcher_test.rs imports src-tauri/src/commands/vault.rs
## symbols
sym src-tauri/src/commands/vault.rs:89 struct FileNode L20 dto:FileNode | A single entry (file or folder) in the vault's file tree.
sym src-tauri/src/commands/vault.rs:120 cmd scan_vault(path: String, sort_by: String) -> Result<Vec<FileNode>, String> L8 | Recursively scans a vault directory and returns the full file tree with metadata.
by src-tauri/src/commands/vault.rs:scan_vault <- src-tauri/src/lib.rs:339 in run import
sym src-tauri/src/commands/vault.rs:130 fn scan_vault_inner(path: String, sort_by: String) -> Result<Vec<FileNode>, String> L8 | Synchronous implementation of `scan_vault`, exposed for tests.
sym src-tauri/src/commands/vault.rs:223 fn collect_v2_entries(path: &str) -> Result<Vec<NoteEntry>, String> L45 | Walks a vault and builds a `Vec<NoteEntry>` from every markdown file under it.
sym src-tauri/src/commands/vault.rs:324 fn update_note_in_index_inner(idx: &mut VaultIndex, path: String, content: &str, mtime: i64,) -> UpdateResult L21 | Pure-logic implementation behind the `update_note_in_index` Tauri command.
sym src-tauri/src/commands/vault.rs:358 cmd update_note_in_index(app: tauri::AppHandle, state: tauri::State<'_, VaultIndexState>, path: String, content: String,) -> Result<UpdateResul… L27 | Tauri command: updates a single note's metadata in the managed `VaultIndex` and emits `vault-index-updated` with the resulting `UpdateResult` payload.
by src-tauri/src/commands/vault.rs:update_note_in_index <- src-tauri/src/lib.rs:349 in run import
sym src-tauri/src/commands/vault.rs:397 fn propagate_type_rename_inner(idx: &mut VaultIndex, old_type: &str, new_type: &str,) -> (usize, Option<UpdateResult>) L45 | Inner half of `propagate_type_rename`: rewrites `_type: old` -> `_type: new` in every member note (entries whose `is_a == old_type`) and updates the index entr…
sym src-tauri/src/commands/vault.rs:451 cmd propagate_type_rename(app: tauri::AppHandle, state: tauri::State<'_, VaultIndexState>, old_type: String, new_type: String,) -> Result<usize,… L26 | Tauri command: propagates a type rename to all member notes — rewrites their `_type:` frontmatter from `old_type` to `new_type` in one pass and reindexes each …
by src-tauri/src/commands/vault.rs:propagate_type_rename <- src-tauri/src/lib.rs:350 in run import
sym src-tauri/src/commands/vault.rs:486 cmd get_backlinks_v2(path: String, state: tauri::State<'_, VaultIndexState>,) -> Result<Vec<NoteEntry>, String> L10 | Returns every `NoteEntry` whose outgoing links resolve to `path`, sorted by title (case-insensitive) for stable UI ordering.
by src-tauri/src/commands/vault.rs:get_backlinks_v2 <- src-tauri/src/lib.rs:343 in run import
sym src-tauri/src/commands/vault.rs:500 cmd get_relationship_backlinks_v2(path: String, state: tauri::State<'_, VaultIndexState>,) -> Result<Vec<RelationshipBacklink>, String> L10 | Returns notes that reference `path` via frontmatter relationship fields (`belongs_to`, `related_to`, or custom wikilink-bearing fields).
by src-tauri/src/commands/vault.rs:get_relationship_backlinks_v2 <- src-tauri/src/lib.rs:344 in run import
sym src-tauri/src/commands/vault.rs:519 cmd get_outgoing_links_v2(path: String, state: tauri::State<'_, VaultIndexState>,) -> Result<Vec<OutgoingLink>, String> L10 | Returns the outgoing wikilinks of `path`, each resolved against the managed `VaultIndex` resolution caches (so callers know which links are broken vs which tar…
by src-tauri/src/commands/vault.rs:get_outgoing_links_v2 <- src-tauri/src/lib.rs:345 in run import
sym src-tauri/src/commands/vault.rs:541 cmd get_outgoing_unlinked_mentions_v2(path: String, content: String, state: tauri::State<'_, VaultIndexState>,) -> Result<Vec<OutgoingUnlinkedMention>, Stri… L11 | Returns notes whose names appear as plain text in `content` but are NOT already linked from `path` via wikilinks.
by src-tauri/src/commands/vault.rs:get_outgoing_unlinked_mentions_v2 <- src-tauri/src/lib.rs:346 in run import
sym src-tauri/src/commands/vault.rs:563 cmd get_all_vault_entries_v2(state: tauri::State<'_, VaultIndexState>,) -> Result<Vec<NoteEntry>, String> L11 | Returns every `NoteEntry` in the vault index, sorted by path.
by src-tauri/src/commands/vault.rs:get_all_vault_entries_v2 <- src-tauri/src/lib.rs:347 in run import
sym src-tauri/src/commands/vault.rs:599 cmd get_unlinked_mentions_v2(path: String, state: tauri::State<'_, VaultIndexState>,) -> Result<Vec<NoteEntry>, String> L33 | Returns notes whose body mentions `path`'s note name in plain text (after frontmatter / fenced-code stripping and Unicode word-boundary checks) but do NOT have…
by src-tauri/src/commands/vault.rs:get_unlinked_mentions_v2 <- src-tauri/src/lib.rs:348 in run import
sym src-tauri/src/commands/vault.rs:638 cmd get_all_tags_v2(state: tauri::State<'_, VaultIndexState>,) -> Result<Vec<TagAggregate>, String> L9 | Returns the flat list of tag aggregates (one per distinct tag), sorted alphabetically.
by src-tauri/src/commands/vault.rs:get_all_tags_v2 <- src-tauri/src/lib.rs:351 in run import
sym src-tauri/src/commands/vault.rs:652 cmd get_all_tasks_v2(state: tauri::State<'_, VaultIndexState>,) -> Result<Vec<FileTaskGroup>, String> L9 | Returns every file's tasks grouped by file, sorted by `modifiedAt` descending.
by src-tauri/src/commands/vault.rs:get_all_tasks_v2 <- src-tauri/src/lib.rs:352 in run import
sym src-tauri/src/commands/vault.rs:672 fn toggle_task_status_inner(idx: &mut VaultIndex, path: &str, line_number: usize, expected_text: &str, expected_status: TaskStatus, target: TaskSt… L41 | Pure-logic implementation behind `toggle_task_status`.
sym src-tauri/src/commands/vault.rs:733 cmd toggle_task_status(app: tauri::AppHandle, state: tauri::State<'_, VaultIndexState>, path: String, line_number: usize, expected_text: Stri… L36 | Tauri command: toggles a task's checkbox on disk + in the managed `VaultIndex`.
by src-tauri/src/commands/vault.rs:toggle_task_status <- src-tauri/src/lib.rs:353 in run import
sym src-tauri/src/commands/vault.rs:800 fn write_task_lines_inner(idx: &mut VaultIndex, vault_root: &str, rel_path: &str, edits: &TaskLineEdits,) -> Result<TaskLinesWriteResult, String> L50 | Pure-logic implementation behind `write_task_lines`: checks the root, confines the path, applies `edits` through `apply_task_line_edits`, and writes and indexe…
sym src-tauri/src/commands/vault.rs:858 cmd write_task_lines(app: tauri::AppHandle, state: tauri::State<'_, VaultIndexState>, vault_root: String, rel_path: String, edits: TaskLine… L24 | Tauri command: replaces, inserts and removes task lines in the note at `rel_path` under `vault_root`, all or nothing, located by `🆔 td-…` anchor plus the expe…
by src-tauri/src/commands/vault.rs:write_task_lines <- src-tauri/src/lib.rs:354 in run import
sym src-tauri/src/commands/vault.rs:892 fn write_task_text_inner(idx: &mut VaultIndex, vault_root: &str, rel_path: &str, line_number: usize, expected_text: &str, expected_status: Task… L53 | Pure-logic implementation behind `write_task_text`.
sym src-tauri/src/commands/vault.rs:956 cmd write_task_text(app: tauri::AppHandle, state: tauri::State<'_, VaultIndexState>, vault_root: String, rel_path: String, line_number: us… L35 | Tauri command: rewrites the text of the task at `line_number` of the note at `rel_path` under the open vault `vault_root`, guarded by the expected text and sta…
by src-tauri/src/commands/vault.rs:write_task_text <- src-tauri/src/lib.rs:355 in run import
sym src-tauri/src/commands/vault.rs:1000 fn project_note_record(entry: &NoteEntry) -> NoteRecord L51 | Projects a `NoteEntry` into the `NoteRecord` shape consumed by the TS `collection.service` / kb-api.
sym src-tauri/src/commands/vault.rs:1056 cmd get_all_property_records(state: tauri::State<'_, VaultIndexState>,) -> Result<Vec<NoteRecord>, String> L12 | Returns every entry projected as a `NoteRecord` — the shape the TS `collection.service::buildPropertyIndex` consumes.
by src-tauri/src/commands/vault.rs:get_all_property_records <- src-tauri/src/lib.rs:358 in run import
sym src-tauri/src/commands/vault.rs:1076 struct IndexDelta L6 dto:IndexDelta | The index state of a set of paths, in the two shapes the frontend snapshots hold: the `get_all_vault_entries_v2` entry and the `get_all_property_records` recor…
sym src-tauri/src/commands/vault.rs:1085 fn index_delta_inner(idx: &VaultIndex, paths: &[String]) -> IndexDelta L9 | Builds the [`IndexDelta`] for `paths` from `idx`.
sym src-tauri/src/commands/vault.rs:1099 cmd get_index_delta(state: tauri::State<'_, VaultIndexState>, paths: Vec<String>,) -> Result<IndexDelta, String> L10 | Returns the entries and property records of `paths` only, so the `vault-index-updated` listener can patch its snapshots for the paths an event reported instead…
by src-tauri/src/commands/vault.rs:get_index_delta <- src-tauri/src/lib.rs:359 in run import
sym src-tauri/src/commands/vault.rs:1119 fn ensure_safe_write_path(path: &str) -> Result<(), String> L13 | Rejects a write target that could escape the vault before any disk write.
sym src-tauri/src/commands/vault.rs:1145 cmd create_note(app: tauri::AppHandle, state: tauri::State<'_, VaultIndexState>, path: String, content: String,) -> Result<UpdateResul… L27 | Atomically creates a new note at `path` with the given `content`.
by src-tauri/src/commands/vault.rs:create_note <- src-tauri/src/lib.rs:360 in run import
sym src-tauri/src/commands/vault.rs:1179 cmd create_folder(path: String) -> Result<(), String> L5 | Creates a directory (recursive — equivalent to TS `mkdir(path, { recursive: true })`).
by src-tauri/src/commands/vault.rs:create_folder <- src-tauri/src/lib.rs:361 in run import
sym src-tauri/src/commands/vault.rs:1206 cmd write_mod_data(vault_path: String, mod_id: String, content: String) -> Result<(), String> L8 | Writes a mod's data through `write_atomic`, creating missing folders: a crash mid-write leaves the old file, never a truncated one.
by src-tauri/src/commands/vault.rs:write_mod_data <- src-tauri/src/lib.rs:362 in run import
sym src-tauri/src/commands/vault.rs:1222 cmd read_mod_data(vault_path: String, mod_id: String) -> Result<Option<Vec<u8>>, String> L9 | Reads a mod's data as raw bytes, `None` only when the file is not there.
by src-tauri/src/commands/vault.rs:read_mod_data <- src-tauri/src/lib.rs:363 in run import
sym src-tauri/src/commands/vault.rs:1242 cmd remove_note_from_index(app: tauri::AppHandle, state: tauri::State<'_, VaultIndexState>, path: String,) -> Result<UpdateResult, String> L25 | Tauri command: removes a single note from the managed `VaultIndex`.
by src-tauri/src/commands/vault.rs:remove_note_from_index <- src-tauri/src/lib.rs:356 in run import
sym src-tauri/src/commands/vault.rs:1311 fn rename_note_inner(idx: &mut VaultIndex, from: &str, to: &str) -> Option<UpdateResult> L38 | Re-keys the managed `VaultIndex` after a rename or move of `from` to `to`.
sym src-tauri/src/commands/vault.rs:1392 cmd rename_note(app: tauri::AppHandle, state: tauri::State<'_, VaultIndexState>, from: String, to: String,) -> Result<Option<UpdateRes… L23 | Tauri command: re-keys the managed `VaultIndex` for a renamed or moved path.
by src-tauri/src/commands/vault.rs:rename_note <- src-tauri/src/lib.rs:357 in run import
sym src-tauri/src/commands/vault.rs:1441 cmd scan_vault_v2(app: tauri::AppHandle, path: String,) -> Result<Vec<NoteEntry>, String> L14 | Tauri command: scans a vault and rebuilds the managed `VaultIndex`.
by src-tauri/src/commands/vault.rs:scan_vault_v2 <- src-tauri/src/lib.rs:340 in run import
sym src-tauri/src/commands/vault.rs:1463 fn scan_vault_v2_inner(path: &str, state: &VaultIndexState,) -> Result<(Vec<NoteEntry>, u64), String> L26 | Synchronous implementation of `scan_vault_v2`: collects every markdown entry and rebuilds the managed `VaultIndex`.
sym src-tauri/src/commands/vault.rs:1495 struct CachedScanResult L7 dto:CachedScanResult | Result payload for `scan_vault_v2_cached`, reporting how the index was loaded so the frontend can log telemetry.
sym src-tauri/src/commands/vault.rs:1508 enum ScanSource L8 dto:ScanSource | How `scan_vault_v2_cached` loaded the index.
sym src-tauri/src/commands/vault.rs:1528 cmd scan_vault_v2_cached(app: tauri::AppHandle, path: String,) -> Result<CachedScanResult, String> L14 | Loads the vault index from the on-disk cache if available, falling back to a full `scan_vault_v2` on cache miss or corruption.
by src-tauri/src/commands/vault.rs:scan_vault_v2_cached <- src-tauri/src/lib.rs:341 in run import
sym src-tauri/src/commands/vault.rs:1547 fn scan_vault_v2_cached_inner(path: &str, state: &VaultIndexState,) -> Result<(CachedScanResult, u64), String> L196 | Synchronous implementation of `scan_vault_v2_cached`.
sym src-tauri/src/commands/vault.rs:1764 cmd save_vault_cache(path: String, state: tauri::State<'_, VaultIndexState>,) -> Result<(), String> L19 | Saves the current in-memory VaultIndex entries to the disk cache.
by src-tauri/src/commands/vault.rs:save_vault_cache <- src-tauri/src/lib.rs:342 in run import
sym src-tauri/src/commands/vault.rs:1809 fn natural_cmp(a: &str, b: &str) -> Ordering L27 | Case-insensitive natural order: runs of ASCII digits compare by numeric value, so "Note 2" sorts before "Note 10".
## locals
local src-tauri/src/commands/vault.rs:39 fn CmdTrace::new(name: &'static str) -> Self L7
local src-tauri/src/commands/vault.rs:49 fn CmdTrace::drop(&mut self) L6
local src-tauri/src/commands/vault.rs:64 fn log_vault_shape_once(path: &str, idx: &VaultIndex) L19
local src-tauri/src/commands/vault.rs:139 fn scan_dir(dir: &Path, sort_by: &str, depth: usize) -> Result<Vec<FileNode>, String> L66
local src-tauri/src/commands/vault.rs:209 fn canonical_vault_root(path: &str) -> Result<String, String> L3
local src-tauri/src/commands/vault.rs:274 fn read_file_mtime_secs(path: &str) -> Option<i64> L9
local src-tauri/src/commands/vault.rs:288 fn read_file_metadata(path: &str) -> (i64, i64, u64) L20
local src-tauri/src/commands/vault.rs:774 fn confined_note_path(root: &Path, rel_path: &str) -> Result<std::path::PathBuf, String> L20
local src-tauri/src/commands/vault.rs:1190 fn mod_data_path(vault_path: &str, mod_id: &str) -> Result<std::path::PathBuf, String> L11
local src-tauri/src/commands/vault.rs:1356 fn reparse_across_view_boundary(old_entry: NoteEntry, new_path: String) -> NoteEntry L25
local src-tauri/src/commands/vault.rs:1745 fn emit_index_updated(app: &tauri::AppHandle, version: u64) L14
local src-tauri/src/commands/vault.rs:1784 fn sort_nodes(nodes: &mut [FileNode], sort_by: &str) L20
local src-tauri/src/commands/vault.rs:1837 fn take_digits(it: &mut std::iter::Peekable<std::str::Chars<'_>>) -> String L7
## calls
more calls codemap/files/src-tauri/src/commands/vault.rs.calls.md
## ipc-in
ipc-call src/lib/core/filesystem/fs.service.ts:184 in addScannedToTree -> ipc:scan_vault -> src-tauri/src/commands/vault.rs:120
ipc-call src/lib/core/filesystem/fs.service.ts:96 in loadDirectoryTree -> ipc:scan_vault -> src-tauri/src/commands/vault.rs:120
ipc-call src/lib/core/filesystem/fs.watcher.ts:223 in handleChangedPaths -> ipc:scan_vault -> src-tauri/src/commands/vault.rs:120
ipc-call src/lib/core/filesystem/note-change.service.ts:240 in applyNoteChange -> ipc:update_note_in_index -> src-tauri/src/commands/vault.rs:358
ipc-call src/lib/features/type-definitions/type-definitions.service.ts:241 in renameType -> ipc:propagate_type_rename -> src-tauri/src/commands/vault.rs:451
ipc-call src/lib/core/filesystem/link-updater.service.ts:46 in updateLinksAfterRename -> ipc:get_backlinks_v2 -> src-tauri/src/commands/vault.rs:486
ipc-call src/lib/features/backlinks/backlinks.service.ts:153 in fetchBacklinksV2Inner -> ipc:get_backlinks_v2 -> src-tauri/src/commands/vault.rs:486
ipc-call src/lib/features/backlinks/backlinks.service.ts:179 in fetchRelationshipBacklinksInner -> ipc:get_relationship_backlinks_v2 -> src-tauri/src/commands/vault.rs:500
ipc-call src/lib/features/outgoing-links/outgoing-links.service.ts:74 in fetchOutgoingLinksV2Inner -> ipc:get_outgoing_links_v2 -> src-tauri/src/commands/vault.rs:519
ipc-call src/lib/features/outgoing-links/outgoing-links.service.ts:75 in fetchOutgoingLinksV2Inner -> ipc:get_outgoing_unlinked_mentions_v2 -> src-tauri/src/commands/vault.rs:541
ipc-call src/lib/app/lifecycle/app-lifecycle.service.ts:385 in initializeVault -> ipc:get_all_vault_entries_v2 -> src-tauri/src/commands/vault.rs:563
ipc-call src/lib/core/vault/vault-entries.service.ts:27 in vaultEntriesMemo -> ipc:get_all_vault_entries_v2 -> src-tauri/src/commands/vault.rs:563
ipc-call src/lib/features/file-icons/file-icons.service.ts:203 in buildFrontmatterIconIndex -> ipc:get_all_vault_entries_v2 -> src-tauri/src/commands/vault.rs:563
ipc-call src/lib/features/properties/lifecycle-filter.service.ts:8 in refreshArchivedPaths -> ipc:get_all_vault_entries_v2 -> src-tauri/src/commands/vault.rs:563
ipc-call src/lib/features/search/search.service.ts:192 in performSearch -> ipc:get_all_vault_entries_v2 -> src-tauri/src/commands/vault.rs:563
ipc-call src/lib/features/search/search.service.ts:25 in loadVaultContentMap -> ipc:get_all_vault_entries_v2 -> src-tauri/src/commands/vault.rs:563
ipc-call src/lib/features/search/search.service.ts:44 in loadVaultTagMap -> ipc:get_all_vault_entries_v2 -> src-tauri/src/commands/vault.rs:563
ipc-call src/lib/features/type-definitions/type-definitions.service.ts:29 in refreshTypeDefinitions -> ipc:get_all_vault_entries_v2 -> src-tauri/src/commands/vault.rs:563
ipc-call src/lib/plugins/graph-view/graph-view.service.ts:15 in buildGraph -> ipc:get_all_vault_entries_v2 -> src-tauri/src/commands/vault.rs:563
ipc-call src/lib/plugins/quick-capture/composer-editor-host.service.ts:41 in createComposerEditorHost -> ipc:get_all_vault_entries_v2 -> src-tauri/src/commands/vault.rs:563
ipc-call src/lib/features/backlinks/backlinks.service.ts:212 in computeUnlinkedMentionsForFileInner -> ipc:get_unlinked_mentions_v2 -> src-tauri/src/commands/vault.rs:599
ipc-call src/lib/app/editor-host.ts:102 in vaultTags -> ipc:get_all_tags_v2 -> src-tauri/src/commands/vault.rs:638
ipc-call src/lib/features/tags/tags.service.ts:30 in buildTagIndex -> ipc:get_all_tags_v2 -> src-tauri/src/commands/vault.rs:638
ipc-call src/lib/plugins/quick-capture/composer-editor-host.service.ts:30 in createComposerEditorHost -> ipc:get_all_tags_v2 -> src-tauri/src/commands/vault.rs:638
ipc-call src/lib/features/event-calendar/event-calendar.service.ts:119 in loadCalendarTasks -> ipc:get_all_tasks_v2 -> src-tauri/src/commands/vault.rs:652
ipc-call src/lib/features/todoist-sync/vault-scan.service.ts:57 in scanVault -> ipc:get_all_tasks_v2 -> src-tauri/src/commands/vault.rs:652
ipc-call src/lib/features/tasks/tasks.service.ts:296 in setTaskStatus -> ipc:toggle_task_status -> src-tauri/src/commands/vault.rs:733
ipc-call src/lib/features/todoist-sync/closed-note-writer.service.ts:43 in writeTaskLinesToClosedNote -> ipc:write_task_lines -> src-tauri/src/commands/vault.rs:858
ipc-call src/lib/features/todoist-sync/closed-note-writer.service.ts:46 in writeTaskLinesToClosedNote -> ipc:write_task_lines -> src-tauri/src/commands/vault.rs:858
ipc-call src/lib/features/tasks/tasks.service.ts:392 in updateTask -> ipc:write_task_text -> src-tauri/src/commands/vault.rs:956
ipc-call src/lib/features/collection/collection.service.ts:95 in buildPropertyIndex -> ipc:get_all_property_records -> src-tauri/src/commands/vault.rs:1056
ipc-call src/lib/features/todoist-sync/vault-scan.service.ts:57 in scanVault -> ipc:get_all_property_records -> src-tauri/src/commands/vault.rs:1056
ipc-call src/lib/app/tauri-listeners.service.ts:223 in registerVaultIndexUpdatedListener -> ipc:get_index_delta -> src-tauri/src/commands/vault.rs:1099
ipc-call src/lib/core/filesystem/fs.service.ts:208 in createFile -> ipc:create_note -> src-tauri/src/commands/vault.rs:1145
ipc-call src/lib/core/note-creator/note-creator.service.ts:104 in openOrCreateNote -> ipc:create_note -> src-tauri/src/commands/vault.rs:1145
ipc-call src/lib/features/todoist-sync/closed-note-writer.service.ts:76 in createNoteFile -> ipc:create_note -> src-tauri/src/commands/vault.rs:1145
ipc-call src/lib/plugins/mods/mod-vault.service.ts:136 in createModVault -> ipc:create_note -> src-tauri/src/commands/vault.rs:1145
ipc-call src/lib/core/filesystem/fs.service.ts:235 in createFolder -> ipc:create_folder -> src-tauri/src/commands/vault.rs:1179
ipc-call src/lib/core/note-creator/note-creator.service.ts:99 in openOrCreateNote -> ipc:create_folder -> src-tauri/src/commands/vault.rs:1179
ipc-call src/lib/features/rail-shell/new-note.service.ts:36 in createNoteHere -> ipc:create_folder -> src-tauri/src/commands/vault.rs:1179
ipc-call src/lib/features/todoist-sync/closed-note-writer.service.ts:75 in createNoteFile -> ipc:create_folder -> src-tauri/src/commands/vault.rs:1179
ipc-call src/lib/features/type-definitions/type-definitions.service.ts:134 in createTypedNote -> ipc:create_folder -> src-tauri/src/commands/vault.rs:1179
ipc-call src/lib/plugins/mods/mod-vault.service.ts:135 in createModVault -> ipc:create_folder -> src-tauri/src/commands/vault.rs:1179
ipc-call src/lib/plugins/templates/templates.service.ts:107 in ensureTemplatesFolder -> ipc:create_folder -> src-tauri/src/commands/vault.rs:1179
ipc-call src/lib/plugins/mods/mod-vault.service.ts:278 in createModData -> ipc:write_mod_data -> src-tauri/src/commands/vault.rs:1206
ipc-call src/lib/plugins/mods/mods-host.service.ts:983 in writePendingSettings -> ipc:write_mod_data -> src-tauri/src/commands/vault.rs:1206
ipc-call src/lib/plugins/mods/mod-vault.service.ts:246 in createModData -> ipc:read_mod_data -> src-tauri/src/commands/vault.rs:1222
ipc-call src/lib/plugins/mods/mods-host.service.ts:952 in readModData -> ipc:read_mod_data -> src-tauri/src/commands/vault.rs:1222
ipc-call src/lib/core/filesystem/note-change.service.ts:207 in applyNoteChange -> ipc:remove_note_from_index -> src-tauri/src/commands/vault.rs:1242
ipc-call src/lib/core/filesystem/path-change.service.ts:221 in applyPathChange -> ipc:rename_note -> src-tauri/src/commands/vault.rs:1392
ipc-call src/lib/features/backlinks/backlinks.service.ts:93 in runBuildIndex -> ipc:scan_vault_v2_cached -> src-tauri/src/commands/vault.rs:1528
ipc-call src/lib/app/lifecycle/app-lifecycle.service.ts:622 in teardownVault -> ipc:save_vault_cache -> src-tauri/src/commands/vault.rs:1764
## effects
ev src-tauri/src/commands/vault.rs:373 in update_note_in_index -> event:vault-index-updated -> src/lib/app/tauri-listeners.service.ts:291 in registerVaultIndexUpdatedListener
ev src-tauri/src/commands/vault.rs:465 in propagate_type_rename -> event:vault-index-updated -> src/lib/app/tauri-listeners.service.ts:291 in registerVaultIndexUpdatedListener
ev src-tauri/src/commands/vault.rs:757 in toggle_task_status -> event:vault-index-updated -> src/lib/app/tauri-listeners.service.ts:291 in registerVaultIndexUpdatedListener
ev src-tauri/src/commands/vault.rs:873 in write_task_lines -> event:vault-index-updated -> src/lib/app/tauri-listeners.service.ts:291 in registerVaultIndexUpdatedListener
ev src-tauri/src/commands/vault.rs:982 in write_task_text -> event:vault-index-updated -> src/lib/app/tauri-listeners.service.ts:291 in registerVaultIndexUpdatedListener
ev src-tauri/src/commands/vault.rs:1164 in create_note -> event:vault-index-updated -> src/lib/app/tauri-listeners.service.ts:291 in registerVaultIndexUpdatedListener
fx src-tauri/src/commands/vault.rs:1182 rust-fs.create_dir_all in create_folder
fx src-tauri/src/commands/vault.rs:1210 rust-fs.create_dir_all in write_mod_data
ev src-tauri/src/commands/vault.rs:1255 in remove_note_from_index -> event:vault-index-updated -> src/lib/app/tauri-listeners.service.ts:291 in registerVaultIndexUpdatedListener
ev src-tauri/src/commands/vault.rs:1406 in rename_note -> event:vault-index-updated -> src/lib/app/tauri-listeners.service.ts:291 in registerVaultIndexUpdatedListener
fx src-tauri/src/commands/vault.rs:1580 rust-fs.remove_file in scan_vault_v2_cached_inner
ev src-tauri/src/commands/vault.rs:1752 in emit_index_updated -> event:vault-index-updated -> src/lib/app/tauri-listeners.service.ts:291 in registerVaultIndexUpdatedListener
