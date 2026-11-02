# Senior review: save-pipeline (lost edits)

Read-only. Nothing was built or run. Every claim below comes from reading the code at the cited file:line. Where a point depends on third-party behaviour, I name the source I fetched. **READ** marks what the code says. **INFER** marks what I concluded from it.

Third-party sources fetched:
- tauri-apps/tao `dev` `src/platform_impl/macos/app_delegate.rs`: implements `applicationWillTerminate:` → `AppState::exit()`. It does not implement `applicationShouldTerminate:`.
- tauri-apps/tao `dev` `src/platform_impl/macos/app_state.rs`: `AppState::exit()` emits only `Event::LoopDestroyed`. It never emits `CloseRequested`.
- tauri-apps/muda `dev` `src/platform_impl/macos/mod.rs`: `PredefinedMenuItemType::Quit => Some(sel!(terminate:))`.
- tauri-apps/tauri `dev` `crates/tauri/src/app.rs`: on the main thread `restart` calls `process::restart` directly. Off the main thread it goes through `request_exit(RESTART_EXIT_CODE)`, which gives `RunEvent::ExitRequested`/`Exit`. No exit or restart path creates `WindowEvent::CloseRequested`.
- tauri-apps/plugins-workspace `v2` `plugins/fs/src/commands.rs`: `write_text_file` is an `async fn` that does blocking `std::fs` work. It opens with `truncate: true, create: true` by default and calls `write_all` in place. No temp file, no rename, no `sync_all` or flush.

## Findings (most severe first)

### SP-1 Cmd+Q (app menu Quit, Dock Quit, logout) skips the save-on-close handler. Pending edits are lost with no prompt. [data-loss, high confidence from source, NOT known]
- READ: The app menu uses the predefined quit item (`src-tauri/src/lib.rs:195`). `run()` calls `.run(tauri::generate_context!())` with no `RunEvent` callback (`src-tauri/src/lib.rs:353`), so nothing handles `ExitRequested`.
- READ: The only save-on-quit code is the JS `onCloseRequested` listener (`src/lib/app/tauri-listeners.service.ts:50-71`, registered at `src/routes/(app)/+layout.svelte:45`).
- READ (fetched): Quit sends `terminate:` (muda). tao answers with `applicationWillTerminate` → `AppState::exit` → `LoopDestroyed` only. No `CloseRequested` reaches the window.
- READ: The body autosave is a 2 s trailing debounce (`src/lib/core/editor/editor.service.ts:197`, `src/lib/utils/debounce.ts`). Settings have a 500 ms debounce too, which `flushSettingsPersistence` flushes only in the close handler (`tauri-listeners.service.ts:70`).
- INFER: Type in a note and press Cmd+Q within 2 s: the edit never reaches disk. Worse, a tab whose save keeps failing (read-only file, disk full, missing parent folder) stays dirty. The close handler would ask "Close anyway?" (`tauri-listeners.service.ts:56-63`), but Cmd+Q never runs it, so the text is discarded silently. The last history snapshot and the index update are lost the same way (`editor.hooks.ts:81-91` is fire-and-forget).
- Not run. Check it manually on a release build: type, press Cmd+Q at once, reopen.

### SP-2 "Restart to update" relaunches without saving dirty tabs. [data-loss, medium confidence, NOT known]
- READ: `src/lib/core/settings/sections/UpdateSection.svelte:208-210` calls `relaunch()` directly, with no `saveAllDirtyTabs()` or `flushSettingsPersistence()` before it.
- READ (fetched tauri app.rs): neither restart path emits `CloseRequested`, so `registerCloseHandler` never runs.
- INFER: A tab that is still dirty (the save keeps failing, or the edit is under 2 s old) is lost without a prompt. So is a settings change made in the last 500 ms, for example switching the release channel and clicking Restart.

### SP-3 Daily or new deep-link append/prepend writes disk content over the open tab and drops its unsaved keystrokes. [data-loss, high confidence on code path, NOT known]
- READ: `src/lib/app/deep-link-actions.ts:36-64`: `openOrCreateDailyNote()` opens the tab, then `readTextFile(filePath)` reads the **disk** copy, builds `existing + '\n' + content`, writes it, and calls `syncExternalContentToEditor(filePath, newContent, true, 'none')`.
- READ: `markSaved=true` sets both `content` and `savedContent` (`editor.service.ts:78-79`, `editor.store.svelte.ts:130-136`). The tab is marked clean, so the pending debounce has nothing left to save (`editor.service.ts:183-187`).
- The same pattern runs for the `new` action with `prepend`/`append` on an existing note (`src/lib/features/deep-link/deep-link.service.ts:254-286`).
- Scenario: you are typing in today's daily note, then fire a Raycast or Shortcuts `kokobrain://daily?...&content=...` capture within 2 s, or at any time while that tab's save is failing. The typed text disappears from the editor and never reaches disk. The tab reads clean.
- Fix direction (not applied): if the tab exists, merge into `tab.content` (the link-updater idiom at `link-updater.service.ts:33-35`), or `await saveFileByPath` first.

### SP-4 Task toggle from the Tasks tab overwrites unsaved edits of the note it toggles. [data-loss, high confidence on code path, NOT known]
- READ: `src/lib/features/tasks/tasks.service.ts:100-115`: Rust `toggle_task_status_inner` reads the file **from disk** (`src-tauri/src/commands/vault.rs:669`), toggles the line and writes it (`:683`). TS then calls `syncExternalContentToEditor(filePath, updatedContent, true, 'none')`.
- READ: TasksView renders only inside the Tasks virtual tab (`src/lib/app/EditorView.svelte:71`). The edited note stays open in its own tab, and its debounce is still armed.
- Scenario: type in note N, switch to the Tasks tab within 2 s (or while N's save is failing), click a checkbox that belongs to N. N's tab content becomes disk+toggle and is marked saved. The keystrokes are gone. Also, `lineNumber` comes from the index of the disk version, which can point at a different line than the one in the dirty buffer.

### SP-5 Deleting a note or folder closes dirty tabs without saving them, even when the Trash move then fails. [data-loss, high confidence on code path, NOT known]
- READ: `applyPathChange` calls `closeTabsForDeletedPath(from)` **before** `await diskOp()` (`src/lib/core/filesystem/path-change.service.ts:125-127`). `closeTabsForDeletedPath` removes matching tabs and their children with no dirty check and no save (`editor.service.ts:356-366`).
- READ: `deleteItem` → `moveToTrash` → `rename(absolutePath, trashPath)` (`src/lib/core/filesystem/fs.service.ts:167-189`, `src/lib/core/trash/trash.service.ts:71`). On failure the error is rethrown and the caller toasts it, but the tab is already gone.
- Scenarios: (a) type in N, then delete N from the note list or Files within 2 s. The Trash item holds the pre-edit bytes, so "restore from Trash" brings back an older note. (b) The rename into the Trash throws (permissions, cross-device): the note stays on disk with old bytes and the buffer is gone. (c) Deleting a folder closes every child tab, including a child whose save had been failing, without a word.
- The ordering comment (`path-change.service.ts:96-98`) is right that a stale save must not recreate the file. Saving the dirty tabs under `from` before closing them would satisfy that and keep the text.

### SP-6 Vault switch after a failed save discards the buffer. [data-loss, KNOWN-PARTIAL: issue 34]
- READ: `switchVault` ignores the failed list (`src/lib/core/vault/vault.service.ts:19`). The safety net in `initializeVault` ignores it too (`src/lib/app/lifecycle/app-lifecycle.service.ts:180`). `teardownVault` → `resetEditor()` (`app-lifecycle.service.ts:622`) → `editorStore.reset()` sets `tabs = []` (`editor.store.svelte.ts:165-167`).
- Issue `.scratch/architecture-stability/issues/34-save-dirty-tabs-before-vault-switch.md` (comments) records "the switch still goes ahead … whether to block the switch instead is the owner's call". It describes the effect as a missing snapshot and search row. It does not say that the unsaved text itself is destroyed after one toast. The window-close path asks first (`tauri-listeners.service.ts:56-63`). The vault switch does not.

### SP-7 External rename or delete of an open note leaves the tab on the old path, and the next save resurrects the old file. [corruption / stale-state, high confidence on code path, NOT known]
- READ: The watcher batch only calls `reloadExternallyChangedTabs(paths)` (`app-lifecycle.service.ts:481-487`). A path that fails to read is skipped silently (`editor.service.ts:391-393`). Nothing closes or retargets the tab. `closeTabsForDeletedPath` and `updateTabAfterRenameOrMove` run only from in-app `applyPathChange` (`path-change.service.ts:125,132`).
- READ: `saveFileByPath` writes with the default `create: true` (`editor.service.ts:168`; fetched plugin default).
- Scenario: note `A.md` is open. A sync client, Obsidian on the same vault, Finder or `git mv` renames it to `B.md`. You keep typing, or the tab was already dirty. Autosave recreates `A.md` with the buffer. Now `A.md` has the newest text and `B.md` the older text, and other devices see a note come back that was deleted. The same happens after an external delete.

### SP-8 A dirty tab silently overwrites an external change on the next autosave. [data-loss of the external version, medium-low likelihood, NOT known; intentional per the comment]
- READ: `reloadExternallyChangedTabs` skips dirty tabs: "the editor always wins" (`editor.service.ts:369-381`). `saveFileByPath` writes with no check of disk content or mtime against `savedContent` (`editor.service.ts:161-170`).
- Scenario: a sync or git pull rewrites N while N has edits under 2 s old. Two seconds later the editor writes over the incoming version. No conflict copy is made and no history snapshot exists for the external bytes (snapshots run only on editor saves, `editor.hooks.ts:85-91`). The incoming change is unrecoverable. The code chose this on purpose, but the owner should know it ends in permanent loss.

### SP-9 Editor saves are truncate-in-place, so ENOSPC or a crash mid-write leaves a truncated note. [data-loss, low likelihood, certain mechanism, NOT known]
- READ: `editor.service.ts:168` uses plugin `writeTextFile`. The fetched source shows open(truncate) → `write_all`, with no temp file and no fsync. The repo already has an atomic writer, `src-tauri/src/utils/fs.rs:16-32` (`write_atomic`: tmp + rename, read-only guard). The Rust writers use it (`vault.rs:370,683,899`). The editor save path does not.
- Scenario: the disk is nearly full. The autosave truncates N, then `write_all` fails. The toast says "Failed to save file." and the buffer stays dirty (good), but the on-disk N is now empty or partial. If the user then quits with Cmd+Q (SP-1), or answers "Close anyway" at the prompt, both copies are gone. A power loss during `write_all` gives the same result.

### SP-10 No max-wait and no flush on blur: continuous typing is never saved until a 2 s pause. [data-loss on crash, low-medium, NOT known]
- READ: The debounce has no `maxWait` (`src/lib/utils/debounce.ts:9-17`). Only `onContentChange` arms it (`editor.service.ts:224-227`). There is no blur, visibilitychange or app-hide flush anywhere in `src/lib` (grep for `visibilitychange` finds only the event-calendar and log.service listeners).
- INFER: A long run of typing with no 2 s gap, followed by a renderer crash, a force quit or SP-1, loses the whole run. Switching apps does not save either.

### SP-11 File-history "Restore" on a board-view tab reports success and writes nothing. [minor, silent failure of a recovery path, medium confidence, NOT known]
- READ: `restoreSnapshot` dispatches into `editorStore.editorView` only `if (view)`, then `saveCurrentFile()`, then `fileHistoryStore.reset()` closes the dialog (`src/lib/features/file-history/file-history.service.ts:82-102`). On a kanban, canvas or collection tab in board mode, `MarkdownEditor` is not mounted (`EditorView.svelte:78-83`) and its `onDestroy` sets `editorView` to null (`MarkdownEditor.svelte:148`). Nothing checks that the active tab is still `fileHistoryStore.filePath`. A failed save is also swallowed here: `saveCurrentFile` returns void (`editor.service.ts:151-155`), though `saveFileByPath` does toast it.
- Scenario: open a Kanban `.md` board, press Cmd+Shift+H (`global-keybindings.ts:167-175`), pick an older version, confirm "Restore". The dialog closes as if it worked, and the file is unchanged.

### SP-12 In-app rename or move during an in-flight autosave can recreate the old path. [stale-state, low likelihood, NOT known]
- READ: The tab path changes only after `await diskOp()` (`path-change.service.ts:127,132`). A `saveDirtyTabs` that fires during the rename IPC calls `writeTextFile(oldPath, …)` with `create: true` (`editor.service.ts:162-168`). Then `markSavedByPath(oldPath)` finds no tab, because the tab has moved (`editor.store.svelte.ts:91-96`), so the tab stays dirty with no timer armed.
- INFER: If the write opens after the rename, a ghost `old.md` holds the newest text and `new.md` holds the older text until the next keystroke or close. Auto-move (`src/lib/features/auto-move/auto-move.service.ts:113-121,188`) runs `moveItem` 3 s after a save while you may still be typing, which makes this more likely than a manual rename. The window is still only the rename IPC.

### SP-13 Keystrokes landing in short async windows are overwritten. [minor, ms windows, NOT known]
- `reloadExternallyChangedTabs` checks dirtiness before the read (`editor.service.ts:380`) but after the read compares only `diskContent === tab.savedContent` (`:398`). Typing during the read is replaced by disk content and marked saved (`:401`).
- `updateLinksAfterRename` snapshots `openTab.content`, awaits the write, then syncs with `markSaved=true` (`src/lib/core/filesystem/link-updater.service.ts:33-47`). `renameType` does the same per tab (`src/lib/features/type-definitions/type-definitions.service.ts:213-220`). Keystrokes typed during the write are dropped.
- The close handler saves a snapshot, then awaits the calendar drain and the settings flush before `destroy()` (`tauri-listeners.service.ts:55-71`). Typing during those awaits is lost.

### SP-14 Overlapping same-path writes are not serialized. [minor, low likelihood]
- READ: Nothing serializes `saveFileByPath` per path. Its callers are the debounced `saveDirtyTabs` (`:183-194`), the retry `setTimeout` (`:192`), `saveAllDirtyTabs` (`:234-247`), Cmd+S and `updateNoteFrontmatter`'s direct `saveFileByPath` (`frontmatter-write.service.ts:129`). The plugin command is `async` with blocking `std::fs` inside (fetched), so two writes can run on separate runtime threads.
- INFER: Two truncating opens followed by two `write_all` calls at offset 0 leave the shorter write's bytes plus the tail of the longer one. That is a corrupt note while the store says saved. Both writes must target the same path with different content inside one write latency, for example a Properties edit landing while the 2 s body save is in flight.
- Related: each failing `saveDirtyTabs` run starts its own 5 s retry chain and never cancels earlier ones (`editor.service.ts:191-193`). `resetEditor` does not cancel them (`:412-417`). With a persistent failure the chains multiply, giving more toasts and more concurrent writes. No direct loss.

## Out of theme, passed on (not traced to the end)
- One CodeMirror view and its undo history persist across markdown-to-markdown tab switches. Doc replaces use `addToHistory.of(false)` (`MarkdownEditor.svelte:230-235,329-333`), so Cmd+Z after a switch may replay note A's undo events inside note B, and autosave then writes that to B. This could be silent corruption, and the tabs-buffers reviewer should verify it against `@codemirror/commands` history mapping.
- Watcher self-save skip (`watcher-handler.service.ts:41`) leaves the index stale when an external edit lands within 15 s of an editor save (stale index, not lost text).

## Paths checked and found SAFE
- `closeTab` asks before discarding a dirty tab and looks the tab up again by path after the dialog (`editor.service.ts:262-289`). An autosave that fires while the dialog is open just saves the tab.
- `saveFileByPath` on failure: it toasts and returns false, and `savedContent` stays untouched, so the tab stays dirty (`editor.service.ts:167-177`). On success it sets `savedContent` to the **written snapshot**, not the live content, so keystrokes typed during the write keep the tab dirty, and those keystrokes re-armed the debounce (`editor.store.svelte.ts:91-96`, `editor.service.ts:224-227`).
- `saveDirtyTabs` saves every dirty non-virtual tab, not only the active one, so tab switches lose nothing (`editor.service.ts:183-190`).
- The tab-switch and external-sync doc replaces are kept out of `onContentChange` (`MarkdownEditor.svelte:225-235,328-334`), so a switch never writes one note's text into another's store entry.
- Red button and Cmd+W close: `saveAllDirtyTabs`, a prompt naming the failed files, then the calendar drain and settings flush (`tauri-listeners.service.ts:53-71`).
- `switchVault` saves while `vaultStore.path` is still the old vault (`vault.service.ts:18-22`). Issue 34 is resolved; its open decision is SP-6.
- `updateNoteFrontmatter`: for an open tab it patches `tab.content` (keeping unsaved body text) and saves at once. On failure it restores the base only if the content is unchanged. For a closed note it writes with `create: false`, so a vanished note is not recreated (`frontmatter-write.service.ts:112-158`).
- The link updater rewrites a dirty tab from its in-memory content, not from disk (`link-updater.service.ts:33-35`). Type rename rewrites open tabs from `tab.content` (`type-definitions.service.ts:213-215`).
- Rust task toggle and the other Rust writers use `write_atomic` (`vault.rs:683`, `utils/fs.rs:16-32`).
- In-app rename and move retarget the tab synchronously right after `diskOp`, before any other await (`path-change.service.ts:127-132`, `link-updater.service.ts:73-86`).
- `moveToTrash` never removes the container once the file is in it (`trash.service.ts:87-93`).
- `openFileInEditor` checks again for an existing tab after the read, so no duplicate tab is created (`editor.service.ts:127-133`).
- Discarding at `closeTab` also drops the pending debounce for that tab, because `saveDirtyTabs` reads the live tab list (`editor.service.ts:184`), so a discarded tab is never written later.

## Not verified
- Nothing was run. SP-1 and SP-2 rest on the fetched tao, muda and tauri source, not on a live Cmd+Q test.
- SP-14's interleaving assumes the tauri async command runtime runs two `write_text_file` calls in parallel. Not checked in tauri's command dispatch.
