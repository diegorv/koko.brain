# Issue 06 discovery: ordered marker click matches the bullet

## Files that change

- `src/lib/core/markdown-editor/extensions/live-preview/widgets.ts:57-75` `OrderedListMarkerWidget.ignoreEvent()` returns `true`, so CodeMirror skips the mousedown on the `1.` span and the cursor never moves.
- `e2e/specs/live-preview/click-reveal/ordered-marker.spec.ts:11-21` drop `test.fail()` and its "Known bug" comment.

## Reproduction

With `test.fail()` removed, `bash scripts/e2e.sh .../ordered-marker.spec.ts` fails: the
active line stays "End line." after the click (hit is `SPAN.cm-lp-ol-marker`).
The bullet spec passes with identical widget code (`ignoreEvent() { return true; }`), so the
bullet only works through the browser's native caret placement. Likely cause, not
verified: `.cm-lp-ol-marker` is `text-align: right` in a `min-width: 1.5em` box, so the
center of the box is blank padding where Chrome places no caret; the bullet is
`text-align: center`, so the center hits the glyph.

## Plan

`OrderedListMarkerWidget.ignoreEvent()` returns `false`: CodeMirror handles the mousedown,
`posAtCoords` puts the cursor next to the widget on its line, and the inline plugin
reveals `1. `. Verified locally: the spec passes with that change.

## Tests

- E2E `ordered-marker.spec.ts` is the regression test (no unit seam: the behavior is
  CodeMirror's mouse handling in a real browser).
- Keep green: `bullet-marker.spec.ts`, `e2e/specs/live-preview/lists.spec.ts`.
- Unit: `simple-widget-handlers.test.ts` (widget construction unchanged).

## Risks and defaults

- The bullet widget is left as is (Issue asks only for the ordered marker; its spec is green).
- Drag-select starting on the number now goes through CodeMirror, like text. Acceptable.
