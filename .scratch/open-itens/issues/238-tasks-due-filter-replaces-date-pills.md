# 238: A Due menu replaces the Tasks date pills

**Origin:** Tasks view UX research, 2026-11-12 (`.scratch/tasks-view-ux/research/`). The Due part of Issue 111's first draft, split out as `critique.md` D4 and D13 asked. Issue numbers in this text are open-itens numbers.

**What to build:** The three date pills (All time, Last 7 days, Last 30 days) filter on the note file's modification time, not on any task date, so "Last 7 days" lists every task of any note edited this week. Replace them with a Due menu on the task's due date (PRD A2). The note-edited filter survives as two options in the same menu.

- **Due menu** in the filter row (trigger `Due: <value>`): a radio group Any (default), Overdue, Today, Next 7 days, No date; a separator; Note edited in the last 7 days, Note edited in the last 30 days.
- `quick` gains `due?: DueRange` with `type DueRange = 'any' | 'overdue' | 'today' | 'next7' | 'none' | 'edited7' | 'edited30'`. Unset means `any`. Meanings, with `today` as `YYYY-MM-DD`: overdue is a due date before today; today is a due date equal to today; next 7 days is a due date from today through today + 7 days, both ends included; no date is no `dueDate`; the two edited options keep today's rule on the note's `modifiedAt` and ignore task dates.
- `applyQuickFilters(rows, quick, today, now)` applies it. Today and now are read (`formatNow('YYYY-MM-DD')`, `Date.now()`) when the store's `visibleRows` derived runs. A pane left open past midnight updates on the next refetch.
- `describeTaskRule` and `explainEmptyTasks` drop the `dateFilter` parameter. After the heading part, the sentence adds `, overdue` / `, due today` / `, due in the next 7 days` / `, with no due date` / `, in notes edited in the last 7 days` / `, in notes edited in the last 30 days` when set. The empty state's date stage becomes "No task matches the Due filter" with `{ kind: 'resetQuick', field: 'due', label: 'Reset' }`, which resets only `due`.
- Remove `dateFilter`, `setDateFilter`, the `TaskDateFilter` type, the `DATE_FILTERS` constant and `filterByDate` once nothing calls them. Their store and logic tests are migrated to `quick.due` on purpose, not dropped: the edited options keep `filterByDate`'s cases. Check every caller on the branch first (CLAUDE.md "Removing or Refactoring Code").

**Blocked by:** 111

**Status:** ready-for-agent

**Answered:** PRD A2: the date filter means the due date; mtime survives only as "Note edited in the last N days" (owner, 2026-11-06).

**Gate:** frontend only: `pnpm check` + `pnpm vitest run`.

- [ ] Failing test first, `task-query.logic.test.ts` with today `2026-11-05`: "overdue" keeps `2026-11-04` and drops `2026-11-05` and undated tasks; "today"; "next7" keeps `2026-11-05` and `2026-11-12` and drops `2026-11-13`; "none"; the two edited options against a fixed `now`.
- [ ] `TasksView.test.ts` (clock faked to 2026-11-05): choosing Due > Overdue shows only the overdue row, the rule sentence contains "overdue", and the empty state's Reset brings the rest back when nothing is overdue.
- [ ] `tasks.store.test.ts`: `reset()` clears `quick.due`; no `dateFilter` case is left.
- [ ] `help/documentation/10-tasks-and-todoist.md` "Filters": the Date row becomes the Due menu, with its options and their meanings (PRD A12).

## Notes

- **Size:** S to M.
- Run in series with the other Tasks view Issues (see 108).
- PRD B5: few tasks carry dates, so Any stays the default.
