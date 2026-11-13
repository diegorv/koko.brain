VERDICT: APPROVED

## Previous findings

| # | Severity | Status | Evidence |
|---|----------|--------|----------|
| 1 | minor | resolved | `MarkdownEditor.svelte:485-487`: the step is now `pending scrollIntoView pos=N dispatched`, with a comment that the scroll lands in CodeMirror's next measure. The ordering claim holds on the switch path: the pending double-rAF's inner callback runs in frame 2, after the switch's frame-2 callback, whose `forceDecorationRebuild` dispatch requests CodeMirror's measure before it registers the frame-3 callback, so the measure (and the `scrollTarget` write) runs before the `frame 3` log. The Issue's Notes line reads `before|dispatched`; the test at `MarkdownEditor.test.ts:344-357` asserts the new step name. No other test or e2e spec names the old step (grep of `src` and `e2e`). |
| 2 | minor | resolved | `MarkdownEditor.test.ts:359-404`: "reads no layout for the log with the debug log off" counts `scrollTop` getter reads and `addEventListener('scroll')` calls on `scrollDOM` for the same switch with the log on and off, and asserts no listener and exactly `on.reads - on.logged` reads with it off. Probe run here: with `!tabScrollLogOn()` removed from `logTabScroll`, the test fails (`expected 15 to be 8`); restored, the worktree is clean. The helper unmounts and resets the stores itself; the 13 tests in the file pass together, so it does not leak into neighbours. |
| 3 | nit | rejection stands | The Issue asks for "two frames"; the branch logs three plus the `event` window, and round 1 marked the criterion met. Widening the window belongs to the follow-up if the owner's log shows a later jump. |

## Acceptance criteria re-checked

- [met] Failing first: a tab switch to a fresh tab emits the TAB_SWITCH scroll lines (before replace, after replace, after restore, two frames) with scrollTop and viewport values, through the real `debug()` with the log setting on; none with it off — the fix round only renamed the pending step and added the log-off layout test; the fresh-tab tests still pass (80 of 80 across the four editor test files), and the "none with it off" half is now also tested at the layout-read level (finding 2 probe).
- [met] Every other `scrollTop` writer or `scrollIntoView` dispatch on the switch path is listed in Notes with file:line and logs a line — Notes now pair the pending `scrollIntoView` at `MarkdownEditor.svelte:480-484` with `before|dispatched` and say `frame 3` shows the result, matching the code at `:478-487`.

## Findings

1. nit — `src/lib/core/markdown-editor/MarkdownEditor.svelte:485-486`: the comment "`frame 3` shows the result" holds only when the pending scroll comes with a tab switch; a pending scroll in the already-open tab has no `frame 3` line, so the result is visible only through an `event` line, which is not registered in that case either. Fix (optional, follow-up): say "on a tab switch, `frame 3` shows the result".

## Checks run

- `pnpm check`: exit 0, 0 errors, 0 warnings.
- `pnpm vitest run src/tests/lib/core/markdown-editor/MarkdownEditor.test.ts src/tests/lib/core/markdown-editor/undo-history-across-notes.test.ts src/tests/lib/core/markdown-editor/wikilink-click-capture.test.ts src/tests/lib/core/markdown-editor/tab-view-state.test.ts`: exit 0, 4 files, 80 tests passed.
- Guard-removal probe on the new test: fails without the guard, as the fix report claims.
- Scope of the fix commit `9256675c`: `MarkdownEditor.svelte` (comment + step name), its test file, the Issue's Notes line and `review.md`; no test weakened or deleted, no layer-baseline or composition-root change.
- Full suite and `pnpm build` not run: deliver runs them.
- Accepted risk from the fix report: the new test's exact-count assertion depends on CodeMirror reading `scrollTop` the same number of times in both runs under jsdom; a CodeMirror upgrade could make it brittle, but it fails loudly rather than passing falsely.
