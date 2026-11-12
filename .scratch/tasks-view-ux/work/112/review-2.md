VERDICT: APPROVED

# Re-review round 2: Issue 112, group the Tasks list

Reviewed `git diff 9a4fc6195..HEAD` (fix commit e25e2183e): `TasksView.svelte`, `TasksView.grouping.test.ts`, `help/documentation/10-tasks-and-todoist.md` and the Resolution in `review.md`.

## Previous findings

| # | Severity | Finding | Status | Evidence |
|---|----------|---------|--------|----------|
| 1 | minor | Focus-follow branch refocuses on every recompute of `groups` | resolved | `TasksView.svelte:352` records `lastFocusedRowEl` in `handleListFocusin`; `TasksView.svelte:379` refocuses only when focus is on `<body>` and `lastFocusedRowEl` is set and no longer `isConnected`. A recompute that keeps the keyed `{#each}` element leaves focus alone; a row recreated in another group (Status grouping, Space on a todo) has a disconnected old element, so focus follows. The removed-row path (`chosen !== current`) is untouched. New test `a recompute with the same rows leaves focus on <body>` (`TasksView.grouping.test.ts:239`) focuses and blurs a row, calls `tasksStore.setRows([...tasksStore.rows])` (new array, so `order` recomputes) and asserts focus stays on `<body>` and `currentRow` is unchanged. Passes; the Status-grouping Space test (`:222`) still passes. |
| 2 | nit | Help sentence "Ticking a task does not move its note" too broad | resolved | `help/documentation/10-tasks-and-todoist.md:13` scopes it to the Note grouping and says a ticked task can move group under the others (Done under Status when done tasks are shown). Accurate to the code. |
| 3 | nit | Test-first red step not visible in history | rejection stands | The review asked for no change; nothing to fix. |

## Acceptance criteria re-checked

- [met] `TasksView.grouping.test.ts`: under Display > Due date, ArrowDown moves focus from the last row of one bucket to the first row of the next; with the Open filter, Space completes the last Overdue row and, after the refetch, focus is on the first Today row; under Display > Status with Status > All, Space on a todo row moves it to the Done group and focus is on that row's new element, not on `<body>`. — tests at `TasksView.grouping.test.ts:195`, `:208`, `:222` pass after the fix; the Space-to-Today case goes through the unchanged `chosen !== current` branch, the Status case through the new disconnected-element check.
- [met] `help/documentation/10-tasks-and-todoist.md` (the sentence near the top that says tasks are grouped by source file, in path order since Issue 234) describes the Display menu, the default note grouping by path, and the due, priority, path sort of the other groupings, with the parent shown above a flat row (PRD A12). — line 13 keeps the path-order sentence with the scoped ticking note; line 15 still describes the Display menu, the flat due/priority/path sort and the parent line.

## Checks

- `pnpm check`: exit 0, 0 errors, 0 warnings.
- `pnpm vitest run src/tests/lib/features/tasks/`: exit 0, 13 files, 526 tests passed (includes all four `TasksView*.test.ts` files).
- Full suite not run: deliver runs it.
- No test weakened or deleted; the fix adds one test. No scope creep: the diff touches only the three files the findings name plus `review.md`.
- Not verified independently: that the new test fails without the fix (the round-1 probe confirmed the bug; the fix step reports the red run).

## Findings

None open or new.
