# Scout report: tests-gaps (data-safety test coverage)

Scope: how notes are written, renamed, moved, deleted, restored and reloaded, and which tests cover each risky behavior. Read-only audit. No build, test or cargo command was run. Every claim is tagged READ (seen in the file at the cited line) or INFER (reasoned from the code, not run).

Third-party check (WebFetch, summarised by a small model, so re-check the quoted lines in the real file before relying on them):
1. https://raw.githubusercontent.com/tauri-apps/plugins-workspace/v2/plugins/fs/src/commands.rs (write_text_file / rename). Reported: writeTextFile opens the target with `truncate: true` (`create` defaults true, `append` false) and calls `File::write_all` in place. No temp file, no rename, so NOT atomic. rename is `std::fs::rename` (overwrites an existing target on Unix).
2. https://v2.tauri.app/reference/javascript/api/namespacewindow/ (onCloseRequested). Reported: preventDefault keeps the window open and must be called before the handler returns. Destroy() closes without emitting the event. The page does NOT say whether macOS Cmd+Q / app-menu Quit reaches onCloseRequested. Left open (see Not checked).

Path abbreviations used below: FS = src/lib/core/filesystem, ED = src/lib/core/editor, TR = src/lib/core/trash, VA = src/lib/core/vault, TESTS = src/tests/lib, RS = src-tauri/src, RT = src-tauri/tests.

---

## 1. Entry points and call chains

### 1a. Save (body edit, autosave, Cmd+S)
- Keystroke: `onContentChange` ED/editor.service.ts:224-227 -> `editorStore.updateContent` (store only, no disk) -> `scheduleAutoSave('body')` (ED:213-221) arms `debouncedSave` 2000 ms (ED:197) or `debouncedSaveFrontmatter` 500 ms (ED:200).
- Timer or Cmd+S: `saveDirtyTabs` ED:183-194 (all dirty tabs, Promise.all) or `saveCurrentFile` ED:151-155 -> `saveFileByPath` ED:161-178.
- `saveFileByPath`: skips when no tab / virtual / clean (ED:163). Captures `tab.content` (ED:165). `writeTextFile(path, content)` ED:168 (plugin-fs, in place, not atomic). On success `markSavedByPath` (store, sets savedContent = written content, ED:169 -> editor.store.svelte.ts:91-96) and `notifyAfterSave` ED:170 -> editor.hooks.ts:67-92. On failure: `toast.error('Failed to save file.')` ED:175, returns false, tab stays dirty.
- Failed autosave retries every 5 s via a bare `setTimeout(saveDirtyTabs, 5000)` ED:191-193 (not cancelled by resetEditor).
- `notifyAfterSave` (editor.hooks.ts:67-92): markRecentSave (self-save mark, 15 s TTL, editor.hooks.ts:24,37-44), then `applyNoteChange({source:'save'})` FS/note-change.service.ts:81 (sync, policy row :87), `notifyContentInvalidated()`, after-save observers.
- Window close: `registerCloseHandler` tauri-listeners.service.ts:53-55 calls `event.preventDefault()`, then `saveAllDirtyTabs()` ED:234-247 (cancels debounces, saves all dirty, returns failed paths). If any failed, `ask()` "Close anyway and lose unsaved changes?" (tauri-listeners.service.ts ~57-64). Then drains calendar writes and settings, then `getCurrentWindow().destroy()`.
- Rust side of save: none. The TS save does not go through Rust at all (no `write_atomic`). Confirmed by grep: writeTextFile call sites are listed in section 2.

### 1b. Close tab
- `closeTab` ED:262-289: pinned skipped (ED:265); dirty -> `ask('This file has unsaved changes. Discard changes?')` ED:271-277; then removeTab, deleteTabViewState, notifyTabClosed.

### 1c. Delete (explorer, row menu, note action bar, event calendar)
- Entry points: `deleteNoteWithConfirm` FEATURES/note-action-bar/note-action-bar.service.ts:14-27 (ask at :18, deleteItem at :24). NoteRowMenu.svelte:121-131 (ask, then deleteItem at :128). FilesNavigator.svelte:174 (folder/file, deleteItem). Event calendar: EVENT-CAL service.ts:1028-1046 `deleteNow` calls `saveFileByPath(path)` FIRST (:1036-1037, comment at :1035: "`deleteItem` closes tabs without a dirty check and the Trash keeps only the disk bytes, so an unsaved edit is saved first") and then `asOwnPathChange(path, null, () => deleteItem(path))` (:1043).
- `deleteItem` FS/fs.service.ts:167-190 -> `applyPathChange({to:null, diskOp})` FS/path-change.service.ts:117-171:
  - :125 `closeTabsForDeletedPath(from)` runs BEFORE the disk op. No dirty check.
  - :127 `await diskOp()`. diskOp (fs.service.ts:173-183): if vaultPath, dynamic import `moveToTrash` (TR/trash.service.ts:49-97, which does mkdir, `rename(absolutePath, trashPath)` at :71, manifest write at :79). Else permanent `remove(itemPath, {recursive:true})` fs.service.ts:181 (no trash).
  - :131 tree node removed. :135-141 path-change consumers. :153 refreshTree. :159 rename_note skipped for delete. :168-170 `forgetNote(path)` for from + children -> `applyNoteChange({kind:'delete'})` FS/note-change.service.ts:197-221 (clearIndexedEntry :200, remove_note_from_index :202, remove_from_search_index :209, remove_semantic_file :217; all fire-and-forget).
- `closeTabsForDeletedPath` ED:356-366: splices every matching tab, dirty or not. No `isTabDirty` check.

### 1d. Rename
- `renameItem` FS/fs.service.ts:201-220: `exists(newPath)` -> throw `"<name>" already exists in this folder` (:205). Then `applyPathChange({from, to, diskOp: rename(old,new)})` (:206-212, rename at :211).
- applyPathChange order (path-change.service.ts): closeTabs skipped (to!==null) -> `diskOp` :127 -> `updateTabAfterRenameOrMove` :132 (store path update, ED-independent: FS/link-updater.service.ts:73-85) -> consumers :135-141 -> `if markdown(to): await updateLinksAfterRename(from,to)` :143-151 -> `await refreshTree()` :153 -> `await call('rename_note')` :159 (try/catch, logs) -> `forgetNote` for from and each child :168-170.
- `updateLinksAfterRename` FS/link-updater.service.ts:21-61: `get_backlinks_v2` :27 (NOT inside try, so a rejection escapes), per affected file in `Promise.allSettled` :30: dirty tab uses `openTab.content` (:33-35), else `readTextFile` :35; `replaceWikilinks`; if changed `writeTextFile(filePath, updatedContent)` :39 (in place, not atomic); `syncExternalContentToEditor(filePath, updated, true, 'none')` :47 (marks CLEAN); `applyNoteChange({source:'save'})` :52.

### 1e. Move (drag/drop, auto-move)
- `moveItem` FS/fs.service.ts:228-248: same shape as rename (exists check :233, rename :239, no link update for same name: updateLinksAfterRename returns early at link-updater.service.ts:25, case-insensitive compare). Auto-move: FEATURES/auto-move/auto-move.service.ts:188 (`moveItem`), FilesNavigator.svelte:255.

### 1f. Create note / folder / duplicate
- `createFile` FS/fs.service.ts:119-145: readDir for siblings, generateUniqueName (fs.logic.ts:215-235, case-insensitive), `call('create_note', {path, content})` :129 -> Rust `create_note` RS/commands/vault.rs:888-914 (ensure_safe_write_path :895, `Path::exists` check :896 returns Err "File already exists", `write_atomic` :899, index update, emit). Then `markRecentSave` :130, `void applyNoteChange({source:'fs', rust:'never'})` :137 (fire-and-forget, errors inside), refreshTree :138.
- `createFolder` fs.service.ts:148-164 -> Rust `create_folder` RS/commands/vault.rs:922-925 (`create_dir_all`).
- Note creator: CORE/note-creator/note-creator.service.ts:91-113 (create_folder, create_note, markRecentSave, applyNoteChange 'create').
- `duplicateItem` fs.service.ts:266-286: `copyFile` / recursive `copyDirectoryRecursive` (:251-263). No cleanup of a partial copy on failure.

### 1g. Trash restore
- TrashSection.svelte:26 -> `restoreItem` TR/trash.service.ts:110-180: `restorePath = vault/originalPath` (:113, from manifest JSON, no containment check), `exists(restorePath)` -> `findUniqueRestorePath` (:116-118), mkdir parent (:122-124), `rename(trashPath, restorePath)` (:126), remove container (:130, non-fatal), `saveManifest` with `trashStore.items.filter` (:137-142, errors logged, store still updated), `trashStore.removeItem` (:143), then in try/catch (:148-172): `indexRestoredNotes` -> per note `readTextFile` (:248), `markRecentSave` (:253), `applyNoteChange({source:'restore'})` (:254), `notifyContentInvalidated` (:258); refreshTree (:157); folder notes re-indexed (:163-169).
- Event calendar restore: EVENT-CAL service.ts:1171 calls restoreItem.

### 1h. Trash delete / empty / load
- `deletePermanently` TR/trash.service.ts:185-200: remove item dir (:188) BEFORE manifest save (:191). Failure after remove leaves a phantom manifest entry (no data loss).
- `emptyTrash` :205-222: remove whole items dir (:209), then manifest `[]` (:213).
- `loadTrash` :24-43: exists/readTextFile/parse. On ANY error: logs and `trashStore.setItems([])` (:37-40). Never throws. Called inside the Promise.all in app-lifecycle.service.ts:288-292, whose catch never fires for trash, so no toast.

### 1i. External change (watcher) and reload of open tabs
- Rust watcher RS/vault/watcher.rs: notify recommended_watcher (:253-262) sends ALL event paths to the bridge; hidden dirs dropped (:71, :~200 `is_inside_hidden_dir`); debounce loop (:152-233, DEBOUNCE_MS constant not read). Emits `vault-files-changed`.
- TS: `startWatching` FS/fs.watcher.ts:190-210 subscribes then invokes `start_vault_watcher`. `handleChangedPaths` :122-187 (tree rescan only).
- app-lifecycle.service.ts:480-496: `runWatcherBatch` (serialized) -> `reloadExternallyChangedTabs(paths)` :486 -> `rebuildAllIndexes(paths)` :487; debounce 300 ms (:~490-494); subscribed through `onFileChange` :494.
- `reloadExternallyChangedTabs` ED:375-404: eligible = open, non-virtual, CLEAN tabs (:378-382). `Promise.allSettled(readTextFile)` :385-387 (no dirty re-check after the await). Apply loop :390-403: rejection skipped (:391-393); re-check only tab exists and `diskContent !== tab.savedContent` (:397-398); `syncExternalContentToEditor(path, disk, true, 'none')` :401 (sets content AND savedContent, marks clean).
- `rebuildAllIndexes` watcher-handler.service.ts:30-79: filePaths = basenames containing '.' (:33-36). Skip when all paths are recent self-saves (`areAllRecentSaves`, :41-44; 15 s TTL, editor.hooks.ts:24,47-49). Incremental (<=10 md files): `read_files_batch` :90-93, then per result `content !== null ? upsert(source 'watcher') : delete` (:105-109), `notifyContentInvalidated` :115. Full path: rebuildIndex, buildPropertyIndex, buildFrontmatterIconIndex, notifyContentInvalidated (:68-75).
- Rust `read_files_batch` RS/commands/files.rs:24-84: canonicalize failure -> `content: None, error` (:37-46); outside vault -> None (:49-60); `read_to_string` failure (non-UTF-8, EACCES, EIO) -> `content: None, error` (:63-73). TS ignores the `error` field.

### 1j. Save as part of vault switch / init / teardown
- `switchVault` VA/vault.service.ts:18-22: `await saveAllDirtyTabs()` :19 (return value IGNORED), `await drainPendingWrites()` :20, `vaultStore.open(path)` :21.
- layout effect `+layout.svelte:61-80`: vault changed -> `initializeVault(path)`; not open -> `teardownVault()` :76 (not reached in practice: `vaultStore.close` has no callers, checked by grep).
- `initializeVault` APP/lifecycle app-lifecycle.service.ts:~160-190: if previous vault: unregister observers, `await saveAllDirtyTabs()` safety net :180, `drainEventCalendarWrites` :182-183, `teardownVault()` :188.
- `teardownVault` app-lifecycle.service.ts:533+: `resetHooks` :616, `resetEditor` :622 (editorStore.reset, tabs = []), `resetFileSystem` :623, etc. Dirty buffers that survived the safety-net save are discarded here.

### 1k. Other writers that change note bytes (outside core/filesystem)
- Frontmatter/property edits: CORE/frontmatter/frontmatter-write.service.ts `attempt` :105-165. Tab branch uses tab content as base (:110-116), `syncExternalContentToEditor(false)` :125, `saveFileByPath` :126. Non-tab branch: exists :145, re-check tab :152, `writeTextFile(path, next, {create:false})` :149, notifyAfterSave :164. This is the best-behaved writer (uses the dirty buffer). Tests: TESTS/core/frontmatter/frontmatter-write.service.test.ts (not read in detail).
- Task checkbox: FEATURES/tasks/tasks.service.ts:97-118 `toggleTask` -> Rust `toggle_task_status` (path, lineNumber) -> `syncExternalContentToEditor(filePath, updatedContent, true, 'none')` (around :113) -> `buildTaskIndex`.
- Type rename: FEATURES/type-definitions/type-definitions.service.ts:201-240: `renameItem` :209 (already guards), then for each tab `rewriteTypeInFrontmatter(tab.content)` and `writeTextFile(tab.path, updated)` :218 + sync :220 + applyNoteChange 'save' :223, then `call('propagate_type_rename')` :226 (Rust rewrites non-open members on disk).
- Deep link: FEATURES/deep-link/deep-link.service.ts: `executeNewAction` :240-300: prepend write :260 + sync :262 (disk-based read at :255-257), append write :279 + sync :281 (read :276), overwrite write :296 + sync :298 (no existence check, no confirm). Silent create :~312-313.
- Daily note append/prepend: APP/deep-link-actions.ts:40-66 (readTextFile :50-ish disk base, writeTextFile :61, sync :63 with markSaved true). Capture note: deep-link-actions.ts:173 (writeTextFile to a unique path, no tab sync).
- Rust writers: `toggle_task_status_inner` RS/commands/vault.rs:664-688 (read_to_string :669 from DISK, `write_atomic` :683); `propagate_type_rename_inner` vault.rs:~360-390 (read :362, `write_atomic` :370); `create_note` vault.rs:888-914; `create_folder` vault.rs:922-925; `update_note_in_index` / `remove_note_from_index` / `rename_note` (index only, no disk).
- Settings/config/log/todoist/auto-move/file-history/file-icons JSON under `.kokobrain` or outside the vault: not notes, listed in ratchet (raw-write-ratchet.test.ts:24-52).

---

## 2. Every disk write, delete and rename in the slice

Legend: ATOM = atomic (temp + rename). Preconditions = what is checked before the call. On success/failure = store/state side effects.

| # | Site | Op | Atomic? | Preconditions checked | Failure handling | Success / failure state |
|---|------|----|---------|-----------------------|------------------|-------------------------|
| W1 | ED/editor.service.ts:168 saveFileByPath | writeTextFile (in place, truncate) | NO (READ tool summary of plugin-fs source) | tab exists, not virtual, dirty (:163) | catch -> toast, return false (:173-177) | success: markSavedByPath, notifyAfterSave. failure: stays dirty, retry 5 s only via saveDirtyTabs |
| W2 | FS/link-updater.service.ts:39 | writeTextFile of OTHER notes after rename/move | NO | content changed (:38); dirty tab uses buffer (:33-35) | allSettled, logged (:56-60) | success: syncExternalContentToEditor (marks CLEAN, buffer written to disk), applyNoteChange. failure: link not updated, rename still stands |
| W3 | FS/fs.service.ts:48 loadFolderOrder template | writeTextFile | NO | file missing | catch -> error log, folder order {} | writes JSON under .kokobrain |
| W4 | FS/fs.service.ts:211, :239 renameItem/moveItem | plugin-fs rename -> std::fs::rename | rename is atomic for the entry, but overwrites an existing target on Unix | exists(newPath) check (:205, :233) | rethrow after logging (:216-219, :241-244) | success: applyPathChange side effects. failure: rethrow, tabs untouched (diskOp rejects before updateTab) |
| W5 | FS/fs.service.ts:181 deleteItem fallback (no vault) | remove recursive, PERMANENT | n/a | none | rethrow | no trash, unrecoverable |
| W6 | TR/trash.service.ts:71 moveToTrash rename | rename into .kokobrain/trash/items/<id>/ | rename | container mkdir succeeded | container removed ONLY if rename did not happen (:91-93) | success: manifest save (:79), addItem (:83). manifest failure: logged, item kept in trash but absent from manifest |
| W7 | TR/trash.service.ts:126 restoreItem rename | rename trash -> original (or suffixed) | rename | exists(restorePath) -> suffix (:116-118) | throws, item stays in trash (:176-179) | success: manifest save (:139), removeItem (:143), indexing (:148-172) |
| W8 | TR/trash.service.ts:188 deletePermanently remove | remove item dir | n/a | none | rethrow | manifest save after (:191) |
| W9 | TR/trash.service.ts:209 emptyTrash remove | remove whole items dir | n/a | exists | rethrow | manifest [] after |
| W10 | TR/trash.service.ts:275 saveManifest | writeTextFile of whole manifest | NO | dir exists (:271-273) | callers: moveToTrash logs (:80-82); restore logs (:140-142); deletePermanently/emptyTrash THROW | in-memory store is the source of the write |
| W11 | FS/fs.service.ts:178 moveToTrash via deleteItem | moves note to trash | rename | vaultPath set | rethrow, tabs ALREADY CLOSED (path-change :125) | tree node removed only after diskOp (:131) |
| W12 | FS/fs.service.ts:129 create_note (Rust) | write_atomic | ATOM (RS utils/fs.rs:16-32) | ensure_safe_write_path, exists check (vault.rs:895-898) | Err propagated | index updated; note-creator/createFile rethrow |
| W13 | FS/fs.service.ts:156 create_folder (Rust) | create_dir_all | n/a | ensure_safe_write_path | Err | none |
| W14 | Rust toggle_task_status vault.rs:683 | write_atomic over the note | ATOM | read succeeded, line changed | Err propagated; TS toggleTask catches, toast 'Failed to save task change.' (tasks.service.ts ~118-121) | index updated, TS tab SYNCED FROM DISK (see lead L2) |
| W15 | Rust propagate_type_rename vault.rs:370 | write_atomic over member notes | ATOM | read ok, rewrite changed | per-file: logged, skipped (:371-377) | index updated per member |
| W16 | DEEP-LINK deep-link.service.ts:260, :279, :296, :313 and deep-link-actions.ts:61, :173 | writeTextFile | NO | prepend/append: exists (:253-, :276-); overwrite: none | rethrow / logged by caller | sync with markSaved TRUE over the open tab (see L3) |
| W17 | FEAT/type-definitions.service.ts:218 writeTextFile of open tabs in renameType | NO | content rewritten only if `_type` matches | in try/catch, toast on error (:221-224) | tab marked clean with rewritten content |
| W18 | CORE/frontmatter/frontmatter-write.service.ts:149 writeTextFile(create:false) | NO but create:false | exists check, tab re-check, vault check | throws 'missing' or rethrows | notifyAfterSave on success |
| W19 | FS/note-change.service.ts: remove_note_from_index, remove_from_search_index, remove_semantic_file, update_* (IPC, not disk for notes) | index writes | n/a | none | `.catch` logs, fire-and-forget (:202-219, :235-254) |
| W20 | RS vault/index_cache.rs:55-75 write_snapshot_atomic | cache file (msgpack) | ATOM with sync_all (:66) | n/a | Err | cache only, not notes |
| W21 | RS utils/fs.rs:26 temp name `<path>.tmp-<pid>-<seq>` | temp file | written then renamed | read-only check (:20-24) | on rename failure, tmp removed (:29); on write failure tmp not removed | a crash leaves a stray `.tmp-*` file; no sweep exists (grep: nothing removes `.tmp-`) |

Notes on W4 and W12: plugin-fs rename and std::fs::rename overwrite an existing target on Unix. Correctness relies entirely on the TS `exists` check, which is a TOCTOU window (INFER).

Notes on Rust writes (W12-W15): `write_atomic` (RS/utils/fs.rs:16-32) does not fsync the temp file before rename. `write_snapshot_atomic` (RS/vault/index_cache.rs:55-75) does call sync_all. INFER: a power loss after rename can leave a zero-length note on filesystems that do not flush on rename.

Notes on W1/W2/W10/W16/W18 (TS in-place writes): plugin-fs `write_text_file` truncates the target and writes in place (READ, plugins-workspace source). A crash, kill or disk-full mid-write leaves a truncated or empty note. No TS note write uses `write_atomic`.

---

## 3. Concurrency: timers, in-flight promises, queues, interleavings

Timers:
- debouncedSave 2000 ms (ED:197), debouncedSaveFrontmatter 500 ms (ED:200): mutually exclusive via scheduleAutoSave (ED:213-221). resetEditor cancels both (ED:412-416). saveAllDirtyTabs cancels both (ED:235-236).
- Retry `setTimeout(saveDirtyTabs, 5000)` ED:192: NOT cancelled by resetEditor. Each failed autosave re-arms it, and it repeats until a save succeeds. Each failure shows a toast (ED:175).
- recentSaves TTL 15 s (editor.hooks.ts:24,40-42): per-path timer, reset by markRecentSave (:37-44). resetHooks clears it (:98-99).
- Watcher TS debounce 300 ms (app-lifecycle.service.ts ~490-494) + serializeWithRerun for the batch (:480-489). Rust debounce loop (RS/vault/watcher.rs:152-233).
- yieldToEventLoop setTimeout(0) only for source 'edit' (note-change.service.ts:160, :259-262).
- Auto-move, event calendar queues: not fully read (EVENT-CAL per-path queue referenced at event-calendar.service.ts:8, :1035-1043).

In-flight promises and interleavings:
- saveFileByPath has NO in-flight guard (ED:161-178). Two overlapping calls for the same path (debounce timer + Cmd+S, or save during closeTab/ closeTabs) both call writeTextFile on the same file. Each captures its own `tab.content` at call time. With in-place writes the final bytes depend on the order the plugin's write_all calls finish. Each completion calls markSavedByPath(its own content), so savedContent can end as the OLDER content while the disk holds the other, and no timer is re-armed to fix it (INFER; Tauri IPC ordering not verified).
- applyNoteChange is fire-and-forget at many call sites: `void applyNoteChange(...)` (note-change.service.ts callers: editor.hooks.ts:81, link-updater.service.ts:52, fs.service.ts:137, path-change.service.ts:86). Rust IPC `update_note_in_index` is not awaited (note-change.service.ts:235-237). Two IPCs for the same path (edit then save) can complete out of order. Rust order inside the index is last-arrived-wins (INFER).
- applyPathChange (path-change.service.ts:117-171) is awaited step by step but other awaits between steps are not guarded against user actions: user types into the moved tab during `updateLinksAfterRename` (:149) and `refreshTree` (:153). The tab path was already updated at :132 so autosave goes to the new path (intended). The link updater's own tab read is not guarded (link-updater.service.ts:33-35 checked before the await at :35).
- reloadExternallyChangedTabs (ED:385-403): a keystroke during the parallel read is overwritten (see L4). The same window exists in updateLinksAfterRename for a clean tab that becomes dirty during readTextFile (link-updater.service.ts:34-35, :47) (see L14).
- restoreItem / moveToTrash / deletePermanently / emptyTrash: no mutex. Each saveManifest serialises the in-memory `trashStore.items` at call time (trash.service.ts:79, :137, :191, :213). moveToTrash adds the item to the store only after its save (:83). Two overlapping operations can therefore write a manifest that omits the other's entry, then the other's write lands last (see L9).
- restoreItem existence check and rename are separate awaits (trash.service.ts:116 then :126). A file created in between is overwritten by rename on Unix (INFER).
- createFile: exists check is in Rust (vault.rs:896) then write_atomic (:899), separate steps: race overwrites on rename (INFER, low).
- vault switch: switchVault saves (ED:234-247) then drains write barriers (VA/write-barrier.service.ts:37-41) then opens. initializeVault then saves again (APP lifecycle :180), drains calendar, then teardownVault -> resetEditor. Dirty buffers that failed both saves are discarded at teardown (see L10).
- Rust VaultIndex: RwLock write for index mutations (vault.rs:~305-313, :~925-935, :~1050-1060), event emitted after drop. Not a data-loss path.

---

## 4. Leads (hypotheses, ordered by severity)

Confidence key: HIGH = code path read end to end, no mitigation seen. MED = code path read, trigger or ordering not run. LOW = inference only.

### L1 - Delete through the explorer, row menu or action bar drops unsaved edits of the open tab (HIGH)
- Code: FS/path-change.service.ts:125 calls `closeTabsForDeletedPath(from)` before `diskOp` (:127). ED/editor.service.ts:356-366 removes every matching tab with no `isTabDirty` check. Callers that skip the save: FEATURES/note-action-bar/note-action-bar.service.ts:24, FEATURES/note-list/NoteRowMenu.svelte:128, FEATURES/rail-shell/FilesNavigator.svelte:174. The event calendar (EVENT-CAL service.ts:1036-1037) DOES save first, so the rule is applied on one path only.
- Trash keeps only the disk bytes (TR/trash.service.ts:71 rename of the file on disk), so the unsaved text is gone.
- Scenario: open note N, type a paragraph, click the row menu "Move to Trash" within 2 s of the last keystroke (debounce still pending, ED:197). Confirm. Tab closes, trash holds the pre-typing bytes. Restore brings back the old version. Same if a previous autosave failed (ED:191-193 retries every 5 s and the tab stays dirty).
- Confidence on mechanics: HIGH. Likelihood: medium (2 s window, but failed saves widen it).
- Tests: TESTS/core/filesystem/fs.service.test.ts:585-594 "closes tabs and removes from index on delete" (no dirty tab). TESTS/core/filesystem/fs.service.race-audit.test.ts:88-109 asserts tabs close BEFORE the disk move (ordering only). TESTS/features/note-action-bar/note-action-bar.service.test.ts:58-90 and TESTS/features/note-list/NoteRowMenu.test.ts:295-300 mock deleteItem at the boundary, never a dirty tab. No e2e covers dirty delete (e2e/specs/file-operations.spec.ts:15-28 uses a clean note).
- Known? Not in architecture-stability issues. The event-calendar comment documents the hazard (EVENT-CAL service.ts:1035) but the other entry points do not follow it.

### L2 - Clicking a task checkbox replaces the open note's unsaved edits (HIGH mechanics, MED likelihood)
- FEATURES/tasks/tasks.service.ts ~97-118 calls Rust `toggle_task_status` (vault.rs:708-713 -> inner :664-688). Inner reads FROM DISK (`read_to_string` at vault.rs:669) and writes the toggled line (:683). Returns `updatedContent` = disk text with the toggle.
- tasks.service.ts (~:113) calls `syncExternalContentToEditor(filePath, updatedContent, true, 'none')`, which sets BOTH content and savedContent (ED:70-91 -> editor.store.svelte.ts:130-136). The buffer's unsaved keystrokes are replaced by disk text and the tab shows clean.
- Scenario: type in note N (dirty, <2 s), switch to the Tasks tab and tick a box belonging to N. Keystrokes vanish, tab is clean, no toast.
- Overlap: review at .scratch/ios-app/research/review-data-safety.md B2 (lines 69-84) already says "This is silent loss, and it is already a desktop bug: Tasks view toggle with a dir[ty tab]". Not in architecture-stability issues.
- Tests: tasks.service.test.ts (TESTS/features/tasks/) NOT read. Whether it covers a dirty tab is unverified; the grep for toggleTask in tests matched only the feature file list.

### L3 - Deep-link and daily-note writers overwrite an open dirty tab, and `overwrite=true` replaces an existing note without confirmation (HIGH mechanics)
- deep-link.service.ts:255-262 (prepend), :276-281 (append), :288-298 (overwrite, no existence check) and APP/deep-link-actions.ts:50-63 (daily note append/prepend, base read from DISK) all call `syncExternalContentToEditor(path, content, true, 'none')` after writing. Dirty buffer is replaced (same mechanics as L2).
- Test that pins it: TESTS/features/deep-link/deep-link.service.race-audit.test.ts:130-157 sets a DIRTY tab (`content:'dirty editor content'`, `savedContent:'saved content on disk'`) and asserts `syncExternalContentToEditor` is called with the disk-based appended content, i.e. the overwrite is the asserted behaviour. Header comment (:1-6) calls it "Bug 3.5" but the assertion is the buggy behaviour.
- `kokobrain://new?...&overwrite=true` (deep-link.logic.test.ts:144-148 parses it) overwrites any existing note with no confirmation (deep-link.service.ts:288-298). The URL can come from any app or web link that opens kokobrain://. Path traversal is guarded by `resolveFilePath` (src/lib/utils/path.ts:33-53, throws outside vault): READ, good.
- Overlap: review B2 cites deep-link lines 262, 281, 298 for the same pattern; listed as "audit in the same Issue".
- Tests: deep-link.service.test.ts:519-552 covers overwrite of a CLEAN or absent file (overwrites existing file, silently). No dirty-tab overwrite test except the audit test above (which pins the bug).

### L4 - reloadExternallyChangedTabs loses keystrokes typed during the read (MED-HIGH)
- ED/editor.service.ts:380 checks dirty before the read (:385-387). After the await only `!tab || diskContent === tab.savedContent` is re-checked (:397-398). Dirty is NOT re-checked. `syncExternalContentToEditor(..., true, 'none')` (:401) overwrites content with disk text and marks clean.
- Trigger: external write (or own save via watcher) plus a keystroke during readTextFile (a few ms on desktop; longer on slow disks). Review M1 (ios-app review lines 114-126) reports the same race.
- Tests: editor.service.test.ts:1096-1183 covers clean reload (:1096), dirty skip before the read (:1150, already-dirty only), read error (:1161). No test for "dirty during the read".

### L5 - External edits to an open dirty note are silently clobbered on the next autosave (MED, design-level)
- Watcher reload only touches CLEAN tabs (ED:378-382); the comment at ED:371-373 says "the editor always wins ... will be saved on next auto-save". So an external change (git, sync, another editor) to a note with unsaved edits is overwritten by the autosave 2 s later. No conflict check or prompt.
- Test pins the design: editor.service.test.ts:1150-1159 ("skips dirty tabs - editor always wins"). Not tested: the subsequent disk overwrite.
- Owner decision (design), flagged because it is silent loss of the EXTERNAL side.

### L6 - External change within 15 s of an app save never refreshes the Rust index, FTS5 or semantic tables (MED-HIGH, stale index)
- watcher-handler.service.ts:41-44: if all changed paths are `areAllRecentSaves` (path-only check, editor.hooks.ts:47-49, 15 s TTL :24), `rebuildAllIndexes` returns before any index update. The open-tab reload still runs (app-lifecycle.service.ts:486 is not gated), so the editor shows the new text while search, backlinks, tags and the semantic index keep the old content until the next watcher event for that path.
- Scenario: save note N in the app, then within 15 s `git checkout` or a sync client rewrites N. Editor (clean) shows new text. Search for a word only in the new text finds nothing. Backlinks stale. Heals on the next change to N, or on restart (rebuild).
- Tests: TESTS/app/lifecycle/watcher-handler.service.test.ts:78-103 mocks `areAllRecentSaves` to return true and asserts the skip. No test distinguishes self-save from external change inside the window. TESTS/core/editor/editor.hooks.test.ts:226-270 covers the TTL only.
- Not in architecture-stability issues.

### L7 - Any per-file read failure during an incremental watcher batch deletes the note from every index (MED)
- RS/commands/files.rs:63-73 returns `content: None` for ANY `read_to_string` failure (non-UTF-8 note, EACCES, EIO, file replaced mid-read). APP/watcher-handler.service.ts:105-109 maps `content === null` to `kind:'delete'`, which runs applyNoteChange delete: drops the dedupe signature, VaultIndex entry (note-change.service.ts:202), FTS5 row (:209) and semantic chunks (:217).
- The note stays on disk and in the explorer tree but disappears from search, backlinks, tags and the collection index until a later change re-indexes it. Index loss, not content loss.
- Tests: TESTS/app/lifecycle/watcher-handler.service.test.ts:331-354 uses `content: null` as a deletion (the contract), never an `error` result. Rust RT/commands/files_test.rs:80-90 (non-UTF-8 -> error) confirms the Rust side returns the error case.

### L8 - Corrupt or unreadable trash manifest is silently overwritten by the next trash operation (MED, data-access loss)
- TR/trash.service.ts:37-40 `loadTrash` swallows errors and sets `[]`. TR/trash.logic.ts:58-66 `parseTrashManifest` returns `[]` for invalid JSON, and :95-105 drops entries that fail type checks. app-lifecycle.service.ts:288-292 never sees the error, so no toast.
- Next `moveToTrash` writes `[newItem]` only (trash.service.ts:79) through `saveManifest` which uses in-place `writeTextFile` (:275, not atomic). Every earlier item's folder stays under `.kokobrain/trash/items/<id>/` but is no longer listed. Those notes are unrecoverable from the UI. `emptyTrash` later deletes the whole items dir.
- Trigger: manifest truncated by a crash or kill during saveManifest (W10), or exists/read failure at startup, then any delete.
- Tests: TESTS/core/trash/trash.service.test.ts:105-114 (load error -> empty), :115-129 (invalid entries filtered). No test that a save after a failed load keeps prior entries; no test of a truncated file (trash.logic.test.ts:117 covers the pure parser only). The trash tests mock plugin-fs as `vi.fn()` (trash.service.test.ts:14-20), so no disk model.

### L9 - Concurrent trash operations can drop an entry from the manifest on disk (MED-LOW, needs overlap)
- moveToTrash, restoreItem, deletePermanently each compute the manifest from `trashStore.items` at call time (trash.service.ts:79, :137, :191) and write it; moveToTrash only adds to the store after its save (:83). Two overlapping operations on different paths (explorer and calendar both allowed: the calendar queue is per-path, EVENT-CAL service.ts:8) can leave the later-finishing write without the earlier item. In-memory store stays correct until restart, then the entry is gone (same consequence as L8).
- Tests: none for overlap. TESTS/core/trash/trash.service.test.ts:177-187 checks one save call.

### L10 - Vault switch continues after a failed save and the dirty buffer is discarded at teardown (MED-HIGH, KNOWN in part)
- VA/vault.service.ts:19 ignores the failed-path array from saveAllDirtyTabs. :21 opens the new vault. The safety-net retry (APP lifecycle :180) and teardown `resetEditor` (:622) discard whatever is still dirty. A failed save shows a toast (ED:175), then the tab disappears.
- Known: .scratch/architecture-stability/issues/34-save-dirty-tabs-before-vault-switch.md (Comments section, 2026-11-01 entry) says "the switch still goes ahead ... whether to block the switch instead is the owner's call". The comment does NOT say that teardown then drops the buffer, and the test pins the behaviour: TESTS/core/vault/vault.service.switch-save.test.ts:164-172 asserts the tab is still dirty right after the switch, not that it survives teardown.
- Scenario: disk full or permission denied on A, switch to B from the vault picker or a deep link. Toast "Failed to save file.", then A's unsaved text is gone.

### L11 - Non-atomic in-place writes of note content can leave a truncated note (MED impact, LOW likelihood)
- Every TS note write is in place (W1, W2, W16, W17, W18). plugin-fs truncates first (READ, plugins-workspace source). Crash, kill, power loss, or disk-full between truncate and write_all leaves a truncated or empty note. Rust `write_atomic` exists and is used only by Rust commands (vault.rs:370, :683, :899). TS saves are not routed through it.
- Rust `write_atomic` (RS/utils/fs.rs:16-32) also has no fsync before rename (contrast RS/vault/index_cache.rs:66 sync_all). INFER: power-loss durability is weaker than the doc comment implies.
- Tests: RT/utils_fs_test.rs:471-521 covers create, replace, no temp left, missing dir, read-only. No test for symlink, mode, or durability (not testable in unit tests).

### L12 - Overlapping saves of one path can leave older bytes on disk while the tab reads as clean (LOW-MED, hypothesis)
- ED/editor.service.ts:161-178 has no in-flight guard. Debounce timer and Cmd+S can overlap (both capture `tab.content` at call time). Final disk bytes depend on which in-place write completes last. markSavedByPath records whichever completed last (editor.store.svelte.ts:91-96), with no timer re-armed. Not run; depends on Tauri IPC completion order.
- Tests: TESTS/core/editor/editor.service.test.ts:249-262 (single save). No concurrent-save test.

### L13 - Link updater silently commits a dirty buffer to disk and marks it clean (LOW, documented intent)
- FS/link-updater.service.ts:33-47: a dirty tab's unsaved text (with link rewrite) is written to disk and savedContent set to it. The user never saw that save happen. Intent is written in the comment at :32; test pins it: TESTS/core/filesystem/link-updater.service.test.ts:167-190 ("uses in-memory content when tab has unsaved edits").

### L14 - Link updater and rename: a clean tab that becomes dirty during readTextFile is overwritten (MED-LOW, same class as L4)
- link-updater.service.ts:34 checks dirty before readTextFile at :35. If the user types during that read, :47 `syncExternalContentToEditor(..., true, 'none')` replaces the tab's content with the disk content plus the link rewrite. Keystrokes lost.
- Tests: link-updater.service.test.ts:192-210 (clean read) only.

### L15 - A failing link-rewrite IPC aborts the rest of applyPathChange after the disk rename already happened (MED)
- FS/path-change.service.ts:143-151 awaits `updateLinksAfterRename`. Inside it, `call('get_backlinks_v2')` (link-updater.service.ts:27) is outside the allSettled and not caught, so a rejection propagates. applyPathChange then skips refreshTree (:153), `rename_note` (:159) and the old-path `forgetNote` sweep (:168-170). The disk rename already happened (:127).
- Result: renameItem/moveItem throw "Failed to rename"/"Failed to move" for a file that moved; Rust VaultIndex keeps the old path, tree not refreshed, tabs point to the new path (updated at :132). Next watcher event or rebuild heals the index. The user may retry the rename, which then fails because the old path is gone.
- Tests: TESTS/core/filesystem/fs.service.race-audit.test.ts:141-170 checks ordering with mocks that resolve. No test for get_backlinks_v2 rejecting.

### L16 - Case-only rename is refused on case-insensitive volumes (LOW, functional, not data)
- FS/fs.service.ts:205 and :233 use `exists(newPath)` which is true when newPath is the same file on APFS. Result: `"Note.md" already exists in this folder` for a pure capitalisation change. generateUniqueName comments acknowledge case-insensitivity (FS/fs.logic.ts:215-219) but rename does not use that logic.
- Tests: TESTS/core/filesystem/fs.service.test.ts:723-750 use different names. Case-only rename not covered. INFER on the Tauri `exists` semantics (not run).

### L17 - Rust write commands accept any absolute path, not only vault paths (LOW, hardening)
- RS/commands/vault.rs:862-874 `ensure_safe_write_path` only rejects relative paths and `..` components. `toggle_task_status(path)` (vault.rs:708-713, :664-688) reads and rewrites any absolute path via write_atomic (:683). The caller is the webview (tasks.service.ts:102). Whether capabilities restrict this is not checked.
- Tests: RT/commands/vault_test.rs:588-613 pins the `..`/relative rule only.

### L18 - write_atomic is not symlink-aware, and it does not carry mode or extended attributes (LOW, INFER)
- rename(2) replaces the directory entry, so a symlinked note becomes a regular file and the original target is no longer updated (INFER). RS/commands/vault.rs:118-122 skips symlinks in the tree and index, which limits exposure to notes opened by path. The TS writers (in-place) keep the symlink target. Not tested.
- New file gets default mode, so an original 0600 file or macOS xattrs (Finder tags) are lost on Rust-side writes (INFER). Not tested.

### L19 - Stray `.tmp-*` files after a crash are never removed (LOW)
- RS/utils/fs.rs:26 names the temp `<path>.tmp-<pid>-<seq>`. Nothing in the code removes such files (grep found only the write and the cache's own `.tmp`). RS/commands/vault.rs:100-118 `scan_dir` lists non-dot, non-symlink entries without an extension filter, so these can appear in the explorer unless the TS tree filters them (NOT checked). The watcher forwards them (watcher.rs:253-262); TS full-rebuild check counts them as file paths (watcher-handler.service.ts:33-36), which defeats the self-save skip for Rust-side writes (perf, not data).

### L20 - Restore trusts the manifest's originalPath (LOW, requires a tampered manifest)
- TR/trash.service.ts:113 `restorePath = vault + '/' + item.originalPath` with no containment check. `parseTrashManifest` (trash.logic.ts:95-105) only checks types. A manifest entry with `../` writes outside the vault on restore. Manifest lives in the vault (`.kokobrain/trash`), so this needs a synced or foreign vault.
- Tests: none.

### L21 - Exists-then-rename races in restore and create (LOW)
- trash.service.ts:116-126 (restore) and RS/commands/vault.rs:896-899 (create_note) check existence in one step and rename/write in another. A file appearing in between is replaced on Unix (INFER). fs.service.ts:205 and :233 have the same pattern for rename/move.

### L22 - Permanent delete fallback when no vault is open (LOW)
- FS/fs.service.ts:176-181: `deleteItem` without vaultPath calls `remove` (unrecoverable). Reachability from the UI not checked (vault is normally open).

### L23 - Partial folder copy left behind on duplicate failure (LOW)
- FS/fs.service.ts:251-263 `copyDirectoryRecursive` has no cleanup. Original is untouched; a half-copied folder can remain. Test coverage of mid-copy failure not read (fs.service.test.ts:1204 covers read error only, not checked in detail).

### L24 - Pending save retry survives resetEditor (LOW)
- ED/editor.service.ts:192 `setTimeout(saveDirtyTabs, 5000)` is not cancelled by resetEditor (:412-416). After a vault switch the retry runs against the new vault's tabs. Usually harmless because tabs are cleared, but it does write any dirty tab present at that time. Not tested.

### L25 - Watcher self-save check and Cmd+Q (OPEN, see Not checked)
- Rust has no `ExitRequested` handler (grep of src-tauri returned nothing for ExitRequested/RunEvent). registerCloseHandler (tauri-listeners.service.ts:53-55) saves dirty tabs only on window CloseRequested. Whether app-menu Quit or Cmd+Q emits CloseRequested for the main window is not established by the Tauri page checked. If it does not, quitting with unsaved edits relies on autosave only.

---

## 5. Test coverage matrix for risky behaviors

Coverage key: COVERED (asserts the behavior on the real code path, at unit level), PARTIAL (only one side, or mocks cover the decision but not the state effect), NONE.

| Behavior | Status | Where (test file:line) | Notes |
|---|---|---|---|
| Save on window close | COVERED (unit) | TESTS/app/tauri-listeners.service.test.ts:210-216 (save before destroy), :224-236 (destroy after success), :238-255 (failed save -> ask), :257-266 (discard -> destroy), cancel path after :266 | Outside the slice dirs. Mocks saveAllDirtyTabs (ok: that is the boundary). Cmd+Q path untested (L25). |
| Save on app quit (Cmd+Q) | NONE / UNVERIFIED | none | See L25. |
| Save failure surfaced to user | COVERED | ED: editor.service.test.ts:284-299 (toast + stays dirty), :212-226 (saveCurrentFile error), :353-379 (retry after failure), :458-480 (failed paths returned) | Good. But no test that a failed save during vault switch loses the buffer at teardown (L10). |
| Retry after failed autosave | COVERED | editor.service.test.ts:353-379 (fake timers, 6 s advance) | Repeats every 5 s; not asserted to stop after success beyond one retry. |
| Close tab with unsaved edits asks | COVERED | editor.service.test.ts:536-556 (confirm closes, cancel keeps) | |
| Delete tab with unsaved edits | NONE | fs.service.test.ts:585-594 clean only; race-audit :88-109 ordering only | L1. Highest-priority gap. |
| Delete entry points save first (non-calendar) | NONE | note-action-bar.service.test.ts:58-90, NoteRowMenu.test.ts:295-300, FilesNavigator.menu.test.ts (not read) | Boundary mocks; no state assertion. |
| Event-calendar delete saves first | COVERED | TESTS/features/event-calendar/* (not read in detail) | Out of slice. |
| External change to CLEAN open tab reloads | COVERED | editor.service.test.ts:1096-1105 | Real store, mocked readTextFile. |
| External change to DIRTY open tab keeps editor | COVERED (asserts editor wins) | editor.service.test.ts:1150-1159 | Does not assert the disk is later overwritten (L5). |
| External change: keystroke during read | NONE | none | L4. |
| External change: read error | COVERED | editor.service.test.ts:1161-1169 | |
| External change within 15 s of save -> index refresh | NONE (asserts skip with mock) | watcher-handler.service.test.ts:84-92 (mock returns true; asserts skip) | L6. |
| Self-save skip (path TTL) | COVERED (mock) | watcher-handler.service.test.ts:78-103; editor.hooks.test.ts:226-295 | |
| Watcher read error on existing note treated as delete | NONE | watcher-handler.service.test.ts:331-354 (content null = delete, contract only) | L7. Rust: RT/commands/files_test.rs:80-90 (non-UTF-8 -> error). |
| Rename onto existing name refused | COVERED | fs.service.test.ts:740-750 (throws named error), :767-776 (no link update) | Real exists mock; no real-disk race. |
| Rename, tab path updated before link rewrite | COVERED | fs.service.test.ts:752-766; race-audit.test.ts:111-140 | |
| Rename: rename_note before removal sweep | COVERED | race-audit.test.ts:142-170 | |
| Rename: link rewrite failure (get_backlinks_v2 rejects) | NONE | none | L15. |
| Case-only rename | NONE | none | L16. |
| Link rewrite of other notes | COVERED | link-updater.service.test.ts:91-107 (updates affected), :120-132 (skip identical content), :147-156 (continue after read failure) | Mocked invoke/readTextFile. |
| Link rewrite with DIRTY tab | COVERED (pins silent write) | link-updater.service.test.ts:167-190 | Pins L13. |
| Link rewrite: tab turns dirty during read | NONE | none | L14. |
| Move: tab path, links, index | COVERED | fs.service.test.ts:902-1042 (moveItem suite) | |
| Trash: move to trash (happy and failure) | COVERED | trash.service.test.ts:140-230 (move, dirs, manifest save, rename failure cleans container at :196-209, manifest failure keeps container at :210-229) | |
| Trash: restore to original, suffix on occupied, dir suffix | COVERED | trash.service.test.ts:242-305 | |
| Trash: restore cleans container; refresh failure still reports restore | COVERED | trash.service.test.ts:306-352 | |
| Trash: restore re-indexes notes | COVERED | trash.service.test.ts:353-635 | Good coverage for indexing. |
| Trash: manifest load failure | PARTIAL | trash.service.test.ts:105-114 (empty list) | No test of the next save overwriting prior entries (L8). |
| Trash: corrupt manifest parse | PARTIAL | trash.logic.test.ts:117-154 (pure parser: invalid JSON, non-array, wrong types) | Not composed with saveManifest. |
| Trash: concurrent operations | NONE | none | L9. |
| Trash: deletePermanently / emptyTrash | COVERED | trash.service.test.ts:636-725 | Mock-level; phantom-entry on manifest failure not tested. |
| write_atomic: create, replace, no temp left, missing parent, read-only | COVERED | RT/utils_fs_test.rs:473-521 | |
| write_atomic: symlink target, mode/xattrs, durability | NONE | none | L11, L18. |
| create_note Rust: exists guard | NONE | RT/vault_file_ops_test.rs:21-30 simulates the inner write (header :1-12 says the command wrapper is not unit-tested); no test references "already exists" | Real guard at vault.rs:896. |
| create_note Rust: ensure_safe_write_path | COVERED | RT/commands/vault_test.rs:588-613 | |
| toggle_task_status Rust | COVERED | RT/vault_file_ops_test.rs:158-233 (happy, no-op, out of bounds, not found, index tasks, round trip) | Does not cover a dirty TS tab (L2). |
| propagate_type_rename Rust | COVERED | RT/vault_type_rename_test.rs:22-121 (rewrite, untouched non-members, write failure continues at :94-119) | |
| rename_note_inner / remove | COVERED | RT/vault_file_ops_test.rs:438-520 | Index only. |
| read_files_batch: outside vault, traversal, symlink outside | COVERED | RT/commands/files_test.rs:104-170 | |
| Deep-link overwrite of existing note | COVERED for clean/absent, PINS dirty overwrite | deep-link.service.test.ts:519-552; race-audit.test.ts:130-157 | L3. |
| Deep-link path traversal | COVERED | TESTS/features/deep-link/deep-link.logic.test.ts (resolveFilePath) not read | Guard at src/lib/utils/path.ts:33-53. |
| Frontmatter edit uses dirty buffer | COVERED (not read) | TESTS/core/frontmatter/frontmatter-write.service.test.ts | Not read in detail. |
| Vault switch saves dirty tab first | COVERED | TESTS/core/vault/vault.service.switch-save.test.ts:136-151 (incl. deep link :144) | Issue 34. |
| Vault switch with failed save | PARTIAL | vault.service.switch-save.test.ts:164-172 (switch still opens; tab still dirty) | Does not assert the buffer is lost at teardown (L10). |
| Write barrier / calendar drain before open | COVERED | TESTS/core/vault/write-barrier.service.test.ts:9-60; vault.service.test.ts:69-95 | |
| Watcher-triggered tree refresh | COVERED (mock) | TESTS/core/filesystem/fs.watcher.test.ts:317-420 | |
| Save: concurrent same-path writes | NONE | none | L12. |
| Rename/move: link rewrite race | NONE | none | L14. |

E2E (e2e/specs):
- file-operations.spec.ts:15-28: right-click Move to Trash on a CLEAN note, asserts the row disappears. No dirty case, no restore.
- rail-shell.spec.ts:166-190: rename on disk, favorite on disk, Move to Trash on disk (asserts the file leaves its folder).
- rail-shell.spec.ts:624-650: taken name toast ("already exists in this folder").
- rail-shell.spec.ts:223-245: "restore from the action bar" is the ARCHIVE restore, not the Trash restore. Not a Trash restore test.
- editor.spec.ts:10-24: typing marks dirty, Cmd+S clears. Covers the happy save only.
- collection-block.spec.ts:36-56: external edit of Projects/2026-Q2.md via `window.__e2e.fs.writeFile` plus a synthetic `vault-files-changed` event. The note is NOT open in a tab. Covers the index refresh only.
- bookmark-migration.spec.ts:95-: frontmatter rewrite failure keeps the bookmarks file (not notes).
- NOT covered by any e2e: save failure surfaced, dirty-tab delete, external edit to an OPEN tab, rename with link rewrite, Trash restore, vault switch with dirty tab, self-save window (L6).

---

## 6. Known and filed issues cross-reference

- architecture-stability issue 34 (.scratch/architecture-stability/issues/34-save-dirty-tabs-before-vault-switch.md): resolved. Its Comments section (2026-11-01 entry) already acknowledges that a failed save still lets the switch proceed and leaves the choice to the owner. Not acknowledged there: that teardown (app-lifecycle :622 resetEditor) then discards the buffer. This is L10 as a partial overlap, not a new bug.
- architecture-stability issue 21 (.scratch/architecture-stability/issues/21-app-lifetime-ports-for-core.md:35): documents the ordering hazard at init (observers unregistered before the save). Overlaps with L10 (the save at init is now a safety net).
- architecture-stability issue 49 (calendar outside delete races restore): calendar-only, related to restore ordering, not the general trash path (L9 overlap at most).
- Not in architecture-stability issues but in .scratch/ios-app/research/review-data-safety.md (the iOS remote review): B2 (lines 69-84) = L2 and the deep-link/type-definitions pattern in L3; M1 (lines 114-126) = L4; the deep-link audit header at TESTS/features/deep-link/deep-link.service.race-audit.test.ts:1-6 = L3.
- The `raw-write-ratchet.test.ts` (src/tests/lib/raw-write-ratchet.test.ts:17) EXEMPTS all of core/filesystem (OWNER_DIR). link-updater.service.ts:39 is a note write inside that directory, so the ratchet does not count it (L13/L14 context). Also the ratchet counts only writeTextFile, not remove/rename/copyFile, so rename/remove outside the owner are not ratcheted (bookmark-migration.service.ts:102 remove; deep-link none).

---

## 7. Not checked / risk the owner must know

- No test was run (per rules). Every coverage statement is from reading test source, not from a passing run. Test names and mocks were read, not their full bodies in every case.
- Not read: TESTS/features/tasks/tasks.service.test.ts (whether toggleTask with a dirty tab is covered), TESTS/features/deep-link/deep-link.logic.test.ts (resolveFilePath), TESTS/core/frontmatter/frontmatter-write.service.test.ts, TESTS/features/event-calendar/* (calendar delete/restore), TESTS/features/rail-shell/FilesNavigator.menu.test.ts, TESTS/core/filesystem/fs.service.test.ts:1204 (duplicate read error) detail.
- Not verified: whether file-history after-save observer snapshots the OLD content before an overwrite (L3 would then be recoverable). Not read: TESTS for file-history and FEATURES/file-history.service.ts.
- Not verified: Cmd+Q / app-menu quit reaches onCloseRequested (L25). Tauri docs fetched did not say.
- Not verified: Tauri plugin-fs ACL/capabilities (src-tauri/capabilities) restrictions on writeTextFile and rename scope. Not read.
- Not verified: DEBOUNCE_MS value in RS/vault/watcher.rs and the exact TS watcher debounce constant. Line refs given as ranges only.
- Not verified: whether the explorer hides `.tmp-*` files (L19).
- Not verified: Tauri IPC completion order for concurrent commands (L12, note-change IPC ordering).
- Biggest risk to the owner: L1 (dirty-tab delete from three entry points, no test, no e2e) and L2/L3 (silent overwrite of an open dirty buffer by Tasks view and deep-link/daily-note writers, the latter pinned by a test that asserts it).
