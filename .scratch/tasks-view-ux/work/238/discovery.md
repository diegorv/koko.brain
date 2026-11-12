# Issue 238 discovery: a Due menu replaces the date pills

Repeats Issue 111's patterns (`work/111`): the Status menu markup, `quick` in the store, `TasksView.filters.test.ts` with `mockTaskFetch` / `openMenu`. Only the differences are listed.

## Files that change
- `src/lib/features/tasks/task-query.logic.ts`: `DueRange` type and `due?: DueRange` on `TaskQuickFilters` (:40-45); `QuickFilterField` gains `'due'` (:51, :57-62); `applyQuickFilters(rows, quick, today, now)` folds a due predicate into the per-row pass (:123-141); delete `dateFilterDays` + `applyEditedCutoff` (:143-157); `TaskRuleOptions` drops `dateFilter` (:234-241); `describeTaskRule` appends the Due phrase after the heading part (:260-265); `EmptyTasksExplanation.action` swaps `allTime` for `{ kind: 'resetQuick', field: 'due' }` (:272); `explainEmptyTasks` takes `today`, `now`, its status stage strips `due`, its third stage becomes the cumulative Due stage (:282-327).
- `src/lib/features/tasks/tasks.types.ts:31-32`: delete `TaskDateFilter`.
- `src/lib/features/tasks/tasks.store.svelte.ts:1-2,9,35-39,47,59,75`: drop `dateFilter`/`setDateFilter`; derived reads `formatNow('YYYY-MM-DD')` and `Date.now()`.
- `src/lib/features/tasks/tasks.service.ts:18-22`: `fromV2` doc names `applyQuickFilters`' edited options.
- `src/lib/features/tasks/TasksView.svelte:39,58-62,129-147,161-165,285-297`: Due menu (one `RadioGroup`, separator inside), `pickDue`, `runEmptyAction(action)` with a `resetQuick` branch, no pills.
- `help/documentation/10-tasks-and-todoist.md:15,105,109`.
- Tests: `task-query.logic.test.ts`, `tasks.store.test.ts`, `TasksView.filters.test.ts`, `TasksView.test.ts:470-484` (the All time case becomes a Reset Due filter case under Note edited in the last 7 days).

## Plan (commits)
1. Logic, test-first: due cases of `applyQuickFilters` (incl. Sao Paulo Dec-Jan window), `isQuickFieldDefault` due, `describeTaskRule` table, `explainEmptyTasks` Due stage; port the `applyEditedCutoff` and date-stage cases; every call gets `today`, `now`. Store, service doc and view updated in the same commit so `pnpm check` stays green (removing `TaskDateFilter` breaks them otherwise).
2. View + store tests: Due menu cases in `TasksView.filters.test.ts`, store clock case, `TasksView.test.ts` port.
3. Help doc.

## Prior art
- Status menu `TasksView.svelte:254-283` and its tests `TasksView.filters.test.ts:88-163`.
- Clock faking: `TasksView.filters.test.ts:203-218` (`vi.useFakeTimers({ toFake: ['Date'] })`).
- `withTimeZone` / `runtimeTimeZoneSwitchWorks` from `src/tests/fixtures/timezone.fixture.ts`.

## Risks
- `formatDateWithOffset` goes through dayjs local parsing: the Sao Paulo case guards it.
- Grep `dateFilter|DateFilter|filterByDate|applyEditedCutoff|allTime`: hits only in the files above; all deleted or migrated. No e2e or mock hit.
- `src/tests/lib/tasks-palette.test.ts` (Issue 236) does not exist on main; skipped from the targeted checks.

## Defaults taken
- No date: `!metadata.dueDate` (absent; an empty string, which Rust never sends, counts as no date too).
- Due trigger labels live in the view's option constant, beside the item labels (no new exported logic).
- The resetQuick action's `field` is typed `'due'`; Issue 239 widens it when it adds stages.
- The Due stage message is the same whatever the Status filter: "No task matches the Due filter".
