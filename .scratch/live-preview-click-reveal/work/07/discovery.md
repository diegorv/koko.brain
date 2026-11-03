# Discovery: Issue 07 (blank space left of a block widget)

No `spec.md` for this feature. Repeats the pattern of `work/01` and `work/02`
(`blockBandClick` returns `{ pos: null }` for "keep the selection"); only the
zone differs.

## Reproduced (E2E probe, Chromium, 1280px window)
- Press at the widget line's left edge + 2px, at the widget's vertical center:
  `elementFromPoint` is the widget's own `DIV.cm-line` (CodeMirror's line
  padding `0 2px 0 6px`: line left 532, widget left 538). `bandClickTarget`
  sees `dir === 0` and returns `null`, so CodeMirror's default reveals.
- Same result (revealed) for table, fenced and indented code, math block,
  markdown image, wikilink image embed, note embed, audio, video, collection,
  meta-bind button, meta-bind button error. Mermaid and queryjs were unclear in
  the first probe (late render, wrong selector); their left-side tests, run
  against the unfixed code, failed too: all 13 widgets shared the cause.
- Left of the line box, in the `.cm-content` padding: `DIV.cm-content`, already
  kept by Issue 02. Outside `.cm-content` is another pane (sidebar), not the editor.

## Files
- `src/lib/core/markdown-editor/extensions/live-preview/core/block-band-click.ts:95`:
  `dir === 0` returns `{ pos: null }` instead of `null`. The press target there is
  the widget's `.cm-line` (or a buffer) level with the widget box: the line's
  horizontal padding beside the widget. Doc comments updated.
- `src/tests/.../live-preview/core/block-band-click.test.ts`: the test
  "returns null for a press level with the widget box" asserted the bug; it now
  expects `{ pos: null }`, plus a click test (cursor and block kept).
- E2E: `table.spec.ts` gets the left-side test (cursor stays on "End line.")
  and a text-line left-padding test (cursor at line start); one left-side test
  per other widget spec that revealed.

## Defaults taken
- The press point is `line.left + 2` (inside the 6px line padding), at the
  widget's vertical center; the same zone on the 2px right padding is covered
  by the same branch.
- A drag starting there selects nothing (as the other keep-selection zones).

## Risks
- WebKit not covered (owner check). A widget whose line padding differs is
  still the same branch, since the decision is by DOM target and `clientY`.
