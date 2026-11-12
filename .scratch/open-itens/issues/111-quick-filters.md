# 111: A filter row with a Status menu replaces the hide-completed eye

**Origin:** `tasks-view` Issue 07, moved here on 2026-11-08 and rewritten on 2026-11-12 from the Tasks view UX research (`.scratch/tasks-view-ux/research/`, `critique.md` D2, D4 and D13). The first draft held every quick filter. It is split into this Issue (filter row and Status), 238 (Due) and 239 (Priority, search, Reset, narrow fold). Its PRD stays in `.scratch/archived/tasks-view/`. Issue numbers in this text are open-itens numbers.

**What to build:** The only status control is the hide-completed eye, an icon whose meaning you have to guess. Replace it with a Status menu that says what is shown, start the query model the later filters share, and give the filters their own row so the toolbar can hold the title.

**Layout**
- The pane toolbar holds the title "Tasks", the open count ("12 open in 4 notes", moved from the list body, using only rows that are not dimmed) and the refresh spinner of Issue 108. The title truncates first.
- A filter row under the toolbar holds the Status menu, the date pills (until Issue 238) and the section tag textbox. It is a plain row, not a second `pane-toolbar` element: `pane-toolbar.test.ts` allows one per view.

**Status menu** (a `DropdownMenu` from `#lib/components/ui/dropdown-menu/`, trigger text `Status: <value>`, where the value is `open`, `closed`, `all` or the chosen statuses joined with `, `). A radio group Open (default) / Closed / All sets `show` and clears `statuses`. Below a separator, one checkbox item per status (the seven words of `statusGlyph`, Issue 237) toggles it in `statuses`. A non-empty `statuses` wins over `show`.

**Logic.** Start `src/lib/features/tasks/task-query.logic.ts`:
- `TaskRow` (PRD "Task model") plus `modifiedAt: number` (ms, for Issue 238's edited options) and `parentLine?: number` (the line of the nearest earlier task in the same note with a smaller indent). `buildTaskRows(groups: FileTaskGroup[], vaultPath: string): TaskRow[]` keeps the group order and document order. `relPath` is `filePath` without the `vaultPath + '/'` prefix (`vaultRelativeKey` in `#lib/utils/path.js`, falling back to `filePath`), `folder` is the part of `relPath` before the last `/` (`''` at the root), `noteTitle` is `group.fileName`, `open` is `isTaskOpen(status)` (Issue 110), and `description`, dates, priority (`'none'` when unset), recurrence text and tags come from `metadata`. The snapshot fields (`noteType: null`, `noteTags: []`, lifecycle flags `false`, `properties: {}`, `headings: []`) stay empty until Issue 115.
- The quick filter state is `quick: { show: 'open' | 'closed' | 'all'; statuses?: TaskStatus[] }` in this Issue. Issues 238 and 239 add `due`, `priorities` and `search` (PRD "One query model"). Default: `show: 'open'`.
- `applyQuickFilters(rows, quick): VisibleRow[]`, where `VisibleRow = TaskRow & { dimmed: boolean }`. A row that fails stays, with `dimmed: true`, when any later row of the same note in its subtree (rows after it with a larger indent, up to the next row whose indent is not larger) passes. That is today's `filterCompletedTasks` parent rule, applied to every quick filter. Passing rows have `dimmed: false`.
- `rowsByNote(rows: VisibleRow[])` returns `{ filePath, noteTitle, folder, modifiedAt, rows }[]` in first-appearance order, so the view keeps the per-note layout and the path order from Issue 234. Issue 112 replaces it with `groupTaskRows`.
- `describeTaskRule` and `explainEmptyTasks` (Issue 108) move from `tasks.logic.ts` to `task-query.logic.ts` with their tests, and take `{ sectionTag, quick, dateFilter }` (plus `rows` for the empty state) instead of `hideCompleted`. The sentence starts with `Open tasks`, `Closed tasks`, `All tasks`, or `Tasks that are <statuses joined with ' or '>`, then the heading part and the date part as in Issue 108. The status stage of the empty state says "All N tasks are closed" when `show` is `open` and every row is closed, "No task has the chosen status" otherwise, with `{ kind: 'resetQuick', field: 'status', label: 'Show all' }`, which sets `show: 'all'` and clears `statuses`.

**Store**
- `tasksStore` replaces `hideCompleted` and `setHideCompleted` with `quick`, `rows: TaskRow[]`, `setQuick(partial)`, `resetQuick()` and `setRows`. `dateFilter` stays until Issue 238.
- `tasksStore.reset()` clears `rows` and resets `quick`, so a vault switch never leaves rows with the old vault's absolute paths.
- `buildTaskIndex` also calls `tasksStore.setRows(buildTaskRows(groups, vaultStore.path ?? ''))`.
- A getter `visibleRows` returns a module-level `$derived` over `rows`, `quick` and `dateFilter` (ADR-0034, `docs/adr/0034-derived-allowed-behind-store-getters.md`).
- The view renders from `rowsByNote(tasksStore.visibleRows)`. Rows with `dimmed: true` render with `opacity-60`.
- Delete `filterCompleted`, `filterCompletedTasks`, `hasUncheckedDescendants` and `computeTaskStats` once nothing calls them, with their cases in `tasks.logic.test.ts`. Their only callers on main are `TasksView.svelte` and those tests; check again on the branch before deleting (CLAUDE.md "Removing or Refactoring Code").

**Blocked by:** 109

**Status:** ready-for-agent

**Answered:** PRD A2 (the date filter means the due date) and B2 (a) (owner, 2026-11-06). The split and the toolbar layout: owner, 2026-11-12.

**Gate:** frontend only: `pnpm check` + `pnpm vitest run`, plus `bash scripts/e2e.sh` because the spec's hide-completed button goes away.

- [ ] Failing test first, `src/tests/lib/features/tasks/task-query.logic.test.ts` (new): `show` open, closed and all, and a `statuses` set, over all seven statuses; a failing parent kept dimmed above a passing grandchild; `buildTaskRows` path fields for a root note and a nested note.
- [ ] `task-query.logic.test.ts`: the moved `describeTaskRule` and `explainEmptyTasks` cases, with the status stage and its reset action.
- [ ] `tasks.store.test.ts`: the `visibleRows` getter follows a `quick` change and a `rows` change (real store); `reset()` clears `rows` and `quick`. The `hideCompleted` cases are rewritten to `quick`, on purpose.
- [ ] `TasksView.test.ts`: choosing Status > Closed shows only the done row, the rule sentence starts with "Closed tasks", and Status > Open brings the open rows back. The toolbar shows "Tasks" and the open count.
- [ ] `e2e/specs/tasks-view.spec.ts` opens the Status menu (`getByRole('button', { name: /^Status/ })`) and picks All (`getByRole('menuitemradio', { name: 'All' })`; that bits-ui renders radio items with this role is from memory, so check the rendered DOM) where it clicked the eye button, and still asserts the toggled task.
- [ ] `help/documentation/10-tasks-and-todoist.md` "Filters": the Hide completed row becomes the Status menu (PRD A12).

## Notes

- **Size:** M.
- Run in series with the other Tasks view Issues (see 108).
- `quick.tags` comes in Issue 120.
