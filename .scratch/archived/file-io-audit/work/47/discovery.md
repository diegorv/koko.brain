# Issue 47 discovery

## Files that change

- `src/lib/core/markdown-editor/extensions/live-preview/widgets.ts:747` (`MetaBindSelectWidget.ignoreEvent`), `:847` (`MetaBindTextInputWidget`), `:888` (`MetaBindToggleWidget`): `ignoreEvent(event)` delegates to the new helper.
- `src/lib/core/markdown-editor/extensions/live-preview/widgets/code-block-widget.ts:141` (`CodeBlockWidget.ignoreEvent`): same.
- New `src/lib/core/markdown-editor/extensions/live-preview/core/form-control-events.ts`: `isFormControlInputEvent(event)` returns `true` for `keydown` / `keyup` / `keypress` / `beforeinput` / `input` / `compositionstart|update|end` whose target is (inside) an `input`, `select` or `textarea`; `false` otherwise (mouse events keep reaching CodeMirror as before). Lives in `core/` so `widgets.ts` and `widgets/code-block-widget.ts` both import it without a cycle.

## Plan

1. Move `.scratch/editor-data-safety/repro/lp-plugins/meta-bind-input-keydown.test.ts` to `src/tests/lib/core/markdown-editor/extensions/live-preview/meta-bind-input-keydown.test.ts` (import `../../test-helpers`), extend it with: date input, `type="text"` fallback (`count: 1,000`), selection on another line, Tab, Enter on toggle and on select, `defaultPrevented === false`. Run, see it fail.
2. Code-block select test in `widgets/code-block-widget.test.ts`: mount `codeBlockField` with the real markdown language and the keymap (`defaultKeymap`, `historyKeymap`, `indentWithTab`), focus the `<select>`, press Backspace / ArrowDown / ArrowUp; doc and selection unchanged.
3. Unit test for the helper in `src/tests/.../live-preview/core/form-control-events.test.ts` (key/input/composition from controls true; mousedown from control false; keydown from a non-control element false).
4. Implement helper + four `ignoreEvent` changes; rerun.

## Prior art

- Repro test above (mounts real `metaBindInputPlugin` + keymap).
- Existing Enter commit / Escape revert tests in `meta-bind-input-widgets.test.ts` stay as they are (criterion 6).
- Click criterion: add a test that a `mousedown` on the input is stopped (does not move the editor selection), mounted view.

## Risks

- CodeMirror's `eventBelongsToEditor` (`@codemirror/view` index.js ~4921) is what consults `ignoreEvent`; mouse events must stay `false` so the `mousedown` routing is unchanged (rule 11).
- Escape in the number input already `preventDefault`s; with `ignoreEvent` true the editor no longer sees it either way. No editor Escape behavior relied on it.
- `TableWidget` (widgets.ts:403) also reuses `createMetaBindSelect` and returns `false`; out of scope for this Issue (not one of the four named widgets), noted in the report.

## Defaults taken

- Helper name `isFormControlInputEvent`; one helper, called by all four widgets.
- Owner WebKit check is manual and stays open.
