# 239: Tasks priority filter, search, Reset and a narrow-pane fold

**Origin:** Tasks view UX research, 2026-11-12 (`.scratch/tasks-view-ux/research/`). The last part of Issue 111's first draft, split out as `critique.md` D4 asked. Issue numbers in this text are open-itens numbers.

**What to build:** Finish the quick filters: filter by priority, search the list, reset every quick filter at once, and keep the filter row usable in a narrow pane.

- **Priority menu** in the filter row (trigger `Priority` when empty, `Priority: <levels>` otherwise): one checkbox item per level, in the order highest, high, medium, no priority (`none`), low, lowest. Empty means any. `quick` gains `priorities?: TaskPriority[]`.
- **Search:** an `<input type="search" placeholder="Search tasks" aria-label="Search tasks">` in the pane toolbar, after the title, count and spinner, that sets `quick.search` on every input (no debounce; it filters in memory). It matches the task description or the note title, case-insensitive substring. The toolbar has room for it because Issue 111 moved the filters out; the title truncates first.
- **Reset** (a text button in the filter row) shows when status, due, priority or search differs from its default, and restores all four with `resetQuick()`.
- **Narrow pane:** below 560 px container width (the root is `@container` since Issue 109) the Status, Due and Priority menus fold into one `Filters (n)` dropdown holding the same three groups, where n counts those of the three not at their default. The search box and the section tag textbox stay visible, and the note headers hide their folder subtitle.
- `describeTaskRule` adds `, priority <levels joined with ' or '>` and `, matching "<search>"` when set. `explainEmptyTasks` checks, after due: priority, then search, each with "No task matches the <Priority|Search> filter" and a `{ kind: 'resetQuick', field, label: 'Reset' }` action that resets only that field.

**Blocked by:** 238

**Status:** ready-for-agent

**Gate:** frontend only: `pnpm check` + `pnpm vitest run`, plus `bash scripts/e2e.sh` for the narrow-pane test.

- [ ] Failing test first, `task-query.logic.test.ts`: priority sets including `none`; search on description and on note title, case-insensitive; the empty-state order status, due, priority, search.
- [ ] `TasksView.test.ts`: typing in Search narrows the rows; Reset shows only when a quick filter is off its default and restores all four.
- [ ] `tasks.store.test.ts`: `resetQuick()` and `reset()` clear `priorities` and `search`.
- [ ] e2e: at a 500 px wide viewport the filter row shows `Filters (n)` instead of the three menus, and choosing Status > All inside it lists a done task.
- [ ] `help/documentation/10-tasks-and-todoist.md` "Filters": the Priority menu, the search box and Reset (PRD A12).

## Notes

- **Size:** S to M.
- Run in series with the other Tasks view Issues (see 108).
- The narrow fold and the 560 px threshold come from reading class lists; nothing was rendered during the research. Check the toolbar and the filter row by eye in a narrow split.
