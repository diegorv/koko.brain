# 111: A filter row with a Status menu replaces the hide-completed eye

**Origin:** `tasks-view` Issue 07, moved here on 2026-11-08 and rewritten on 2026-11-12 from the Tasks view UX research (`.scratch/tasks-view-ux/research/`, `critique.md` D2, D4 and D13) and its review. The first draft held every quick filter. It is split into this Issue (filter row and Status), 238 (Due) and 239 (Priority, Tag, search, Reset, narrow fold). Its PRD stays in `.scratch/archived/tasks-view/`. Issue numbers in this text are open-itens numbers.

**What to build:** The only status control is the hide-completed eye, an icon whose meaning you have to guess. Replace it with a Status menu that says what is shown, start the row model the later filters share, and give the filters their own row so the toolbar can hold the title.

**Layout**
- The pane toolbar holds the title "Tasks", the count (moved from the list body) and the refresh spinner of Issue 108. The title truncates first. The count reads "N open in M notes" when `show` is `open` and no statuses are chosen, else "N tasks in M notes"; N counts rows that are not dimmed, and M counts notes with at least one such row.
- A filter row under the toolbar holds the Status menu, the date pills (until Issue 238) and the section tag textbox. It is a plain row, not a second `pane-toolbar` element: `pane-toolbar.test.ts` allows one per file.

**Status menu** (a `DropdownMenu` from `#lib/components/ui/dropdown-menu/`, trigger text `Status: <value>`, where the value is `open`, `closed`, `all` or the chosen statuses joined with `, `). A radio group Open (default) / Closed / All sets `show` and clears `statuses`. Below a separator, one checkbox item per status (the seven words of `statusGlyph`, Issue 110) toggles it in `statuses`; those items pass `closeOnSelect={false}` so several can be picked in one go. A non-empty `statuses` wins over `show`.

**Logic.** Start `src/lib/features/tasks/task-query.logic.ts`:
- `TaskRow` is a `TaskItem` (every field: `text`, `checked`, `indent`, `lineNumber`, `status`, `metadata`) plus the note fields of the PRD "Task model": `filePath`, `relPath`, `folder`, `noteTitle`, `open`, and `modifiedAt: number` (ms), `parentLine?: number` (the line of the nearest earlier task in the same note with a smaller indent). Keeping the `TaskItem` fields means `toggleTask`, `taskChips` and `taskDisplayText` (Issue 109) take a row unchanged; filters read dates, priority and tags from `metadata`. The snapshot fields of the PRD model (`noteType`, `noteTags`, lifecycle flags, `properties`, `headings`) come in Issue 115.
- `buildTaskRows(groups: FileTaskGroup[], vaultPath: string): TaskRow[]` keeps the group order and document order. `relPath` is `relativePath(vaultPath, filePath)` (`#lib/utils/path.js`, the helper Issue 236 uses), `folder` is the part of `relPath` before the last `/` (`''` at the root), `noteTitle` is `group.fileName`, `open` is `isTaskOpen(status)`.
- The quick filter state is `quick: { show: 'open' | 'closed' | 'all'; statuses?: TaskStatus[] }` in this Issue. Issues 238 and 239 add `due`, `priorities`, `tags` and `search` (PRD "One query model"). Default: `show: 'open'`.
- `applyQuickFilters(rows, quick): VisibleRow[]`, where `VisibleRow = TaskRow & { dimmed: boolean }`. A row that fails stays, with `dimmed: true`, when any later row of the same note in its subtree (rows after it with a larger indent, up to the next row whose indent is not larger) passes. That is today's `filterCompletedTasks` parent rule, applied to every quick filter. Passing rows have `dimmed: false`.
- Until Issue 238 replaces them, the date pills still work: an `applyEditedCutoff(rows, dateFilter, now)` drops rows whose `modifiedAt` falls outside the last 7 or 30 days, as `filterByDate` does for groups today.
- `rowsByNote(rows: VisibleRow[])` returns `{ filePath, noteTitle, folder, modifiedAt, total, rows }[]` in first-appearance order, where `total` is the note's task count before any filter (Issue 236's "N of M open"). The view keeps the per-note layout and the path order from Issue 234. Issue 112 replaces it with `groupTaskRows`.
- `describeTaskRule` and `explainEmptyTasks` (Issue 108) move from `tasks.logic.ts` to `task-query.logic.ts` with their tests, and take `{ sectionTag, quick, dateFilter }` (plus `rows` for the empty state) instead of `hideCompleted`. The sentence starts with `Open tasks`, `Closed tasks`, `All tasks`, or `Tasks that are <statuses joined with ' or '>`, then the heading part (Issue 242's several tags) and the date part as in Issue 108. The status stage of the empty state says "All N tasks are closed" ("The only task is closed" when N is 1) when `show` is `open` and every row is closed, "No task has the chosen status" otherwise, with `{ kind: 'showAllStatuses', label: 'Show all' }`, which sets `show: 'all'` and clears `statuses`. It is not a reset: `resetQuick()` would put `show` back to `open`.

**Store**
- `tasksStore` replaces `hideCompleted` and `setHideCompleted` with `quick`, `rows: TaskRow[]`, `setQuick(partial)`, `resetQuick()` and `setRows`. `dateFilter` stays until Issue 238. `fileTaskGroups` stays until Issue 121 removes it; after this Issue nothing renders from it.
- `tasksStore.reset()` clears `rows` and resets `quick`, so a vault switch never leaves rows with the old vault's absolute paths.
- `buildTaskIndex` also calls `tasksStore.setRows(buildTaskRows(groups, vaultStore.path ?? ''))`.
- A getter `visibleRows` returns a module-level `$derived` over `rows`, `quick` and `dateFilter` (ADR-0034, `docs/adr/0034-derived-allowed-behind-store-getters.md`).
- The view renders from `rowsByNote(tasksStore.visibleRows)`. Rows with `dimmed: true` render with `opacity-60`.
- Delete `filterCompleted`, `filterCompletedTasks`, `hasUncheckedDescendants` and `computeTaskStats` once nothing calls them, with their cases in `tasks.logic.test.ts`. Their only callers on main are `TasksView.svelte` and those tests; check again on the branch before deleting (CLAUDE.md "Removing or Refactoring Code").

**Tests that change on purpose** (name them in the commit): the `hideCompleted` cases in `tasks.store.test.ts`; every `setHideCompleted` call in `TasksView.test.ts`, including Issue 108's "Show completed" action test, Issue 110's tests and Issue 236's hide-closed case; the `showCompleted` action kind, which leaves the action type; the moved `describeTaskRule` and `explainEmptyTasks` cases, whose "completed" wording became "closed" in Issue 110.

**Blocked by:** 109

**Status:** ready-for-agent

**Answered:** PRD A2 (the date filter means the due date) and B2 (a) (owner, 2026-11-06). The split into 111, 238 and 239 and the toolbar layout come from the plan (2026-11-12), approved by the owner with the order.

**Gate:** frontend only: `pnpm check` + `pnpm vitest run`, plus `bash scripts/e2e.sh` because the spec's hide-completed button goes away.

- [ ] Failing test first, `src/tests/lib/features/tasks/task-query.logic.test.ts` (new): `show` open, closed and all, and a `statuses` set, over all seven statuses; a failing parent kept dimmed above a passing grandchild; `buildTaskRows` path fields for a root note and a nested note; `rowsByNote`'s `total` counts every task of the note.
- [ ] `task-query.logic.test.ts`: the moved `describeTaskRule` and `explainEmptyTasks` cases, the status stage with its `showAllStatuses` action, and the N = 1 wording.
- [ ] `tasks.store.test.ts`: the `visibleRows` getter follows a `quick` change, a `rows` change and a `setDateFilter` change (real store); `reset()` clears `rows` and `quick`.
- [ ] `TasksView.test.ts`: choosing Status > Closed shows only the done row, the rule sentence starts with "Closed tasks" and the toolbar count reads "1 task in 1 note"; Status > Open brings the open rows back and the count reads "N open in M notes". With every task closed, clicking the empty state's "Show all" lists the closed rows.
- [ ] `TasksView.test.ts`: Last 7 days still drops a row from a note edited 10 days ago.
- [ ] `e2e/specs/tasks-view.spec.ts` opens the Status menu (`getByRole('button', { name: /^Status/ })`) and picks All (`getByRole('menuitemradio', { name: 'All' })`, the role bits-ui renders for radio items) where it clicked the eye button, and still asserts the toggled task.
- [ ] `help/documentation/10-tasks-and-todoist.md` "Filters": the Hide completed row becomes the Status menu (PRD A12).

## Notes

- **Size:** M to L. The model and store change has to ship with the first menu; no cut leaves a visible result on each side.
- Run in series with the other Tasks view Issues (see 108).
- `quick.tags` comes in Issue 239 (which absorbed Issue 120).
