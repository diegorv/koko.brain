# 05: Delete saves dirty tabs first and closes them only after the Trash move succeeds

**Status:** resolved

Priority: P1 (data loss; the Trash keeps an older version)

**What to build:** `applyPathChange` (src/lib/core/filesystem/path-change.service.ts:117-127) calls `closeTabsForDeletedPath(from)` BEFORE `await diskOp()`. `closeTabsForDeletedPath` (editor.service.ts:360-370) removes every tab under the path with no dirty check and no save. Two effects follow. Edits typed inside the 2 s autosave window are not in the Trash copy, so a restore brings back older text. And when the Trash move throws, the tab is already gone and so are the edits. A folder delete drops every dirty child tab the same way. The explorer, note-row and note-action-bar deletes all reach this path.

Fix: one design. It keeps the close-before-`diskOp` order that path-change.service.ts:95-99 documents (the 2 s autosave must not recreate the file during the async gap) and that `fs.service.race-audit.test.ts:88-107` pins. For a delete (`to === null`), `applyPathChange` does three steps in this order:

1. Save first. `await saveFileByPath` (editor.service.ts:161) for every non-virtual dirty tab whose path equals `from` or starts with `from + '/'` (the file, or every child for a folder). If any save returns `false`, throw before closing anything: no tab is closed, the file is not moved, the tab stays dirty, and the error propagates through `deleteItem` so the caller's toast shows it.
2. Close before the disk op, as today, but keep the removed tab objects: `closeTabsForDeletedPath` (editor.service.ts:360-370) returns the tabs it removed. No other await runs between the saves and the close.
3. Run `diskOp`. If it throws, re-add the kept tabs with `editorStore.addTab` (editor.store.svelte.ts:52, which keeps the pinned flag) and rethrow. This is safe because `moveToTrash` throws only before its rename lands (trash.service.ts:71-72 and :95; a manifest write failure after the rename is logged, not thrown), so the note is still at `from` holding the bytes step 1 wrote, and a later autosave of a re-added tab writes to a file that exists. Not restored: tab order, focus, the scroll/cursor view state, and the side effects of the close. `closeTabsForDeletedPath` also runs `notifyTabClosed` (whose queryjs listener clears the first-open marker, queryjs-ports.ts:16) and `deleteTabViewState`, so queryjs blocks in a re-added note auto-run again; and `addTab` makes each re-added tab active. Show one toast for a failed pre-delete save: `saveFileByPath` already shows "Failed to save file." (editor.service.ts:176), so the propagated error must not add a second one.

Leave renames and moves as they are. Do not reorder the close and `diskOp`, and do not change the race-audit test's assertions. That test mocks `#lib/core/editor/editor.service.js` with only `closeTabsForDeletedPath` (fs.service.race-audit.test.ts:43-45); if the delete path calls another `editor.service` export, add it to that mock factory.

**Blocked by:** none

**Gate:** `pnpm check` + `pnpm vitest run` + `pnpm build`

**Source:** src/lib/core/filesystem/path-change.service.ts:117-127, src/lib/core/editor/editor.service.ts:360-370, src/lib/core/filesystem/fs.service.ts (deleteItem), src/lib/core/trash/trash.service.ts:47-90

- [x] Failing test comes first. Move `.scratch/file-io-audit/repro/o04-delete-rename/delete-dirty-tab.test.ts` under `src/tests/`
- [x] Deleting a note with unsaved typing puts the typed text in the Trash copy
- [x] A folder delete does the same for a dirty child tab
- [x] A failed Trash move keeps the tab open with its edits
- [x] A failed pre-delete save aborts the delete: the file stays in place and the tab stays dirty
- [x] The calendar delete path (event-calendar.service.ts, which already saves before deleting) still passes its tests
- [x] `closeTabsForDeletedPath` still runs before `diskOp`: the race-audit test 'closes tabs before moving file to trash to prevent auto-save resurrection' (src/tests/lib/core/filesystem/fs.service.race-audit.test.ts:88-107) passes with its ordering assertion unchanged
- [x] A failed Trash move of a folder re-adds every closed child tab, and each note still under `from` holds its latest buffer on disk (the pre-delete save wrote it)
- [x] Move `.scratch/editor-data-safety/repro/undo-and-delete/f165-delete-dirty-tab.test.ts` under `src/tests/` next to the o04 repro. Its line 87 (`expect(disk.get(NOTE)).toBe(SAVED)`) records the pre-fix disk state and becomes `toBe(UNSAVED)`, since the save now runs before the failed Trash move; its other assertions stay as they are

## Audit evidence

Source: file I/O audit, deep-dive group(s) h05-calendar-b, o04-delete-rename (raw reports in .scratch/file-io-audit/deep/raw/), verified at c4bfee07

Reviewer note: read path-change.service.ts applyPathChange: closeTabsForDeletedPath(from) runs before await diskOp(), and editor.service.ts closeTabsForDeletedPath has no dirty check.

## Move to Trash closes dirty tabs without saving; a failed Trash move also discards the unsaved edits

- Verdict: CONFIRMED_BY_TEST (deep dive priority P1, severity data-loss)
- Claims covered: cross-cutting-2, recovery-4, rename-move-delete-1, save-pipeline-5

**How a user hits it.** Default settings, from the action-bar, note-row or folder Move to Trash. (a) Confirming within about 2 s of the last keystroke loses only those seconds of typing, in a note the user meant to delete. (b) A tab whose autosave keeps failing (read-only or locked file; the rename into .kokobrain/trash still works) loses every edit since the last good save. (c) If moveToTrash throws, the note stays in the vault with old bytes and the open edits are gone. A folder delete does the same to every dirty child tab.

**Recoverable from.** Trash and File History hold only the last saved bytes. The unsaved text has no snapshot, the tab and its undo history are gone, so it is lost.

**Root cause.** src/lib/core/filesystem/path-change.service.ts:125 (closeTabsForDeletedPath before await diskOp at :127, no try/finally) together with src/lib/core/editor/editor.service.ts:360-370 (no dirty check or save)

**Evidence.** fs.service.ts:167-190 deleteItem -> applyPathChange(to:null). path-change.service.ts:125 closes tabs synchronously, then :127 awaits moveToTrash. editor.service.ts:360-370 removes tabs with no isTabDirty check (closeTab at :262-278 does prompt). The debounced saveDirtyTabs (:183-197) iterates editorStore.tabs and finds nothing. trash.service.ts:71 renames the last disk bytes, and :87-96 rethrows after the tabs are gone. Callers note-action-bar.service.ts:19-28, NoteRowMenu.svelte:122-130 and FilesNavigator.svelte:168-175 do not save first. Only event-calendar.service.ts:1035-1037 does, and its comment documents this gap. File History snapshots only on after-save (file-history.service.ts:190-198).

**Repro test.** `.scratch/file-io-audit/repro/o04-delete-rename/delete-dirty-tab.test.ts` fails on the bug assertion at c4bfee07. When fixing, move it under `src/tests/` as the red test.

```
3 failed. AssertionError: expected '# Note\n\nsaved text\n' to be '# Note\n\nsaved text\nunsaved sentenc…' (Trash copy, note and folder child). AssertionError: expected { tabOpen: false, …(2) } to deeply equal ObjectContaining {"editsSurvive": true}, received diskContent '# Note\n\nsaved text\n', editsSurvive false, tabOpen false (failed Trash move).
```

**Fix sketch.** In applyPathChange, when to===null, await saveFileByPath for each dirty non-virtual tab at or under `from` before closeTabsForDeletedPath. If any save fails, abort and throw so the tab stays open. This keeps the close-before-disk ordering.

## Adjacent (not a claim): explorer, note-row and note-action-bar deletes close dirty tabs without saving first; duplicate of existing o04 repro

- Verdict: CONFIRMED_BY_TEST (deep dive priority P1, severity data-loss)
- Claims covered: 

**How a user hits it.** Normal mouse flow: type, then right-click or use the action bar, Move to Trash, confirm, all within the 2 s body autosave window. debounce.ts has no maxWait, so during continuous typing (gaps under 2 s) autosave never fires and the loss can cover the whole burst since the last save. Frontmatter edits: 500 ms. No keyboard trash shortcut in commands.ts or global-keybindings.ts.

**Recoverable from.** No for the unsaved tail. The Trash keeps the last saved bytes (moveToTrash renames the file as is).

**Root cause.** deleteItem (src/lib/core/filesystem/fs.service.ts:167-190) callers NoteRowMenu.svelte:128, FilesNavigator.svelte:174 (folder), note-action-bar.service.ts:24; applyPathChange closes tabs before diskOp (path-change.service.ts:125). Only event-calendar.service.ts:1037 saves first.

**Evidence.** Traced all callers (grep deleteItem( in src/lib). debounce.ts signature is (fn, delay) with no maxWait. editor.service.ts:197 and :200 are the only autosave timers. Existing repro src/tests/repro/o04-delete-rename/delete-dirty-tab.test.ts (first test) asserts the same expectation; I did not add a second test.

**Repro test.** `.scratch/file-io-audit/repro/src/tests/repro/o04-delete-rename/delete-dirty-tab.test.ts` fails on the bug assertion at c4bfee07. When fixing, move it under `src/tests/` as the red test.

```
Not re-run in this session (duplicate of o04; I ran only my own repro files). My calendar-delete repro shows the same mechanism for the calendar path.
```

**Fix sketch.** Move the save-before-delete from deleteNow into applyPathChange (or deleteItem) for to === null: await saveFileByPath for each dirty tab under `from` before closeTabsForDeletedPath.

## Audit evidence (editor-data-safety, 2026-11-02)

Finding F165 (P0, rare): deleting a note or folder throws away its unsaved editor buffer; a failed Trash move throws it away too. Report: `.scratch/editor-data-safety/audit-2026-11-02.md`; cross-reference: `.scratch/editor-data-safety/xref-file-io-audit.md` (F165). It covers the same four scenarios as this issue (2 s window, a save that keeps failing, a failed Trash move, a folder delete) and found the ordering contradiction the single fix above resolves: the earlier "close the tabs only after `diskOp` resolves" would have broken the race-audit pin, while the save-first fix sketches above keep it.

**Repro test.** `.scratch/editor-data-safety/repro/undo-and-delete/f165-delete-dirty-tab.test.ts` (copy to `src/tests/audit-repro/undo-and-delete/` to run, see the repro README). 'a FAILED Trash move must not throw away the unsaved edit' fails on `unsavedEditSurvives()` (line 89); 'a successful Trash move must put the latest buffer in the Trash' fails on line 101 (the Trash copy holds the old bytes). Only `@tauri-apps/*` and `svelte-sonner` are mocked, over an in-memory disk; the editor, fs and vault stores are real.

**Code path verified on the current tree.**
- src/lib/core/filesystem/path-change.service.ts:125 `if (to === null) closeTabsForDeletedPath(from);` runs before `await diskOp()` at :127 with no try/finally; :95-99 documents why the close must precede the disk op.
- src/lib/core/editor/editor.service.ts:360-370 `closeTabsForDeletedPath` removes every tab at or under the path with no dirty check and returns nothing. `saveFileByPath` (:161-180) returns `false` on a failed write; `closeTab` (:266-293) is the only close that asks.
- src/lib/core/filesystem/fs.service.ts:167-190 `deleteItem` routes the delete through `applyPathChange` with `moveToTrash` as `diskOp` and rethrows.
- src/lib/core/trash/trash.service.ts:49-97 `moveToTrash`: the rename is at :71-72, the manifest write failure after it is caught at :79-82, and after the rename only `trashStore.addItem` and `debug` (:83-86) run outside that catch, so the rethrow at :95 fires only when the rename did not land and the item is still at its original path.
- src/lib/core/editor/editor.store.svelte.ts:52-62 `addTab` re-inserts a pinned tab at the pinned boundary.
- src/tests/lib/core/filesystem/fs.service.race-audit.test.ts:88-107 pins `closeTabsForDeletedPath` before `moveToTrash`; :43-45 mocks `editor.service` with only that export.
- src/lib/features/event-calendar/event-calendar.service.ts:1035-1037 already calls `saveFileByPath` and throws on `false` before `deleteItem`; the fix moves the same guard into `applyPathChange` for every caller.

## Comments

- 2026-11-02, branch `issue/05-delete-closes-dirty-tabs-unsaved`: `applyPathChange` saves dirty tabs under the deleted path before the Trash move and re-adds the closed tabs when the move fails; a failed pre-delete save aborts the delete. Repro tests moved under `src/tests/`. Review round 1 APPROVED (1 minor deferred to Issue 54, 1 nit fixed: calendar `deleteNow` comment); round 2 APPROVED with no findings. `pnpm check` exit 0; full suite `pnpm vitest run && pnpm build` exit 0 (424 files, 9886 passed, 1 skipped, 1 todo, build OK).
