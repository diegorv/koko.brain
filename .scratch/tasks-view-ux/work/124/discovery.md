# Issue 124 discovery: global excludes, saved views, "To list" seed

No `spec.md` in `.scratch/tasks-view-ux/`. Plumbing is Issue 243's (work/243): `settingsStore.tasksView` / `updateTasksView`, `loadSavedTasksView` called from `initializeVault` (`app-lifecycle.service.ts:213`), unchanged.

## Files that change
- `src/lib/features/tasks/task-views.logic.ts` (new): `TaskViewQuery`, `SavedTaskView`, `TaskViewsState`, `ALL_OPEN_ID`/`TO_LIST_ID`, `ALL_OPEN_VIEW`, `BUILT_IN_TASK_VIEWS`, `mergeExcludes`, `toListView(sectionTag)`, `viewQueryOf(query, groupBy, sort)` (drops `quick.search`), `findTaskView`, `parseTasksViewState(raw)` (field-wise validation, seed), `withTasksViewState(raw, state)` (drops `sectionTag`/`headingTags`/`query`, keeps unknown keys, numeric `version` else 1).
- `task-query.logic.ts:387-426`: add `emptyTaskExcludes()`; `defaultTaskQuery()` own exclude becomes `emptyTaskExcludes()`; `tagHeadingCardText` (:412) loses its only caller and goes.
- `tasks.logic.ts:32-65`: `parseTasksView`, `withSectionTag`, `DEFAULT_SECTION_TAG`, `isPlainObject` lose their callers and go; `parseSectionTags` stays (seed).
- `tasks.store.svelte.ts`: `globalExcludes`, `savedViews`, `activeList`, derived `effectiveQuery` (query with `mergeExcludes`), `sourceRows` reads it; setters `setGlobalExcludes`, `setSavedViews`, `setActiveList`, `setSession(TaskViewQuery)`; `reset()` restores all (default = the seeded state: one "To list" view, active).
- `tasks.service.ts:102-135`: `setTaskSources` only sets the store; `loadSavedTasksView` rewritten; new `selectTaskList`, `saveTaskView`, `renameTaskView`, `duplicateTaskView`, `deleteTaskView`, `setTaskExcludes`, one private `writeTasksViewState()` through `updateTasksView`.
- `SourcesPanel.svelte:72,219-221`: the Excludes section reads `tasksStore.globalExcludes` and writes through `setTaskExcludes`.
- `TasksView.svelte:165,171`: rule sentence and empty-state explanation read `tasksStore.effectiveQuery`.
- `help/documentation/10-tasks-and-todoist.md:5,119,125-128,134`.

## Tests
- `tasks-view-settings.test.ts`: rewritten on its own harness (openVault/reload/payloads/settle) for every criterion.
- `task-views.logic.test.ts` (new): merge, parse, writer, seed. `tasks.store.test.ts`: new getters, reset, excludes via `setGlobalExcludes`. `tasks.service.test.ts:489-570`: write-back cases replaced. `tasks.logic.test.ts:77-128` and `task-query.logic.test.ts` `tagHeadingCardText` cases removed; `defaultTaskQuery` cases updated. `TasksView.sources.test.ts`: panel exclude asserts move to `globalExcludes`; `TasksView.test.ts:463,1021`.
- e2e `tasks-view.spec.ts` must pass unchanged.

## Defaults taken
- Invalid `globalExcludes` or `savedViews` falls back per field (other valid fields kept), so one bad field does not wipe saved views at the next write. One log and one toast per load.
- A non-string legacy `sectionTag` while seeding counts as invalid (as 243 did).
- Row-menu "Hide this folder/note/type" keeps editing the active list's own `query.exclude` (session only, Issue 117 wording); the panel edits the global ones.
- `selectTaskList` with an unknown id does nothing. `rename`/`duplicate`/`delete` act on saved views only (built-ins are not in `savedViews`) and return `false`/`null` otherwise. `duplicateTaskView` does not change the active list. `saveTaskView` returns the new id, or null for a blank name.
- Saved view clauses, quick filters, `groupBy` and `sort` are validated field by field on load (a malformed clause is dropped), since a bad value would throw in `selectSourceRows`.

## Risks
- `settingsStore.tasksView` is a deep `$state` proxy: the parser builds fresh objects so `tasksStore` never holds proxies.
- Persistence effect must see nested key changes: the writer returns a fresh object each write.
