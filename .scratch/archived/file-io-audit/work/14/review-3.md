VERDICT: APPROVED

## Previous findings

| # | Severity | Status | Evidence |
|---|----------|--------|----------|
| 1 | nit | resolved | Commit 74052c0b adds `a sync too large to diff keeps a code file's language` (`undo-history-across-notes.test.ts:245-262`). 600 lines with every other line edited gives about 300 changed regions. That is under `DOC_DIFF_MAX_EDITS` (400, `doc-diff.logic.ts:16`) in hunks, but the Myers bound at `doc-diff.logic.ts:103` counts line edits (one delete plus one insert per changed line, so about 600), and the fallback runs. Red check by the reviewer: with the `languageCompartment` / `highlightStyleCompartment` reconfigure removed from `replaceDoc` (`MarkdownEditor.svelte:151-155`), the test fails with `expected 'markdown' to be 'typescript'`. The source was restored afterwards and `git status` is clean. |

## Acceptance criteria re-checked

- [met] Delete a sentence, apply an external-content sync to the same note (Properties panel edit or task toggle), then Cmd+Z: the sentence is restored at its original position or not at all, never appended at the end of the doc — the fix touches only the test of the too-large-sync fallback. The new test confirms that path clears history and keeps the code language. The per-region and Properties/task-toggle tests in `undo-history-across-notes.test.ts` still pass.
- [met] Existing MarkdownEditor, tab-switch and tab-view-state tests still pass — `src/tests/lib/core/markdown-editor` (112 files, 1781 passed, 1 skipped) passes, and that includes `MarkdownEditor.test.ts` and `undo-history-across-notes.test.ts`. Deliver runs the full suite and `pnpm build`.

## Findings

1. **nit** `src/tests/lib/core/markdown-editor/undo-history-across-notes.test.ts:259`. `expect(undoDepth(view().state)).toBe(0)` is trivially true: no edit is made before the sync, so the depth is 0 on either path. Fix (optional): type an edit before the sync so the assertion shows the history really is cleared. The test in this file for an active sync that is too large to diff already covers the cleared history, so nothing is lost.

No regressions. The fix round changes only one test file (+20 lines) and the Resolution section of review-2.md. No app source, layer baseline or `BASELINE_SIZE` changed, and no test was weakened or removed.

## Checks run by the reviewer

- `pnpm check`: exit 0, 0 errors, 0 warnings.
- `pnpm vitest run src/tests/lib/core/markdown-editor`: exit 0, 112 files, 1781 passed, 1 skipped.
- Red check of the new test against `replaceDoc` without the compartment carry-over: fails as expected. Source restored.
- I did not run the full suite or `pnpm build`. Deliver runs them.
