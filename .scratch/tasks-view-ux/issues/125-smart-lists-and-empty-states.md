# 125: A "No date" built-in list, and a "modified" marker with Save, Revert and Reset

**Origin:** `tasks-view` Issues 18 and 29, moved to open-itens as 125 and 126 on 2026-11-08, merged into this Issue on 2026-11-12 on the owner's approval (both follow Issue 247 and edit the list column and `task-query.logic.ts`). Their PRD stays in `.scratch/archived/tasks-view/` ("Lists and views", decision B5). Issue numbers in this text keep the open-itens numbering: the Tasks view Issues live in `.scratch/tasks-view-ux/issues/`, the others in `.scratch/open-itens/issues/`.

**What to build:** Two additions to the list column of Issue 247.

**1. A "No date" built-in list with empty states that explain themselves.** Few of the owner's open tasks carry dates (PRD B5), so the only built-in next to "All open" (Issue 124) is **No date**, and the empty states lead with how to add a date. Today, Overdue and Next 7 days are left for later, once dated tasks are common.
- The built-in is a `TaskViewQuery` constant (Issue 124's shape) next to "All open", in the file where 124 put it (`task-views.logic.ts` or `task-query.logic.ts`), with its own reserved id (`no-date`). An edit on it follows the same rules as on "All open": session state only (Issue 124).
- Empty states per list: "All open" filtered to a due window that matches nothing is not the same as "No task in this vault has a due date". The second explains the `📅` signifier and points at the row menu's Due item (Issue 246, when it exists). No date empty: "Every open task has a due date".
- The list column shows each list's count.
- No "Recently done": without a done-date stamp it would list every old done task in any note edited this week.

**2. A "modified" marker.** After Issue 124 an edit to a list lives in the session and is dropped on a list switch, with no sign that the list on screen differs from the saved one. Show it.
- A pure `isQueryModified(current, saved)` in `task-query.logic.ts` compares sources, excludes, quick filters other than `search`, group and sort, after normalizing both sides (Issue 124 never stores `search` in a saved view, so typing a search never marks a list modified):
  - object key order does not count;
  - an absent optional field equals its default (`statuses`, `priorities`, `tags` absent equal `[]`; `due` absent equals `'any'`; `negate` absent equals `false`; `todoist` absent equals `'any'` once Issue 129 has added it);
  - set-like arrays ignore order: `quick.statuses`, `quick.priorities`, `quick.tags` and every `exclude` list;
  - order counts for `sources` (cards and the clauses inside them) and `sort`.
- The marker is the text `modified` (`text-xs text-muted-foreground`) followed by its buttons, on the line after the rule sentence, shown only while `isQueryModified(session, saved)` is true:
  - **Built-in list** ("All open", "No date"): "Save as view" (the same name prompt and write as Issue 247's "+ Save view") and "Reset" (restores the built-in query). The override is not persisted.
  - **Saved view:** "Save" writes the session query into that view in `tasksView.savedViews` (through Issue 124's write path) and "Revert" restores the saved query.
- The quick filters' "Reset filters" (Issue 239) restores the active list's saved quick filters, not the code defaults, and shows only when the quick filters differ from them.

**Blocked by:** 111, 247

**Status:** resolved

**Answered:** PRD B5: few of the owner's open tasks carry dates (owner's estimate, not measured) (owner, 2026-11-06). The merge of 126 into this Issue: owner, 2026-11-12.

**Gate:** frontend only: `pnpm check` + `pnpm vitest run`.

- [x] Failing test first, `task-query.logic.test.ts`: the No date built-in over a fixed row set with today 2026-11-05 returns only open tasks without a due date; `isQueryModified` is false for an equal query with keys in another order, for absent versus default optional fields, and for `statuses` in another order, and true for a change in each of sources, excludes, quick, group and sort, and for two cards swapped. Fails today (neither exists).
- [x] `explainEmptyTasks` (or its successor) tells "nothing due today" from "no task has a due date", with real logic.
- [x] `TasksView.test.ts` with real stores: selecting No date lists only open tasks without a due date, and the column count matches. Changing the grouping on "All open" shows "modified" and Reset clears it. On a saved view, Save writes the view to `settings.json` (the `plugin-fs` `writeTextFile` mock receives a `tasksView.savedViews` entry holding the new group) and Revert restores the saved query.
- [x] "Reset filters" on a saved view brings back that view's saved quick filters.

## Notes

- **Size:** M.
- Run in series with the other Tasks view Issues; launch it only by number.

## Comments

- 2026-11-12: Blocked by 124 became 247: the deep dive split Issue 124, and the list column this Issue adds lists and counts to is now Issue 247 (124b).
- 2026-11-12: consistency review: a built-in is a `TaskViewQuery` (the shape Issue 124 defines for "All open"), not a `TaskQuery`, and lives next to it.
- 2026-11-12: main session: Issue 126 (the "modified" marker) merged in on the owner's approval; origin numbers translated (tasks-view 17 is 124 and 247, 29 was 126, 09 is 246, 07 is 239, 23 is 129).
- 2026-11-12: delivered from issue/125-smart-lists-and-empty-states. Adds the "No date" built-in list, `isQueryModified` with a "modified" marker and Save, Revert and Reset on views, empty-state text telling "nothing due today" from "no task has a due date", and Reset filters restoring a saved view's quick filters. Review round 1 APPROVED (review.md); fix round ran; review round 2 APPROVED (review-2.md). Tests: pnpm check 0 errors; tasks tests 881 passed; full suite 16508 passed, 1 failure in AutoOrganizeRuleRow.test.ts (load timeout, unrelated, fixed on main by 22a266407, passes alone).
