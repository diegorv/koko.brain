# 125: Built-in smart lists and their empty states

**Origin:** `tasks-view` Issue 18, moved here on 2026-11-08. Its PRD, raw evidence and closed siblings stay in `.scratch/archived/tasks-view/`. Bare Issue numbers in the text below use that feature's numbering; `priority-2026-11-08.md` in this folder maps them to the numbers here.

**What to build:** Built-in lists defined in code, next to "All open" (Issue 17), with empty states that explain themselves. Few of the owner's open tasks carry dates (PRD decision B5), so the only built-in next to "All open" is **No date**, and the empty states lead with how to add a date. Today, Overdue and Next 7 days are left for a later Issue, once dated tasks are common.
- Each built-in is a `TaskViewQuery` constant (Issue 124's shape) next to "All open", in the file where 124 put it (`task-views.logic.ts` or `task-query.logic.ts`), with its own reserved id, so an edit follows the same rules as on "All open": session state only (Issue 17), shown as a "modified" override once Issue 29 has landed.
- **Empty states per list.** "All open" filtered to a due window that matches nothing is not the same as "No task in this vault has a due date". The second explains the `📅` signifier and points at the row menu's Set due (Issue 09, when present). No date empty: "Every open task has a due date".
- The list column shows each list's count.
- No "Recently done": without a done date stamp it would list every old done task in any note edited this week.

**Blocked by:** 111, 247

**Status:** ready-for-agent

**Answered:** PRD B5: few of the owner's open tasks carry dates (owner's estimate, not measured) (owner, 2026-11-06).

**Gate:** frontend only: `pnpm check` + `pnpm vitest run`.

- [ ] Failing test first, `task-query.logic.test.ts`: each built-in query over a fixed row set with today 2026-11-05 returns the expected rows.
- [ ] `explainEmptyTasks` (or its successor) tells "nothing due today" from "no task has a due date", with real logic.
- [ ] `TasksView.test.ts`: selecting No date lists only open tasks without a due date, and the column count matches.

## Notes

- **Size:** S to M.

## Comments

- 2026-11-12: Blocked by 124 became 247: the deep dive split Issue 124, and the list column this Issue adds lists and counts to is now Issue 247 (124b).
- 2026-11-12: consistency review: a built-in is a `TaskViewQuery` (the shape Issue 124 defines for "All open"), not a `TaskQuery`, and lives next to it.
