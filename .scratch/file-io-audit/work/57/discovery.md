# Issue 57 discovery

Repeats the Issue 47 pattern (`.scratch/file-io-audit/work/47/`): one more widget returns `isFormControlInputEvent(event)` from `ignoreEvent()`.

## Files that change

- `src/lib/core/markdown-editor/extensions/live-preview/widgets.ts:404` (`TableWidget.ignoreEvent`): `ignoreEvent(event: Event) { return isFormControlInputEvent(event); }`. The helper is already imported at :22.
- `src/tests/lib/core/markdown-editor/extensions/live-preview/table-widget.test.ts`: new describe block.

## Plan

1. Failing test: mount the real markdown state with `tableField`, `history()` and the keymap (`defaultKeymap`, `historyKeymap`, `indentWithTab`), on a doc with frontmatter `status: todo`, a line of text, and a table whose cell holds `` `INPUT[inlineSelect(todo, done):status]` ``; editor cursor at the end of the text line (outside the table, so the table renders). Focus `select.cm-lp-meta-bind-select`, dispatch `keydown` Enter, then Backspace (also Delete, Tab): doc unchanged. Plus: mousedown on the select does not move the editor cursor (today's routing).
2. Change `ignoreEvent`; rerun the file and the Issue 47 keydown / helper tests.

## What differs from 47

- Only `TableWidget`; the widget is mounted through the real `tableField` so CodeMirror's `eventBelongsToEditor` consults the real `ignoreEvent`.

## Risks

- The `+col` / `+row` buttons are `<button>`s, not form controls under the helper's selector, so their click routing is unchanged; mouse events still return `false`.
- jsdom has no layout: copy the `Range.getClientRects` stub from `meta-bind-input-keydown.test.ts`.

## Defaults taken

- Test lives in the existing `table-widget.test.ts` (the Issue names it as source).
