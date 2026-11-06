# 04: The list stays mounted, and the rule explains itself

**What to build:** Three things that make the current view hard to use, without changing what it lists.

1. **The list stays mounted during a refetch.** Every refetch swaps the whole list for "Indexing tasks..." (`TasksView.svelte:169-170`; `tasks.service.ts:65` sets loading on every call, and a refetch runs on every index version bump and after every toggle). Focus and scroll are lost. Show "Indexing tasks..." only while `tasksStore.isLoading && tasksStore.fileTaskGroups.length === 0`. Otherwise keep the list and show `<Loader2 class="size-3.5 animate-spin text-muted-foreground" />` inside a `<span role="status" aria-label="Refreshing tasks">` in the toolbar, just before the section-tag textbox, while `tasksStore.isLoading`. Do not add height, padding or gap classes to the toolbar itself (`src/tests/lib/pane-toolbar.test.ts` forbids overrides).
2. **A rule sentence above the list.** A pure `describeTaskRule({ sectionTag, hideCompleted, dateFilter })` in `tasks.logic.ts` builds the sentence from three parts:
   - `Open tasks` when `hideCompleted`, else `All tasks`;
   - ` under headings containing <tag>` when the trimmed `sectionTag` is not empty (the tag as typed), else ` from every note`;
   - `, in notes edited in the last 7 days` for `last7days`, `, in notes edited in the last 30 days` for `last30days`, nothing for `all`.

   For example "Open tasks under headings containing #to-list, in notes edited in the last 7 days" or "Open tasks from every note". It renders as a `<p>` above the count (`TasksView.svelte:174-176`) and stays visible in the empty state too, but not while "Indexing tasks..." is shown. When the section tag is set, a "Clear" button follows the sentence: it clears the pending debounce timer, sets `sectionTagInput` to `''` (so the textbox empties) and calls `updateSectionTagFilter('')`. The default tag stays `#to-list` (`tasks.store.svelte.ts:8`) until Issue 17 (PRD decision B1).
3. **An empty state that names the cause.** A pure `explainEmptyTasks({ groups, sectionTag, hideCompleted, dateFilter })` in `tasks.logic.ts`, where `groups` is the unfiltered `tasksStore.fileTaskGroups` (already limited by the section tag on the Rust side). The view calls it only when the filtered list is empty. It returns `{ message: string; action?: { kind: 'clearTag' | 'showCompleted' | 'allTime'; label: string } }` for the first stage, in this order, after which nothing is left:
   1. `groups` has no task: with a section tag, "No task sits under a heading containing <tag>" with `{ kind: 'clearTag', label: 'Clear' }`; without one, "No tasks in this vault yet" and no action.
   2. With hide-completed on, every task is completed: "All N tasks are completed" (N is the task count in `groups`; "The only task is completed" when N is 1) with `{ kind: 'showCompleted', label: 'Show completed' }`.
   3. Otherwise the date filter: "No note with tasks was edited in the last 7 days" (or 30) with `{ kind: 'allTime', label: 'All time' }`.

   Its result replaces the bare "No tasks found" at `:171-172`; the action renders as a button that calls the Clear handler above, `tasksStore.setHideCompleted(false)` or `tasksStore.setDateFilter('all')`.

The section-tag textbox (`:154-163`) stays, with an explicit `aria-label="Section tag"`.

**Blocked by:** 01

**Status:** ready-for-agent

**Gate:** frontend only: `pnpm check` + `pnpm vitest run`.

- [ ] Failing test first, in `src/tests/lib/features/tasks/TasksView.test.ts` (Issue 01's file, same mocks) with the real `tasksStore`: with the default tag, `get_tasks_in_section_v2` resolves once with one note holding two tasks; focus the first circle button; then make the next `get_tasks_in_section_v2` call return a promise that never resolves and call `buildTaskIndex()` from the test. The two task rows are still in the DOM, `document.activeElement` is still that circle button, and the "Refreshing tasks" status is present. Fails today (the list is replaced by "Indexing tasks...").
- [ ] `tasks.logic.test.ts`: `describeTaskRule` for each combination of the three parts; `explainEmptyTasks` for each case above, including the order when several stages would each empty the list (an empty `groups` with hide-completed on names the tag, not hide-completed) and the N = 1 wording.
- [ ] Component test: with the default tag, `get_tasks_in_section_v2` returning `[]` and `get_all_tasks_v2` returning one note with one open task, the empty state names `#to-list`; clicking Clear empties the textbox and the task is listed.
- [ ] The e2e spec still passes unchanged (it fills the textbox by its accessible name, `/section tag/i`).

## Notes

- **Size:** S.
- Open Issues `ux-polish/59` (an `EmptyState` primitive) and `ux-polish/60` (move the tasks panel onto it) touch the same empty state. Both were `needs-triage` when this Issue was written. If 59 has landed when this runs, render the empty state through `EmptyState`, and say in the delivery comment that the Tasks part of 60 is covered here, so 60 drops it. Otherwise use a plain `<p>` plus a button, as today.
- Issue 07 replaces `hideCompleted` and `dateFilter` in both functions with the quick filters.
