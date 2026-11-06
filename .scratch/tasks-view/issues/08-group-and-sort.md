# 08: Group and sort by note, folder, due, priority or status

**What to build:** Tasks are grouped only by file today (`TasksView.svelte:179`), in the order Rust returns them (newest mtime first). Add a Display menu with one grouping level (PRD assumption A3).

- **Display menu:** a `DropdownMenu` trigger `Display` in the toolbar, holding a "Group by" radio group: Note (default), Folder, Due date, Priority, Status. `tasksStore` gains `group: 'note' | 'folder' | 'due' | 'priority' | 'status'` (default `'note'`) with `setGroup`, and `sort: TaskSortKey[]` with `type TaskSortKey = 'due' | 'priority' | 'path'`, fixed at `['due', 'priority', 'path']`. This Issue adds no sort control; `sort` is in the store so Issues 16 and 29 can persist and compare it.
- **Groups**, from `groupTaskRows`, each `{ key, label, rows, count }`, empty groups left out:
  - Note: one group per note, key `filePath`, label `noteTitle`, groups ordered by `relPath` (not mtime, so groups stop moving after each save). Rows keep document order, and dimmed parents (Issue 07) stay. The header keeps today's look: the name button that opens the note (`:183-188`), the date and the count.
  - Folder: key and label the row's `folder`, `Vault root` for `''`; Vault root first, then folders by path.
  - Due date: Overdue (before today), Today, Tomorrow, This week (today + 2 days through today + 7 days, the same window as the Due filter's "Next 7 days"), Later, No date, in that order.
  - Priority: Highest, High, Medium, No priority (`none`), Low, Lowest, in that order.
  - Status: Todo, In progress, Question, Important, Forwarded, Done, Cancelled, in that order.
- **Rows in groups other than Note** are flat: rows with `dimmed: true` are dropped, and rows are sorted by the `sort` keys in order: due date ascending with undated rows last, then priority in the order above, then `relPath`, then `lineNumber`. A row whose `parentLine` (Issue 07) points at another task of the same note gets `breadcrumb` set to that parent's `description` by `groupTaskRows` (looked up in the rows it was given, dimmed ones included), and the view shows it as a muted `text-xs` line above the row's text. Other group headers show the label and the count.
- **Keys.** Rows are keyed `filePath:lineNumber` (today `task.lineNumber` inside a per-file `{#each}`, `:199`, which a flat group cannot use).
- **Collapse.** Each group header has a chevron button with `aria-expanded` that hides its rows. The collapsed group keys live in a `$state` set inside `TasksView.svelte` (session only; the view remounts when the Tasks tab is reopened, `EditorView.svelte:71-72`).
- **Volume.** A group shows at most its first 50 rows, then a `Show N more` button (N = the remaining count) that shows all of that group's rows (PRD A9).
- `timeSync('TASK-PROFILE', 'groupTaskRows', ...)` (`#lib/utils/debug.js`, `debug.ts:57`) wraps the `groupTaskRows` call inside the store's `$derived`, never inside `task-query.logic.ts`: `pure-logic.test.ts:28` forbids `utils/debug.ts` as an import of a `.logic.ts`. This is the log the PRD's "Why not Rust" reads.

**Logic.** `groupTaskRows(rows: VisibleRow[], group, sort: TaskSortKey[], today: string)` in `task-query.logic.ts` returns the groups, with rows typed `VisibleRow & { breadcrumb?: string }`. It replaces Issue 07's `rowsByNote`, which is deleted with its tests. The store exposes the result as a `groups` getter over a module-level `$derived` of `visibleRows`, `group`, `sort` and today (ADR-0034), with a test. `count` is the number of rows with `dimmed: false`.

**Blocked by:** 07

**Status:** ready-for-agent

**Gate:** frontend only: `pnpm check` + `pnpm vitest run`.

- [ ] Failing test first, `task-query.logic.test.ts`, on a fixed row set and today `2026-11-05`: each grouping's labels and order; "No priority" between Medium and Low; folder labels including "Vault root" first; note groups in `relPath` order whatever the rows' `modifiedAt`; flat rows sorted by due, then priority, then path and line; the order `['priority', 'due', 'path']` sorts by priority first; due buckets put `2026-11-07` and `2026-11-12` in This week and `2026-11-13` in Later.
- [ ] A parent and child that land in different due buckets: the child carries the parent breadcrumb, and a dimmed parent is not shown in a flat grouping.
- [ ] `tasks.store.test.ts`: the `groups` getter follows a `setGroup` change and a rows change (real store).
- [ ] `help/documentation/10-tasks-and-todoist.md:13` ("grouped by their source file and sorted by file modification date") describes the Display menu, the default note grouping by path, and the due, priority, path sort of the other groupings (PRD A12).
- [ ] `TasksView.test.ts` (clock faked as in Issue 05): choosing Display > Due date renders the bucket headers with their counts; collapsing a group hides its rows and sets `aria-expanded="false"`; a note with 60 tasks shows 50 rows and "Show 10 more", and clicking it shows all 60.

## Notes

- **Size:** M.
- Note type, note property and heading groupings need note fields and headings, so they come in Issue 15.
