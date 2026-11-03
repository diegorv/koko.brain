VERDICT: APPROVED

## Acceptance criteria

- [met] Failing test first: move the collection cases of `.scratch/live-preview-audit/repro/interactions/widget-click.test.ts` under `src/tests/` (fix the `test-helpers` import path) and see them fail on the bug assertions — Both repro collection cases (row click, index bump + forced rebuild) are in `src/tests/lib/features/collection/collection-block-click.test.ts` with the import fixed to `../../core/markdown-editor/test-helpers`, and commit 7d304fe5 removes them from the repro. I put main's `collection-block-widget.ts` back in place and re-ran the new file: 3 failed, 2 passed. The row, pill and bar cases each failed on all four bug assertions: "collection widget still drawn: expected null", "target still connected at click time: expected false", "expected [] to deeply equal [['/vault/a.md']]", and "cursor ... expected 19 to be 92/89/97". The header control and the rebuild case passed. Then I restored the file (`git status` clean).
- [met] Clicking a table row, a calendar pill and a linear-calendar bar opens the note (`openFileInEditor` called with its path), the widget stays drawn, and the editor cursor does not move to the fence line — `stopEditorMousedown` is applied to the pill (collection-block-widget.ts:235), the bar (:353) and the `tr` (:421). Each of the three tests (`expectOpenedWithoutReveal`) asserts four things: `.cm-lp-collection-block` is still present, the target is connected at click time, `openFileInEditor` calls equal `[['/vault/a.md']]`, and the cursor head is still on the trailing `end`. All three pass with the fix.
- [met] Clicking elsewhere in the block (outside rows, pills and bars) still places the cursor and reveals the source as today — The control test 'a press on the header (outside rows) ...' asserts that the cursor lands inside the fenced range, `.cm-lp-collection-block` is gone, and `openFileInEditor` was not called. It passes with and without the fix. No container-level listener was added, and `ignoreEvent()` (:382) is unchanged, so presses outside the three elements still reach CodeMirror.
- [met] Existing collection widget tests pass — `collection-block-widget.test.ts`, `CollectionView.test.ts` and `CollectionTableView.svelte.test.ts` pass together with the new file: 4 files, 38 of 38 tests, exit 0. The full suite and `pnpm build` belong to deliver.

## Checks run by the reviewer

- `pnpm check`: exit 0, 0 errors, 0 warnings.
- `pnpm vitest run src/tests/lib/features/collection/collection-block-click.test.ts src/tests/lib/features/collection/collection-block-widget.test.ts src/tests/lib/features/collection/CollectionView.test.ts src/tests/lib/features/collection/CollectionTableView.svelte.test.ts`: exit 0, 38 passed. My test verdict rests on these four files.
- Red check: the new test file against main's widget source fails 3 of 5 on the bug assertions, as listed above.
- Scope: the diff touches only the widget source, the new test, the repro file (the cases were moved out) and the workflow's discovery record. `buildCollectionTable` has one caller, the widget itself (:151), so the new `tr` mousedown handler cannot affect any non-CodeMirror host. The three elements changed are the widget's only `click` listeners. Nothing in the layer baseline or the composition roots changed.

## Findings

1. minor — src/tests/lib/features/collection/collection-block-click.test.ts:72. The proof runs only in jsdom with `posAndSideAtCoords` stubbed, and `e2e/specs/collection-block.spec.ts` has no row-click case. The stub mirrors what a browser returns and the red/green run shows the mousedown path is the one fixed, but no real browser exercises the fix. Fix (optional, follow-up): add an e2e case that clicks a table row in an embedded block and asserts that the target note's tab opens and the block stays rendered.
2. nit — src/lib/features/collection/collection-block-widget.ts:450-455. `preventDefault` on mousedown also stops a text-selection drag from starting on a row, pill or bar, and stops the editor from taking focus on that press. This matches the other interactive widget controls (`attachAddButtons`) and the Issue asks for it. No change needed; noted so the trade-off is on record.

## Resolution

1. Not fixed in this Issue. The finding is correct (no real browser exercises the fix), but the reviewer marks it an optional follow-up, and none of the Issue's acceptance criteria asks for an E2E case. Adding `e2e/specs/collection-block.spec.ts` coverage here would need an E2E run and a new review round for a test-only change. Left for the main session to file as a follow-up: an E2E case that clicks a table row in an embedded collection block and asserts the target note's tab opens and `.cm-lp-collection-block` stays rendered.
2. No change, as the reviewer says: `preventDefault` on mousedown matches `attachAddButtons` and the Issue asks for it.
