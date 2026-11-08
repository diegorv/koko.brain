# 007: Paste, cut and copy inside a meta-bind number or date input act on the input, not the note

**Origin:** `audit-2026-11-05` Issue 40, moved here on 2026-11-08. Its PRD, raw evidence and closed siblings stay in `.scratch/audit-2026-11-05/`. Bare Issue numbers in the text below use that feature's numbering; `priority-2026-11-08.md` in this folder maps them to the numbers here.

**What to build:** `CONTROL_EVENT_TYPES` (src/lib/core/markdown-editor/extensions/live-preview/core/form-control-events.ts:2-11) lists key, input and composition events only. For a paste, cut or copy whose target is the input, `isFormControlInputEvent` returns false, and so do the widgets' `ignoreEvent` (widgets.ts:414 table, :960 number/date, :1002 toggle, :815 select). CodeMirror's eventBelongsToEditor then hands the event to the editor. The live-preview paste handlers and CodeMirror's handlers.paste/doPaste insert the clipboard text at the editor selection, which sits on another line because the input stops mousedown (widgets.ts, buildMetaBindTextInput mousedown stopPropagation). The paste never reaches the input, and autosave writes the inserted text into the note. Cut and copy take copiedRange from the editor state, which for an empty selection is the whole cursor line, so Cmd+X can delete a note line the user is not looking at. Add 'paste', 'cut' and 'copy' (and 'drop') to the control event set, so that CodeMirror leaves these events to the control.

**Blocked by:** none

**Status:** ready-for-agent

**First wave:** yes, picked by the owner on 2026-11-06.

**Gate:** frontend only: `pnpm check` + `pnpm vitest run`.

- [ ] Failing test first, in src/tests/lib/core/markdown-editor/extensions/live-preview/meta-bind-input-keydown.test.ts (jsdom, real widgets): mount a note with frontmatter `n: 1` and a body line `INPUT[number():n]`, put the editor cursor on another line, dispatch a bubbling 'paste' event on the rendered input with clipboardData text/plain '42' (Object.defineProperty), and assert that view.state.doc is unchanged. It fails today.
- [ ] Same file: a 'cut' event on the input leaves view.state.doc unchanged.
- [ ] src/tests/lib/core/markdown-editor/extensions/live-preview/core/form-control-events.test.ts: isFormControlInputEvent is true for paste, cut and copy from an input, select or textarea, and false for paste on a non-control element.
- [ ] Paste into the editor body, including the HTML-link and TSV paste paths, works as before.
- [ ] Gate: pnpm check and pnpm vitest run pass.

## Notes

- **Priority:** daily use and UI correctness (bucket 2-ux). Ux/low. Meta-bind is daily, and the clipboard keys land in the note text. It is first among the low items because it is live preview.
- **Trigger:** A note has `INPUT[number():n]` or `INPUT[date():due]`, inline or in a table cell. The user clicks the field and presses Cmd+V to paste a value, or selects its text and presses Cmd+X or Cmd+C.
- **Evidence (verified by reading code at `5f8003d67`):** src/lib/core/markdown-editor/extensions/live-preview/core/form-control-events.ts:2-11,28-31 has no clipboard events; widgets.ts:414-416, :960-962, :1002-1004 return isFormControlInputEvent(event); node_modules/@codemirror/view/dist/index.js:4921-4931 treats the event as the editor's when ignoreEvent is false; :5192-5205 handlers.paste calls doPaste and returns true; :5223-5262 copy/cut use copiedRange (whole cursor line when the selection is empty) and dispatch delete.cut; commit a7cdfafe9 (Issue 47) fixed keys only.
- **Source:** audit 2026-11-05, domain `live-preview`, finding `N-live-preview-03` (from live-preview-ux-1). Size S.

**Second opinion (audit 2026-11-05, round 2):** upheld (content, low). CONTROL_EVENT_TYPES (form-control-events.ts:2-11) has no paste, cut, copy or drop. The widgets' ignoreEvent (widgets.ts:414, :815, :960, :1002) returns isFormControlInputEvent, so eventBelongsToEditor (@codemirror/view 6.43.15, index.js:4921-4931) gives the event to CodeMirror. handlers.paste (:5192-5205) calls doPaste at the editor selection with no focus or selection guard. copy/cut (:5242+) use copiedRange, which is the whole cursor line when the selection is empty, and cut dispatches delete.cut. The native Edit menu paste (lib.rs:232) sends a normal paste event. Autosave then writes the inserted text, or the deleted line, to the note. That is note content corrupted on disk, so the category is content, not ux as the Issue says. Corrections to apply while implementing: Recategorize from ux/low to content: Cmd+V puts clipboard text into another line of the note, and Cmd+X deletes a note line, and autosave writes both to disk. Copy alone only puts the wrong text on the clipboard.

## Comments
