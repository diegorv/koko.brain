# 125 discovery: "No date" built-in, list counts, empty-state hint, "modified" marker

No `spec.md` in `.scratch/tasks-view-ux/`; the Issue is the spec. Builds on work/247 (list column, `TaskLists.svelte`) and work/124 (built-ins, saved-view write path). Issue 246's row menu Due item exists (`TasksView.svelte:663`), Issue 129's `todoist` quick field does not, so it is not normalized.

## Files that change
- `task-views.logic.ts:56-76`: `NO_DATE_ID = 'no-date'`, `NO_DATE_VIEW` (All open's query with `quick.due: 'none'`), `BUILT_IN_TASK_VIEWS = [ALL_OPEN_VIEW, NO_DATE_VIEW]`, `isBuiltInTaskView(id)`, `countTaskViewRows(rows, query, globalExcludes, folders, today, now)` (non-dimmed rows, `mergeExcludes` then `selectSourceRows` then `applyQuickFilters`).
- `task-query.logic.ts`: `isQuickModified(current, saved)` and `isQueryModified(current, saved)` (normalize: defaults, set-like arrays sorted, `negate` default, sorted keys; `search` ignored). `explainEmptyTasks` Due stage (`:1392-1398`): a date window (overdue/today/next7) over a vault with no dated task says "No task in this vault has a due date" with a `hint` naming `📅 <today>` and the row menu's Due; `none` says "Every open task has a due date". New optional `hint` on `EmptyTasksExplanation`.
- `tasks.service.ts:128-225`: `revertTaskList()` (re-copies the active list's query, no write) and `saveTaskViewQuery(id)` (session `viewQueryOf` into that saved view, `writeTasksViewState`).
- `tasks.store.svelte.ts:155`: `resetQuick(quick = DEFAULT_QUICK)`.
- `TaskLists.svelte`: lists from `BUILT_IN_TASK_VIEWS`; row menu only on saved views; column count per list (the active list counts the session's `visibleRows`, so it matches the screen); new `variant: 'marker'`: "modified" + Save as view/Reset (built-in) or Save/Revert (saved view), reusing the name input.
- `TasksView.svelte`: marker after the sentence row (`:1074`); empty-state hint; Reset filters restores and compares against the active list's saved quick filters (`:236`, `:1036-1043`).
- Tests updated where the Due message or the column contents change: `TasksView.lists.test.ts` (`columnLists` arrays), `task-query.logic.test.ts` stage 5, `TasksView.filters.test.ts:275`.
- `help/documentation/10-tasks-and-todoist.md` Lists and Reset filters paragraphs.

## Plan (commits)
1. discovery.md.
2. Failing logic tests (`task-query.logic.test.ts`: No date over fixed rows, `isQueryModified`, Due empty states; `task-views.logic.test.ts`: `NO_DATE_VIEW`, counts), then the logic.
3. Service + store tests (`tasks.service.test.ts`, `tasks.store.test.ts`), then `revertTaskList`, `saveTaskViewQuery`, `resetQuick(quick)`.
4. UI tests in `TasksView.lists.test.ts`, then TaskLists/TasksView changes. 5. Help doc.

## Prior art
- `TasksView.lists.test.ts` harness (real settings persistence, `lastTasksView()`, `settle()`), `task-query.logic.test.ts` `dueTask`, `rowsFrom`, `explain`.

## Defaults taken
- The Issue's UI tests go in `TasksView.lists.test.ts`, the TasksView file that holds the settings.json harness since 247 (the Issue predates it).
- The count sits beside the list button (not inside, so its accessible name stays the list name), linked by `aria-describedby`; hidden until the first fetch settles. Column only, not the narrow dropdown.
- The date-window case of "No task has a due date" checks every task of the vault; the hint is "Type 📅 <today> after a task's text, or right-click a task and pick Due." Both keep the Reset Due filter action. "Every open task has a due date" drops "open" when the status filter is not the default.
- Reset filters shows while the quick filters differ from the active list's saved ones or a search is typed; it restores the saved quick filters and clears the search.
- Save, Reset, Revert and a committed Save as view remove the marker, so focus is not moved (same as Reset filters today); Escape in the name input returns focus to "Save as view".

## Risks
- `isQueryModified` takes a `TaskViewQuery`: a type-only import from `task-views.logic.ts`, which imports `task-query.logic.ts` (erased at build, no runtime cycle).
- Per-list counts run every non-active list's query on each rows change: fine for a few lists.
