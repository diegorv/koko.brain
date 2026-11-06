# 29: The "modified" marker with Save, Revert and Reset

**What to build:** After Issue 17 an edit to a list lives in the session state and is dropped on a list switch, with no sign that the list on screen differs from the saved one. Show it (PRD "Lists and views").

- A pure `isQueryModified(current, saved)` in `task-query.logic.ts` compares sources, excludes, quick filters, group and sort, after normalizing both sides:
  - object key order does not count;
  - an absent optional field equals its default (`statuses`, `priorities`, `tags` absent equal `[]`; `due` absent equals `'any'`; `search` absent equals `''`; `negate` absent equals `false`);
  - set-like arrays ignore order: `quick.statuses`, `quick.priorities`, `quick.tags` and every `exclude` list;
  - order counts for `sources` (cards and the clauses inside them) and `sort`.
- The marker is the text `modified` (`text-xs text-muted-foreground`) followed by its buttons, on the line after the rule sentence, shown only while `isQueryModified(session, saved)` is true:
  - **Built-in list** (Issue 17's "All open", and Issue 18's lists when present): "Save as view" (the same name prompt and write as Issue 17's "+ Save view") and "Reset" (restores the built-in query). The override is not persisted.
  - **Saved view:** "Save" writes the session query into that view in `tasksView.savedViews` (through Issue 17's write path) and "Revert" restores the saved query.
- The quick filters' "Reset" (Issue 07) restores the active list's saved quick filters, not the code defaults, and shows only when the quick filters differ from them.

**Blocked by:** 17

**Status:** ready-for-agent

**Gate:** frontend only: `pnpm check` + `pnpm vitest run`.

- [ ] Failing test first, `task-query.logic.test.ts`: `isQueryModified` is false for an equal query with keys in another order, for absent versus default optional fields, and for `statuses` in another order; true for a change in each of sources, excludes, quick, group and sort, and for two cards swapped. Fails today (no such function).
- [ ] `TasksView.test.ts` with real stores: changing the grouping on "All open" shows "modified"; Reset clears it; on a saved view, Save writes the view to `settings.json` (the `plugin-fs` `writeTextFile` mock receives a `tasksView.savedViews` entry holding the new group) and Revert restores the saved query.
- [ ] Quick-filter Reset on a saved view brings back that view's saved filters.

## Notes

- **Size:** S to M. Split out of Issue 17.
- Issue 17 waits on PRD decision B1, but this Issue does not: both B1 options keep the built-in "All open" next to the saved views; B1 only picks which one opens first.
