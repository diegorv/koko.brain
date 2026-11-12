# 108: The Tasks list stays mounted, and the rule explains itself

**Origin:** `tasks-view` Issue 04, moved here on 2026-11-08 and rewritten on 2026-11-12 from the Tasks view UX research (`.scratch/tasks-view-ux/research/`) and its review. Its PRD stays in `.scratch/archived/tasks-view/`. Issue numbers in this text are open-itens numbers. Line numbers are left out on purpose: the view file has changed since the first draft.

**What to build:** The Tasks view (Cmd+Shift+T, "Toggle Tasks View") looks empty and jumpy. This Issue fixes three things without changing what it lists or what a row looks like. The default section tag stays `#to-list`.

1. **The list stays mounted during a refetch.** `buildTaskIndex` (`tasks.service.ts`) sets the loading flag on every call, and the view swaps the whole list for "Indexing tasks..." whenever it is set. A refetch runs on mount, on every index version bump and after every toggle, so focus and scroll are lost.
   - The Tasks store gains a `hasLoaded` flag (getter plus setter): false at start and after `reset()`, set true when the first fetch finishes, success or failure. "Indexing tasks..." shows only while `!tasksStore.hasLoaded`. A list that is legitimately empty stays an empty state during later refetches instead of flashing the loading text.
   - Otherwise the list stays, and while `tasksStore.isLoading` a `<Loader2 class="size-3.5 animate-spin text-muted-foreground" />` inside a `<span role="status" aria-label="Refreshing tasks">` shows in the toolbar. Do not add height, padding, gap or wrap classes to the toolbar (`src/tests/lib/pane-toolbar.test.ts` forbids overrides).
   - The store keeps its groups across a remount, so returning to the Tasks tab shows the previous list at once.
2. **A rule sentence above the list.** A pure `describeTaskRule({ sectionTag, hideCompleted, dateFilter })` in `tasks.logic.ts` builds the sentence from three parts:
   - `Open tasks` when `hideCompleted`, else `All tasks`;
   - ` under headings containing <tag>` when the trimmed `sectionTag` is not empty, else ` from every note`. The tag is shown with a leading `#` added when it is missing, as the Rust match adds one;
   - `, in notes edited in the last 7 days` for `last7days`, `, in notes edited in the last 30 days` for `last30days`, nothing for `all`.

   For example "Open tasks under headings containing #to-list" or "All tasks from every note, in notes edited in the last 7 days". It renders as a `<p>` above the count, and stays visible in the empty state but not while "Indexing tasks..." is shown. When the section tag is set and the list is not empty, a "Clear tag" button follows the sentence: it clears the pending debounce timer, empties the textbox and calls `updateSectionTagFilter('')`. In the empty state the sentence shows no button; the empty state's own action does it.
3. **An empty state that names the cause.** A pure `explainEmptyTasks({ groups, sectionTag, hideCompleted, dateFilter })` in `tasks.logic.ts`, where `groups` is the unfiltered `tasksStore.fileTaskGroups` (already limited by the section tag on the Rust side). The view calls it only when the filtered list is empty. It returns `{ message: string; action?: { kind: 'clearTag' | 'showCompleted' | 'allTime'; label: string } }` for the first stage that empties the list, in this order:
   1. `groups` has no task: with a section tag, "No task sits under a heading containing <tag>" with `{ kind: 'clearTag', label: 'Clear tag' }`; without one, "No tasks in this vault yet" and no action.
   2. With hide-completed on, every task is completed: "All N tasks are completed" (N is the task count in `groups`; "The only task is completed" when N is 1) with `{ kind: 'showCompleted', label: 'Show completed' }`.
   3. Otherwise the date filter. With hide-completed on: "No open task is in a note edited in the last 7 days" (or 30); with it off: "No note with tasks was edited in the last 7 days" (or 30). Both with `{ kind: 'allTime', label: 'All time' }`. The view filters by date before it hides completed tasks, so stage 2 can pass while every open task sits in an old note; the first wording covers that case.

   Its result replaces the bare "No tasks found". The action renders as a button that runs the Clear handler above, `tasksStore.setHideCompleted(false)` or `tasksStore.setDateFilter('all')`.

Smaller fixes in the same pass:
- The section-tag textbox gets an explicit `aria-label="Section tag"`.
- The view's root drops `bg-card`: the editor wrapper around it (`EditorView.svelte`) already paints `bg-editor-bg`.
- `help/documentation/10-tasks-and-todoist.md` says the view lists only tasks under a heading containing `#to-list` by default, that an empty section field lists every task in the vault, and that the date filter uses the note's modification date (until Issue 238 replaces it). This covers Issue 227, closed as covered here. Issue 243 adds the sentence about saved section tags.

**Blocked by:** none

**Blocked by (origin):** closed blockers dropped: tasks-view 01.

**Status:** ready-for-agent

**Answered:** owner, 2026-11-12: the default stays the `#to-list` section filter; the view never defaults to every task. Several section tags come in Issue 242.

**Gate:** frontend only: `pnpm check` + `pnpm vitest run`.

- [ ] Failing test first, in `src/tests/lib/features/tasks/TasksView.test.ts` with the real `tasksStore` (the describe's `beforeEach` empties the section tag, so the fetch is `get_all_tasks_v2`): it resolves once with one note holding two tasks; focus the first circle button; then make the next `get_all_tasks_v2` call return a deferred promise and call `buildTaskIndex()` from the test. While it is pending, the two rows are still in the DOM, `document.activeElement` is still that circle button and the "Refreshing tasks" status is present. Resolve it with the same data: focus is unchanged and the status is gone. Fails today (the list is replaced by "Indexing tasks...").
- [ ] `tasks.logic.test.ts`: `describeTaskRule` for each combination of the three parts, and a tag typed without `#`; `explainEmptyTasks` for each stage, including the order when several stages would each empty the list (an empty `groups` with hide-completed on names the tag, not hide-completed), the N = 1 wording, and the date stage with hide-completed on when recent notes hold only completed tasks.
- [ ] Component test: with the section tag set to `#to-list`, `get_tasks_in_section_v2` returning `[]` and `get_all_tasks_v2` returning one note with one open task, the empty state names `#to-list` and shows exactly one button named "Clear tag"; clicking it empties the textbox and the task is listed.
- [ ] Component test: a fetch that returns no task keeps the empty state during a second, pending fetch; "Indexing tasks..." does not show.
- [ ] `tasks.store.test.ts`: `hasLoaded` and `reset()`.
- [ ] The e2e spec passes unchanged (it fills the textbox by its accessible name, `/section tag/i`).

## Notes

- **Size:** S to M.
- Run in series with every other Tasks view Issue (108, 242, 243, 110, 234, 236, 109, 111, 238, 239, 113, 112, 240, 241, 115, 198): they all edit the tasks feature.
- Use plain markup for the empty state (a `<p>` plus a button). Moving it onto `EmptyState` is a follow-up after Issues 204 and 241.
- `audit-2026-11-05/35` (the list stays on screen during a refresh) is the same fix as part 1. The owner answered PRD L4 (a) on 2026-11-06: it is closed as wontfix, covered by this Issue. Do not edit `.scratch/archived/audit-2026-11-05/`.
- Issue 110 changes the "completed" wording to "closed"; Issue 111 replaces `hideCompleted` with the Status quick filter, and Issue 238 replaces `dateFilter` with the Due filter.

## Comments

- 2026-11-12: a first rewrite made the default section tag empty; the owner reversed that the same day. The default stays `#to-list`, and several tags arrive in Issue 242.
