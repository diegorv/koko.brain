VERDICT: APPROVED

Re-review round 2 of Issue 22. Reviewed `git diff bee17c5b6..HEAD` (5a4a8d2fa, dffe03f76, cb6e320cb, 0efd732ef) in the worktree.

## Previous findings

| # | Severity | Status | Evidence |
|---|----------|--------|----------|
| 1 | blocker | resolved | `updateViewEditYaml` (`src/lib/features/collection/yaml-parser.ts:303-307`) runs `viewIndexByName` over `views` with the edited index masked to `null`, and returns `{ ok: false, error: 'Another view in this file is named "<label>"' }` on a hit. `editView` (`type-definitions.service.ts:348-349`) throws that error before any write, and the dialog shows a rejected save inline (Issue 19). The reviewer's case (`_sidebar_label: Table`, `_rail_view: Board`, views `[Table, Board]`, label `Table`) is refused in `yaml-parser.test.ts:1076-1081`. Keeping the edited view's own name still saves and `railViewIndex` stays 1 (`yaml-parser.test.ts:1088-1092`). The rail can no longer be moved to another view by a save. See new finding 1 for the case without `_rail_view`. |
| 2 | minor | resolved | The `_rail_view` rule (`type-sidebar.logic.ts:412-419`) now passes when `fm.views` is not an array, so a type definition gets no note. `type-sidebar.logic.test.ts:1001-1004` asserts `[]` for `{ _rail_view: 'Board' }` and for `{ _rail_view: 3, views: 'Board' }`. The "names no view" notes for `.view` records still pass (`:996-999`). The old assertion was replaced by its opposite, which matches the finding, so no test was weakened. |
| 3 | nit | resolved | `RailNoteList.svelte:194-196` resets `viewRunIndex` to 0 when `loadView` starts for a path other than `viewLoaded?.path`, and `:229` sets `result?.viewIndex ?? 0`. Same-path reloads keep the index. The fix step's reason for not resetting on every load holds: the toolbar stays usable during a same-path reload, and `persistViewState` reads `viewRunIndex`. RailNoteList tests pass. |

## Acceptance criteria re-checked

- [met] Edit view (Issue 19) prefills from and saves to the view the index helper picks, not `views[0]`; renaming that view in the dialog also rewrites `_rail_view` to the new name, and a `.view` without `_rail_view` behaves as Issue 19 specifies (logic test on Issue 19's YAML updater with a two-view `.view` whose `_rail_view` names the second; component test for the prefill) — `yaml-parser.test.ts:1054-1061` (edits `views[1]`, renames `_rail_view`) plus the three new tests; `ViewDialog.svelte.test.ts` prefill passes. For a `.view` without `_rail_view`, Issue 19's save writes `views[0]` as before (`yaml-parser.test.ts` "writes no _rail_view into a .view that has none"). The one change from Issue 19 is that a label another view already carries is now refused (new finding 1).
- [met] Issue 10's reserved-key table gains a `_rail_view` row: a non-string value, or a name no entry in the record's `views` carries, gives an ignored-key note on the view's Types row (for example `_rail_view: "Bord" names no view; the first view runs`). If Issue 10's check receives only the value, widen it to receive the whole frontmatter record (logic test on the helper and on `viewNavigatorRows`) — `type-sidebar.logic.ts:412-419`. A `.view` record (which always has `views`) still gets the notes (`type-sidebar.logic.test.ts:996-999`, `lens.logic.test.ts` `viewNavigatorRows` note test, both pass). Only records without `views` are now exempt.
- [met] Docs: help 12 says `.collection` is for editor tables and calendars and `.view` for menu entries, and its note at `help/documentation/12-collection.md:155-156` ("only the first view ... is rendered") names `_rail_view`; help 25 documents `_rail_view` in View Metadata Fields, Convert to view, and New view in a folder menu under "Creating a View"; ADR 0027 gets an amendment listing `_rail_view`; ADR 0004 (`docs/adr/0004-file-type-separation.md`) gets an amendment on the two extensions' roles — help 25's Edit view bullet names the new refusal and its message, and the `_rail_view` table row says type definitions are not marked. Both match the code. Nothing else in the docs changed.

## Findings

1. **minor**: `src/lib/features/collection/yaml-parser.ts:303-307`. The refusal also applies to a `.view` with no resolving `_rail_view`. In that case the rail always runs `views[0]`, so a duplicate name cannot switch views, but Issue 19's save (which errors only on bad YAML or a missing `views[0]`) is now refused. Example: `_sidebar_label: Board` and views `[Table, Board]` with no `_rail_view`. Edit view prefills `Board`, and a filter-only save now fails with `Another view in this file is named "Board"` until the user renames it. That differs from "a `.view` without `_rail_view` behaves as Issue 19 specifies". The round-1 review proposed this broader rule, and the case is rare: Edit view's own label must equal another tab's `name`. It does not block delivery. Fix: either refuse only when `_rail_view` resolves (`named >= 0`), or record the owner's acceptance of refusing duplicate view names in the Issue Notes.

## Checks run by this review

- `pnpm check`: exit 0, 214 files, 0 errors, 0 warnings.
- `pnpm vitest run` on `yaml-parser.test.ts`, `type-sidebar.logic.test.ts`, `RailNoteList.test.ts`, `RailNoteList.view.test.ts`, `FilesNavigator.new-view.test.ts`, `TypesNavigator.test.ts`, `lens.logic.test.ts`, `types-navigator.service.test.ts`, `ViewDialog.svelte.test.ts` and `edit-view.service.test.ts`: exit 0, 10 files, 713 tests passed.
- `pnpm vitest run src/tests/lib/architecture src/tests/lib/features/rail-shell/view-lens.service.test.ts`: exit 0, 9 files, 85 tests passed. `layer-baseline.json` and `BASELINE_SIZE` are unchanged in `git diff main...HEAD`.
- Not run: the full suite and `pnpm build` (deliver runs them). Nothing under `src-tauri/` changed.
- No scope creep: the fix commits touch only the three files named in the findings, their tests, help 25 and the review file.

## Resolution

1. Fixed. `updateViewEditYaml` refuses a label another view carries only when `_rail_view` resolves (`named >= 0`); without it the rail always runs `views[0]`, so the save goes through as Issue 19 specifies. The test that asserted the refusal without `_rail_view` now asserts the save (`yaml-parser.test.ts`), and help 25's Edit view bullet says the refusal applies when `_rail_view` names the view.
