# 05 Delete closes dirty tabs without saving, before the Trash move

Status: needs-triage
Priority: P1
Severity: data-loss
Source: file I/O audit, deep-dive group(s) h05-calendar-b, o04-delete-rename (raw reports in .scratch/file-io-audit/deep/raw/), verified at c4bfee07

Reviewer note: read path-change.service.ts applyPathChange: closeTabsForDeletedPath(from) runs before await diskOp(), and editor.service.ts closeTabsForDeletedPath has no dirty check.

## Move to Trash closes dirty tabs without saving; a failed Trash move also discards the unsaved edits

- Verdict: CONFIRMED_BY_TEST (deep dive priority P1, severity data-loss)
- Claims covered: cross-cutting-2, recovery-4, rename-move-delete-1, save-pipeline-5

**How a user hits it.** Default settings, from the action-bar, note-row or folder Move to Trash. (a) Confirming within about 2 s of the last keystroke loses only those seconds of typing, in a note the user meant to delete. (b) A tab whose autosave keeps failing (read-only or locked file; the rename into .kokobrain/trash still works) loses every edit since the last good save. (c) If moveToTrash throws, the note stays in the vault with old bytes and the open edits are gone. A folder delete does the same to every dirty child tab.

**Recoverable from.** Trash and File History hold only the last saved bytes. The unsaved text has no snapshot, the tab and its undo history are gone, so it is lost.

**Root cause.** src/lib/core/filesystem/path-change.service.ts:125 (closeTabsForDeletedPath before await diskOp at :127, no try/finally) together with src/lib/core/editor/editor.service.ts:356-366 (no dirty check or save)

**Evidence.** fs.service.ts:167-190 deleteItem -> applyPathChange(to:null). path-change.service.ts:125 closes tabs synchronously, then :127 awaits moveToTrash. editor.service.ts:356-366 removes tabs with no isTabDirty check (closeTab at :262-278 does prompt). The debounced saveDirtyTabs (:183-197) iterates editorStore.tabs and finds nothing. trash.service.ts:71 renames the last disk bytes, and :87-96 rethrows after the tabs are gone. Callers note-action-bar.service.ts:19-28, NoteRowMenu.svelte:122-130 and FilesNavigator.svelte:168-175 do not save first. Only event-calendar.service.ts:1035-1037 does, and its comment documents this gap. File History snapshots only on after-save (file-history.service.ts:190-198).

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
