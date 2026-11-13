VERDICT: APPROVED

Re-review round 3 of Issue 22. Reviewed `git diff c07cbd9e6..HEAD` (d8efb1efd) in the worktree.

## Previous findings

| # | Severity | Status | Evidence |
|---|----------|--------|----------|
| 1 | minor | resolved | `updateViewEditYaml` (`src/lib/features/collection/yaml-parser.ts:307`) now guards the duplicate-name refusal with `named >= 0`, so it fires only when `_rail_view` resolves. Without a resolving `_rail_view`, `index` is 0 and the save goes through as Issue 19's did (errors only on bad YAML or a missing view map). The resolving-case refusal test (`yaml-parser.test.ts:1076-1081`) is untouched and passes. The no-`_rail_view` test was flipped from asserting the refusal to asserting the save (`views[0].name` and `views[1].name` both `Board`, no `_rail_view` added); that matches the criterion, so no test was weakened. Help 25's Edit view bullet now scopes the refusal to "When `_rail_view` names the view", which matches the code. |

## Acceptance criteria re-checked

- [met] Edit view (Issue 19) prefills from and saves to the view the index helper picks, not `views[0]`; renaming that view in the dialog also rewrites `_rail_view` to the new name, and a `.view` without `_rail_view` behaves as Issue 19 specifies (logic test on Issue 19's YAML updater with a two-view `.view` whose `_rail_view` names the second; component test for the prefill) — `updateViewEditYaml` edits `views[named]` and rewrites `_rail_view` when it resolves (`yaml-parser.ts:296-313`); without `_rail_view` it now saves `views[0]` with no refusal, as Issue 19 did (`yaml-parser.test.ts` "saves a label another view is named in a .view without _rail_view, as Issue 19 did"); `yaml-parser.test.ts`, `ViewDialog.svelte.test.ts` and `edit-view.service.test.ts` pass.
- [met] Docs: help 12 says `.collection` is for editor tables and calendars and `.view` for menu entries, and its note at `help/documentation/12-collection.md:155-156` ("only the first view ... is rendered") names `_rail_view`; help 25 documents `_rail_view` in View Metadata Fields, Convert to view, and New view in a folder menu under "Creating a View"; ADR 0027 gets an amendment listing `_rail_view`; ADR 0004 (`docs/adr/0004-file-type-separation.md`) gets an amendment on the two extensions' roles — the only docs change in this round is help 25's Edit view bullet, which now says the duplicate-name refusal applies when `_rail_view` names the view; it matches `yaml-parser.ts:307`. The rest was verified in round 2 and is unchanged.

## Findings

None open or new.

## Checks run by this review

- `pnpm check`: exit 0, 214 files, 0 errors, 0 warnings.
- `pnpm vitest run` on `yaml-parser.test.ts`, `edit-view.service.test.ts`, `ViewDialog.svelte.test.ts`, `FilesNavigator.new-view.test.ts`, `TypesNavigator.test.ts` (every test that references `updateViewEditYaml`, `editView` or the refusal message): exit 0, 5 files, 215 tests passed.
- Not run: the full suite and `pnpm build` (deliver runs them). Nothing under `src-tauri/` changed; `layer-baseline.json` and `BASELINE_SIZE` are untouched by this round.
- No scope creep: the fix commit touches `yaml-parser.ts`, its test, help 25 and the review-2 resolution only.
