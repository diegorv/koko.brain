# Issue 111 discovery: filter row, Status menu, row model

## Files that change
- New `src/lib/features/tasks/task-query.logic.ts`: `TaskRow`, `VisibleRow`, `TaskQuickFilters`, `DEFAULT_QUICK`, `QuickFilterField`, `isQuickFieldDefault`, `toggleQuickStatus`, `buildTaskRows`, `applyQuickFilters`, `applyEditedCutoff`, `rowsByNote`, `statusFilterLabel`, `taskCountText`; `describeTaskRule`, `explainEmptyTasks`, `EmptyTasksExplanation`, `dateFilterDays`, `displaySectionTags` moved from `tasks.logic.ts:121-275`.
- `src/lib/features/tasks/tasks.logic.ts`: delete `hasOpenDescendants`/`filterCompletedTasks`/`filterCompleted`/`filterByDate`/`computeTaskStats` (:17-120, only callers `TasksView.svelte:27-29,114-121` and tests) and the moved block.
- `src/lib/features/tasks/tasks.store.svelte.ts:14,35,44,56`: `hideCompleted` -> `quick`, `rows` (`$state.raw`), `setQuick`, `resetQuick`, `setRows`, module-level `$derived.by` behind `visibleRows`.
- `src/lib/features/tasks/tasks.service.ts:15-21,99-101`: `setRows(buildTaskRows(groups, vaultStore.path))` after `setFileTaskGroups`; fromV2 doc names `applyEditedCutoff`.
- `src/lib/features/tasks/TasksView.svelte`: toolbar = title + count + spinner; new filter row (Status `DropdownMenu`, date pills, tag textbox moved unchanged); list renders `rowsByNote(tasksStore.visibleRows)`; `today` and the no-list alert read `rows`; `opacity-60` on dimmed rows; `showAllStatuses` action.
- Tests: new `task-query.logic.test.ts`, new `TasksView.filters.test.ts`; `tasks.logic.test.ts` (moved/deleted cases), `tasks.store.test.ts`, `tasks.service.test.ts`, `TasksView.test.ts` (every `setHideCompleted`, the hide-toggle test, count-position asserts).
- `e2e/specs/tasks-view.spec.ts:41-58`, `help/documentation/10-tasks-and-todoist.md:15,103-109`.

## Plan (commit order)
1. Logic: stubs, failing `task-query.logic.test.ts`, implement; move describe/explain and port cases.
2. Store + service with tests.
3. View + `TasksView.filters.test.ts` + `TasksView.test.ts` updates; delete dead logic and its cases.
4. e2e spec + help doc; targeted checks + `bash scripts/e2e.sh e2e/specs/tasks-view.spec.ts`.

## Prior art
- Fixture `src/tests/fixtures/tasks.fixture.ts` (`mockTaskFetch`, `mountTasksView`, `openMenu`), work/110 for its use.
- Title markup `FilesNavigator.svelte:309`; dropdown `PropertiesView.svelte:170-200`.

## Risks
- Count moves to the toolbar: `TasksView.test.ts` asserts reading it as a sibling of the rule sentence or the alert change to a `data-task-count` hook.
- `visibleRows` is the first module-level `$derived` in a store; node tests pin values only (ADR-0034).
- bits-ui RadioGroup: value `''` while statuses chosen; `onValueChange` must clear `statuses` even on the same value.

## Defaults taken
- `explainEmptyTasks` uses `now` to confirm the cutoff empties the list before naming the date stage; otherwise the "No tasks found" fallback.
- Deliberate: `filterByDate` deleted here (orphan rule); note totals live on the row (`noteTaskCount`, `noteOpenCount`), not a second `rowsByNote` parameter.
- Toolbar count carries `data-task-count` for tests; trigger is a plain button with a `ChevronDown` (`aria-hidden`).
