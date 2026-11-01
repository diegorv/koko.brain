VERDICT: APPROVED

# Issue 27 review: palette "New ..." commands show what they created

Reviewed `git diff main...HEAD` (b34d438e, c1d1dca0) in the worktree.

## Acceptance criteria

- [met] Each of the four commands leaves the created item visible (open in the editor, or picked in the Files navigator) — `command-palette.service.ts:80,102,113` call `await openFileInEditor(filePath)` after `createFile` / `createCanvasFile` / `createKanbanFile`; `openFileInEditor` (`core/editor/editor.service.ts:66-127`) adds the tab with `fileType` canvas/kanban from the extension and sets `fsStore.selectedFilePath`. New Folder (`command-palette.service.ts:91`) writes `{ railItem: FILES_RAIL_ITEM, railFolder: folderPath, railPanelsVisible: true }`, which `AppShell.svelte:103,127-130,186-205` turns into the shown Files navigator with `picked = pickedFolderLens(railFolder)`; the folder is created at the vault root, so its row is top level and needs no expand. Same layout-write shape as `openSearch` / `openNeighbourhood`. Verified by `command-palette.new-commands.test.ts` (active tab path + fileType per command; folder row `aria-current="true"`), and a mutation probe: with main's service restored the new file fails 4 of 6 tests.
- [met] No palette command writes `fsStore.renamingPath` unless a component reads it for that item — all four `fsStore.setRenamingPath` calls are removed and the `fsStore` import is gone from `command-palette.service.ts`; `grep setRenamingPath src/lib` now finds only `NoteRowMenu.svelte` (its own rename flow). Each new test asserts `fsStore.renamingPath` stays null.
- [met] Tests assert on store state and rendered content, not only on calls — the new jsdom file runs the real editor service and the real editor / fs / vault / settings stores (only the create calls, Tauri `invoke` / `plugin-fs`, icons, log and toast are mocked) and asserts `editorStore.activeTabPath`, `activeTab.fileType`, `fsStore.selectedFilePath`, `settingsStore.layout`, then mounts the real `FilesNavigator` and asserts the "Untitled" row's text and `aria-current`. The edited service test asserts `editorStore.tabs` is empty on a create error, alongside the `not.toHaveBeenCalled` check.

## Checks run by the reviewer

- `pnpm check`: 0 errors, 0 warnings (212 files).
- `pnpm vitest run src/tests/lib/features/command-palette/`: 5 files, 63/63 passed (includes the new `command-palette.new-commands.test.ts` and the edited `command-palette.service.test.ts`).
- `pnpm vitest run src/tests/lib/features/rail-shell/ src/tests/lib/features/note-list/ src/tests/lib/core/filesystem/fs.store.test.ts src/tests/lib/core/app-lifecycle/app-lifecycle.service.test.ts`: 17 files, 486/486 passed (the other readers of `renamingPath`, the Files navigator, and the app-lifecycle suite that touches the palette).
- Mutation probe: main's `command-palette.service.ts` swapped in, `command-palette.new-commands.test.ts` fails 4 (the four "show it" tests) and passes 2 (failure, no vault); restored afterwards, worktree clean.
- Layer probe: main's `layer-rules.test.ts` + `layer-baseline.json` + `scripts/import-graph.mjs` copied in temporarily and run against the branch: every violation/ratchet test passed; the one failure ("root list matches the table in ADR-0003") is because the branch predates main's ADR-0003 edit, not this diff. The new `command-palette -> rail-shell/lens.logic.ts` edge is feature-to-feature and adds no baseline entry. Files removed afterwards.
- Test verdict rests on: `src/tests/lib/features/command-palette/command-palette.new-commands.test.ts`, `src/tests/lib/features/command-palette/command-palette.service.test.ts`, the rest of `src/tests/lib/features/command-palette/`, `src/tests/lib/features/rail-shell/`, `src/tests/lib/features/note-list/`, `src/tests/lib/core/filesystem/fs.store.test.ts`, `src/tests/lib/core/app-lifecycle/app-lifecycle.service.test.ts`. The full suite and `pnpm build` are deliver's to run.

## Findings

1. minor — `src/tests/lib/features/command-palette/command-palette.new-commands.test.ts:110-114`: the folder test mounts `FilesNavigator` directly with `picked: pickedFolderLens(settingsStore.layout.railFolder)`, so the AppShell step that maps `layout.railItem === 'files'` + `railFolder` to the shown navigator and its `picked` prop (`AppShell.svelte:103,127-130,186-205`) is not exercised; no unit test covers that wiring today (pre-existing gap, `grep railFolder src/tests` finds no AppShell test). Fix (optional): a follow-up AppShell or e2e test that runs New Folder from the palette and checks the row is picked; not a blocker for this Issue.
2. nit — `src/tests/lib/features/command-palette/command-palette.new-commands.test.ts:120-131`: the create-failure test covers New File and New Folder only; New Canvas and New Kanban Board share the same code shape but their rejection path (no tab opened) is not asserted. Fix: add `canvas:new` / `kanban:new` to the failure case via `it.each`.
3. nit — `src/lib/features/command-palette/command-palette.service.ts:91`: the palette's New Folder only picks the folder, while the navigator's own New Folder (`FilesNavigator.svelte:113-118`) starts the inline rename. The Issue allows either and discovery.md records why (component-local rename state), so no change is needed; noting the behavior difference for the owner.

## Resolution

1. Not fixed here (optional, pre-existing gap): the AppShell wiring from `railItem 'files'` + `railFolder` to the shown navigator's `picked` prop has no test on main either; covering it needs an AppShell mount or an e2e spec, which is outside this Issue's scope. Left as a follow-up for the owner.
2. Fixed: the create-failure test is now an `it.each` over `file-explorer:new-file`, `file-explorer:new-folder`, `canvas:new` and `kanban:new`, each asserting no tab, unchanged layout and null `renamingPath`.
3. No change, as the review says: the Issue allows picking instead of renaming, and discovery.md records why.
