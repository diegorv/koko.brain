# Issue 04 discovery: right-click inside a selection keeps it

No `spec.md` in `.scratch/ux-polish/`; the Issue file is the spec.

## Files that change

- `src/lib/core/markdown-editor/MarkdownEditor.svelte:268-282`
  - `handleContextMenu` (268-274): always dispatches `EditorSelection.cursor(pos)`.
  - `handleCopyBlockLink` / `handleCopyBlockEmbed` (276-282): call `blockLinks.copyLink(view)` / `copyEmbed(view)`.
- `src/tests/lib/core/markdown-editor/MarkdownEditor.test.ts:136-156` (`context menu` describe).

`copyBlockLink` (`src/lib/features/copy-block-link/copy-block-link.service.ts:21`) reads `view.state.selection.main.head`; it is reached only through the injected `blockLinks` prop and does not change.

## Plan

1. A plain component variable `contextMenuPos: number | null` (not `$state`: nothing renders it).
2. `handleContextMenu`: store `pos` (null when `posAtCoords` misses); skip the dispatch when some
   non-empty range has `from <= pos <= to`; otherwise dispatch `EditorSelection.cursor(pos)` as today.
3. A shared helper used by both copy handlers: when `view.state.selection.main` is non-empty and
   `contextMenuPos !== null`, dispatch `EditorSelection.cursor(contextMenuPos)` first, then call
   `blockLinks.copyLink` / `copyEmbed`.
4. Update the `handleContextMenu` JSDoc.

## Tests (copy the existing `clickMenuItem` / `settle` helpers)

- Selection 0..5 on "First paragraph\nSecond line\n", `posAtCoords` stubbed on the view instance to
  return 2 (jsdom has no layout), `contextmenu` on the surface: selection stays anchor 0 / head 5.
  Fails on current code.
- Stub returns 18 (line 2): selection collapses to a cursor at 18.
- Selection 2..20 (head on line 2), stub returns 4, then "Copy link to block": the block id lands on
  line 1 and the copied link carries it.
- The two existing context-menu tests stay unchanged (their `posAtCoords` is unstubbed).

## Risks and defaults

- A right-click with `posAtCoords` returning null leaves `contextMenuPos` null; the copy handlers then
  act on the current head as today.
- Keyboard Cmd+Shift+L path untouched (does not go through these handlers).
- Gate: frontend only.
