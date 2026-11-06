# 18: Built-in smart lists and their empty states

**What to build:** Built-in lists defined in code, next to "All open" (Issue 17), with empty states that explain themselves. Which lists ship depends on how many of the owner's tasks carry dates (PRD decision B5).

- With B5 above about 20% dated: Today (due today, overdue shown in its own list), Overdue, Next 7 days, No date.
- With B5 below that: No date only, and the empty states lead with how to add a date.
- Each built-in is a `TaskQuery` constant in `task-query.logic.ts`, next to "All open", so an edit follows the same rules as on "All open": session state only (Issue 17), shown as a "modified" override once Issue 29 has landed.
- **Empty states per list.** "Today: nothing due" is not the same as "No task in this vault has a due date". The second explains the `📅` signifier and points at the row menu's Set due (Issue 09, when present). Overdue empty: "Nothing overdue".
- The list column shows each list's count.
- No "Recently done": without a done date stamp it would list every old done task in any note edited this week.

**Blocked by:** 07, 17

**Status:** needs-info

**Waits on:** PRD decision B5 (the dated-task count from the owner's vault).

**Gate:** frontend only: `pnpm check` + `pnpm vitest run`.

- [ ] Failing test first, `task-query.logic.test.ts`: each built-in query over a fixed row set with today 2026-11-05 returns the expected rows.
- [ ] `explainEmptyTasks` (or its successor) tells "nothing due today" from "no task has a due date", with real logic.
- [ ] `TasksView.test.ts`: selecting Overdue lists only overdue tasks and the column count matches.

## Notes

- **Size:** S to M.
