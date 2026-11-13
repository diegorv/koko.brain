# Issue 239 discovery: priority and tag filters, search, Reset filters, narrow fold

Repeats Issue 111's and 238's patterns (`work/111`, `work/238`): `quick` in the store, a menu per field, `TasksView.filters.test.ts` with `mockTaskFetch` / `openMenu`. Only the differences are listed. No `spec.md` exists for this feature.

## Files that change
- `src/lib/features/tasks/task-query.logic.ts`: `TaskQuickFilters` gains `priorities`, `tags`, `search` (:48-55); `QuickFilterField` + `isQuickFieldDefault` gain `priority | tag | search` (:61-75); new `TASK_PRIORITIES`, `priorityWord`, `toggleQuickPriority`, `matchesNestedTag`, `taskTagOptions`, `tagMenuOptions`, `toggleQuickTag`; `applyQuickFilters` folds three predicates into its per-row pass (:173-175); `describeTaskRule` appends priority, tag, search (:304-309); `EmptyTasksExplanation.action.field` widens (:319); `explainEmptyTasks` gets three cumulative stages after Due (:364-370).
- `src/lib/features/tasks/tasks.store.svelte.ts:15`: doc only (store already merges/clears keys).
- `src/lib/features/tasks/TasksView.svelte`: search box in the toolbar (:258-268), count `@max-[420px]:hidden` (:261); Status/Due items moved into snippets, Priority and Tag menus, folded `Filters (n)` menu, Reset filters button, `flex-wrap` on the filter row (:271-339); subtitle `@max-[560px]:hidden` (:402).
- `help/documentation/10-tasks-and-todoist.md` Filters table (:105-111).
- Tests: `task-query.logic.test.ts`, `tasks.store.test.ts`, `TasksView.filters.test.ts`, `e2e/specs/tasks-view.spec.ts`.

## Plan (commits)
1. Logic test-first: priority, tag, search predicates, `matchesNestedTag`, `taskTagOptions`, `isQuickFieldDefault`, `describeTaskRule`, `explainEmptyTasks`. Widen the view's `runEmptyAction` type in the same commit if `pnpm check` needs it.
2. Store test (`visibleRows` follows priorities, tags, search; reset).
3. View: snippets, Priority/Tag menus, search, Reset filters, fold; component tests.
4. e2e narrow fold case, run the spec.
5. Help doc.

## Prior art
- Status checkbox items + `toggleQuickStatus` (`TasksView.svelte:291-299`, `task-query.logic.ts:81-87`) for Priority and Tag.
- `TasksView.filters.test.ts` helpers `triggerStarting`, `menuItem`, `openMenuEl`.
- e2e narrow viewport: `tasks-view.spec.ts` "a narrow pane puts the overdue due chip...".

## Risks
- Both the four menus and `Filters (n)` render in jsdom: triggers are found by text prefix, items scoped to the open menu.
- `menu-item-anatomy.test.ts`: no `text-xs`/margins inside items or labels; `pane-toolbar.test.ts`: the toolbar's class list is untouched.
- `taskDisplayText` per row per keystroke: in-memory, fine.

## Defaults taken
- Folded menu: each group is `Label`, `Separator`, then its items (the literal "a label and a separator before each group").
- Tag options: `taskTagOptions(rows)` plus chosen tags missing from it by exact spelling (`tagMenuOptions`), re-sorted case-insensitively; `toggleQuickTag` stores chosen tags in option order.
- Search stores the typed text as is (whitespace included) and `undefined` only for an empty box; blank counts as default everywhere.
- Search box gets only the classes the Issue names (no `ml-auto`).
- The e2e asserts the hidden menu triggers with `includeHidden` and a count of 1, so "hidden" is not satisfied by absence.
