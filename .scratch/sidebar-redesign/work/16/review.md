VERDICT: APPROVED

Review of `git diff main...HEAD` (339ee2ce, a57e27f4, 98287e17) on branch issue/16-drag-and-folder-notes.

## Acceptance criteria

- [met] Dragging a list row onto a folder moves the file; dragging a folder onto a folder moves it; the list and the navigator update — `RailNoteList.svelte:361` turns on `NoteRow`'s `draggable` (dragstart sets `text/plain` = path, `NoteRow.svelte:66-72`). Folder rows are draggable and every folder row plus the root row accept drops (`FilesNavigator.svelte:246-254`, `validateDragDrop` then `moveItem` via `applyPathChange`). Tests: `FilesNavigator.menu.test.ts:520+` ("a note-list row dropped on a folder moves the file there" checks `fsStore.fileTree` and the drop look clearing; "a folder dropped on a collapsed folder..." checks the moved row renders and `railExpandedFolders`); `RailNoteList.test.ts:200` covers the row payload. The E2E (below) shows the list update.
- [met] Moving the picked folder keeps it picked under its new path — this goes through the Issue 15 `files-navigator` path-change consumer (`files-navigator.service.ts`, `followFolderPathChange`). Test `FilesNavigator.menu.test.ts:585` checks `settingsStore.layout.railFolder` = new path, the expanded set and `aria-current` on the new row. The E2E also checks that Projects stays picked after a note is dragged out of it.
- [met] A move onto an existing name shows a toast and moves nothing — `moveItem` throws `targetExistsError` and `runOrToast` toasts it. Test `FilesNavigator.menu.test.ts:613` checks the exact toast text, that `rename` is never called, that the pick is unchanged and that the row is still there. A refused disk move also toasts (next test).
- [met] With folder notes on, picking a folder with a folder note opens it; with the setting off it does not — `pickFolder` (`FilesNavigator.svelte:208-212`) uses `settingsStore.folderNotes.enabled` and `findFolderNote` over the full tree node's children (`navigatorFolders` only filters which rows render, so `node.children` still holds the files). Tests at `FilesNavigator.menu.test.ts:654+` cover: on with a note, on without a note, off, and the root row.
- [met] E2E: drag a note from the list onto another folder and it shows there — `e2e/specs/rail-shell.spec.ts:627`. I ran it myself: `bash scripts/e2e.sh e2e/specs/rail-shell.spec.ts -g "dragging a note|renaming the picked folder"` gave exit 0, 2 passed (Chromium).
- [met] Tests follow docs/TESTING.md: real stores and real `.logic.ts`, assertions on store state and rendered content, happy path plus empty and error cases, a test for every new store getter — the menu suite mocks only the Tauri boundary, sonner, trash, icon data and the editor. Stores, `fs.service`, `path-change` and `fs.logic` are real. Assertions are on `fsStore.fileTree`, `settingsStore.layout` and the DOM. Empty case: the empty payload in `it.each`. Error cases: the taken name and the refused move. Ignored drops: self, own child, same parent. No new store getter.
- [met] New UI uses the region theme tokens (never hard-coded colors) and reads correctly in every built-in theme — the drop look is `bg-file-explorer-accent/50 outline-dashed outline-1 outline-ring`, the same classes the classic `FileTreeItem.svelte:264` ships. `--file-explorer-accent` and `--ring` are defined for light and dark in `src/app.css` and are part of `ThemeColors` (`theme.types.ts:50`), so every built-in theme resolves them. A test asserts there is no hex or rgb in the rendered markup. Not checked by eye per theme (see Not verified).

## Findings

1. minor — `src/lib/features/rail-shell/FilesNavigator.svelte:249-251` — `handleDrop` treats any `text/plain` payload as a vault path. My probe dropped the text "hello world" (an editor selection or a browser link drags the same way) on the Work row, and `moveItem` called `exists("/vault/Work/hello world")` and `rename("hello world", "/vault/Work/hello world")`. In the app that rename rejects and the user gets a confusing "Could not move "hello world"" toast. A dragged absolute path that happens to name a real vault file would be moved. The classic tree has the same pattern, so this is not a regression. Fix: return early when `findNodeByPath(fsStore.fileTree, source)` is null. The lookup already runs on the next line for `isFolder`.
2. nit — `src/lib/features/rail-shell/FilesNavigator.svelte:257-260` — when the picked folder is also the drop target, `rowClass` emits both `bg-file-explorer-primary/25` and `bg-file-explorer-accent/50` (my probe confirmed the class string). CSS order decides which one wins, so the picked row's drop look may show only the dashed outline. Fix: drop the active background when `dropTarget` is true.

## Checks run by this review

- `pnpm check`: exit 0, 219 files, 0 errors, 0 warnings.
- `pnpm vitest run src/tests/lib/features/rail-shell/ src/tests/lib/features/note-list/ src/tests/lib/features/type-definitions/TypeNoteList.view.test.ts`: exit 0, 14 files, 364 tests passed. My test verdict rests on these files: `FilesNavigator.menu.test.ts`, `FilesNavigator.test.ts`, `RailNoteList.test.ts`, `RailNoteList.view.test.ts`, `files-navigator.service.test.ts`, `lens.logic.test.ts`, the other rail-shell suites, `NoteRowMenu.test.ts` and `TypeNoteList.view.test.ts`.
- Targeted E2E as above: exit 0, 2 passed.
- A throwaway probe test (deleted afterwards; the worktree is clean) produced findings 1 and 2.
- The full suite (`pnpm vitest run && pnpm build`) and the full E2E gate are deliver's to run. src-tauri/ is untouched, so no cargo test.

## Scope

No scope creep. The diff is the three components, their tests, one E2E and the discovery note. The classic `TypeNoteList` keeps `draggable` off, and a test pins that.

## Not verified

- Drag in the real Tauri WKWebView. The note row being dragged is a `<button draggable>`, and the E2E runs Chromium only. `dragDropEnabled: false` in `tauri.conf.json` leaves HTML5 DnD to the webview, and the classic tree already relies on that, but a button as the drag source has not been tried in WebKit.
- The drop look was not checked by eye in each built-in theme.

## Resolution

1. Fixed. `handleDrop` (`FilesNavigator.svelte:246-257`) returns early when `findNodeByPath(fsStore.fileTree, source)` is null, so a text drag that is not a path in the tree moves nothing and toasts nothing. Tests: two new `it.each` rows in `FilesNavigator.menu.test.ts` ("text that is not a vault path", "an absolute path outside the file tree") assert no `exists`, no `rename` and no toast. Both failed before the fix.
2. Fixed. `rowClass` (`FilesNavigator.svelte:260-266`) drops `bg-file-explorer-primary/25` while the row is the drop target and keeps the primary text color. Test: "the picked folder under a drag shows only the drop background" checks the picked background before, only the drop background during, and the picked background again after `dragleave`. It failed before the fix.
