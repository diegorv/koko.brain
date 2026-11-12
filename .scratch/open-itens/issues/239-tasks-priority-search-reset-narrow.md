# 239: Tasks priority and tag filters, search, Reset and a narrow-pane fold

**Origin:** Tasks view UX research, 2026-11-12 (`.scratch/tasks-view-ux/research/`) and its review. The last part of Issue 111's first draft, split out as `critique.md` D4 asked. It absorbs Issue 120 (task tag quick filter), merged on the owner's approval the same day. Issue numbers in this text are open-itens numbers.

**What to build:** Finish the quick filters: filter by priority and by task tag, search the list, reset every quick filter at once, and keep the filter row usable in a narrow pane.

- **Priority menu** in the filter row (trigger `Priority` when empty, `Priority: <levels>` otherwise): one checkbox item per level, in the order highest, high, medium, no priority (`none`), low, lowest, each with `closeOnSelect={false}`. Empty means any. `quick` gains `priorities?: TaskPriority[]`.
- **Tag menu** in the filter row (trigger `Tag` when empty, `Tag: #a, #b` otherwise): one checkbox item per tag present in `tasksStore.rows` before the quick filters (so choosing one tag does not hide the others), from a pure `taskTagOptions(rows)` in `task-query.logic.ts`: shown with a leading `#`, de-duplicated case-insensitively (first spelling wins) and sorted case-insensitively, each item with `closeOnSelect={false}`. Empty means any. `quick` gains `tags?: string[]`, stored without `#` as Rust emits them. A task passes when it carries any chosen tag; a chosen tag `work` matches a task tag `work` or one starting with `work/` (nested prefix, the same rule as the note tag clause in Issue 116), case-insensitively. Today's task tag regex never emits a `/`, so the nested case shows only once Issue 075 lands; the logic covers it now.
- **Search:** an `<input type="search" placeholder="Search tasks" aria-label="Search tasks" class="w-40">` in the pane toolbar, after the title, count and spinner. Its value is bound to `tasksStore.quick.search`: typing sets it on every input (no debounce; it filters in memory), and a reset empties the box. It matches, case-insensitively as a substring, the row's `taskDisplayText` (Issue 109, what the row shows) or the note title.
- **Reset filters** (a text button at the end of the filter row) shows when status, due, priority, tag or search differs from its default, and restores all five with `resetQuick()`.
- **Narrow pane:** below 560 px container width (the root is `@container` since Issue 109) the Status, Due, Priority and Tag menus fold into one `Filters (n)` dropdown holding the same four groups, where n counts those of the four not at their default. The fold is CSS only: both the menus and the `Filters (n)` trigger are rendered, and container-query classes hide one of them. No resize observer, so jsdom tests keep seeing the menus. The section tag textbox stays visible, the note headers hide their folder subtitle, and in the toolbar the count hides before the search box shrinks.
- `describeTaskRule` adds `, priority <levels joined with ' or '>`, then `, tagged #a or #b`, then `, matching "<search>"` when set. `explainEmptyTasks` checks, after due: priority, then tag, then search, each with "No task matches the <Priority|Tag|Search> filter" and a `{ kind: 'resetQuick', field, label: 'Reset <Priority|Tag|Search> filter' }` action that resets only that field.

**Blocked by:** 238

**Status:** ready-for-agent

**Answered:** the merge with 120: owner, 2026-11-12. Task tags follow the tags Rust emits today; which characters a task tag may hold is Issue 075.

**Gate:** frontend only: `pnpm check` + `pnpm vitest run`, plus `bash scripts/e2e.sh` for the narrow-pane test.

- [ ] Failing test first, `task-query.logic.test.ts`: priority sets including `none`; the tag filter with a nested prefix (`work` keeps `work/client`, drops `workshop`), two tags (any of them), a different case and an empty set; `taskTagOptions` de-duplicates by case and sorts; search on the displayed text and on the note title, case-insensitive, finding `Chapter` in `read [[Book#Chapter 2]]`; the empty-state order status, due, priority, tag, search.
- [ ] `TasksView.test.ts`: typing in Search narrows the rows; choosing `#work` in the Tag menu lists only rows tagged `work` or `work/...`; "Reset filters" shows only when a quick filter is off its default, restores all five and empties the search box. Issue 238's empty-state test still finds exactly one "Reset Due filter" button.
- [ ] `tasks.store.test.ts`: `resetQuick()` and `reset()` clear `priorities`, `tags` and `search`.
- [ ] e2e: at a 500 px wide viewport the filter row shows `Filters (n)` instead of the four menus, and choosing Status > All inside it lists a done task.
- [ ] `help/documentation/10-tasks-and-todoist.md` "Filters": the Priority and Tag menus, the search box and Reset filters (PRD A12).

## Notes

- **Size:** M.
- Run in series with the other Tasks view Issues (see 108).
- The narrow fold and the 560 px threshold come from reading class lists; nothing was rendered during the research. Check the toolbar and the filter row by eye in a narrow split.
