VERDICT: APPROVED

# Issue 255 re-review, round 2

Fixes reviewed: `git diff 31857fcdf..HEAD` (commit 001ea3390 plus the Resolution in `review.md`). It touches `src/lib/features/tasks/TasksView.svelte` (one condition split into a named `hidden` const) and `src/tests/lib/features/tasks/TasksView.collapse.test.ts` (one new test). No test lines removed, no scope creep.

## Previous findings

| # | Severity | Status | Evidence |
|---|----------|--------|----------|
| 1 | minor | rejection stands | The finding marked the fix optional. The branch runs on any `order` change that hides the current row; focus moves only through `focusIsFree(false)`, which a toolbar menu holding focus fails, and the new current row is the neighbour `tabStopRow` already gave the tab stop. Discovery default 3 records the choice. Adding `groupBy` tracking would be new state for a harmless outcome. |
| 2 | minor | resolved (circle path); cap case left out as optional | `TasksView.collapse.test.ts:326-335` focuses t2's `[data-task-toggle]` circle, clicks it, and asserts rows `t1, t3`, focus on t3 and `currentRow` line 3. I swapped `main`'s `TasksView.svelte` into the worktree and ran `-t "circle"`: exit 1, the new test fails; restored, worktree clean. The past-the-cap case is still untested, which the finding marked optional; it runs the same `hidden` branch (`TasksView.svelte:459-460`). |
| 3 | nit | resolved | `TasksView.svelte:459` now reads `const hidden = current !== null && prevShown.includes(current) && !shown.includes(current);` and `:460` `if (chosen === current && hidden)`. Same boolean as before: `&&` short-circuits identically and every operand is side-effect free, so behaviour is unchanged. |

## Acceptance criteria re-checked

- [met] Failing test first, in the Tasks collapse or keyboard component test file with the real stores and Issue 110's fixture: grouped by Status with Done collapsed, focus an open row and press Space; after the refetch, focus is on the next open row (or the previous one when it was the last), not on `<body>`. Fails today. — The Space tests at `TasksView.collapse.test.ts:305-324` are unchanged by the fix round and pass; the added circle test fails against `main`'s component (exit 1) and passes with the branch.
- [met] Clicking a chevron to collapse a group still moves no focus (Issue 240's rule), and its existing tests stay green. — The refactor keeps the condition's value; `TasksView.collapse.test.ts` passes in full (exit 0), including Issue 240's collapse tests.

## Checks run by the re-reviewer

- `pnpm check`: exit 0, 0 errors, 0 warnings.
- `pnpm vitest run src/tests/lib/features/tasks/TasksView.collapse.test.ts src/tests/lib/features/tasks/tasks-keys.logic.test.ts src/tests/lib/features/tasks/TasksView.sources.test.ts src/tests/lib/pane-toolbar.test.ts src/tests/lib/architecture/palette-classes.test.ts`: exit 0, 5 files, 92 tests passed.
- Negative check: the new circle test fails against `main`'s `TasksView.svelte`.
- The full suite was not run; it is deliver's step.

## Findings

No new findings. Nothing blocker, major or minor is open.
