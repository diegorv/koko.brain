# Discovery: Issue 04 (wikilink click inside a table cell)

No `spec.md` for this feature; `report.md` section 2.2 is the source.

## Root cause (confirmed by reading)
`MarkdownEditor.svelte:259` `handleEditorClick` (capture phase on the container) calls `resolveWikilinkClickPosition` (`wikilink-click-target.ts:54`). For any `.cm-lp-wikilink` it returns `view.posAtDOM(el)`; inside the table widget that is the widget's start (header line), so `followWikilinkClick` finds no wikilink there and does nothing, while `stopImmediatePropagation` keeps the cell's own handler (`widgets.ts:304`) from running.

## Plan
1. `wikilink-click-target.ts`: return `null` when the press target is inside `.cm-lp-table-wrapper`, before both the element path and the modifier path. The table widget owns its clicks: its cell link handler navigates, its `+` buttons stop propagation. The cell handler already calls `preventDefault` + `stopPropagation` at the `<a>`, so CodeMirror's contentDOM mousedown (drag-select arming) never runs.
2. `wikilink-navigation.ts`: split `followWikilinkClick` into `followWikilinkInfo(view, info)` (same-note anchor jump, else `followWikilink` with the anchor) and keep `followWikilinkClick(view, pos)` as the position lookup on top of it.
3. `widgets.ts` `renderCellContent`: parse the cell link with `findWikilinkInfoAtPosition(text, 0, match.index)` and call `followWikilinkInfo`. Today the cell handler drops `#heading` / `#^block` and would call `createNote('')` for `[[#heading]]`; this makes the cell behave like a link outside a table (the Issue's Notes). A missing target goes through `host.createNote` as before (create-on-click).

## Tests
- `src/tests/lib/core/markdown-editor/wikilink-click-capture.test.ts`: a `.cm-lp-wikilink` inside `.cm-lp-table-wrapper` resolves to `null` (plain and modifier click). Fails first.
- `src/tests/lib/core/markdown-editor/extensions/live-preview/table-widget.test.ts` ("cell wikilink click"): `[[Target#Heading]]` passes the heading anchor; a missing note calls `createNote`; `[[#Heading]]` moves the cursor and creates nothing. Existing assertions change `undefined` anchor to `{ heading: null, blockId: null }` (same as outside a table).
- `src/tests/lib/core/markdown-editor/editor-host.test.ts` keeps covering `followWikilinkClick`.
- E2E: drop `test.fail()` in `click-reveal/table-cell-controls.spec.ts`.

## Risks / defaults
- Other widgets that render `.cm-lp-wikilink` (embeds, callouts) are not touched: only the table is reported broken.
- A modifier click on a non-link area of the table now falls through to CodeMirror instead of scanning the table's header line for a wikilink (which opened the wrong link if the header held one).
- Chromium-only E2E; WebKit not covered.
