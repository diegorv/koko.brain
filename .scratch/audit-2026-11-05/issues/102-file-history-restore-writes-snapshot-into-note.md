# 102: File History Restore writes the snapshot into the note shown in the dialog, never into whichever tab is active

**Migrated from:** `.scratch/file-io-audit/issues/12-file-history-restore-wrong-tab.md` (audit 2026-11-05). Priority: corner case (bucket 4-corner). It overwrites an unrelated note, but only after a tab change while the modal is open.

**Audit check at `5f8003d67`:** still_present (content, low). src/lib/features/file-history/file-history.service.ts:82-105 restoreSnapshot only null-checks fileHistoryStore.filePath (:86-87), dispatches into the shared editorStore.editorView (:90-95) and calls saveCurrentFile (:99), which saves editorStore.activeTab (src/lib/core/editor/editor.service.ts:151-155). openFileHistory :17-51 never clears selectedSnapshot or diffLines. Keybindings are plain document keydown listeners with no modal guard (src/lib/utils/keybindings.ts registerKeybinding); editor:close-tab Cmd+W and next/previous tab stay live while the dialog is open (src/lib/app/global-keybindings.ts:80-98), and the native menu has no Cmd+W item (src-tauri/src/lib.rs accelerators only Cmd+, and Cmd+Q). Board views: src/lib/app/EditorView.svelte:80-84 mounts KanbanView/CanvasView instead of MarkdownEditor, whose destroy sets editorView null (src/lib/core/markdown-editor/MarkdownEditor.svelte:416); then writeTab returns true for the clean tab (editor.service.ts:189) and restoreSnapshot closes the dialog with nothing written. No fix in git log -- src/lib/features/file-history since 61ab7f42e (error handling only). The owner uses kanban and canvas daily, so the silent no-op on a board is the more reachable half; the wrong-tab overwrite needs a tab change while the dialog is open.

**Stale in the text below:** EditorView moved to src/lib/app/EditorView.svelte (board views at :80-84, MarkdownEditor at :92); MarkdownEditor onDestroy null is at :416 (Issue :148); saveFileByPath clean-tab no-op is now in writeTab at editor.service.ts:189 (Issue :163); restoreSnapshot spans :82-105 (Issue :86-99). Opener refs commands.ts:303-311 are now commands.ts:361-364; global-keybindings file-history:open is at :168-175.

**Status:** ready-for-agent

**Blocked by:** none
Priority: P1
Severity: corruption
Source: file I/O audit, deep-dive group(s) o05-settings-history (raw reports in .scratch/file-io-audit/deep/raw/), verified at c4bfee07

Reviewer note: needs the active tab to change while the dialog is open (e.g. Cmd+W). Less common, but the result overwrites an unrelated note.

## File History Restore writes the snapshot into the ACTIVE tab, and re-opening the dialog keeps the previous file's selected snapshot

- Verdict: CONFIRMED_BY_TEST (deep dive priority P1, severity corruption)
- Claims covered: recovery-3

**How a user hits it.** Needs the active tab to change while the modal is open. Cmd+W (a common macOS reflex to close a panel) or Cmd+Shift+[ / ] reach the document keydown listeners: there is no modal guard, and the native menu has no Cmd+W item. Then the user clicks Restore and confirms (the confirm text does not name the file). The claim's 'no race' variant is wrong: every entry point uses activeTabPath, and closing the dialog resets the store, so both variants need a tab change with the dialog open. Less common, but realistic.

**Recoverable from.** Cmd+Z in the editor during the session (the restore dispatch is a normal history transaction). The overwritten note's previous version is in its File History only if it was saved in-app within retention.

**Root cause.** src/lib/features/file-history/file-history.service.ts:86-99 (filePath is only null-checked; the dispatch goes to editorStore.editorView and saveCurrentFile saves activeTab); :17-24 openFileHistory never clears selectedSnapshot/diffLines

**Evidence.** restoreSnapshot :90-95 dispatches into the shared view, :99 saveCurrentFile -> editor.service.ts:151-155 saves activeTab. utils/keybindings.ts:30-53 is a document listener; global-keybindings.ts editor:close-tab / next-tab / file-history:open have no dialog guard. src-tauri/src/lib.rs build_menu has no close-window accelerator. FileHistoryDialog.svelte:98-102 renders Restore whenever selectedSnapshot is set. The only openers are commands.ts:303-311 and global-keybindings.ts:168-175, both using activeTabPath.

**Limits found while trying to refute.** The 'no race' variant is refuted as stated: it still needs a tab change while the dialog is open.

**Repro test.** `.scratch/file-io-audit/repro/o05-settings-history/file-history-restore-target.test.ts` fails on the bug assertion at c4bfee07. When fixing, move it under `src/tests/` as the red test.

```
Cmd+W then Restore -> AssertionError: expected 'A old version from last month\n' to be 'B: my important note\n' (disk content of b.md); re-open for B -> AssertionError: expected { id: 11, …(2) } to be null (fileHistoryStore.selectedSnapshot)
```

**Fix sketch.** Restore by fileHistoryStore.filePath: dispatch to the view only if that path is the active markdown tab; otherwise update the tab by path or write the file directly. Abort if the target tab or file is gone. Clear selectedSnapshot/diffLines in openFileHistory. Name the file in the confirm text.

## Restore on a kanban, canvas or collection board view closes the dialog as if it worked and writes nothing

- Verdict: CONFIRMED_BY_TEST (deep dive priority P2, severity minor)
- Claims covered: save-pipeline-11

**How a user hits it.** Any .kanban/.canvas/.collection tab in its default board view: Cmd+Shift+H, pick a snapshot, confirm Restore. Board files do get snapshots, because their saves go through saveFileByPath -> notifyAfterSave.

**Recoverable from.** Nothing is lost by the no-op itself. The snapshot stays in the DB until retention, and the restore works from source mode. The risk is that the user believes the recovery happened.

**Root cause.** src/lib/features/file-history/file-history.service.ts:90-100 (no view -> no dispatch; saveCurrentFile no-op; reset() closes the dialog with no error)

**Evidence.** EditorView.svelte:78-83 mounts KanbanView/CanvasView/CollectionView instead of MarkdownEditor; MarkdownEditor.svelte:148 onDestroy sets editorView to null; editor.service.ts:163 saveFileByPath returns true for a clean tab; restoreSnapshot then calls fileHistoryStore.reset().

**Repro test.** `.scratch/file-io-audit/repro/o05-settings-history/file-history-restore-target.test.ts` fails on the bug assertion at c4bfee07. When fixing, move it under `src/tests/` as the red test.

```
restoring a .kanban board in board view either writes the snapshot or rejects -> AssertionError: expected false to be true
```

**Fix sketch.** Part of the restore-by-path fix: when there is no markdown view, update the tab content by path (the board re-renders from it) and save. At minimum, throw or toast when nothing was applied.

## Acceptance criteria

Written by audit 2026-11-05 from the text above and its audit header; the original Issue had none.

- [ ] Failing test first, in a new src/tests/lib/features/file-history/file-history.restore-target.test.ts, moved from .scratch/file-io-audit/repro/o05-settings-history/file-history-restore-target.test.ts. Only Tauri APIs are mocked (plugin-fs as an in-memory disk); the editor service, editorStore, fileHistoryStore and a real CodeMirror EditorView are real, wired as the repro does. The dialog is open for '/vault/a.md' with a snapshot selected, tabs a.md and b.md are open, b.md is active, then restoreSnapshot runs. Disk a.md holds the snapshot text, and disk b.md and the b.md tab keep 'B: my important note'. It fails today (b.md on disk gets the snapshot). file-history.service.test.ts mocks editor.service.js (saveCurrentFile), so it cannot hold this test: there b.md 'gets no write' even with the bug.
- [ ] When the dialog's tab was closed while the dialog was open (Cmd+W) but the file still exists, Restore writes the snapshot to that file directly and no other note changes. When neither the tab nor the file exists, restoreSnapshot aborts, writes nothing, and shows an error toast.
- [ ] When the dialog's file is the active markdown tab, Restore still dispatches through the editor view as a normal history transaction, so editor undo still reverts it ('dispatches to CodeMirror and saves through editor' stays green). The existing case 'skips dispatch when no editor view is available' pins today's silent no-op (dialog closed as a success with nothing applied), so it is rewritten to the board-view behavior below, and the commit message says so.
- [ ] Board views: with no editorView (a .kanban, .canvas or .collection tab in its board view, where EditorView mounts KanbanView, CanvasView or CollectionView), restoreSnapshot updates the tab content by path and saves, so the tab content equals the snapshot and the file on disk is written. It never closes the dialog as a success when nothing was applied: it throws or toasts in that case.
- [ ] openFileHistory clears selectedSnapshot and diffLines: open for A with a snapshot selected, then openFileHistory for B leaves fileHistoryStore.selectedSnapshot null and diffLines empty (openFileHistory describe).
- [ ] The Restore confirm names the file being restored: in src/tests/lib/features/file-history/FileHistoryDialog.test.ts, the message passed to the plugin-dialog ask() mock (FileHistoryDialog.svelte:44-47) contains the file name of fileHistoryStore.filePath.
- [ ] Gate, frontend only: pnpm check + pnpm vitest run.

## Comments

- 2026-11-06: migrated from `.scratch/file-io-audit/issues/12-file-history-restore-wrong-tab.md` by audit 2026-11-05, which re-checked it at `5f8003d67`.
