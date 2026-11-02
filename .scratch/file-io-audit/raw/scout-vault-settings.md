# Scout report: slice "vault-settings" (vault open/switch, app-owned files under .kokobrain)

Scope: read-only mapping. No repo file was edited; no cargo, pnpm, vitest or build was run.
Labels: [READ] = seen in code at the cited line. [INFER] = reasoning from code, not run. [FETCHED] = third-party source fetched from GitHub (see section 6; the fetch tool returned a model-summarized view, so verify exact lines before quoting).

## 1. Entry points and call chains

### 1a. Vault switch (user action to disk)

1. UI: `openVaultDialog()` (src/lib/core/vault/vault.service.ts:25-32), `openRecentVault()` (vault.service.ts:38-52, checks `exists(path)` and removes stale recents), deep link `switchVault` (src/lib/features/deep-link/deep-link.service.ts:166). Entry UI: src/routes/(app)/+page.svelte:13, 17.
2. `switchVault(path)` (vault.service.ts:18-22):
   - `await saveAllDirtyTabs()` (vault.service.ts:19 -> src/lib/core/editor/editor.service.ts:234-247). Return value is a list of FAILED paths. It is NOT checked; switchVault never throws on save failure [READ].
   - `await drainPendingWrites()` (vault.service.ts:20 -> src/lib/core/vault/write-barrier.service.ts:37-41). Only registered barrier: event-calendar (src/lib/app/boot.ts:37) [READ].
   - `vaultStore.open(path)` (vault.service.ts:21 -> src/lib/core/vault/vault.store.svelte.ts:79-86). Sets `vaultPath` and `vaultName` first, then `persistRecentVaults` to localStorage (lines 84-85).
3. `+layout.svelte:71-76`: `$effect` on `vaultStore.isOpen`/`path` calls `initializeVault(path)` or `teardownVault()` (the latter when no vault is open).
4. `initializeVault(B)` (src/lib/app/lifecycle/app-lifecycle.service.ts:133-527):
   - Unconditional block, lines 137-168: `vaultStore.resetIndexReady()`, `invalidateVaultEntries()`, `resetEventCalendar()`, `void stopSettingsPersistence()` (150), `void disableSentry()` (153), unregister note-change consumers (159-160), unsubscribe file-history (161-164) and search-index (165-168) hooks.
   - Dirty-previous-vault branch, lines 172-189, runs ONLY if `unsubscribeFileChange` is set (step 7 was reached): `saveAllDirtyTabs()` (180, result ignored), `drainEventCalendarWrites()` (186), `teardownVault()` (188).
   - `initVersion` counter (191). Checked after awaits at lines 200, 240, 296, 322, 373 and inside timers at 406, 447, 451, 466.
5. Step 1, settings (198-225): `loadSettings(B)` (settings.service.ts:30), then `configureSentry`, `startSettingsPersistence(B)` (210), optional log session.
6. Step 2, DB (233): `invoke('open_vault_db')` -> commands/db.rs:7 -> db/mod.rs `open_database` (line 37 builds `.kokobrain/kokobrain.db`; creates dir, WAL, schema, second FTS connection). On failure: toast and return (line 238), persistence stays running.
7. Step 3 (285-295): `Promise.all([migrateBookmarksToFavorites, loadRecentIcons, loadTrash, loadAutoMoveConfig])`. `cleanup_history` fire-and-forget at 275 (`call('cleanup_history', { retentionDays })`).
8. Step 4 (313-349): `buildIndex(B)` (backlinks.service.ts:56-67 -> `runBuildIndex` 85-109 -> `invoke('scan_vault_v2_cached')` -> commands/vault.rs:1198 `scan_vault_v2_cached_inner`) in parallel with `loadDirectoryTree(B)` (fs.service.ts:74-102 -> `scan_vault` IPC plus `loadFolderOrder` 42-71). Index readiness: `markIndexReady()` (329) only if scan succeeded. `indexedVaultPath = vaultPath` (354) only on success.
9. Step 4b (360-371): `get_all_vault_entries_v2` -> `setContentOrder`.
10. Step 5b (403-416): `setTimeout(0)` for buildTagIndex, buildTaskIndex, buildPropertyIndex, buildFrontmatterIconIndex.
11. Step 6 (421-473): `buildSearchIndex()` async; semantic init after `SEMANTIC_INIT_DEFER_MS` = 3000 ms timer (445).
12. Step 7 (481-501): debounced watcher batch (300 ms), `onFileChange`, `startWatching(B)` (not awaited, 499).
13. Step 9 (515-523): `setTimeout(0)` -> autoOpenDailyNote, maybeAutoCheckForUpdates.

### 1b. Teardown (`teardownVault`, app-lifecycle.service.ts:533-648)

- Only reached from +layout.svelte:76 (no vault open) and app-lifecycle.service.ts:188 (previous vault finished step 7).
- Clears timers (539-546), cancels debounced watcher handler, unsubscribes listeners and hooks (553-568), `void stopSettingsPersistence()` (575), `stopWatching()` (576), `disableSentry` (580).
- Cache save: `call('save_vault_cache', { path: indexedVaultPath })` fire-and-forget (586-591). Keyed by `indexedVaultPath`, not `vaultStore.path` (comment 101-107, 583-585) [READ].
- `call('shutdown_semantic')` (597), `call('close_vault_db')` (601), both fire-and-forget. `closeFileHistory()` (604).
- Resets: `vaultStore.resetIndexReady()` (614), `invalidateVaultEntries()` (615), `resetEditor()` (622; clears tabs, editor.store.svelte.ts:165-167), `resetSettings()` (627; in memory only, `settingsStore.reset()`), trash, bookmarks/auto-move, etc. (627-647).

### 1c. Settings load and persistence

- `loadSettings(path)` (settings.service.ts:30-179):
  - missing file (34-43): writes DEFAULT_SETTINGS via `saveSettings` (39).
  - empty or whitespace file (45-53): same, writes defaults (49).
  - parse (54) and merge field by field (55-161), `setSettings(normalizeSettings(merged))` (162), then WRITE-BACK `saveSettings(vaultPath)` (163).
  - catch (166-178): logs, `setSettings(fallback defaults)` (170), `saveSettings` again (172), no toast.
- `startSettingsPersistence(path)` (settings-persistence.svelte.ts:46-66): captures path, sets `lastWritten` baseline (50), starts `$effect.root` that schedules a 500 ms debounced `flushSettingsPersistence` (53-63).
- `flushSettingsPersistence` (73-87): reads store synchronously, writes via `writeSettingsFile(session.path, content)` (82), sets `lastWritten` on success (83), logs and swallows failure (84-86).
- `stopSettingsPersistence` (96-105): calls flush (its synchronous part captures content before `dispose`, 101-103), then disposes and clears `session`.
- Quit path: tauri-listeners.service.ts:55-62 asks "Close anyway and lose unsaved changes?" when `saveAllDirtyTabs()` reports failures; then `flushSettingsPersistence()` at 70 [READ].
- Layout persistence (layout.service.ts:11, 16, 21, 33) only calls `settingsStore.updateLayout`. Layout is stored inside settings.json and is written by the same debounced effect. No separate file [READ].

### 1d. Rust index cache

- `read_snapshot` / `write_snapshot` / `write_snapshot_atomic` / `cache_file_path` (src-tauri/src/vault/index_cache.rs:47-105).
- Load (commands/vault.rs:1207-1235): schema mismatch (1209-1218) -> full scan, file kept, overwritten later; any read or decode error (1226) -> `remove_file` the cache (1231) -> full scan.
- Reconcile (1287-1376): `validate_vault_path` (1287, AFTER the cache read), walk with mtime/ctime/size, reuse cached entry when `cached.modified_at == *mtime` (1297), re-read otherwise. Deleted entries dropped. `write_snapshot` only if something changed (1370).
- Full scan write (1259).
- `save_vault_cache(path, state)` (commands/vault.rs:1412-1424): reads the in-memory index, writes snapshot to the caller-supplied `path`, no `validate_vault_path` (contrast 85, 174).

## 2. Every disk write, delete and rename in the slice

| # | Artifact | Site | How written | Preconditions | Error handling | State change on success / failure |
|---|---|---|---|---|---|---|
| W1 | `<vault>/.kokobrain/settings.json` | settings.service.ts:185-198 `writeSettingsFile` (exists then mkdir non-recursive then writeTextFile) | NOT atomic: `writeTextFile` truncates and writes in place [FETCHED] | none beyond dir existence | loadSettings catch (166-178) swallows the write-back failure and writes defaults; persistence logs and does not rethrow (settings-persistence.svelte.ts:84-86) | Success: `lastWritten` updated (83). Failure: `lastWritten` unchanged, so the next effect run retries. |
| W1a | same | settings.service.ts:163 write-back on every successful load | | | | see lead L2 |
| W1b | same | settings.service.ts:39, 49, 172 defaults written on missing, empty, or failed-parse | | | | see lead L1 |
| W2 | `.kokobrain/folder-order.json` | fs.service.ts:46-50 template, only when `exists` is false | not atomic | | errors caught in loadFolderOrder (66-70), which sets `{}` and does NOT write | no other writer found (grep) [READ] |
| W3 | `.kokobrain/vault-index.msgpack` (+ `.tmp`) | index_cache.rs:55-78 `write_snapshot_atomic`: create tmp, write_all, sync_all, rename | tmp file `vault-index.msgpack.tmp` is shared by all writers (line 64). No parent-dir fsync. | create_dir_all on parent (59-62) | scan writes (vault.rs:1259, 1370) only debug_log failures; save_vault_cache (1424) returns Err to JS, which logs (app-lifecycle.service.ts:587-589) | cache only, rebuildable from disk |
| W3d | same, deletion | commands/vault.rs:1231 `remove_file` on any read or decode error | | | logged only | cache only |
| W4 | `.kokobrain/trash/manifest` (path from trash.logic.ts:21 `getTrashManifestPath`) | trash.service.ts:269-276 `saveManifest`: exists/mkdir recursive then writeTextFile | NOT atomic [FETCHED for writeTextFile] | none | callers differ: moveToTrash 79-82 SWALLOWS; restoreItem 139-141 swallows; deletePermanently 191 and emptyTrash 213 propagate | in-memory list used as the source of truth for the rewrite (see L3) |
| W4a | trash container moves | trash.service.ts:49-100 `moveToTrash`: mkdir trash/items/<id>, `rename(absolutePath, trashPath)`, then manifest, then `addItem` (83). Catch removes the container only when rename did not happen. | rename within vault | | | file is the only copy once renamed |
| W4b | restore | trash.service.ts:110 `restoreItem`: rename trash item to original path, remove container, manifest at 139 | | | | |
| W4c | permanent delete | trash.service.ts:185-197 `deletePermanently`: `remove(itemDir, recursive)` (188), then manifest (191) | | | throws | |
| W4d | empty trash | trash.service.ts:205-217 `emptyTrash`: `remove(trash/items, recursive)` (209), then manifest `[]` (213) | removes the whole items dir, including folders that the manifest does not list | | throws | |
| W5 | `.kokobrain/auto-move-rules.json` | auto-move.service.ts:69-86 `saveAutoMoveConfig`, writeTextFile at 81 | not atomic | | rethrows (84-85) | only caller AutoMoveSection.svelte:35 |
| W6 | `.kokobrain/bookmarks.json` | bookmark-migration.service.ts:101-102 `remove(filePath)` after migration | deletion | runs only when `failed.length === 0` (93-99) | on remove failure, toast (103-106) | parse failure at 26-28 returns `[]`, so the file is deleted (L8) |
| W7 | `.kokobrain/todoist-sent.json` | todoist.service.ts:122-129 (ensure dir, writeTextFile at 129) | not atomic | | not read in detail | out of depth for this slice |
| W8 | `.kokobrain/kokobrain.db` (+ `-wal`, `-shm`) | db/mod.rs:29-~75 `open_database`: create_dir_all, Connection::open, WAL, `schema::create_tables`, second FTS connection. No delete. | SQLite | | errors returned to JS, toast at app-lifecycle:236 | `close_database` (db/mod.rs) only drops the two connections |
| W9 | snapshot retention deletion | commands/history.rs:143-155 `cleanup_history`: deletes snapshots older than retention+30 days and duplicates in the medium window, in one transaction. Triggered at every vault open (app-lifecycle.service.ts:273-277), fire-and-forget. | DB delete | retentionDays is not validated in normalizeSettings [READ: settings.logic.ts has no retentionDays reference] | caught and logged | note history is the recovery store (see L10) |
| W10 | `.kokobrain/logs/*` | log.service.ts:69 appendLog, append mode | | | | not read in detail |
| W11 | `.kokobrain/file-icons.json`, recent icons | file-icons.service.ts:65 (save), load at ~44-56 | not atomic | | load falls back to [] (on error) without writing | low value |

Not in slice but under `.kokobrain`: `models/` (semantic/model.rs:66-70, commands/semantic.rs:1469), `snapshots-backup/` (file-history.service.ts:143). Not read.

## 3. Concurrency: timers, in-flight promises, queues, interleavings

Timers and deferred work:
- Settings persistence: 500 ms debounce, module-level `timer` and `lastWritten` shared by all sessions (settings-persistence.svelte.ts:10, 19, 22). Not per session.
- Watcher batch: 300 ms debounce (app-lifecycle.service.ts:489-493) + `serializeWithRerun` (481).
- Semantic init: 3000 ms timer (445-472), cleared in teardown (539-542). Guarded by `initVersion` inside.
- Secondary builders: `setTimeout(0)` (404-415), cleared in teardown (543-546).
- Post-open side effects: `setTimeout(0)` (515-523), guarded by `initVersion`.
- Backlinks build queue: `isBuilding`, `pendingRebuild`, `inflightBuild` (backlinks.service.ts:9-11, 56-67, 85-109). A build queued during a running scan replays with the latest path. `resetBacklinks` (257-263) does not clear `isBuilding`.

Fire-and-forget (not awaited, ordering only by IPC order):
- `stopSettingsPersistence` (150, 575): flush write runs after the function returns; content captured synchronously.
- `save_vault_cache` (586), `shutdown_semantic` (597), `close_vault_db` (601): not awaited. `open_vault_db` for B (233) is awaited, but it is sent after several awaits, so ordering is practically FIFO. Tauri command threading was NOT verified [INFER, see L13].
- `cleanup_history` (275), `startWatching` (499), `executePendingAction` (503).

Guards and gaps:
- `initVersion` guards are checked after `loadSettings` (200) and after step 3 (296), but NOT before `settingsStore.setSettings` inside `loadSettings` (settings.service.ts:162). Step 3 loaders (loadTrash, loadAutoMoveConfig, loadRecentIcons, migrateBookmarksToFavorites) have no version check inside them; only the `Promise.all` result is checked at 296. loadDirectoryTree (fs.service.ts:74-102) writes `setFileTree` with no version check.
- Teardown is skipped when the previous init has not reached step 7 (app-lifecycle.service.ts:172). Then `resetEditor`, `resetTrash`, `resetSettings`, `stopWatching` and `save_vault_cache` do NOT run for the previous vault. The unconditional block (137-168) covers event-calendar, settings persistence, Sentry and some hooks, but not editor tabs, trash or the index cache (L7).
- Settings are written from `settingsStore.settings` at write time, so a superseded load that calls `setSettings` after the new vault's load leaves the new vault's persistence with the old vault's content as its baseline (settings-persistence.svelte.ts:50) (L11).
- Concurrent `writeSettingsFile` calls (settings-persistence flush, stop flush, saveSettings from load) are not serialized. Write order is not guaranteed, so an older content can land last (L15).
- `moveToTrash`, `deletePermanently`, `emptyTrash`, `restoreItem` read `trashStore.items` at call time and write the whole manifest. There is no queue. `addItem` happens after the awaited save (83), so overlapping calls can each write a list that lacks the other's item (L5).
- Tauri fs writes are per call with no lock; `saveAllDirtyTabs` runs `Promise.all` over saves (editor.service.ts:240).
- Rust: `index_cache` writers share the tmp filename (index_cache.rs:64). Scan (spawn_blocking) and save_vault_cache (sync command) can overlap for the same vault (L12). `VaultIndexState` is a RwLock (vault.rs:1126, 1247, 1352 take write; 1416 takes read).

## 4. Leads (hypotheses; confidence stated)

Ranked by data at risk. "Known" marks overlap with .scratch/architecture-stability/issues.

L1. Settings file overwritten with defaults after any load failure (HIGH code confidence; trigger MEDIUM).
- Code: settings.service.ts:34-43 (missing), 45-53 (empty), 54 (JSON.parse), 166-172 (catch writes `DEFAULT_SETTINGS` through `saveSettings`). The catch is also reached by `readTextFile` failure, including invalid UTF-8 (plugin readTextFile throws on it [INFER]).
- Scenario: user hand-edits `.kokobrain/settings.json` and leaves a trailing comma, or a crash mid-write leaves a truncated file (writeTextFile is non-atomic [FETCHED]). Next open: JSON.parse throws, catch logs to console, store and file become defaults. Lost: Todoist token, periodic-note folders, templates, tag colors, editor settings, sentry DSN, update channel. No backup of the original bytes, no toast.
- Not a backup problem in code: nothing copies the bad file aside.

L2. A failed write-back after a successful read replaces the in-memory settings with defaults (MEDIUM-HIGH code confidence; trigger: read-only or unwritable vault).
- Code: settings.service.ts:162-163 `setSettings(merged)` then `await saveSettings` on every load. Any throw goes to catch 166, which calls `setSettings(fallback)` (170).
- Scenario: vault on a read-only volume or a `.kokobrain` dir without write permission. Load reads the valid file, the write-back at 163 fails, catch replaces the store with defaults and logs. The session runs on defaults (layout, periodic-note folders, templates, Todoist) with no toast. The file on disk is not overwritten while writes keep failing. If the second write at 172 succeeds (transient failure), the file is overwritten with defaults at once. If writes resume later, the first user change writes the defaults plus that change to disk.

L3. Trash manifest rewritten from an empty or partial in-memory list after a failed load (HIGH code confidence; trigger MEDIUM).
- Code: trash.service.ts:24-41 `loadTrash` sets `[]` on any read or parse error (catch 38-40). `parseTrashManifest` returns `[]` for invalid JSON and drops entries failing `isValidTrashItem` (trash.logic.ts:58-66, 95). `saveManifest` (269-276) writes the whole list: `[item, ...trashStore.items]` (trash.service.ts:79), `updatedItems` (139), filtered list (191), `[]` (213). Write is non-atomic [FETCHED].
- Scenario A: manifest truncated by a crash during a write. Next open: loadTrash gives `[]`, the trash panel is empty. User deletes one note: manifest now lists only that note. The previously trashed folders stay in `.kokobrain/trash/items/<id>/` with no UI entry, so they cannot be restored. Empty trash (209) then deletes them.
- Scenario B: a schema change makes some entries fail `isValidTrashItem`; the next trash action drops them from the manifest permanently.
- Not known in .scratch issues.

L4. Failed manifest save after a successful move is swallowed; the item is invisible until the next trash action (MEDIUM confidence, trigger LOW-MEDIUM).
- Code: trash.service.ts:79-82 catches and logs; `addItem` (83) still runs. The comment says the entry "would just be re-persisted on the next save".
- Scenario: note deleted, manifest write fails (read-only, disk full). The app quits or crashes before the next trash action. The file is in `trash/items/<id>/` and unlisted.

L5. Concurrent trash operations can drop an entry from the manifest (LOW-MEDIUM; caller concurrency INFER).
- Code: each call snapshots `trashStore.items` at line 79 before its own `addItem` (83). Two overlapping `moveToTrash` calls both snapshot the same list; the last `writeTextFile` wins, so one item is unlisted. No queue. Only caller found: fs.service.ts:167-186 (`deleteItem`), which wraps `applyPathChange`. Whether two deletes can run concurrently from the UI was not checked.

L6. Failed note saves are discarded on vault switch; no confirmation (HIGH code confidence; trigger MEDIUM). Related to KNOWN issue 34 (ordering fixed; failure outcome not covered).
- Code: `switchVault` ignores the failed-path list (vault.service.ts:19). `saveFileByPath` only toasts (editor.service.ts:173-176). initializeVault retries once (app-lifecycle.service.ts:180) and ignores the result. `teardownVault` -> `resetEditor` -> `editorStore.reset()` clears `tabs` (622, editor.service.ts:412-417, editor.store.svelte.ts:165-167). The comment at app-lifecycle.service.ts:176-179 acknowledges "switchVault opens the new vault anyway".
- Asymmetry: quit asks before discarding (tauri-listeners.service.ts:55-62); vault switch does not.
- Scenario: note is read-only (chmod), or disk is full. User edits it, then opens another vault from the recent list. A toast flashes "Failed to save file.", the vault opens, the tab and its edits are gone with no prompt. The note's own content is still on disk in the old state.

L7. Editor tabs of vault A can survive into vault B when the switch happens before A reaches step 7 (MEDIUM-LOW; INFER).
- Code: teardown branch at app-lifecycle.service.ts:172-189 is skipped when `unsubscribeFileChange` is null. `resetEditor` is called only from teardown (622; grep found no other caller). The unconditional block (137-168) does not reset editor tabs.
- Scenario: vault A with a long index step 4. Tree loads (fs.service.ts:74-102) while `buildIndex` still runs, so the user can open a note. Switching to B before step 7 leaves A's tabs open in B. Dirty A tabs are then saved to their absolute paths (absolute paths are used everywhere, see CLAUDE.md rule 9), so content is not lost, but B shows A's notes and A's file-history / search after-save observers are unregistered. Whether tabs can open during steps 1-6 was not verified by running.

L8. Legacy bookmarks.json is deleted after a JSON parse failure, with no copy (HIGH code confidence; deliberate in code; low severity).
- Code: bookmark-migration.service.ts:26-28 logs "deleting it with no bookmarks moved", returns `[]`. Lines 93-107 then `remove(filePath)` because `failed.length === 0`.
- Scenario: a corrupted bookmarks file is removed on the next open. Data is references only (paths), and the feature was removed (ADR 0033 per comment). Listed because the settings path keeps the bad file and this one deletes it.

L9. Auto-move rules overwritten after a failed load, on the next user save (MEDIUM-LOW; trigger is a corrupt or unreadable file).
- Code: auto-move.service.ts:38-64 `loadAutoMoveConfig` sets `DEFAULT_CONFIG` on any error (62) or empty file (51). `saveAutoMoveConfig` (69-86) writes the store (81). Only caller: AutoMoveSection.svelte:35. Whether that call fires on mount or only on user edit was NOT verified.
- Scenario: rules file corrupt. Store is empty. User adds one rule in Settings, save writes only that rule; previous rules are gone from disk.

L10. Snapshot history is deleted at every vault open by retention, and retention is not validated on load (LOW trigger; behavior is by design).
- Code: app-lifecycle.service.ts:273-277 calls `cleanup_history` each open. commands/history.rs:143-155 deletes snapshots older than retentionDays+30 (all) and medium-window duplicates. Default 7 (settings.store.svelte.ts:96). UI clamps 1..365 (FileHistorySection.svelte, `clampRetentionDays`). `normalizeSettings` (settings.logic.ts:147-...) does not touch retentionDays, so a hand-edited `0` makes the cutoff now-30 days.
- Scenario: `"retentionDays": 0` in settings.json. Next open deletes every snapshot older than 30 days. Hand edit only.

L11. Superseded load writes the wrong vault's settings into the new vault (LOW likelihood, HIGH impact if hit; INFER on timing).
- Code: `loadSettings(A)` calls `setSettings` (settings.service.ts:162) before the version check (initializeVault:200). If `initializeVault(B)` starts while A's `readTextFile` is pending, and A's read resolves after B's, the store holds A's settings. `startSettingsPersistence(B)` then takes them as the baseline (settings-persistence.svelte.ts:50). The first mutation writes A's whole settings object into B's `settings.json`.
- Same shape for step 3 loaders (loadTrash, loadAutoMoveConfig, loadRecentIcons, migrateBookmarks) when the switch happens before step 7 and no teardown runs: A's late `setItems` lands in B, and B's next `saveManifest` writes A's trash entries into B's manifest (trash.service.ts:79). Not destructive by itself; restores of those rows would fail.

L12. Index cache: teardown save overlapping a scan write for the same vault, and whole-second mtime keys (LOW; self-heals).
- Code: `save_vault_cache` is fire-and-forget (app-lifecycle.service.ts:586-591). Scan writes can run at the same time (vault.rs:1259, 1370). Both use `vault-index.msgpack.tmp` (index_cache.rs:64) with create-truncate-write-rename. Interleaving can yield mixed bytes or an ENOENT on the second rename. A decode error later deletes the cache (vault.rs:1226-1231) and forces a full scan. Entries are keyed by absolute path, so a cache from another vault would only cause misses, not wrong entries.
- mtime is whole seconds (utils/fs.rs:52-53); the reuse check is `cached.modified_at == *mtime` (vault.rs:1297). An external edit in the same second as the teardown save can keep a stale entry until the next change to that file. Needs a switch plus an external edit within one second.
- Only the cache file is affected, not user data.

L13. Teardown and open run in parallel without awaits (LOW; ordering assumed, not verified).
- Code: `close_vault_db` (app-lifecycle.service.ts:601) and `shutdown_semantic` (597) are not awaited before `open_vault_db` (233). `close_database` sets both connection slots to `None` (db/mod.rs close_database). If close runs after open, B's connections are dropped and history and semantic writes return "Database not open" until the next open.
- Assumption: sync Tauri commands (commands/db.rs:7, 15 are plain `fn`) run in order. Threading was NOT checked against Tauri docs.

L14. Index cache: frontend-supplied path written without validation (LOW; path-safety).
- Code: `save_vault_cache(path)` (commands/vault.rs:1412-1424) calls `write_snapshot(&path)` with no `validate_vault_path`, unlike scan (vault.rs:1287) and open_vault_db (commands/db.rs:9). `write_snapshot` runs `create_dir_all` on `<path>/.kokobrain` (index_cache.rs:59-62). Only caller is teardown with `indexedVaultPath`, which is always a previously validated vault.

L15. Settings persistence: module-level `lastWritten` and `timer` are shared across sessions and writes are not serialized (LOW).
- Code: settings-persistence.svelte.ts:19, 22 are module state. `lastWritten = content` (83) runs when the awaited write resolves, which can be after the next session set its baseline (50). Out-of-order writes can leave an older content on disk while `lastWritten` says newer, so the dedupe may skip a needed write. Needs a change right before a switch or quit.

L16. Todoist API token stored in plaintext inside the vault folder (privacy; not loss).
- Code: settings.types.ts:220-221 `apiToken`, default '' (settings.store.svelte.ts:118), written to `<vault>/.kokobrain/settings.json` by W1. The vault may be synced or committed.

L17. Deletion fallback writes outside the trash when no vault is open (LOW).
- Code: fs.service.ts:167-186 `deleteItem`: `diskOp` reads `vaultStore.path`; if null, `remove(itemPath, recursive)` (permanent delete, no trash). Reachable only if a delete runs when no vault is open.

Checked and no loss path found:
- folder-order.json: writes the template only when the file is missing (fs.service.ts:46-50). Parse and read errors give `{}` in memory and do not write (52-70). A failed `exists` (Path::exists returns false on metadata errors [FETCHED]) would also fail the write, so no overwrite found [INFER].
- Index cache schema mismatch: full scan, then overwrite (vault.rs:1209-1218, 1370). No user data.
- Layout: no separate file; all writes go through W1.
- `openRecentVault` checks `exists(path)` (vault.service.ts:40-49) before switching.

## 5. Known-issue cross-check (.scratch/architecture-stability/issues/*.md)

- 34 (save dirty tabs before vault switch): KNOWN and fixed for ordering (vault.service.ts:19-21). L6 is the residual gap: failed saves still lead to discard. Not in issue text.
- 21 (write barrier): covers event-calendar only (boot.ts:37).
- 54 (vault-index listener survives switches): referenced in init comments (app-lifecycle.service.ts:336-340, 389-402). Not in this slice's leads.
- 22 (composition root): lifecycle ordering test exists (issue text).
- Searched the issue files for settings, trash, manifest, index cache, folder-order, bookmarks, auto-move, switch and teardown: no filed issue for L1-L5, L8, L9, L10.

## 6. Third-party facts (fetched)

Fetched from raw.githubusercontent.com (tauri-apps/plugins-workspace, branch v2):
- plugins/fs/src/commands.rs: `exists` returns `resolved_path.exists()` after `resolve_path` (scope denial is an error, not false). `Path::exists` maps any metadata error to false. `write_text_file` / `write_file`: no temp file, no rename, no fsync; open with truncate (defaults write true, truncate true, create true).
- plugins/fs/guest-js/index.ts: `exists` invokes `plugin:fs|exists`; `writeTextFile` invokes `plugin:fs|write_text_file` with path and options in headers.
Caveat: the fetch tool returned a summarized view. Verify exact lines before quoting.

Not fetched: notify crate (not needed in this slice), Tauri docs on sync command threading (see L13 assumption), rmp-serde trailing-byte behaviour (not needed; L12 is noted as possible, not confirmed).

## 7. Not checked

- No test run. Did not verify any lead by running code.
- Watcher internals (startWatching/stopWatching in fs.watcher.ts) and watcher.rs: out of slice except the call sites.
- db/mod.rs `close_database` exact line numbers, `schema.rs`, history_repo, FTS and semantic writers under `.kokobrain`.
- todoist.service.ts load path, file-history snapshots-backup, log.service writes, file-icons load details.
- AutoMoveSection.svelte call trigger (L9).
- Whether editor tabs can be opened before step 7 (L7).
- Multi-select delete caller for L5.
- Process-quit path beyond the close-requested handler.
