# Scout 01: Rust Tauri commands in vault, files, watcher, fonts, db, debug

Scope: `src-tauri/src/commands/{vault,files,watcher,fonts,db,debug}.rs` plus the logic they call. Read-only audit. No build or test was run. Line refs are `path:line` in the repo at HEAD (main, 2a937e57). External claims carry URLs. Anything not checked is marked UNVERIFIED.

## 1. Summary

- 30 commands in scope: 22 in `vault.rs`, 2 in `watcher.rs`, 1 in `files.rs`, 1 in `fonts.rs`, 2 in `db.rs`, 2 in `debug.rs`. All are registered in `lib.rs:294-347`.
- The logic is already mostly Tauri-free. `vault/`, `db/`, `search/`, `utils/` have zero `tauri::` imports (the only textual hits are doc comments, `vault/watcher.rs:4`, and a test string, `search/fts_logic.rs:264`). The `CmdTrace` guard is the only thing in `vault.rs` that is not pure.
- Tauri glue is thin. 8 commands take `tauri::AppHandle` only to emit `vault-index-updated`. Commands that take `tauri::State` only need the `VaultIndexState` reference. `watcher.rs` already injects the emit as a callback (`vault/watcher.rs:241`, `:302`).
- Seams already exist for 8 commands via `*_inner` functions (`update_note_in_index_inner`, `propagate_type_rename_inner`, `toggle_task_status_inner`, `rename_note_inner`, `index_delta_inner`, `scan_vault_v2_inner`, `scan_vault_v2_cached_inner`, plus `collect_v2_entries`).
- The main portability blockers are not Tauri coupling. They are (a) raw `std::fs` on caller-supplied absolute `String` paths, which bypasses plugin-fs iOS security-scoped handling, (b) process-global statics for the DB and the vault index cache, and (c) a remote-exposure path-scope gap. Several commands can write to arbitrary absolute paths (see section 6).
- Effort (my estimate, not measured): mechanical extraction of the pure logic into a `kokobrain-core` crate with an `EventSink` trait is roughly 2-4 days. Adding a path-scope and auth layer for remote exposure, and an iOS storage layer, is the larger cost, roughly 1-2 weeks.

## 2. Command inventory

Legend. `AH` = takes `tauri::AppHandle`. `ST` = takes `tauri::State`. `Emit` = Tauri event emitted. `FS` = touches the filesystem directly with `std::fs` or helpers. `Lock` = `VaultIndexState` lock taken (`R` read, `W` write).

### 2.1 `commands/vault.rs` (22)

| # | Command (def) | Args | Return DTO | AH | ST | Emit | FS | Lock | Core fn / inner |
|---|---|---|---|---|---|---|---|---|---|
| 1 | `scan_vault` (`:80`, sync) | `path, sortBy` | `Vec<FileNode>` (`:53`) | no | no | none | `read_dir`, `symlink_metadata` recursive (`:91-156`), `validate_vault_path` (`:85`) | none | no inner; `scan_dir` is private (`:91`) |
| 2 | `update_note_in_index` (`:302`, sync) | `path, content` | `UpdateResult` (`index.rs:28`) | yes | yes (W) | `vault-index-updated` if `changed` (`:317-318`) | `metadata` for mtime/ctime/size (`:310`, `:286`); no write | W (`:311-316`) | `update_note_in_index_inner` (`:269`) |
| 3 | `propagate_type_rename` (`:396`, sync) | `oldType, newType` | `usize` | yes | yes (W) | `vault-index-updated` once, last result (`:409-418`) | reads each member note `:357`, `write_atomic` `:370` | W held for whole loop (`:403-408`) | `propagate_type_rename_inner` (`:342`) |
| 4 | `get_backlinks_v2` (`:431`, sync) | `path` | `Vec<NoteEntry>` | no | yes (R) | none | none | R | none (one-line `idx.lookup_backlinks`) |
| 5 | `get_relationship_backlinks_v2` (`:445`, sync) | `path` | `Vec<RelationshipBacklink>` | no | yes (R) | none | none | R | none |
| 6 | `get_outgoing_links_v2` (`:464`, sync) | `path` | `Vec<OutgoingLink>` | no | yes (R) | none | none | R | none |
| 7 | `get_outgoing_unlinked_mentions_v2` (`:486`, sync) | `path, content` | `Vec<OutgoingUnlinkedMention>` | no | yes (R) | none | none (content supplied by FE) | R | none |
| 8 | `get_all_vault_entries_v2` (`:508`, sync) | none | `Vec<NoteEntry>` (clone of whole index, sorted) | no | yes (R) | none | none | R | none. Full index clone per call (`:515-517`) |
| 9 | `get_unlinked_mentions_v2` (`:544`, **async**) | `path` | `Vec<NoteEntry>` | no | yes (R, 3 phases) | none | disk reads of candidate files in `spawn_blocking` (`:562-565`) | R, released during I/O (`:550-555`, `:568-573`) | none; three-phase split is already correct |
| 10 | `get_all_tags_v2` (`:583`, sync) | none | `Vec<TagAggregate>` | no | yes (R) | none | none | R | none |
| 11 | `get_all_tasks_v2` (`:597`, sync) | none | `Vec<FileTaskGroup>` | no | yes (R) | none | none | R | none |
| 12 | `get_tasks_in_section_v2` (`:615`, **sync**) | `sectionTag` | `Vec<FileTaskGroup>` | no | yes (R) | none | `read_to_string` of every indexed file (`:632`) | **R held across all N reads** (`:620-655`) | none; loop is inline |
| 13 | `toggle_task_status` (`:708`, sync) | `path, lineNumber` | `ToggleTaskResult` (`task.rs:184`) | yes | yes (W) | `vault-index-updated` if changed (`:721-722`) | `read_to_string` (`:669`), `write_atomic` (`:683`) | **W held across disk read and write** (`:715-720`) | `toggle_task_status_inner` (`:664`) |
| 14 | `get_all_property_records` (`:799`, sync) | none | `Vec<NoteRecord>` (`entry.rs:80`) | no | yes (R) | none | none | R | none (uses `project_note_record` `:743`) |
| 15 | `get_index_delta` (`:842`, sync) | `paths` | `IndexDelta` (`:819`) | no | yes (R) | none | none | R | `index_delta_inner` (`:828`) |
| 16 | `create_note` (`:888`, sync) | `path, content` | `UpdateResult` | yes | yes (W) | `vault-index-updated` always (`:907`) | `Path::exists` (`:896`), `write_atomic` (`:899`), `ensure_safe_write_path` (`:895`) | W taken after write (`:901-906`) | none; logic inline |
| 17 | `create_folder` (`:922`, sync) | `path` | `()` | no | no | none | `create_dir_all` (`:925`), `ensure_safe_write_path` (`:924`) | none | none |
| 18 | `remove_note_from_index` (`:938`, sync) | `path` | `UpdateResult` | yes | yes (W) | `vault-index-updated` if changed (`:950-951`) | none | W (`:944-949`) | none; one-line `idx.remove_entry` |
| 19 | `rename_note` (`:1045`, sync) | `from, to` | `Option<UpdateResult>` | yes | yes (W) | `vault-index-updated` if `Some` (`:1058-1059`) | none (index only; disk rename is TS-side per doc `:1040`) | W (`:1052-1057`) | `rename_note_inner` (`:1001`) |
| 20 | `scan_vault_v2` (`:1094`, **async**, `spawn_blocking`) | `path` | `Vec<NoteEntry>` | yes (`app.state` + emit) | via `app.state` (W) | `vault-index-updated` `fullRescan: true` (`:1102`, `:1393-1406`) | full walk + read every `.md` (`collect_v2_entries` `:168`) | W only around `idx.build` (`:1122-1137`) | `scan_vault_v2_inner` (`:1116`) |
| 21 | `scan_vault_v2_cached` (`:1179`, **async**, `spawn_blocking`) | `path` | `CachedScanResult` (`:1146`) | yes | via `app.state` (W) | `vault-index-updated` `fullRescan: true` (`:1187`) | `.kokobrain/vault-index.msgpack` read/write/delete corrupt (`:1207`, `:1231`, `:1259`, `:1370`), walk + reread changed (`:1287-1335`) | W only around `build` (`:1244-1249`, `:1349-1354`) | `scan_vault_v2_cached_inner` (`:1198`) |
| 22 | `save_vault_cache` (`:1412`, sync) | `path` | `()` | no | yes (R, cloned then dropped `:1419-1423`) | none | `write_snapshot` to `<path>/.kokobrain/vault-index.msgpack` (`index_cache.rs:46-50`, `:95`) | R, released before write | none |

Frontend-facing contract note: `commands.ts:52` marks `scan_vault_v2` as "Rust-only: registered but not invoked from TS". I found no `'scan_vault_v2'` string literal in `src/` outside tests. Only `scan_vault_v2_cached` is invoked (`backlinks.service.ts:93`).

### 2.2 `commands/watcher.rs` (2)

| Command | Args | Return | AH | ST | Emit | FS | Notes |
|---|---|---|---|---|---|---|---|
| `start_vault_watcher` (`:11-23`, sync) | `path` | `()` | yes | yes (`Mutex<Option<VaultWatcher>>`, `vault/watcher.rs:143`) | `vault-files-changed` (`:19`, via callback) | `notify` recursive watch on `path` (`vault/watcher.rs:253` builds `recommended_watcher`; `watch(...)` follows in `start_watcher_inner`, `:241-270`) | `replace_watcher` (`vault/watcher.rs:302-318`) joins the old bridge thread on the IPC thread. Doc says this can block up to one debounce window (500 ms) (`:125-129`). |
| `stop_vault_watcher` (`:26-29`, sync) | none | `()` | no | yes | none | none | `stop_watcher` (`vault/watcher.rs:321`) |

Watcher payload DTO: `VaultFilesChangedPayload { paths }` (`vault/watcher.rs:37-43`, ts-exported, camelCase).

### 2.3 `commands/files.rs` (1)

| Command | Args | Return DTO | AH | ST | Emit | FS | Notes |
|---|---|---|---|---|---|---|---|
| `read_files_batch` (`:23-84`, sync) | `vaultPath, paths` | `Vec<FileReadResult>` (`:9-16`, ts-exported) | no | no | none | `canonicalize` per path (`:37`), `read_to_string` (`:63`) | Vault-bound: `validate_vault_path` (`:31`) and `canonical.starts_with(&vault_root)` (`:49`). Per-file errors are captured, not propagated. Sync, so a large batch runs on the IPC thread. |

### 2.4 `commands/fonts.rs` (1)

| Command | Args | Return | AH | ST | Emit | FS | Notes |
|---|---|---|---|---|---|---|---|
| `list_system_fonts` (`:5-75`, sync) | none | `Vec<String>` | no | no | none | none | macOS only: direct CoreText and CoreFoundation FFI (`:7-70`, `#[link(name="CoreText", kind="framework")]`). Non-macOS returns `Ok(vec![])` (`:71-74`). iOS hits the non-macOS branch, so it returns `[]`. |

### 2.5 `commands/db.rs` (2)

| Command | Args | Return | AH | ST | Emit | FS | Notes |
|---|---|---|---|---|---|---|---|
| `open_vault_db` (`:6-11`, sync) | `vaultPath` | `()` | no | no | none | `create_dir_all` for `.kokobrain` and SQLite open at `<vault>/.kokobrain/kokobrain.db` (`db/mod.rs:36-46`) | `validate_vault_path` (`:9`), then `db::open_database`. Opens two connections (main and FTS), WAL mode (`db/mod.rs:49`, `:72`). |
| `close_vault_db` (`:14-18`, sync) | none | `()` | no | no | none | none | `db::close_database` (`db/mod.rs:91-99`) |

### 2.6 `commands/debug.rs` (2)

| Command | Args | Return | AH | ST | Emit | FS | Notes |
|---|---|---|---|---|---|---|---|
| `set_tauri_debug_mode` (`:10-14`, sync) | `enabled` | `()` | no | no | none | none | Sets an atomic flag in `utils/logger.rs:33-35`. The logger is Tauri-free. |
| `get_process_memory` (`:17-31`, sync) | none | `u64` (RSS bytes) | no | no | none | none | Global `static SYSTEM: Mutex<Option<System>>` (`:7`). Uses sysinfo `refresh_processes_specifics` (`:22-26`). |

Log emission. `lib.rs:259-267` installs a `set_log_sink` closure that emits `tauri-debug-log` (`DebugLogPayload`, `utils/logger.rs:18-23`). This is indirect: every enabled `debug_log` call in scope reaches the frontend through it. `utils/logger.rs:8` and `:15` define the sink as a `OnceLock<Box<dyn Fn>>`, which is already framework-free.

## 3. Events emitted (in-scope commands)

| Event (const, `events.rs`) | Emitted by | Condition |
|---|---|---|
| `vault-index-updated` (`events.rs:7`) | `update_note_in_index` `vault.rs:318` | only if `changed` |
| | `propagate_type_rename` `vault.rs:410` | once, last step result, if any member updated |
| | `toggle_task_status` `vault.rs:722` | only if `changed` |
| | `create_note` `vault.rs:907` | always (even if not changed) |
| | `remove_note_from_index` `vault.rs:951` | only if `changed` |
| | `rename_note` `vault.rs:1059` | only if `Some` |
| | `scan_vault_v2` / `scan_vault_v2_cached` via `emit_index_updated` `vault.rs:1102`, `:1187`, `:1393-1406` | always, `fullRescan: true` |
| `vault-files-changed` (`events.rs:11`) | `start_vault_watcher` via callback, `commands/watcher.rs:17-22` | per debounced burst |
| `tauri-debug-log` (`events.rs:18`) | `lib.rs:259-267` log sink | every enabled `debug_log` |

Lock discipline. All index-mutating commands drop the `VaultIndexState` guard before `app.emit`. Confirmed for `update_note_in_index` (`:311-317`), `propagate_type_rename` (`:403-409`), `toggle_task_status` (`:715-721`), `remove_note_from_index` (`:944-950`), and `rename_note` (`:1052-1058`). `create_note` writes to disk before taking the lock (`:899` then `:901`).

## 4. State management

| State | Declaration | Registration | Notes |
|---|---|---|---|
| `VaultIndexState` | `pub type VaultIndexState = std::sync::RwLock<index::VaultIndex>` (`vault/mod.rs:25`) | `.manage(VaultIndexState::default())` (`lib.rs:288`) | Std `RwLock`, not tokio. Poisoning is mapped to `Err(String)` in every command. |
| `VaultWatcherState` | `pub type VaultWatcherState = Mutex<Option<VaultWatcher>>` (`vault/watcher.rs:143`) | `lib.rs:289` | Replacement joins the old bridge thread inside the lock (`vault/watcher.rs:302-318`). |
| DB connections | `static DB: Mutex<Option<Connection>>` and `static FTS_DB` (`db/mod.rs:17`, `:27`) | Not Tauri-managed. Process-global. | `open_database` / `close_database` (`:36`, `:91`). `with_db` (`:110`) gates on open. |
| Debug RSS cache | `static SYSTEM: Mutex<Option<System>>` (`commands/debug.rs:7`) | Not managed | Process-global. |
| Logger | `static DEBUG_ENABLED: AtomicBool`, `static LOG_SINK: OnceLock` (`utils/logger.rs:11`, `:15`) | sink set in `lib.rs:259` | Framework-free. |
| Write sequence | `static WRITE_ATOMIC_SEQ: AtomicU64` (`utils/fs.rs:9`) | n/a | Temp file name `<path>.tmp-<pid>-<seq>` (`utils/fs.rs:26`) written in the target directory. |

Managed state wiring is in `lib.rs:288-292`. Commands receive `tauri::State<'_, VaultIndexState>` and deref to the RwLock. Claim from my knowledge of Tauri 2 API, not checked against a source in this run: `tauri::State<T>` implements `Deref<Target = T>`, so the same logic can take a `&VaultIndexState` in a transport-neutral core.

Blocking-I/O under lock (risk list, in-scope):

| Command | Problem | Ref |
|---|---|---|
| `get_tasks_in_section_v2` | Holds the **read** lock across N file reads on the sync IPC thread. Writers (watcher-driven `update_note_in_index`, `toggle_task_status`) stall for the whole scan. | `vault.rs:615-657` |
| `toggle_task_status` | Holds the **write** lock across `read_to_string` and `write_atomic`. | `vault.rs:715-720`, `:664-683` |
| `propagate_type_rename` | Holds the **write** lock across a read and an atomic write per member note. | `vault.rs:403-408`, `:342-385` |
| `replace_watcher` | Joins the old bridge thread (up to one debounce window) inside the watcher mutex on the sync IPC thread. | `vault/watcher.rs:302-318`, `:125-129` |

Good patterns already in place: `scan_vault_v2*` do I/O outside the lock. `get_unlinked_mentions_v2` uses a three-phase split. `save_vault_cache` clones under the read lock and writes after dropping it (`vault.rs:1419-1424`).

Sync versus async. `scan_vault` (`:80`), `get_tasks_in_section_v2` (`:615`), `toggle_task_status` (`:708`), `create_note` (`:888`), `create_folder` (`:922`), `read_files_batch` (`files.rs:24`), and `update_note_in_index` (`:303`) are all sync `fn` and run on the IPC thread. The file-reading ones are the risk. The `vault.rs:1087-1092` doc comment states this rationale for `scan_vault_v2`.

## 5. Tauri-free callability (is there an `*_inner`?)

Columns: "callable without Tauri" means it takes no `AppHandle` and no `State`, or takes `&VaultIndexState` and returns data. Emit is the only Tauri coupling in most cases.

| Command | Seam today | Callable without Tauri? | What must change |
|---|---|---|---|
| `scan_vault` | `scan_dir` private (`vault.rs:91`) | Yes, the signature has no Tauri type. Only `CmdTrace` and `debug_log`. | Move `scan_dir` pub. |
| `update_note_in_index` | `update_note_in_index_inner` (`:269`) | Core yes. `mtime` read in wrapper (`:310`). | Move `read_file_mtime_secs` into core; emit via sink. |
| `propagate_type_rename` | `propagate_type_rename_inner` (`:342`) | Yes | Emit via sink. |
| `get_backlinks_v2`, `_relationship_`, `get_outgoing_links_v2`, `get_outgoing_unlinked_mentions_v2`, `get_all_vault_entries_v2`, `get_all_tags_v2`, `get_all_tasks_v2`, `get_all_property_records`, `remove_note_from_index` | none (one-liners on `VaultIndex`) | Yes, given `&VaultIndexState` | Change parameter from `tauri::State` to `&VaultIndexState`. Trivial. |
| `get_unlinked_mentions_v2` | none, but already split | Yes | Replace `tokio::spawn_blocking` with a runtime-neutral executor or a `std::thread` call. |
| `get_tasks_in_section_v2` | none, loop inline | Yes | Extract to a `fn` and fix the lock scope (section 4). |
| `toggle_task_status` | `toggle_task_status_inner` (`:664`) | Yes. Note: no `ensure_safe_write_path`. | Emit via sink. See section 6. |
| `get_index_delta` | `index_delta_inner` (`:828`) | Yes | None. |
| `create_note` | none, logic inline | Yes | Extract. Emit via sink. |
| `create_folder` | none | Yes | None beyond moving it. |
| `rename_note` | `rename_note_inner` (`:1001`) | Yes | Emit via sink. |
| `scan_vault_v2` | `scan_vault_v2_inner` (`:1116`), `collect_v2_entries` (`:168`) | Yes | `app.state` and emit move to the shell. |
| `scan_vault_v2_cached` | `scan_vault_v2_cached_inner` (`:1198`) | Yes | Same. Cache file path is `<vault>/.kokobrain/` (`index_cache.rs:46-50`). |
| `save_vault_cache` | none, uses `index_cache::write_snapshot` | Yes | Extract. |
| `start_vault_watcher` / `stop_vault_watcher` | `replace_watcher` / `stop_watcher` (`vault/watcher.rs:302`, `:321`) take a callback | Yes, already. The emit is one closure in `commands/watcher.rs:17-22`. | Pass an `EventSink`-backed callback. |
| `read_files_batch` | none, pure (`files.rs:23-84`) | Yes | None beyond moving. |
| `open_vault_db` / `close_vault_db` | `db::open_database` / `close_database` (no Tauri) | Yes, but global state. | Replace `static DB` with an instance handle to allow more than one vault or a headless server. |
| `set_tauri_debug_mode` | logger (`utils/logger.rs:33`) | Yes | None. Name is misleading. |
| `get_process_memory` | none | Yes | None. |
| `list_system_fonts` | none | Yes on macOS. Returns `[]` elsewhere. | Add an iOS CoreText branch (see section 7). |

Confirmed Tauri-free modules (grep, 2026-11-02): `vault/`, `db/`, `search/`, `utils/`, `events.rs` (string consts only). Tauri-touching modules: `commands/*`, `quick_capture/*`, `lib.rs`, `error_monitoring.rs` (not checked in depth).

## 6. Path scope and remote exposure (matters for Model A)

Tauri IPC today is reachable only from the webview. Model A (HTTP/WS on the tailnet) makes every command below reachable by any paired device, so each row is a remote read or write primitive.

| Command | Path check today | Gap |
|---|---|---|
| `read_files_batch` | `validate_vault_path` + `canonicalize` + `starts_with(vault_root)` (`files.rs:31-49`) | Good. The only vault-scoped reader. |
| `scan_vault` | `validate_vault_path` only (`vault.rs:85`). Any directory that exists. | Reads names, sizes, mtimes, and recursive tree for any directory. |
| `open_vault_db` | `validate_vault_path` (`db.rs:9`) | Creates `.kokobrain/` and a SQLite file in any existing directory. |
| `save_vault_cache(path)` | none (`vault.rs:1412-1424`) | Writes `<path>/.kokobrain/vault-index.msgpack` anywhere. |
| `scan_vault_v2`, `scan_vault_v2_cached` | `collect_v2_entries` → `validate_vault_path` (`vault.rs:174`) | Reads any vault-like directory. |
| `start_vault_watcher(path)` | none (`commands/watcher.rs:11-16`) | Watches any directory recursively. |
| `create_note` | `ensure_safe_write_path`: absolute and no `..` (`vault.rs:862-874`, called `:895`) | Writes to any absolute path, not bounded to the vault. |
| `create_folder` | same (`vault.rs:924`) | Creates directories anywhere. |
| `toggle_task_status(path)` | **none**. `toggle_task_status_inner` reads and writes whatever `path` is supplied (`vault.rs:664-683`). | Overwrites any existing file the process can write, provided the line contains a checkbox. The doc comment (`:692-706`) does not mention the path check. |
| `update_note_in_index` | none | Inserts an index entry for any path with caller-chosen content (no disk write, `vault.rs:303-315`). Pollutes search and backlinks. |
| `propagate_type_rename` | paths come from the index (`vault.rs:347-352`) | Bounded to indexed notes. Good. |
| `rename_note` | index-only (`vault.rs:1001-1033`) | Re-keys any index entry. |
| `get_process_memory` | none | Harmless. |

Conclusion: `read_files_batch` is the only command with a real vault boundary. A remote-exposed core needs a single path-scope policy applied to all of the above, plus an auth layer (pairing token, as t3code does, per the task brief). This is a design point, not a finding that a current attacker exists, because the Tauri IPC is webview-only today.

## 7. iOS concerns per command

| Concern | Affected | Evidence |
|---|---|---|
| **Security-scoped access.** Raw `std::fs` on a caller `String` path bypasses plugin-fs. plugin-fs has an iOS module with `SecurityScopedResources` (`plugins/fs/src/lib.rs:20`, `:39-40`, `:457-460`), a `PathKind::Handle` that manages scope (`plugins/fs/src/commands.rs:74-96`), and a `FileHandle` that calls stop-accessing on drop (`commands.rs:115-121`). Its `FilePath` type accepts `file://` URLs (`plugins/fs/src/file_path.rs:14-23`). The Kokobrain commands accept plain `String` paths only. | All 30 commands that take a path (every vault and file command) | upstream: https://github.com/tauri-apps/plugins-workspace/tree/v2/plugins/fs/src |
| **iCloud Drive / document-picker vaults.** A picked folder on iOS is a `file://` URL under a security scope. `validate_vault_path` calls `canonicalize` (`utils/fs.rs:41`), which needs a real filesystem path. | `read_files_batch`, `scan_vault*`, `open_vault_db`, all writes | Inference from the scope model above. Not tested on a device. |
| **SQLite WAL and `.kokobrain/` inside a synced folder.** `open_database` puts `kokobrain.db` plus WAL and SHM sidecar files in `<vault>/.kokobrain/` (`db/mod.rs:36-46`, `:49`). The index cache sits there too (`index_cache.rs:46-50`). ADR-0019 already records the sync-engine conflict. | `open_vault_db`, `scan_vault_v2_cached`, `save_vault_cache` | UNVERIFIED on iOS file providers. Known general risk for WAL on network or file-provider filesystems. |
| **Dataless or evicted iCloud files.** `read_to_string` on an evicted file may trigger a download or fail. The code treats read failures as skip (`vault.rs:182-198`), but there is no timeout. | `scan_vault_v2*`, `get_tasks_in_section_v2`, `read_files_batch` | UNVERIFIED for this codebase. |
| **Watcher (`notify`).** On iOS, `notify` selects the kqueue backend (`notify/notify/src/lib.rs:340`, `:314-321` list includes `target_os = "ios"`). kqueue "keeps an open file descriptor for each watched file and directory" for a recursive watch (`notify` docs, `lib.rs` module doc around the kqueue section, https://github.com/notify-rs/notify/blob/main/notify/src/lib.rs). A large vault could exhaust the per-process fd limit. | `start_vault_watcher` | fd limit on iOS UNVERIFIED. Kqueue fallback path confirmed in source. |
| **Process memory.** sysinfo on iOS uses the `app_store` process stub. `memory()` returns 0 (`src/unix/apple/app_store/process.rs:48-49`), and `pid()` returns `Pid(0)` (`:28-29`). Routing: `src/lib.rs:49` includes `target_os = "ios"` in the unix backend; `src/unix/apple/mod.rs:14-16` selects the iOS module. | `get_process_memory` | Returns 0 for the stub. Whether `System::process(pid)` returns `Some` on iOS is UNVERIFIED (not read). |
| **Font list.** `list_system_fonts` is cfg'd to macOS (`fonts.rs:7`), so iOS returns `[]` (`:71-74`). CoreText is an Apple framework and the same FFI could compile for iOS. Apple doc page fetch returned only the title, so availability is UNVERIFIED (from memory: iOS 13+). Source: https://developer.apple.com/documentation/coretext/ctfontmanagercopyavailablefontfamilynames() | `list_system_fonts` | Needs a cfg change plus a device check. |
| **`created()` birthtime.** Rust std reads `st_birthtime` on Apple vendors (`library/std/src/sys/fs/unix.rs:652-656`, https://github.com/rust-lang/rust/blob/master/library/std/src/sys/fs/unix.rs). `scan_dir` and `collect_markdown_paths_with_metadata` use `created()` (`vault.rs:132`, `utils/fs.rs:93`). iOS is an Apple vendor, so this should work. | `scan_vault`, `scan_vault_v2*` | Source-level; not run on device. |
| **macOS-only Rust code outside this scope.** `lib.rs` has `#[cfg(target_os = "macos")]` blocks for the composer window and Space handling (`lib.rs:106-126`). `quick_capture/*` uses `objc2`. These are out of scope but must be gated for iOS. `Cargo.toml:72-74` gates `objc2` to macOS. | the app shell, not these commands | `lib.rs:222` already has `#[cfg_attr(mobile, tauri::mobile_entry_point)]`. |
| **Sync commands on the mobile IPC thread.** iOS main-thread budgets are tighter. `scan_vault`, `get_tasks_in_section_v2`, `read_files_batch`, `toggle_task_status` are sync and do file I/O (section 4). | those listed | Performance concern, not verified on device. |

## 8. Frontend call sites (for the transport facade)

Counts are files in `src/` excluding tests and `generated/`, from `rg -l`. Literal call sites are checked for the few commands where it matters.

| Command | Frontend references | Example literal call site |
|---|---|---|
| `scan_vault` | 7 files | `core/filesystem/fs.service.ts:79`, `fs.watcher.ts:162` |
| `scan_vault_v2_cached` | 3 | `features/backlinks/backlinks.service.ts:93` |
| `scan_vault_v2` | 3 (only as comment or contract) | none; `commands.ts:52` says "Rust-only" |
| `get_all_vault_entries_v2` | 10 | not checked literal |
| `read_files_batch` | 3 | `app/lifecycle/watcher-handler.service.ts:90`, `features/search/search.service.ts:28` |
| `start_vault_watcher` / `stop_vault_watcher` | 2 each | `fs.watcher.ts:201`, `:220` |
| `open_vault_db` / `close_vault_db` | 2 each | `app/lifecycle/app-lifecycle.service.ts:233`, `:601` |
| `save_vault_cache` | 2 | `app-lifecycle.service.ts:587` |
| `get_process_memory` / `set_tauri_debug_mode` | 2 each | `utils/debug.ts:144`, `:107` |
| `list_system_fonts` | 2 | `core/settings/sections/EditorSection.svelte:18` |
| Others (`get_backlinks_v2`, `create_note`, etc.) | 2 to 7 each | not checked literal |

Typed contract: `src/lib/contracts/commands.ts` lists the args and results. Entries for the in-scope commands are at lines 51-103 (vault and watcher) and 102, 152, 156 (files, debug, fonts). The main session reported one remaining raw `invoke` call; I did not re-verify it.

## 9. Effort estimate for `kokobrain-core` (my estimate, not measured)

| Work item | Size | Notes |
|---|---|---|
| Move `vault/`, `db/`, `utils/`, `search/` into a new crate | S (hours) | Already Tauri-free per grep. Check that `ts-rs` export still works in the new crate (`src/lib/contracts/generated/`). |
| Introduce `EventSink` trait; replace `app.emit` in 8 vault commands and the watcher callback | S | Sites listed in section 3. |
| Change 14 no-inner commands from `tauri::State` to `&VaultIndexState` and extract inline bodies | S to M | Section 5. |
| Fix the lock-across-I/O cases (`get_tasks_in_section_v2`, `toggle_task_status`, `propagate_type_rename`) | S | Keep the three-phase pattern from `get_unlinked_mentions_v2`. |
| Replace process-global `DB`, `FTS_DB`, `SYSTEM` with instance handles | M | Needed for a headless server or more than one vault. |
| Path-scope policy across section 6 (one function, applied in every path command) | M | Also closes `toggle_task_status`. |
| Auth for remote exposure (pairing token, per t3code) | M to L | Outside this scout's scope. |
| iOS storage: security-scope bookmarks, `file://` URL handling, DB location inside the app container vs a synced folder | L | Depends on the Model A vs B decision. |
| iOS-specific cfg for `list_system_fonts`, `get_process_memory`, watcher fd budget | S | Needs a device check. |

Total, mechanical part (first four rows): roughly 2 to 4 days. The rest depends on the model choice.

## 10. Not checked or verified

- No build, test, or device run (per rules). Every iOS statement is source-level or UNVERIFIED.
- Apple CoreText availability on iOS: UNVERIFIED (fetch returned title only).
- sysinfo `System::process(pid)` return value on iOS: UNVERIFIED.
- iOS per-process fd limit for kqueue: UNVERIFIED.
- Behavior of WAL SQLite on iOS file providers: UNVERIFIED.
- Literal frontend call sites for about 20 of the commands were not individually checked (file counts only).
- `src/lib/contracts/generated/` and the ts-rs export setup were not inspected.
- `error_monitoring.rs` and `quick_capture/` were not inspected in depth.
- Tauri's `State<T>: Deref` behavior is from memory, not checked against a source in this run.
