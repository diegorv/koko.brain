# 57: Enter, Backspace and other keys in a meta-bind select inside a table cell edit the note at the editor's cursor

**Status:** resolved

**Blocked by:** none
Priority: P2
Severity: data-loss-on-action
Source: Issue 47 review (.scratch/file-io-audit/work/47/review.md, finding 1)

**What to build:** In `TableWidget` (src/lib/core/markdown-editor/extensions/live-preview/widgets.ts:332, `ignoreEvent()` at :404), return `isFormControlInputEvent(event)` from `ignoreEvent(event)`, the same helper Issue 47 used for the meta-bind and code-block widgets, so keys typed in a form control inside a table cell stay in that control. Mouse events and keys outside a form control keep today's routing. Line numbers are from 120d9def.

**Gate:** `pnpm check` + `pnpm vitest run` + `pnpm build`

**Source:** src/lib/core/markdown-editor/extensions/live-preview/widgets.ts:332-410, src/lib/core/markdown-editor/extensions/live-preview/core/form-control-events.ts, src/tests/lib/core/markdown-editor/extensions/live-preview/table-widget.test.ts, src/tests/lib/core/markdown-editor/extensions/live-preview/meta-bind-input-keydown.test.ts (the Issue 47 pattern)

## Details

Issue 47 made `MetaBindSelectWidget`, `MetaBindTextInputWidget`, `MetaBindToggleWidget` and `CodeBlockWidget` return `isFormControlInputEvent(event)` from `ignoreEvent()` (`live-preview/core/form-control-events.ts`), so a key pressed in one of their form controls no longer runs the CodeMirror keymap against the editor selection.

`TableWidget` (src/lib/core/markdown-editor/extensions/live-preview/widgets.ts) renders a meta-bind `INPUT[inlineSelect(...)]` in a table cell with `createMetaBindSelect`, which stops `mousedown`, so clicking the select focuses it and leaves the editor selection on another line. Its `ignoreEvent()` still returns `false`, so a `keydown` in that select bubbles to `contentDOM` and CodeMirror runs the keymap: Enter inserts a newline and Backspace / Delete delete text at the editor cursor, Tab indents the editor's line, Mod-z undoes editor history.

Table cells are not contenteditable, so ignoring key, input and composition events whose target is a form control inside the table is safe.

## Acceptance criteria

- [x] Failing test first: a mounted table with a meta-bind select in a cell, the editor cursor on another line; Enter and Backspace on the focused select leave the note unchanged
- [x] `TableWidget.ignoreEvent(event)` returns `isFormControlInputEvent(event)`; mouse events and keys outside a form control keep today's routing (existing table-widget tests pass)

## Comments

- 2026-11-02, branch issue/57-table-meta-bind-select-keys-edit-note: `TableWidget.ignoreEvent(event)` now returns `isFormControlInputEvent(event)`, so Enter, Backspace, Delete, Tab and Mod-z in a table cell's meta-bind select stay in the select. Tests in table-widget.test.ts (incl. Mod-z case added from review round 1 nit). Full suite exit=0: 438 files, 10103 passed, 1 skipped, 1 todo; build passed. Reviews: round 1 APPROVED (1 nit, fixed), round 2 APPROVED (no findings).
