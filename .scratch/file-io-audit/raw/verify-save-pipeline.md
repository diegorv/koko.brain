# Adversarial verification: save-pipeline

Read-only. Nothing was built or run. Every claim was re-read in the repo at the cited line. READ = in the code; INFER = my conclusion; FETCHED = third-party source I pulled by web fetch.

Third-party sources fetched for this pass:
- tauri-apps/tao `dev` `src/platform_impl/macos/app_delegate.rs`: registers `applicationWillTerminate:` -> `AppState::exit()`. It does NOT register `applicationShouldTerminate:`. (The lockfile pins tao 0.37.2, Cargo.lock:5303-5304. I read `dev`, not the 0.37.2 tag.)
- tauri-apps/tauri `dev` `crates/tauri/src/app.rs`: `restart` on a non-main thread and `request_restart` both call `request_exit(RESTART_EXIT_CODE)`. Nothing creates `WindowEvent::CloseRequested`. `prevent_exit` is ignored for the restart code.
- tauri-apps/tauri `dev` `crates/tauri-runtime-wry/src/lib.rs`: `Message::RequestExit` fires `RunEvent::ExitRequested`, does `try_recv` for Prevent and then sets `ControlFlow::ExitWithCode`. It never loops over windows or calls `on_close_requested`. `Event::LoopDestroyed` only forwards `RunEvent::Exit`.
- tauri-apps/plugins-workspace `v2` `plugins/process/src/commands.rs`: `restart` is a sync command that calls `app.request_restart()`.
- tauri-apps/plugins-workspace `v2` `plugins/fs/src/commands.rs`: `write_text_file` is `async fn` -> `write_file_inner`. With no options it opens `truncate: true, create: true`, then one `write_all`. No temp file, no rename, no flush or sync.

Known-issue check: I searched `.scratch/architecture-stability/issues/*.md` for the themes (quit, truncate, write_atomic, relaunch, toggle_task, deep link append, closeTabsForDeletedPath, restoreSnapshot, debounce). The only match is issue 34, for SP-6.

---

## SP-1 Cmd+Q bypasses the save-on-close handler: CONFIRMED, data-loss

- READ: `src-tauri/src/lib.rs:195` `.quit()` (the predefined item). `lib.rs:353` `.run(tauri::generate_context!())` with no RunEvent closure. The one `on_window_event` (`lib.rs:94-99`) belongs to the composer window (`intercept_close_as_hide`). `on_menu_event` (`lib.rs:274-278`) handles only `settings`.
- READ: the only save-on-quit code is `registerCloseHandler` (`src/lib/app/tauri-listeners.service.ts:50-82`), which listens to `onCloseRequested`. A grep for `beforeunload`, `onCloseRequested`, `exit(` and `relaunch` across `src/lib` and `src/routes` turns up nothing else.
- FETCHED: tao has no `applicationShouldTerminate:`, so AppKit's `terminate:` runs `applicationWillTerminate:` -> `AppState::exit` -> `LoopDestroyed` -> `RunEvent::Exit` (runtime-wry). No `CloseRequested` is sent.
- I tried to refute it with a JS-side Cmd+Q binding, a RunEvent handler or a window-destroy hook. None exists.
- INFER: an edit less than 2 s old (`editor.service.ts:197`), or a tab whose save keeps failing, is lost on Cmd+Q with no prompt. So is a settings change from the last 500 ms (`tauri-listeners.service.ts:67-70`).
- Repro: type in a note and press Cmd+Q at once, then reopen the app. Test idea: an E2E or Rust-side test is hard to write. Verify on a release build.
- Fix hint: pass a `RunEvent::ExitRequested` handler to `.run(...)` that calls `api.prevent_exit()` and emits an event to JS. JS runs the same save/prompt/flush path and then calls `exit()`.

## SP-2 "Restart to update" skips the save: CONFIRMED (narrowed), data-loss

- READ: `src/lib/core/settings/sections/UpdateSection.svelte:208-210` `restartApp()` = `await relaunch()`, wired at `:293`. No `saveAllDirtyTabs` and no `flushSettingsPersistence`.
- FETCHED: plugin `restart` -> `request_restart` -> `request_exit(RESTART_EXIT_CODE)` -> `ExitRequested` (no handler here, and prevent is ignored for the restart code anyway) -> Exit -> restart. No `CloseRequested`.
- Narrowing: the Restart button appears only after a download finishes, and the user is in the Settings dialog. A tab that is dirty because of a sub-2 s edit is therefore unlikely: the debounce keeps running and saves it. The realistic precondition is a tab whose save keeps failing. In that case the window-close path would prompt, and this path discards the tab silently. A settings change made within 500 ms of the click is also lost, but that is unlikely.
- Repro: make an open note read-only (`chmod 444`) and type into it until the toasts start. Then go to Settings > Update, download and click Restart. The edit is gone after the relaunch.
- Fix hint: make `restartApp` run the close-handler sequence (save, prompt on failure, drain, flush) before `relaunch()`, or route both through the SP-1 ExitRequested handler.

## SP-3 Deep-link daily/new append or prepend drops the open tab's unsaved keystrokes: CONFIRMED (narrowed), data-loss

- READ: `src/lib/app/deep-link-actions.ts:37` opens the daily note, then `:54` `readTextFile` reads the disk copy, `:56-58` merges into it, `:61` writes, and `:63` calls `syncExternalContentToEditor(..., true, 'none')`. `markSaved=true` -> `updateTabContentByPath` sets both `content` and `savedContent` (`editor.store.svelte.ts:130-136`). `'none'` arms no timer (`editor.service.ts:213-221`). The debounced `saveDirtyTabs` then finds the tab clean (`editor.service.ts:184-187`).
- READ: in the same vault `resolveAndDispatch` goes straight to `executeAction` with no save (`deep-link.service.ts:158-161`). Only the cross-vault branch calls `switchVault`, which saves first. The `new` action has the same pattern for prepend at `deep-link.service.ts:254-268` and append at `:273-287`.
- Partial refute: the "save keeps failing" variant mostly does not hold. The deep-link write uses the same plugin `writeTextFile` on the same path, so a read-only file, a full disk or a missing folder makes it throw before the sync, and `executeAction` toasts it (`deep-link.service.ts:202-205`). The loss needs a tab dirty from an edit under 2 s old (or one whose earlier failure was transient). That is the normal state while typing, and a Raycast or Shortcuts hotkey fired mid-typing is the intended use.
- Repro / test idea: with real stores and mocked plugin-fs, open the daily tab, call `onContentChange('disk + typed')` without advancing timers, then run the daily action with `content=X`. Assert that the tab content contains "typed". Today it equals `disk + '\n' + X`.
- Fix hint: if a tab is open for the path, merge into `tab.content` (the link-updater idiom at `link-updater.service.ts:33-35`), or `await saveFileByPath(path)` before the read.

## SP-4 Task toggle in the Tasks tab overwrites the note's unsaved edits: PLAUSIBLE, data-loss

- READ: `src/lib/features/tasks/tasks.service.ts:100-115`. Rust `toggle_task_status_inner` reads from disk (`src-tauri/src/commands/vault.rs:665-666`) and writes with `write_atomic` (`:679`). TS then runs `syncExternalContentToEditor(filePath, updatedContent, true, 'none')`, so the tab becomes disk+toggle and clean.
- READ: TasksView is mounted only in the Tasks virtual tab (`EditorView.svelte:70-71`; grep found no other mount). `switchTab` (`editor.service.ts:250-255`) and `MarkdownEditor` `onDestroy` (`MarkdownEditor.svelte:147-160`) do not save. The note's debounce is still armed but finds the tab clean.
- Partial refute: the failing-save variant fails. `write_atomic` refuses read-only targets (`src-tauri/src/utils/fs.rs:20-24`) and fails the same way on a full disk or a missing folder, so the toggle errors and no sync happens. The remaining window is 2 s from the last keystroke in N to the click on N's checkbox in the Tasks tab. That needs a quick tab switch plus a click, which is tight but possible. The `lineNumber` comes from the indexed disk version, which may also not match the buffer.
- Repro / test idea: real editor store; open N, `onContentChange(...)` with no timer advance; mock `toggle_task_status` to return the disk+toggle content; call `toggleTask(N, line)`. Assert the typed text survives (it does not).
- Fix hint: `await saveFileByPath(filePath)` before `call('toggle_task_status')`. If the save fails, abort.

## SP-5 Delete closes dirty tabs before the Trash move without saving: PLAUSIBLE, re-graded minor

- READ: `path-change.service.ts:125` `closeTabsForDeletedPath(from)` runs before `:127` `await diskOp()`. `editor.service.ts:356-366` has no dirty check and no save. `moveToTrash` rethrows on failure (`trash.service.ts:71,93-99`).
- READ, and it supports the mechanism: the code itself knows this gap. `event-calendar.service.ts:1034-1036` says "`deleteItem` closes tabs without a dirty check and the Trash keeps only the disk bytes, so an unsaved edit is saved first". Only the calendar path saves first.
- Refute pressure: every UI delete path asks first (`note-action-bar.service.ts:21`, `NoteRowMenu.svelte:122-127`, `FilesNavigator.svelte:170-174`). The 2 s debounce keeps running while the native dialog is open, so the edit is saved unless the user confirms within 2 s of the last keystroke. The user is also deleting the note on purpose. What is lost is the last few seconds of edits in the Trash copy, or (case b) the edits of a note whose Trash rename then failed. Both are real but narrow, so I re-graded to minor. Case (c), a folder delete dropping a child whose save keeps failing, is silent but also part of a delete the user asked for.
- Repro: type in N, open its row menu, choose "Move to trash" and confirm within 2 s. Restore it from the Trash: the last edit is missing.
- Fix hint: in `applyPathChange` for `to === null`, save the dirty tabs under `from` (via `saveFileByPath`) before `closeTabsForDeletedPath`, as `deleteNow` does.

## SP-6 Vault switch after a failed save destroys the buffer: CONFIRMED, data-loss, KNOWN-PARTIAL (issue 34)

- READ: `vault.service.ts:19` ignores the returned failed list. `app-lifecycle.service.ts:180` ignores it again. Teardown runs `resetEditor()` (`app-lifecycle.service.ts:621`) -> `editorStore.reset()` -> `tabs = []` (`editor.store.svelte.ts:165-167`). Window close prompts in the same state (`tauri-listeners.service.ts:56-63`). The vault switch does not.
- Known: issue 34 (Comments, 2026-11-01) records that "the switch still goes ahead … whether to block the switch instead is the owner's call". It frames the cost as a missing snapshot and search row, not as the destruction of the buffer.
- Repro: `chmod 444` an open note and type in it. Switch vault, then switch back: the edit is gone. Test idea: real stores, `writeTextFile` mocked to reject, `switchVault(B)`, then assert a prompt was asked or the switch was aborted.
- Fix hint: if `saveAllDirtyTabs()` returns failures in `switchVault`, `ask` the same "lose unsaved changes?" question and abort the switch on No.

## SP-7 External rename or delete of an open note leaves the tab on the old path, and the next save resurrects it: CONFIRMED, re-graded stale-state/corruption (no text lost)

- READ: the watcher batch only calls `reloadExternallyChangedTabs` then `rebuildAllIndexes` (`app-lifecycle.service.ts:481-487`). A failed read is skipped (`editor.service.ts:390-393`). `closeTabsForDeletedPath` and `updateTabAfterRenameOrMove` have no caller outside `applyPathChange` (grep: `path-change.service.ts:125,132` only). `watcher-handler.service.ts` never touches tabs. `saveFileByPath` writes with default options (`editor.service.ts:168`) = `create: true` (FETCHED).
- Refute pressure: a clean tab is never written (`editor.service.ts:163`), so the old path only comes back once the user types (or the tab was already dirty). No text is lost: A.md gets the full buffer. The damage is a deleted note coming back, or a renamed note duplicated (A.md new, B.md old), which spreads through sync. I classify it as corruption of vault state, not data-loss.
- Repro: open A.md, run `mv A.md B.md` in a terminal, type one character and wait 2 s. Both A.md and B.md now exist.
- Fix hint: in the watcher batch, for an open tab whose path no longer exists, mark the tab as orphaned and stop autosave (or prompt), and save with `{ create: false }` for tabs that were loaded from disk.

## SP-8 A dirty tab overwrites an incoming external change: PLAUSIBLE, data-loss of the external version (deliberate design)

- READ: `editor.service.ts:369-381` skips dirty tabs on purpose ("the editor always wins"). `saveFileByPath` (`:161-170`) does no disk or mtime check. History snapshots are taken only through the after-save observer (`file-history.service.ts:190-196`, only caller of `saveSnapshotForFile`), so the external bytes never get a snapshot.
- It holds, but the window is the 2 s debounce (or a failing save, in which case the overwrite is delayed until a save succeeds). The documented intent covers it, so this is a design risk to surface, not a bug in the code's own contract.
- Repro: type in N, and within 2 s overwrite N from a terminal (`echo external > N.md`). After the autosave, N holds the buffer. The external text is gone and not in File History.
- Fix hint: before writing, compare the disk content (or mtime) with `savedContent`. If it changed, write a conflict copy (or a history snapshot of the disk bytes) before overwriting.

## SP-9 Editor save truncates in place: CONFIRMED (mechanism), data-loss in combination

- FETCHED: the plugin opens with `truncate:true` and runs one `write_all`, with no temp file or fsync. READ: `editor.service.ts:168` calls it with no options. The repo's own `write_atomic` (`src-tauri/src/utils/fs.rs:16-32`) says in its doc comment that this exact pattern "risks" a truncated note.
- ENOSPC partway through `write_all` leaves a zero-length or partial file, while the buffer stays dirty and a toast shows (`editor.service.ts:173-176`). Both copies are lost only when the buffer goes too: SP-1 Cmd+Q, SP-2, SP-6, "Close anyway" or a crash. A power loss during the write gives the same result. Likelihood is low, but the mechanism is certain.
- Test idea: a Rust integration test is not possible against the plugin. Repro on a nearly full small disk image used as the vault.
- Fix hint: route the editor save through a Rust command that uses `write_atomic` (adding a `sync_all` on the temp file), as the task toggle already does.

## SP-10 Trailing-only debounce, no maxWait, no blur flush: PLAUSIBLE, re-graded minor

- READ: `src/lib/utils/debounce.ts:9-17` has no maxWait. The only arming is `onContentChange`/`syncExternalContentToEditor` (`editor.service.ts:90,224-227`). `onFocusChanged` (`tauri-listeners.service.ts:309-315`) only refreshes the daily note. `visibilitychange` is used only by the event calendar and log.service.
- Refute pressure: switching apps does not lose anything by itself, because the timer keeps running and saves 2 s later. Loss needs a long run of typing with no 2 s pause followed by a renderer crash or force quit. Cmd+Q is already counted under SP-1. So: minor on its own, and it makes SP-1 worse.
- Fix hint: add a maxWait (for example 10 s) to the body debounce, and flush `saveAllDirtyTabs` on window blur.

## SP-11 File-history Restore on a board-mode tab writes nothing and closes as success: CONFIRMED, minor

- READ: `file-history.service.ts:82-102`. It dispatches only `if (view)`, then calls `saveCurrentFile()`. The tab is not dirty, so `saveFileByPath` returns true early (`editor.service.ts:163`). Then `fileHistoryStore.reset()` closes the dialog. Board-mode tabs mount KanbanView, CanvasView or CollectionView instead of MarkdownEditor (`EditorView.svelte:78-83`), and `MarkdownEditor` `onDestroy` nulls `editorView` (`MarkdownEditor.svelte:148`). Cmd+Shift+H and the palette open history for any active tab (`global-keybindings.ts:167-175`, `commands.ts:303-311`). `.kanban`, `.canvas` and `.collection` saves do get snapshots, because the history observer has no extension filter (`file-history.service.ts:190-196`).
- Repro: open a `.kanban` file in board view, move a card (so it saves a snapshot) and move it again. Press Cmd+Shift+H, pick the older version and Restore. The file stays unchanged and the dialog closes.
- Fix hint: in `restoreSnapshot`, when no view is mounted for `filePath`, call `syncExternalContentToEditor(filePath, restored, false, 'none')` and `await saveFileByPath(filePath)`, and throw if it returns false.

## SP-12 Autosave during an in-app rename or move recreates the old path: PLAUSIBLE, stale-state (ghost duplicate), low likelihood

- READ: `renameItem`/`moveItem` diskOp = plugin `rename` (`fs.service.ts:211,239`). The tab path is retargeted only after `await diskOp()` (`path-change.service.ts:127,132`). A debounced `saveFileByPath` that fires during that await reads `tab.path` = old and writes it with `create:true` (`editor.service.ts:162-168`). If the rename lands first, old.md is recreated. `markSavedByPath(old)` then misses the moved tab (`editor.store.svelte.ts:91-96`), so the tab stays dirty with no timer until the next keystroke.
- The window is only the rename IPC (milliseconds). Auto-move (`auto-move.service.ts:113-121,188`) fires `debounceMs` after a save, which can overlap continued typing, but the two timers still have to collide inside that window. The ordering of the two concurrent IPCs is not pinned down.
- Fix hint: cancel the debounces before `diskOp` and re-arm them after the retarget, or have `saveFileByPath` look the tab up by identity rather than by captured path.

## SP-13 Keystrokes during short async windows are overwritten: PLAUSIBLE, minor

- READ: `reloadExternallyChangedTabs` checks dirtiness before the read (`editor.service.ts:380`). After the read it checks only `diskContent === tab.savedContent` (`:398`), then syncs with markSaved=true (`:401`), so keystrokes typed during the read are replaced. `updateLinksAfterRename` snapshots content, awaits the write, then syncs markSaved=true (`link-updater.service.ts:33-47`). `renameType` does the same per tab (`type-definitions.service.ts:213-220`).
- The windows are IPC latencies in milliseconds. For the link updater the user is usually in the rename input, not the affected tab. The close-handler awaits come right before `destroy()`, when the user is closing anyway. Minor.
- Fix hint: after the await, re-check `tab.content === <pre-await content>` (and `!isTabDirty` for the reload). Skip, or merge, when it changed.

## SP-14 Same-path saves are not serialized; retry chains multiply: PLAUSIBLE, minor

- READ: there is no per-path lock in `saveFileByPath` (`editor.service.ts:161-178`). The callers are the debounced `saveDirtyTabs` (`:183-194`), the retry `setTimeout` (`:192`), `saveAllDirtyTabs` (`:234-247`) and `frontmatter-write.service.ts:129`, which saves at once while a body save may be in flight. The fetched plugin command is `async fn` doing blocking `std::fs`. Two in-flight commands can execute concurrently on the async runtime (INFER, I did not trace tauri's dispatch).
- Interleaving two truncating opens needs both file ops to overlap within microseconds. A reorder (the later IPC executes first) is more plausible, and it is also unpinned. Retry chains are confirmed: each failing `saveDirtyTabs` arms its own 5 s `setTimeout` that is never cancelled, and `resetEditor` does not cancel them (`:412-417`). The result is more toasts and more concurrent writes, with no direct loss.
- Fix hint: chain saves per path through a promise queue, and keep a single retry timer.

---

## Not verified
- Nothing was run. SP-1 and SP-2 rest on tao/tauri `dev` source, not the locked tao 0.37.2 / tauri 2.12.5 tags, and not on a live Cmd+Q test.
- SP-14 parallel dispatch of two plugin-fs commands was not traced in tauri's IPC layer.
