# Discovery: Issue 03 (padding click above the first body line)

No `spec.md` for this feature; `report.md` section 2.2 is the source.

## Plan: remap a press that lands in the hidden frontmatter

Same mechanism as Issue 01 (`work/01`, `core/block-band-click.ts`): an `EditorView.mouseSelectionStyle`.
- `plugins/frontmatter-field.ts`: new `frontmatterClick` style. On a primary press, if `posAtCoords(event, false)` falls inside the hidden frontmatter (`0 .. closing-fence line end`, read from `frontmatterField`'s own decorations), the cursor goes to the start of the first body line. Drag/shift heads that fall in the frontmatter are clamped to that same position. Any other press returns `null` (CodeMirror's default, `blockBandClick` first).
- `live-preview.ts:47`: add it to `BLOCK_EXTENSIONS.frontmatter`, so the Troubleshooting kill-switch that shows the frontmatter also drops the remap.
- `hideLines` and the other block decorators are not touched: no atomic ranges, so Issue 01's band remap and the table/code/math/mermaid hidden lines keep their behavior.

Differences from Issue 01: the trigger is the mapped position (the press target is `.cm-content`, not a `.cm-line`), and the target is fixed (first body line start), not a DOM sibling.

## Tests
- Unit, jsdom, real `livePreviewExtensions` (prior art `core/block-band-click.test.ts`): new `plugins/frontmatter-field-click.test.ts`. `posAtCoords` / `posAndSideAtCoords` stubbed to position 0 (jsdom has no layout), as the padding click maps there in Chromium. Failing first: click + `insertNewlineAndIndent` leaves the frontmatter bytes unchanged.
- E2E: drop `test.fail()` in `click-reveal/frontmatter.spec.ts`; add an ArrowUp test pinning today's behavior.

## Today's ArrowUp (probed in Chromium before the change)
From "First body line." ArrowUp puts the active line on the first (hidden) frontmatter line; more ArrowUp presses stay there; the frontmatter stays hidden (3 hidden lines). Typing a character then lands at the start of "First body line." (DOM-driven input). The fix is mouse-only, so this does not change.

## Defaults / risks
- Frontmatter with no body line after it (doc ends at the closing fence): no remap, default behavior.
- A drag that starts in the body and moves into the padding uses CodeMirror's default (not this Issue).
- Chromium only in E2E; WebKit not covered.
