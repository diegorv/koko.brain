---
summary: "Tauri IPC layer: thin command handlers over the vault index, database, search, semantic, watcher and app services."
---

## Responsibility

Holds the functions annotated with the Tauri command attribute and the inner functions they delegate to, grouped by area: the file tree scan, VaultIndex scans and reads, the cached scan and save_vault_cache, note and folder creation, rename and type propagation, task toggles and task-line writes, and mod data (vault.rs); the vault file watcher (watcher.rs); batch file reads (files.rs); database open and close (db.rs); file history snapshots and diffs (history.rs); Todoist sync state (todoist.rs); full-text search (search_index.rs); semantic and hybrid search with the embedder and reranker lifecycle (semantic.rs); debug toggles and process memory (debug.rs); Sentry configuration (sentry.rs); system font listing (fonts.rs); channel-aware update checks (update_channel.rs); and the quit handshake (app_exit.rs). It owns command signatures, argument checks at the boundary, the write-path guard, several ts-rs DTOs (FileNode, IndexDelta, CachedScanResult, ScanSource, FileReadResult, DiffLine, DiffLineType, IndexStats, UpdateMetadata), and the emission of vault-index-updated, vault-files-changed and semantic-index-progress. It does not own the index data structures, the SQLite schema, the ranking logic or the model code, which live in the sibling modules. The quick-capture commands live in src-tauri/src/quick_capture.

## Key files

- `src-tauri/src/commands/vault.rs`: Largest module: file tree scan, VaultIndex scans, reads and writes, note create, rename and type propagation, task toggles and task-line writes, ensure_safe_write_path, mod data and the vault-index-updated emissions.
- `src-tauri/src/commands/semantic.rs`: Semantic and hybrid search, model download, index build, and the process-wide embedder, reranker and search cache.
- `src-tauri/src/commands/search_index.rs`: FTS5 reconcile, search, per-file updates and rename re-keying; the async plus spawn_blocking pattern for heavy commands.
- `src-tauri/src/commands/history.rs`: Snapshot save with hash dedupe, history reads, line diff computation and retention cleanup.
- `src-tauri/src/commands/todoist.rs`: Todoist sync state commands that go through the open-vault check.
- `src-tauri/src/commands/watcher.rs`: Start and stop wrappers around the vault watcher that emit vault-files-changed.
- `src-tauri/src/commands/app_exit.rs`: Exit decision logic, ExitFlushState and confirm_exit.
- `src-tauri/src/lib.rs`: The generate_handler! list that decides which of these functions the webview can call.

## State

- Process-wide statics in semantic.rs: the lazily loaded embedder, the optional reranker, the stored vault path, the model-available flag, the idle-unload generation counters, the in-memory search cache and the index build lock.
- A cached sysinfo System instance used for process memory sampling (debug.rs).
- Reads managed state owned by the crate root: VaultIndexState, VaultWatcherState, SentryState and ExitFlushState.
- On-disk data written through these commands: .kokobrain/mods/<id>/data.json (vault.rs), the index snapshot through vault::index_cache (vault.rs save_vault_cache), and model folders under .kokobrain/models, which semantic::model::ModelManager writes when the download commands in semantic.rs run. The database file itself is owned by src-tauri/src/db.

## Collaborators

- `src-tauri/src`: lib.rs registers every command in this folder in generate_handler! and manages the state types they read; sentry.rs delegates to error_monitoring::configure_sentry.
- `src-tauri/src/vault`: Provides VaultIndex, VaultIndexState, parsing, task types, task-line edits, the snapshot cache and the watcher that vault.rs and watcher.rs drive.
- `src-tauri/src/db`: SQLite access for history, Todoist state, FTS rows and semantic chunks through with_db, with_fts_db, with_vault_db and their transaction variants; db.rs opens and closes the database.
- `src-tauri/src/search`: FTS text helpers and fuzzy expansion used by search_index.rs; RRF fusion and rerank pool assembly used by search_hybrid in semantic.rs.
- `src-tauri/src/semantic`: Embedder, reranker, model manager, chunker, quantization, update planning, filtering, timing and cache stats used by semantic.rs.
- `src-tauri/src/utils`: debug_log, validate_vault_path, write_atomic, the markdown collectors, resource sampling and the main-thread heartbeat used across the commands.
- `src/lib/contracts`: Frontend typed call wrapper (ipc.ts), command map and event map that mirror these signatures; ts-rs DTOs defined here and in sibling modules are written to generated/.
- `event:vault-index-updated`: Emitted by vault.rs after VaultIndex mutations and full scans.
- `event:vault-files-changed`: Emitted by watcher.rs for each debounced burst of file changes.
- `event:semantic-index-progress`: Emitted by semantic.rs during model downloads and index builds.

## Gotchas

- Only commands listed in generate_handler! in src-tauri/src/lib.rs are callable from the webview. A #[tauri::command] function added here but not registered there compiles and then fails at runtime; src/tests/lib/contracts/ipc-parity.test.ts also requires a matching entry in src/lib/contracts/commands.ts.
- Write-path guard: vault.rs ensure_safe_write_path rejects non-absolute paths and any path with a parent-directory component. Its doc says std::fs is not covered by the plugin-fs ACL, so a crafted wikilink could otherwise write outside the vault. create_note and create_folder call it before writing; any new std::fs write driven by a frontend path needs the same check.
- A sync fn command runs on the app main thread and blocks the window and other invokes. Heavy commands are declared async and move work to spawn_blocking (scan_vault, scan_vault_v2, the search_index, history save and Todoist commands document this), and read_mod_data uses #[tauri::command(async)]. Keep new heavy commands off the main thread.
- vault.rs releases the VaultIndex lock before emitting vault-index-updated, so listeners can re-read the index immediately.
- write_mod_data and read_mod_data touch no VaultIndex and emit nothing. A mod id must be a non-empty single segment of lowercase ASCII letters, digits and hyphens, and the file is .kokobrain/mods/<id>/data.json under the validated vault path. read_mod_data returns raw bytes and None only for a missing file.
- semantic.rs keeps the embedder and reranker in process-wide statics that unload after an idle timeout and reload on demand. The search cache has no idle unload. shutdown_semantic clears the model-available flag, both models and the cache.
- search_index.rs calls crate::commands::semantic::invalidate_search_cache and semantic.rs calls crate::commands::search_index::search_fts_inner, so the two modules depend on each other and a signature change touches both.
- rename_in_search_index re-keys FTS rows and semantic chunks in one transaction on the FTS connection, since both connections open the same database file.
- Todoist commands take the vault path from the caller and use with_vault_db or with_vault_db_transaction, which refuse a path that is not the open vault, so a sync that outlived a vault switch cannot write to the next vault. The history and semantic commands use with_db and the search_index commands use with_fts_db, and none of them check which vault is open.
- read_files_batch canonicalizes each path and rejects any that resolves outside the given vault, recording a per-file error instead of failing the batch.
- update_channel.rs stores the returned Update in the webview resource table and the frontend passes its rid to the updater plugin's download_and_install. Unknown channel names fall back to the stable endpoint.
- app_exit.rs covers programmatic quit only. Dock Quit and logout bypass it, as its module comment states.
- fonts.rs list_system_fonts calls CoreText and CoreFoundation through FFI under a macOS target gate, with a separate non-macOS branch.
- The frontend builds the index through scan_vault_v2_cached. scan_vault_v2 is still registered and rebuilds the managed VaultIndex, and tests in src-tauri/tests/commands call scan_vault_v2_inner, so check those callers and the TypeScript contract before removing it.
