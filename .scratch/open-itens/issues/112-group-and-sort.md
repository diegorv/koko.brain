# 112: Group the Tasks list by note, folder, due, priority or status

**Origin:** `tasks-view` Issue 08, moved here on 2026-11-08 and rewritten on 2026-11-12 from the Tasks view UX research (`.scratch/tasks-view-ux/research/`, `critique.md` D4, D6 and D8). Collapse and the 50-row cap moved to Issue 240. Its PRD stays in `.scratch/archived/tasks-view/`. Issue numbers in this text are open-itens numbers.

**What to build:** Tasks are grouped only by note. Add a Display menu with one grouping level (PRD A3), so "what is overdue" or "what is high priority" reads at a glance.

- **Display menu:** a `DropdownMenu` trigger `Display` at the end of the pane toolbar, after the search box (Issue 239), holding a "Group by" radio group: Note (default), Folder, Due date, Priority, Status. `tasksStore` gains `group: 'note' | 'folder' | 'due' | 'priority' | 'status'` (default `'note'`) with `setGroup`, and `sort: TaskSortKey[]` with `type TaskSortKey = 'due' | 'priority' | 'path'`, fixed at `['due', 'priority', 'path']`. This Issue adds no sort control; `sort` is in the store so Issues 123 and 126 can persist and compare it. `reset()` restores both.
- **Groups**, from `groupTaskRows`, each `{ key, label, rows, count }`, empty groups left out:
  - Note: one group per note, key `filePath`, label `noteTitle`, in the order the rows arrive (path order since Issue 234). Rows keep document order, and dimmed parents (Issue 111) stay.
  - Folder: key and label the row's `folder`, `Vault root` for `''`; Vault root first, then folders by path.
  - Due date: Overdue (before today), Today, Tomorrow, This week (today + 2 days through today + 7 days, the same window as the Due filter's "Next 7 days"), Later, No date, in that order.
  - Priority: Highest, High, Medium, No priority (`none`), Low, Lowest, in that order.
  - Status: Todo, In progress, Question, Important, Forwarded, Done, Cancelled, in that order.
- **Headers.** Note groups keep Issue 236's header: file icon, title button, folder subtitle, "N of M open". Every other group's header shows only its label and its open count ("Overdue, 3 open"), with no icon and no subtitle, because it stands for no single note.
- **Rows in groups other than Note** are flat: rows with `dimmed: true` are dropped, and rows are sorted by the `sort` keys in order: due date ascending with undated rows last, then priority in the order above, then `relPath`, then `lineNumber`. A row whose `parentLine` points at another task of the same note gets `breadcrumb` set to that parent's display text, looked up in the rows `groupTaskRows` was given (dimmed ones included). The view shows it as a muted `text-xs` line above the row's text.
- **Keys.** Rows are keyed `filePath:lineNumber`, since a flat group mixes notes.
- **Keyboard.** Issue 113's roving focus and kept current row work across flat groups unchanged, in DOM order.
- `timeSync('TASK-PROFILE', 'groupTaskRows', ...)` (`#lib/utils/debug.js`) wraps the `groupTaskRows` call inside the store's `$derived`, never inside `task-query.logic.ts`: `pure-logic.test.ts` forbids `utils/debug.ts` as an import of a `.logic.ts`. This is the log the PRD's "Why not Rust" reads.

**Logic.** `groupTaskRows(rows: VisibleRow[], group, sort: TaskSortKey[], today: string)` in `task-query.logic.ts` returns the groups, with rows typed `VisibleRow & { breadcrumb?: string }`. It replaces Issue 111's `rowsByNote`, which is deleted with its tests. The store exposes the result as a `groups` getter over a module-level `$derived` of `visibleRows`, `group`, `sort` and today (ADR-0034), with a test. `count` is the number of rows with `dimmed: false`.

**Blocked by:** 113

**Status:** ready-for-agent

**Answered:** PRD A3: one grouping level; note groups sort by path, not mtime (owner, 2026-11-06). Grouping runs after the keyboard work (owner, 2026-11-12).

**Gate:** frontend only: `pnpm check` + `pnpm vitest run`.

- [ ] Failing test first, `task-query.logic.test.ts`, on a fixed row set and today `2026-11-05`: each grouping's labels and order; "No priority" between Medium and Low; folder labels including "Vault root" first; note groups keep the incoming order whatever the rows' `modifiedAt`; flat rows sorted by due, then priority, then path and line; the order `['priority', 'due', 'path']` sorts by priority first; due buckets put `2026-11-07` and `2026-11-12` in This week and `2026-11-13` in Later.
- [ ] A parent and child that land in different due buckets: the child carries the parent breadcrumb, and a dimmed parent is not shown in a flat grouping.
- [ ] `tasks.store.test.ts`: the `groups` getter follows a `setGroup` change and a rows change (real store); `reset()` restores `group`.
- [ ] `TasksView.test.ts` (clock faked to 2026-11-05): choosing Display > Due date renders the bucket headers with their open counts and no file icon; ArrowDown moves focus from the last row of one bucket to the first row of the next.
- [ ] `help/documentation/10-tasks-and-todoist.md` (the sentence that says tasks are grouped by source file and sorted by modification date) describes the Display menu, the default note grouping by path, and the due, priority, path sort of the other groupings (PRD A12).

## Notes

- **Size:** M.
- Run in series with the other Tasks view Issues (see 108).
- Note type, note property and heading groupings need note fields and headings, so they come in Issue 118.
