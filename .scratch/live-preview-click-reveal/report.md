# Live preview click behavior: E2E coverage report

Specs live in `e2e/specs/live-preview/click-reveal/`. Shared helpers: `e2e/fixtures/click-reveal.ts` (openAndSettle, clickAtOffset, lineBandProbe, isRevealed, activeLineText) and `e2e/fixtures/live-preview.ts`.

## 1. Summary

- 37 elements from the inventory, one spec each, plus the rewritten seed `_seed-table-gap.spec.ts`: 38 spec files, 125 tests.
- 86 tests pass and check behavior that is correct today.
- 39 tests are known bugs, marked `test.fail()` with a `// Known bug:` comment: the 30 confirmed in section 2 (4 distinct bugs; 27 of the 30 come from one root cause, 2.1) and 9 from the owner decisions of section 3.
- No test is skipped: the owner settled the 12 open zones on 2026-11-03 (section 3).
- 2 suspects were refuted. The verify step rewrote both tests (section 4).
- Full folder, run twice with `--workers=2 --retries=0` before the owner decisions: 113 passed, 12 skipped, 0 failed, 0 flaky, same per-test results both times. After the decisions: 125 passed.
- Each `test.fail` test was also run once with the marker removed. Every one fails at its bug assertion (widget count, source revealed, cursor line, tab or file content), not at a precondition.
- Chromium only. The Tauri macOS app runs in WebKit, which these specs do not cover.

## 2. Confirmed bugs

### 2.1 Blank band above and below block widgets reveals the source (27 tests, 14 elements)

What the user sees: a block widget has 20 to 28 px of blank space above and below its box. That space is part of the widget's own `.cm-line`. A click there, which looks like a click on empty margin, puts the cursor on the block's line and turns the widget into raw markdown. The layout jumps.

Root cause, shared by every row below: each plugin adds the widget as an inline `Decoration.replace` (no `block: true`), but the widget DOM is a `display:block` element. CodeMirror puts a `cm-widgetBuffer` `<img>` before and after an inline widget. Next to a block-level child, each buffer gets its own line box inside the same `.cm-line`. `posAtCoords` maps a click in those line boxes into the replaced range, and `revealPredicate` (core/reveal.ts) then drops the widget. `ignoreEvent()` does not help, because the event target is the `.cm-line` and not the widget.

Paths below are relative to `src/lib/core/markdown-editor/extensions/live-preview/`. Specs are in the click-reveal folder.

| Element | Zones | Decoration site | Spec: tests |
|---|---|---|---|
| Table | band above, band below the wrapper | plugins/table-field.ts:29 | table.spec.ts: "blank band above the table stays rendered", "blank band below the table wrapper, under the +row button, stays rendered"; _seed-table-gap.spec.ts: "click in the blank band below the table keeps it rendered" |
| Fenced code block | above, below | plugins/code-block-field.ts:34 | code-block.spec.ts: "blank band above the block keeps it rendered", "blank band below the block keeps it rendered" |
| Indented code block | above, below | plugins/code-block-field.ts:76 | indented-code-block.spec.ts: "blank band above the block stays rendered", "blank band below the block stays rendered" |
| Block math `$$` | above, below | plugins/block-math-field.ts:26 | math-block.spec.ts: "blank band above the block stays rendered", "blank band below the block stays rendered" |
| Mermaid | above, below | plugins/mermaid-field.ts:25 | mermaid.spec.ts: "blank band above the diagram stays rendered", "blank band below the diagram stays rendered" |
| Markdown image | above, below | plugins/image-plugin.ts:140 | image.spec.ts: "blank band above the image keeps it rendered", "blank band below the image keeps it rendered" |
| Wikilink image embed | above, below | plugins/wikilink-embed-plugin.ts:82 | wikilink-image-embed.spec.ts: "blank band above the embed keeps it rendered", "blank band below the embed keeps it rendered" |
| Wikilink note embed | above, below | plugins/wikilink-embed-plugin.ts:88 | wikilink-note-embed.spec.ts: "blank band above the embed keeps it rendered", "blank band below the embed keeps it rendered" |
| Audio player | above, below | plugins/audio-plugin.ts:31 | audio-player.spec.ts: "blank band above the player stays rendered", "blank band below the player stays rendered" |
| Video player | above, below | plugins/video-plugin.ts:31 | video-player.spec.ts: "blank band above the player stays rendered", "blank band below the player stays rendered" |
| Collection block | above, below | plugins/collection-block-field.ts:27 | collection-block.spec.ts: "blank band above the block stays rendered", "blank band below the block stays rendered" |
| QueryJS block | above, below | plugins/queryjs-block-field.ts:29 | queryjs-block.spec.ts: "blank band above the widget keeps it rendered", "blank band below the widget keeps it rendered" |
| Meta-bind button | below only | plugins/meta-bind-button-field.ts:26 | meta-bind-button.spec.ts: "blank band 2-20px below the container stays rendered" |
| Meta-bind button error | below only | plugins/meta-bind-button-field.ts:26 | meta-bind-button-error.spec.ts: "clicking the blank band below the error box keeps it rendered" |

Notes for whoever fixes this:
- One fix at the root would close all 27 cases. `block: true` widgets are not possible from the current ViewPlugins (`core/block-decorator.ts:59-62`, `image-plugin.ts:53`, `wikilink-embed-plugin.ts:34`; CodeMirror rejects block decorations from plugins), so that route means moving to StateFields; `display: inline-block` on the widget root or remapping the band click are the other routes (Issue 01). `adjacent-block-widgets.spec.ts` asserts the band behavior between two blocks and changes with the fix. It would also close the band above the meta-bind button, which `e2e/specs/live-preview/meta-bind.spec.ts` "button hides when cursor moves to its line" uses to reveal the YAML (it clicks at `box.y - 2`). That test and the owner decisions in section 3 have to be settled with the fix.
- For math block, mermaid, image, meta-bind button and the error box, `ignoreEvent()` is true on the widget body, so today the band is the only mouse path to the source. A fix needs some other way in.
- Some band tests check preconditions such as the band height or the hit element being `DIV.cm-line`. If a fix removes the band, those checks fail too, and `test.fail` stays green. A band test that does not turn red after the fix still needs rewriting.
- The band tests that check the cursor expect it on the blank line next to the block (`''`) or on "End line.". That was the probe's choice. Confirm it once the fix lands.

### 2.2 Other confirmed bugs (3 tests)

| Element | Zone | What the user sees | Root cause | Spec: test |
|---|---|---|---|---|
| Frontmatter | 16px top padding of `.cm-content`, above the first body line | The cursor lands on a hidden frontmatter line, not on "First body line.". Enter there inserts a newline at position 0, the frontmatter stops parsing and all its lines appear. | plugins/frontmatter-field.ts:22 calls hideLines (core/hide-lines.ts:17-18), which adds a CSS-hidden line plus a plain `Decoration.replace({})` for each line. `posAtCoords` maps the padding click to position 0, the start of the first hidden range; atomic ranges alone would not change that (Issue 03). | frontmatter.spec.ts: "clicking the 16px padding above the first body line moves the cursor there and keeps the frontmatter hidden" |
| Table cell wikilink | `a.cm-lp-wikilink` inside a td | Nothing happens. No tab opens and no note is created. The same link in a paragraph works. | The capture-phase mousedown handler in `src/lib/core/markdown-editor/MarkdownEditor.svelte:309` calls `resolveWikilinkClickPosition`, which returns `view.posAtDOM(el)` (wikilink-click-target.ts:56). For a link inside the table widget that is the header line, which has no wikilink, so following the link fails. The handler still calls `stopImmediatePropagation` (MarkdownEditor.svelte:263), so the cell's own mousedown handler in widgets.ts never runs. | table-cell-controls.spec.ts: "clicking a wikilink inside a table cell follows it and the source note keeps its table" |
| Meta-bind toggle | the checkbox | The click itself works (no reveal, cursor stays). The file gets `flag: "true"`, a YAML string, where it should get `flag: true`, so the property type changes. This is a write-type bug, not a click bug. It is already tracked as `.scratch/file-io-audit/issues/29-meta-bind-value-types.md`. | widgets.ts:898 passes `'true'`/`'false'` as strings to `dispatchMetaBindUpdate`, and the serializer quotes reserved literals. Unit tests meta-bind-writers.test.ts:124 and frontmatter-number-spelling.test.ts:115-123 pin the current output and must change with the fix. | meta-bind-toggle.spec.ts: "the checkbox zone: click writes flag as a YAML boolean" |

The meta-bind number input writes `count: "7"` the same way. meta-bind-text-input.spec.ts accepts both forms, so no test covers it. It probably belongs to Issue 29 too.

## 3. Owner decisions (settled 2026-11-03)

The owner picked, per row below: table corner, and the zones right of the table, code block and math block line boxes stay rendered (Issue 02); the bands above the meta-bind button and its error box stay rendered and a click on the error box opens the YAML (Issue 01); the code block header blank area keeps revealing; the note embed header opens the note (Issue 05); the horizontal rule keeps revealing; the task checkbox's current behavior is the contract; the numbered marker matches the bullet (Issue 06). The tests now assert those outcomes: the ones that pass today run as normal tests, the others carry `test.fail()`. The old error-box test that pinned "a click on the box does nothing" was replaced by "clicking the error box reveals the YAML". Follow-up Issues are in `issues/`.

The table below is what was open before the decision.

| Zone | Today | Choice A | Choice B |
|---|---|---|---|
| Table: bottom-right 24x24 corner of the wrapper (no control) | Reveals | Stay rendered (padding, not content) | Keep the reveal |
| Table: 20px right of the line box, in `.cm-content` padding | Reveals (the hit is `.cm-content`, outside any line) | Stay rendered | Keep the reveal (a click beside a line goes to that line) |
| Code block: 20px right of the line box | Reveals | Stay rendered | Keep the reveal |
| Math block: 20px right of the line box | Reveals | Stay rendered | Keep the reveal |
| Code block: blank part of the header | Reveals (the skipped test expects a reveal) | Keep it: the header is widget chrome and mouse events pass through | Make the header ignore clicks |
| Meta-bind button: band above the container | Reveals. meta-bind.spec.ts relies on it | Treat it as part of 2.1 and add another way to reach the YAML | Keep the band as the deliberate way in |
| Meta-bind button error: band above the box | Reveals. The box ignores clicks, so this band is the only mouse path to the invalid YAML | Stay rendered, and make a click on the error box open the YAML | Keep the band as the way in |
| Note embed header (`cursor:pointer`, no handler) | Nothing happens | Open the embedded note | Stay a no-op and drop the pointer cursor |
| Horizontal rule line | Reveals `---` | Keep the reveal (line rule) | Keep the rule rendered on click |
| Task checkbox | Toggles, no reveal, cursor stays. This relies on `preventDefault` alone, with no `stopPropagation` | Treat this as the contract and enable the test | Add `stopPropagation` as other controls do (CLAUDE.md Live Preview rule 11) |
| Bullet glyph `.cm-lp-ul-marker` | The cursor moves to the item and `-` is revealed | Keep this, and make the ordered marker match | Make both markers ignore clicks |
| Ordered number `.cm-lp-ol-marker` | The cursor does not move and nothing is revealed, which is the opposite of the bullet | Match the bullet (move the cursor and reveal) | Keep it, and make the bullet match |

## 4. Refuted suspects

- adjacent-block-widgets, gap between the js and py code blocks: not a bug. With no blank line between the blocks, the gap is only the two blocks' own bands, so any click there must reveal one of them. The midpoint click hit the shared boundary pixel, which CodeMirror gives to the upper line. The test now asserts that only the py block reveals.
- adjacent-block-widgets, gap between the py code block and the math block: not a bug, for the same reason. The test now asserts that only the math block reveals.

Probe-side test errors fixed before verify (not app bugs): the code-block band cursor expectation (`const x = 1;` contradicted the line rule), the wikilink hit-class check (the hit is a child span), the heading `toHaveText` check, and the meta-bind number regex.

## 5. Gaps

- A wikilink image embed of an existing image. Only the "not found" placeholder is tested.
- A note embed of an existing note, and clicks on content inside the embed.
- The meta-bind `date()` input, and unknown `INPUT[...]` types.
- Inline formatting marks (bold, italic, strikethrough, inline code), hard breaks, autolinks and bare URLs. Only `[link]` is clicked, and Cmd+click is checked only by the cursor not moving: the opener mock records no calls.
- A block reference `^blk` clicked directly, and the footnote definition line `[^1]: def`.
- Callouts: a click on the title line, clicks on a collapsed callout, and nested callouts.
- Tables: a header-cell click, and cells holding formatting or a checkbox.
- The wikilink alias `[[Target|alias]]`, and Cmd+click on a wikilink.
- Block widgets on the first or last line of the document (the band above a widget at doc start, the band below one at doc end).
- A drag-select that starts or ends in a band or on a widget.
- The collection calendar and linear-calendar views, the collection empty and error states, and the QueryJS output-text variant of a body click.
- Untested finding: a click in the audio wrapper's own 4px padding keeps the player rendered but moves the cursor from "End line." to "Above line.".
- Real media playback (no media loads in E2E), other editor widths and zoom levels, dark theme, and WebKit.

## 6. How to run

```bash
bash scripts/e2e.sh e2e/specs/live-preview/click-reveal/
```

Expected result today: 125 passed, including the 39 `test.fail` known bugs. A known-bug test that turns red means its bug is fixed: remove its `test.fail()` and its `Known bug:` comment.
