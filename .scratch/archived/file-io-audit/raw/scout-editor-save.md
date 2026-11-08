# Scout: editor-save slice

Repo: /Users/diegorv/Dev/pet-projects/koko/brain (branch main, read-only audit).
Method: code read with Read/rg only. No builds, tests or app runs. Two third-party sources fetched from GitHub (see section 5).
Labels: READ = seen in the file at the cited line. INFERRED = reasoning from READ facts, not executed. FETCHED = third-party source fetched on 2026-11-02.

## Known-issue check

Files under .scratch/architecture-stability/issues/ whose text mentions "save": 12, 17, 21, 34, 43, 54, 65. Only 34 was read in full.
- 34 (status resolved): switchVault now awaits saveAllDirtyTabs before vaultStore.open (vault.service.ts:19). Its comment records that a failed save still lets the switch go ahead and leaves "whether to block the switch" to the owner. It does NOT record that resetEditor then discards the dirty content of the failed tabs. That is lead L2 below. Treat L2 as partly known (the switch-continues decision) and new (the content wipe).
- Other issue files were not read beyond their titles.

## 1. Entry points and call chains

### 1a. Keystroke to disk

1. CodeMirror doc change. `EditorView.updateListener` in setup/editor-extensions.ts:171 fires `onDocChanged(update.state.doc.toString(), fmChanged)` at :188 only when `!isTabSwitching() && !isExternalEdit()`. READ.
2. MarkdownEditor.svelte:124 wires onDocChanged to `onContentChange(content, fmChanged)`. READ.
3. `onContentChange` (editor.service.ts:224-227) calls `editorStore.updateContent(content)` then `scheduleAutoSave(fmChanged ? 'frontmatter' : 'body')`.
4. `updateContent` (editor.store.svelte.ts:84-88) writes `tabs[activeIndex].content`. It is keyed by activeIndex, not by the path the CodeMirror view shows. READ.
5. `scheduleAutoSave` (editor.service.ts:213-221): 'frontmatter' cancels the body timer and arms the 500 ms timer; 'body' cancels the frontmatter timer and arms the 2000 ms timer; 'none' arms nothing and cancels nothing. The timers are module singletons (:197, :200) built from `debounce` (utils/debounce.ts:4-22, trailing only, no maxWait).
6. Timer fires `saveDirtyTabs` (editor.service.ts:183-194): filters non-virtual dirty tabs, runs `saveFileByPath` on all of them in parallel, and if any returned false, `setTimeout(saveDirtyTabs, 5000)` (:191-193).
7. `saveFileByPath` (editor.service.ts:161-178):
   - :162-163 finds the tab; returns true (success) if none, virtual, or clean.
   - :165 snapshots `const content = tab.content`.
   - :168 `await writeTextFile(path, content)` (@tauri-apps/plugin-fs).
   - :169 `editorStore.markSavedByPath(path, content)` sets savedContent to the snapshot (editor.store.svelte.ts:91-96).
   - :170 `notifyAfterSave(path, content)`.
   - :173-177 catch: `error(...)`, `toast.error('Failed to save file.')`, return false. Dirty state survives because savedContent is not touched.
8. Disk side of writeTextFile: see section 2 (in-place truncate, no temp file, no fsync). FETCHED.
9. `notifyAfterSave` (editor.hooks.ts:67-92):
   - :68 `markRecentSave(filePath)` (15 s TTL, :24, :37-44).
   - :81 `void applyNoteChange({ kind: 'upsert', source: 'save', path, content })`. The promise is not awaited and has no catch at this call site. applyNoteChange is `async` (note-change.service.ts:193), so a synchronous throw inside it becomes an unhandled rejection. INFERRED from the `void` plus `async`. Its IPC calls each have their own `.catch` (note-change.service.ts:202, 209, 217, 235, 247, 252). READ.
   - :83 `notifyContentInvalidated()`.
   - :85-91 observers, each in try/catch.

### 1b. Explicit save

- Mod+S: global-keybindings.ts:77-79 and commands.ts:56 call `saveCurrentFile()` (editor.service.ts:151-155), which calls `saveFileByPath(activeTab.path)`. READ.
- file-history.service.ts:99 also calls `saveCurrentFile()`. READ.
- A failed explicit save schedules no retry. It shows the toast and returns false.

### 1c. Tab switch

- `switchTab` / `switchToNextTab` / `switchToPreviousTab` (editor.service.ts:250-310) only call `editorStore.setActiveIndex` (store :64-68). No save, no flush. READ.
- MarkdownEditor.svelte:170-275 `$effect` on `editorStore.activeTabPath`:
  - :179-194 rename detection: if the old path has no tab and the CodeMirror doc string equals the new tab's content, it migrates view state and returns with no doc replace.
  - :196-208 saves the old tab's view state (or deletes it if the tab is gone).
  - :223 language effects, :227 `isTabSwitching = true`, :230-235 doc replace via `view.dispatch` with `addToHistory(false)`, :237 `isTabSwitching = false`.
  - :256-271 rAF chain for scroll and decoration rebuild, aborted on the next switch.
- A background dirty tab keeps its pending timer. Nothing forces it to disk on switch.
- MarkdownEditor is mounted only in the `{:else}` branch of EditorView.svelte:85. Virtual tabs (tasks, tags, graph, calendar) and collection/canvas/kanban tabs unmount it (EditorView.svelte:70-84). Its onDestroy (MarkdownEditor.svelte:147-165) saves only view state and destroys the view. The store remains the source of truth.

### 1d. Tab close

- Mod+W: global-keybindings.ts:83-85, command palette commands.ts:63, EditorTabs.svelte:73 and :89 call `closeTab(index)` / `closeActiveTab()`. READ.
- `closeTab` (editor.service.ts:262-289):
  - :265 pinned tabs return with no effect.
  - :270 virtual tabs skip the prompt.
  - :271-277 dirty tab: `ask('This file has unsaved changes. Discard changes?')`; if the user does not discard, return. No save offered.
  - :282-283 re-finds the index after the await.
  - :285 `removeTab`, :286 `deleteTabViewState`, :287 `notifyTabClosed`.
- Dirty content at close is dropped by the prompt, unless the user chooses to discard. The debounce timer is not cancelled. When it fires, `saveDirtyTabs` no longer sees the tab.
- `closeTabsForDeletedPath` (editor.service.ts:356-366): no prompt, no save. Force-removes tabs at the path or under `path/` (:360, :363), including dirty ones. Called from path-change.service.ts:125, BEFORE `diskOp()` at :127.

### 1e. Window close

- tauri-listeners.service.ts:53-72 `onCloseRequested`: `event.preventDefault()` (:54), `await saveAllDirtyTabs()` (:55), if failures: `ask('Failed to save: ... Close anyway and lose unsaved changes?')` (:58-61), return if not discarded. Then `await drainEventCalendarWrites()` (:65), `await flushSettingsPersistence()` (:68), `getCurrentWindow().destroy()` (:69). READ.
- Dirty tabs are re-checked by nothing after the awaits at :65 and :68. Keystrokes typed during those awaits are destroyed with the window. Window stays open until destroy (the preventDefault behaviour is assumed, not verified from source).
- `saveAllDirtyTabs` (editor.service.ts:234-247) cancels both timers (:235-236) and returns failed paths. It does not retry.

### 1f. Vault switch and init teardown

- `switchVault` (vault.service.ts:17-21): `await saveAllDirtyTabs()` at :19, RESULT DISCARDED. Then `drainPendingWrites()` (:20), then `vaultStore.open(path)` (:21). READ.
- Vault picker `openVaultDialog` (:23-32) and `openRecentVault` (:35-50) both go through `switchVault`.
- `initializeVault` (app-lifecycle.service.ts): when a previous vault is initialized, `await saveAllDirtyTabs()` at :180 (RESULT DISCARDED, comment says a failure here means the save failed and the switch goes ahead anyway), `drainEventCalendarWrites()`, then `teardownVault()` at :188, unconditionally. READ.
- `teardownVault` (app-lifecycle.service.ts:533-...) calls `resetEditor()` at :622. READ.
- `resetEditor` (editor.service.ts:412-417): cancels the two timers, `editorStore.reset()` (store :165-172: `tabs = []`, `activeIndex = -1`, `externalContentSignal = 0`), `clearAllTabViewStates()`. The retry `setTimeout` from saveDirtyTabs (:192) is NOT cancelled.
- Net effect: any tab whose save failed in `switchVault` or the init safety net is removed from memory with no prompt. The only user signal is the toast from saveFileByPath (:175) when the save failed.

### 1g. Watcher reload

- app-lifecycle.service.ts (around :480-487) `runWatcherBatch` calls `reloadExternallyChangedTabs(paths)` then `rebuildAllIndexes(paths)`. Debounced 300 ms. READ.
- `reloadExternallyChangedTabs` (editor.service.ts:375-404):
  - :378-381 eligibility: open, non-virtual, clean (`!isTabDirty`).
  - :385-388 parallel `readTextFile` via Promise.allSettled.
  - :395-398 re-check: tab still exists and `diskContent !== tab.savedContent`. The dirty flag is NOT re-checked.
  - :401 `syncExternalContentToEditor(filePath, diskContent, true, 'none')`, which sets content AND savedContent to disk content (`updateTabContentByPath`, :130-136).
- watcher-handler.service.ts:41-45: `rebuildAllIndexes` returns early when every changed file is in `recentSaves` (`areAllRecentSaves`, editor.hooks.ts:47-49). The index is skipped for that batch, but the tab reload above still runs.

### 1h. Writers that write disk then sync the open tab (outside the slice, but they share the sync sink)

`syncExternalContentToEditor` (editor.service.ts:70-91) with markSaved=true overwrites content AND savedContent. Callers that compute the new text from DISK or from a snapshot, then write, then sync:
- tasks.service.ts:102 (Rust `toggle_task_status`), :114 sync.
- deep-link.service.ts:255-263 (prepend: `readTextFile` disk :256, write :260, sync :262), :274-282 (append: read :275, write :279, sync :281), :296-298 (overwrite: write :296, sync :298).
- app/deep-link-actions.ts:53-63 (daily note: read disk, write :61, sync :63).
- link-updater.service.ts:30-47: dirty tab content snapshot at :33-35, clean tab reads disk at :35, write :39, sync :47 (sync overwrites with the snapshot-based text).
- type-definitions.service.ts:214-220 (renameType loop: uses `tab.content` at :215, write :218, sync :220). Uses in-memory content, so no disk-vs-memory loss.
- frontmatter-write.service.ts:121-135 (tab branch: base = tab.content, no await before sync, then saveFileByPath), :149 `writeTextFile(path, next, { create: false })` (no-tab branch), :156 sync.
- properties.service.ts:95 `syncExternalContentToEditor(activePath, newContent, false, 'frontmatter')`. Memory only, arms the 500 ms timer.

## 2. Disk writes, deletes and renames in the slice

| Site | Call | How it writes | Preconditions | Errors | Store changes on success / failure |
|---|---|---|---|---|---|
| editor.service.ts:168 saveFileByPath | `writeTextFile(path, content)` | plugin-fs `write_text_file`: `OpenOptions` write=true, create=true (default), truncate=true, `write_all`, NO temp file, NO rename, NO fsync (FETCHED, plugins-workspace v2 `plugins/fs/src/commands.rs`) | tab exists, not virtual, dirty (:163) | catch :173-177, toast, return false | success: savedContent = snapshot (:169), notifyAfterSave (:170). failure: savedContent unchanged, dirty kept |
| editor.service.ts:166 path resolution | plugin-fs path check | Rust `resolve_path` checks fs scope allow/deny (FETCHED) | the path is inside an allowed scope | `PathForbidden` surfaces as the same catch | as above |
| Rust vault.rs:669 and :683 (toggle_task_status_inner) | `std::fs::read_to_string`, then `vault_fs::write_atomic` | utils/fs.rs:16-32: read-only check (:20-24), tmp file `path.tmp-PID-SEQ` (:26), `std::fs::write` tmp (:27), `rename` tmp to path (:28). No fsync. | called only from tasks.service.ts:102 | Err string to TS | TS side syncs tab (see 1h) |
| editor.service.ts:356-366 closeTabsForDeletedPath | none (state only) | none | runs before disk op (path-change.service.ts:125 before :127) | none | removes tabs; dirty content dropped with no prompt |
| fs.service.ts:169-183 deleteItem via applyPathChange | `moveToTrash` (trash.service.ts) or `remove` fallback | not read in detail | after closeTabsForDeletedPath | rethrown (fs.service.ts:186-188) | tabs already removed even if diskOp fails |
| link-updater.service.ts:79-83 | updateTabPath | state only | after diskOp | none | renames tab paths |
| frontmatter-write.service.ts:149 | `writeTextFile(path, next, {create:false})` | `create:false` refuses to recreate a deleted note | no tab at path | rethrown, `missing` error mapped (:150-153) | sync :156 |
| log, settings, file-icons, etc. | not in this slice | | | | |

Tab view state is an in-memory Map (tab-view-state.ts:15-16). No disk persistence was found in that file.

## 3. Concurrency

- Timers: 2000 ms body and 500 ms frontmatter debounces, mutually exclusive (editor.service.ts:197-221). Cancelled only in saveAllDirtyTabs (:235-236) and resetEditor (:413-414).
- Retry timer (:192) has no handle and is never cancelled. Each failing saveDirtyTabs run adds one more chain. A failing run triggered by the debounce and a failing run triggered by a retry both schedule a new timer. Chains do not merge. INFERRED from the code shape, READ at :191-193.
- No lock or queue per path. Concurrent `saveFileByPath(path)` sources: saveDirtyTabs (debounce or retry), saveCurrentFile (Mod+S), saveAllDirtyTabs (close, switch, init), frontmatter-write.service.ts:129 (attempt), event-calendar.service.ts:1037, file-history.service.ts:99. No serialization was found in editor.service.ts.
- Ordering of overlapping writes to one path is not guaranteed by the IPC layer (INFERRED). `markSavedByPath` records the snapshot of whichever write completes, so savedContent can describe an older write than the one that landed last on disk. See L8.
- Dirty flag is `content !== savedContent` (editor.logic.ts:44-46). Typing during an in-flight save keeps the tab dirty and the next debounce saves it. READ.
- Tab switch effect is async (Svelte effect flush). `updateContent` uses activeIndex. Correct only if no docChanged dispatch lands between `setActiveIndex` and the effect flush. INFERRED to be very unlikely (no input event can interleave a synchronous block, and the effect runs on the microtask flush). Not reproduced.
- `isTabSwitching` and `isExternalEdit` are synchronous flags around `view.dispatch`. They do not span any await. READ (MarkdownEditor.svelte:227-237, :328-334).
- reloadExternallyChangedTabs awaits parallel reads (:385-388) between the eligibility check (:378-381) and the apply (:401). The tab can become dirty in that window and is not re-checked. See L5.
- Window close handler awaits between save and destroy (:55, :65, :68, :69). Edits in those awaits are lost. See L9.
- debouncedSave and debouncedSaveFrontmatter are module singletons shared by every tab. One timer saves all dirty tabs, not just the one edited.

## 4. Leads

Confidence scale: HIGH = mechanism read in code, impact clear. MED = mechanism read, frequency or trigger needs a real-app check. LOW = needs a specific interleaving or unverified assumption. None were reproduced.

### L1. Save is not atomic: a failed or interrupted write leaves a truncated note (HIGH impact, mechanism FETCHED, frequency MED)
Mechanism: writeTextFile opens with truncate=true and then write_all, with no temp file and no fsync (FETCHED; editor.service.ts:168 is the only write in saveFileByPath). If the write fails after the truncate (ENOSPC, EIO, or a crash/power loss mid-write), the file on disk is partial or empty. The app's catch (:173-177) reports a toast and keeps the tab dirty, which is correct for the in-memory copy but does not restore the file.
Scenario: disk nearly full. Edit a note, autosave fires, open succeeds, write fails with ENOSPC. The note on disk is now truncated. Toast "Failed to save file." User clicks Close tab, sees the prompt, answers discard (or Cmd+Q and "Close anyway"). Both copies are gone.
Contrast: the Rust task toggle uses write_atomic (vault.rs:683, utils/fs.rs:26-28), so the app has two write disciplines.
Known: not in any issue file read.

### L2. Vault switch or init teardown discards dirty tabs whose save failed, with no prompt (HIGH, code-verified)
Steps:
1. Open note N, type (dirty, within 2 s).
2. Make N's save fail. Two variants: (a) chmod 444 N: open fails with EACCES before truncate, so disk keeps the old text. (b) ENOSPC: see L1.
3. Open the vault switcher and pick another vault.
4. switchVault (vault.service.ts:19) runs saveAllDirtyTabs, which toasts once and returns the failed path. The return is ignored. vaultStore.open(B).
5. initializeVault (app-lifecycle.service.ts:180) runs the safety-net save again, result ignored. teardownVault (:188, :622) calls resetEditor, which sets tabs = [] (editor.store.svelte.ts:165-172).
Result: N's typed text is in neither memory nor (variant a) disk. There is no ask() on this path, unlike closeTab (editor.service.ts:271-277) and the window close (tauri-listeners.service.ts:58-61).
Known: issue 34 records that the switch goes ahead after a failed save and leaves the choice to the owner. It does not record the content wipe. Treat the wipe as new.

### L3. Task checkbox toggle silently drops unsaved keystrokes in the same note (HIGH impact, MED frequency, code-verified)
Steps: type in note N, and within the 2 s debounce window click a checkbox for a task in N in the Tasks tab (TasksView.svelte:67 calls toggleTask).
Mechanism: Rust toggle_task_status_inner reads DISK (vault.rs:669), toggles one line, writes atomically (:683). TS receives updatedContent built from disk and calls syncExternalContentToEditor(filePath, updatedContent, true, 'none') (tasks.service.ts:114). markSaved=true sets content and savedContent to the disk-based text (editor.service.ts:79, editor.store.svelte.ts:130-136). The typed text is overwritten and the tab is clean.
Known: not in issues read.

### L4. Deep-link prepend/append and daily-note append overwrite an open dirty tab (HIGH impact, MED frequency, code-verified)
Steps: open daily note D, type text, within 2 s trigger a `daily` or `new` deep link with append or prepend (or the quick-capture path that calls executeDailyAction).
Mechanism: deep-link.service.ts:275-281 (and :256-262) read DISK (`readTextFile`), build disk+new, write, then sync with markSaved=true (:281 / :262). deep-link-actions.ts:53-63 does the same for the daily note. The typed text is absent from both the new file and the tab.
Also: the overwrite branch (deep-link.service.ts:296-298) replaces unsaved content on purpose. Whether that is intended was not checked.
Known: not in issues read.

### L5. Watcher reload can overwrite keystrokes typed during its read (MED impact, LOW-MED frequency, code-verified)
Steps: a tab is clean, the file changes on disk (external tool, sync client, git pull) so the watcher batch runs. The user types into that tab while the parallel readTextFile (editor.service.ts:385-388) is pending.
Mechanism: eligibility was checked at :378-381 only. The apply step (:395-401) checks existence and `diskContent !== savedContent` but not dirtiness. syncExternalContentToEditor(…, true, 'none') replaces content with disk text.
Window: the IPC read duration. Frequency low, but the loss is silent.

### L6. Link-rename rewrite overwrites keystrokes typed during its write (MED-LOW impact, LOW frequency, code-verified)
Steps: rename note X. An open note N links to X and is dirty (or becomes dirty). link-updater.service.ts:33-35 snapshots tab content, :39 awaits writeTextFile, :47 syncs markSaved=true with the snapshot-based text. Keystrokes between :35 and :47 are overwritten. For a clean tab, :35 reads disk, and typing during that read is also lost (same mechanism as L5).

### L7. Delete closes dirty tabs before the trash move, so a failed delete also loses the edits (HIGH impact, MED frequency, code-verified)
Steps: edit note N (dirty). Delete N in the explorer and confirm. applyPathChange calls closeTabsForDeletedPath first (path-change.service.ts:125, editor.service.ts:356-366, no prompt), then diskOp (:127), which is moveToTrash (fs.service.ts:173-178). If moveToTrash throws (permission, trash folder error), deleteItem rethrows (fs.service.ts:186-188). The user gets an error, but the tab is already gone, so the unsaved text is lost. The file on disk still has the last saved version.
Also, the close is intentional so that the 2 s debounce cannot recreate the file (path-change.service.ts:96-99). That reasoning covers the timer only (see L8).

### L8. An in-flight save can recreate a deleted or renamed note at the old path (MED-LOW impact, LOW frequency, INFERRED)
Mechanism: saveFileByPath captures `path` (editor.service.ts:161, :168). plugin-fs writeTextFile with no options opens with create=true (FETCHED). If a save IPC was already dispatched before closeTabsForDeletedPath or the rename, the open can land after moveToTrash or rename and create a file at the old path. The rename variant leaves two notes with the same text.
Frequency: needs the save IPC to be in flight in the same few ms as the delete or rename.

### L9. Window close awaits without rechecking dirty tabs (LOW-MED impact, LOW frequency, code-verified)
Steps: close the window while typing. registerCloseHandler (tauri-listeners.service.ts:55) saves, then awaits drainEventCalendarWrites (:65) and flushSettingsPersistence (:68), then destroys (:69). Keystrokes after :55 and before :69 are not saved and die with the window. The debounce timers are cancelled in saveAllDirtyTabs (editor.service.ts:235-236) and nothing re-arms them.

### L10. Autosave never fires during continuous typing and nothing flushes on blur or app suspend (MED impact, HIGH mechanism confidence)
The 2000 ms body debounce is trailing only, no max wait (utils/debounce.ts:4-22; editor.service.ts:197). Typing continuously for longer than the debounce delay with no pause writes nothing to disk. There is no save on window blur (tauri-listeners.service.ts:309-316 only refreshes the daily note), on visibilitychange, or on suspend. Only window close saves (1e). A crash, OS kill or force-quit during a long typing run loses the whole run. Scale: most users pause, so MED.

### L11. Failed-save retry chains multiply, and resetEditor does not cancel them (LOW impact)
saveDirtyTabs (editor.service.ts:191-193) schedules a new 5 s run on every failing invocation without cancelling earlier ones. Chains accumulate for as long as the failure lasts, with one toast per failure (:175). resetEditor (:412-417) does not cancel the retry timer, so a stale chain runs saveDirtyTabs in the next vault against whatever is open. That is harmless if those tabs are clean or really dirty for the new vault. Mention, not a data-loss path.

### L12. Self-save skip hides an external change from the index for 15 s (MED-LOW impact, code-verified)
editor.hooks.ts:37-49 marks each save for 15 s. watcher-handler.service.ts:41-45 skips `rebuildAllIndexes` when every changed file is in that set. An external edit to the same file inside the window is not indexed (backlinks, search, tags stale), while the tab reload (L5 path) still runs. A full rebuild or a later edit fixes it. The comment at watcher-handler.service.ts:40-41 says the TTL handles cleanup, not that external changes are missed. Issue 65 touches incremental refresh and was not read; it may already cover this.

### L13. Dirty tab silently overrides an external edit (MED-LOW, by design, unsignalled)
editor.service.ts:375-383 and the comment at :369-374 say the editor wins. An external change to a dirty note is dropped from the tab, then the 2 s autosave writes the editor text over it. No prompt, no conflict copy. Design-level, listed so the owner can decide. Not a bug in the code path.

### L14. Two overlapping writes to one path can leave disk and savedContent out of step (MED-LOW impact, LOW frequency, INFERRED)
Mechanism: no per-path serialization (section 3). Write A (S1) and write B (S2) overlap. If B lands on disk first and A lands last, disk ends with S1. If A's markSaved (editor.service.ts:169) runs after B's, savedContent = S1 while content may be S2 (dirty, fixable), or if the user did not type after S1, content = S1 too and the tab reads clean while disk holds S1 only if B's bytes were the newer ones. The first sub-case self-heals on the next save. The second is an INFERRED silent divergence that needs IPC completion order to be reversed. Triggers: Mod+S during an autosave, or saveAllDirtyTabs during a debounce.

### L15. write_atomic (used by task toggle only) has small leaks (LOW)
utils/fs.rs:27 returns before removing the tmp file when `std::fs::write` fails, so `note.md.tmp-PID-SEQ` is left in the vault directory. utils/fs.rs:28 rename (INFERRED from POSIX rename semantics): the tmp file gets default permissions, so the note's mode is reset, and a symlinked note is replaced by a regular file. No fsync. Low impact, but the vault directory is written by the app.

### L16. saveFileByPath returns true for "nothing to save" (LOW, caller-dependent)
editor.service.ts:163 returns true when no tab, virtual, or clean. Callers that treat true as "on disk" (event-calendar.service.ts:1037 uses it to decide a write succeeded; frontmatter-write.service.ts:129-130 uses it with a tab present) can get a success for a path with no open tab and nothing written. Whether event-calendar always has the tab open was not checked.

### L17. Path scope for editor writes may exclude user-picked vaults (LOW, needs a runtime check)
src-tauri/capabilities/default.json:83-100 limits fs:allow-write-text-file to $DOCUMENT/kokobrain-vaults, $HOME/kokobrain-vaults and $APPLOG. The vault picker (vault.service.ts:31) accepts any folder. The dialog plugin grants the picked folder in the fs scope (FETCHED, plugins-workspace v2 `plugins/dialog/src/commands.rs`: `s.allow_directory(&path, options.recursive)`). The JS call does not pass `recursive`, so the default decides whether note files under the picked folder are allowed. If the default is non-recursive, saves in a vault outside the two fixed folders fail with PathForbidden and retry forever. Not verified: the default value of `recursive`, and whether the app restricts the picker. The user's vault is probably under the allowed folders, so this may not reproduce in practice.

## 5. Not verified and limits

- No tests, builds, or app runs (per the hard rules). No runtime reproduction of any lead.
- FETCHED: plugins-workspace v2 `plugins/fs/src/commands.rs` (write_text_file to write_file_inner, OpenOptions, write_all, scope check) and `plugins/dialog/src/commands.rs` (open adds picked dirs to the fs scope). The JS wrapper `writeTextFile` in @tauri-apps/plugin-fs was NOT read; its option mapping is assumed to match the Rust side. The fetched branch is `v2`, not the version locked in src-tauri/Cargo.lock.
- Not read: the body of applyNoteChange beyond :186-252 and its `save` policy row; write-barrier.service (drainPendingWrites); drainEventCalendarWrites; trash.service moveToTrash; deep-link-actions.ts:173 (capture write, no sync seen); app-lifecycle.service.ts watcher section beyond :480-487; index-dedupe; event-calendar.service.ts beyond :1037.
- Tauri onCloseRequested: the claim that preventDefault holds the window open until destroy() is assumed from the Tauri v2 API, not verified from source.
- Known-issue files other than 34 were not read. Issue 65 may overlap L12.

## Summary for reviewer

The strongest lead chain is the data-safety group, in order: L1 (non-atomic truncate-and-write, FETCHED), L2 (failed save at vault switch wipes dirty tabs, code-verified and only partly recorded in issue 34), and L3/L4 (disk-based rewrite then sync with markSaved=true overwrites unsaved keystrokes, code-verified). L7 (delete closes dirty tabs before the trash move) and L10 (no flush on blur, no max wait) are next.
