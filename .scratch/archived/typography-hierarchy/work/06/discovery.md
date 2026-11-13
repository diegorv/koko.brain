# Issue 06 discovery

No `spec.md`; the Issue is the spec. Same em-scaling pattern as `work/04/`; this Issue only adds the floor and the leftovers.

## Files that change

- `plugins/queryjs/kb-ui.ts:741,784`: heatmap graph `0.7em` -> `max(11px, 0.7em)`, box cells `1em` -> `max(11px, 1em)` (redundant under the floored graph, kept because the Issue names it).
- `features/collection/collection-block-widget.ts`: `max(11px, <em>)` on the calendar "+N" (:243, 0.8em), linear day numbers (:301, 0.8em), lane "+N" (:323, 0.9em) and bar titles (:360, 0.8em). The Issue's 319/354 are pre-Issue-05 line numbers for the same elements.
- Bar geometry (:270-276,330-332,360): bar height (`1.4em`) and `top` are in the bar's own em, so they follow the floored font. The day cell height is in the cell's em (`1.12em` = 1.4 x 0.8), which breaks once `max()` picks 11px. Fix: `BAR_FONT = 'max(11px, 0.8em)'` and cell height `calc(lanes * (1.4 * max(11px, 0.8em) + 1px) + 1px)`, the same expression evaluated in the cell, so it equals the bar height at any editor font. jsdom keeps `max()` and this `calc` intact (probed).
- `live-preview/styles.ts:~905`: new `.cm-lp-qjs-error .cm-lp-qjs-run { fontSize: 'calc(0.8em / 0.95)' }` cancels the error wrapper's 0.95em, so Run again = first-run 0.8em of the block.
- `features/collection/expression/evaluator.ts:383,391`: badge and progress text `12px` -> `0.85em`.

## Tests (prior art: the em tests from Issue 04)

- `styles.test.ts`: tighten the px scan to any `px` inside a font-size value, with a named `BLOCK_TEXT_FLOOR` exception (`max(11px, <n>em)`, used by no theme rule today); Run again size equals first-run size.
- `kb-ui.test.ts`: em-only scan accepts the floor only on the heatmap graph and its box cells, and requires it there; replace the ratio floor test with one that resolves the `max()` string at 8px and 19px editor fonts.
- `collection-block-widget.test.ts`: same strict split for the floored elements; floor resolved at 8px and 19px; lane-cap cell height uses the new calc; bar font `max(11px, 0.8em)`.
- `methods.test.ts`: badge and progress HTML carry `font-size:0.85em`, no px font size.

## Defaults taken

- "Default editor font" = 19px (Issue 05 landed). Resolved there, every floored element is already >= 11px (smallest: lane "+N" 19 x 0.85 x 0.9 x 0.85 x 0.9 = 11.1px), so the default look is unchanged.
- Badge/progress `0.85em`: 12.4px in a widget cell at 19px (19 x 0.85 x 0.9) and 11.9px in the Svelte table view (text-sm 14px), against 12px today. No floor on them (not asked).
- The `max()` resolution in tests is a small helper (em multiply, `max(a px, b em)`); jsdom computes no font sizes, so the string on the element is the real assertion.

## Risks

- The empty linear row height (`1.4em` of the cell) is unrelated to bars and stays.
- Owner checks (LP-PROFILE, 8px/32px visual) stay with the owner.
