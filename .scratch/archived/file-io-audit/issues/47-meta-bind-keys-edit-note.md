# 47: Backspace, Delete, Tab and Enter inside a meta-bind control edit the note at the editor's cursor

**Status:** resolved

Priority: P1 (common: fixing a number or date value by keyboard deletes note text elsewhere, and autosave writes it)

**What to build:** The meta-bind widgets return `false` from `ignoreEvent()`: `MetaBindSelectWidget` (src/lib/core/markdown-editor/extensions/live-preview/widgets.ts:739-741), `MetaBindTextInputWidget` (:839-841, the number / date input and its `type="text"` fallback) and `MetaBindToggleWidget` (:880-882). `CodeBlockWidget`, which holds the language `<select>`, does the same (src/lib/core/markdown-editor/extensions/live-preview/widgets/code-block-widget.ts:141-143). The controls stop `mousedown` (widgets.ts:698, :866, :945; code-block-widget.ts:162), so clicking one focuses it and leaves the editor selection where it was. A `keydown` in the control then bubbles to `contentDOM`; CodeMirror's `eventBelongsToEditor` (node_modules/@codemirror/view/dist/index.js:4921-4931) asks the widget's `ignoreEvent`, gets `false`, and runs the keymap (:4605-4614, :9149-9153) against the editor selection. The app keymap (src/lib/core/markdown-editor/setup/editor-extensions.ts:147-163) holds `defaultKeymap`, `historyKeymap` and `indentWithTab`, so:

- Backspace / Delete in the input delete the character next to the editor cursor, or the whole editor selection, and `preventDefault` the key, so the input itself does not change.
- Tab runs `indentWithTab` on the editor's line.
- Enter on a focused toggle or select inserts a newline at the editor cursor. Enter and Escape in the number / date input are safe: the input's handler (widgets.ts:943-953) calls `preventDefault`, and `eventBelongsToEditor` returns `false` for a prevented event (index.js:4924).
- Mod-z / Mod-Shift-z undo or redo the editor history.

Fix: in the four widgets, make `ignoreEvent(event)` return `true` for keyboard and input events (`keydown`, `keyup`, `keypress`, `beforeinput`, `input`, composition events) whose target is a form control inside the widget (`input`, `select`, `textarea`), and keep returning `false` for everything else so mouse handling does not change. Keep the existing `mousedown` `stopPropagation` (CLAUDE.md, live preview rule 11) and the input's own Enter / Escape handling. A shared helper is fine if all four call it.

**Blocked by:** none

**Gate:** `pnpm check` + `pnpm vitest run` + `pnpm build`

**Source:** src/lib/core/markdown-editor/extensions/live-preview/widgets.ts:665-740,807-953, src/lib/core/markdown-editor/extensions/live-preview/widgets/code-block-widget.ts:141-165, src/lib/core/markdown-editor/extensions/live-preview/plugins/meta-bind-input-plugin.ts:98-121, src/tests/lib/core/markdown-editor/extensions/live-preview/meta-bind-input-widgets.test.ts, src/tests/lib/core/markdown-editor/extensions/live-preview/widgets/code-block-widget.test.ts

- [x] Failing test comes first. Move `.scratch/editor-data-safety/repro/lp-plugins/meta-bind-input-keydown.test.ts` under `src/tests/` (into `meta-bind-input-widgets.test.ts` or next to it, fixing the `test-helpers` import path) and see it fail
- [x] Backspace and Delete in a mounted `INPUT[number():count]` leave the note unchanged, with the editor cursor at the end of another line and with a selection on another line, and the key event is not default-prevented
- [x] The same holds for a `date()` input and for the `type="text"` fallback input
- [x] Tab in the input, and Enter on a focused toggle and on a focused meta-bind select, leave the note unchanged
- [x] Backspace and arrow keys on the code-block language `<select>` leave the note and the editor selection unchanged
- [x] Enter in the number input still commits the value to frontmatter, and Escape still reverts it (existing tests in meta-bind-input-widgets.test.ts)
- [x] Clicking a control still does not move the editor cursor onto the widget line
- [ ] Owner check in the app (the repro runs in jsdom): with the cursor on another line, Backspace inside a number input edits only the input

## Audit evidence (editor-data-safety, 2026-11-02)

Source: editor-data-safety audit (`.scratch/editor-data-safety/audit-2026-11-02.md`, P1 row LP1), cross-referenced in `.scratch/editor-data-safety/xref-file-io-audit.md` (no existing issue mentions `ignoreEvent` or keys routed from widget controls to the keymap; issues 17 and 29 cover only the values these widgets write). Code re-read at 1351a35d; the line numbers above are current.

### LP1: keys pressed inside a meta-bind input run the editor keymap at the editor's cursor

- Verdict: CONFIRMED_BY_TEST in jsdom (P1, likelihood common). Not exercised in the running app; the owner should confirm once in WebKit.

**How a user hits it.** The note has frontmatter `count: 5` and a line `` `INPUT[number():count]` ``, and the cursor is at the end of `hello world` on another line. The user clicks into the rendered number input and presses Backspace to fix the value. The `d` of `hello world` is deleted and the input keeps `5`. Each further Backspace deletes another character of the note, possibly off screen. With a selection elsewhere, one Delete removes the whole selection. The 2 s autosave writes the damaged note. Date inputs behave the same (Backspace clears a date segment in WebKit).

**Recoverable from.** Undo, while the tab stays open and the user notices, since the edits land in the editor history. After a tab switch, close or quit, only File History snapshots from earlier saves remain.

**Code trace.** meta-bind-input-plugin.ts:98-121 `pickWidget` mounts `MetaBindTextInputWidget` for `number` / `date`, `MetaBindToggleWidget` for `toggle` / `boolean`, `MetaBindSelectWidget` otherwise. widgets.ts:834-836 `ignoreEvent() { return false; }`. widgets.ts:943-953: the input's `keydown` handler prevents only Enter and Escape. CodeMirror view 6.43.15: index.js:4926-4929 walks from the event target to `contentDOM` and returns `false` only if a widget's `ignoreEvent(event)` is `true`; :4605-4614 then runs the keydown handlers; :9150-9152 runs the keymap. editor-extensions.ts:156 `defaultKeymap` (Backspace `deleteCharBackward`, Delete `deleteCharForward`, Enter `insertNewlineAndIndent`), :160 `historyKeymap`, :162 `indentWithTab`.

**Repro test.** `.scratch/editor-data-safety/repro/lp-plugins/meta-bind-input-keydown.test.ts` mounts the real markdown language, the real `metaBindInputPlugin`, `history()` and `keymap.of([...defaultKeymap, ...historyKeymap])`, focuses the rendered input and dispatches a bubbling `keydown`. Failing assertions: `expect(doc).toContain('hello world')` after Backspace (with `expect(ev.defaultPrevented).toBe(false)`) and after Delete with `hello world` selected. Recorded result: 2 of 3 fail; Backspace turns the line into `hello worl` with the input untouched, and Delete removes `hello world` entirely. The repro covers Backspace and Delete on the number input only; Tab, Enter on toggle / select and the code-block select follow from the same `ignoreEvent` path and need their own tests (criteria above).

**Fix sketch (from the audit).** Make `ignoreEvent` return `true` for keyboard and input events from form controls in the widget, e.g. `ignoreEvent(e) { return e.type.startsWith('key') || e.type === 'beforeinput' || e.type === 'input' || (e.target instanceof HTMLElement && e.target.closest('input,select,textarea') !== null); }`, keeping the `mousedown` `stopPropagation`. Or `stopPropagation` on `keydown` inside each control. Superseded by the rule in What to build: return `true` only for key, input and composition events from a form control, not for mouse events (the snippet above would also change mouse routing).

## Comments

- 2026-11-02, branch `issue/47-meta-bind-keys-edit-note`: the meta-bind text input, toggle and select widgets and the code-block widget now return `true` from `ignoreEvent` for key, input and composition events from a form control (`live-preview/core/form-control-events.ts`), so Backspace, Delete, Tab and Enter stay in the control; mouse routing is unchanged. The repro moved to `src/tests/.../meta-bind-input-keydown.test.ts`. Review fixes: the mousedown test covers the toggle and the select too; the xref repro path was updated; follow-up Issue 57 covers the table-cell select. Tests: full suite at 947c5dd0, 435 files / 10012 passed, 1 skipped, 1 todo, 0 failed, build passed; `pnpm check` 0 errors. Reviews: round 1 APPROVED (3 findings, fixed or split out), round 2 APPROVED (no findings). Owner WebKit check still open.
