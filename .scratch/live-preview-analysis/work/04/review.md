VERDICT: CHANGES_REQUESTED

# Review: Issue 04, one reveal rule for inline formatting

Reviewed `git diff main...HEAD` at `40a17378` (commits `ca1e6b83`, `107ccb3d`, `40a17378`).

## Checks I ran

- `pnpm check`: 0 errors, 0 warnings (211 files).
- `vitest run src/tests/lib/core/markdown-editor`: 98 files, 1317/1317 passed. This covers every test file the diff adds or changes and the tests of every changed source file:
  - `live-preview/core/reveal.test.ts` (new)
  - `live-preview/inline/inline-formatting-plugin.test.ts`, `inline/pipeline-dom.test.ts`
  - `live-preview/inline/handlers/{autolink-handlers,blockquote-handler,inline-comment-handler,mark-handlers,markdown-link-handlers,simple-widget-handlers,wikilink-handler}.test.ts`
  - `live-preview/parsers/blockquote.test.ts` and the `parsers/combined-*.test.ts` files that call `findBlockquoteMarkRange`
- Probes (temporary test files, deleted after the run; nothing committed):
  - A `HardBreak` node includes its newline. In `one  \ntwo words here`, the node is 3..6 and line 2 starts at 6; in `one\\\ntwo…` it is 3..5 and line 2 starts at 5. With the cursor in the middle of line 2, `hardBreakHandler` emits nothing, so line 1's break renders raw. With the cursor on the last line, it emits `cm-formatting-hard-break`.
  - No other inline node in the handler set crosses a line end. Across Link, Autolink, Escape, InlineMath, TaskMarker, ListMark, HorizontalRule, LinkReference, the emphasis/code/strike/highlight parents and ATX headings, only `SetextHeading` spans two lines, and that one is intentional.
  - With the blockquote change, `  > quote` now hides 2..4 instead of 0..4, so the leading indent stays visible. `- item\n  > quote` and `1. > q` keep their list widget, and the hidden range starts at the `>`.
  - `**bold\nstill** tail` with the cursor on line 2 reveals both marks (construct-level reveal, as discovery intended).

I did not run the full gate or e2e. I read the live-preview and wikilink e2e specs (`e2e/specs/live-preview/*.spec.ts`, `wikilink-*.spec.ts`), and none of them depends on per-node reveal on a shared line.

## Acceptance criteria

- [x] **Predicate tests: single cursor, multi-cursor, multi-line selection, drag in progress.** Met. `src/tests/.../live-preview/core/reveal.test.ts:36` (single), `:54` (multi-cursor), `:62` (multi-line, both directions), `:76` (drag, then release), `:86` (state without the drag field).
- [x] **Every inline handler uses the predicate; no handler keeps its own range check.** Met, with finding 1 below. `inline-formatting-plugin.ts:93` builds `revealPredicate(state)` once per pass and passes it to every node and line handler. `grep` finds no `shouldShowSource`, `isTouched` or `selection.` reads under `inline/handlers/`. The four inline ViewPlugins (image, footnote, wikilink-embed, meta-bind-input) are scoped to Issue 05 by its own text, so leaving them is correct. Finding 1 is about a range passed to the predicate. It is not a separate check.
- [x] **Test: `**one** and **two**` reveals both runs with the cursor anywhere on the line.** Met. `mark-handlers.test.ts:50` loops over every position 0..lineEnd and expects no replace, then 4 replaces with the cursor on the next line. On main, positions on "and" produced replaces, so the test would fail there.
- [x] **Test: `- > quote` keeps its bullet visible.** Met. `blockquote-handler.test.ts:119` builds with `listMarkHandler` + `blockquoteHandler` and asserts the bullet widget 0..2 and a single hidden range 2..4. On main the 0..4 range would fail it. There is also a parser test at `parsers/blockquote.test.ts:51`.

## Findings

1. **Medium (blocking), `src/lib/core/markdown-editor/extensions/live-preview/inline/handlers/simple-widget-handlers.ts:105`. A hard break is revealed when the cursor is on the NEXT line.** The `HardBreak` node includes its newline, so `node.to` is the next line's `from`. `isRevealed(node.from, node.to)` therefore maps to lines N..N+1, and a cursor anywhere on line N+1 renders line N's break raw: the `↵` disappears, or the `\` shows. On main, `shouldShowSource(3, 6)` with the cursor at 11 was false. This diff introduces the regression, and it contradicts the Issue's rule that a construct reveals when *its* line is touched. Moving the cursor between line N+1 and N+2 now changes how line N looks, which is the kind of off-line change this series is meant to remove. Finding 2 has the same root cause (a half-open end at the next line's start).
   **Fix (prefer this one):** make the predicate treat a non-empty range whose `to` is exactly at a line start as ending on the previous line. In `core/reveal.ts`, compute `last` from `to - 1` when `to > from && doc.lineAt(to).from === to`, both for the selection intervals and for the queried range. That also fixes finding 2, and the handlers do not change. The alternative, `isRevealed(node.from)` in `hardBreakHandler`, fixes only this site.
   **Tests:** in `simple-widget-handlers.test.ts` (next to `:122`), add one for each break form (`'one  \ntwo words\n\nx'` and `'one\\\ntwo words\n\nx'`): with the cursor in the middle of line 2, `cm-formatting-hard-break` is still emitted. In `reveal.test.ts`, assert that `isRevealed(line(1).from, line(2).from)` with the cursor mid-line 2 is false.

2. **Low (fix together with 1 if the predicate-level fix is taken), `src/lib/core/markdown-editor/extensions/live-preview/core/reveal.ts:25-28`. Triple-click and `selectLine` reveal the following line.** CodeMirror's triple-click (`@codemirror/view` `rangeForClick`, type 3) and `selectLine` (`@codemirror/commands`) both end the range at `line.to + 1`, which is the next line's start. The interval then includes line N+1, so every inline construct on the line below the selected one shows source after the mouseup rebuild. On main only elements starting at column 0 of N+1 were revealed. **Fix:** the same `to - 1` rule as finding 1, applied to selection ranges. **Test:** in `reveal.test.ts`, `EditorSelection.range(line(2).from, line(3).from)` reveals `[2]`, while an empty cursor at `line(3).from` still reveals `[3]`.

3. **Low (non-blocking), `src/lib/core/markdown-editor/extensions/live-preview/parsers/blockquote.ts:52-54`. Indented blockquotes now keep their indent visible, and no test pins it.** `markFrom = quoteMarks[0].from` means `  > quote` hides only 2..4 and leaves the two leading spaces as text. Before, it hid 0..4. This follows from the fix the Issue asked for and looks right for `- item\n  > quote` (the indent aligns with the list content). It is a visible change for top-level indented quotes, though, and it is untested. **Fix:** add a `findBlockquoteMarkRange` test for `'  > quote'` asserting `{ markFrom: 2, markTo: 4, depth: 1 }`, so the behavior is recorded as a decision. No source change needed.

## Notes (no action in this Issue)

- During a drag, `revealPredicate` reveals nothing. A rebuild that still lands mid-drag (a `forceDecorationRebuild` from `scrollDebouncePlugin` after drag-autoscroll settles, or a collection-index or tag-colour `$effect` in `MarkdownEditor.svelte`) now collapses the previously revealed line until mouseup. The Issue specifies this ("nothing during a mouse drag"), and main shifted text in the same situation by revealing the selection instead.
- Discovery and the build report already record the `lastCursorLine` staleness, for example collapsing a multi-line selection onto the head line, or Escape dropping secondary cursors while the main head stays on its line. It is no worse than on main, and Issue 06 removes it.
- `check-update-action.ts:10-14` JSDoc and the `:28` comment still justify the line gate with `shouldShowSource`, whose per-node rule never made that claim true. Issue 06 deletes the gate, so leave it.
- Scope: no creep. Every source change maps to the Issue's Touches list. The only extra is `parsers/blockquote.ts`, which the blockquote fix requires. `docs/LIVE-PREVIEW.md` is updated, and its remaining `shouldShowSource` text still describes the block decorators and ViewPlugins correctly until Issue 05. Commit `107ccb3d` combines the predicate and the blockquote fix because both touch `blockquote-handler.ts`, which is acceptable.
