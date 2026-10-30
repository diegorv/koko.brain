VERDICT: APPROVED

# Issue 17 review: collection widget row cap

Reviewed `git diff main...HEAD` at 9ebe6da6 (commits 0fd56248, f6fbade2, 9ebe6da6).

## Acceptance criteria

- [x] **Test written and seen failing first: 10,000 records render at most the cap of body rows plus a "Showing 50 of 10000" footer.** Met. `collection-block-widget.test.ts:116-124` (`buildCollectionTable`, 10,000 records -> 50 `tbody tr`) and `:244-253` (widget over a real `collectionStore` index of 10,000 records: header `All (10000)`, 50 rows, footer `Showing 50 of 10000`). I re-ran the test file against main's `collection-block-widget.ts` (temporarily restored, then reverted): 4 failed / 12 passed, matching the build report.
- [x] **A result at or under the cap renders every row and no footer.** Met. `:255-263` (exactly 50 records: 50 rows, no footer; this also catches a `>=` slip in the footer guard) and `:265-270` (2 records: 2 rows, no footer).
- [x] **Header still shows the full count.** Met. `collection-block-widget.ts:118` still uses `result.records.length`. Asserted on the cold path (`test:250`) and on a cache hit (`test:272-281`). The cache-hit test fails if anyone caches a sliced result.
- [x] **The cap is one named constant with a JSDoc saying why it exists.** Met. `collection-block-widget.ts:44-51` `export const COLLECTION_ROW_CAP = 50`. Both the slice (`:386`) and the footer text (`:145`) use it. See nit 2 on the wording.
- [x] **Scope: table view only, cached query data unchanged.** Met. Calendar and linear-calendar return before the table branch (`:121-129`). The cache entry (`:105`) stores the full `QueryResult`.

## Checks I ran (not taken from the build report)

- `pnpm check`: 0 errors, 0 warnings (211 files).
- `pnpm vitest run` on `src/tests/lib/core/markdown-editor/extensions/live-preview/widgets/collection-block-widget.test.ts`, `src/tests/lib/core/markdown-editor/extensions/live-preview/plugins/special-fence-detection.test.ts` and `src/tests/lib/features/collection/`: 20 files, 791 tests pass. **The test verdict rests on these files**, mainly `collection-block-widget.test.ts`.
- Red check: the new tests against main's widget source give 4 failed / 12 passed.
- Timing probe, deleted afterwards and not committed. I mounted all 20 ```` ```collection ```` blocks from `help/examples/markdown-editor-vault/20-collection.md` in jsdom over a synthetic 10,600-note index. Total `executeQuery` time: 59 ms. Cold `toDOM()` for the note: 64 ms, building 3,258 elements. Warm: 10 ms. Nine of the blocks match all 10,600 notes. Uncapped, they would have built roughly 10,600 x 5 elements each, about 500k in total. This supports the Issue's diagnosis: the row count caused the freeze, not the query. The fix removes that cost. I did not check the timing in the app.

## CLAUDE.md rules

- Layer rules: no change. The widget stays in `core/` and already imported `features/collection`. No new imports.
- Tests: the one changed logic file has its tests updated. `styles.ts` adds one CSS rule (`.cm-lp-collection-footer`), which needs no test. It reuses `--lp-collection-empty`, which is defined in `src/app.css:240`.
- Performance guideline 2: the cache still holds data, not live DOM. The footer is built fresh on each `toDOM()`.
- Tabs, JSDoc, import order and English: OK. The commit follows docs/COMMITS.md (Context, Problem, Solution, Behavior, Files with line ranges).
- No scope creep: the diff touches only the two files listed in the Issue, plus the tests.

## Findings

1. **Low (follow-up, not blocking): linear-calendar output is not bounded.** File: `src/lib/core/markdown-editor/extensions/live-preview/widgets/collection-block-widget.ts:320-342`. The Issue says calendar and linear-calendar "already bound their own output". That holds for `calendar`, which shows at most 2 pills per day plus a "+N" marker (`:219-231`). It does not hold for `linear-calendar`: `buildLinearCalendar` creates one absolutely positioned bar for every record dated in the current year, and the lanes grow without limit. A `linear-calendar` block over a large vault with dates can still build a very large DOM. `20-collection.md` has no calendar views, so this does not affect the reported freeze. Fix: open a separate Issue to cap bars per month row (for example a lane cap with a "+N" marker, like `calendar`). Do not widen this Issue.
2. **Nit: the constant's JSDoc tells the incident in the past tense.** File: `collection-block-widget.ts:46-48`. "built hundreds of thousands of nodes on the main thread and froze the app" describes what happened, not the constraint (global comment rule: document the code as it is now). Fix (optional): "an unfiltered block over a large vault would build hundreds of thousands of nodes on the main thread and block it".
3. **Nit: the example note's expected text is out of date.** File: `help/examples/markdown-editor-vault/20-collection.md:28`. The `ESPERADO` note for block 1 still says the table shows every note in the vault. It now shows 50 rows plus a "Showing 50 of N" footer. Fix (optional): add one line about the cap and footer, in the note's existing language. This file is outside the Issue's Touches list, so it is fine to leave as is.

## Not verified

- The fix has not been tried in the app on the owner's ~10.6k-note vault. Only jsdom timings were measured.
- The full gate is left to the deliver step.

## Resolution

1. Accepted as a follow-up: opened `.scratch/live-preview-analysis/issues/18-linear-calendar-bar-cap.md` (`Status: needs-triage`). This Issue stays scoped to the table view.
2. Fixed: the `COLLECTION_ROW_CAP` JSDoc now states the constraint in the present tense.
3. Fixed: the block 1 `ESPERADO` note in `20-collection.md` mentions the 50-row cap, the full count in the header and the "Showing 50 of N" footer.
