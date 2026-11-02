# o04 delete / rename / duplicate: deep-dive raw report

Worktree: `/Users/diegorv/Dev/pet-projects/koko/brain/.claude/worktrees/file-io-repro` (identical to main).
Repro tests: `src/tests/repro/o04-delete-rename/` (shared in-memory plugin-fs: `fake-fs.ts`). Only `@tauri-apps/*` is mocked; editor, path-change, fs and trash services and all stores are real.

Upstream fetched: `https://raw.githubusercontent.com/tauri-apps/plugins-workspace/fs-v2.7.1/plugins/fs/src/commands.rs` (Cargo.lock pins tauri-plugin-fs 2.7.1):
- `copy_file` -> `std::fs::copy(&resolved_from_path, &resolved_to_path)` (std docs: "This function will overwrite the contents of `to`").
- `rename` is a sync `pub fn` -> `std::fs::rename`.
- `exists` -> `Ok(resolved_path.exists())`.
- `write_text_file` -> `write_file_inner`; `create` defaults to `true` (`default_create_value`), and with no options header `create: true, truncate: true`.

Not fetched, from memory: Tauri 2 runs non-async commands on the main thread; macOS APFS default volumes are case-insensitive, so `Path::exists` and `open` match a different-case name.

---

## Bug A: Move to Trash drops a dirty tab without saving; a failed Trash move loses the edits too

ids: cross-cutting-2, recovery-4, rename-move-delete-1, save-pipeline-5 (all four describe the same defect)

Verdict: CONFIRMED_BY_TEST. Severity data-loss. Priority P1.

Trace (my own read):
- `fs.service.ts:167-190` `deleteItem` -> `applyPathChange({ to: null, diskOp: moveToTrash })`.
- `path-change.service.ts:125` `if (to === null) closeTabsForDeletedPath(from);` runs synchronously before `:127 await diskOp();`, with no try/finally.
- `editor.service.ts:356-366` `closeTabsForDeletedPath` removes every tab at or under the path. It has no `isTabDirty`, no save and no prompt. Compare `closeTab` at `:262-278`, which asks before discarding.
- The pending 2 s debounce (`editor.service.ts:197`, `utils/debounce.ts`, no maxWait) later runs `saveDirtyTabs` (`:183-187`), which iterates `editorStore.tabs`. The tab is gone, so nothing is written.
- `trash.service.ts:71` `rename(absolutePath, trashPath)` moves the last saved bytes. If it throws (`:87-96`), the error is rethrown and the tab is already closed.
- Callers that do not save first: `note-action-bar.service.ts:19-28` (`deleteNoteWithConfirm`), `NoteRowMenu.svelte:122-130`, `FilesNavigator.svelte:168-175` (folder, `isDirectory: true`). The only caller that saves first is `event-calendar.service.ts:1035-1037`, and its comment names this gap.
- File History (`file-history.service.ts:190-198`) snapshots only on after-save, so unsaved text has no snapshot.
- Existing tests: `editor.service.test.ts` `closeTabsForDeletedPath` cases use clean tabs only. `fs.service.race-audit.test.ts` asserts the close-before-disk ordering (the reason for the ordering) but never a dirty tab.

Guards looked for and not found: no dirty check in the close, no flush of `debouncedSave` before delete, no re-open on a failed `diskOp`.

Reachability:
- (a) Type, then open the action-bar or row menu, choose Move to Trash and confirm within about 2 s of the last keystroke. The Trash keeps the pre-edit bytes, so a restore brings back an older note. The loss is limited to the last ~2 s of typing in a note the user chose to delete. INFER, not checked: if the `ask()` dialog stays open past 2 s, the debounce probably fires and saves while it is open.
- (b) A tab whose autosave keeps failing (for example a read-only or locked file: the write fails, but the rename into `.kokobrain/trash` only needs write access to the directory). Every edit since the last good save is dropped, and the user had already seen "Failed to save file." toasts.
- (c) `moveToTrash` throws (permission, scope, a symlinked `.kokobrain`). The note stays in the vault with old bytes and the open edits are gone for good.
- A folder delete does the same to every dirty child tab.

Recoverable: Trash or File History give back only the last saved bytes. The unsaved text has no copy (no undo once the tab is gone, no snapshot). Only an external backup, and that would hold the same older bytes.

Test: `delete-dirty-tab.test.ts` (3 tests, all fail on the bug assertion):
```
AssertionError: expected '# Note\n\nsaved text\n' to be '# Note\n\nsaved text\nunsaved sentenc…'   (Trash copy, single note)
AssertionError: expected '# Note\n\nsaved text\n' to be '# Note\n\nsaved text\nunsaved sentenc…'   (Trash copy, folder child)
AssertionError: expected { tabOpen: false, …(2) } to deeply equal ObjectContaining {"editsSurvive": true}
  + "diskContent": "# Note\n\nsaved text\n", "editsSurvive": false, "tabOpen": false   (failed Trash move)
```

Fix sketch: in `applyPathChange`, when `to === null`, `await saveFileByPath` every dirty non-virtual tab at or under `from` before `closeTabsForDeletedPath`. If a save fails, abort the delete and throw, so the caller shows a toast and the tab stays. With the bytes on disk first, a later `diskOp` failure loses nothing. This keeps the close-before-disk ordering that stops resurrection.

---

## Bug B: An autosave that fires while the rename IPC response is in flight recreates the old path

ids: rename-move-delete-8, save-pipeline-12

Verdict: CONFIRMED_BY_TEST. Severity stale-state. Priority P3.

Trace:
- `fs.service.ts:201-212` `renameItem` (and `moveItem` `:228-240`, which auto-move uses at `auto-move.service.ts:188`) -> `applyPathChange`.
- Tab paths are rewritten only at `path-change.service.ts:132` (`updateTabAfterRenameOrMove`), after `await diskOp()` at `:127`.
- If the 2 s timer fires in that gap, `saveFileByPath(oldPath)` (`editor.service.ts:161-170`) writes the old path. plugin-fs `write_text_file` defaults to `create: true` (fetched), so `old.md` is recreated with the newest text while `new.md` holds the older bytes.
- If the write resolves before the tab path changes, `markSavedByPath(oldPath)` marks the tab clean. The editor then shows v2 at `new.md` while the disk holds v1, and nothing re-arms a save.
- If it resolves after, the tab stays dirty with no timer (save-pipeline-12's variant), and the next keystroke repairs `new.md`.
- For a folder rename, the write fails (the parent is gone), toasts, and the 5 s retry uses the updated path.
- The comment at `path-change.service.ts:100-101` covers only the time after `diskOp`.

Reachability: the window is the rename IPC round trip. `rename` is a sync command (main thread), so it is a few ms. The timer must land inside it: either a manual rename or move exactly 2 s after the last keystroke, or auto-move (`autoMove.enabled`, rules required) racing a later autosave. Rare, millisecond timing.

Recoverable: yes. The newest text is in the recreated `old.md` (a visible duplicate note), or still in the dirty tab. Nothing is lost outright, but a clean tab over stale `new.md` bytes can mislead.

Test: `autosave-during-rename.test.ts`. The fake fs applies the rename on call and holds only the response.
```
AssertionError: expected [ '/vault/new.md', '/vault/old.md' ] to deeply equal [ '/vault/new.md' ]
AssertionError: expected { new: 'v1', old: 'v2' } to deeply equal { new: 'v2', old: undefined }
```

Fix sketch: cancel the debounced timers (or `await` the save of the dirty tabs under `from`) before `diskOp` in `applyPathChange` for renames as well, then re-arm after `updateTabAfterRenameOrMove`. Alternatively, make `saveFileByPath` resolve the tab by identity and write `tab.path` read after any in-flight path change.

---

## Bug C: Duplicate overwrites a sibling whose name differs only in case (case-insensitive APFS)

ids: rename-move-delete-2

Verdict: CONFIRMED_BY_TEST (with a case-insensitive fs model, backed by the fetched `copy_file` = `std::fs::copy`). Severity data-loss. Priority P1.

Trace:
- `fs.service.ts:266-279` `duplicateItem` reads the sibling names, calls `generateCopyName` (`fs.logic.ts:179-209`), whose `Set` has exact case (`:185`, `:203`, `:206`), then `copyFile(itemPath, newPath)` with no exists check.
- `generateUniqueName` (`fs.logic.ts:216-226`) lowercases on purpose for APFS. `generateCopyName` does not.
- On APFS `std::fs::copy` opens the existing `Note copy.md` for "note copy.md", truncates it and writes the source bytes. The entry keeps its casing.
- Folders are safe: `copyDirectoryRecursive` calls `mkdir(destPath)` without `recursive` (`fs.service.ts:252`), so it fails with EEXIST.
- Entry point: NoteRowMenu Duplicate (`NoteRowMenu.svelte:67-69`).

Reachability: needs `x.md` plus `X copy.md`, where "X copy" differs only in case. Example: duplicate `Note.md`, later delete it and create `note.md`, or files made outside the app or synced. A case-only rename in the app is refused (Bug D), which narrows the in-app paths. Uncommon but realistic, and the overwrite is silent.

Recoverable: File History only if `X copy.md` was ever saved in the editor (snapshots come from after-save only; a copy made by `copyFile` has none). Otherwise only an external backup. No Trash entry.

Test: `case-insensitive-names.test.ts` "Duplicate does not overwrite…":
```
AssertionError: expected 'source note body' to be 'a different note the user wrote'
```

Fix sketch: compare lowercased names in `generateCopyName`, like `generateUniqueName`. Optionally also check `exists(newPath)` before `copyFile`.

---

## Bug D: A case-only rename is refused as "already exists"

ids: rename-move-delete-7

Verdict: CONFIRMED_BY_TEST (case-insensitive fs model plus the fetched `exists` = `Path::exists`). Severity minor. Priority P3.

Trace:
- `fs.service.ts:204` `oldPath === newPath` is exact-case, so a case change passes it.
- `:205` `exists(newPath)` is true on APFS -> `targetExistsError`.
- Entry points: `FilesNavigator.svelte:140-153`, `NoteRowMenu.svelte:99-102` (`buildRenameFileName`, `type-note-list.logic.ts:14-23`), `type-definitions.service.ts:209`. None of them special-cases this.

Reachability: common action (fix capitalization) on default macOS. No data loss. A workaround exists: rename twice through a temporary name.

Test: `case-insensitive-names.test.ts` "a case-only rename succeeds":
```
AssertionError: promise rejected "Error: "Meeting Notes.md" already exists …" instead of resolving
```

Fix sketch: when `oldPath.toLowerCase() === newPath.toLowerCase()`, skip the exists check. `std::fs::rename` on APFS handles a case-only rename.

---

## Not checked
- Real macOS behavior of `ask()` while its dialog is open: whether WKWebView timers and IPC keep running, which sets the exact loss window for Bug A(a).
- I did not run real APFS I/O. Bugs C and D rest on the fs model plus the fetched upstream source and documented std behavior.
