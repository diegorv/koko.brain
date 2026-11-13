# 04: Right-clicking inside a selection in the editor keeps it

**What to build:** Right-clicking selected text in the editor keeps the selection. Today `handleContextMenu` (`src/lib/core/markdown-editor/MarkdownEditor.svelte`, about line 269) always dispatches `EditorSelection.cursor(pos)`, so the selection is lost before the menu opens. Change it to remember the click position in a component variable, and skip the dispatch when `pos` lies inside a non-empty selection range (`from <= pos <= to`); otherwise move the cursor as today. The two block-link items (`handleCopyBlockLink` / `handleCopyBlockEmbed`, about lines 276-282) must still act on the clicked line: `copyBlockLink` reads `view.state.selection.main.head` (`src/lib/features/copy-block-link/copy-block-link.service.ts`, about line 21), so when the main selection is non-empty, dispatch `EditorSelection.cursor(<remembered pos>)` before calling `blockLinks.copyLink` / `copyEmbed`. Update the JSDoc on `handleContextMenu`. The Cmd+Shift+L keyboard path does not go through the menu and does not change.

**Blocked by:** none

**Status:** resolved

**Gate:** frontend only: `pnpm check` + `pnpm vitest run` + `pnpm build`.

- [x] Failing first, in `src/tests/lib/core/markdown-editor/MarkdownEditor.test.ts`: render "First paragraph\nSecond line\n", set the selection to 0..5 through `editorStore.editorView.dispatch`, stub `posAtCoords` on that view instance to return 2 (jsdom has no layout; say so in a comment), dispatch `contextmenu` on the surface, and assert the selection is still anchor 0, head 5. It fails on the current code
- [x] Right-click outside the selection (stub returns a position on line 2) collapses it to a cursor at that position
- [x] With a selection from line 1 into line 2 (head on line 2), a right-click on line 1 inside the selection followed by "Copy link to block" inserts the block id on line 1 and copies that line's link
- [x] The two existing context-menu tests stay green unchanged

## Notes

- **Source:** `work/overlays.md` P3; review section 3 row "Editor right-click drops the selection" and section 4 Issue 12.
- **Layer:** the change stays in `core/markdown-editor`; `features/copy-block-link` is reached only through the injected `blockLinks` prop, as today.
- **End-to-end proof:** the E2E case lands with Issue 05, where right-click then Copy shows on the clipboard that the selection survived.
- **Out of scope:** Cut, Copy, Paste and Select all (Issue 05); menu icon `mr-2` and the hard-coded `⌘⇧L` (overlay anatomy pass).
- **Size:** S.

## Comments

- 2026-11-04, branch `issue/04-editor-right-click-keeps-selection`: `handleContextMenu` remembers the click position and keeps a non-empty selection when the click is inside it; the block-link menu items move the cursor to the remembered position first so they target the clicked line. Three tests added to `MarkdownEditor.test.ts`. Review round 1: APPROVED with three nits, all rejected with reasons in `work/04/review.md` § Resolution (no code change). Full suite: first run had one unrelated `beforeAll` hook timeout (`queryjs-contract.test.ts`, passed 133/133 on its own); second run 493 files / 11720 tests passed, `pnpm build` ok.
