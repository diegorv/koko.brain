# Issue 06 discovery: remove the lastCursorLine gate

Paths below are under `src/lib/core/markdown-editor/extensions/live-preview/`.

## Files that would change
- `core/check-update-action.ts:11-16,31-38`: drop the `lastCursorLine` parameter and its same-line `'none'` branch; `selectionSet` returns `'rebuild'`.
- `core/block-decorator.ts:17-18,59,67,71,85-87`: drop the field, constructor line and update line.
- `inline/inline-formatting-plugin.ts:142,148,156,164,167`; `plugins/image-plugin.ts:56-66`, `footnote-plugin.ts:35-45`, `wikilink-embed-plugin.ts:37-47`, `meta-bind-input-plugin.ts:33-43`: same.
- Tests asserting `lastCursorLine`: `core/block-decorator.test.ts:76,141,144-154`, `inline/inline-formatting-plugin.test.ts:257,294,324`.
- Docs: `CLAUDE.md:237,239` (rules 4-5), `docs/LIVE-PREVIEW.md:35,84,94-103,181`, `docs/adr/0008-...md:64,71`.

## Plan
1. Measure first (Issue's stop rule). Done: see findings `## Issue 06 measurement`.
2. Only if small: remove the parameter and every caller in one commit, rewrite rules 4-5.
3. Regression test: jsdom `EditorView` with the full stack (`pipeline-dom.test.ts` mount), bullet line + H1 line, move the cursor between them with a `select` transaction (jsdom has no geometry for `cursorLineUp/Down`, see `keyboard-reveal.test.ts:27-30`), assert `cm-formatting-block-visible` only on the new line; the "with scroll" variant through the `viewportUpdate` stand-in (`inline-formatting-plugin.test.ts:263-280`).
4. Pure scroll: existing `isPureScroll` tests stay as the proof.

## Result of step 1
1008 lines: ~2.9 ms JS per rebuild; 2016 lines: ~5.0 ms; 6000 lines: ~12.3 ms JS, 15.4 ms per
`dispatch()`. The 11 full-document block decorators are 88% of it at 6000 lines and scale
linearly. Not "a few ms" on a large note, so the Issue stops here per its own rule.

## Options for the user
- A: remove the gate as specified; a 6000-line note pays ~12 ms JS on every ArrowLeft/Right
  (it already pays it on every typed character and every line change).
- B: stateless replacement: rebuild only when the set of lines touched by
  `update.startState.selection` differs from `update.state.selection`. No memory across updates
  (both selections are in the same ViewUpdate). Sound because every skipped update keeps the same
  line set, so the skip is transitive; drag skips end in the release rebuild. Deviates from the
  recorded decision ("rebuild on every selectionSet").
- C: keep the gate and close the Issue with the measurement only.
