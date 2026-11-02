# Scout report: tabs-buffers slice

Scope: how open-tab buffers relate to disk in the TypeScript editor layer. Covers tab identity (path), in-memory buffers (`content` vs `savedContent`), CodeMirror document and undo history, tab switch, rename/move/delete of open notes, external reload, save paths, vault switch, and window close. Read-only audit. Nothing was run (no cargo, pnpm, vitest, or builds).

Conventions below: **[READ]** = read in repo code at the cited line. **[FETCHED]** = third-party source fetched from GitHub. **[INFER]** = my reasoning from read code, not verified by execution.

## 0. Answers to the slice questions

- **Same note in two tabs or two split panes.** No split panes for the editor. `AppShell.svelte:236-238` mounts one `EditorView` in one pane. `EditorView.svelte:84-86` mounts one `MarkdownEditor`. Two tabs for one path are blocked by `findTabIndex` dedupe in `openFileInEditor` (`editor.service.ts:114-120`, re-checked after the async read at `:127-133`). The only other `addTab` caller is the calendar virtual tab (`event-calendar.service.ts:146`). **Duplicate-path tabs can still arise via rename** (lead L10).
- **Tab state restore on startup.** None. Nothing persists the tab list or buffer content. `editorStore` lives in module `$state` (`editor.store.svelte.ts:7-25`) and is reset per vault (`editor.store.svelte.ts:165-172`, called from `resetEditor` at `editor.service.ts:412-417`, reached from `teardownVault` at `app-lifecycle.service.ts:622`). `tab-view-state.ts` is an in-memory Map (`:16`) with no persistence. Searches for `openTabs`, `tabsState`, `saveTabs`, `restoreSession`, `workspace.json` and `localStorage` in `src/lib` found only vault-list and palette/switcher keys. So there is no stale-snapshot risk on startup, and content is always read from disk on open (`editor.service.ts:124`).
- **Undo history.** One CodeMirror `history()` per mounted `EditorView` (`editor-extensions.ts:130`). Tab-to-tab switches among markdown tabs reuse the same view and history (see L2). Unmounting the editor (switching to a virtual or non-markdown tab, `EditorView.svelte:70-86`) destroys the state, and a new `EditorState` is created on remount (`MarkdownEditor.svelte:107`), which drops history.
- **Switching the file inside a tab while dirty.** Safe at the buffer level: `content` stays in the store, and `updateContent` writes every keystroke to `tabs[activeIndex]` (`editor.store.svelte.ts:84-88`). The debounced save still saves background dirty tabs because `saveDirtyTabs` iterates all tabs (`editor.service.ts:183-194`). The problem is undo history (L2).
- **Editor host keyed by path or tab id.** The editor host is a single static facet, not per tab (`core/markdown-editor/editor-host.ts:79-82`, `static: true`). Per-tab identity is the `path` string. There is no id used in the functions read. `MarkdownEditor` has no `{#key}` on the tab; it is one instance whose document is replaced on switch. View state is keyed by path (`tab-view-state.ts:16`).
- **Rename while open.** The tab follows the new path in the store (`link-updater.service.ts:73-86` calls `editorStore.updateTabPath`, `editor.store.svelte.ts:121-127`), before any later save. The editor migrates view state by a heuristic (`MarkdownEditor.svelte:176-194`). The next autosave writes to the new path. The race window is a save already in flight to the old path (L8).

## 1. Entry points and call chains

### A. Keystroke to disk (body text)
1. CM transaction, `editor-extensions.ts:171-188`: `update.docChanged && !isTabSwitching() && !isExternalEdit()` then `onDocChanged(doc, fmChanged)`.
2. `MarkdownEditor.svelte:124` passes `onDocChanged` to `onContentChange`.
3. `editor.service.ts:224-227` `onContentChange`: `editorStore.updateContent(content)` (`editor.store.svelte.ts:84-88`, writes the active index) then `scheduleAutoSave('body')`.
4. `scheduleAutoSave` (`editor.service.ts:213-221`) cancels the 500 ms frontmatter timer and arms the 2000 ms body timer (`:197`).
5. Timer fires `saveDirtyTabs` (`:183-194`), which runs `saveFileByPath` for every dirty non-virtual tab in parallel.
6. `saveFileByPath` (`:161-178`): captures `content = tab.content` (`:165`), `writeTextFile(path, content)` (`:168`), then `markSavedByPath(path, content)` (`:169`, `editor.store.svelte.ts:91-96`), then `notifyAfterSave` (`:170`, `editor.hooks.ts:67-92`: `markRecentSave`, `applyNoteChange` upsert with source `save`, `notifyContentInvalidated`, after-save observers).
7. On failure: `toast.error` (`:175`), return false. `saveDirtyTabs` re-arms itself with `setTimeout(saveDirtyTabs, 5000)` (`:192`).

### B. Explicit save
`global-keybindings.ts:78` and `commands.ts:56` call `saveCurrentFile` (`editor.service.ts:151-155`), which calls `saveFileByPath(activeTab.path)`.

### C. Tab switch
1. `switchTab` (`editor.service.ts:250-255`) or `setActiveIndex` (`editor.store.svelte.ts:64-68`) changes `activeIndex` only.
2. `MarkdownEditor.svelte` effect at `:170-275` reacts to `editorStore.activeTabPath`.
   - Guard at `:174`. Rename migration at `:179-194`: if `lastTabPath` is no longer in `tabs` and the CM doc string equals `activeTab.content`, it moves the saved view state to the new path and returns without a doc replace.
   - Otherwise saves the old tab view state (`:196-208`), or deletes it if the old tab is gone.
   - Doc replace at `:230-235`: `changes: whole doc`, `annotations: Transaction.addToHistory.of(false)`, `isTabSwitching = true` around it (`:227`, `:237`).
   - Scroll restore and `forceDecorationRebuild` in a double rAF guarded by `tabSwitchRafAbort` (`:251-271`).
   - `lastTabPath = path` at `:273`.
3. No undo-history reset anywhere in this effect. `grep history|addToHistory` in `core/markdown-editor` shows only the `Transaction.addToHistory.of(false)` at `MarkdownEditor.svelte:233` and `:332`, and `history()` in `editor-extensions.ts:130`.

### D. Open a file
Sidebar, quick switcher, search, wikilink, etc. call `openFileInEditor` (`editor.service.ts:98-148`). Binary guard (`:108-112`), dedupe (`:114-120`), `readTextFile` (`:124`), race re-check (`:127-133`), `addTab` (`:140`). Then `EditorView.svelte:84-86` mounts `MarkdownEditor`, whose `onMount` (`MarkdownEditor.svelte:99-145`) builds `EditorState` from `tab.content` (`:107`).

### E. External change (watcher)
1. Rust watcher emits paths; `onFileChange` pushes to `pendingWatcherPaths` (`app-lifecycle.service.ts:482-483` region, debounce 300 ms, `serializeWithRerun`, around `:478-487`).
2. `runWatcherBatch` calls `reloadExternallyChangedTabs(paths)` (`app-lifecycle.service.ts:486`) and then `rebuildAllIndexes(paths)` (`:487`).
3. `reloadExternallyChangedTabs` (`editor.service.ts:375-404`): eligibility = tab exists, non-virtual, clean (`:378-381`). `readTextFile` per path in `allSettled` (`:385-387`). Apply: skip if `diskContent === tab.savedContent` (`:398`), else `syncExternalContentToEditor(path, disk, true, 'none')` (`:401`).
4. `syncExternalContentToEditor` (`:70-91`): `updateTabContentByPath` sets both `content` and `savedContent` (`editor.store.svelte.ts:130-136`). Bumps `externalContentSignal` only if active (`:87-89`). Calls `scheduleAutoSave('none')` (no-op).
5. `MarkdownEditor.svelte:311-337` replaces the doc with `addToHistory false` and `isExternalEdit` set.
6. `rebuildAllIndexes` (`watcher-handler.service.ts:30-79`) returns early when every path is a recent self-save (`:41-44`, `areAllRecentSaves` at `editor.hooks.ts:47-49`, 15 s TTL at `:24`). The tab reload above is not gated by this.

### F. Rename or move of a note (incl. folder)
1. UI: `NoteRowMenu.svelte:102` or `FilesNavigator.svelte:153` or `event-calendar.service.ts:728` or `type-definitions.service.ts:209` calls `renameItem` (`fs.service.ts:201-220`), or `FilesNavigator.svelte:255` / `auto-move.service.ts:188` call `moveItem` (`fs.service.ts:228-248`).
2. `exists(newPath)` check (`fs.service.ts:205`, `:233`).
3. `applyPathChange` (`path-change.service.ts:117-171`): snapshots child file paths from the tree (`:121-123`), then `diskOp` = `rename(old,new)` (`fs.service.ts:211`, `:239`). The plugin calls `std::fs::rename` [FETCHED].
4. `updateTabAfterRenameOrMove` (`path-change.service.ts:132`, `link-updater.service.ts:73-86`) updates `tab.path` and `tab.name` in place for the file and for `oldPath + '/'` children.
5. Consumers fan-out (`path-change.service.ts:135-141`). Then `updateLinksAfterRename` (`:143-151`), which rewrites other notes' wikilinks (`link-updater.service.ts:21-61`).
6. `refreshTree` (`:153`), then Rust `rename_note` (`:159`, Rust `vault.rs:1045-1063`, index re-key only, no disk write), then `forgetNote` per old path (`:168-170`).
7. MarkdownEditor effect migrates view state (`MarkdownEditor.svelte:179-194`).

### G. Delete (move to Trash) of a note or folder
1. UI confirm only: `NoteRowMenu.svelte:123-130` (`ask` then `deleteItem(path,false)` at `:128`), `FilesNavigator.svelte:174` (folder), `note-action-bar.service.ts:23-24`.
2. `deleteItem` (`fs.service.ts:167-190`) calls `applyPathChange({to:null, isDirectory})`.
3. `applyPathChange` line `:125`: `closeTabsForDeletedPath(from)` runs BEFORE `diskOp`. `closeTabsForDeletedPath` (`editor.service.ts:356-366`) removes matching tabs with no dirty check, no save, no prompt (`:361-363`).
4. `diskOp` (`fs.service.ts:171-183`): `moveToTrash` (`trash.service.ts:49-97`): `mkdir`, `rename(abs, trashPath)` (`:71`), manifest save (`:79`).
5. On `diskOp` failure: no rollback of step 3. Container cleanup only if not renamed (`trash.service.ts:88-93`).
6. Contrast: `deleteEvent` path saves first (`event-calendar.service.ts:1037`, comment `:1058-1059`: "`deleteItem` closes tabs without a dirty check ... so an unsaved edit is saved first"). The three other callers do not save first.

### H. Close a tab
`closeTab` (`editor.service.ts:262-289`): pinned skip (`:265`); dirty prompt (`:270-277`, `ask` "Discard changes?"); re-find by path (`:282-283`); `removeTab` (`:285`); delete view state (`:286`); tab-close listeners (`:287`).

### I. Vault switch
1. `switchVault` (`vault.service.ts`, `saveAllDirtyTabs()` at `:19`): **return value ignored**; then `drainPendingWrites`; then `vaultStore.open`.
2. Layout effect calls `initializeVault` (see `+layout.svelte:61` per issue 34). In `initializeVault`, if a previous vault is live: `saveAllDirtyTabs()` at `app-lifecycle.service.ts:180`, **return value ignored**; then `teardownVault()`.
3. `teardownVault` calls `resetEditor()` (`app-lifecycle.service.ts:622`, `editor.service.ts:412-417`): cancels debounced saves, `editorStore.reset()` drops every tab including any dirty buffer whose save failed, and `clearAllTabViewStates()`.

### J. Window close
`tauri-listeners.service.ts:45-66`: `preventDefault`, `saveAllDirtyTabs()` (`:55`), if failures then `ask` "Close anyway and lose unsaved changes?", then `drainEventCalendarWrites`, `flushSettingsPersistence`, `destroy()`. Keystrokes that land during those awaits are not in the saved snapshot.

### K. File-history restore
`FileHistoryDialog.svelte` `handleRestore` (`ask` at about `:43-49`, `restoreSnapshot` at `:50`) then `restoreSnapshot` (`file-history.service.ts:82-103`): IPC `get_snapshot_content`, then `view.dispatch` replacing the doc on `editorStore.editorView` (the CURRENT view, not the tab of `fileHistoryStore.filePath`, roughly `:88-96`), with no `addToHistory` annotation (so the restore is undoable and goes through `onDocChanged`), then `saveCurrentFile()` (`:99`), which saves the ACTIVE tab. The dialog is opened only for `activeTabPath` (`global-keybindings.ts:173-174`, `commands.ts:308-310`, `file-history.service.ts:17-23`).

### L. Frontmatter write on an open note
`frontmatter-write.service.ts`: for an open tab, `syncExternalContentToEditor(path, next, false, 'none')` (about `:126-127`), then `saveFileByPath` (`:129`). On save failure it restores `base` only if the tab still holds `next` (`:132-135`). For a closed note: `exists` check, then `writeTextFile(path, next, {create:false})` (about `:145`), then `syncExternalContentToEditor(path,next,true,'none')` and `notifyAfterSave` (about `:157-160`).

## 2. Disk writes, deletes and renames in the slice

| # | Site | Op | Atomic | Preconditions checked | Error handling | Store change on success | Store change on failure |
|---|---|---|---|---|---|---|---|
| 1 | `editor.service.ts:168` `saveFileByPath` | `writeTextFile(path, snapshot)` | No. Truncate-and-write in place [FETCHED: plugins-workspace `plugins/fs/src/commands.rs` write path: `OpenOptions` with `truncate: true` (default), `create: true` (default), then `write_all`] | Tab exists, not virtual, dirty (`:163`). NO check of disk content or mtime against `savedContent`. Create is implicit, so a deleted path is recreated | Log, `toast.error('Failed to save file.')`, return false (`:173-176`). Timer path retries after 5 s (`:192`). Explicit save and close paths do not retry | `markSavedByPath(path, snapshot)` (`:169`), then `notifyAfterSave` (`:170`) | Tab stays dirty. No rollback needed |
| 2 | `link-updater.service.ts:39` (inside `updateLinksAfterRename`) | `writeTextFile(file, updated)` for each backlink source | No (same as #1) | Dirty check `:33-34`, then `readTextFile` at `:35` if clean. No re-check after the await | Per-file `allSettled`, logged only (`:56-60`), no toast | `syncExternalContentToEditor(file, updated, true, 'none')` (`:47`), `applyNoteChange` upsert (`:52`) | Logged; that file's links stay old |
| 3 | `fs.service.ts:211` `renameItem` diskOp, `:239` `moveItem` diskOp | `rename(old,new)` | Single syscall via `std::fs::rename` [FETCHED]. On Unix it replaces an existing destination [from memory of std docs, not fetched] | `exists(newPath)` at `:205`/`:233` (TOCTOU, see L13) | Rethrown to caller, `runOrToast` shows it; `applyPathChange` aborts before tab update | `updateTabAfterRenameOrMove`, consumers, link rewrite, `rename_note`, forget old paths | No tab change |
| 4 | `trash.service.ts:71` via `fs.service.ts:171-183` `deleteItem` diskOp | `mkdir` container, `rename(abs, trashItemPath)`, manifest write `:79` | `rename` atomic within one filesystem; cross-volume would fail (EXDEV, not checked) | Vault path set; NO dirty check; tabs already closed at `path-change.service.ts:125` | Container removed only if not renamed (`:88-93`); error rethrown. Manifest failure tolerated (`:80-82`) | `trashStore.addItem`; `setFileTree(remove)` (`path-change.service.ts:131`) | Tabs for the path were already removed, dirty buffers gone (L1) |
| 5 | `fs.service.ts:181` fallback when `vaultPath` is null | `remove(path, recursive)` | No trash, permanent | None | Rethrown | Same as #4 | Same as #4, plus data is gone for good (reachable only with no vault, so low) |
| 6 | `frontmatter-write.service.ts` ~`:145` (closed note) | `writeTextFile(path, next, {create:false})` | No | `exists` check, `findTab` re-check | Missing-file mapped to `missing`; otherwise rethrown | `syncExternalContentToEditor(...,true)` no-op without tab; `notifyAfterSave` | Rethrown |
| - | Rust `rename_note` `vault.rs:1045-1063` | none on disk | n/a | n/a | n/a | index re-key only | n/a |

No disk writes in `tab-view-state.ts`, `editor.store.svelte.ts`, or `MarkdownEditor.svelte`.

## 3. Concurrency

- **Timers.** Body autosave 2000 ms and frontmatter autosave 500 ms, debounced via `utils/debounce.ts:9-17` (single timer per debouncer). Mutually exclusive through `scheduleAutoSave` (`editor.service.ts:213-221`). `'none'` cancels nothing. `saveDirtyTabs` retry `setTimeout(5000)` (`:192`) is NOT cancelled by `resetEditor` (`:412-417` cancels only the debouncers). Each failing call adds another retry chain. After a vault reset the tabs list is empty, so it is a no-op in practice.
- **Recent-save TTL.** `markRecentSave` 15 s (`editor.hooks.ts:24`, `:37-44`).
- **rAF chains.** Tab-switch chain aborted per switch (`MarkdownEditor.svelte:251-257`). The `pendingScrollPosition` double rAF (`:286-296`) is NOT aborted; it can dispatch a selection move to the newer tab (not a content change).
- **Watcher.** Debounced 300 ms and serialized with one queued rerun (`app-lifecycle.service.ts` around `:478-487`). Reload always runs before the index rebuild.
- **No per-path lock on saves.** `saveFileByPath` has no in-flight guard. Timer, Cmd+S, `saveAllDirtyTabs` (close, vault switch) can overlap on the same tab. Each captures its own snapshot. `inflight.ts` is used by backlinks and lifecycle serialization only, not by saves.
- **Awaits between decision and effect.** `closeTab` awaits `ask` then re-finds by path (`editor.service.ts:270-283`). `reloadExternallyChangedTabs` checks eligibility before `await readTextFile` and re-checks only `savedContent` after it (`:378-381` vs `:398`). `updateLinksAfterRename` checks dirtiness before `await readTextFile` (`link-updater.service.ts:33-35`). `deleteItem` closes tabs before its own `await diskOp` (`path-change.service.ts:125-127`). `restoreSnapshot` awaits IPC before dispatching into the current view (`file-history.service.ts` `:82-96`).
- **Dirty-state ordering with Svelte effects.** The tab-switch effect is defined before the content-sync effect (`MarkdownEditor.svelte:167-168`), so the document is replaced first. I found no synchronous CM dispatch between `setActiveIndex` and that effect that could route a keystroke into the wrong tab. Not exhaustively verified.

## 4. Leads (hypotheses, with confidence)

Order is by severity. Confidence refers to the code path, not to frequency.

**L1. Deleting a note or folder with unsaved edits discards those edits, and a failed delete also drops them. High severity, high confidence on the code path.**
Path: type in note N, then context-menu "Move to Trash" and Confirm (`NoteRowMenu.svelte:123-130`). `deleteItem` (`fs.service.ts:167`) calls `applyPathChange` (`path-change.service.ts:125`), which calls `closeTabsForDeletedPath` with no dirty check (`editor.service.ts:356-366`) before `moveToTrash`. The Trash keeps only disk bytes (`trash.service.ts:71`). Result: the buffer edits are gone, and the Trash holds the pre-edit version. Window in the success case: keystrokes made less than 2 s (`editor.service.ts:197`) before Confirm. Failure case (deterministic once `moveToTrash` throws, e.g. rename error or cross-volume): tab already closed, edits gone, file still on disk with older bytes, and only an error toast. The `ask` text ("Move ... to trash?") does not mention unsaved changes. The calendar path does save first (`event-calendar.service.ts:1037`) and says why; the three other callers do not.

**L2. Undo history crosses tab switches and external reloads, so an undo can apply one note's edits to another note or insert text at the document edge. High severity, medium confidence (mechanism confirmed in CodeMirror source, final placement inferred).**
[FETCHED] `@codemirror/commands` `src/history.ts` on `main`: for a transaction with `Transaction.addToHistory` false and changes, the field returns `state.addMapping(tr.changes.desc)`, which maps both the `done` and `undone` branches. Events that become empty are dropped. The tab switch (`MarkdownEditor.svelte:230-235`), external reload (`:329-333`), and link-rewrite sync all use `addToHistory false`, so their changes are mapped into the existing stacks, not recorded. The same `EditorView` is reused across markdown-to-markdown switches (`MarkdownEditor.svelte` has no `{#key}`; only the effect replaces the doc). Scenario 1 (cross-tab): type or delete text in note A (autosaved), switch to note B by a markdown tab switch, press Cmd+Z. The undo event from A is mapped into B's coordinates; with the whole-document replace, mapped positions collapse to 0 or end-of-document [INFER]. Insertions from undoing a deletion would land at the start or end of B, and autosave writes B. Scenario 2 (self-reload): delete a paragraph in A, switch to another markdown tab and back (or receive an external-reload dispatch), then Cmd+Z: the paragraph is re-inserted at the document start or end instead of its place. Scenario 3 (remount contrast): if the tab in between was a virtual or non-markdown tab, the editor unmounts (`EditorView.svelte:70-86`) and the history is dropped, so the behavior differs by what sat between. Rename heuristic misfire (`MarkdownEditor.svelte:181-185`): two tabs with identical content (e.g. two daily notes from one template) after closing the active one skip the document replace and keep the old history and cursor. Not verified by a running test; a test with a real `EditorView` and `history()` would settle the placement question.

**L3. External edits to a dirty open note are silently overwritten by the next autosave. Medium severity, high confidence.**
`saveFileByPath` writes the snapshot blindly (`editor.service.ts:161-178`); there is no comparison of disk content with `savedContent`. `reloadExternallyChangedTabs` skips dirty tabs by design (`:380`, comment `:370-373`: "the editor always wins"). A sync client, `git pull`, or another editor changes N on disk while the tab has unsaved keystrokes, and the next autosave overwrites that external version. No warning, no conflict copy. Intentional per the comment, but silent.

**L4. An external delete does not close the tab, and the next edit recreates the file. Medium severity (resurrection), high confidence on code.**
Tab close on delete only happens inside `applyPathChange` (`path-change.service.ts:125`). The watcher path never calls `closeTabsForDeletedPath` (grep: only `path-change.service.ts:7,125`). `reloadExternallyChangedTabs` silently skips a read failure (`editor.service.ts:391-393`). Next keystroke makes the tab dirty; `writeTextFile` with default `create: true` (`:168`; [FETCHED] default create true) recreates the note with the buffer content. A note removed by `git rm`, Finder, or a sync tool reappears.

**L5. Keystrokes typed during an external-reload read are discarded. Low to medium severity, high confidence on code, low frequency.**
`editor.service.ts:378-381` checks cleanliness before `await readTextFile` (`:385-387`). After the read, the only check is `diskContent === tab.savedContent` (`:398`), not `isTabDirty`. If the tab became dirty during the read and the disk differs from `savedContent`, `syncExternalContentToEditor(path, disk, true, 'none')` (`:401`) sets `content = savedContent = disk` and replaces the doc (`MarkdownEditor.svelte:311-337`). Keystrokes made in that window are lost. Window = read latency, milliseconds.

**L6. Wikilink rewrite can overwrite keystrokes in a note that becomes dirty during its read. Low severity, high confidence on code, low frequency.**
`link-updater.service.ts:33-39`: dirty check, then `await readTextFile` (`:35`), then `writeTextFile` (`:39`) and `syncExternalContentToEditor(..., true)` (`:47`) with no re-check. Same shape as L5, but here the write also goes to disk, so the typed text is replaced on disk and in the buffer.

**L7. Non-atomic writes and unordered concurrent saves can leave truncated or older bytes on disk while the UI shows "saved". Medium severity on crash, low frequency.**
(a) Writes are truncate-and-write in place [FETCHED: `write_file_inner` opens with `truncate: true` and calls `write_all`]. A crash or power loss between truncate and write_all leaves an empty or partial note. No temp file and rename are used in `saveFileByPath` (`editor.service.ts:168`). (b) `saveFileByPath` has no per-path serialization (`:161-178`). Timer `saveDirtyTabs`, Cmd+S, and `saveAllDirtyTabs` can each write a snapshot. If the older write's IPC completes last, the disk holds older bytes. `markSavedByPath` then records the older snapshot, which keeps the tab dirty (so a later save should fix it), but nothing re-arms the timer after a save, so the disk can stay stale until the next keystroke, Cmd+S, or close. Window = write latency.

**L8. A rename during an in-flight autosave can recreate the note at its old path. Low severity, low confidence on frequency.**
`saveFileByPath` captures `path` before the await (`editor.service.ts:161-169`). If `renameItem`'s `rename` (`fs.service.ts:211`) completes before the save's write opens its path, `writeTextFile(oldPath)` creates a ghost note with the buffer content (create default true). `markSavedByPath(oldPath, ...)` is a no-op because the tab now has the new path (`editor.store.svelte.ts:91-96`), so the new-path tab stays dirty and the ghost stays. Window = milliseconds.

**L9. External edits to a note saved by the editor within 15 s do not refresh the Rust index or FTS. Medium severity for stale indexes (not data), high confidence on code.**
`rebuildAllIndexes` skips when every path is a recent self-save (`watcher-handler.service.ts:41-44`, `editor.hooks.ts:24,47-49`). `reloadExternallyChangedTabs` runs first and refreshes the open clean tab, but it does not call `applyNoteChange` (`editor.service.ts:375-404` uses only `syncExternalContentToEditor`). So backlinks, search, and properties for that external change stay stale until another event. Scenario: save N at t0, external tool writes N at t0+5 s; the tab shows the new text; the index does not.

**L10. Renaming onto the path of an open note whose file was deleted externally creates two tabs for one path. Low severity, medium confidence.**
`renameItem` checks `exists(newPath)` (`fs.service.ts:205`). If the file was deleted outside the app while its tab stayed open (see L4), the check passes. `updateTabAfterRenameOrMove` sets the renamed tab's path to the same string (`link-updater.service.ts:79`). Two tabs now share a path; `findTabIndex` returns the first, and both saves write the same file (last writer wins, L7 ordering).

**L11. File-history restore writes into whatever tab is active when its IPC returns. Low severity, low confidence.**
`restoreSnapshot` (`file-history.service.ts:82-103`) dispatches to `editorStore.editorView` and then `saveCurrentFile()` saves the active tab, not `fileHistoryStore.filePath`. The dialog is opened only for the active tab (`global-keybindings.ts:173-174`, `commands.ts:308-310`), and the dialog is modal, so a switch needs to happen during the `get_snapshot_content` IPC after confirm. If the active tab is a kanban or canvas tab (no `editorView`), restore reports success and does nothing.

**L12. Close-window keystrokes after the save snapshot are lost. Low severity, low frequency.**
`tauri-listeners.service.ts:55` snapshots dirty tabs, then `drainEventCalendarWrites`, `flushSettingsPersistence`, and `destroy()`. Text typed during these awaits is not saved.

**L13. `renameItem` and `moveItem` check-then-rename race, and a case-only rename is refused on case-insensitive volumes. Low severity.**
`exists(newPath)` (`fs.service.ts:205`, `:233`) is followed by `rename` (`:211`, `:239`). A file created in between is overwritten on Unix [from memory of std::fs::rename semantics; not fetched]. Separately, on a case-insensitive volume (default on macOS, [INFER]) a rename from `Note.md` to `note.md` makes `exists(newPath)` true and throws "already exists", so the case cannot be changed. Usability, not data.

**Known (matched, not new).** Issue 34 (`.scratch/architecture-stability/issues/34-save-dirty-tabs-before-vault-switch.md`): status resolved. Current code matches the fix: `switchVault` now awaits `saveAllDirtyTabs()` before `vaultStore.open` (`vault.service.ts:19`). Still open per its own comment: `switchVault` and the safety-net save in `initializeVault` (`app-lifecycle.service.ts:180`) ignore failed saves, and `resetEditor` (`app-lifecycle.service.ts:622`) then drops dirty buffers after only a toast. Whether to block the switch is recorded there as the owner's call. I treat this as KNOWN open decision, not a new finding. Issue 17 (raw `writeTextFile` ratchet, `frontmatter-write.service.ts` exempt by rule) is the allowlist for the write sites above. Issue 64 (calendar `deleteNow` rollback drops an earlier overlay) is outside this slice. Searches of `.scratch/architecture-stability/issues` for dirty, unsaved, discard, reload, undo, history, rename, trash found no issue covering L1-L13.

## 5. Third-party behavior checked

- CodeMirror `@codemirror/commands` `src/history.ts` on `main`, fetched from `https://raw.githubusercontent.com/codemirror/commands/main/src/history.ts`. The fetch returned a summary; I did not get verbatim text of the whole function. Points relied on: `addToHistory` false with changes returns `addMapping(tr.changes.desc)`, mapping both `done` and `undone` branches; events that become empty are dropped. Not checked against the version pinned in `package.json` / `pnpm-lock.yaml`.
- `tauri-apps/plugins-workspace`, branch `v2`, `plugins/fs/src/commands.rs`, fetched from `https://raw.githubusercontent.com/tauri-apps/plugins-workspace/v2/plugins/fs/src/commands.rs`. Points relied on: `write_text_file` goes through `write_file_inner` and `resolve_file`, with `truncate: true` and `create: true` defaults and `write_all` on the opened handle (not atomic). `rename` calls `std::fs::rename`. Not checked against the plugin version pinned in the repo's lockfile.

## 6. Not checked

- `editor.types.ts` (confirm no id field), `setup/editor-extensions.ts` beyond lines 130 and 171-188, `EditorTabs.svelte` close and pin wiring, `note-change.service.ts` internals, the Rust watcher, the trash restore path, `auto-move.service.ts`, deep-link tab opening, and `+layout.svelte` effect ordering.
- CodeMirror placement semantics for a whole-document replace under history mapping (L2 final positions are inference). A jsdom or node test with a real `EditorView` and `history()` would settle it. Not run, per the audit rules.
- Timing claims (L5, L7, L8, L12) are from code shape, not measured.
- Whether `saveDirtyTabs` retry chains can stack in practice.
