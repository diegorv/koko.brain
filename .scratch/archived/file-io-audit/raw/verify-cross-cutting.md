# Verify: cross-cutting (adversarial)

Read-only. Nothing was built, run or tested. READ = seen in code at the cited line. FETCHED = third-party source read on GitHub. INFER = reasoned, not observed.

## Sources fetched

- tauri-apps/tao `dev` `src/platform_impl/macos/app_delegate.rs`: the delegate registers `applicationDidFinishLaunching:`, `applicationWillTerminate:`, `application:openURLs:`, the user-activity and reopen selectors, and `applicationSupportsSecureRestorableState:`. It does not register `applicationShouldTerminate:`. `application_will_terminate` calls `AppState::exit()`.
- tauri-apps/tao `dev` `src/platform_impl/macos/app_state.rs`: `AppState::exit()` sends only `Event::LoopDestroyed`, then drops the callback. It emits no `WindowEvent`.
- tauri-apps/muda `dev` `src/platform_impl/macos/mod.rs`: `PredefinedMenuItemType::Quit => Some(sel!(terminate:))`.
- tauri-apps/plugins-workspace `v2` `plugins/fs/src/commands.rs`: `write_file_inner` opens the target in place with `truncate: true, create: true` by default and calls `write_all`. There is no temp file, no rename and no `sync_all`.
- codemirror/commands `main` `src/history.ts`: `if (tr.annotation(Transaction.addToHistory) === false) return !tr.changes.empty ? state.addMapping(tr.changes.desc) : state`. `addMappingToBranch` keeps the top event if `event.changes && !event.changes.empty`. `mapEvent` uses `event.changes.map(mapping)`.
- codemirror/state `change.ts` `mapSet`: recalled from memory, not fetched this pass. It matches the reviewer's fetched summary. An insertion strictly inside or at the end of a range B deletes is emitted after B's inserted text. An insertion at offset 0 takes the `a.ins >= 0` branch first, so it lands before that text.

## Known-issue check

I grepped `.scratch/architecture-stability/issues/*.md` and `.scratch/suspected-bugs/` for quit/Cmd+Q, addToHistory/undo, silent, toggle_task, manifest, loadSettings/retentionDays/cleanup_history, read_files_batch and closeTabsForDeletedPath. The only match is Issue 34 (status resolved), which matches CC-9 in part. Every other hit was an unrelated word match.

## Verdicts

### cross-cutting-1: CONFIRMED (data-loss)
- READ: the app menu ends with `.quit()` (`src-tauri/src/lib.rs:195`). `on_menu_event` handles only `"settings"` (`lib.rs:274-278`). `.run(tauri::generate_context!())` has no RunEvent closure (`lib.rs:353`). The only `on_window_event` is `intercept_close_as_hide` for the composer (`lib.rs:91-100`). There are no `ExitRequested`, `RunEvent` or `prevent_exit` hits in `src-tauri/src`.
- READ: the only frontend save-on-quit is `onCloseRequested` (`src/lib/app/tauri-listeners.service.ts:53-71`), which runs saveAllDirtyTabs, the discard prompt, the calendar drain and the settings flush. `onFocusChanged` (`:309`) only refreshes the daily note. There is no `beforeunload` or `pagehide` handler.
- FETCHED: Quit sends `terminate:`. tao has no `applicationShouldTerminate:`, so AppKit terminates without asking. `applicationWillTerminate:` then leads to `AppState::exit` and `LoopDestroyed` only. No CloseRequested ever reaches the JS handler.
- READ: the body autosave debounce is 2000 ms (`editor.service.ts:197`) and the retry interval is 5 s (`:181,191-193`).
- Related, INFER: `relaunch()` in `UpdateSection.svelte:208-210` also restarts with no save. The window is small there, because the user is in Settings.
- Refutation attempts failed: nothing intercepts Cmd+Q in JS, and nothing saves on blur.
- Repro: type in a note and press Cmd+Q within 2 s. Reopen the app; the edit is missing. Variant: make a save fail (for example `chmod a-w` on the note), type, then Cmd+Q. There is no prompt.
- Fix hint: handle `RunEvent::ExitRequested` and the macOS terminate path. Emit an event to JS, call `api.prevent_exit()`, and let JS run the close-handler sequence, then `exit`. Or route the Quit menu item to a custom item that closes the window.

### cross-cutting-2: CONFIRMED (data-loss; common case needs a confirm within about 2 s, the failing-save case is reliable)
- READ: `applyPathChange` calls `closeTabsForDeletedPath(from)` before `await diskOp()` when `to === null` (`src/lib/core/filesystem/path-change.service.ts:125-127`). The doc comment at `:96-99` says this is deliberate, so the debounce cannot recreate the file. `closeTabsForDeletedPath` removes the tab with no dirty check (`editor.service.ts:356-366`). `saveDirtyTabs` filters `editorStore.tabs` (`:183-186`), so a closed tab is never saved. `deleteItem` does not save first (`fs.service.ts:167-190`).
- READ: the callers `note-action-bar.service.ts:19-28`, `NoteRowMenu.svelte:121-129` and `FilesNavigator.svelte:169-175` each `ask` and then call `deleteItem`. None of them saves. The event calendar saves first and documents why (`event-calendar.service.ts:1035-1037`).
- READ: if `moveToTrash` throws before the rename (`trash.service.ts:85-95`), the file stays on disk but the tab is already gone.
- INFER: the JS debounce keeps running while the native `ask` dialog is open. A dirty tab therefore survives only if the confirm comes within 2 s of the last keystroke, or if saves have been failing (the tab stays dirty indefinitely).
- Repro (test): put a dirty tab in `editorStore`, mock `rename` to reject, call `deleteItem(path)`, and assert the tab or its content is gone and `writeTextFile` was never called with the dirty content. App variant: make the note read-only so autosave fails, type, then choose Move to Trash and Restore. The edits are missing.
- Fix hint: in `applyPathChange` (delete branch), `await saveFileByPath` for the matching dirty tabs before `closeTabsForDeletedPath`, as `deleteNow` does. Abort if a save fails, and restore the tabs if `diskOp` throws.

### cross-cutting-3: CONFIRMED (corruption; mechanism traced through repo and CodeMirror source, not run)
- READ: there is one `MarkdownEditor` instance for every markdown tab. `EditorView.svelte:72-85` has no `{#key}`, and `EditorState.create` runs only in `onMount` (`MarkdownEditor.svelte:99-131`). `history()` is installed once (`setup/editor-extensions.ts:130`), with `historyKeymap` (`:160`). A tab switch dispatches a full replace with `Transaction.addToHistory.of(false)` (`MarkdownEditor.svelte:230-235`). The external-sync effect does the same (`:329-333`). Nothing clears the history.
- FETCHED: `addToHistory === false` maps the done/undone branches through the change. An event survives when its mapped changes are non-empty. Inverse changes that contain inserted text (from deletes, or typing over a selection) survive a full-doc replace and move to the end of the new doc. Pure-typing inverses (deletions) collapse and are dropped, and their mapping carries down to older events.
- READ: an undo transaction is not a tab switch or an external edit, so the `updateListener` gate passes (`editor-extensions.ts:171-188`). `onContentChange` then updates the active tab and arms the 2 s autosave (`editor.service.ts:224-227`).
- READ: no test in `src/tests` covers markdown-editor undo. The undo hits are canvas, calendar and paste tests only.
- Repro (failing test): `EditorState.create({doc:'A1 para A2', extensions:[history()]})`. Delete `para`. Dispatch a full replace to `'B doc'` with `addToHistory.of(false)`. Run `undo(view)` and assert the doc is still `'B doc'`. Today it becomes `'B docpara'` (INFER from the source).
- Fix hint: keep one `EditorState` per tab (swap with `view.setState`), or reset history on a tab switch and on external syncs (reconfigure a compartment holding `history()`). For external syncs, a minimal diff instead of a full replace would keep the history meaningful.

### cross-cutting-4: CONFIRMED (data-loss)
- READ: the silent create branch (`src/lib/features/deep-link/deep-link.service.ts:308-315`) does `mkdir` and then `writeTextFile(fullPath, content)`, with no `exists` check and no `create_new`. It is reached whenever `prepend`, `append` and `overwrite` are all false (`:252-305`). `resolveContent` returns `''` when there is no content or clipboard (`:214-223`). The parser reads `silent` and `overwrite` as independent booleans (`deep-link.logic.ts:95,98`). The non-silent branch uses `openOrCreateNote`, which checks `exists`.
- INFER: `markRecentSave` makes the watcher skip the write, so an open tab is not refreshed. A clean open tab then shows the old text, and its next edit overwrites the URL content.
- Repro (test): mock `exists` to true, `{type:'new', name:'Inbox', silent:true}`, and assert `writeTextFile` is not called on the existing path. Today it is called with `''`.
- Fix hint: in the silent default branch, check `exists` and, as Obsidian does, pick a unique name (or refuse) unless `overwrite` is set. Or write with `createNew: true`.

### cross-cutting-5: CONFIRMED (data-loss; narrow window)
- READ: Rust reads disk, toggles and `write_atomic`s (`src-tauri/src/commands/vault.rs:664-683`). TS calls `syncExternalContentToEditor(filePath, updatedContent, true, 'none')` (`src/lib/features/tasks/tasks.service.ts:114`). With `markSaved=true`, `updateTabContentByPath` overwrites `content` and `savedContent` (`editor.store.svelte.ts:130-136`). The tab reads clean, and `saveDirtyTabs` skips it.
- READ: the only caller is `TasksView.svelte:66-68`, which renders only as the Tasks tab (`EditorView.svelte:70-71`). The note is therefore never the active tab at toggle time. `switchTab` does not save (`editor.service.ts:250-255`).
- INFER, narrowing: the global 2 s debounce keeps running after the switch to the Tasks tab, so the loss needs the tick within 2 s of the last keystroke, counting the tab switch. The failing-save variant works only when the TS write fails but the Rust `write_atomic` succeeds (for example a plugin-fs scope or ACL refusal). Disk-full fails both, and the toggle then errors with no sync.
- Repro (test): put a dirty tab for N in the real store, mock `call('toggle_task_status')` to return changed content, and call `toggleTask`. Assert the dirty edit survives. Today the content equals the Rust result and the tab is clean.
- Fix hint: when the tab is dirty, apply the single-line toggle to `tab.content` and save it through `saveFileByPath`, or reject the toggle. Do not replace the buffer with the disk result.

### cross-cutting-6: CONFIRMED (data-loss; narrow window)
- READ: `executeDailyAction` opens the note (`src/lib/app/deep-link-actions.ts:37`), reads disk (`:54`), writes `existing + content` (`:61`) and syncs with `markSaved=true` (`:63`). The same pattern is in `deep-link.service.ts:254-263` (prepend), `:272-281` (append) and `:292-298` (overwrite). `deep-link.service.race-audit.test.ts:130-157` sets up a dirty tab and asserts that `syncExternalContentToEditor(..., true, 'none')` is called. It pins the overwrite, although the sync itself is mocked there.
- INFER: the window is the 2 s debounce, or a failing save. Firing a clip-to-daily hotkey from another app within 2 s of typing is uncommon but possible with a global hotkey.
- Repro (test): a dirty tab for today's daily note, a daily append action with content, and a real `syncExternalContentToEditor`. Assert the dirty text is preserved.
- Fix hint: if the tab is dirty, merge into `tab.content` (append or prepend to the buffer) and save it through `saveFileByPath`, instead of building from disk.

### cross-cutting-7: CONFIRMED (data-loss of settings; history loss only when the user raised retention above 7)
- READ: any throw inside the `try` of `loadSettings` resets to `DEFAULT_SETTINGS` and saves (`src/lib/core/settings/settings.service.ts:166-178`). Throws include `readTextFile`, `JSON.parse` (`:54`), field access on a non-object `parsed` such as `null`, and a throw from `saveSettings`, `applyActiveTheme` or `applyHeadingTypography` after the merge (`:155-158`). The settings write is plugin-fs in place (`:193`). The fetched plugin-fs source does truncate plus `write_all` with no fsync.
- READ: `initializeVault` awaits `loadSettings` (`app-lifecycle.service.ts:198`) and later calls `cleanup_history` with `settingsStore.history.retentionDays` (`:273-277`). The default is 7 (`settings.store.svelte.ts:96`). Rust deletes every snapshot older than retention+30 days and thins the rest to one per day (`src-tauri/src/commands/history.rs:137-157`).
- Correction: the history purge harms only a user whose saved retention was above 7. At the default it would run the same anyway. The settings loss itself (every customization, with no backup and only `error()`, no toast) happens on every trigger.
- INFER: a transient `saveSettings` failure right after a good parse also falls back to defaults in memory, and a later persistence write could store those defaults. Not traced.
- Repro (test): mock `readTextFile` to return `'{"history":{"retentionDays":90},'`, call `loadSettings`, and assert the store keeps 90, or that the file is backed up and not overwritten. Today it is 7 and defaults are written.
- Fix hint: on a parse or read error, copy the file to `settings.json.bak` (or refuse to save) and toast. Skip `cleanup_history` when the settings came from the fallback. Write settings atomically.

### cross-cutting-8: CONFIRMED (data-loss of Trash entries; low likelihood, needs a corrupt or unreadable manifest)
- READ: `loadTrash` catches every error and sets `[]` with no toast (`src/lib/core/trash/trash.service.ts:36-40`), so the `Promise.all` catch and its toast (`app-lifecycle.service.ts:284-295`) never fire for trash. `parseTrashManifest` returns `[]` on bad JSON or a non-array, and drops invalid entries (`trash.logic.ts:58-66`; the guard is at `:95-105`). `moveToTrash` saves `[item, ...trashStore.items]` (`trash.service.ts:79`) through an in-place `writeTextFile` (`:268-275`). `emptyTrash` removes the whole items dir (`:205-210`). No code rebuilds the manifest from `items/<id>/`.
- Note: the earlier entries are already hidden after the failed load. The next delete makes that permanent on disk. The files stay under `.kokobrain/trash/items/` and can be recovered from Finder until Empty Trash.
- Repro (test): mock `readTextFile` of the manifest to return truncated JSON, call `loadTrash` then `moveToTrash`, and assert the written manifest still holds the earlier ids. Today it holds only the new item.
- Fix hint: on a failed or invalid load, mark the store as untrusted. Back up the bad manifest, rebuild it from `items/*`, or block the next manifest write. Write the manifest atomically.

### cross-cutting-9: CONFIRMED (data-loss; KNOWN-PARTIAL, Issue 34)
- READ: `switchVault` awaits `saveAllDirtyTabs()` and discards its return value (`src/lib/core/vault/vault.service.ts:18-21`). `initializeVault` retries once (`app-lifecycle.service.ts:180`), then calls `teardownVault()` (`:188`), and teardown calls `resetEditor()` (`:622`), which cancels the timers and runs `editorStore.reset()` (`editor.service.ts:412-417`). Unlike the close handler (`tauri-listeners.service.ts:56-63`), there is no prompt. Issue 34 (resolved) says the switch proceeds after a failed save and leaves blocking it to the owner. It does not mention the dropped buffer.
- Precondition: the save already failed and toasted (`editor.service.ts:173-175`).
- Repro (test): put a dirty tab in the store, make `writeTextFile` reject, call `switchVault(B)` and let `initializeVault` run. Assert the tab is still there or `ask` was called. Today the tabs are empty.
- Fix hint: in `switchVault`, if `saveAllDirtyTabs` returns failures, `ask` "Switch anyway and lose unsaved changes?" and abort on No.

### cross-cutting-10: PLAUSIBLE (re-graded: minor corruption/stale; timing-dependent)
- READ: `saveFileByPath` has no per-path guard (`editor.service.ts:161-176`). `attempt` in `frontmatter-write.service.ts:128-129` calls it while a debounced body save of the same path may still be awaiting `writeTextFile`. FETCHED: plugin-fs opens with truncate and calls `write_all` in place.
- Why only PLAUSIBLE: interleaved bytes need the second open+truncate to land between the first call's open and its write, a sub-millisecond window for KB-sized notes. Whether two plugin-fs commands run in parallel depends on Tauri's async command scheduling, which I did not verify. A likelier outcome is out-of-order completion (INFER). If the older write X lands last but its `markSavedByPath` runs first, disk holds X while `savedContent` is Y, the tab looks clean and the frontmatter change is missing on disk until the next edit saves the full buffer. The reverse order leaves the tab dirty with no timer armed, so nothing is lost.
- Repro idea: mock `writeTextFile` with controllable deferreds, start the body save, run `updateNoteFrontmatter`, resolve the deferreds in reverse order, and assert the last write's content equals `savedContent`.
- Fix hint: run all saves of one path through a single in-flight promise (`saveFileByPath` awaits any pending write of that path and then writes the latest `tab.content`).

### cross-cutting-11: CONFIRMED (stale-state)
- READ: `read_files_batch` returns `content: None` when canonicalize fails, when the path is outside the vault, and on any `read_to_string` error, including invalid UTF-8 and permissions (`src-tauri/src/commands/files.rs:36-75`). `incrementalUpdateFiles` maps `content === null` to `kind: 'delete'` (`src/lib/app/lifecycle/watcher-handler.service.ts:104-108`). The full cached scan does the opposite on a re-read failure and keeps the cached entry (`src-tauri/src/commands/vault.rs:1302-1314`), so the two paths disagree.
- Other triggers (INFER): a symlinked note that resolves outside the vault, or a file mid-replace by an editor that deletes and recreates it. The latter heals on the next event.
- The file itself is untouched. Only the index, FTS5 and semantic rows go.
- Repro (test): mock `read_files_batch` to return `{path, content:null, error:'stream did not contain valid UTF-8'}` and assert `applyNoteChange` is not called with `kind:'delete'`.
- Fix hint: treat a null result as a delete only when `exists(path)` is false (or when Rust reports NotFound). Otherwise keep the entry and log.

## Not verified

- Nothing was run. CC-1 rests on tao/muda source plus the repo, CC-3 on CodeMirror source. `mapSet` was not re-fetched this pass. CC-10 depends on Tauri command concurrency, which I did not check.
