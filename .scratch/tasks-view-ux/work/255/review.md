VERDICT: APPROVED

# Issue 255 review

Diff reviewed: `git diff main...HEAD` (TasksView.svelte focus-follow effect, TasksView.collapse.test.ts, tasks-keys.logic.test.ts, the discovery record). No `spec.md` exists in `.scratch/tasks-view-ux/`, so the Issue is the spec.

## Acceptance criteria

- [met] Failing test first, in the Tasks collapse or keyboard component test file with the real stores and Issue 110's fixture: grouped by Status with Done collapsed, focus an open row and press Space; after the refetch, focus is on the next open row (or the previous one when it was the last), not on `<body>`. Fails today. — `src/tests/lib/features/tasks/TasksView.collapse.test.ts:282-338` mounts through `mockTaskFetch`/`mountTasksView` from `src/tests/fixtures/tasks.fixture.ts` (Issue 110's fixture), with real tasksStore/editorStore/vaultStore, Status > All, grouped by Status, Done collapsed. Space on t2 asserts focus and current row on t3 and the tab stop on t3; Space on t3 asserts focus on t2. I swapped `main`'s `TasksView.svelte` into the worktree and ran the file: all three new tests fail (`neg exit 1`), then restored the branch file (worktree clean). With the fix, they pass.
- [met] A logic test in `tasks-keys.logic.test.ts` covers a current row that leaves the rendered set by moving into a collapsed group. — `src/tests/lib/features/tasks/tasks-keys.logic.test.ts:123-129` calls `nextCurrentRow(rendered, prevRendered, 'b')` with `b` hidden by a collapsed group (expects `c`), and the last-row case (expects `b`). It passes against the unchanged `nextCurrentRow` (`tasks-keys.logic.ts:75-88`), which is the function the component now feeds the rendered lists, so no second fallback was added.
- [met] Clicking a chevron to collapse a group still moves no focus (Issue 240's rule), and its existing tests stay green. — A collapse changes `rendered` but not `order` (`order` derives from `tasksStore.groups` at `TasksView.svelte:306-310`, the collapse set feeds only `shownGroups` at :321-331), so the new `next === prev` early return (`TasksView.svelte:456`) leaves it a no-op, as before when the effect did not rerun. The diff removes no test lines; Issue 240's `a collapse is not a removal` (:141) and `a refetch with the same rows after a mouse collapse moves no focus` (:164) pass. The mouse-collapse-then-refetch case is safe because the collapse run records `prevRendered` without the hidden row, so the `prevShown.includes(current)` guard is false.

## Checks run by the reviewer

- `pnpm check`: exit 0, 0 errors, 0 warnings.
- `pnpm vitest run src/tests/lib/features/tasks/`: exit 0, 20 files, 885 tests passed. This covers the two changed test files and `TasksView.sources.test.ts`.
- `pnpm vitest run src/tests/lib/pane-toolbar.test.ts src/tests/lib/architecture/palette-classes.test.ts` (both read the TasksView source): exit 0, 11 passed.
- Negative check: the three new component tests fail against `main`'s `TasksView.svelte`.
- The full suite was not run. It is deliver's step.

## Findings

1. minor, `src/lib/features/tasks/TasksView.svelte:459`: the new branch fires on any `order` change that hides a rendered current row, not only after a write. One example is switching Group by to a grouping where the current row's group is saved as collapsed, or a re-sort that pushes it past the 50-row cap. The current row then moves to a neighbour for good, so expanding that group later does not bring it back. Focus does not move, because the toolbar menu holds it and `focusIsFree(false)` is false. Discovery default 3 records this choice, and the result is harmless (the tab stop already sat on that neighbour via `tabStopRow`). Fix, optional: leave as is, or skip the branch when `tasksStore.groupBy` changed since the last run.
2. minor, `src/tests/lib/features/tasks/TasksView.collapse.test.ts:282`: the Issue's description also covers a write from the circle, and a row that lands past a group's 50-row cap. Neither path has a test, although both run through the same branch. Fix: add one case where a circle click moves the row into the collapsed Done group, and optionally one where the write puts the row past the cap of an expanded group.
3. nit, `src/lib/features/tasks/TasksView.svelte:459`: the condition line runs to about 120 characters, longer than the lines around it. Fix: split it, or name the hidden check (`const hidden = prevShown.includes(current) && !shown.includes(current)`).

## Resolution

1. Rejected, left as is (the finding marks the fix optional). The branch running on any `order` change that hides the current row is the choice recorded in discovery default 3: focus does not move, and the current row lands on the neighbour that already held the tab stop. Tracking `groupBy` changes would add state for a harmless case.
2. Fixed in part: `TasksView.collapse.test.ts` adds a circle-click case (focus on t2's circle, click, the row moves into collapsed Done, focus and current row go to t3). It fails against `main`'s `TasksView.svelte`. The past-the-cap case is optional in the finding and was not added: it runs the same `hidden` branch.
3. Fixed: `TasksView.svelte` names the check `const hidden = ...` and the condition reads `chosen === current && hidden`.
