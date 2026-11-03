# Issue 13 discovery: empty space under the doc and a drag into a band keep the block rendered

No `spec.md` exists for this feature; the Issue is the source.

## Files that change

- `src/lib/core/markdown-editor/extensions/live-preview/core/block-band-click.ts`
  - `bandClickTarget` `:82-85`: a press on `.cm-content` level with no line, below the last laid-out line (hidden lines skipped), when that line holds a sole block widget, returns `{ pos: null }` (keep the selection). A note ending with text still returns `null` (CodeMirror's default puts the cursor at the doc end).
  - New `bandDragHead` mouse style, `Prec.lowest` so `frontmatterClick` and `rectangularSelection()` (alt-drag, `setup/editor-extensions.ts:144`) still win: takes any other primary single click (detail 1) and reproduces CodeMirror's `basicMouseSelection` single-click path (`@codemirror/view` 6.43.15, `index.js:5080`: anchor/head from `posAndSideAtCoords`, shift extends, mod-click adds or removes a range), except a drag head that lands in a band goes to the band target (the start of the line after the block, the end of the line before it). A head in a zone that keeps the selection (`pos: null`) stays where the drag last put it. Double/triple clicks return `null` (default word/line selection).
- `live-preview.ts:84`: install `bandDragHead` next to `blockBandClick`.

## Plan (test-first)

1. `block-band-click.test.ts` (jsdom), failing first: press on `.cm-content` under a doc ending in a code block keeps the selection and the block; same for an image embed if jsdom renders its wrapper as a block; press under a doc ending with text puts the cursor at the doc end; drag from the end of "After line." into the band below the block stops at the start of the line after the block, block still rendered. `posAndSideAtCoords` is stubbed to map the band into the block (what CodeMirror does), since jsdom has no layout.
2. Implement; then drop `test.fail()` from `doc-edge-widgets.spec.ts:92` and `drag-select.spec.ts:80`.
3. Targeted checks: `pnpm check`, the test file above, the live-preview test folder; E2E `bash scripts/e2e.sh e2e/specs/live-preview` if it can run here.

## Prior art

- Existing `blockBandClick` tests in the same file (stubbed boxes, `click`, `mouseEvent`), the table test's `posAndSideAtCoords` stub.

## Defaults taken

- Empty space under the doc: the cursor stays where it was (the Issue's second option). The E2E criterion asserts the active line is still "End line.", and the line before the block in that fixture is a blank line, so moving there would fail it; it also matches the band below a last-line widget. Recorded in the Issue Notes.

## Risks

- `bandDragHead` handles every plain single click in live preview; it must match CodeMirror's default exactly outside bands (cursor assoc, mod-click removal). Source mode is unaffected (the compartment drops it).
