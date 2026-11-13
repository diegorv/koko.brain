# 061: A task checkbox in live preview reacts only to the primary button

**Origin:** `audit-2026-11-05` Issue 05, moved here on 2026-11-08. Its PRD, raw evidence and closed siblings stay in `.scratch/archived/audit-2026-11-05/`. Bare Issue numbers in the text below use that feature's numbering; `priority-2026-11-08.md` in this folder maps them to the numbers here.

**Migrated from:** `.scratch/archived/file-io-audit/issues/52-live-preview-unrequested-rewrites.md` (audit 2026-11-05). Priority: content safety (bucket 1-content). This Issue keeps part 2 (F92) of that Issue. Part 1 (F101, code-block language switch) is now Issue 251 and part 3 (F121, TSV paste in code and indented lines) is Issue 252.

**Audit check at `5f8003d67`, re-checked by the 2026-11-12 deep dive at `318b6e9b5`:** still present. `TaskCheckboxWidget.toDOM` (src/lib/core/markdown-editor/extensions/live-preview/widgets.ts:41-47) calls `preventDefault` and dispatches on every `mousedown`, with no `e.button` or `isMacContextClick` check. The wikilink and callout header listeners in the same file already guard this (`:311`, `:646`), and `IS_MAC` and `isMacContextClick` are imported at `:21`.

**Status:** ready-for-agent

Priority: P2, impact low-medium (a visible, undoable rewrite of one task marker; right-clicking a checkbox is not a frequent gesture, but the fix is one line).

**What to build:** only a primary click toggles a task checkbox. Today a right-click to open the editor context menu (`MarkdownEditor.svelte` `handleContextMenu` `:302`, `oncontextmenu` `:731`), a middle-click, or a macOS Ctrl+click on a rendered checkbox flips `[ ]` / `[x]`, and the update listener (src/lib/core/markdown-editor/setup/editor-extensions.ts:174) autosaves it like a keystroke. `inline/handlers/simple-widget-handlers.ts:28` is the only creator of the widget.

Fix: at the top of the mousedown listener in `TaskCheckboxWidget.toDOM`, add `if (e.button !== 0 || isMacContextClick(e, IS_MAC)) return;` before `preventDefault`, matching the wikilink guard at widgets.ts:311.

**Blocked by:** none

**Answered:** owner, 2026-11-12: approved as a deep-dive addition, part 2 only. Parts 1 and 3 split into Issues 251 and 252 (both needs-info; the validators rated them medium risk). No blocker on 062.

**Gate:** `pnpm check` + `pnpm vitest run` + `pnpm build`. Targeted e2e guard: `bash scripts/e2e.sh e2e/specs/live-preview/click-reveal/task-checkbox.spec.ts` (a real primary click still toggles).

**Source:** src/lib/core/markdown-editor/extensions/live-preview/widgets.ts:21,41-47; src/lib/utils/platform.ts `isMacContextClick` (:38-40); the `F92` describe in `.scratch/archived/editor-data-safety/repro/table-and-doc-mutations/widget-doc-rewrites.test.ts:43-70`.

- [ ] Failing tests first: move the `F92` describe of `.scratch/archived/editor-data-safety/repro/table-and-doc-mutations/widget-doc-rewrites.test.ts` into a new jsdom test, `src/tests/lib/core/markdown-editor/extensions/live-preview/widgets/task-checkbox-widget.test.ts` (test-helpers import `../../../test-helpers`, as in `code-block-widget.test.ts:11`), and see it fail. Leave the `F101` and `F121` describes in place (Issues 251 and 252) and the `F105` describes (issue 46).
- [ ] A `mousedown` with button 1 or button 2 on the real `TaskCheckboxWidget` input leaves the doc unchanged (full-doc equality).
- [ ] With `IS_MAC` true (mock `#lib/utils/platform.js` with an `IS_MAC` getter, the pattern at `table-widget.test.ts:13-22`), a button-0 `mousedown` with `ctrlKey` leaves the doc unchanged.
- [ ] A plain button-0 `mousedown` still toggles `[ ]` to `[x]` and back, with `IS_MAC` true and false.
- [ ] Existing simple-widget-handler tests and the task-checkbox e2e spec still pass.

## Notes

- Read `docs/agents/live-preview-rules.md` before changing `widgets.ts`.
- 062 also edits `widgets.ts`, in `renderInlineSegments` and `renderCellContent` (`:226-278`). The hunks do not overlap, so there is no blocker; if both are in flight, the second one to merge rebases.
- Owner check after delivery (not an acceptance criterion): in the app, right-click a rendered task checkbox. The context menu opens, the note text is unchanged, and the box keeps its look. jsdom cannot show whether WKWebView flips a native checkbox's own `checked` state on a non-primary click.

## Audit evidence (editor-data-safety, 2026-11-02)

### F92: right-click, middle-click and macOS Ctrl+click toggle a task checkbox and rewrite the note

- Verdict: REPRODUCED (P2, likelihood occasional)

**How a user hits it.** A note contains `- [ ] buy milk` with the cursor on another line, so the checkbox renders. The user right-clicks the checkbox to open the context menu (or middle-clicks, or Ctrl+clicks on macOS). The task flips to `[x]` and is saved; the context-menu handler then moves the cursor onto the line, which reveals the raw `[x]`.

**Code trace.** simple-widget-handlers.ts builds `TaskCheckboxWidget` for every unrevealed `TaskMarker` (the only creator). widgets.ts:41-47: `addEventListener('mousedown', (e) => { e.preventDefault(); ... view.dispatch(...) })` with no `e.button` check. widgets.ts:311, the wikilink in the same file, returns early on `e.button !== 0 || isMacContextClick(e, IS_MAC)`. `isMacContextClick` (src/lib/utils/platform.ts:38-40) is `mac && e.ctrlKey`. The editor update listener forwards the change to `onDocChanged` because neither suppress flag is set.

**Repro test.** `.scratch/archived/editor-data-safety/repro/table-and-doc-mutations/widget-doc-rewrites.test.ts`, describe `F92`. Both tests fail on `expect(view.state.doc.toString()).toBe(doc)`: the doc becomes `- [x] buy milk\n\ntext` for button 2 and for button 1. The macOS Ctrl+click case has no repro test; it is from the code trace (the criterion above adds it).

## Comments

- 2026-11-06: migrated from `.scratch/archived/file-io-audit/issues/52-live-preview-unrequested-rewrites.md` by audit 2026-11-05, which re-checked it at `5f8003d67`.
- 2026-11-12: the deep dive (`.scratch/open-itens/research/deep-dive-2026-11-12/`, validate-s3+s4, cross-tests-relay M4, critique M4) split this Issue. It keeps only part 2, the task checkbox guard, rated low-medium impact, S, low risk. Parts 1 and 3 moved to Issues 251 and 252. Retitled, line numbers updated to HEAD, the `IS_MAC` mock pattern and a targeted e2e guard named, no blocker on 062 (owner decision). The Gate's `pnpm build` is unchanged pending the owner's call on ADR 0030 (critique M7).
