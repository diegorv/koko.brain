# File I/O audit, slice "lifecycle": app close, quit, restart, vault switch, teardown

Scout report, read-only. No build or test was run. Line numbers are from the files as they are on `main` (commit e9065422).

Labels used below:
- **READ**: the line was read in this session.
- **INFER**: a conclusion drawn from READ lines.
- **FETCHED**: third-party source read through WebFetch. The tool returns a model summary, so line numbers from it are not exact.

## 0. Known and already-filed items

- **Issue 34, save dirty tabs before the vault switch** (`.scratch/architecture-stability/issues/34-save-dirty-tabs-before-vault-switch.md`). Status is "resolved". `switchVault` now awaits `saveAllDirtyTabs()` before it opens the new vault. Its comment (line 61 of the same file, "Comments") records that a failed save still lets the switch proceed, and calls the block-or-proceed decision "the owner's call". Lead L3 below is that same decision, so it is known, not new.
- No filed issue covers window close, Cmd+Q, "Restart to update", `beforeunload`, or write atomicity. Searched all files under `.scratch/architecture-stability/issues/`.
- Issue 17 (`17-pin-rail-lens-latch-before-classic-removal.md`) asks for a ratchet over raw `writeTextFile(` call sites. That is adjacent to L5 below, not a match.

## 1. Entry points and call chains

### 1a. Window close (red button, Cmd+W, OS close request)

1. Rust: `src-tauri/src/lib.rs:92-100` `intercept_close_as_hide` runs `prevent_close` and hides the window. READ. It is attached only to the composer window (`lib.rs:148`). The main window has no Rust-side close hook. READ.
2. JS: `registerCloseHandler` (`src/lib/app/tauri-listeners.service.ts:50-82`) calls `getCurrentWindow().onCloseRequested` (`:53`). It is mounted by an `$effect` in `src/routes/(app)/+layout.svelte:44-46`. READ.
3. Handler steps, in order:
   - `event.preventDefault()` (`:54`).
   - `saveAllDirtyTabs()` (`:55`). This cancels both debounce timers, then writes every dirty tab with `saveFileByPath` in parallel (`src/lib/core/editor/editor.service.ts:234-247`). It returns the failed paths.
   - If any failed, `ask(...)` (`:58-61`). Declining returns and keeps the window open (`:62`).
   - `drainEventCalendarWrites()` (`:66`). This is the only write barrier drained on close.
   - `flushSettingsPersistence()` (`:70`, `src/lib/core/settings/settings-persistence.svelte.ts:73-87`).
   - `getCurrentWindow().destroy()` (`:71`).
4. `drainPendingWrites()` (`src/lib/core/vault/write-barrier.service.ts:37-41`) is NOT called on this path. READ.

### 1b. Cmd+Q / app-menu quit

1. `src-tauri/src/lib.rs:195` uses the predefined `.quit()` menu item. READ.
2. There is no `RunEvent` handler in `lib.rs`. The builder ends at `.run(tauri::generate_context!())` (`lib.rs:353`). READ. There is no `on_window_event` for the main window and no `ExitRequested` handling.
3. No JS listener runs on quit. `grep` for `beforeunload`, `RunEvent`, `ExitRequested` and `onCloseRequested` in `src/` finds only the close handler above. READ.
4. FETCHED, tao `src/platform_impl/macos/app_delegate.rs`: the delegate registers `applicationWillTerminate:`, which calls `AppState::exit()` and returns nothing. There is no `applicationShouldTerminate:` override, so AppKit terminates by default. The body of `AppState::exit()` was not read.
5. FETCHED, tauri-runtime-wry `lib.rs` (`handle_event_loop`): `Message::RequestExit` emits only `RunEvent::ExitRequested` and does not send `WindowEvent::CloseRequested` to windows.
6. INFER: Cmd+Q most likely reaches neither the JS `onCloseRequested` handler nor a per-window close. This is an inference from source excerpts. It has not been run. See lead L1.

### 1c. "Restart to update"

1. `src/lib/core/settings/sections/UpdateSection.svelte:293-294` shows the "Restart to update" button. It calls `restartApp()` (`:208-210`), which calls `relaunch()` from `@tauri-apps/plugin-process`. READ.
2. FETCHED, tauri `app.rs`: `AppHandle::restart` on the main thread runs `cleanup_before_exit` and then `process::restart` directly. Off the main thread it uses `request_exit`. Neither path sends `CloseRequested`. The source comment says events are skipped because delivery cannot be guaranteed.
3. INFER: `registerCloseHandler` never runs on restart. Unsaved tabs, the 2 s and 5 s save timers, and the 500 ms settings debounce are all dropped. See lead L2.

### 1d. Vault switch (welcome page, recent list, or deep link)

1. `src/routes/(app)/+page.svelte:13,17` calls `openVaultDialog()` or `openRecentVault(path)`. READ.
2. `src/lib/core/vault/vault.service.ts:18-22`, `switchVault(path)`:
   - `await saveAllDirtyTabs()` (`:19`). The return value is discarded. READ.
   - `await drainPendingWrites()` (`:20`). Only the event-calendar barrier is registered (`src/lib/app/boot.ts:37`). READ.
   - `vaultStore.open(path)` (`:21`, `src/lib/core/vault/vault.store.svelte.ts:79-86`).
3. The `$effect` in `src/routes/(app)/+layout.svelte:65-79` sees the new path and calls `initializeVault(path)`. There is no `vaultStore.close()` caller in `src/` outside tests. READ, `rg` over `src/lib` and `src/routes`.
4. `initializeVault(B)` (`src/lib/app/lifecycle/app-lifecycle.service.ts:133-527`):
   - Resets readiness and the entries memo, and stops settings persistence (`:137-150`).
   - Unregisters consumers and the history and search hooks (`:159-168`).
   - If a previous vault is live (`unsubscribeFileChange` non-null), it runs a SAFETY-NET `await saveAllDirtyTabs()` (`:180`, return discarded), `await drainEventCalendarWrites()` (`:186`), then `teardownVault()` (`:188`).
   - Then it runs steps 1 to 9: `loadSettings` (`:198`), `startSettingsPersistence` (`:210`), `open_vault_db` (`:233`), register consumers (`:246-264`), `buildIndex` and `loadDirectoryTree` in parallel (`:313-315`), `markIndexReady` (`:329`), `buildSearchIndex` (`:421`), watcher (`:489-501`), deep link (`:503`), and the post-open daily note and update check on a `setTimeout(0)` (`:515-523`).
5. `teardownVault()` (`:533-648`):
   - Increments `initVersion`, clears the semantic-init and secondary-builder timers, cancels the watcher debounce (`:537-546`).
   - Unsubscribes history, search and the consumers (`:549-569`).
   - `void stopSettingsPersistence()` (`:575`).
   - `stopWatching()` (`:576`). NOT awaited.
   - `save_vault_cache` for `indexedVaultPath` (`:586-590`). NOT awaited.
   - `shutdown_semantic` (`:597`), `close_vault_db` (`:601`). NOT awaited.
   - `resetHooks()` (`:616`). `resetEditor()` (`:622`), which cancels the two debounces and calls `editorStore.reset()` (`src/lib/core/editor/editor.service.ts:412-417`, `editor.store.svelte.ts:165`). This drops every tab.
   - Many store resets (`:623-647`).

### 1e. Autosave (the normal save path)

1. Keystroke: `onContentChange(content, frontmatterChanged)` (`editor.service.ts:224-227`) calls `editorStore.updateContent` (`editor.store.svelte.ts:84-88`) and `scheduleAutoSave` (`:213-221`). Frontmatter edits arm a 500 ms timer (`:200`). Body edits arm a 2000 ms timer (`:197`). The two are mutually exclusive.
2. Timer fires `saveDirtyTabs` (`:183-194`). It writes every dirty tab in parallel. On any failure it arms an untracked `setTimeout(saveDirtyTabs, 5000)` (`:192`).
3. `saveFileByPath(path)` (`:161-178`):
   - `writeTextFile(path, content)` (`:168`).
   - On success: `markSavedByPath(path, content)` (`:169`, `editor.store.svelte.ts:91-96`, unconditional assignment of `savedContent`), then `notifyAfterSave(path, content)` (`:170`).
   - On failure: `toast.error('Failed to save file.')` (`:174-175`) and returns false.
4. `notifyAfterSave` (`src/lib/core/editor/editor.hooks.ts:67-92`):
   - `markRecentSave` (`:68`).
   - `void applyNoteChange({kind:'upsert', source:'save', ...})` (`:81`). Fire-and-forget. The Rust IPC is not awaited.
   - `notifyContentInvalidated()` (`:83`).
   - Each after-save observer is called synchronously (`:85-91`). Observers include file-history (`save_snapshot`) and search (FTS). Their IPC is not awaited.

### 1f. Settings persistence

1. `$effect.root` inside `startSettingsPersistence` (`src/lib/core/settings/settings-persistence.svelte.ts:46-66`) re-arms a 500 ms timer on each change (`:59-62`).
2. `flushSettingsPersistence` (`:73-87`) clears the timer and calls `writeSettingsFile(session.path, content)`. On failure it logs and does NOT rethrow.
3. `writeSettingsFile` (`src/lib/core/settings/settings.service.ts:185-198`) does `mkdir` if needed, then `writeTextFile(filePath, content)` (`:193`). It is not atomic.
4. `loadSettings` (`settings.service.ts:30-...`) writes defaults via `saveSettings` when the file is missing (`:34-40`) or empty (`:45-52`). A corrupt file makes `initializeVault` reject. The test at `src/tests/lib/app/lifecycle/app-lifecycle.service.test.ts:424` asserts `rejects.toThrow('settings corrupt')`. READ.

### 1g. Index cache and DB (Rust)

1. `save_vault_cache` (`src-tauri/src/commands/vault.rs:1411-1430`) is a SYNCHRONOUS `fn`. It copies entries from `VaultIndexState` at the moment it runs, then `index_cache::write_snapshot(path, entries)` (`:1424`).
2. `write_snapshot_atomic` (`src-tauri/src/vault/index_cache.rs:55-75`): writes a `.tmp`, fsyncs, and renames. This is atomic. `write_snapshot` is at `:95-104`.
3. The async scan commands are `scan_vault_v2` (`vault.rs:1094-1107`) and `scan_vault_v2_cached` (`:1179-1192`). Both use `spawn_blocking`. The index is replaced inside `scan_vault_v2_cached_inner` (`:1198-...`, build at `:1247`).
4. `open_vault_db` (`src-tauri/src/commands/db.rs:6-11`) and `close_vault_db` (`:14-18`) are synchronous. They call `db::open_database` (`src-tauri/src/db/mod.rs:36-88`) and `db::close_database` (`:91-99`).
5. The DB connections are process-global statics: `DB` (`db/mod.rs:17`) and `FTS_DB` (`:27`). They are not per vault. `open_database` creates `.kokobrain/kokobrain.db`, sets WAL, and opens a second connection.
6. Watcher commands (`src-tauri/src/commands/watcher.rs:11-29`) are synchronous. `replace_watcher` (`src-tauri/src/vault/watcher.rs:302-...`) and `stop_watcher` (`:321-...`) join the bridge thread (`:132-135`).

### 1h. Startup writes and deletions in the slice

- `ensureTemplatesFolder` (`app-lifecycle.service.ts:384`) creates a folder.
- `migrateBookmarksToFavorites` (`:285-289`, `src/lib/features/properties/bookmark-migration.service.ts:49-74`) reads the legacy bookmarks file on every open. It calls `updateNoteFrontmatter` for each entry sequentially. Not traced further.
- `cleanup_history(retentionDays)` (`:275`, not awaited) runs `delete_old_snapshots` and `delete_medium_duplicates` in one transaction (`src-tauri/src/commands/history.rs:143-158`). This deletes history rows on every open.
- `autoOpenDailyNote` (`:517`, after a `setTimeout(0)`) may create a daily note. Not read.

## 2. Disk writes, deletes and renames in the slice

| # | Operation | Where | Atomic? | Precondition checked | Error handling | State on success | State on failure |
|---|---|---|---|---|---|---|---|
| W1 | Note save, `writeTextFile(path, content)` | `editor.service.ts:168` | No. Plugin opens with truncate and writes in place (FETCHED, plugins-workspace `plugins/fs/src/commands.rs`, `write_text_file`, which is `async` and has no temp file) | Tab exists, not virtual, `isTabDirty` (`:163`) | try/catch, toast, returns false (`:173-177`) | `markSavedByPath` (`:169`), `notifyAfterSave` (`:170`) | `savedContent` unchanged, tab stays dirty. Caller decides |
| W2 | Settings, `writeTextFile` after `mkdir` | `settings.service.ts:191-193` | No | Dir existence check | Logs, rethrows (`:194-197`). Flush catches and logs (`settings-persistence:81-86`) | `lastWritten = content` (`settings-persistence:83`) | `lastWritten` unchanged, so a later flush retries |
| W3 | Defaults written when settings file is missing or empty | `settings.service.ts:34-40, 45-52` via `saveSettings` | No | none | Inherits W2 | none | `loadSettings` rejects or continues depending on path |
| W4 | Index cache, `save_vault_cache` | `vault.rs:1411-1430` to `index_cache.rs:55-75` | Yes (tmp, fsync, rename) | `path` from `indexedVaultPath` | JS: logs only, not awaited (`app-lifecycle:587-589`) | `indexedVaultPath = null` (`:590`) | Logged only |
| W5 | SQLite writes (history, semantic, FTS) | Rust commands, many | SQLite transactions, WAL | `with_db` requires open DB (`db/mod.rs:110-117`) | Error string to JS | n/a | n/a |
| W6 | History delete on open, `cleanup_history` | `app-lifecycle:275`, `history.rs:143-158` | Transaction | none | Logs only, not awaited | Rows removed | Logs only |
| W7 | Bookmark migration writes note frontmatter | `bookmark-migration.service.ts:49-74` | Not traced | Inside vault, markdown, exists (`:67-74`) | Toast | Not traced | Toast |
| W8 | Recent-vault list in localStorage | `vault.store.svelte.ts:54-56` | n/a | n/a | Not caught | n/a | n/a |

Deletes and renames of notes are not in this slice. The watcher and tree operations belong to other slices.

## 3. Concurrency

### 3a. Timers that can outlive a vault or a quit

| Timer | Where | Armed by | Cleared by |
|---|---|---|---|
| Body autosave, 2000 ms | `editor.service.ts:197` | keystroke | `saveAllDirtyTabs`, `resetEditor` (`:235, :413`) |
| Frontmatter autosave, 500 ms | `:200` | keystroke | same |
| Autosave retry, 5000 ms | `:192` | any failed save in `saveDirtyTabs` | NOT cancelled by `resetEditor` or `saveAllDirtyTabs`. Fires later and saves whatever dirty tabs exist then |
| Settings persistence, 500 ms | `settings-persistence:59-62` | settings change | `flushSettingsPersistence` (`:74-76`), stop |
| Active-tab links, 150 ms | `+layout.svelte:100-128` | tab change | effect cleanup |
| Content index, 1000 ms | `+layout.svelte:149-154` | content change on a tab | effect cleanup (`:156`). Tab reset in teardown changes the path, which re-runs the effect |
| Search, 200 ms | `+layout.svelte:165-169` | query change | effect cleanup |
| Watcher debounce, 300 ms | `app-lifecycle:489-493` | file events | `debouncedFileChangeHandler.cancel()` in teardown (`:549-551`) |
| Semantic init, 3000 ms | `app-lifecycle:445` | init | teardown (`:539-542`), and `initVersion` guard |
| Secondary builders, 0 ms | `app-lifecycle:404` | init | teardown (`:543-546`) |
| Recent-save marks, 15 s | `editor.hooks.ts:40` | each save | `resetHooks` (`:98`) |
| Post-open daily note and update check, 0 ms | `app-lifecycle:515` | init | `initVersion` guard |

### 3b. In-flight promises the close and switch paths do not await

- `applyNoteChange` from `notifyAfterSave` (`editor.hooks.ts:81`). The close handler destroys the window right after `saveAllDirtyTabs` returns. Index and FTS updates may still be in flight.
- After-save observers (history `save_snapshot`, search FTS) are not awaited (`editor.hooks.ts:85-91`).
- `save_vault_cache`, `shutdown_semantic`, `close_vault_db`, `stopWatching` in teardown (`app-lifecycle:576, 586-601`) are fire-and-forget.
- `drainPendingWrites` is called only from `switchVault` (`vault.service.ts:20`), not from the close handler (`tauri-listeners.service.ts:55-71`).
- `startWatching` (`app-lifecycle:499`) is not awaited. Its own `stopWatching` is awaited inside `startWatching` (`fs.watcher.ts:191`). `stopWatching` sets `currentVaultPath = null` only after its IPC resolves (`fs.watcher.ts:213-224`). INFER: this is benign in practice, because teardown's stop resolves long before step 7.

### 3c. Ordering guards that work

- `initVersion` is checked after each await in `initializeVault` (`app-lifecycle:200, 240, 296, 322, 373, 406, 447, 451, 466, 516`). A superseded init returns without marking ready. READ.
- `startSettingsPersistence` captures the path (`settings-persistence:39-41`), so a late write cannot target the new vault. READ.
- `indexedVaultPath` is set only after a successful build (`app-lifecycle:350-354`), so teardown saves under the vault the Rust index holds. READ.
- The close handler keeps the window open when the user declines the discard prompt (`tauri-listeners.service.ts:62`). READ.

### 3d. Interleavings with no guard

- Two writes to one note path. The debounced `saveDirtyTabs` (`editor.service.ts:188-190`) and a concurrent `saveAllDirtyTabs` (`:240-243`) can both call `writeTextFile` for the same tab with different content snapshots. Nothing serializes them per path on the TS side. Tauri `write_text_file` is `async` and truncates in place (FETCHED), so the older write can finish last. See L4.
- `saveAllDirtyTabs` does not wait for an in-flight debounced write. It only cancels the timer (`:235-236`). A write already in progress is not awaited, and `isTabDirty` may still report dirty when it should not, or the reverse.
- `markSavedByPath` (`editor.store.svelte.ts:91-96`) assigns `savedContent` unconditionally. A late, older write can overwrite the newer `savedContent`. INFER: the tab then looks dirty, which is safe, but the close handler does not re-check `isTabDirty` after its saves.
- Rust: `VaultIndexState` holds one index with no vault identity. `save_vault_cache` (sync, `vault.rs:1411`) reads it at execution time, not at call time. It is correct only because the next scan is dispatched after it and runs as an async command on a blocking worker. The project's own comment (`vault.rs:1087-1092`) says sync commands run on the IPC thread. That threading claim was NOT verified externally.
- Rust DB: `close_vault_db` (sync) then `open_vault_db` (sync) keep IPC order on the main thread (same assumption as above). Async DB users (for example `update_semantic_file`, which takes the global `DB` mutex) that were already dispatched could run after the new open. Their rows would then go into the new vault's database. This is only a theory. Not traced.

## 4. Leads

Confidence reflects how sure the mechanism is and how likely the trigger is. Each lead is a hypothesis to check, not a confirmed bug.

### L1. Cmd+Q probably skips the save-on-close handler (data loss, high owner concern)

- **Scenario:** Type in a note, then press Cmd+Q within 2 s, before the debounced autosave fires. Or leave a tab in the failed-save state (5 s retry) and quit. The unsaved content is not written, and the window never gets the discard prompt.
- **Evidence:** `lib.rs:195` (`.quit()`), no `RunEvent` handler (`lib.rs:353`), handler only on `onCloseRequested` (`tauri-listeners.service.ts:53`). FETCHED: tao `applicationWillTerminate` calls `AppState::exit()` with no close-request dispatch, and tauri-runtime-wry `RequestExit` emits only `ExitRequested`. The code comment at `tauri-listeners.service.ts:44-46` says the handler exists "to prevent data loss on quit". That only holds if Cmd+Q reaches it.
- **Confidence:** medium-high from source. Not run. Needs a manual check on the dev build: edit, Cmd+Q within 1 s, reopen, look at the note.
- **Not checked:** the body of `AppState::exit()`, and whether tao or Tauri sends `CloseRequested` on this path in the version pinned here (`tauri = "2"`, `Cargo.toml:22`).

### L2. "Restart to update" discards unsaved work (data loss)

- **Scenario:** Edit a note, open Settings, Update, and click "Restart to update" once an update has downloaded. The relaunch replaces the process. Dirty tabs, the autosave timers, and the 500 ms settings debounce are never flushed. Dirty tabs are lost.
- **Evidence:** `UpdateSection.svelte:293-294, 208-210`. FETCHED: `AppHandle::restart` skips `CloseRequested` and runs `process::restart` directly on the main thread.
- **Confidence:** medium. The chain is clear from source. The exact restart path depends on whether the call comes off the main thread, and both paths skip the JS close handler.
- **Fix candidates for the owner:** run `saveAllDirtyTabs()` and `flushSettingsPersistence()` in `restartApp` before `relaunch()`. Or block the button while tabs are dirty.

### L3. Failed saves are dropped silently when the vault is switched (known, owner decision)

- **Scenario:** A note cannot be written (permission change, disk full, parent folder removed). The user switches vault. `saveAllDirtyTabs` fails and shows a toast. `switchVault` ignores the failed list (`vault.service.ts:19`). `initializeVault` runs its own safety-net save, which also ignores the list (`app-lifecycle:180`). Then teardown calls `resetEditor()` and `editorStore.reset()` (`app-lifecycle:622`, `editor.service.ts:415`). The unsaved tab content is gone. The toast is the only trace.
- **Evidence:** `vault.service.ts:19`, `app-lifecycle.service.ts:180, 622`, `editor.service.ts:246` (returns failed list), `editor.service.ts:412-417`.
- **Confidence:** high that the code does this. Medium likelihood, since it needs a write failure at switch time.
- **Status:** known. Issue 34's comment records it as the owner's decision. It conflicts with CLAUDE.md "Services return errors ... never silently swallow". The close handler does the opposite and prompts (`tauri-listeners.service.ts:55-62`).

### L4. Two overlapping writes to one note can leave older bytes on disk (data loss, low likelihood)

- **Scenario:** The 2 s autosave fires and starts writing note N (content X). Within the same few milliseconds the user quits or switches vault. `saveAllDirtyTabs` starts a second write of content Y, because `savedContent` is still old. Both are truncate-and-write calls to the same path. If the X write completes last, the disk holds X. Then `markSavedByPath` sets `savedContent` to the last-finished write. The close handler sees no failures and destroys the window, so Y is lost.
- **Evidence:** `editor.service.ts:188-190, 235-243, 168-170`. `editor.store.svelte.ts:91-96` (unconditional). `tauri-listeners.service.ts:55-62` (trusts the failed list). FETCHED: `write_text_file` is `async` and writes in place.
- **Confidence:** the mechanism is clear from source. Likelihood is low because the window is a few milliseconds.
- **Fix candidate:** serialize writes per path, or compare the write result to `tab.content` and re-save if it changed.

### L5. Non-atomic writes can truncate notes and settings on a crash or kill (data loss, low likelihood)

- **Scenario:** The process is killed or power is lost while `writeTextFile` is in progress (notes at `editor.service.ts:168`, settings at `settings.service.ts:193`). The note or `settings.json` is left truncated. For settings, the next `loadSettings` throws "settings corrupt" and the vault does not open (`app-lifecycle.service.test.ts:424`).
- **Evidence:** FETCHED: plugin `write_text_file` opens with truncate and writes in place. Contrast: Rust `write_snapshot_atomic` (`index_cache.rs:55-75`) is atomic, and the frontend does not use it.
- **Confidence:** the non-atomic write is certain. Likelihood is low.
- **Fix candidate:** write to a temp file and rename in the frontend, or route writes through a Rust atomic command like `utils/fs.rs write_atomic` (referenced by `utils/fs.rs:7, 26`).

### L6. Last save's history snapshot and index update may not land on quit (recovery gap, medium)

- **Scenario:** Save a note and quit right away. `notifyAfterSave` fires `applyNoteChange` (`editor.hooks.ts:81`), which is not awaited, and the after-save observers, which are not awaited either (`:85-91`). The close handler then calls `flushSettingsPersistence()` and `destroy()`. The `save_snapshot` IPC and the Rust index or FTS update may not complete. The history snapshot for that save is lost for good. The FTS row heals on the next open (issue 34 note, `fts_repo.rs:37`). The Rust VaultIndex is rebuilt on the next open from cache or scan.
- **Evidence:** `editor.hooks.ts:81, 85-91`, `tauri-listeners.service.ts:66-71`. Quit never calls `teardownVault` (no quit hook), so `save_vault_cache` and `close_vault_db` also never run on quit (`app-lifecycle:586-601` only runs on switch).
- **Confidence:** medium. The window is small but real, and history is the owner's recovery path.

### L7. Close handler skips the write barrier registry (structural, low severity today)

- **Scenario:** A future barrier registered in `boot.ts` (like `boot.ts:37`) is drained on vault switch (`vault.service.ts:20`) but not on quit. Writes queued for it are cut off at close.
- **Evidence:** `tauri-listeners.service.ts:66` drains only `drainEventCalendarWrites`. `drainPendingWrites` (`write-barrier.service.ts:37-41`) is not called on close.
- **Confidence:** high that the paths differ. Severity low today, since only the event-calendar barrier is registered.

### L8. A throw in the close handler leaves the window open with no retry (minor)

- **Scenario:** `drainEventCalendarWrites()` rejects (its implementation was not read). The handler has already called `preventDefault()` and has no try/catch. The window stays open and the error goes unhandled. No data is lost, but the user sees no feedback.
- **Evidence:** `tauri-listeners.service.ts:54-71`. `flushSettingsPersistence` catches its own errors (`settings-persistence:84-86`).
- **Confidence:** low that drain rejects. Not checked.

### L9. Save-state races at vault switch involving the autosave retry timer (minor)

- **Scenario:** A save fails, arming the untracked 5 s retry (`editor.service.ts:192`). The user switches vault within 5 s. The retry fires after the new vault is open and calls `saveDirtyTabs` over the new vault's tabs. It saves only dirty tabs in the store, so this is probably benign. It is still a timer that survives `resetEditor`.
- **Confidence:** medium that it is benign.

### L10. Cross-vault DB writes from in-flight async commands (theory, low)

- **Scenario:** A history or semantic command dispatched before `close_vault_db` executes after `open_vault_db` for the new vault. Its rows land in the new DB, keyed by the old vault's absolute path.
- **Evidence:** DB is one process-global connection (`db/mod.rs:17, 27`). Sync `open` and `close` keep IPC order (assumed, see Section 3d). The async writers were not traced.
- **Confidence:** low. Not checked against `save_snapshot` (`history.rs:57`).

### L11. Startup writes to user notes and history deletion on every open (note for the owner)

- `migrateBookmarksToFavorites` (`app-lifecycle:285-289`) rewrites note frontmatter on open when a bookmarks file exists. The write itself was not traced.
- `cleanup_history` (`app-lifecycle:275`, `history.rs:143-158`) deletes history rows on every open, per the retention setting. Not awaited. History is the owner's recovery path, so the retention default matters.
- **Confidence:** these are facts from the code, not bugs. Listed because the owner's top concern is recovery.

## 5. Checked and looks safe

- The `initVersion` guard keeps superseded inits from marking the index ready or touching stores (see 3c).
- `startSettingsPersistence` captures its path, so stale teardown cannot write settings to the new vault (`settings-persistence:39-41`).
- `indexedVaultPath` keeps the cache save keyed to the vault the Rust index holds (`app-lifecycle:101-107, 350-354, 586`).
- The cache write is atomic (`index_cache.rs:55-75`), and a corrupt cache is deleted and rebuilt (`vault.rs:1227-1235`).
- Declining the discard prompt keeps the window open (`tauri-listeners.service.ts:62`).
- The layout content-index timer is cleared on tab change, and the reset in teardown changes the path, so the timer does not fire against the new vault. INFER, not fully traced into `index-updater.service.ts`.

## 6. Not read or not verified

- `note-change.service.ts` (`applyNoteChange` internals) and `index-updater.service.ts` (`updateIndexesForFile` guard).
- `drainEventCalendarWrites` implementation.
- Rust `save_snapshot` key derivation (`history.rs:57`).
- `autoOpenDailyNote` and `updateNoteFrontmatter`.
- Body of tao `AppState::exit()`, and the pinned tao version that handles the macOS quit.
- Threading of sync Tauri commands. Taken from the project comment at `vault.rs:1087-1092`, not checked against Tauri docs.
- WebKit's default Cmd+R reload. `grep` found no reload binding in `src/lib/app` and no `location.reload` or `beforeunload` in `src/`. The keybinding file was not located.
- No test was run.

## 7. Fetched sources

- tauri-apps/tauri `crates/tauri-runtime-wry/src/lib.rs` (raw, two WebFetch calls, offsets 0 and 100000). `RequestExit`, `WindowMessage::Close`, `on_close_requested`, `Event::LoopDestroyed`.
- tauri-apps/tauri `crates/tauri/src/app.rs` (raw). `AppHandle::restart`.
- tauri-apps/tao `src/platform_impl/macos/app_delegate.rs` (raw). `applicationWillTerminate:`.
- tauri-apps/plugins-workspace branch `v2` `plugins/fs/src/commands.rs` (raw). `write_text_file`, `write_file`, `write_file_inner`.

The WebFetch results are model summaries. Quote-level claims were not checked line by line against the upstream source.
