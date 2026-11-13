# Scout 09: date filter semantics in the Tasks view

Scope: `filterByDate`, `computeTaskStats`, `filterCompleted`, and what task-level date data exists today. Read-only analysis; nothing was run.

## Summary

The Tasks view's only date control ("All time / Last 7 days / Last 30 days") filters whole files by the file's `modifiedAt`, not by any date on a task. It answers "which notes did I touch recently", which is a question almost nobody asks of a task list, and it is easily fooled because any write to a note (including ticking a task in this very view) refreshes the mtime. Meanwhile the Rust index already parses due, scheduled, start, created, done and cancelled dates (plus priority and recurrence) for every task and ships them to the frontend, where `fromV2` copies them into `TaskItem.metadata` and the view then ignores them. A date-bucketed layout (Overdue, Today, Upcoming, No date) can be built today with frontend-only work on data that is already loaded. The stats helper (`computeTaskStats`) and `filterCompleted` are sound but are tuned to the file-grouped layout and will need small changes (counts per bucket, overdue count, status-aware "completed").

## Facts (verified in code)

### The filter itself

- `filterByDate` takes `FileTaskGroup[]`, a `TaskDateFilter` and an injectable `now`, computes `cutoff = now - days * 86400000` and keeps `groups.filter((g) => g.modifiedAt >= cutoff)`. `src/lib/features/tasks/tasks.logic.ts:76-88`. It never reads `task.metadata`.
- `TaskDateFilter = 'all' | 'last7days' | 'last30days'`. `src/lib/features/tasks/tasks.types.ts:32`.
- The view hard-codes the three pills and renders them as the first toolbar item. `src/lib/features/tasks/TasksView.svelte:25-29` (options), `:94-104` (buttons).
- The filter pipeline is `filterByDate` then optionally `filterCompleted`, in a `$derived.by`. `TasksView.svelte:46-52`. `stats` is derived from the result. `:54`.
- Store holds `dateFilter` (default `'all'`) and it is reset on vault change. `src/lib/features/tasks/tasks.store.svelte.ts:6,22,29`. It is not persisted anywhere else in these files.
- Unit tests cover `filterByDate` only with `modifiedAt` offsets (1, 10, 60 days). `src/tests/lib/features/tasks/tasks.logic.test.ts:168-191`. No test builds a task with a due date.

### What modifiedAt actually is

- `FileTaskGroup.modifiedAt` is documented as the "File's last-modified timestamp in ms". `tasks.types.ts:24-26`.
- Rust sends seconds; `fromV2` multiplies by 1000. `tasks.service.ts:14-24`.
- Rust fills it from `NoteEntry.modified_at`, i.e. file mtime. `src-tauri/src/vault/index.rs:1068-1082` (`lookup_all_tasks`). The section path uses `candidate.modified_at`. `src-tauri/src/commands/vault.rs:720-728`.
- The groups arrive already sorted by `modified_at` descending, and the view renders them in that order. `index.rs:1082`, `commands/vault.rs:728`, `TasksView.svelte:149`.
- Ticking a task writes the note and updates the index with the fresh mtime: `write_atomic`, then `read_file_mtime_secs`, then `update_note_in_index_inner(..., mtime)`. `src-tauri/src/commands/vault.rs:810-818`. So toggling a task in this view moves its file to the top of the list and into every "recent" window. Todoist sync writes to notes too (`src/lib/features/todoist-sync/note-writer.service.ts` exists), so it also refreshes mtimes. I did not trace the sync write path; this is inferred.
- The date shown next to each file name in the view is the same `modifiedAt`, formatted `en-US` ("Nov 5, 2026"). `TasksView.svelte:80-87,159-161`. It sits next to the count and reads like a task date to a casual user.

### Task-level date data that already exists

- Rust `TaskMetadata` carries `due_date`, `scheduled_date`, `start_date`, `created_date`, `done_date`, `cancelled_date` (all optional `YYYY-MM-DD` strings), plus `priority`, `recurrence`, `id`, `depends_on`, `on_completion`, `tags`, and `description`. `src-tauri/src/vault/task.rs:76-125`.
- Extraction is a regex per date signifier: signifier, optional whitespace, `\d{4}-\d{2}-\d{2}`. First match per field wins; the match is stripped from `description`. `src-tauri/src/vault/parsing.rs:1449-1458` (table), `:1495-1500` (regex builder), `:1776-1800` (`parse_task_metadata`). The Rust regex does not validate calendar correctness (a string like 2026-02-30 is accepted).
- The frontend copies all of these into `TaskItem.metadata` in `fromV2`. `tasks.service.ts:31-45`. `TaskItem.metadata: TaskMetadata` is typed. `tasks.types.ts:15-16`.
- Nothing in `TasksView.svelte`, `tasks.logic.ts` or the store reads `metadata.*` (grep over `src/lib/features/tasks` finds `dueDate` only in `tasks.service.ts`). So the data is loaded and dropped.
- `TaskItem.text` is the raw text including signifiers (Rust: "Raw task text (without the checkbox prefix)", `task.rs:19-20`), and the view renders `task.text` through `parseTaskTextSegments`, not `metadata.description`. `TasksView.svelte:194`. So today the due date appears inline as raw signifier text with the date digits, unformatted.
- The Calendar already consumes the same index for due dates: `tasksFromGroups` keeps tasks with a valid `metadata.dueDate`, drops the rest, and uses `metadata.description || task.text`. `src/lib/features/event-calendar/event-calendar-tasks.logic.ts:49-66`. It sorts by due date, then path, then line (`:37-42`).
- Reusable date helpers exist in the event-calendar feature: `toKey(date)` (local day key), `fromKey`, `isValidDayKey` (round-trip check, rejects 2026-02-30), `addDays(key, n)`, `rangeKeys`. `src/lib/features/event-calendar/event-calendar-dates.logic.ts:57,66,77,205` and `addDays` just below `:90`. `eventCalendarViewStore.todayKey` is a reactive, clock-driven "today". `src/lib/features/event-calendar/event-calendar-view.store.svelte.ts:87`. Note `features/tasks` importing `features/event-calendar` is a feature-to-feature import; the layer table in CLAUDE.md lists only core/features/plugins/utils, with no stated rule against it, but a pure shared helper in `utils/` would be cleaner (opinion).
- Priority is a `TaskPriority` union of highest, high, medium, none, low, lowest. `task.rs:50-58`.
- Recurrence is only `{ text }` (raw rule text, e.g. "every week"). `task.rs:66-69`. There is no machine-readable next-occurrence.
- Toggling a task writes only the checkbox character: `set_task_status_in_content(&original, line_number, target)`. `commands/vault.rs:790-794`. No done-date or recurrence handling is applied in that function (I did not find a done-date write in `src-tauri/src` outside parsing; grep for `done_date` returned only the struct field). So `doneDate` exists only if the user or another plugin typed it, and a recurring task toggled here is simply marked done, not rolled forward. Worth confirming (see open questions).

### computeTaskStats and filterCompleted

- `computeTaskStats(groups)` loops all tasks, counting `total`, `completed` (`task.checked`), `pending = total - completed`, and `fileCount = groups.length`. `tasks.logic.ts:91-113`.
- `TasksView` only displays `stats.total` and `stats.fileCount` ("N tasks in M files"). `pending` and `completed` are computed but never shown. `TasksView.svelte:144-146`. They are tested (`tasks.logic.test.ts:193-`).
- `checked` is true for any status other than `todo` (Rust doc: "status is anything other than `todo`"). `task.rs:21`. So in-progress, question, forwarded and important tasks count as `completed` in the stats and are treated as done by `filterCompletedTasks`. Cancelled counts as completed too. Meanwhile the click target uses `toggleTarget`, where only done and cancelled "reopen" and every other status "completes". `task-status.logic.ts:7-9`. The view's own comment acknowledges that `checked` and "clickable to complete" diverge. `TasksView.svelte:170`.
- Consequence for hide-completed: with `hideCompleted` on (the default, `tasks.store.svelte.ts:10`), `filterCompletedTasks` removes every `checked` task unless a descendant is unchecked. `tasks.logic.ts:34-52`. That hides in-progress (`[/]`), important (`[!]`), question and forwarded tasks, which are arguably open work. This is a status-semantics issue and relevant to any "Overdue/Today" buckets, because an in-progress task due today would vanish from "Today".
- `filterCompleted` is structure-aware: it walks a file's flat task list and keeps a checked parent when the consecutive following tasks with greater indent contain an unchecked one. `hasUncheckedDescendants`, `tasks.logic.ts:17-26`. It relies on tasks being a document-ordered, contiguous list with `indent`. Any regrouping across files or by date (a flat Overdue list) breaks the parent/child adjacency this depends on; subtasks would need to be carried with their parent or the hierarchy flattened.
- A subtlety in hierarchy: a child task's own due date is independent of its parent's. A date-bucketed layout must decide whether a child is bucketed by its own date, its parent's, or follows the parent. The current data has no parent pointer; hierarchy is implicit in `indent` and order.

### Section tag interaction

- Default section tag is `#to-list`, so the default list is not "all tasks" but only tasks under headings containing that tag. `tasks.store.svelte.ts:8`. Fetch goes through `get_tasks_in_section_v2` when non-empty (disk re-read of every note with tasks), else `get_all_tasks_v2`. `tasks.service.ts:65-80`.
- Task dates come through either path unchanged, since both run `extract_tasks*` which calls the same metadata parser. Date-based grouping therefore does not depend on which fetch path is used.

## Problems and opportunities

Facts first, opinions marked.

1. Fact: the date control filters notes, not tasks. A task due 2026-11-03 in a note last edited in March is hidden by "Last 30 days"; a task with no date in a note edited yesterday is shown. The control can hide overdue work.
2. Fact: mtime is perturbed by the app itself (toggle write, `commands/vault.rs:810-818`) and likely by sync. Opinion: this makes "Last 7 days" noisy even as a "recently active notes" signal.
3. Fact: the per-file date next to the file name is mtime, not a task date. Opinion: it is the most visible date in the UI and the least useful one for a task list.
4. Fact: due, scheduled, start, created, done, cancelled dates and priority are available per task and unused in the view. Opinion: this is the largest cheap win; no Rust or IPC change is needed (so no ts-rs regeneration) for bucketing by due or scheduled date.
5. Fact: raw signifier text is rendered inline (`TasksView.svelte:194` uses `task.text`). Opinion: when grouping by date the signifiers become redundant and should be stripped and shown as a chip (the Calendar already prefers `metadata.description || text`, `event-calendar-tasks.logic.ts:59`).
6. Fact: stats only show total and file count; `pending`/`completed` unused. Opinion: stats should become per-bucket counts (Overdue 3, Today 5...) with an overdue highlight.
7. Fact: `checked` conflates statuses. Opinion: define "open" explicitly (todo, in-progress, important, question, forwarded are open; done and cancelled closed) in one pure helper, and reuse it in the filter, stats and bucketing. This is a behavior change for hide-completed, so it needs an owner decision.
8. Fact: `filterCompleted` depends on document adjacency within a file. Opinion: bucket-by-date needs either a "task tree" unit (parent plus descendants move together) or accepting flat children; pick one up front.
9. Fact: no time-of-day, no timezone in task dates; they are `YYYY-MM-DD` strings. Opinion: compare as strings against a local-day key (`toKey(new Date())`), never via `Date.parse` (UTC parse would shift the day), which matches how the Calendar does it.
10. Fact: the Rust date regex accepts impossible dates; the Calendar guards with `isValidDayKey`. Opinion: the same guard is needed in the Tasks view or an invalid date silently sorts wrong; treat invalid as "No date" or show a warning chip.
11. Fact: recurrence is raw text only and toggle does not roll recurring tasks forward. Opinion: a recurring task that is marked done stays done in the file, so "Today" for recurring tasks cannot be derived from this data; out of scope for v1.

## What users expect (opinion, standard task-manager conventions)

Buckets, evaluated against today's local day key `T`:

| Bucket | Rule on the chosen date `D` | Typical order within bucket |
|---|---|---|
| Overdue | open task and `D < T` | oldest first, then priority desc |
| Today | `D == T` | priority desc, then file, then line |
| Upcoming | `D > T` (optionally sub-grouped Tomorrow, This week, Later, or by day) | date asc |
| No date | no valid `D` | priority desc, then file mtime or file name, line |

Choice of `D`: Obsidian Tasks, which this signifier syntax is borrowed from, treats due as the deadline, scheduled as "plan to work on it", and start as "hidden until". A reasonable single sort date is `due`, falling back to `scheduled`; a task whose `start_date` is in the future could be hidden or dimmed until then (opinion; owner decision). Done tasks (when shown) go to a separate collapsed "Completed" group, sorted by `doneDate` when present.

A quick-filter row replacing the mtime pills would be: All, Overdue, Today, Next 7 days, No date. "Next 7 days" here means task dates in `[T, T+6]`, which is the semantic the current "Last 7 days" pill implies to a user but with the right data. Counts on each chip are cheap because all tasks are already in memory.

## Recommendations for the redesign

1. Add a pure `task-dates.logic.ts` (no framework imports, per the layer rules for `.logic.ts`) with: `effectiveDate(task)` (due, else scheduled, else none; validate with a day-key check), `bucketOf(task, todayKey)`, `groupByBucket(groups, todayKey)`, `isOpen(status)`. Inject `todayKey` for testability, the same way `filterByDate` injects `now` (`tasks.logic.ts:79`).
2. Take `todayKey` from a reactive source so Overdue/Today re-evaluate at midnight. `eventCalendarViewStore.todayKey` already does this (`event-calendar-view.store.svelte.ts:87`); if the dependency direction is a concern, lift the clock and the day-key helpers to `utils/` (opinion).
3. Replace `TaskDateFilter` (`tasks.types.ts:32`) with a task-date quick filter (`all | overdue | today | next7 | nodate`) and a "group by" switch (`date | file`). Keep file grouping as the alternate mode rather than deleting it, since the section-tag workflow (daily-note style files) is file-oriented (opinion). Keep or demote the mtime filter to a "Modified in last N days" secondary option only if the owner uses it; do not leave it as the only date control.
4. Show the task's date as a chip (relative text such as "Today", "Tomorrow", "3 days ago", "Nov 20"; red for overdue) and render `metadata.description` instead of raw `text` so signifiers are not duplicated. Keep the file name as secondary text on each row in date-grouped mode, since the group header no longer carries it. Task text clicks and wikilink handling stay as in `TasksView.svelte:188-213`.
5. Change the stats line to bucket counts and show an overdue number; stop displaying file count in date mode. `computeTaskStats` can stay as is for file mode and gain a sibling `computeBucketStats`; keep tests for the existing function (project rule: never weaken tests).
6. Make `filterCompleted` bucket-safe by moving whole subtrees: build trees from `indent` order inside each file first, then bucket by the root's date, with children following the parent (simplest, preserves `filterCompletedTasks` semantics per file). A child with its own earlier due date than its parent is an edge case to decide (see questions).
7. Fix the "open" definition once, in `isOpen`, and use it in hide-completed, stats and bucketing. Separate this into its own ticket because it changes what hide-completed hides today.
8. Do not touch Rust for the first slices: due, scheduled, start, done dates and priority are already on `TaskMetadata` and in `fromV2`. Adding things like a computed `effectiveDate` or sorting in Rust would be an IPC DTO change (ts-rs regeneration, gate "Both") and is unnecessary.
9. Suggested vertical slices, each user-visible and independently testable:
   - Slice A: date chip on each row plus description instead of raw text (read-only, no filter change).
   - Slice B: "Group by date" with Overdue / Today / Upcoming / No date sections, behind a toggle, default still file mode.
   - Slice C: quick-filter chips with counts (Overdue, Today, Next 7 days, No date) replacing the mtime pills.
   - Slice D: `isOpen` status semantics for hide-completed and stats (owner decision first).
   - Slice E: quick actions that write dates (set due to today/tomorrow); this needs a Rust write path (existing `task_lines.rs` has a due-date patch concept for Todoist, `task_lines.rs:104`, not verified for reuse) and is outside the date-filter scope.
10. Tests: pure logic tests for buckets with injected `todayKey`, boundary days (due == today is Today, not Overdue), invalid dates (2026-02-30), tasks with both due and scheduled, done tasks past due (not Overdue), midnight rollover, and the child/parent case. Per project rules these use real store state and no mocks of `.logic.ts`.

## Open questions for the owner

1. Which date drives the buckets: due only, due then scheduled, or scheduled for "Today" and due for "Overdue"? Do you use scheduled and start dates at all, or only due?
2. Should the old mtime filter ("Last 7 / 30 days") survive in any form, or be removed? Do you ever use it today, and for what?
3. Is the default view still the `#to-list` section filter (`tasks.store.svelte.ts:8`)? In date mode, should the section tag remain a hard filter, or become one chip among others?
4. In-progress, important, question and forwarded tasks are currently hidden by "hide completed" because `checked` is true for them. Intended or accidental? Should they count as open for Overdue/Today?
5. Undated tasks: show them in a "No date" group at the bottom, hide them by default, or group them by file as today?
6. A child task with its own due date inside an undated parent (or the reverse): bucket by its own date, or follow the parent?
7. Recurring tasks: ticking one only marks it done and does not roll the date forward. Is a recurrence-aware completion in scope of this redesign, or handled elsewhere (for example Todoist sync, which handles recurrence in `fields.logic.ts`)?
8. Does toggling a task done need to write a done-date, so completed tasks can be sorted or grouped by completion day? Currently only the checkbox is written (`commands/vault.rs:790-794`).
9. Is a feature-to-feature dependency on the event-calendar date helpers acceptable, or should the day-key helpers move to `utils/`?
10. Week start and "this week" definition (Monday or Sunday) if Upcoming is sub-grouped; the app's calendar setting may already define it.

## Not checked

- Whether Todoist sync or other writers rewrite notes often enough to make mtime useless in practice (inferred from the write-path existence only).
- The Svelte `layer-baseline.json` rules for a `features/tasks` to `features/event-calendar` import.
- Existing E2E coverage of the Tasks view.
