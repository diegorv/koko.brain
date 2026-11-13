VERDICT: APPROVED

## Previous findings

| # | Severity | Status | Evidence |
|---|----------|--------|----------|
| 1 | minor | resolved | `help/documentation/03-editor.md:61`: the Note width row now says the More item reads "Use the normal note width" while wide and that the inline button is highlighted. This matches `NoteActionBar.svelte:93-96`, where the `wide` label and icon swap and `pressed: wide` styles only the inline button. The rest of the rewritten help matches the code: the More list order (Neighbourhood, Note width, Table of contents, Reveal, Copy path) is `FOLDABLE_ACTIONS`, "Copy path first" to fold is `FOLD_ORDER` (`note-action-bar.logic.ts:87`), Neighbourhood sits before Raw (`NoteActionBar.svelte:81-83`), and the canvas toggle is `top-3 right-3` while collection and kanban keep `bottom-3 right-3` (`EditorView.svelte:107,120,132`). |
| 2 | nit | resolved | `brain.worktrees/test-logs/ux-polish/49-e2e.log` (23:25) ends with `45 passed (1.0m)`. I read the log and did not run the E2E specs again. |
| 3 | nit | rejection stands | Folding by width is option one of `work/layout.md` R4, and the Issue Notes leave the visible set to the owner's taste check. |

## Acceptance criteria re-checked

- [met] Failing first: `note-action-bar.logic` tests pin the new default fold set and the reserved width — the fixes do not touch `note-action-bar.logic.ts` or its test. `note-action-bar.logic.test.ts` passes in the targeted run below. The new barWidth JSDoc ("0 until measured, which folds every foldable action into More") matches `foldActions` at `note-action-bar.logic.ts:113`.
- [met] A component test asserts the floating raw toggle is absent for a Markdown tab and present for a kanban, canvas and view tab — the fixes do not touch EditorView or its test, and `EditorView.test.ts` passes.
- [met] Only one sidebar toggle is rendered for a Markdown note — the fixes do not touch this behavior, and `AppShell.test.ts` and `NoteActionBar.test.ts` pass.
- [met] The bar height matches the Properties header (both `h-10`) — the bar root is still `h-10` (`NoteActionBar.svelte:124`). The only class change is `mr-1` dropped from the hub button (`:136`), which leaves the bar height unchanged, and `AppShell.test.ts` passes.

## Checks run by this review

- `taskpolicy -c background pnpm check`: exit 0, 216 files, 0 errors, 0 warnings.
- `taskpolicy -c background pnpm vitest run src/tests/lib/features/note-action-bar src/tests/lib/app/AppShell.test.ts src/tests/lib/app/EditorView.test.ts`: exit 0, 6 files, 95 of 95 tests pass.
- Fix diff (`78bd5a452..HEAD`): it touches `help/documentation/03-editor.md`, two lines of `NoteActionBar.svelte` (a JSDoc and the hub button's `mr-1`) and `review.md`. It changes no test and does not touch `layer-baseline.json`, `BASELINE_SIZE`, the composition roots or `ledger.md`. Nothing is out of scope.
- Not run here: the full suite and `pnpm build` (deliver runs them).

## Findings

1. **nit**, `src/lib/features/note-action-bar/note-action-bar.logic.ts:101-105`: the `HUB_ACTION_WIDTH` JSDoc still counts the hub button's "margin", but commit 45055f27a removed its `mr-1`. The divider's `mx-1` now provides the spacing, so the 136 px estimate is still roughly right. Fix: optional. Say "and the divider after it" instead of "margin", or leave it, since the value is an estimate.
