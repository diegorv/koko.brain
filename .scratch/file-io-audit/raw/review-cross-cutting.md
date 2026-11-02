# Review: cross-cutting (write-site inventory, data-loss ranking, untested risk)

Senior review across the full note write-site inventory. Read-only: nothing was built, run or tested. READ = seen in code at the cited line. INFER = reasoned from code or fetched source, not observed in the app.

## Sources fetched (third party)

- tauri-apps/tao `dev` `src/platform_impl/macos/app_delegate.rs`: READ. The delegate registers `applicationWillTerminate:` and no `applicationShouldTerminate:`. The handler calls `AppState::exit()`.
- tauri-apps/tao `dev` `src/platform_impl/macos/app_state.rs`: READ. `AppState::exit()` sends only `Event::LoopDestroyed`, then drops the handler. It sends no `WindowEvent::CloseRequested` and has no way to cancel.
- codemirror/commands `main` `src/history.ts`: READ. A transaction with `Transaction.addToHistory` set to false calls `state.addMapping(tr.changes.desc)`. `addMappingToBranch` keeps an event when `event.changes` is non-empty after `mapEvent`, which maps the changes with `event.changes.map(mapping)`.
- codemirror/state `main` `src/change.ts`: READ (summarised by the fetch tool, with lines quoted). In `mapSet`, a change in `this` that lies fully inside a range `mapping` deletes is re-emitted as a zero-length insertion after the mapping's inserted text (`addSection(sections, 0, a.ins)` / `addInsert`). Insertions are never dropped. If it sits exactly at the start of the deleted range, it lands before the inserted text.
- A web search turned up several third-party Tauri apps that filed "Cmd+Q skips CloseRequested". I used them as leads only. The claim rests on the tao source above.

Known-issue check: I grepped `.scratch/architecture-stability/issues/*.md` for the terms in each finding. Only Issue 34 matches (CC-9, partial). Peer raw reviews in this audit already cover several findings. I cross-reference them by id so the owner can dedupe. They are not filed Issues.

## Write-site inventory (TS, READ by grep, `src/lib`, non-test)

Note-content writers: `editor.service.ts:168` (every save). `frontmatter-write.service.ts:149`. `link-updater.service.ts:39`. `type-definitions.service.ts:218` (renameType open tabs), `:291` and `:309` (.view files). `deep-link.service.ts:260,279,296,313`. `deep-link-actions.ts:61` (daily) and `:173` (capture). `file-icons.service.ts:98` (folder note placeholder). `templates.service.ts:116` (empty placeholders). `fs.service.ts:129` and `note-creator.service.ts:103` (`create_note`). `fs.service.ts:260,278` (`copyFile`). Rust `toggle_task_status` (`tasks.service.ts:102`) and `propagate_type_rename` (`type-definitions.service.ts:226`).
Path-changers: `fs.service.ts:211,239` (rename and move), `trash.service.ts:71,126`, `fs.service.ts:181` (permanent remove fallback).
App-data writers: settings `settings.service.ts:193`, trash manifest `trash.service.ts:275`, folder order `fs.service.ts:48`, auto-move `auto-move.service.ts:81`, recent icons `file-icons.service.ts:65`, todoist `todoist.service.ts:129`, history backups `file-history.service.ts:143`, logs `log.service.ts:69`.
Every TS writer is plugin-fs `writeTextFile`, which truncates in place. Every Rust writer is `write_atomic` (`src-tauri/src/utils/fs.rs:16-32`, temp file plus rename, no fsync).

## Findings (most severe first)

### CC-1 (data-loss, high confidence from source; NOT filed; also SP-1 in review-save-pipeline): Cmd+Q / app-menu Quit skips the save-on-close handler
- READ: The app menu uses the predefined quit item (`src-tauri/src/lib.rs:195`). There is no `RunEvent` callback on `.run(...)` (`lib.rs:353`). Main-window `on_window_event` has only the quick-capture hide hook (`lib.rs:94-99`).
- READ: Saving on quit lives only in `getCurrentWindow().onCloseRequested` (`src/lib/app/tauri-listeners.service.ts:51-75`). That handler is also the only place that asks "Close anyway and lose unsaved changes?" after a failed save (`:56-63`), and the only place that flushes settings (`:70`).
- FETCHED: tao terminate leads to `applicationWillTerminate`, then `AppState::exit`, then `LoopDestroyed` only. No CloseRequested event, and the quit cannot be cancelled.
- Scenario: type in a note and press Cmd+Q within 2 s (the debounce in `editor.service.ts:197`). The edit never reaches disk. A tab whose saves keep failing (`saveDirtyTabs` retry, `:183-194`) is discarded with no prompt.
- Not run. One-minute manual check: type, press Cmd+Q at once, reopen.

### CC-2 (data-loss, high confidence; NOT filed; RMD-1 / SP-5 / recovery F4): Move to Trash closes dirty tabs before the disk op and never saves them
- READ: `applyPathChange` calls `closeTabsForDeletedPath(from)` before `await diskOp()` (`src/lib/core/filesystem/path-change.service.ts:125-127`). `closeTabsForDeletedPath` removes matching tabs with no dirty check (`editor.service.ts:356-366`). The debounced `saveDirtyTabs` walks `editorStore.tabs` (`:183-186`), so it finds nothing.
- READ: Callers that do not save first: `note-action-bar.service.ts:24`, `NoteRowMenu.svelte:128`, and `FilesNavigator.svelte:174` (folder, all child tabs). The event calendar documents the bug and works around it: "`deleteItem` closes tabs without a dirty check and the Trash keeps only the disk bytes, so an unsaved edit is saved first" (`event-calendar.service.ts:1035-1037`).
- READ: If `moveToTrash` throws (`trash.service.ts:94-95`), the tab is already gone, so the buffer is lost while the file stays on disk.
- INFER: the confirm dialog narrows the common case. The 2 s autosave timer may fire while `ask` is open, so the loss needs a confirm within 2 s of the last keystroke. A tab that has been dirty for a long time because saves fail loses everything.
- Untested: the `closeTabsForDeletedPath` tests (`src/tests/lib/core/editor/editor.service.test.ts:874-940`) use clean tabs only.

### CC-3 (corruption, high confidence on mechanism from CodeMirror source; NOT filed, NOT in any peer review; SP passed it on unverified): undo history is shared across markdown tabs and survives full-document replaces, so Cmd+Z injects text from another note
- READ: One `EditorView` and one `EditorState` live for the whole markdown session, and `history()` is installed once (`src/lib/core/markdown-editor/setup/editor-extensions.ts:130,160`, `MarkdownEditor.svelte:107-131`). A tab switch replaces the whole doc in that state with `Transaction.addToHistory.of(false)` (`MarkdownEditor.svelte:230-235`). External syncs do the same (Properties panel, task toggle, link rewrite, watcher reload; `:329-333`). Nothing resets the history on a switch. `EditorState.create` runs only in `onMount`.
- FETCHED: `addToHistory: false` maps the undo stack through the change (`history.ts`). `ChangeSet.map` keeps insertions that fall inside a deleted range and moves them after the replacement text (`change.ts` `mapSet`). The inverse of a deletion is an insertion, so every deletion event survives a full-doc replace. The inverses of typing (deletions) collapse and are dropped.
- READ: an undo is a user transaction. It passes the `!isTabSwitching() && !isExternalEdit()` gate (`editor-extensions.ts:171-188`), then reaches `onContentChange`, which writes to the active tab (`editor.store.svelte.ts:84-88`) and arms the 2 s autosave (`editor.service.ts:224-227`).
- Scenario A (cross-note): in note A, select and delete a paragraph. Open note B (tab switch), make an edit, then press Cmd+Z a few times to undo it. After B's own events, the next Cmd+Z pops A's deletion and inserts A's paragraph at the end of B (at the start, if A's deletion was at offset 0). Autosave writes it into B. Every earlier tab in the session adds more such events, up to the history depth.
- Scenario B (same note): delete a sentence in paragraph 2, then change a property in the Properties panel (full-doc replace, `syncExternalContentToEditor(..., false, ...)`). Cmd+Z puts the sentence back at the end of the note, not in paragraph 2.
- Redo removes the insertion, so this is recoverable if the user notices. CM scrolls an undo into view, which helps, but the foreign text can come from a note the user is not looking at.
- Untested: no test in `src/tests` covers undo across a tab switch or an external sync (grep for `undo` finds only canvas, calendar and paste tests). Not run in the app.

### CC-4 (data-loss, high confidence; NOT filed; feature-writers F3): deep-link `new` with `silent=true` and no mode flag replaces an existing note, empty content included
- READ: `executeNewAction` reaches the "Create: default behavior" silent branch with no `exists` check: `mkdir`, then `writeTextFile(fullPath, content)` (`src/lib/features/deep-link/deep-link.service.ts:309-315`). `content` is `''` when neither `content` nor clipboard text is given (`:217-226`). The non-silent branch goes through `openOrCreateNote`, which checks `exists` first (`note-creator.service.ts:86`), and the separate `overwrite` flag exists for replacing (`:292-305`). So the silent default is inconsistent with both.
- Scenario: an automation fires `kokobrain://new?vault=V&name=Inbox&silent=true` meaning "create Inbox if missing". `Inbox.md` is emptied. It is not in Trash. File history only has the last in-app save, kept for `retentionDays` (`file-history.service.ts:110-121`, `history.rs:143-157`). If the note is open and dirty, nothing syncs the tab, so the next autosave writes the buffer back over the URL content.
- Untested: `deep-link.service.test.ts:287-304` covers only a new file.
- INFER: a browser can fire the URL after the user once allows the scheme for a site. Not checked.

### CC-5 (data-loss, high confidence on code path; NOT filed; rust-writes F1 / SP-4 / recovery F6): ticking a task in the Tasks view replaces the note's unsaved buffer with disk text
- READ: Rust reads DISK (`src-tauri/src/commands/vault.rs:669`), toggles, and `write_atomic`s it (`:683`). TS then calls `syncExternalContentToEditor(filePath, updatedContent, true, 'none')` (`src/lib/features/tasks/tasks.service.ts:114`). That sets `content` and `savedContent` (`editor.store.svelte.ts:130-136`), so the tab reads clean and the pending debounce saves nothing.
- Scenario: type in note N (dirty, under 2 s, or a failing save), then tick one of N's tasks in the Tasks tab (`TasksView.svelte:66-68`). The typed text is gone and the tab shows clean, with no toast. Compare `frontmatter-write.service.ts:113-131`, which patches the tab buffer instead.

### CC-6 (data-loss, high confidence on code path; NOT filed; SP-3 / feature-writers F4): daily and `new` append/prepend deep links build from disk and mark the open tab clean
- READ: `deep-link-actions.ts:37` opens the daily note first, so it is usually an open tab. `:54` reads disk, `:61` writes `existing + content`, and `:63` sets `syncExternalContentToEditor(..., true, 'none')`. The same pattern is at `deep-link.service.ts:254-286` (append/prepend) and `:292-298` (overwrite). `deep-link.service.race-audit.test.ts:130-157` pins the overwrite of a dirty tab.
- Scenario: typing in today's daily note, the user fires a clipboard-to-daily hotkey from another app within the 2 s debounce. The keystrokes vanish and the tab reads clean.

### CC-7 (data-loss of history, high confidence on chain; NOT filed; recovery F1 + fidelity F11): any settings load error rewrites defaults, and the same vault open then purges file history at 7-day retention
- READ: Any throw in the `try` of `loadSettings` resets the store to `DEFAULT_SETTINGS` and saves it (`src/lib/core/settings/settings.service.ts:166-178`). Triggers include a read error, a `JSON.parse` error, a `null` document, and a throw after the merge from `saveSettings`, `applyActiveTheme` or `applyHeadingTypography` (`:155-158`).
- READ: `initializeVault` then calls `cleanup_history` with `settingsStore.history.retentionDays` (`app-lifecycle.service.ts:273-277`). The default is 7 (`settings.store.svelte.ts:96`). Rust deletes snapshots older than retention+30 days permanently (`src-tauri/src/commands/history.rs:143-157`).
- Input that makes the error likely: settings are written by in-place `writeTextFile` (`settings.service.ts:193`) through a debounced persistence effect, so a crash during a write leaves truncated JSON. So does a hand edit with a trailing comma. The user gets no toast (`error()` only), and the old file is not backed up.

### CC-8 (data-loss of Trash entries, high confidence on mechanism, low-medium likelihood; NOT filed; recovery F2): a failed or invalid manifest load makes the next delete forget every earlier trashed item
- READ: `loadTrash` catches everything and sets `[]` with no toast (`src/lib/core/trash/trash.service.ts:37-40`). The outer `Promise.all` catch at `app-lifecycle.service.ts:292-295` is therefore never reached for trash. `parseTrashManifest` returns `[]` on bad JSON and silently drops entries that fail `isValidTrashItem` (`trash.logic.ts:58-66,95-105`). The next `moveToTrash` writes `[item, ...trashStore.items]`, which is just `[item]` (`trash.service.ts:79`), in place (`:275`).
- Scenario: the manifest is truncated by a crash mid-write, then the user deletes any note. Earlier items stay under `.kokobrain/trash/items/<id>/` but are not listed, so they cannot be restored from the UI. "Empty Trash" then removes the whole items directory, orphans included (`trash.service.ts:205-215`).
- Untested: no test for a save after a failed load (`src/tests/lib/core/trash/`).

### CC-9 (data-loss, KNOWN-PARTIAL: Issue 34; SP-6): a vault switch after a failed save discards the buffer
- READ: `switchVault` ignores the failed-path array (`src/lib/core/vault/vault.service.ts:18-21`). `initializeVault` retries once (`app-lifecycle.service.ts:180`), then `teardownVault` calls `resetEditor()` (`:622`), which runs `editorStore.reset()` (`editor.service.ts:412-417`). Issue 34's comment says the switch proceeds and leaves blocking it to the owner. It does not say the buffer is dropped with no prompt, unlike the close handler.

### CC-10 (corruption, medium confidence, low likelihood; SP-14): overlapping saves of one path can interleave bytes
- READ: `saveFileByPath` has no per-path guard (`editor.service.ts:161-176`). Its callers include the debounced save, the retry timer, Cmd+S, `saveAllDirtyTabs` and `updateNoteFrontmatter` (`frontmatter-write.service.ts:129`).
- INFER from the fetched plugin-fs source (peer reviews): two concurrent truncate-and-`write_all` calls at offset 0 can leave the shorter content followed by the longer one's tail. The store records one of them as saved. A Properties edit landing while a body save is in flight is enough. Only listed here because it is silent corruption.

### CC-11 (stale-state, medium confidence; not in a filed Issue): a watcher read error is indexed as a delete
- READ: `read_files_batch` returns `content: None` for any read error, including non-UTF-8 bytes, permissions or canonicalize failure (`src-tauri/src/commands/files.rs:36-75`). `incrementalUpdateFiles` maps `content === null` to `kind: 'delete'` (`src/lib/app/lifecycle/watcher-handler.service.ts:105-109`). That drops the note from the Rust index, FTS5 and semantic tables.
- Scenario: an external tool writes a note as Latin-1. The note vanishes from search, backlinks and tags until a later UTF-8 change. Index loss only. The file is untouched.

## Paths checked and found SAFE

- `updateNoteFrontmatter` (`frontmatter-write.service.ts:102-151`): patches the tab buffer when the note is open, refuses lossy frontmatter, re-checks `exists`, redoes the edit if a tab opened during the read, writes with `create: false`, and checks the vault.
- `create_note` refuses an existing path (`vault.rs:898-901`). `createFile` dedupes names (`fs.service.ts:121-125`). `openOrCreateNote` checks `exists` (`note-creator.service.ts:86`). Capture paths are unique (`deep-link-actions.ts:75-87`). Template and folder-note placeholders are guarded by `exists` (`templates.service.ts:111-116`, `file-icons.service.ts:95-104`).
- `moveToTrash` never deletes the container after the rename succeeds, and a manifest write failure keeps the file (`trash.service.ts:73-93`). `restoreItem` picks a unique free path (`:116-118,307-317`).
- `closeTab` asks before discarding a dirty tab (`editor.service.ts:270-276`). A failed save keeps the tab dirty, toasts, and retries every 5 s (`:166-194`). The window close button saves, and asks on failure (`tauri-listeners.service.ts:53-63`).
- `switchVault` saves and drains the write barrier before it changes the path (`vault.service.ts:18-21`).
- Deep-link dispatch is serialized, so concurrent append/prepend URLs cannot drop each other (`deep-link.service.ts:23-33`).
- The event-calendar delete saves first (`event-calendar.service.ts:1037`).
- Bookmark migration deletes the old file only after every favorite write succeeded (`bookmark-migration.service.ts:93-104`).
- `write_atomic` refuses read-only targets and cleans up its temp file when the rename fails (`utils/fs.rs:20-31`).
- `read_files_batch` containment: both the root and the path are canonicalized (`files.rs:31,36-54`).
- `renameType` writes the dirty buffer (it commits it, nothing is lost) before the Rust pass (`type-definitions.service.ts:214-224`).
- `link-updater` uses dirty tab content as the base (covered by RMD-5 for the ms race only).

## Not verified

- Nothing was run. CC-1 and CC-3 rest on fetched tao and CodeMirror source plus the repo code, not on a live test. CC-3 should get a quick test: real `EditorState` plus `history()`, delete text, apply a full replace with `addToHistory: false`, then `undo`, and assert where the text lands.
- The timing of the Tauri `ask` dialog versus JS timers (CC-2 window size) and whether browsers auto-allow `kokobrain://` (CC-4) were not checked.
