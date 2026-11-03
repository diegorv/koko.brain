VERDICT: APPROVED

## Acceptance criteria

- [met] Failing test first: a mounted table with a meta-bind select in a cell, the editor cursor on another line; Enter and Backspace on the focused select leave the note unchanged — `table-widget.test.ts:324-387` mounts the real `tableField` + `history()` + keymap on a note with `status: todo` frontmatter and a cell holding `INPUT[inlineSelect(todo, done):status]`, cursor at the end of `hello world`. I restored `widgets.ts` from `main` and ran the file: 4 failed (Enter, Backspace, Delete, Tab "leaves the note unchanged"), 31 passed. With the branch source restored, all 35 pass.
- [met] `TableWidget.ignoreEvent(event)` returns `isFormControlInputEvent(event)`; mouse events and keys outside a form control keep today's routing (existing table-widget tests pass) — `widgets.ts:404-407` is `ignoreEvent(event: Event) { return isFormControlInputEvent(event); }`, using the helper already imported at `widgets.ts:22`. The helper returns `false` for every non key/input/composition event, so mousedown and the `+col` / `+row` `<button>` clicks are routed as before. New tests at `table-widget.test.ts:371-386` cover mousedown on the select (cursor unchanged) and Backspace on `contentDOM` (still edits the note). All existing table-widget tests pass.

## Findings

1. nit, `src/tests/lib/core/markdown-editor/extensions/live-preview/table-widget.test.ts:362` — the Issue also names Mod-z (undoes editor history), but the `it.each` covers only Enter, Backspace, Delete and Tab. The helper treats every `keydown` the same way, so this is not a gap in behaviour, only in what the tests show. Fix (optional): add a `z` + `ctrlKey` case after one prior edit to history, or leave it as is.

## Other checks

- Typecheck: `pnpm check` exit 0, 0 errors, 0 warnings.
- Test verdict rests on these files, each run by me with its exit status read directly:
  - `src/tests/lib/core/markdown-editor/extensions/live-preview/table-widget.test.ts` and `meta-bind-input-keydown.test.ts`: 2 files, 59 tests passed.
  - `core/form-control-events.test.ts`, `plugins/table-field.test.ts`, `plugins/keyboard-reveal.test.ts`, `plugins/block-reveal.test.ts`, `meta-bind-writers.test.ts`, `invariants-harness.test.ts`, `src/tests/lib/core/markdown-editor/editor-host.test.ts`, `src/tests/lib/app/editor-host.test.ts`: 8 files, 205 passed, 1 skipped.
  - The full suite and `pnpm build` are for deliver to run.
- Scope: the diff touches only `widgets.ts` (one method plus its JSDoc line), the table-widget test file and `.scratch/file-io-audit/work/57/discovery.md`. There is no scope creep, no layer-baseline change and no `src-tauri/` change.
- Table cells render only one kind of form control, `createMetaBindSelect` (`widgets.ts` `renderCellContent`), so the helper's `input, select, textarea` selector covers everything a cell can hold. Cells are not contenteditable, so ignoring key events from these controls drops no editing path.
- `.scratch/file-io-audit/spec.md` does not exist, so I checked against the Issue only.
- Not verified: the behaviour in the real WebKit webview. jsdom dispatches synthetic keydown events and has no native `<select>` keyboard handling.

## Resolution

1. Fixed: added `Mod-z on the focused select does not undo the editor history` to `table-widget.test.ts`. It makes one edit through `contentDOM` first, then presses Ctrl+z on the focused select and asserts the edit is still there. It fails with `widgets.ts` from `main` and passes on the branch.
