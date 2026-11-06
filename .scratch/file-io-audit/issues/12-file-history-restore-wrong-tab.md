# 12: File History Restore writes the snapshot into the active tab, not the note in the dialog

**Status:** wontfix

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

## Comments

- 2026-11-06: migrated to `.scratch/audit-2026-11-05/issues/102-file-history-restore-writes-snapshot-into-note.md` by audit 2026-11-05 (its re-checked text and any related audit findings now live there, in one plan ordered by impact on written content and daily use). Closed here as wontfix so it is worked in one place; nothing was implemented.
