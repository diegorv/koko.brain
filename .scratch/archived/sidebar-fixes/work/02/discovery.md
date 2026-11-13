# Issue 02 discovery: remove dead ⌘⌫ hint

No `spec.md` for sidebar-fixes. Source finding F6 (`work/02-files-mode.md` on `docs/ux-sidebar-discovery`), re-verified on main.

## Verified on main
- `src/lib/core/file-explorer/FileExplorer.svelte:383` and `src/lib/features/type-definitions/TypeNoteList.svelte:700` render `<ContextMenu.Shortcut>⌘⌫</ContextMenu.Shortcut>` on "Move to Trash". No keybinding implements it.
- The only other shortcut hint in both menus is `F2` on "Rename" (`FileExplorer.svelte:378`, `TypeNoteList.svelte:695`). It is bound: `FileTreeItem.svelte:281` and `TypeNoteList.svelte:586` handle `e.key === 'F2'` on the row. It stays.

## Plan
1. Tests first: in both component tests, open the row context menu and assert
   - the "Move to Trash" item has no `[data-slot="context-menu-shortcut"]`;
   - the only shortcut hints in the menu are `['F2']` (bound);
   - clicking "Move to Trash" (confirm accepted) still trashes the item (`moveToTrash` / `deleteItem` called with the path).
2. Delete the two `⌘⌫` lines.

## Tests (prior art)
- `src/tests/lib/core/file-explorer/FileExplorer.test.ts` (`chooseMenuItem`, Issue 01).
- `src/tests/lib/features/type-definitions/TypeNoteList.view.test.ts` (`TypeNoteList file operation failures`, Issue 01).

## Risks
- None beyond the markup; handlers are untouched.

## Defaults taken
- F2 hint kept since it is bound.
