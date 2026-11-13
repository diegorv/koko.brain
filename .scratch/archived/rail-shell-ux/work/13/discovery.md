# Issue 13 discovery: one row set for a `.view`

No `spec.md` for rail-shell-ux; the Issue Notes carry the decisions. Builds on work/10 (`ViewLoad`, `RESERVED_KEY_RULES`) and work/12 (`isListableNote`).

## Files that change
- `features/collection/collection.logic.ts:117-188` `executeQuery`: optional 4th arg `rows(records, view)` that replaces step 5 (limit); columns resolve from its output.
- `features/collection/view-row-set.port.ts` (new): `ViewRowSetPort { rows(viewPath, records, view); sortLabel(viewPath) }`, `registerViewRowSetPort` / `getViewRowSetPort` (shape of `registerTypeIconLookup`).
- `features/collection/CollectionView.svelte:207-221,511`: for `isViewFile(filePath)` with a port, pass `rows` to `executeQuery` and `emptyText` (the port's `sortLabel`) to `SortPanel`.
- `features/collection/toolbar/SortPanel.svelte:135-137`: optional `emptyText` prop, default "No sorts applied".
- `features/type-definitions/type-sidebar.logic.ts:375-397`: `VIEW_SORTS`, `isViewSort`; `getViewSort` gives `modified` for anything else; `_sort` row in `RESERVED_KEY_RULES`; `effectiveViewSortLabel(entry)`.
- `features/rail-shell/lens.logic.ts:540-616`: `viewRowSet(records, view, viewPath, ctx)` (system folder, `isListableNote`, archived out via `getNotesForViewPaths`, `resolveViewListSort` order, then `limit`); `queryViewLens(definition, overrides, index, viewPath, ctx)` runs it through `executeQuery`; `ViewQueryResult.viewCount`; `resolveViewLens` maps `paths` in order (no second filter or sort) and appends ", first view" to the rule when `viewCount > 1`.
- Callers: `RailNoteList.svelte:216` (+ Sort popover `emptyText`), `view-lens.service.ts:29`.
- `app/boot.ts`: `registerViewRowSetPort` fed from `typeDefinitionsStore`, `vaultStore`, `settingsStore`.

## Plan (test-first, one commit each)
1. `_sort` validation + label (type-sidebar logic test; `viewNavigatorRows` keyNotes in lens.logic.test).
2. `executeQuery` rows arg + `viewRowSet` + `queryViewLens`/`resolveViewLens` migration; fixture vault test (red first), own-sort test, rule-line test.
3. Port + boot registration (boot.test).
4. `CollectionView` + `SortPanel` + `RailNoteList` (CollectionView.test with port registered via `registerAppPorts()`, `.collection` path unchanged; RailNoteList.view.test effective sort); `countViewNotes` service test on the fixture.

## Prior art
- `registerTypeIconLookup` (`file-icons/icon-resolver.ts:26`) and its boot.test coverage.
- `CollectionView.test.ts` harness (`CollectionViewHarness.svelte` takes `path`); `RailNoteList.view.test.ts` mocked disk + real stores.

## Defaults taken
- Label text: `Sorted by _sort: <value>`; default: `Sorted by the default: modified, newest first`.
- Ignored note text: `Ignored key _sort: expected one of modified, created, modified-asc, created-asc, title, got "x"`.
- Rule line: `<filters>, not archived, first view`.
- A record with no entry (not in `typeDefinitionsStore.entries`) is dropped, as the rail does.

## Risks
- The editor's `.view` list is empty until the entries snapshot loads (same as the rail).
- `sortNotes` default branch (title) stays for type definitions' own `_sort`; only `getViewSort` changes.
