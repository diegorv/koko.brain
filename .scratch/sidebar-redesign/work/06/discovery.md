# Issue 06 discovery: one note row and one row menu

Pure prefactor of `features/type-definitions/TypeNoteList.svelte`. No visible or behavior change.

## Files that change

- New `features/note-list/note-row.types.ts` - `NoteRowNote` (the row fields: path, title, favorite,
  modifiedAt, createdAt, frontmatter). `TypeSidebarNote` satisfies it structurally.
- New `features/note-list/note-row-menu.context.ts` - context between the menu and its rows, same
  shape as `core/file-explorer/file-explorer.context.ts` (`setContextTarget`, `startRename`, rename
  input state, `commitRename`, `onRenameKeydown`).
- New `features/note-list/NoteRowMenu.svelte` - takes `TypeNoteList.svelte:537-709` (context menu
  root, trigger wrapper with the blank-area guard, every item), `:356-449` (runOrToast, duplicate,
  rename state + prefill effect + commit/cancel/keydown, delete confirm, icon picker handlers) and
  the `IconPicker` at `:712-723`. Props: `notes`, `class`, `children`.
- New `features/note-list/NoteRow.svelte` - takes the row markup `:567-642` (rename input row and
  the button row: icon, title, pills, dates). Props: `note`, `icon`, `isActive`, `listProperties`,
  `allPaths`.
- `TypeNoteList.svelte` - keeps selection, loading, header, sub-filter tabs, `resolveNoteIcon` and
  the VList with its separators; renders `<NoteRowMenu>` with one `<NoteRow>` per note.

## Plan

1. Regression net: the existing `TypeNoteList.view.test.ts` already covers duplicate / rename / trash / F2 hint / icon color and
   must pass unedited; they are the regression net.
2. New harness `src/tests/fixtures/NoteRowMenuHarness.svelte` (menu + rows, no VList) and
   `src/tests/lib/features/note-list/NoteRowMenu.test.ts`: row content, every menu item in order,
   open / copy path / change icon / favorite label / reveal / rename (F2, Enter, Escape) / trash,
   empty list (blank right-click shows no menu), error toasts.
3. Move the code, run both test files + `pnpm check`.

## Prior-art tests

`TypeNoteList.view.test.ts` "file operation failures" (mocks, `chooseMenuItem`, `settle`).

## Defaults taken

- Pure helpers (`splitPropertyIntoPills`, `formatRelativeTime`, `formatNoteDate`, `resolveWikilink`)
  stay where they are; the row imports them, so their tests stay untouched.
- Icon resolution stays in the caller (`resolveNoteIcon` depends on the Types selection) and is
  passed as a prop; the rail list will pass its own.
- The IconPicker moves from after the panel root to inside it; it is a portalled Dialog, so nothing
  moves on screen.

## Risks

- VList remounts rows on scroll: rename state must live in the menu (one per list), not in the row,
  or a scroll during rename resets the input. Kept in the menu as today.
