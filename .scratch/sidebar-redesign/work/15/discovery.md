# Issue 15 discovery: Folder operations on the Files navigator

No `spec.md`; the source is `PRD.md` (Navigators: Files, Q15). Builds on `work/14` (FilesNavigator,
`layout.railFolder` / `layout.railExpandedFolders`). The menu copies the classic tree's folder menu
(`core/file-explorer/FileExplorer.svelte:102-230`) and its toasts (sidebar-fixes Issue 01). Drag and
folder notes are Issue 16.

## Files that change
- `rail-shell/lens.logic.ts`: `followFolderPathChange(pick, expanded, from, to)`: a rename/move re-roots the
  pick and every expanded path at or under `from`; a delete clears a pick at or under it (back to the vault
  root) and drops those expanded paths. Null when nothing changes.
- NEW `rail-shell/files-navigator.service.ts`: `registerFilesNavigatorPathChangeConsumer()` applies it to
  `settingsStore.layout` from the path-change owner (`path-change.service.ts:56`), so menu rename and delete
  (and Issue 16's drag) all follow. Wired in `app-lifecycle.service.ts:243-251` next to the Calendar one.
- `rail-registry.store.svelte.ts` + `rail-shell.types.ts`: `RailFolderCreator` (id, label, icon,
  `create(dir)`) registry. Kanban is a plugin (ADR 0003, `rail-shell.boundary.test.ts`), so
  `plugins/kanban/kanban.service.ts` registers "New Kanban Board", wired in `initializeVault`.
- `FilesNavigator.svelte`: context menu on folder rows (New note, New folder, New canvas, kanban (registered),
  New collection, Change icon, Copy path, Reveal in Finder, Rename, Move to Trash); the root row gets the
  create items only. Inline rename on the row (local state). All failures toast via
  `fileOperationErrorMessage`; invalid names via `getFileNameError` (as `FileTreeItem.svelte:120-150`).

## Behavior defaults
- New note / canvas / kanban / collection: created in the folder (`createFile` dedupes), the folder is
  picked so the list shows it, and the file opens. New folder: parent expanded, new row in inline rename.
- Delete asks first (`ask`), as both existing menus do. Deleting the picked folder (or a parent) falls back
  to the vault root pick; Files stays the rail item.
- Rename of an unchanged or empty name is a cancel; Escape cancels; Enter then blur commits once.

## Tests (test-first)
1. `lens.logic.test.ts`: followFolderPathChange (rename picked, rename parent, unrelated, sibling prefix
   `Work2`, delete picked/parent, expanded remap + prune, empty inputs).
2. `files-navigator.service.test.ts`: real `applyPathChange` via `renameItem` / `deleteItem` with Tauri
   mocked; asserts `settingsStore.layout`.
3. `rail-registry.store.test.ts` (folder creators), `kanban.service.test.ts` (registration creates a board).
4. `FilesNavigator.test.ts`: every menu item over real fs.service (Tauri mocked, as `FileExplorer.test.ts`),
   toasts for rename collision, invalid name, delete and create failures; rendered rename input.
5. `app-lifecycle.service.test.ts`: registration + teardown. E2E `rail-shell.spec.ts`: rename picked folder.

## Risks
- Between `diskOp` and `refreshTree` the pick names the new path before the tree has it: the list is empty
  for one refresh (no data risk).
