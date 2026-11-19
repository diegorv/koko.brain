# 007 discovery: clipboard events inside meta-bind controls

No `spec.md` in `.scratch/open-itens/`; the Issue is the spec.

## Files that change

- `src/lib/core/markdown-editor/extensions/live-preview/core/form-control-events.ts:2-11`: add `paste`, `cut`, `copy`, `drop` to `CONTROL_EVENT_TYPES`; update the set's doc comment and the function's JSDoc (it says "key, input and composition events" only).
- `src/tests/lib/core/markdown-editor/extensions/live-preview/core/form-control-events.test.ts`: clipboard (+ drop) events from input/select/textarea return true; paste on a `<label>` returns false.
- `src/tests/lib/core/markdown-editor/extensions/live-preview/meta-bind-input-keydown.test.ts`: paste and cut on the rendered number input leave `view.state.doc` unchanged (failing first); paste into the editor body still inserts, through the default path, the TSV handler and the HTML-link handler.

## Why one set entry is enough

`InputState.handleEvent` (@codemirror/view 6.43.15, dist/index.js:4605-4614) returns before `runHandlers` when `eventBelongsToEditor` (:4921-4931) is false, and that walks up to `contentDOM` asking each widget's `ignoreEvent`. All `EditorView.domEventHandlers` (pasteTsvHandler, pasteHtmlLinkHandler) and CodeMirror's built-in paste/cut/copy/drop handlers run from `runHandlers`, so a widget that ignores the event skips all of them. Callers of `isFormControlInputEvent`: widgets.ts:461 (table), :865 (select), :1010 (number/date/text), :1052 (toggle), widgets/code-block-widget.ts:150 (language select). All gain the clipboard routing; for each, the native control then handles the event.

## Plan

1. Commit this file.
2. Red: add the keydown-file paste/cut tests and the form-control-events tests; run both files, see them fail.
3. Green: extend the set; run both files.
4. Body-paste regression tests (default, TSV, HTML-link) pass before and after (they pin current behavior, not a bug).
5. Targeted checks: `pnpm check`, both test files, plus `meta-bind-input-widgets.test.ts` and the code-block widget tests (other `ignoreEvent` callers).

## Prior art

- Issue 47 of audit-2026-11-05 (commit a7cdfafe9) added the key events; the keydown test file is its test. Copy its `mount`/`control` helpers.
- jsdom has no `ClipboardEvent` constructor with data; build `new Event('paste', { bubbles: true, cancelable: true })` and `Object.defineProperty(ev, 'clipboardData', { value: { getData } })`, as the Issue says.

## Risks / defaults

- `drop` included (the Issue lists it in parentheses). Dragover/dragenter not added: CodeMirror's dragover only paints the drop cursor and writes nothing.
- A test cannot prove the browser's native paste lands in the input (jsdom does not perform default actions); the tests assert the note is untouched and the event is not defaultPrevented, which is what lets the native paste run.
- Copy on the input with an empty editor selection only changed the clipboard; it gets the same routing, tested via the predicate.
