# module card src-tauri/src/commands
cols: module <path> <layer> files <n> in-modules <n> out-modules <n> pub <public>/<exports> ipc <called>/<served> card ~<k>k · dep <from> -> <to> <file pairs> · in2/out2 <module> <n> modules: <module>(<via>) · entry <file> ext-in<n> <importers> · file … · sym … · grep: grep -rF -- '-> src-tauri/src/commands ' codemap/modules
sections: neighbors, entry files, files, public, effects, debt
module src-tauri/src/commands rust files 14 in-modules 1 out-modules 6 pub 71/113 ipc 0/66 card ~6.5k
## neighbors
dep src-tauri/src -> src-tauri/src/commands 13
dep src-tauri/src/commands -> src-tauri/src 4
dep src-tauri/src/commands -> src-tauri/src/db 10
dep src-tauri/src/commands -> src-tauri/src/search 4
dep src-tauri/src/commands -> src-tauri/src/semantic 11
dep src-tauri/src/commands -> src-tauri/src/utils 16
dep src-tauri/src/commands -> src-tauri/src/vault 8
in2 src-tauri/src/commands 0 modules: -
out2 src-tauri/src/commands 0 modules: -
## entry files
entry src-tauri/src/commands/app_exit.rs ext-in1 src-tauri/src/lib.rs
entry src-tauri/src/commands/db.rs ext-in1 src-tauri/src/lib.rs
entry src-tauri/src/commands/debug.rs ext-in1 src-tauri/src/lib.rs
entry src-tauri/src/commands/files.rs ext-in1 src-tauri/src/lib.rs
entry src-tauri/src/commands/fonts.rs ext-in1 src-tauri/src/lib.rs
entry src-tauri/src/commands/history.rs ext-in1 src-tauri/src/lib.rs
entry src-tauri/src/commands/search_index.rs ext-in1 src-tauri/src/lib.rs
entry src-tauri/src/commands/semantic.rs ext-in1 src-tauri/src/lib.rs
entry src-tauri/src/commands/sentry.rs ext-in1 src-tauri/src/lib.rs
entry src-tauri/src/commands/todoist.rs ext-in1 src-tauri/src/lib.rs
entry src-tauri/src/commands/update_channel.rs ext-in1 src-tauri/src/lib.rs
entry src-tauri/src/commands/vault.rs ext-in1 src-tauri/src/lib.rs
entry src-tauri/src/commands/watcher.rs ext-in1 src-tauri/src/lib.rs
## files
file src-tauri/src/commands/app_exit.rs rust L64 module src-tauri/src/commands in1 t1 | Quit goes through the frontend's `prepareForExit` (save dirty tabs, ask before discarding failed saves, drain pending writes, flush settings) before the proces…
file src-tauri/src/commands/db.rs rust L18 module src-tauri/src/commands in1 t1
file src-tauri/src/commands/debug.rs rust L54 module src-tauri/src/commands in1 t1 t:inline
file src-tauri/src/commands/files.rs rust L84 module src-tauri/src/commands in1 t1
file src-tauri/src/commands/fonts.rs rust L113 module src-tauri/src/commands in1 t0 t:inline
file src-tauri/src/commands/history.rs rust L168 module src-tauri/src/commands in1 t2
file src-tauri/src/commands/mod.rs rust L13 module src-tauri/src/commands in0 t0
file src-tauri/src/commands/search_index.rs rust L406 module src-tauri/src/commands in2 t3
file src-tauri/src/commands/semantic.rs rust L1735 module src-tauri/src/commands in2 t1 t:inline
file src-tauri/src/commands/sentry.rs rust L14 module src-tauri/src/commands in1 t0
file src-tauri/src/commands/todoist.rs rust L76 module src-tauri/src/commands in1 t1 | IPC over the Todoist sync state in `kokobrain.db`.
file src-tauri/src/commands/update_channel.rs rust L177 module src-tauri/src/commands in1 t1 t:inline | Channel-aware in-app updater commands.
file src-tauri/src/commands/vault.rs rust L1843 module src-tauri/src/commands in1 t10
file src-tauri/src/commands/watcher.rs rust L29 module src-tauri/src/commands in1 t0
## public
sym src-tauri/src/commands/app_exit.rs:16 const MAIN_WINDOW_LABEL L1 | Label of the main window, the one whose frontend runs `prepareForExit`.
sym src-tauri/src/commands/app_exit.rs:20 struct ExitFlushState L1 | Whether the frontend already ran `prepareForExit` for the exit under way.
sym src-tauri/src/commands/app_exit.rs:29 method ExitFlushState::is_flushed(&self) -> bool L3 | True once `mark_flushed` ran.
sym src-tauri/src/commands/app_exit.rs:36 enum ExitDecision L6 | What `RunEvent::ExitRequested` does.
sym src-tauri/src/commands/app_exit.rs:49 fn exit_decision(code: Option<i32>, flushed: bool, has_main_window: bool) -> ExitDecision L8 | Decides one `RunEvent::ExitRequested`.
sym src-tauri/src/commands/app_exit.rs:61 cmd confirm_exit(app: AppHandle, state: State<'_, ExitFlushState>) L4 | Called by the frontend once `prepareForExit` returned true: marks the flush done and exits with code 0.
sym src-tauri/src/commands/db.rs:7 cmd open_vault_db(vault_path: String) -> Result<(), String> L5 | Opens the database for a vault.
sym src-tauri/src/commands/db.rs:15 cmd close_vault_db() -> Result<(), String> L4 | Closes the database.
sym src-tauri/src/commands/debug.rs:12 cmd set_tauri_debug_mode(enabled: bool) -> Result<(), String> L7 | Enables or disables Rust-side debug logging to the frontend.
sym src-tauri/src/commands/debug.rs:23 cmd set_main_thread_heartbeat(app: tauri::AppHandle, enabled: bool) -> Result<(), String> L4 | Starts or stops the native main-thread heartbeat (`[MAIN-HB] stall Nms` lines through `debug_log`).
sym src-tauri/src/commands/debug.rs:30 cmd get_process_memory() -> Result<u64, String> L14 | Returns the current process's resident set size (RSS) in bytes.
sym src-tauri/src/commands/files.rs:24 cmd read_files_batch(vault_path: String, paths: Vec<String>,) -> Result<Vec<FileReadResult>, String> L61 | Reads the text content of multiple files in a single call.
sym src-tauri/src/commands/fonts.rs:6 cmd list_system_fonts() -> Result<Vec<String>, String> L70 | Returns a sorted list of all available font family names on the system.
sym src-tauri/src/commands/history.rs:61 cmd save_snapshot(file_path: String, content: String) -> Result<bool, String> L5 | Saves a snapshot of file content if its hash differs from the last snapshot.
sym src-tauri/src/commands/history.rs:92 cmd get_file_history(file_path: String) -> Result<Vec<SnapshotInfo>, String> L3 | Lists all snapshots for a file, newest first.
sym src-tauri/src/commands/history.rs:98 cmd get_snapshot_content(snapshot_id: i64) -> Result<String, String> L3 | Reads the full content of a specific snapshot.
sym src-tauri/src/commands/history.rs:105 cmd compute_diff(old_content: String, new_content: String) -> Result<Vec<DiffLine>, String> L41 | Computes a line-by-line diff between two strings.
sym src-tauri/src/commands/history.rs:153 cmd cleanup_history(retention_days: u32) -> Result<u32, String> L16 | Deletes old snapshots by retention policy. - Recent (within retention_days): keep all - Medium (retention_days..retention_days+30): keep 1 per day per file (la…
sym src-tauri/src/commands/search_index.rs:39 cmd build_search_index(vault_path: String) -> Result<IndexStats, String> L5 | Reconciles the FTS5 search index with what is on disk.
sym src-tauri/src/commands/search_index.rs:153 cmd search_fts(query: String, max_results: Option<usize>, fuzzy: Option<bool>,) -> Result<Vec<FtsSearchResult>, String> L17 | Searches the FTS5 index using BM25 ranking with optional fuzzy matching.
sym src-tauri/src/commands/search_index.rs:203 cmd update_search_index_file(file_path: String, content: String, vault_path: String,) -> Result<(), String> L11 | Updates the FTS5 index for a single file (called on save).
sym src-tauri/src/commands/search_index.rs:239 cmd remove_from_search_index(file_path: String) -> Result<(), String> L5 | Removes a file from the FTS5 index (called on file delete).
sym src-tauri/src/commands/search_index.rs:265 cmd rename_in_search_index(from: String, to: String) -> Result<(), String> L5 | Moves the text and semantic search rows of a renamed or moved note, or of every note under a renamed or moved folder, from `from` to `to`.
sym src-tauri/src/commands/semantic.rs:371 cmd init_semantic_search(vault_path: String) -> Result<bool, String> L25 | Loads the ONNX model into the static embedder.
sym src-tauri/src/commands/semantic.rs:399 cmd is_semantic_model_available(vault_path: String) -> Result<bool, String> L4 | Checks if the ONNX model files are available on disk.
sym src-tauri/src/commands/semantic.rs:406 cmd is_reranker_model_available(vault_path: String) -> Result<bool, String> L4 | Checks if the reranker model files are available on disk.
sym src-tauri/src/commands/semantic.rs:422 cmd download_reranker_model(vault_path: String, app: AppHandle) -> Result<bool, String> L3 | Downloads the jina-reranker-v2-base-multilingual INT8 ONNX model (~280MB) into `.kokobrain/models/jina-reranker-v2-base-multilingual/`.
sym src-tauri/src/commands/semantic.rs:452 cmd download_semantic_model(vault_path: String, app: AppHandle) -> Result<bool, String> L3 | Downloads the ONNX model from HuggingFace Hub, emitting progress events.
sym src-tauri/src/commands/semantic.rs:483 cmd build_semantic_index(vault_path: String, app: AppHandle,) -> Result<SemanticStats, String> L6 | Builds the semantic index; progress is emitted on `semantic-index-progress`.
sym src-tauri/src/commands/semantic.rs:798 cmd search_semantic(query: String, max_results: Option<usize>, min_score: Option<f32>,) -> Result<Vec<SemanticResult>, String> L162 | Searches semantic index by embedding the query and computing cosine similarity.
sym src-tauri/src/commands/semantic.rs:986 cmd search_hybrid(query: String, max_results: Option<usize>,) -> Result<Vec<SemanticResult>, String> L231 | Hybrid search: fuses FTS5 (BM25) and semantic (cosine) results via RRF, then reranks the top-50 with the cross-encoder when available.
sym src-tauri/src/commands/semantic.rs:1220 cmd get_semantic_stats() -> Result<SemanticStats, String> L3 | Returns statistics about the semantic search index.
sym src-tauri/src/commands/semantic.rs:1235 cmd get_semantic_file_status(file_path: String) -> Result<SemanticFileStatus, String> L14 | Returns per-file indexing status for the given vault-relative path.
sym src-tauri/src/commands/semantic.rs:1253 cmd shutdown_semantic() -> Result<(), String> L12 | Releases the ONNX model and clears the search cache.
sym src-tauri/src/commands/semantic.rs:1282 cmd remove_semantic_file(file_path: String) -> Result<(), String> L19 | Removes a single note from the semantic index: every chunk row for `file_path` plus its `mtime:<file_path>` key, in one transaction, then invalidates the searc…
sym src-tauri/src/commands/semantic.rs:1305 cmd update_semantic_file(file_path: String, content: String, vault_path: String,) -> Result<(), String> L170 | Re-chunks and re-embeds a single file (called on save).
sym src-tauri/src/commands/sentry.rs:7 cmd configure_sentry(state: State<'_, SentryState>, enabled: bool, dsn: String, release: String,) -> Result<(), String> L8 | Enables or disables Rust error and panic reporting for the active vault.
sym src-tauri/src/commands/todoist.rs:28 cmd todoist_read_kv(vault_path: String) -> Result<Vec<TodoistKvEntry>, String> L3 | Every `todoist_kv` row, sorted by key.
sym src-tauri/src/commands/todoist.rs:34 cmd todoist_read_links(vault_path: String) -> Result<Vec<TodoistTaskLink>, String> L3 | Every `todoist_task_link` row, sorted by anchor.
sym src-tauri/src/commands/todoist.rs:40 cmd todoist_read_sections(vault_path: String) -> Result<Vec<TodoistSectionLink>, String> L3 | Every `todoist_section_link` row, sorted by section id.
sym src-tauri/src/commands/todoist.rs:47 cmd todoist_commit_state(vault_path: String, commit: TodoistStateCommit) -> Result<(), String> L8 | Writes kv rows (the `sync_token` among them), link and section link upserts and deletes in one transaction: all of it lands, or none of it.
sym src-tauri/src/commands/todoist.rs:58 cmd todoist_append_log(vault_path: String, entries: Vec<TodoistSyncLogInput>) -> Result<(), String> L12 | Appends sync log entries and keeps only the newest 1000 rows.
sym src-tauri/src/commands/todoist.rs:73 cmd todoist_read_log(vault_path: String, limit: Option<u32>) -> Result<Vec<TodoistSyncLogEntry>, String> L4 | The newest `limit` sync log rows (default: all kept rows), newest first.
sym src-tauri/src/commands/update_channel.rs:88 cmd check_for_update_on_channel(webview: Webview<R>, channel: String, allow_downgrades: Option<bool>,) -> Result<Option<UpdateMetadata>, String> L42 | Check for an available update on the given release channel.
sym src-tauri/src/commands/vault.rs:120 cmd scan_vault(path: String, sort_by: String) -> Result<Vec<FileNode>, String> L8 | Recursively scans a vault directory and returns the full file tree with metadata.
sym src-tauri/src/commands/vault.rs:358 cmd update_note_in_index(app: tauri::AppHandle, state: tauri::State<'_, VaultIndexState>, path: String, content: String,) -> Result<UpdateResul… L27 | Tauri command: updates a single note's metadata in the managed `VaultIndex` and emits `vault-index-updated` with the resulting `UpdateResult` payload.
sym src-tauri/src/commands/vault.rs:451 cmd propagate_type_rename(app: tauri::AppHandle, state: tauri::State<'_, VaultIndexState>, old_type: String, new_type: String,) -> Result<usize,… L26 | Tauri command: propagates a type rename to all member notes — rewrites their `_type:` frontmatter from `old_type` to `new_type` in one pass and reindexes each …
sym src-tauri/src/commands/vault.rs:486 cmd get_backlinks_v2(path: String, state: tauri::State<'_, VaultIndexState>,) -> Result<Vec<NoteEntry>, String> L10 | Returns every `NoteEntry` whose outgoing links resolve to `path`, sorted by title (case-insensitive) for stable UI ordering.
sym src-tauri/src/commands/vault.rs:500 cmd get_relationship_backlinks_v2(path: String, state: tauri::State<'_, VaultIndexState>,) -> Result<Vec<RelationshipBacklink>, String> L10 | Returns notes that reference `path` via frontmatter relationship fields (`belongs_to`, `related_to`, or custom wikilink-bearing fields).
sym src-tauri/src/commands/vault.rs:519 cmd get_outgoing_links_v2(path: String, state: tauri::State<'_, VaultIndexState>,) -> Result<Vec<OutgoingLink>, String> L10 | Returns the outgoing wikilinks of `path`, each resolved against the managed `VaultIndex` resolution caches (so callers know which links are broken vs which tar…
sym src-tauri/src/commands/vault.rs:541 cmd get_outgoing_unlinked_mentions_v2(path: String, content: String, state: tauri::State<'_, VaultIndexState>,) -> Result<Vec<OutgoingUnlinkedMention>, Stri… L11 | Returns notes whose names appear as plain text in `content` but are NOT already linked from `path` via wikilinks.
sym src-tauri/src/commands/vault.rs:563 cmd get_all_vault_entries_v2(state: tauri::State<'_, VaultIndexState>,) -> Result<Vec<NoteEntry>, String> L11 | Returns every `NoteEntry` in the vault index, sorted by path.
sym src-tauri/src/commands/vault.rs:599 cmd get_unlinked_mentions_v2(path: String, state: tauri::State<'_, VaultIndexState>,) -> Result<Vec<NoteEntry>, String> L33 | Returns notes whose body mentions `path`'s note name in plain text (after frontmatter / fenced-code stripping and Unicode word-boundary checks) but do NOT have…
sym src-tauri/src/commands/vault.rs:638 cmd get_all_tags_v2(state: tauri::State<'_, VaultIndexState>,) -> Result<Vec<TagAggregate>, String> L9 | Returns the flat list of tag aggregates (one per distinct tag), sorted alphabetically.
sym src-tauri/src/commands/vault.rs:652 cmd get_all_tasks_v2(state: tauri::State<'_, VaultIndexState>,) -> Result<Vec<FileTaskGroup>, String> L9 | Returns every file's tasks grouped by file, sorted by `modifiedAt` descending.
sym src-tauri/src/commands/vault.rs:733 cmd toggle_task_status(app: tauri::AppHandle, state: tauri::State<'_, VaultIndexState>, path: String, line_number: usize, expected_text: Stri… L36 | Tauri command: toggles a task's checkbox on disk + in the managed `VaultIndex`.
sym src-tauri/src/commands/vault.rs:858 cmd write_task_lines(app: tauri::AppHandle, state: tauri::State<'_, VaultIndexState>, vault_root: String, rel_path: String, edits: TaskLine… L24 | Tauri command: replaces, inserts and removes task lines in the note at `rel_path` under `vault_root`, all or nothing, located by `🆔 td-…` anchor plus the expe…
sym src-tauri/src/commands/vault.rs:956 cmd write_task_text(app: tauri::AppHandle, state: tauri::State<'_, VaultIndexState>, vault_root: String, rel_path: String, line_number: us… L35 | Tauri command: rewrites the text of the task at `line_number` of the note at `rel_path` under the open vault `vault_root`, guarded by the expected text and sta…
sym src-tauri/src/commands/vault.rs:1056 cmd get_all_property_records(state: tauri::State<'_, VaultIndexState>,) -> Result<Vec<NoteRecord>, String> L12 | Returns every entry projected as a `NoteRecord` — the shape the TS `collection.service::buildPropertyIndex` consumes.
sym src-tauri/src/commands/vault.rs:1099 cmd get_index_delta(state: tauri::State<'_, VaultIndexState>, paths: Vec<String>,) -> Result<IndexDelta, String> L10 | Returns the entries and property records of `paths` only, so the `vault-index-updated` listener can patch its snapshots for the paths an event reported instead…
sym src-tauri/src/commands/vault.rs:1145 cmd create_note(app: tauri::AppHandle, state: tauri::State<'_, VaultIndexState>, path: String, content: String,) -> Result<UpdateResul… L27 | Atomically creates a new note at `path` with the given `content`.
sym src-tauri/src/commands/vault.rs:1179 cmd create_folder(path: String) -> Result<(), String> L5 | Creates a directory (recursive — equivalent to TS `mkdir(path, { recursive: true })`).
sym src-tauri/src/commands/vault.rs:1206 cmd write_mod_data(vault_path: String, mod_id: String, content: String) -> Result<(), String> L8 | Writes a mod's data through `write_atomic`, creating missing folders: a crash mid-write leaves the old file, never a truncated one.
sym src-tauri/src/commands/vault.rs:1222 cmd read_mod_data(vault_path: String, mod_id: String) -> Result<Option<Vec<u8>>, String> L9 | Reads a mod's data as raw bytes, `None` only when the file is not there.
sym src-tauri/src/commands/vault.rs:1242 cmd remove_note_from_index(app: tauri::AppHandle, state: tauri::State<'_, VaultIndexState>, path: String,) -> Result<UpdateResult, String> L25 | Tauri command: removes a single note from the managed `VaultIndex`.
sym src-tauri/src/commands/vault.rs:1392 cmd rename_note(app: tauri::AppHandle, state: tauri::State<'_, VaultIndexState>, from: String, to: String,) -> Result<Option<UpdateRes… L23 | Tauri command: re-keys the managed `VaultIndex` for a renamed or moved path.
sym src-tauri/src/commands/vault.rs:1441 cmd scan_vault_v2(app: tauri::AppHandle, path: String,) -> Result<Vec<NoteEntry>, String> L14 | Tauri command: scans a vault and rebuilds the managed `VaultIndex`.
sym src-tauri/src/commands/vault.rs:1528 cmd scan_vault_v2_cached(app: tauri::AppHandle, path: String,) -> Result<CachedScanResult, String> L14 | Loads the vault index from the on-disk cache if available, falling back to a full `scan_vault_v2` on cache miss or corruption.
sym src-tauri/src/commands/vault.rs:1764 cmd save_vault_cache(path: String, state: tauri::State<'_, VaultIndexState>,) -> Result<(), String> L19 | Saves the current in-memory VaultIndex entries to the disk cache.
sym src-tauri/src/commands/watcher.rs:12 cmd start_vault_watcher(app: tauri::AppHandle, state: tauri::State<'_, VaultWatcherState>, path: String,) -> Result<(), String> L12 | Starts (or replaces) the vault watcher.
sym src-tauri/src/commands/watcher.rs:27 cmd stop_vault_watcher(state: tauri::State<'_, VaultWatcherState>) -> Result<(), String> L3 | Stops the vault watcher (if any).
## effects
fx-count rust-fs.create_dir_all 2
fx-count rust-fs.remove_file 1
fx-count rust-spawn.spawn 2
fx-count rust-timer.sleep 2
## debt
-
