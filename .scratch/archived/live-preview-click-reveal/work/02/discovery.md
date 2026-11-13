# Discovery: Issue 02 (right of the line box, table wrapper corner)

No `spec.md` for this feature; `report.md` section 3 is the source. Repeats the
pattern of `work/01`: the same `blockBandClick` mouse-selection style, which
returns `{ pos: null }` ("keep the selection") for a press in blank space.

## Files
- `src/lib/core/markdown-editor/extensions/live-preview/core/block-band-click.ts:58-76`
  (`bandClickTarget`): two more zones return `{ pos: null }`.
  1. Target is `view.contentDOM` itself (its padding, left or right of every
     line box): find the `.cm-line` child of `contentDOM` whose box spans
     `clientY`; when that line holds a sole block widget (`soleBlockWidget`),
     keep the selection. A text line (or no line) returns `null`, so a click
     right of a plain line still goes to CodeMirror's default (end of line).
  2. Target is the table wrapper itself (`TABLE_WIDGET_CLASS`, from
     `wikilink-click-target.ts:35`), not the table or a button: the wrapper's
     padding (bottom-right corner) and the strip right of a narrow table.
     The `+` buttons stop `mousedown` (`widgets.ts:439,455`), so they never
     reach this code.
- `BandPress` gains `clientX`? Not needed: the line lookup is by `clientY` only.
- E2E: drop `test.fail()` and the "Known bug" comments in `table.spec.ts:61-80`,
  `code-block.spec.ts:42-44`, `math-block.spec.ts:70-72`.

## Tests
- Unit (jsdom, real `livePreviewExtensions`), extend
  `src/tests/.../live-preview/core/block-band-click.test.ts`: a press on
  `contentDOM` level with a code block line keeps the cursor and the block;
  a press on `contentDOM` level with a text line returns `null`; a press on the
  table wrapper keeps the cursor and the table; a press on a table cell still
  returns `null`. Line boxes stubbed as in the existing tests.
- E2E: the four tests above, plus `table-add-buttons.spec.ts`.

## Defaults taken
- Any press in `contentDOM` padding level with a block widget line keeps the
  selection (left padding too, and the parts of it level with the bands):
  "blank space around a widget never reveals it".
- A drag that starts in these zones selects nothing (same as the adjacent-block
  gap in Issue 01).
- A press inside the `.cm-line` but beside the widget box (not on the wrapper)
  stays as Issue 01 left it (`bandClickTarget` returns `null`); not in scope.

## Risks
- Lines nested in a CodeMirror block wrapper are not direct `contentDOM`
  children: no match, default behavior.
