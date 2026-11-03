# Issue 08 discovery: table bottom padding

No `spec.md` exists for this feature; the Issue is the source.

## Files that change

- `src/lib/core/markdown-editor/extensions/live-preview/styles.ts:335-340` `.cm-lp-table-wrapper` `paddingBottom: 24px` -> `8px`.
- `styles.ts:366-372` `.cm-lp-table-add-col` `bottom: 24px` -> `8px`, so the column button still ends at the table's bottom edge. Width (20px) and the wrapper's `paddingRight: 24px` stay.
- `styles.ts:373-379` `.cm-lp-table-add-row` `height: 20px` -> `8px`, with a smaller `+` (font-size 8px) so the glyph fits.
- `e2e/specs/live-preview/click-reveal/table.spec.ts`: new gap test (written first, fails on main); the corner test's `dy: -12` follows the padding to land in the 8px strip right of the row button and below the column button.

## Plan

1. E2E test: gap below (next visible line's top minus `table.cm-lp-table` bottom) <= gap above (table top minus previous visible line's bottom) + 12. Run it, see it fail.
2. CSS change above. Re-run `table.spec.ts`, `table-add-buttons.spec.ts`, `_seed-table-gap.spec.ts`.

## Prior-art tests

- `table.spec.ts` band tests, `_seed-table-gap.spec.ts` (`lineBandProbe`), `table-add-buttons.spec.ts` (`+row` click adds a row).
- No vitest asserts these CSS values (grep for `24px`/`paddingBottom` in the table tests): no unit seam; E2E is the regression test.

## Risks and defaults

- Default: the column button's `bottom` follows the new padding (it is tied to it, not to the button's own look); "keep the + column button as is" read as its width and the right padding.
- The 8px row button is a smaller hover target. Owner chose this (Issue Notes).
- `blank band below ... under the +row button` (dy 12 below the wrapper) depends on the widget-buffer band being > 12px; it is unaffected by the padding, kept as is.
