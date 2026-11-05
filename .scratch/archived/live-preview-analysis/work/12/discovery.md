# Issue 12 discovery: multi-line image and link replaces

## Files that change
- `src/lib/core/markdown-editor/extensions/live-preview/plugins/image-plugin.ts:114-157`
  (`buildImageDecorations`): both widget replaces (:137 inline, :150 reference) cover the
  whole `Image` node. Add one guard after the reveal check: an `Image` node whose `from` and
  `to` sit on different lines renders as source (`return false`). The widget replaces the
  whole node, so there is no partial replace to keep.
- `src/lib/core/markdown-editor/extensions/live-preview/inline/handlers/markdown-link-handlers.ts:24`
  (`linkHandler`): drop the whole-node line check from `f7638b13`. Compute the two hidden
  ranges first; if either contains a `\n`, return (source). Otherwise push them plus the
  `linkTextDeco` mark. A mark may span lines, so `[a\nb](/url)` is styled again.

## Plan
1. Image: failing tests first, then the guard. Commit.
2. Link: failing test for `[a\nb](/url)` (styled, no replace contains `\n`), then the change.
   Existing multi-line tests (unit + jsdom) must stay green. Commit.

## Tests (prior art)
- `src/tests/.../live-preview/plugins/image-plugin.test.ts`: `buildImages` helper; add
  "no decoration for a multi-line image" cases (inline + resolved reference).
- `src/tests/.../live-preview/inline/pipeline-dom.test.ts:226-252`: the `f7638b13`
  `mountView` + `not.toThrow` table. Add an image table (mounted `EditorView`, cursor on the
  leading `plain` line) and a `[a\nb](/url)` case asserting `.cm-lp-link` renders.
- `src/tests/.../inline/handlers/markdown-link-handlers.test.ts:76-91`: add `[a\nb](/url)`
  and `[a\nb][ref]` styled cases next to the existing three source-rendering shapes.

## Risks
- Lezer may not parse `![a](\n/url)` as an `Image` with a URL; the test checks the shape
  parses as a multi-line `Image` so it cannot pass vacuously.
- The image RangeError was not reproduced; the jsdom test is the reproduction attempt.

## Defaults taken
- "Skip only the replace ranges that would contain a newline": for a link, if any hidden
  range would cross a line, the whole link renders as source (as today) rather than hiding
  the single-line half; a half-hidden link (`[` gone, `](\n/url)` raw) reads worse than raw.
- Multi-line images render as source; no attempt to place the widget on one line.
