VERDICT: APPROVED

## Acceptance criteria

- [met] Failing first, in `src/tests/lib/core/markdown-editor/MarkdownEditor.test.ts`: render "First paragraph\nSecond line\n", set the selection to 0..5 through `editorStore.editorView.dispatch`, stub `posAtCoords` on that view instance to return 2 (jsdom has no layout; say so in a comment), dispatch `contextmenu` on the surface, and assert the selection is still anchor 0, head 5. It fails on the current code — test "inside the selection keeps it" (MarkdownEditor.test.ts:180-188) uses that doc, `selectAndAim(0, 5, 2)` dispatches through `editorStore.editorView` and stubs `posAtCoords` on the instance with the jsdom comment (:162-171), then asserts anchor 0 / head 5. Probe: with main's `MarkdownEditor.svelte` swapped in (then restored), this test fails (1 failed, 17 passed); on HEAD 18/18 pass.
- [met] Right-click outside the selection (stub returns a position on line 2) collapses it to a cursor at that position — test "outside the selection collapses it to a cursor at the click" (:190-197), stub returns 18 (line 2), asserts `main.empty` and `head === 18`. Passes.
- [met] With a selection from line 1 into line 2 (head on line 2), a right-click on line 1 inside the selection followed by "Copy link to block" inserts the block id on line 1 and copies that line's link — test at :199-210: selection 2..20 (head 20 on line 2), click at 4, then the menu item; asserts the copied link's id is the one appended to line 1 (`First paragraph ^<id>\nSecond line\n`). Passes. Implementation: `moveCursorToContextMenuPos` (MarkdownEditor.svelte:291-294) runs before `blockLinks.copyLink` / `copyEmbed`.
- [met] The two existing context-menu tests stay green unchanged — `git diff main...HEAD` only adds lines after them (the hunk starts after the embed test); `clickMenuItem` / `settle` helpers untouched; both pass.

## Findings

1. nit, src/lib/core/markdown-editor/MarkdownEditor.svelte:293 — `contextMenuPos` is a raw offset captured at right-click time and dispatched later without mapping or clamping. If the doc shrinks while the menu is open (an external sync such as `syncExternalContentToEditor`), the dispatch throws `RangeError` and the copy does nothing; if it changes otherwise, the link lands on a shifted line. Rare race with a visible, recoverable outcome; fine to leave. Optional fix: `Math.min(contextMenuPos, editorView.state.doc.length)`.
2. nit, src/lib/core/markdown-editor/MarkdownEditor.svelte:292 — the keep-selection check looks at every range (:281), but the copy helper only re-aims when `selection.main` is non-empty. With a multi-range selection whose main range is a cursor and a right-click inside another, non-empty range, the selection is kept and the block link acts on the main cursor's line instead of the clicked line. This matches the Issue's wording ("when the main selection is non-empty") and multi-cursor right-click is rare. Optional fix: re-aim whenever `contextMenuPos !== null` and it differs from `main.head`.
3. nit, src/tests/lib/core/markdown-editor/MarkdownEditor.test.ts:199 — the third test also passes on main's code (old `handleContextMenu` always moved the cursor to the click), so it guards only the new copy-handler re-aim, not the combination; the build's mutation check covers that. `handleCopyBlockEmbed`'s re-aim has no selection test. No change needed for this Issue.

## Checks run by the reviewer

- `taskpolicy -c background pnpm check`: exit 0, 215 files, 0 errors, 0 warnings.
- `taskpolicy -c background pnpm vitest run src/tests/lib/core/markdown-editor/MarkdownEditor.test.ts`: exit 0, 18/18.
- Related files (every test referencing `MarkdownEditor.svelte` plus `src/tests/lib/features/copy-block-link`): undo-history-across-notes, wikilink-click-capture, image-widget, SearchResult, copy-block-link: exit 0, 5 files, 87/87.
- Red-first probe described under criterion 1; the worktree was restored (`git status` clean).
- Test verdict rests on: `src/tests/lib/core/markdown-editor/MarkdownEditor.test.ts` and the five related files above.
- Not run: full suite and `pnpm build` (deliver's). No E2E; per the Issue it lands with Issue 05. Real-WebKit right-click behavior (native word selection on right-click in contenteditable) is not covered by jsdom.
- Scope: changes stay in `core/markdown-editor`; `features/copy-block-link` reached only through the `blockLinks` prop; no layer-baseline change; Cmd+Shift+L path untouched; JSDoc updated on `handleContextMenu` and added on the new variable and helper.

## Resolution

1. Rejected (no change). The doc shrinking under an open context menu needs an external sync to land in the few seconds the menu is open; the outcome is a visible, recoverable no-op copy, and no data is at risk. The project's simplicity rule says not to add code for rare races in that case.
2. Rejected (no change). The behavior follows the Issue's wording ("when the main selection is non-empty"), and a right-click inside a non-main range of a multi-range selection is rare. Widening the re-aim would change what the Issue specified without owner input.
3. No change, as the reviewer says: the mutation check covers the new re-aim, and the embed path shares `moveCursorToContextMenuPos` with the link path that is tested.
