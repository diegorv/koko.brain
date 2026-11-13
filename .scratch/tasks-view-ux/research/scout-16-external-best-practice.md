# Scout 16: external best practice for a desktop markdown task view

Scope: external task-view UX patterns (Obsidian Tasks, Dataview, Things 3, Todoist, TickTick, Linear) distilled for the Kokobrain Tasks view. Read-only on the codebase. Facts are verified in code or in the cited page; opinions are labelled.

## Summary

The current view is a flat file-grouped checklist with only two filters (a modified-date window and hide-completed) plus a section-tag input. Every mature task UI studied groups by a time or priority bucket instead of by source file, shows metadata as per-row chips, and exposes grouping, sorting and display properties as separate user controls. The data needed for that is already in the frontend: each `TaskItem` carries `metadata` (due, scheduled, start, priority, recurrence, tags, done/cancelled dates) that `TasksView.svelte` never reads. The highest-value redesign is therefore mostly a rendering and grouping change on data already fetched, not a Rust change.

## Facts (verified in code)

- The view is `src/lib/features/tasks/TasksView.svelte` (223 lines). Toolbar: three date pills (`:25-29`, `:94-105`), hide-completed eye toggle (`:108-121`), section tag input with 400 ms debounce (`:34-40`, `:124-133`).
- The only grouping is by file: `{#each filteredGroups as group (group.filePath)}` at `TasksView.svelte:149`, header at `:152-165` with file name in `text-purple-400` (`:154`), `formatDate(group.modifiedAt)` and the task count.
- The date filter is on the file's `modifiedAt`, not on any task date: `filterByDate` at `tasks.logic.ts:76-88`. A task due tomorrow in an old note is hidden by "Last 7 days".
- `TaskItem` already carries `metadata` with `dueDate`, `scheduledDate`, `startDate`, `createdDate`, `doneDate`, `cancelledDate`, `priority`, `recurrence`, `id`, `dependsOn`, `onCompletion`, `tags`, and a clean `description` (`src/lib/features/tasks/tasks.types.ts:16`; generated type `src/lib/contracts/generated/TaskMetadata.ts`). `fromV2` copies every field into the store (`tasks.service.ts:21-47`).
- `TasksView.svelte` never reads `task.metadata`. It renders `parseTaskTextSegments(task.text)` (`:194`), the raw line text, so emoji signifiers (due, priority, recurrence) appear as unparsed inline text. `grep` shows `metadata.dueDate/priority/tags` is consumed only by `event-calendar-tasks.logic.ts` and `todoist-sync/vault-scan.service.ts`, not by the Tasks view.
- `TaskPriority` = `highest | high | medium | none | low | lowest`; `TaskStatus` = `todo | done | cancelled | in-progress | question | forwarded | important` (generated `TaskPriority.ts`, `TaskStatus.ts`). So the status and priority vocabulary is Obsidian-Tasks-compatible.
- Sorting is implicit document order inside a file and `get_all_tasks_v2` order across files; there is no sort control. The store has no sort or group field (`tasks.store.svelte.ts:3-12`).
- The store defaults `sectionTag` to `#to-list` and `hideCompleted` to `true` (`tasks.store.svelte.ts:8,10`). A non-empty tag re-reads every note with tasks from disk on each refetch (`tasks.service.ts:88-95`), i.e. the default view always pays the heavier IPC.
- Toggle writes through Rust `toggle_task_status` with stale-line protection (`tasks.service.ts:130-167`). Clicking the task text opens the note at the line (`TasksView.svelte:64-69`). There is no inline editing of text, dates or priority.
- Rows: circle toggle, text, indentation `task.indent * 1.25rem` (`:174`). Completed tasks are only struck through (`:191`). No chips, no hover actions, no keyboard navigation, no collapse of groups, no empty-state variants beyond "No tasks found" (`:142`).
- Entry points: `tasks:toggle` command at `src/lib/app/commands.ts:197-203`, keybinding at `src/lib/app/global-keybindings.ts:116`.
- Existing tests: `src/tests/lib/features/tasks/{TasksView,tasks.logic,tasks.service,tasks.store,task-status.logic,task-toggle-dirty-buffer}.test.ts`.

## External patterns (verified from the cited pages)

### Obsidian Tasks plugin (closest analogue: same markdown format and emoji metadata)

- Grouping: `group by` supports status, due/scheduled/start/created/done/cancelled, `happens` (earliest of start/scheduled/due), priority, urgency, recurring, tags, folder, path, filename, backlink, heading. Multiple `group by` lines nest (h4, h5, h6 headings). Group headings sort alphabetically unless reversed or prefixed with hidden `%%1%%` keys. Source: https://publish.obsidian.md/tasks/Queries/Grouping
- Due buckets: `task.due.category.groupText` yields five ordered buckets, Invalid date, Overdue, Today, Future, Undated; the docs recommend placing it before `group by due` so Overdue and Today lead. `group by due` headings read `YYYY-MM-DD dddd`; undated tasks go under "No due date". Relative headings ("8 days ago", "in 11 hours") are also possible. Same source.
- Counts: `show group count` shows a count on the lowest-level groups; off by default. Same source.
- Pipeline order: filter, sort, limit, group, limit groups. Grouping never changes which tasks appear. Same source.
- Default sort (always appended, not removable): status.type, urgency, due, priority, path. Within a date sort: invalid dates first, then earliest to latest, undated last. Source: https://publish.obsidian.md/tasks/Queries/Sorting
- Urgency (Taskwarrior-inspired): sum of due score (0 to 12.0, about 0.457 per day, 12.0 at 7+ days overdue, 8.8 due today, 2.4 at 14+ days out, 0 undated), priority score (highest 9.0, high 6.0, medium 3.9, none 1.95, low 0.0, lowest -1.8), scheduled today or earlier +5.0, start date tomorrow or later -3.0. Source: https://raw.githubusercontent.com/obsidian-tasks-group/obsidian-tasks/main/docs/Advanced/Urgency.md
- Status model: six types, TODO, IN_PROGRESS, ON_HOLD, DONE, CANCELLED, NON_TASK. `not done` = TODO + IN_PROGRESS + ON_HOLD; `done` = DONE + CANCELLED + NON_TASK. `group by status` puts Done first and Todo second. Sources: https://publish.obsidian.md/tasks/Queries/Filters, https://publish.obsidian.md/tasks/Getting+Started/Statuses
- Filter vocabulary: `due before tomorrow`, `due on or before today`, `happens this week`, `no due date`, `priority is above none`, `is recurring`, `has tags`, `tags include #x` (partial match, `foo` matches `#foo/bar`), `heading includes ...`, `exclude sub-items`, boolean AND/OR/NOT. Relative ranges: last/this/next week, month, quarter, year (ISO weeks). Gotcha: a `starts before ...` filter also returns tasks with no start date. Source: https://publish.obsidian.md/tasks/Queries/Filters
- Layout controls: every metadata field can be hidden (`hide priority`, `hide due date`, `hide tags`, ...). `short mode` shows only emojis with details in a tooltip, `full mode` shows dates and rules. `show tree` nests children (children keep file order; sort only reorders top level). `hide backlink`, `hide edit button`, `hide postpone button`, `hide task count`. Source: https://publish.obsidian.md/tasks/Queries/Layout
- Toolbar: an in-result filter box that narrows by description without altering the query (case-insensitive, word order matters), and a copy-as-markdown button. Same source.
- Inline editing: a "Create or edit Task" modal with description, status (including custom), priority radio buttons, recurrence, all date fields, "only future dates", dependency fields, per-field Alt shortcuts. Result rows carry an edit button and a postpone button. Sources: https://publish.obsidian.md/tasks/Editing/Create+or+edit+Task, https://github.com/obsidian-tasks-group/obsidian-tasks/issues/2503 (search-result summary; the modal page itself was not directly fetched, so field list is partial)
- Gap that matters: the plugin's result view is a query-driven render with per-query configuration; there is no stateful toolbar for group/sort. That is exactly where a native view can do better.

### Obsidian Dataview TASK queries

- `TASK` returns tasks, not pages, with live checkboxes: ticking a task in the result writes the check to the source file. Child tasks render nested; if a parent matches its children come along, if only a child matches it appears alone. `TASK ... GROUP BY file.link` produces a file-link header with a count in parentheses. Source: https://blacksmithgu.github.io/obsidian-dataview/queries/query-types/
- Opinion: this is the same file-grouped layout Kokobrain has now. It is the baseline users already consider too bare, which is why the Tasks plugin exists.

### Things 3

- Lists are defined by planning intent, not by file: Today, Upcoming, Anytime, Someday, Inbox, Logbook. Today has a "This Evening" section at the bottom; Upcoming shows the next seven days as separate day headings, then later months; items with a future start date "hibernate" and move to Today on that date. Today can optionally be grouped by project or area. Source: https://culturedcode.com/things/support/articles/4001304/ and https://culturedcode.com/things/support/articles/2803579/
- Start date ("When") and deadline are separate concepts. Opinion: Kokobrain has the same split (`scheduledDate`/`startDate` vs `dueDate`), so "Today" can mean scheduled-or-due-today.
- Keyboard: Cmd-2/3/4/5 jump to Today/Upcoming/Anytime/Someday (search summary of the Things support article).

### Todoist

- Today and Upcoming show only dated tasks. Overdue gets its own heading with a Reschedule action for all overdue tasks. Default smart sort: date and time, then priority, then deadline, then manual order, then creation time. Source: https://www.todoist.com/help/todoist/get-started/plan-your-day-with-the-today-view-UVUXaiSs and https://www.todoist.com/help/todoist/features/default-sorting-order-in-todoist-mqmgerY7 (via search summary)
- Display menu: layout (list, board, table, calendars), sort by (manual, name, date, date added, deadline, priority), group by (date, date added, deadline, priority, label, project). Grouping disables manual drag reorder. An orange dot on the Display button shows the view differs from default; "Reset all" clears it. Filters by assignee, date, deadline, priority, label. Sources: https://www.todoist.com/help/todoist/features/sort-or-group-tasks-in-todoist-WFWD0hrb, https://www.todoist.com/help/todoist/features/customize-views-in-todoist-AoHhBxFdZ
- Quick add inside a group inherits the group's value (date, priority, label). Same source.

### TickTick

- Group options: List, Time, Priority, Tag, Assignee, Created time. Sort: Date, Priority, Created time, Modified time. Grouping by Time gives Today, Tomorrow, Next 7 days. Smart lists (Today, Tomorrow, Next 7 Days) are saved filters. Kanban view of the same data. Source: https://help.ticktick.com/articles/7056594711640801280 (via search summary; direct fetch truncated).

### Linear

- A single "Display options" popover with: grouping (and sub-grouping), ordering within groups (status, priority, created, updated, due date, manual; reversible except manual), "show empty groups", sub-issue nesting, and "display properties" that toggle which chips appear per row without filtering. Group headers show the count and stay sticky on scroll. Dragging an issue into another group assigns that group's value. Display settings can be personal or a view default. Source: https://linear.app/docs/display-options
- Keyboard shortcuts for display options exist (Shift+Opt+O ordering, Shift+Opt+G grouping) per the changelog (search summary).
- The page does not describe collapsing groups; do not cite Linear for collapse.

## Problems and opportunities (opinion, grounded in the facts above)

1. Grouping axis is wrong for a "what should I do" view. Grouping by file answers "where does this live", while Today, Upcoming, Overdue and priority buckets answer "what next". File grouping stays useful as one option (Dataview and Tasks both offer it).
2. Metadata is fetched and ignored. Due date, priority, tags, recurrence render as raw emoji inside text (`TasksView.svelte:194`). Chips would use data already in the store with no IPC change.
3. The date filter filters on the note's mtime (`tasks.logic.ts:76-88`), which does not match what users mean by "last 7 days" for tasks. Due or scheduled based buckets are the established alternative.
4. No sort control and no stable order across files. Obsidian Tasks, Todoist and Linear all treat sort as an explicit, reversible setting with a sensible default (status, then due, then priority, then path).
5. Completed-task handling is a single binary toggle with default hidden. Done and cancelled are lumped; in-progress, question, forwarded, important statuses (`TaskStatus`) have no visual identity in the list even though the toggle logic knows them (`TasksView.svelte:170`).
6. No keyboard model. Rows are mouse only; no up/down selection, no Space to toggle, no Enter to open. Things, Todoist and Linear are keyboard first.
7. No collapsible groups, no persistent view state. Group collapse and chosen filters reset on every open (`tasks.store.svelte.ts` is memory only).
8. Section tag input is a power-user control exposed as a bare text box with a magic default `#to-list`; its cost is a disk rescan (`tasks.service.ts:88-95`). It reads as noise to anyone not using that convention.
9. Visual polish: file name in `text-purple-400`, `text-xs` muted counts and bare circle icons give no hierarchy. No hover affordances, no sticky headers, one empty state for "no tasks" and "everything filtered".
10. Inline editing is absent: changing a due date or priority means opening the note.

## Recommendations for the redesign (opinion; ordered as candidate vertical slices)

1. **Metadata chips on rows.** Render `metadata.description` (clean text, still passed through `parseTaskTextSegments`) plus chips: due date with relative label and overdue color, priority marker (colored flag or bars, only for non-`none`), recurrence icon, tags as pills, start/scheduled as muted dates. Gate behind a small "Display" popover (Linear's display properties; Tasks' `hide ...`). Pure logic in a new `.logic.ts` with tests. Data already exists; no Rust.
2. **Group-by selector with due buckets as default.** Options: Due (Overdue, Today, Tomorrow, This week, Later, No date), Priority, File, Tag, None. Use the Tasks plugin bucket order (Overdue, Today, Future, Undated) and Todoist's explicit Overdue heading. Show counts in headers (Tasks `show group count`, Linear header count). Keep "File" as the current behavior so nothing is lost. Keep the Done group last (Tasks `group by status` puts done first; opinion: last is better in an open-work view).
3. **Sort selector within groups.** Default order: status (in-progress first), due ascending with undated last, priority descending, then path and line number. Add a reverse toggle (not for manual). Use Todoist's and Obsidian's date-sort rule: undated last. An optional urgency score is possible but probably over-built for v1; the Tasks coefficients above are the reference if wanted.
4. **Quick filter bar.** Replace the mtime pills with saved-filter style chips: Today, Next 7 days, Overdue, No date, High priority, plus a text search box that filters by description (Tasks toolbar filter box, case-insensitive substring). Keep hide-completed but widen to "Show: open / all / done" so done and cancelled can be separated. Move the section tag input into an "Advanced" disclosure or a scope menu ("Section: #to-list").
5. **Collapsible groups and sticky headers.** Headers show chevron, label and count; collapse state persisted per group key. Sticky headers per Linear. Persist grouping, sort and filter choice in settings so the view reopens as left.
6. **Status-aware checkboxes.** Distinct icons for in-progress, question, forwarded, important, cancelled (Tasks' custom-status model; Things' dotted checkbox for deferred items), done rows dimmed with the done date as a chip. The click-writes-target rule at `TasksView.svelte:170` stays.
7. **Keyboard navigation.** Arrow keys move a row focus ring, Space toggles, Enter opens at line, a key to focus the filter box. Follows Things, Todoist and Linear conventions.
8. **Inline edit of due date and priority (later slice).** Popover from a chip or hover action: date picker with Today, Tomorrow, Next week, No date shortcuts (Things date picker, Todoist reschedule), priority radio (Tasks modal). Writes the line back through a new Rust command in the same style as `toggle_task_status` (stale-line guard). This is the only recommendation that needs backend work; also a "postpone" hover action (Tasks has a postpone button).
9. **Empty states.** Distinguish "no tasks in the vault", "nothing matches filters" (with a Clear filters action), and "all done". Todoist's "view differs from default" dot plus Reset all is a cheap pattern.
10. **Tree option.** Nested children are already implied by `indent`; Tasks warns that sort only reorders top-level and children keep file order, so any sort or group must define behavior for sub-tasks first (Todoist groups sub-tasks by their own values, Tasks keeps them under the parent). Opinion: keep children under the parent within a group and bucket by the parent only.

Suggested slice order for tickets: (1) chips, (2) group-by with due buckets plus counts, (3) sort, (4) quick filters plus search, (5) collapsible and sticky headers with persisted view state, (6) status icons, (7) keyboard, (8) inline date/priority edit. Slices 1 to 7 are frontend only.

## Open questions for the owner

1. Is the default view meant to be "what do I do today" (due buckets) or "everything in my to-list section" (file grouping with the `#to-list` section tag)? This decides the default group-by.
2. Is the `#to-list` section tag a core workflow or a legacy artifact? If core, it should stay a visible scope control; if not, it can move behind Advanced and the default can be empty (also removes the disk rescan on every refetch).
3. How many of the notes use emoji metadata (due, priority, recurrence) in practice? If few, chips and due buckets help only a minority and a "No date" bucket will dominate; priority could then be inferred from `#tags` or status.
4. Should "Today" include scheduled and start dates (Things-style, Tasks `happens`) or only due dates?
5. Is inline editing of dates and priority in scope, given it needs a new Rust write command?
6. Should view settings (group, sort, filters, collapsed groups) persist across restarts, and per vault?
7. Do done and cancelled tasks ever need to be browsed (a Logbook-style view), or is hide-completed enough?
8. Keep the purple file-name accent, or align with the app's primary color tokens? (Visual only.)

## Limits of this research

- Obsidian Tasks edit-modal page and TickTick help page could not be fully fetched; those points come from search summaries and are marked as such. The Todoist default-sorting and Today pages and the Things scheduling page were taken from search summaries, not fetched directly.
- No app was run and no screenshots were taken; the description of the current UI comes from reading `TasksView.svelte`.
