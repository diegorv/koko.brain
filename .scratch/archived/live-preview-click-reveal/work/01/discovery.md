# Discovery: Issue 01 (blank bands around block widgets)

No `spec.md` for this feature; `report.md` section 2.1 is the source.

## Route chosen: remap the band click (route 3)

A `EditorView.mouseSelectionStyle` extension in a new `live-preview/core/block-band-click.ts`, installed by `livePreviewExtensions` (`live-preview.ts:79-83`). On a primary mousedown whose target is a `.cm-line` (or its `img.cm-widgetBuffer`) holding nothing but buffers and one block-level widget element, with `clientY` above or below that element's box, it returns a selection style that puts the cursor on the nearest visible `.cm-line` sibling: end of the line above, start of the line below (siblings with `cm-lp-hidden-line` are skipped). When that sibling is itself a band line (two adjacent blocks) or not a `.cm-line`, the selection is left as it was. Drag and shift-extend start from the remapped position.

Why not the others:
- `display: inline-block; width: 100%` per widget root: 14 roots with their own margins (a margin is still inside the line box, so it stays a band), a visible spacing change on every block the owner would have to re-check, and WebKit untested.
- `block: true`: needs the ViewPlugin decorators moved to StateFields, and images/embeds can sit mid-line.
- The remap keeps the layout pixel-identical, covers all 14 widgets (and any future one) in one place, and is browser-agnostic logic over DOM structure.

## Files
- new `src/lib/core/markdown-editor/extensions/live-preview/core/block-band-click.ts`; `live-preview.ts:82` adds it.
- `widgets/meta-bind-button-widget.ts:59-74`: `MetaBindButtonErrorWidget.ignoreEvent()` returns false so a click on the box reaches CodeMirror and reveals the YAML.
- E2E: the 27 band tests (drop `test.fail()`), `adjacent-block-widgets.spec.ts`, `meta-bind.spec.ts:155-176` (keyboard), `e2e/fixtures/click-reveal.ts` (`ClickResult.inOwnLine`).

## Tests
- Unit, jsdom, real `livePreviewExtensions` (prior art: `core/mouse-selecting.test.ts`, `arrow-reveal.test.ts`): new `src/tests/.../live-preview/core/block-band-click.test.ts`, stubbing only the widget's `getBoundingClientRect` (jsdom has no layout). Error widget `ignoreEvent` in a widget test.
- E2E band tests: `clickAtOffset` reports `inOwnLine` (the hit element's `.cm-line` contains the widget); every band test asserts it, replacing the `hitLine` not-null / "not the widget" checks.

## Defaults taken
- Cursor after a band click: the neighbouring line, as the Issue says. Band tests that expected the cursor to stay on "End line." (report 2.1: "the probe's choice") now expect the blank line next to the block (`''`), or "### Intention" in `_seed-table-gap.spec.ts`.
- Adjacent blocks: a click in the gap reveals neither block and leaves the cursor where it was ("blank space around a widget never reveals it").
- Mid-line images/embeds (text on the same line) are not band lines: default behavior.

## Risks
- Relies on CodeMirror's `.cm-line` / `cm-widgetBuffer` DOM. A line nested in a CM block wrapper has no sibling at the wrapper edge: no-op, no reveal.
- WebKit not covered by E2E (owner check in the Issue).
