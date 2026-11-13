VERDICT: APPROVED

## Acceptance criteria

- [met] These tests pass with `test.fail()` removed: `table.spec.ts` "bottom-right corner of the wrapper stays rendered" and "20px right of the line box, at the table vertical center, stays rendered"; `code-block.spec.ts` "margin right of the line box keeps it rendered"; `math-block.spec.ts` "20px right of the line box stays rendered" — the diff drops `test.fail()` and the "Known bug" comment from all four (table.spec.ts:60,69; code-block.spec.ts:42; math-block.spec.ts:70). My run of `bash scripts/e2e.sh` on table, code-block, math-block, _seed-table-gap and table-add-buttons specs: 24 passed, exit 0, all four targets included. The code and math tests also assert the cursor stays on "End line.".
- [met] A click right of a plain text line still puts the cursor at the end of that line — the new E2E test table.spec.ts:78 asserts the press lands on `DIV.cm-content`, types "X" and reads "After line.X" (passed in my run). The unit test "returns null for a press in the content padding level with a text line" confirms `bandClickTarget` leaves that press to CodeMirror's default.
- [met] The table `+` row and `+` column buttons still work (`table-add-buttons.spec.ts` stays green) — both tests passed in my run (table-add-buttons.spec.ts:16,31). The buttons stop `mousedown` (widgets.ts attachAddButtons), so the new wrapper branch never sees them.

## Checks I ran

- `pnpm check`: 0 errors, 0 warnings.
- `pnpm vitest run` on block-band-click.test.ts, src/tests/lib/architecture, wikilink-click-capture.test.ts and table-empty-cells.test.ts: 11 files, 126 tests, all passed.
- Red check: I restored `block-band-click.ts` from main and ran block-band-click.test.ts. The two new behaviour tests failed ("content padding level with a block", "table wrapper padding"), 20 passed. Then I restored the file from HEAD and the worktree was clean.
- E2E: the five specs listed above, 24/24 passed.
- My test verdict rests on: `src/tests/lib/core/markdown-editor/extensions/live-preview/core/block-band-click.test.ts`, `src/tests/lib/architecture/*`, `e2e/specs/live-preview/click-reveal/{table,code-block,math-block,_seed-table-gap,table-add-buttons}.spec.ts`. The full vitest suite, `pnpm build` and the whole `e2e/specs/live-preview` gate belong to deliver.
- Scope: the diff touches only `block-band-click.ts`, its unit test, the three click-reveal specs and the work/02 record. The layer baseline is untouched, the new import (`core` to `core`, `wikilink-click-target.ts`) creates no cycle, and indentation is tabs.
- Owner decisions (report.md section 3, Issue 01 Notes) checked. The owner chose "stay rendered" for all four zones and accepted the keyboard and source mode as the way to reach block-math source, so the fact that no mouse path remains for math after this change does not count as a regression.

## Findings

1. minor, docs/LIVE-PREVIEW.md:35: the `blockBandClick` entry says the press "must hit the `.cm-line` itself or a widget buffer". That is no longer true: `bandClickTarget` now also keeps the selection for a press on `.cm-content` that is level with a sole-block-widget line, and for a press on the table wrapper itself. Fix: add one sentence for the two zones (content padding level with a block line, and the `TABLE_WIDGET_CLASS` wrapper padding, both `{ pos: null }`).
2. nit, src/lib/core/markdown-editor/extensions/live-preview/core/block-band-click.ts:7-8 and :97-101: two doc comments are now incomplete. The `BandTarget` JSDoc lists `null` only for "the neighbour is another block, or there is none", and the `blockBandClick` JSDoc says the press "puts the cursor on the line next to the block". Neither covers the two new keep-the-selection zones. Fix: widen both comments to match the updated `bandClickTarget` JSDoc.
3. nit, block-band-click.ts:78-80: a press on `.cm-content` that is level with a block line's widget-buffer band, to the left or right of the line box, keeps the selection. A press inside that same band on the line itself moves the cursor to the neighbouring line (Issue 01). Both leave the widget rendered, so the owner rule holds, but the two adjacent zones behave differently. The build's discovery records this as a default it chose. Fix: none needed. Mention it in the docs line from finding 1 if you want it on record.
4. nit, block-band-click.ts:51-58: `lineAtY` calls `getBoundingClientRect` on each `.cm-line` child until one matches. It runs on every press on `.cm-content`, and on every mousemove over `.cm-content` during a band-origin drag. That is cheap for a viewport's worth of lines, so no change is needed now. `view.lineBlockAtHeight(clientY - view.documentTop)` plus `domAtPos` would be O(log n) if it ever shows up in a profile.
5. nit, e2e/specs/live-preview/click-reveal/table.spec.ts:60-76: the two table targets check only that the cursor is not on a `|` line (`not.toMatch(/^\|/)`). The code and math specs pin "End line.". The unit test does check that the selection is unchanged for both zones, so the "cursor left where it was" rule is covered there, not in E2E. Fix (optional): assert `toBe('End line.')` in both table tests.
6. nit, block-band-click.test.ts: no unit test covers a band-origin drag that passes over the new `.cm-content` zone. In `get`, `band.pos` is `null`, so `head = anchor`. Fix (optional): extend the existing drag test with a mousemove whose target is `contentDOM`, level with the block line.

## Resolution

1. Fixed: the `blockBandClick` entry in `docs/LIVE-PREVIEW.md` now names the two keep-the-selection zones (`.cm-content` padding level with a sole-block-widget line, the `TABLE_WIDGET_CLASS` wrapper padding).
2. Fixed: the `BandTarget` and `blockBandClick` JSDoc now list those zones.
3. Recorded in the same docs entry (padding beside the band keeps the selection, the band on the line moves it to the neighbour; both keep the block rendered). No code change.
4. No change, as the finding says: `lineAtY` stays a viewport-scale scan until a profile shows a cost.
5. Fixed: both table targets in `table.spec.ts` now assert the cursor stays on "End line."; the spec passes (8/8).
6. Fixed: new unit test "a drag from the band over the content padding level with the block keeps the head on the band target"; it fails against main's `block-band-click.ts` and passes on the branch.
