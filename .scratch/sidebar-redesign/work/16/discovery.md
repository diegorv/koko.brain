# Issue 16 discovery: Drag to move and folder notes in the rail shell

No `spec.md`; the source is `PRD.md` (Note list rows, Navigators: Files, Q15). Builds on `work/15`
(FilesNavigator menu, `runOrToast`, the `files-navigator` path-change consumer). Copies the classic
tree's drag (`core/file-explorer/FileTreeItem.svelte:170-226`, root drop `FileExplorer.svelte:244-271`)
and folder-note click (`FileTreeItem.svelte:83-99`).

## Files that change
- `features/rail-shell/FilesNavigator.svelte`: folder rows `draggable` (not while renaming), set
  `text/plain` = path; folder rows and the vault-root row accept drops (`validateDragDrop`, then
  `runOrToast('move', name, () => moveItem(src, dir))`), drag-over look `bg-file-explorer-accent/50
  outline-dashed outline-1 outline-ring` (the classic tree's tokens). A folder dropped on a collapsed
  folder expands it (`onToggle`) so the moved row shows. Picking a folder row opens its folder note
  (`findFolderNote(node.name, node.children)`) when `settingsStore.folderNotes.enabled`.
- `features/note-list/NoteRow.svelte`: optional `draggable` prop (default false, so the classic Types
  note list is unchanged); when on, dragstart sets `text/plain` = note path.
- `features/rail-shell/RailNoteList.svelte`: passes `draggable` to its rows.
- No new store, getter or logic: the pick follows a move through the Issue 15 path-change consumer
  (`files-navigator.service.ts`, `followFolderPathChange` handles any `from -> to`); a taken name
  throws `targetExistsError` in `moveItem` (`fs.service.ts:230-251`) and `runOrToast` toasts it.

## Tests (test-first)
1. `FilesNavigator.menu.test.ts` (real fs.service + path-change owner, Tauri mocked): drop a file on a
   folder (rename called, tree refreshed, row shows), drop a folder on a folder (moved, target
   expanded), drop the picked folder (pick follows, `aria-current` on the new row), drop onto a taken
   name (toast, no rename, pick kept), invalid drops (self, own child, same parent, empty payload) do
   nothing, root-row drop, drag-over class, dragstart payload, no drag while renaming. Folder notes:
   on + note -> opens it and picks; on + no note -> picks only; off -> picks only; root row never.
2. `RailNoteList.test.ts`: rows are draggable and carry their path; classic `TypeNoteList` rows are not
   (existing NoteRow consumers keep `draggable` off).
3. E2E `rail-shell.spec.ts`: drag the Roadmap row from the Projects list onto the Daily folder, pick
   Daily, the row shows there and the file moved on disk.

## Defaults taken
- The vault-root row is a drop target too (the classic tree accepts root drops).
- No 600 ms hover auto-expand on the navigator (not asked; drop on the visible row is enough).
- The root row has no folder note (as the classic tree's root).

## Risks
- WebKit and draggable `<button>`: the classic rows are `div`s. Chromium E2E covers the flow; the
  note row is a button already used for click/context menu. If WebKit refuses, wrap is the fallback.
