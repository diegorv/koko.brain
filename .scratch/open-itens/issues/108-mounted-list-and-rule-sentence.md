# 108: The list stays mounted, the rule explains itself, and every note's tasks are listed by default

**Origin:** `tasks-view` Issue 04, moved here on 2026-11-08 and rewritten on 2026-11-12 from the Tasks view UX research (`.scratch/tasks-view-ux/research/`, `synthesis.md` and `critique.md`). Its PRD stays in `.scratch/archived/tasks-view/`. Issue numbers in this text are open-itens numbers. Line numbers are left out on purpose: the view file has changed since the first draft.

**What to build:** The Tasks view (Cmd+Shift+T, "Toggle Tasks View") looks empty and jumpy. This Issue fixes four things without changing what a row looks like.

1. **The list stays mounted during a refetch.** `buildTaskIndex` (`tasks.service.ts`) sets the loading flag on every call, and the view swaps the whole list for "Indexing tasks..." whenever it is set. A refetch runs on mount, on every index version bump and after every toggle, so focus and scroll are lost. Show "Indexing tasks..." only while `tasksStore.isLoading && tasksStore.fileTaskGroups.length === 0`. Otherwise keep the list and show `<Loader2 class="size-3.5 animate-spin text-muted-foreground" />` inside a `<span role="status" aria-label="Refreshing tasks">` in the toolbar while `tasksStore.isLoading`. Do not add height, padding, gap or wrap classes to the toolbar (`src/tests/lib/pane-toolbar.test.ts` forbids overrides). The store keeps its groups across a remount, so returning to the Tasks tab shows the previous list at once.
2. **Every note's tasks by default.** The store's default section tag becomes `''`, in the initial state and in `reset()` (`tasks.store.svelte.ts`). The view then lists every task in the vault through `get_all_tasks_v2`, which reads the in-memory index, instead of running the `get_tasks_in_section_v2` disk scan on every refetch. The textbox still accepts `#to-list` or any other tag. The one-click "To list" saved view stays in Issue 124.
3. **A rule sentence above the list.** A pure `describeTaskRule({ sectionTag, hideCompleted, dateFilter })` in `tasks.logic.ts` builds the sentence from three parts:
   - `Open tasks` when `hideCompleted`, else `All tasks`;
   - ` under headings containing <tag>` when the trimmed `sectionTag` is not empty (the tag as typed), else ` from every note`;
   - `, in notes edited in the last 7 days` for `last7days`, `, in notes edited in the last 30 days` for `last30days`, nothing for `all`.

   For example "Open tasks from every note" or "Open tasks under headings containing #to-list, in notes edited in the last 7 days". It renders as a `<p>` above the count and stays visible in the empty state too, but not while "Indexing tasks..." is shown. When the section tag is set, a "Clear" button follows the sentence: it clears the pending debounce timer, empties the textbox and calls `updateSectionTagFilter('')`.
4. **An empty state that names the cause.** A pure `explainEmptyTasks({ groups, sectionTag, hideCompleted, dateFilter })` in `tasks.logic.ts`, where `groups` is the unfiltered `tasksStore.fileTaskGroups` (already limited by the section tag on the Rust side). The view calls it only when the filtered list is empty. It returns `{ message: string; action?: { kind: 'clearTag' | 'showCompleted' | 'allTime'; label: string } }` for the first stage that empties the list, in this order:
   1. `groups` has no task: with a section tag, "No task sits under a heading containing <tag>" with `{ kind: 'clearTag', label: 'Clear' }`; without one, "No tasks in this vault yet" and no action.
   2. With hide-completed on, every task is completed: "All N tasks are completed" (N is the task count in `groups`; "The only task is completed" when N is 1) with `{ kind: 'showCompleted', label: 'Show completed' }`.
   3. Otherwise the date filter: "No note with tasks was edited in the last 7 days" (or 30) with `{ kind: 'allTime', label: 'All time' }`.

   Its result replaces the bare "No tasks found". The action renders as a button that runs the Clear handler above, `tasksStore.setHideCompleted(false)` or `tasksStore.setDateFilter('all')`.

Smaller fixes in the same pass:
- The section-tag textbox gets an explicit `aria-label="Section tag"` and loses the `Hash` icon in front of it: the tag the user types carries its own `#`.
- The view's root uses the same background token as the editor pane instead of `bg-card`.
- `help/documentation/10-tasks-and-todoist.md` says the view lists every task from every note by default, that a section tag limits it to tasks under a heading containing that tag, that the field is not saved and starts empty after a restart, and that the date filter uses the note's modification date (until Issue 238 replaces it). This covers Issue 227, which is closed as covered here.

**Blocked by:** none

**Blocked by (origin):** closed blockers dropped: tasks-view 01.

**Status:** ready-for-agent

**Answered:** owner, 2026-11-12: the default section tag becomes empty in this Issue, ahead of Issue 124. PRD B1 (a) said "All open" by default with a seeded "To list" view; the default part moves here, the seeded view stays in 124.

**Gate:** frontend only: `pnpm check` + `pnpm vitest run`, plus `bash scripts/e2e.sh` because the default list changes what the spec sees first.

- [ ] Failing test first, in `src/tests/lib/features/tasks/TasksView.test.ts` with the real `tasksStore`: `get_all_tasks_v2` resolves once with one note holding two tasks; focus the first circle button; then make the next `get_all_tasks_v2` call return a promise that never resolves and call `buildTaskIndex()` from the test. The two task rows are still in the DOM, `document.activeElement` is still that circle button, and the "Refreshing tasks" status is present. Fails today (the list is replaced by "Indexing tasks...").
- [ ] `tasks.logic.test.ts`: `describeTaskRule` for each combination of the three parts; `explainEmptyTasks` for each stage, including the order when several stages would each empty the list (an empty `groups` with hide-completed on names the tag, not hide-completed) and the N = 1 wording.
- [ ] Component test: with the section tag typed as `#to-list`, `get_tasks_in_section_v2` returning `[]` and `get_all_tasks_v2` returning one note with one open task, the empty state names `#to-list`; clicking Clear empties the textbox and the task is listed.
- [ ] `tasks.store.test.ts`: the initial state and `reset()` give an empty section tag. The existing `#to-list` default assertions change on purpose, and the commit says so.
- [ ] `tasks.service.test.ts`: with the default store, `buildTaskIndex` calls `get_all_tasks_v2` and not `get_tasks_in_section_v2`.
- [ ] The e2e spec passes. Its steps that clear the section tag become no-ops; Issue 110 removes them.

## Notes

- **Size:** S to M.
- Run in series with every other Tasks view Issue (108, 110, 234 to 241, 109, 111, 112, 113): they all edit `TasksView.svelte`.
- If Issue 204 (`EmptyState`, `InlineAlert`, `Badge`) has landed when this runs, render the empty state through `EmptyState`, and say in the delivery comment that the Tasks part of Issue 205 is covered here. Otherwise use a plain `<p>` plus a button.
- `audit-2026-11-05/35` (the list stays on screen during a refresh) is the same fix as part 1. The owner answered PRD L4 (a) on 2026-11-06: it is closed as wontfix, covered by this Issue. Do not edit `.scratch/archived/audit-2026-11-05/`.
- Issue 111 replaces `hideCompleted` in both logic functions with the Status quick filter, and Issue 238 replaces `dateFilter` with the Due filter.
- The flip also removes the per-refetch disk scan for anyone who leaves the box empty. Section matching stays as it is today (a case-sensitive substring of the heading) until Issue 115 moves it to TS.
