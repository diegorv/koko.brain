# Issue 27 discovery: palette "New ..." commands show what they created

## Files that change

- `src/lib/features/command-palette/command-palette.service.ts:71-114`: the four entries
  `file-explorer:new-file`, `file-explorer:new-folder`, `canvas:new`, `kanban:new`.
- `src/tests/lib/features/command-palette/command-palette.service.test.ts:285-305`: the two
  tests that assert `fsStore.renamingPath` after New File / New Folder.
- New `src/tests/lib/features/command-palette/command-palette.new-commands.test.ts` (jsdom).

## Plan

- New File / New Canvas / New Kanban Board: `await openFileInEditor(filePath)` after the create
  (`core/editor/editor.service.ts:66`), dropping `fsStore.setRenamingPath`.
- New Folder: `settingsStore.updateLayout({ railItem: FILES_RAIL_ITEM, railFolder: folderPath,
  railPanelsVisible: true })`, dropping `fsStore.setRenamingPath`. Same shape as
  `openSearch` (`features/search/open-search.service.ts:13`) and `openNeighbourhood`
  (`features/rail-shell/neighbourhood.service.ts:12`). AppShell turns `railFolder` into the
  navigator's `picked` via `pickedFolderLens` (`core/layout/AppShell.svelte:129`).
- After the change no palette command writes `fsStore.renamingPath`.

## Tests

- New jsdom test file: the real editor service with only `@tauri-apps/plugin-fs` mocked
  (`readTextFile` resolves the content), so each file command asserts `editorStore.activeTabPath`
  and the tab's `fileType`; New Folder asserts `settingsStore.layout` and then mounts the real
  `FilesNavigator` with `pickedFolderLens(settingsStore.layout.railFolder)` and checks the
  created folder row carries `aria-current="true"` (prior art:
  `src/tests/lib/features/rail-shell/FilesNavigator.test.ts:118`). All four assert
  `fsStore.renamingPath` stays null. Create failure: no tab, layout untouched.
- The old rename-mode test in `command-palette.service.test.ts` is replaced by these
  (it asserts the behavior this Issue removes); the create-error test keeps its rejection
  assertion.

## Defaults taken

- Folder "shown" = picked in the Files navigator, not inline rename: the navigator's rename
  state is component-local (`FilesNavigator.svelte:81`), so starting it from the palette would
  need a new store field. Picking also fills the note list with the (empty) folder.
- The panel is forced visible (`railPanelsVisible: true`), else the pick is not visible.
- No rename for created files either: `NoteRow` reads `renamingPath` only for a note in the
  current list, which a root-level file, canvas or kanban is not guaranteed to be.

## Risks

- `openFileInEditor` catches its own read error and toasts `Failed to open file.`, so a
  created-but-unreadable file leaves the command resolved; a create error still rejects.
