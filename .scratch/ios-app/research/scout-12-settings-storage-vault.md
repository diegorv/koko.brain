# Scout 12: settings, per-vault state, vault open flow, storage paths (iOS input)

Scope: where settings, recent vaults, `.kokobrain/` contents, trash, file history and logs live today; which paths assume macOS; what breaks on iOS. Read-only audit. No builds or tests run.

Path refs are `repo-relative path:line`. "Tauri src" refs are to tag `tauri-v2.12.5`; "plugin" refs to the pinned plugin tags. Lock versions: tauri 2.12.5, tauri-plugin-dialog 2.8.4, tauri-plugin-fs 2.7.1, tauri-plugin-opener 2.7.2 (`src-tauri/Cargo.lock`).

## 1. Summary

1. **Settings are per vault, not per app.** `<vault>/.kokobrain/settings.json` is the only persisted settings file. The only app-level state is three `localStorage` keys in the WebView (recent vaults, recent files, recent commands). Nothing in Rust reads settings from disk.
2. **Vault selection is blocked on iOS as the code stands.** `open({directory:true})` returns `FolderPickerNotImplemented` on mobile in the pinned dialog plugin (`dialog-v2.8.4 commands.rs:185-186`). `openVaultDialog` has no catch (`vault.service.ts:25-32`) and the Open button has no catch (`+page.svelte:12-14`), so the button silently fails on iPhone/iPad.
3. **Path assumptions to change on iOS.** `$DOCUMENT/kokobrain-vaults` and `$HOME/kokobrain-vaults` are the only allowed vault roots in capabilities. The log directory is `~/Library/Logs/<id>` on macOS but `~/Library/Application Support/<id>/logs` on iOS (Tauri `path/desktop.rs` `app_log_dir`, non-macOS branch). `$HOME` is not writable on iOS (Tauri doc).
4. **Desktop-only scope risk (plausible, not reproduced).** Directory picks are added to the fs scope at runtime only. The fs plugin has no persistence code, so a recent vault outside the two static roots may fail `exists()` after relaunch. Settings then fall back to defaults in memory (`settings.service.ts:34,166-178`).
5. **Corrupt-settings path overwrites the file.** `loadSettings` catch writes `DEFAULT_SETTINGS` back to disk (`settings.service.ts:166-173`). A truncated or unreadable file (for example an iCloud placeholder) is replaced, and the Todoist API token stored in it is lost (`settings.types.ts:220-221`).
6. **iCloud plus SQLite WAL is a known-bad combination.** `kokobrain.db` plus `-wal`/`-shm` sit in `<vault>/.kokobrain/` (`db/mod.rs:36-37`). SQLite says WAL "does not work over a network filesystem" and requires same-host shared memory (sqlite.org/wal.html). ADR-0019 already records this conflict (`docs/adr/0019-kokobrain-in-vault-data-dir.md:20,59`). Model files (~542 MB) also sit in the vault (`semantic/model.rs:66-73`).
7. **No Rust-side NSFileCoordinator.** The fs plugin iOS module wraps only `startAccessingSecurityScopedResource` for `file://` URLs (`fs-ios.rs:33-58`). No coordinated reads or writes were found in that file. All vault IO is plain `std::fs` or plugin calls.

## 2. Inventory: where each piece of state lives

| State | Storage | Scope | Format | Writer | Refs |
|---|---|---|---|---|---|
| App settings (theme, layout, editor, history, Todoist token, Sentry DSN, update channel, debug flags, ...) | `<vault>/.kokobrain/settings.json` | per vault | JSON, pretty-printed | `writeSettingsFile`, direct `writeTextFile` (not atomic) | `settings.service.ts:12-18,30-198`; `settings.types.ts:337`; `docs/RELEASE-CHANNELS.md:18` |
| Recent vaults (max 3) | `localStorage['kokobrain:recent-vaults']` | global to WebView origin | JSON array `{path,name,openedAt}` | `vaultStore.open`, `removeRecent` | `vault.store.svelte.ts:4,43-56,79-98`; `vault.logic.ts:3-11,13,24-32` |
| Recent files (quick switcher, max 20) | `localStorage['kokobrain:recent-files']` | global, not keyed by vault | JSON array of absolute paths | quick-switcher store | `quick-switcher.store.svelte.ts:1-41` |
| Recent commands (max 20) | `localStorage['kokobrain:recent-commands']` | global | JSON array of ids | command-palette store | `command-palette.store.svelte.ts:1-45` |
| Note index cache | `<vault>/.kokobrain/vault-index.msgpack` | per vault | MessagePack, versioned (`INDEX_SCHEMA_VERSION = 4`) | `save_vault_cache` on teardown; atomic write via `.tmp` then rename | `vault/index_cache.rs:9-18,46-50,55-` ; `commands/vault.rs:1412-1430`; `app-lifecycle.service.ts:587` |
| FTS5 index, file-history snapshots, semantic chunks, app_meta | `<vault>/.kokobrain/kokobrain.db` (+ `-wal`, `-shm`) | per vault | SQLite WAL, two connections | `open_vault_db` creates dir and DB | `db/mod.rs:29-88`; `db/schema.rs:21-35`; `commands/db.rs:5-11` |
| ONNX models (BGE-M3, reranker) | `<vault>/.kokobrain/models/<name>/` | per vault | model.onnx, tokenizer | `ModelManager`, downloads from huggingface | `semantic/model.rs:66-73`; `commands/semantic.rs:1469-1474` |
| Folder order | `<vault>/.kokobrain/folder-order.json` | per vault | JSON | `fs.service.ts` | `fs.service.ts:24-41` |
| File icons, recent icons | `<vault>/.kokobrain/file-icons.json` (legacy, see ADR-0027) and recent icons JSON | per vault | JSON | `file-icons.service.ts:19-32` | `docs/adr/0027-...md:13`; `raw-write-ratchet.test.ts:41` |
| Auto-move rules | `<vault>/.kokobrain/auto-move-rules.json` | per vault | JSON | `auto-move.service.ts` | `src/tests/lib/features/auto-move/auto-move.service.test.ts:126` |
| Bookmarks | `<vault>/.kokobrain/bookmarks.json` | per vault | JSON | bookmark-migration | `bookmark-migration.service.ts:11` |
| Todoist sent-task log | `<vault>/.kokobrain/todoist-sent.json` | per vault | JSON | `todoist.service.ts` | `todoist.service.ts:12,122-125` |
| Trash | `<vault>/.kokobrain/trash/` (manifest + `items/<uuid>/<name>`) | per vault | JSON manifest, moved files | `trash.service.ts` | see section 6 |
| File-history backup mirror | `<vault>/.kokobrain/snapshots-backup/<relpath>/<ts>.md` | per vault, opt-in | plain .md | `file-history.service.ts` | see section 6 |
| Frontend session logs | OS app log dir (`appLogDir()`), `<timestamp>.log` | per app install | plain text lines | `log.service.ts` | see section 7 |
| Quick-capture screenshots | `std::env::temp_dir()/qc-shot-*.png` | temp | image | `quick_capture/commands.rs:120-139` (desktop feature) | |
| Keys / secrets | none in code. ADR-0013 Keychain design is superseded (`docs/adr/0013-...md` frontmatter `status: superseded`). Todoist token is plaintext in settings.json. | | | | `settings.types.ts:220-221` |

Note: `DEFAULT_SETTINGS` is at `settings.store.svelte.ts:6`. Before a vault opens, the store holds defaults in memory only. Teardown calls `resetSettings()` (`app-lifecycle.service.ts:627`).

## 3. Settings load and save flow

- Load is step 1 of `initializeVault`: `loadSettings(vaultPath)` at `app-lifecycle.service.ts:196-198`. Persistence starts after the load so the first effect run does not overwrite the file (`app-lifecycle.service.ts:201-205`; `settings-persistence.svelte.ts:46-66`).
- Missing or empty file: write defaults (`settings.service.ts:34-53`). `writeSettingsFile` creates `.kokobrain/` with `mkdir` (`settings.service.ts:185-198`). The vault gets a `.kokobrain/` folder on first open even before the DB opens.
- Present file: field-by-field merge with defaults (`settings.service.ts:54-161`), then `normalizeSettings`, then save back (`settings.service.ts:162-163`). Every load rewrites the file.
- Parse or read error: `settings.service.ts:166-178` replaces the in-memory store with defaults and calls `saveSettings`, which overwrites the file on disk.
- Writes: `$effect` with a 500 ms debounce (`settings-persistence.svelte.ts:10,52-64`). Flush on quit through `flushSettingsPersistence` (`tauri-listeners.service.ts:70`). Teardown stops persistence first (`app-lifecycle.service.ts:571-575`).
- Atomicity: settings writes are a plain `writeTextFile` (`settings.service.ts:193`). The Rust side has `write_atomic` (`utils/fs.rs:16-32`) but settings do not use it.
- Settings are per vault. Updates channel is per vault (`docs/RELEASE-CHANNELS.md:18`). Sentry DSN, debug flags and the Todoist token are per vault too.
- Doc drift: `settings.types.ts:215` says semantic search "downloads ~118MB model". ADR-0019 says BGE-M3 is ~542 MB (`docs/adr/0019...md:11,36`). Not resolved here.

## 4. Vault selection, open and recent vaults

Flow (desktop):
1. Landing page `+page.svelte:12-14`: "Open Vault" calls `openVaultDialog()`. Recent list at `+page.svelte:36-60`, with a hard-coded hint "Allowed locations: ~/Documents/kokobrain-vaults/ and ~/kokobrain-vaults/" (`+page.svelte:44`).
2. `openVaultDialog` (`vault.service.ts:25-32`): native folder picker via `@tauri-apps/plugin-dialog` `open({directory:true})`, then `switchVault`.
3. `openRecentVault` (`vault.service.ts:38-52`): `exists(path)` check; if missing, remove from recent and toast (`:40-45`). If the check throws, it logs and continues (`:47-49`).
4. `switchVault` (`vault.service.ts:18-22`): save dirty tabs, drain write barriers, then `vaultStore.open(path)`.
5. `vaultStore.open` (`vault.store.svelte.ts:79-86`) sets path and name, updates recent list, persists to localStorage.
6. `+layout.svelte:65-79` reacts to `vaultStore.path` and calls `initializeVault(path)` or `teardownVault()`.

Recent vault rules: max 3 entries, most recent first, de-duplicated by path (`vault.logic.ts:13,24-32`). Name is basename of path (`vault.logic.ts:16-18`).

Rust-side vault validation: `validate_vault_path` canonicalizes and checks `is_dir` only (`utils/fs.rs:39-47`). No allow-list in Rust. The allow-list exists only in the Tauri capabilities (below) and in the UI text.

### 4a. Capability scope (fs)

`src-tauri/capabilities/default.json`:
- `fs:allow-read-dir` (`:37-64`), `fs:allow-read-text-file` (`:66-81`), `fs:allow-write-text-file` (`:83-100`), `fs:allow-mkdir` (`:103-`), `fs:allow-remove`, `fs:allow-rename`, `fs:allow-copy-file`, `fs:allow-exists` (`:189-`).
- Roots allowed: `$DOCUMENT/kokobrain-vaults/**`, `$HOME/kokobrain-vaults/**`, each with `.kokobrain` subpaths. Plus `$APPLOG/**` for log writes and exists (`:98-99` and `:137-141` region; `:216-219` for mkdir/exists).
- Nothing else. A vault under `~/Dev/...` gets access only through the dialog grant (below).
- `tauri.conf.json:30-44` separately sets the asset protocol scope to `$DOCUMENT/**`, `$HOME/MyFiles/**`, `$HOME/kokobrain-vault/**`, `$DESKTOP/**`, `$PICTURE/**`, `$DOWNLOAD/**`, `$HOME/Library/Caches/com.diegorv.kokobrain/**`. Two different allow-lists in one app.

Dialog grant: on desktop, after a folder pick the dialog plugin calls `allow_directory` on the fs scope (dialog plugin `commands.rs`, directory branch of `open`, desktop cfg, tag dialog-v2.8.4). This is a runtime grant.

Persistence of runtime grants: the fs plugin `scope.rs`, `lib.rs` and `commands.rs` at `fs-v2.7.1` contain no "persist" logic (grep empty). Inferred: runtime grants vanish on relaunch. UNVERIFIED against Tauri docs. If true, the failure path is: `openRecentVault` for a vault outside the two static roots gets a permission error on `exists()` (`vault.service.ts:40-49` logs and continues), then `loadSettings` `exists()` throws (`settings.service.ts:34`), falls to defaults (`:166-178`), and `saveSettings` throws again (`:172-175`). The vault opens with default settings and nothing persists. PLAUSIBLE, not reproduced (no run allowed).

### 4b. iOS blocker: folder picker

- Pinned plugin: `dialog-v2.8.4 src/commands.rs:185-186`: `#[cfg(mobile)] return Err(crate::Error::FolderPickerNotImplemented);` under the directory branch. `error.rs` message: "Folder picker is not implemented on mobile".
- iOS file picker exists (`dialog/ios/Sources/DialogPlugin.swift`, `UIDocumentPickerViewController(forOpeningContentTypes:asCopy:)` at `DialogPlugin.swift:119-121`). `asCopy` is `true` unless `fileAccessMode == .scoped` (`:121`). Folders are not offered by the plugin.
- Consequence: `openVaultDialog` rejects on iPhone and iPad. `handleOpenVault` (`+page.svelte:12-14`) has no catch, so the failure is an unhandled rejection.
- Recent-vault list is WebView localStorage, so it is per install and not shared with a desktop.

Options (not decided here):
- Custom iOS plugin code using `UIDocumentPickerViewController` with `UTType.folder`, then `fileAccessMode: scoped` and `startAccessingSecurityScopedResource` via the fs plugin (`fs-ios.rs:33-58`). UNVERIFIED that this works for folders with this plugin.
- Create the vault inside the app sandbox (`$DOCUMENT/kokobrain-vaults/<name>`), which is inside existing capability scope and needs no picker. Sandbox Documents is visible in the Files app only with Info.plist file-sharing keys (UNVERIFIED from memory; not checked in repo).

## 5. `.kokobrain/` contents (per vault)

Confirmed by code (inventory in section 2). Rules that apply:
- Dot-prefixed, so `scan_vault` and the watcher ignore it: `commands/vault.rs:78` comment, `fs.watcher.ts` (ADR-0017), and `vault/watcher.rs:66` and `:671-702` tests.
- Trash and snapshot backups are therefore not indexed (`src/tests/fixtures/calendar-vault.fixture.ts:53` comment).
- Writes are in the frontend `raw-write-ratchet.test.ts:24-44`: every raw `writeTextFile` site outside `core/filesystem` is listed with a reason. Settings, trash, file-history, file-icons, Todoist and auto-move are on that list.
- ADR-0019 says the directory must not be synced, documented in README (`docs/adr/0019...md:58`). `rg` for iCloud/Syncthing/Dropbox in `README.md` and `docs/` found no such guidance (file presence not re-checked).

## 6. Trash and file history

### Trash (frontend only)
- Layout: `.kokobrain/trash/trash-manifest.json` (`trash.logic.ts:4-6`), `.kokobrain/trash/items/<id>/<fileName>` (`trash.logic.ts:7-8,26-27`).
- ID: `crypto.randomUUID()` (`trash.logic.ts:46`). The doc comment at `trash.types.ts:3` still says "timestamp-based", which is stale.
- Delete: `mkdir` container then `rename(absolutePath, trashPath)` (`trash.service.ts:68-71`), manifest saved after (`:79`, `saveManifest` `:270-276`).
- Restore: `rename` back (`trash.service.ts:126`), unique name suffix (`trash.service.ts:284-293`), then re-index restored notes through `applyNoteChange` in `indexRestoredNotes` (defined in `trash.service.ts`; the exact line was not re-read).
- Permanent delete: `remove(itemDir, {recursive:true})` (`trash.service.ts:188`), empty all (`:209`).
- Not searched: any auto-purge or retention for trash. UNVERIFIED that none exists.
- iOS: `rename` across a File Provider boundary (for example from iCloud folder to a local folder) is not the normal path, since trash lives under the vault. Only a concern if the vault is in iCloud (see section 8).

### File history
- Store: SQLite table `snapshots(id, file_path, content TEXT, hash, size, created_at)` with indexes on path and hash (`db/schema.rs:21-30`). Full text per snapshot, deduplicated by content hash (`commands/history.rs:57-60`).
- Create: `save_snapshot` IPC from `file-history.service.ts:117`. Returns `false` when unchanged.
- Retention: `cleanup_history(retentionDays)` called at app start (`app-lifecycle.service.ts:273-277`), which deletes rows with `created_at < ?` (`db/history_repo.rs:84`).
- Backup mirror (opt-in, `settings.history.snapshotBackupEnabled`, `settings.types.ts:208-209`): plain `.md` per snapshot under `.kokobrain/snapshots-backup/<relpath>/<timestamp>.md` (`file-history.logic.ts:121-137`; write at `file-history.service.ts:119-143`). Content is stored twice (DB and backup). The backup mirror is not pruned by `cleanup_history` (UNVERIFIED; only the SQL table is touched by the cleanup query).
- All snapshot data sits in the same `kokobrain.db` as the FTS index and the semantic chunks, so it is inside the WAL risk in section 8.

## 7. Logs

- Frontend session log: `initLogSession` (`log.service.ts:43-57`) resolves `appLogDir()` (`:27-31`), creates `<YYYY-MM-DD_HH-mm-ss>.log`, appends through `writeTextFile(..., {append:true})` in a serial chain (`:61-74`). Enabled only when `debugLogToFile` or `debugTauriLogToFile` is on (`app-lifecycle.service.ts:218-226`). Heartbeat opt-in (`:227-229`).
- `debug()`/`error()` write to the file when `debugLogToFile` is on (`debug.ts:16-33`). Rust `debug_log` events go to the file when `debugTauriLogToFile` is on (`debug.ts` `startTauriDebugListener`).
- Rust side: `debug_log` writes to stderr and calls a sink that emits `tauri-debug-log` (`utils/logger.rs:47-59`, sink installed in `lib.rs` setup). Rust writes no log file of its own. No log plugin in `Cargo.toml`.
- Path on macOS: `$HOME/Library/Logs/com.diegorv.kokobrain/` (Tauri `path/desktop.rs` `app_log_dir`, macOS branch; bundle id `tauri.conf.json:5`).
- Path on iOS (derived from source, not run): `app_log_dir` non-macOS branch is `dirs::data_local_dir()/<id>/logs`. On iOS `dirs` maps `data_local_dir` to `$HOME/Library/Application Support` (`dirs-rs src/mac.rs:13`, compiled for `target_os="ios"` per `dirs-rs src/lib.rs:23-25`). Result: `~/Library/Application Support/com.diegorv.kokobrain/logs/`.
- Opening the log folder uses `openPath` from the opener plugin (`log.service.ts:179-187`). Opener is desktop-only in practice; UNVERIFIED on iOS.
- Doc drift: `settings.types.ts:363` and `:365` say logs go to ".kokobrain/logs/". Code uses `appLogDir()`. The `log.service.ts:27,38` comments and `docs/SEARCH.md:190` are right for macOS.
- Test fixture uses bundle id `com.kokobrain.app` (`src/tests/lib/utils/log.service.test.ts:34`), which differs from the real id. Test-only.
- Unrelated but relevant to iOS: `capabilities/default.json` grants `opener:allow-open-path` on `$APPLOG` (`:24-34`).

## 8. Storage on iOS: path assumptions and iCloud risks

### 8a. Paths that assume macOS or desktop

| Assumption | Where | iOS behaviour |
|---|---|---|
| `$HOME/kokobrain-vaults` and `$DOCUMENT/kokobrain-vaults` are the only vault roots | `capabilities/default.json:37-215`; UI text `+page.svelte:44` | Only `$DOCUMENT` is reachable for user-created vaults. `$HOME` is the sandbox root. Tauri doc: "iOS: Cannot be written to directly, use one of the app paths" (`path/desktop.rs:152-153`). |
| Folder picker | `vault.service.ts:25-32` | Rejects (`dialog-v2.8.4 commands.rs:185-186`). |
| Log dir `~/Library/Logs/<id>` | `log.service.ts:27,38`; Tauri `desktop.rs` macOS branch | Becomes `Application Support/<id>/logs` (derived). Comments wrong on iOS. |
| `$HOME/Library/Caches/com.diegorv.kokobrain/**` asset scope | `tauri.conf.json:42` | Path is valid in sandbox; scope entry is macOS-named. |
| `$DESKTOP`, `$PICTURE`, `$DOWNLOAD`, `$HOME/MyFiles` asset scope entries | `tauri.conf.json:33-41` | Desktop folders do not exist on iOS. Harmless but dead. |
| Global shortcuts, updater, process, opener, menu bar | `lib.rs:257` (`set_menu`), `:279-287` (`opener`, `fs`, `dialog`, `shortcut`, `updater`, `process`); `lib.rs:268` composer window | Desktop plugins. Not for this scout, but the setup closure needs a mobile split. UNVERIFIED which of these error at runtime on iOS. |
| Quick-capture temp screenshots | `quick_capture/commands.rs:120-139` | Uses `std::env::temp_dir()`. Desktop feature. |
| Keychain | None (ADR-0013 superseded) | Todoist token sits in plaintext `settings.json`. |
| `localStorage` for recent vaults | `vault.store.svelte.ts:43-56` | WebKit storage on iOS lives in the app sandbox. Location and eviction UNVERIFIED. |

### 8b. Vault inside iCloud Drive (File Provider)

- Vault IO is plain `std::fs` and plugin calls. Rust walks with `read_dir` (`utils/fs.rs:124-`), writes via `write_atomic` (`utils/fs.rs:16-32`) and `rename`. No coordination.
- The fs plugin's iOS module wraps only `startAccessingSecurityScopedResource` for `file://` URLs (`fs-ios.rs:33-58`) and `stopAccessing...` (`:95-134`). No `NSFileCoordinator` in that file (grep). Apple's NSFileCoordinator page is the coordination API for iCloud and other file providers (https://developer.apple.com/documentation/foundation/nsfilecoordinator). WebFetch returned only the title, so the description is from memory and UNVERIFIED.
- Security-scoped access is needed for any URL from the Files picker, and it is not persisted across launches by the fs plugin (same caveat as desktop). A recent-vault entry for an iCloud folder therefore needs a re-pick on each launch unless bookmarks are stored (UNVERIFIED for this plugin version; no bookmark code found).
- SQLite WAL: https://www.sqlite.org/wal.html says "All processes using a database must be on the same host computer; WAL does not work over a network filesystem", and the wal-index shared memory "means that all readers must exist on the same machine". `kokobrain.db-shm` is an mmapped file in the database directory. Putting the DB in an iCloud-managed folder is outside the WAL contract. Whether File Provider behaves like a network FS for mmap is UNVERIFIED.
- Replication of `-wal` and `-shm` by iCloud is the exact failure ADR-0019 warns about (`docs/adr/0019...md:59`).
- Model files: `.kokobrain/models` holds about 542 MB (ADR-0019:11). Syncing it through iCloud is the "huge payload" failure in ADR-0019:20. Every settings write (500 ms debounce, `settings-persistence.svelte.ts:10`) and every snapshot also syncs.
- Recommended split for planning (not implemented): keep DB, models and index cache in app-local storage (`$APP_DATA` / `Application Support`), keep only notes and a small manifest in the vault. This reverses ADR-0019 and needs a new ADR.

### 8c. Vault inside the app sandbox (no iCloud)
- Simplest. `$DOCUMENT/kokobrain-vaults/<name>` is in capability scope. No picker needed. Backup is via iTunes/Finder or iCloud device backup (UNVERIFIED from memory).
- The DB WAL is local, so the SQLite contract holds.
- Data visible in the Files app only with file-sharing Info.plist keys (UNVERIFIED; not checked in repo).

## 9. Which paths must move (checklist for the plan)

| Item | Today | iOS target |
|---|---|---|
| Per-vault `settings.json` | in vault | keep in vault for portability (ADR-0019), but do not store secrets there; move Todoist token to Keychain |
| Recent vaults, recent files, recent commands | WebView localStorage, global | device-local app store; recent-vault entries need bookmarks or sandbox-relative paths |
| `kokobrain.db`, `vault-index.msgpack`, `models/` | in vault | app-local dir per vault id, not in the vault |
| Trash, snapshots-backup | in vault | stay in vault (plain files, small) or move with the DB |
| Session logs | `appLogDir()` | `Application Support/<id>/logs` on iOS; fix the comments |
| Vault roots | two desktop roots in capabilities | `$DOCUMENT/kokobrain-vaults` for sandbox vaults; picker path only after a plugin change |

## 10. Unverified and not checked

- Runtime behaviour of any of the above on iOS or macOS. No build or run was permitted.
- Whether Tauri's fs scope grants persist across launches (inferred from source absence, `fs-v2.7.1`).
- Whether iOS `dirs::data_local_dir()` resolves to `Library/Application Support` in all Tauri iOS builds (source reading only).
- Apple NSFileCoordinator and UIFileSharingEnabled details (WebFetch returned title only).
- WKWebView localStorage location and eviction on iOS (not checked).
- Whether trash or snapshot backups have retention beyond what is listed.
- Whether `snapshotBackupEnabled` defaults to true (not checked).
- ADR anchors are stale. ADR-0019 cites `db/mod.rs:18-23` (now `:36-37`) and `semantic/model.rs:32-38` (now `:66-73`). ADR-0019:61 says Keychain service "lives in the OS keychain", but ADR-0013 is superseded and no keychain code exists.

## 11. Sources

- SQLite WAL: https://www.sqlite.org/wal.html (fetched; quotes in section 8b)
- NSFileCoordinator: https://developer.apple.com/documentation/foundation/nsfilecoordinator (fetched; title only, UNVERIFIED description)
- tauri-plugin-dialog v2.8.4 `src/commands.rs`, `src/error.rs`, `ios/Sources/DialogPlugin.swift`: https://github.com/tauri-apps/plugins-workspace/tree/dialog-v2.8.4/plugins/dialog (fetched via `gh api`)
- tauri-plugin-fs v2.7.1 `src/ios.rs`, `src/scope.rs`, `src/commands.rs`: https://github.com/tauri-apps/plugins-workspace/tree/fs-v2.7.1/plugins/fs (fetched via `gh api`)
- Tauri v2.12.5 `crates/tauri/src/path/{mod.rs,desktop.rs}`: https://github.com/tauri-apps/tauri/tree/tauri-v2.12.5/crates/tauri/src/path (fetched via `gh api`)
- dirs-rs `src/lib.rs`, `src/mac.rs`: https://github.com/dirs-dev/dirs-rs (fetched via `gh api`)
