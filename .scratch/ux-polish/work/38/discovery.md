# Issue 38 discovery: verb labels on native confirms

## Source sites (each gains `okLabel: '<verb>', cancelLabel: 'Cancel'`)

- `src/lib/core/settings/sections/TrashSection.svelte:36` Delete Permanently, `:51` Empty Trash
- `src/lib/core/editor/editor.service.ts:277-280` Discard Changes
- `src/lib/core/vault/exit.service.ts:37` `` `${verb} Anyway` `` (Close from `:16`, Switch from `vault.service.ts`)
- `src/lib/core/filesystem/delete-note.service.ts:14` Move to Trash
- `src/lib/features/note-list/NoteRowMenu.svelte:144` Move to Trash
- `src/lib/features/rail-shell/FilesNavigator.svelte:193-196` Move to Trash
- `src/lib/features/file-history/FileHistoryDialog.svelte:46` Restore Version

`UpdateSection.svelte` untouched. No e2e impact: `e2e/mocks/tauri-dialog.ts` ignores options.

## Tests (red first, then source)

Extend exact-options assertions: `delete-note.service.test.ts:35`, `NoteActionBar.test.ts:348`,
`NoteRowMenu.test.ts:336`, `TypesNavigator.test.ts:669` (all via `deleteNoteWithConfirm` or
NoteRowMenu), `vault-switch-failed-save.test.ts:82-85`, `vault.service.switch-save.test.ts:176-179`
(Switch Anyway). `FilesNavigator.menu.test.ts:361` `expect.anything()` -> exact object.
`exit.service.test.ts:107-110` keeps `objectContaining` but adds `okLabel: 'Close Anyway'`,
`cancelLabel: 'Cancel'` (and `kind`).

New case in `editor.service.test.ts` `closeTab` block: exact args + declined keeps tab (real editorStore).

New jsdom component tests, mount pattern copied from `src/tests/lib/core/settings/UpdateSection.restart.test.ts`:
- `src/tests/lib/core/settings/TrashSection.test.ts`: real `trashStore` (`setItems`), real
  `vaultStore.open('/vault')`; mock `@tauri-apps/plugin-dialog` and `#lib/core/trash/trash.service.js`.
- `src/tests/lib/features/file-history/FileHistoryDialog.test.ts`: real `fileHistoryStore`
  (`setOpen`, `setFilePath`, `setSnapshots`, `setSelectedSnapshot`); mock plugin-dialog and
  `file-history.service`. The dialog portals to `document.body`, so the button is found there.

## Risks / defaults

- `tauri-listeners.service.test.ts:263` and `UpdateSection.restart.test.ts:122` use
  `objectContaining({ kind })` and stay green unchanged.
- TrashSection's `onMount` calls `loadTrash` (mocked) when a vault is open; harmless.
- Default: Empty Trash test uses two items to keep the plural message exact.
