VERDICT: APPROVED

## Previous findings

| # | Severity | Status | Evidence |
|---|----------|--------|----------|
| 1 | minor | resolved | `docs/LIVE-PREVIEW.md:35`: the `blockBandClick` entry now names both keep-the-selection zones (`.cm-content` padding level with a sole-block-widget line, `TABLE_WIDGET_CLASS` wrapper padding), and they match `bandClickTarget` (block-band-click.ts:80-85). |
| 2 | nit | resolved | `BandTarget` JSDoc (block-band-click.ts:5-11) and `blockBandClick` JSDoc (:101-109) now list the zones. Comment-only change; the code is the same as at 821f5f49. |
| 3 | nit | resolved | Recorded in the same docs sentence: padding beside the band keeps the selection, the band on the line moves it to the neighbour, both keep the block rendered. No code change was asked for. |
| 4 | nit | rejection stands | The finding itself said no change is needed. `lineAtY` scans only the rendered `.cm-content` children, which is viewport-scale. |
| 5 | nit | resolved | `table.spec.ts:66,75` now assert `toBe('End line.')`. `openAndSettle` (e2e/fixtures/click-reveal.ts:16-28) puts the cursor on "End line." first, so the assertion pins "cursor left where it was". My run: table.spec.ts + table-add-buttons.spec.ts, 10 passed, exit 0. |
| 6 | nit | resolved | New unit test "a drag from the band over the content padding level with the block keeps the head on the band target" (block-band-click.test.ts:171-182). Red check: with main's `block-band-click.ts` it fails; on HEAD it passes (23/23). The file was restored and the worktree is clean. |

## Acceptance criteria re-checked

- [met] These tests pass with `test.fail()` removed: `table.spec.ts` "bottom-right corner of the wrapper stays rendered" and "20px right of the line box, at the table vertical center, stays rendered"; `code-block.spec.ts` "margin right of the line box keeps it rendered"; `math-block.spec.ts` "20px right of the line box stays rendered" — the fixes tightened only the two table targets, and my run of `bash scripts/e2e.sh` on table.spec.ts and table-add-buttons.spec.ts passed 10/10 (exit 0). The fixes did not touch the code-block or math-block specs or any code path (source change is comments only), so round 1's passing run of them still applies; the full `e2e/specs/live-preview` gate is deliver's.
- [met] The table `+` row and `+` column buttons still work (`table-add-buttons.spec.ts` stays green) — both tests in table-add-buttons.spec.ts passed in my run.

## Findings

None open or new. The fix diff (821f5f49..9b462e13) touches only docs/LIVE-PREVIEW.md, JSDoc in block-band-click.ts, two assertions in table.spec.ts (made stricter, not weaker), one added unit test and the work/02 review record. No test was weakened or deleted, no scope creep, layer baseline untouched.

## Checks I ran

- `pnpm check`: 0 errors, 0 warnings.
- `pnpm vitest run src/tests/lib/core/markdown-editor/extensions/live-preview/core/block-band-click.test.ts`: 23 passed.
- Red check of the new unit test against main's `block-band-click.ts`: failed as expected.
- `bash scripts/e2e.sh` on `e2e/specs/live-preview/click-reveal/table.spec.ts` and `table-add-buttons.spec.ts`: 10 passed.
- Not run: the full vitest suite, `pnpm build` and the whole E2E gate (deliver's).
