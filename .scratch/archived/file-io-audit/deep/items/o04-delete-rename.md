# Deep-dive group o04-delete-rename

These are CLAIMS from a first-pass audit. Several ids may describe the same bug from different angles; treat each distinct bug once and list which ids it covers.

## cross-cutting-2: Move to Trash closes dirty tabs before the disk op with no save; a failed trash move also drops the buffer
- claimed severity: data-loss
- anchor: src/lib/core/filesystem/path-change.service.ts:125
- scenario: Type in note N and choose Move to Trash (action bar, note row menu, or folder delete in Files), confirming within the 2 s debounce, or with a tab whose saves are failing. The tab is closed with no dirty check and the Trash holds the last saved bytes. If moveToTrash throws, the tab is gone and the file stays on disk without the edits.
- evidence given: READ: closeTabsForDeletedPath runs before await diskOp() at path-change.service.ts:125-127. editor.service.ts:356-366 has no dirty check. saveDirtyTabs walks editorStore.tabs (editor.service.ts:183-186). Callers note-action-bar.service.ts:24, NoteRowMenu.svelte:128 and FilesNavigator.svelte:174 do not save first. event-calendar.service.ts:1035-1037 documents the bug and saves first. Tests editor.service.test.ts:874-940 use only clean tabs. Same as RMD-1, SP-5 and recovery F4.

## recovery-4: Generic delete closes dirty tabs without saving before the disk op and never restores them on failure
- claimed severity: data-loss
- anchor: src/lib/core/filesystem/path-change.service.ts:125
- scenario: Autosave for note N keeps failing (tab dirty, retried every 5 s), or the user is still inside the 2 s debounce. The user moves N, or its folder, to Trash from the file navigator, note list or action bar. The tab is dropped and the trash holds only the last disk bytes, so the unsaved text is gone. If the trash rename then fails (permission, EXDEV, scope), the user gets an error toast and the dirty tab is still gone.
- evidence given: path-change.service.ts:125 closes tabs, then :127 awaits diskOp with no try/finally; editor.service.ts:356-366 has no dirty check; saveDirtyTabs only covers open tabs (:184-186); callers that do not save first: FilesNavigator.svelte:174, NoteRowMenu.svelte:128, note-action-bar.service.ts:24; contrast event-calendar.service.ts:1035-1037, which saves first

## rename-move-delete-1: Deleting a note or folder drops unsaved edits, and a failed Trash move drops them while the note is still there
- claimed severity: data-loss
- anchor: src/lib/core/filesystem/path-change.service.ts:125
- scenario: Type a sentence in note N, open the action-bar menu right away, choose Move to Trash and press Enter within about 2 s. The tab closes and the pending autosave finds no tab, so restoring N from the Trash gives it back without the sentence. If moveToTrash throws instead (permissions, a .kokobrain folder on another volume), N stays in the vault with its old content and the sentence is gone. A folder delete loses every child tab that is still dirty at that moment.
- evidence given: READ: path-change.service.ts:125-127 closes tabs before await diskOp(). editor.service.ts:356-366 closeTabsForDeletedPath has no isTabDirty check, no save and no prompt. editor.service.ts:183-197: the debounced saveDirtyTabs then finds no tab. debounce.ts:9-17 has no maxWait. trash.service.ts:71 keeps only the disk bytes, and on a throw (87-96) the tabs are already closed. Callers that do not save first: NoteRowMenu.svelte:122-130, note-action-bar.service.ts:19-28, FilesNavigator.svelte:168-175. Only event-calendar.service.ts:1035-1037 saves first, and its comment names this gap. INFER: the async ask() dialog lets the 2 s timer fire while it is open, so the loss is limited to edits from the last ~2 s before confirming.

## save-pipeline-5: Delete closes dirty tabs (and dirty child tabs of a folder) without saving, before the Trash move, which may then fail
- claimed severity: data-loss
- anchor: src/lib/core/filesystem/path-change.service.ts:125
- scenario: Edit N and move it to the Trash within 2 s: the Trash keeps the pre-edit bytes, so a restore brings back an older note. If the rename into the Trash throws, the tab is already closed and the edits are gone. A folder delete silently drops a dirty child tab whose save had been failing.
- evidence given: READ: path-change.service.ts:125-127 calls closeTabsForDeletedPath(from) before await diskOp(). editor.service.ts:356-366 removes tabs with no dirty check and no save. Then fs.service.ts:167-189 deleteItem -> trash.service.ts:71 rename, whose error is rethrown after the tab is gone.

## rename-move-delete-8: An autosave that fires during the rename IPC writes the old path (create:true) and creates a duplicate note
- claimed severity: minor
- anchor: src/lib/core/filesystem/path-change.service.ts:127
- scenario: Type in note N, then rename it, or let auto-move move it, at the moment the 2 s timer fires. The save writes N's buffer to the old path after the rename, so a duplicate note appears at the old name and is indexed. The auto-move retry of that duplicate then fails with 'already exists'. For a folder rename, the save fails with ENOENT and shows a 'Failed to save file.' toast, then retries after 5 s. Nothing is lost.
- evidence given: READ: path-change.service.ts:127-132: tab paths are updated only after await diskOp(). editor.service.ts:183-190 reads tab.path when the timer fires, :168 writes with the plugin-fs default create:true (fetched commands.rs), and :170 calls notifyAfterSave(oldPath). Auto-move moves the note just saved (auto-move.service.ts:114-121, 188). The comment at path-change.service.ts:100-101 does not cover a timer that fires during the rename.

## save-pipeline-12: An autosave firing during an in-app rename or move (including auto-move) can recreate the old path
- claimed severity: stale-state
- anchor: src/lib/core/filesystem/path-change.service.ts:127
- scenario: Auto-move runs moveItem 3 s after a save while the user is still typing. If the 2 s body autosave fires during the rename IPC, writeTextFile(oldPath, create:true) recreates old.md with the newest text, new.md keeps older text, and the tab stays dirty with no timer armed.
- evidence given: READ: the tab path changes only after await diskOp (path-change.service.ts:127,132); saveFileByPath writes the captured path (editor.service.ts:162-168); markSavedByPath(oldPath) misses the moved tab (editor.store.svelte.ts:91-96); auto-move trigger at auto-move.service.ts:113-121,188.

## rename-move-delete-2: Duplicate silently overwrites a sibling whose name differs only in case (APFS)
- claimed severity: data-loss
- anchor: src/lib/core/filesystem/fs.logic.ts:185
- scenario: The vault holds note.md and 'Note copy.md'. Duplicate note.md: the candidate 'note copy.md' is not in the exact-case sibling Set, so copyFile opens the existing 'Note copy.md' on case-insensitive APFS and overwrites it with the contents of note.md. No Trash entry, no warning.
- evidence given: READ: fs.logic.ts:185 and :203-209 compare sibling names with exact case. generateUniqueName (fs.logic.ts:225-226) lowercases on purpose for APFS. fs.service.ts:266-279 calls copyFile with no exists check. Fetched plugin-fs commands.rs: copy_file is std::fs::copy, which overwrites. Folders are safe because mkdir is non-recursive (fs.service.ts:252).

## rename-move-delete-7: A case-only rename is refused as 'already exists'
- claimed severity: minor
- anchor: src/lib/core/filesystem/fs.service.ts:205
- scenario: Rename 'meeting notes.md' to 'Meeting Notes.md' (or a folder the same way) on macOS. The toast says the name already exists, and the casing cannot be fixed in the app.
- evidence given: READ: fs.service.ts:204 compares with exact case, then :205 exists(newPath) runs. Neither buildRenameFileName (type-note-list.logic.ts:14-22) nor FilesNavigator.svelte:140-153 handles this case. INFER: exists is true on case-insensitive APFS.
