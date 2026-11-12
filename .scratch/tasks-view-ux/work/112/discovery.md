# Issue 112 discovery: group the Tasks list

## Files that change

- `src/lib/features/tasks/task-query.logic.ts:306-348`: `NoteRows` and `rowsByNote` are replaced by `TaskGroupKey`, `TaskSortKey`, `DEFAULT_TASK_SORT`, `GroupedRow`, `TaskGroup` and `groupTaskRows(rows, groupBy, sort, today)`. Imports `compareTaskPaths` from `tasks.logic` (already imports from it) and `formatDateWithOffset` (already imported).
- `src/lib/features/tasks/tasks.store.svelte.ts:16,43,85`: `groupBy` (`$state`, `'note'`), `sort` (`$state.raw`, copy of `DEFAULT_TASK_SORT`), a module-level `$derived` `groups` = `timeSync('TASK-PROFILE', 'groupTaskRows', () => groupTaskRows(visibleRows, groupBy, sort, formatNow('YYYY-MM-DD')))`; getters `groupBy`, `sort`, `groups`; `setGroupBy`; `reset()` restores both.
- `src/lib/features/tasks/TasksView.svelte`: `notes` (l.132) becomes `tasksStore.groups`; `rowsByKey` (l.282) flattens `groups` keyed `taskRowKey(row.filePath, row.lineNumber)`; Display menu after the search input (l.479); the note loop (l.644-761) becomes `{#each groups as group (group.key)}` with a `groupHeader` snippet (note header vs label + count) and a `taskRow` snippet shared by both branches (113's roving tabindex untouched); breadcrumb line and no indent in flat groups; order effect (l.350-363) refocuses the current row's new element when focus fell to `<body>`.
- `help/documentation/10-tasks-and-todoist.md:13`: Display menu sentence.

## Tests

- `task-query.logic.test.ts`: `rowsByNote` block (l.230-263) moves onto the Note group of `groupTaskRows`; new blocks per grouping, sort, breadcrumb, counts (Issue's first three criteria).
- `tasks.store.test.ts`: copy the fake-clock block (l.140-176) for `groups`, `groupBy`, `sort`, `reset`.
- `TasksView.grouping.test.ts` (new): copy the setup of `TasksView.keyboard.test.ts` (mocks, `press`, `until`, stateful toggle mock l.188-205), plus `openMenu` from the fixture.

## Plan

1. Logic + its tests (red, then green), delete `rowsByNote` once the view stops calling it (same commit as the view switch).
2. Store fields + tests.
3. View: Display menu, groups, snippets, focus follow; grouping tests.
4. Help doc.

## Defaults taken

- `DEFAULT_TASK_SORT` typed `TaskSortKey[]` as the Issue writes it; the store copies it.
- The `path` sort key compares `relPath` with `compareTaskPaths`; the final tie-break is `relPath` then `lineNumber`.
- Due "No date" is `!metadata.dueDate` (same test as the Due filter's `none`).
- Header branch: a group is a Note group when `group.filePath !== undefined`.
- Display trigger: same classes as the filter triggers plus `shrink-0`, content `align="end"`.
- `tasks.service.test.ts` and `app-lifecycle.service.test.ts` mock `debug.js` without `timeSync` but never read `tasksStore.groups` nor mount the view (the derived is lazy), so their mocks stay as they are; `tasks-view-settings.test.ts` spreads the real module.

## Risks

- `order` is a new array on every `groups` recompute (refetch, settings write), so the focus-follow runs then too; it moves focus only from `<body>`, as 113's removal path already does.
- Status words are lower case (`in progress`): labels upper-case the first letter only.
