VERDICT: APPROVED

Re-review round 2 of `issue/111-quick-filters`: the fix commit a2b402082 after `review.md` was first committed (cbe3d8c82). The fix diff touches only `src/tests/lib/features/tasks/TasksView.filters.test.ts` (+22 lines) and the Resolution in `review.md`; no app code changed.

## Previous findings

| # | Severity | Finding | Status | Evidence |
|---|----------|---------|--------|----------|
| 1 | minor | No test pins the toolbar layout (`TasksView.svelte:240-251`) | resolved | `TasksView.filters.test.ts:220-240` queries `.pane-toolbar` and asserts the `.text-title` text "Tasks", `[data-task-count]` "1 open in 1 note" inside it and absent from `[data-task-filters]`; the Status trigger, the "Last 7 days" pill and the `Section tag` input inside `[data-task-filters]` (trigger not in the toolbar); after `setLoading(true)` on a loaded store, `[role="status"]` is in the toolbar and not in the filter row. This matches the markup at `TasksView.svelte:240-253`, where the spinner renders only when `hasLoaded && isLoading`. Moving the count into the list body would now fail the `toolbar.querySelector('[data-task-count]')` assertion. |

## Acceptance criteria re-checked

- [met] New `src/tests/lib/features/tasks/TasksView.filters.test.ts`, serving tasks through `mockTaskFetch` and mounting with `mountTasksView`, opening menus with `openMenu` (all three from Issue 110's `src/tests/fixtures/tasks.fixture.ts`). Read menu items only inside `[role="menu"][data-state="open"]`, and assert a closed menu by `data-state`, not by its removal (jsdom never ends the exit animation). One note with an open todo task and a done task, both at indent 0: Status > Closed shows only the done row, the rule sentence starts with "Closed tasks" and the toolbar count reads "1 task in 1 note"; Status > Open brings the open row back and the count reads "1 open in 1 note". — The fix adds one case to this file and edits none of its existing cases (diff is pure addition at :220-240); `pnpm vitest run src/tests/lib/features/tasks/TasksView.filters.test.ts` exit 0, 9 passed, including the Closed/Open count case. The full suite is deliver's to run.

## Checks run

- `pnpm check`: exit 0, 0 errors, 0 warnings.
- `pnpm vitest run src/tests/lib/features/tasks/TasksView.filters.test.ts`: exit 0, 9 passed.
- No test weakened or deleted; no layer baseline, `BASELINE_SIZE` or composition-root change in the fix; no scope creep.

## Findings

1. nit — `src/tests/lib/features/tasks/TasksView.filters.test.ts:235-237`: the spinner assertion has no negative control (it does not check that `[role="status"]` is absent before `setLoading(true)`), so it would also pass if the spinner rendered unconditionally. Fix (optional): assert `toolbar.querySelector('[role="status"]')` is null before the `setLoading(true)` call. The gate itself is already pinned by `TasksView.test.ts:345-373` ("keeps the rows and their focus during a refetch", null before and after the refetch), so this does not block.
