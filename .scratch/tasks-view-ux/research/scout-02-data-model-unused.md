# Scout 02: task data model and what the Tasks view leaves unused

Scope: frontend and Rust data model behind `src/lib/features/tasks/TasksView.svelte`. Read-only research. Facts are verified in code and carry path:line; opinions are marked as such.

## Summary

The Rust index already parses a rich Obsidian-Tasks-style model for every task: 7 statuses, 6 dates (due, scheduled, start, created, done, cancelled), 5 priority levels, a recurrence rule, an id, dependencies, an on-completion action and tags. The view reads none of it. `TasksView.svelte` never touches `task.metadata`; it renders the raw `task.text` (so signifier emojis show as literal characters) and uses only `task.checked`, `task.status` (for the toggle target only), `task.indent` and `task.lineNumber`. The one "date" the view filters on is the file's `modifiedAt`, not any task date. The biggest functional bug-shaped finding: four of the seven statuses (`in-progress`, `question`, `forwarded`, `important`) are all `checked: true`, so the view renders them struck through and "Hide completed" hides them.

## Facts

### F1. The full data model (what exists)

Task (generated from Rust, `src/lib/contracts/generated/Task.ts:11-35`; Rust source `src-tauri/src/vault/task.rs:22-35`):

| Field | Meaning | Source |
|---|---|---|
| `text` | Raw text after `- [x] ` (signifier emojis and tags still in it) | `task.rs:24` |
| `checked` | `status != todo`, computed as `check_char != ' '` | `parsing.rs:1649`, `parsing.rs:1666` |
| `indent` | tabs + spaces/2 | `parsing.rs:1620-1631` |
| `lineNumber` | 1-based | `task.rs:30` |
| `status` | from checkbox char | `parsing.rs:1591-1602` |
| `metadata` | see below | `task.rs:34` |

TaskMetadata (`src/lib/contracts/generated/TaskMetadata.ts:10-62`; `task.rs:82-131`):

| Field | Signifier | Type |
|---|---|---|
| `description` | (text with signifiers AND tags stripped) | string, always present |
| `dueDate` | 📅 | `YYYY-MM-DD` string |
| `scheduledDate` | ⏳ | `YYYY-MM-DD` string |
| `startDate` | 🛫 | `YYYY-MM-DD` string |
| `createdDate` | ➕ | `YYYY-MM-DD` string |
| `doneDate` | ✅ | `YYYY-MM-DD` string |
| `cancelledDate` | ❌ | `YYYY-MM-DD` string |
| `priority` | 🔺 ⏫ 🔼 🔽 ⏬ | `highest/high/medium/low/lowest` (+ `none` in the type, see F6) |
| `recurrence` | 🔁 | `{ text }` verbatim, e.g. "every week" (`RecurrenceRule.ts:7`) |
| `id` | 🆔 | string |
| `dependsOn` | ⛔ | string[] (comma-separated ids) |
| `onCompletion` | 🏁 | string token |
| `tags` | `#word` in text | string[], always present, ASCII only, hyphens allowed (`parsing.rs:1579-1580`) |

Signifier tables: `parsing.rs:1449-1456` (dates), `1475-1481` (priority), `1483-1486` (recurrence, id, depends, on-completion). Extraction order and "first match wins" priority: `parsing.rs:1776-1878`. Each date is matched once per task (first occurrence).

TaskStatus (`TaskStatus.ts:7`; char mapping `parsing.rs:1591-1602`):

| Char | Status |
|---|---|
| space | `todo` |
| `x` / `X` | `done` |
| `-` | `cancelled` |
| `/` | `in-progress` |
| `?` | `question` |
| `>` | `forwarded` |
| `!` | `important` |

Only these chars make a line a task at all (`TASK_RE` class `[xX \-/?!>]`, `parsing.rs:1427`, `1434`). Ordered lists (`1. [ ]`) are tasks too (`parsing.rs:1433-1435`). Tasks inside fenced code blocks are skipped (`parsing.rs:1692-1715`).

Group level (`FileTaskGroup.ts:8-27`): `filePath`, `fileName` (extension stripped), `modifiedAt` (seconds from Rust, converted to ms in `tasks.service.ts:24`), `tasks` in document order. Groups arrive sorted by `modifiedAt` descending (`vault/index.rs:1067-1084`, `commands/vault.rs:728`).

Not on the model at all: the section heading a task sits under, any parent id (hierarchy is only `indent` plus document order), the note's frontmatter or type, the file path relative to the vault.

### F2. Frontend shapes

- `TaskItem` (`tasks.types.ts:4-17`) duplicates the generated `Task` shape field for field. `fromV2` copies every field one by one, including all 13 metadata fields (`tasks.service.ts:20-48`), so nothing is lost on the way in.
- Store (`tasks.store.svelte.ts:3-12`): `fileTaskGroups`, `dateFilter`, `sectionTag` (default `#to-list`), `hideCompleted` (default true), `isLoading`. No sort mode, grouping mode, status filter, tag filter, priority filter or search text.
- Fetch (`tasks.service.ts:65-86`): non-empty section tag calls `get_tasks_in_section_v2`, which re-reads from disk every note that has tasks (`commands/vault.rs:690-730`, `732-758`); empty tag calls `get_all_tasks_v2` from the in-memory index. Section matching is "heading text contains the tag string" and the section runs until a heading of equal or higher level (`parsing.rs:1721-1768`).
- Write surface: `toggleTask` (`tasks.service.ts:130-167`) and `toggleTarget` (`task-status.logic.ts:7-9`: done/cancelled reopen to `todo`, everything else becomes `done`). The Rust toggle only rewrites the checkbox char (`commands/vault.rs:770-810`, `parsing.rs:1887-1915`). Another write command exists, `write_task_lines` (insert/replace/remove lines, `contracts/commands.ts:113`, `src-tauri/src/vault/task_lines.rs:36`), but its only frontend consumer is Todoist sync (`todoist-sync/sync-now.service.ts:1028-1115`), not the Tasks view.

### F3. What `TasksView.svelte` actually reads

| Data | Used? | Evidence |
|---|---|---|
| `task.text` | Yes, raw, as the display string (wikilinks and https links parsed into segments) | `TasksView.svelte:194`, `tasks.logic.ts:130-161` |
| `task.checked` | Yes: strike-through and muted color | `TasksView.svelte:191` |
| `task.status` | Only through `toggleTarget` to pick the icon and aria-label | `TasksView.svelte:171` |
| `task.indent` | Yes: left padding | `TasksView.svelte:175` |
| `task.lineNumber` | Yes: key and open-at-line | `TasksView.svelte:169`, `192` |
| `task.metadata.*` (all 13 fields) | Never read in the view or in `tasks.logic.ts` | grep of `metadata` in `TasksView.svelte` returns no hit; `tasks.logic.ts` has no reference |
| `group.fileName`, `group.modifiedAt`, `group.tasks.length` | Yes, header | `TasksView.svelte:157-164` |
| `group.filePath` | Yes, open file / toggle | `TasksView.svelte:155` |

Filters and stats: date pills filter on file `modifiedAt` only (`tasks.logic.ts:76-88`); `filterCompleted` removes `checked` tasks that have no unchecked descendants (`tasks.logic.ts:17-70`); `computeTaskStats` counts `checked` as completed (`tasks.logic.ts:91-113`) but the view shows only total and file count (`TasksView.svelte:144-146`). `computeTaskStats` returns `completed` and `pending` which the view never displays.

### F4. Who else consumes the metadata (so the parsing is already trusted elsewhere)

- Calendar: places tasks on `metadata.dueDate`, validated with `isValidDayKey`, shows `metadata.description || text`, uses `status` (`event-calendar/event-calendar-tasks.logic.ts:49-66`, validator at `event-calendar-dates.logic.ts:77-79`).
- Todoist sync: reads `description`, `dueDate`, `priority`, `tags`, `recurrence.text` (`todoist-sync/vault-scan.service.ts:29-36`, `80`, `97`) and maps priority to Todoist's 4 levels (`todoist-sync/priority.logic.ts:13-26`). Todoist anchors are `🆔 td-...` stored in the id signifier (`todoist-sync/anchor.logic.ts:1-8`).
- No other consumer reads `scheduledDate`, `startDate`, `createdDate`, `doneDate`, `cancelledDate`, `dependsOn` or `onCompletion` outside the parser, the generated type and the field-by-field copy in `tasks.service.ts`.

## Problems and opportunities

Facts first, then labeled opinions.

### P1. Four statuses are shown as "completed" (fact, likely bug)

`checked` is `status != todo` (`parsing.rs:1649`). The view strikes through and mutes every checked task (`TasksView.svelte:191`), and `filterCompletedTasks` keeps only `!task.checked` (`tasks.logic.ts:40`), with `hideCompleted` defaulting to true (`tasks.store.svelte.ts:10`). Result: a `[/]` in-progress task, a `[!]` important task, a `[?]` question and a `[>]` forwarded task are all hidden by default, and when shown they look done. The row icon was patched to follow the click target rather than `checked` (comment at `TasksView.svelte:170`, tested at `TasksView.test.ts:138`), but the text styling and the filter were not. The Calendar already treats only `done` and `cancelled` as closing (`event-calendar-tasks.logic.ts:21`), which is the correct rule. `computeTaskStats.completed` has the same over-count (`tasks.logic.ts:103`). Cancelled (`[-]`) counts as completed, which is arguably right for hide-completed but wrong for a "done" stat.

### P2. Raw signifier text is shown (fact)

The row displays `task.text`, not `metadata.description` (`TasksView.svelte:194`). A task `- [ ] Pay rent 📅 2026-11-10 ⏫ #home 🔁 every month` renders those emojis, ISO date and hash tag inline as plain text. Todoist-synced tasks also show `🆔 td-xxxx` in the row (anchor lives in `text`; I found no code in `tasks/`, `core/`, `note-list/` or `plugins/` that hides it). Opinion: this is a large part of the "ugly" impression and the cheapest fix is to render `description` and move the signifiers into chips.

### P3. Due, scheduled and start dates are the core "useful" gap (fact + opinion)

Fact: no overdue, due-today, due-this-week, scheduled, or start-date-not-reached logic exists anywhere in `features/tasks/`. The only date filter is file `modifiedAt` (`tasks.logic.ts:76-88`), which says when the note was last edited, not when work is due. The date strings are plain `YYYY-MM-DD` with no timezone, so grouping by day is a string comparison; the Calendar already has a validated key helper to reuse (`event-calendar-dates.logic.ts:77`). Note the Rust regex only checks the digit shape (`parsing.rs:1497`), so a value like `2026-13-45` reaches the frontend and needs `isValidDayKey` before use.
Opinion: replace or demote the "All time / Last 7 / Last 30 days" pills with date-driven buckets (Overdue, Today, Upcoming, No date) and a due-date sort. Hide tasks whose `startDate` is in the future (the Obsidian Tasks convention these emojis come from) behind an opt-in.

### P4. Priority is parsed and ignored (fact + opinion)

Five levels are extracted (`parsing.rs:1475-1481`) and synced to Todoist, but the view has no priority indicator, no priority sort and no priority filter. `none` exists in the type but the parser never emits it (`PRIORITY_EMOJIS` has no none entry), so `undefined` is the only "no priority" value. If both 🔺 and ⏬ appear, the highest wins by list order, not text order (`parsing.rs:1470-1474`). Opinion: a colored flag or left border per level plus sort-by-priority within a bucket.

### P5. Tags are parsed and not usable (fact + opinion)

`metadata.tags` is always present (`TaskMetadata.ts:62`) but the view neither shows chips nor filters by them. The only scoping control is the free-text "section tag" input, which is a different concept: it matches heading text containing `#to-list` (`parsing.rs:1755`), costs a disk re-read of every note with tasks on each fetch (`tasks.service.ts:88-99`, `commands/vault.rs:732-735`), and is the default behavior of the view (`tasks.store.svelte.ts:8`). A task-level tag filter would be in-memory over already-loaded data. Opinion: keep the section tag as a "source" setting, add tag chips and a tag filter as the primary filter. Open question Q1 on whether the owner relies on `#to-list` sections.

### P6. Statuses beyond todo/done have no visual language (fact + opinion)

The view has two icons (Circle, CircleCheckBig), selected by `toggleTarget` (`TasksView.svelte:182-186`). In-progress, question, forwarded, important and cancelled are not distinguishable from each other. The click semantics already exist and are tested (`task-status.logic.test.ts`, `TasksView.test.ts:138-158`). Opinion: one icon or color per status (half-filled for in-progress, ban/strike for cancelled, alert for important, arrow for forwarded, help for question), plus a status filter chip set. Note the toggle can only reach `todo` and `done`; there is no UI path to set the other statuses from the view although `set_task_status_in_content` supports all seven (`parsing.rs:1887`, `status_checkbox_char` at `1606-1616`) and the IPC takes any `target` (`tasks.service.ts:147-153`, `commands/vault.rs:770-777`). A status menu is a backend-free slice.

### P7. Recurrence and done date have no completion behavior (fact)

Completing a task only swaps the checkbox char (`parsing.rs:1887-1915`). It does not stamp `✅ <today>` and does not create the next occurrence of a `🔁` task. So a recurring task shown in the view will never reappear after being completed from there, and `doneDate` is only populated if the user typed it. Opinion: showing a recurrence badge is cheap (`recurrence.text` is a verbatim string; no structured parser exists, so "every week" can only be displayed, not computed). Adding done-date stamping or regeneration would change a core write path (`toggle_task_status` / `write_task_lines`) and needs an owner decision; see Q3.

### P8. Created, done, cancelled dates are only useful in a completed view (opinion)

`doneDate` can drive a "Completed" section sorted by completion date and a "done today / this week" stat; `createdDate` can show age. Both depend on users writing the signifiers; nothing in the app writes them (except possibly Todoist sync, not verified for done dates). Low priority until a writer exists.

### P9. Dependencies and ids have no UI (fact)

`id`, `dependsOn` and `onCompletion` are parsed and unused in the Tasks view. Resolving `dependsOn` to a blocked state needs a vault-wide id lookup (ids are only unique by convention; Todoist anchors share the `🆔` slot, `anchor.logic.ts:1-8`). Opinion: skip for the first slices; at most a "blocked" lock icon when any referenced id belongs to a task that is not done or cancelled.

### P10. Grouping and ordering are fixed to file (fact)

Order is `modifiedAt` descending by file, then document order (`commands/vault.rs:728`, `vault/index.rs:1082`); the view does no client sorting. Within a file, hierarchy is preserved by `indent` and `filterCompletedTasks` (`tasks.logic.ts:28-52`). Any regroup by date/priority/tag must decide what to do with child tasks, because the model has no parent link (only consecutive greater-indent rows). Opinion: when regrouping across files, keep subtasks attached to their parent in a single row group, or flatten and show indent only inside file grouping.

### P11. Smaller items (fact)

- `group.modifiedAt` is shown as "(Nov 5, 2026)" in the header (`TasksView.svelte:80-87`, `159-161`) while the tasks' own dates are ignored.
- Row key is `task.lineNumber` (`TasksView.svelte:169`), fine within one file.
- `TaskItem`/`Task` and the 13-field copy in `fromV2` are redundant with the generated type (`tasks.service.ts:20-48`). Opinion: leave alone unless a slice touches it; the surgical-change rule says not to refactor adjacent code.
- Nothing in the view exposes `description` vs raw `text` for search; a search box would match on `description` plus tags plus file name (opinion).

## Recommendations for the redesign (opinions, ordered as candidate vertical slices)

1. Row rendering from metadata: show `metadata.description` (still through `parseTaskTextSegments` for wikilinks and links, which currently runs on raw text, `tasks.logic.ts:130`), with chips for due date, priority, tags, recurrence. Removes literal emojis and `🆔 td-` anchors from rows. Pure frontend; the data is already in the store.
2. Status model fix: define "open" as not `done` and not `cancelled`, use it for strike-through, `hideCompleted` and stats; add a distinct icon and color per status. This also fixes P1. Needs tests on `filterCompletedTasks` and `computeTaskStats`, which currently assert `checked` behavior (`tasks.logic.test.ts`).
3. Date buckets: Overdue / Today / Next 7 days / Later / No date, based on `dueDate` (fall back to `scheduledDate` as an opinion call, see Q2), with `isValidDayKey` and a relative label ("in 3 days", "2 days overdue"). A new `.logic.ts` with an injectable `now` like `filterByDate` does today (`tasks.logic.ts:76-80`).
4. Priority: indicator plus sort within a bucket plus priority filter.
5. Tag chips and a tag filter (in-memory), keeping the section-tag input as a secondary "source" control.
6. Status menu: right-click or long-press on the status icon to set any of the seven statuses via the existing `toggle_task_status` `target` argument. Needs a small `setTaskStatus` service function; `toggleTask` hard-codes `toggleTarget` (`tasks.service.ts:152`).
7. Summary header: open / overdue / due today counts from the real model, replacing the "N tasks in M files" line (`TasksView.svelte:144-146`), plus an optional "completed" section ordered by `doneDate`.
8. Later, needs owner decisions: stamp `✅` and handle recurrence on completion; blocked state from `dependsOn`; quick-add via `write_task_lines`.

Group by file stays available as a view mode (it is the only structure the data natively has) rather than being deleted.

## Open questions for the owner

- Q1. Do you actually keep tasks under `#to-list` headings and rely on the section tag default? If most tasks are not in such sections, the default scoping hides them and the "no tasks" impression comes from there, not from the UI. If you do use it, should it stay the default or become a saved filter?
- Q2. Which date should define "when it is due" in the list: only `📅` due (what the Calendar uses), or `📅` falling back to `⏳` scheduled? And should tasks with a future `🛫` start date be hidden by default?
- Q3. Should completing a task from this view stamp `✅ YYYY-MM-DD` and, for `🔁` tasks, create the next occurrence? That changes a core write path (`toggle_task_status`), so I list it as an owner decision rather than a slice.
- Q4. Which signifiers do you really write in your notes (due, priority, recurrence, tags, ids, dependencies)? If `⛔`/`🏁`/`➕` are never used, the redesign should skip them.
- Q5. Are `[/]`, `[!]`, `[?]`, `[>]` used in your vault, and should they count as open (my assumption) in "Hide completed"?
- Q6. Is a per-view saved state (filter, sort, grouping) wanted, or should it reset on reload as it does now (`tasks.store.svelte.ts:27-33`)?

## Not checked

I did not run the app or any test, so rendering claims (raw emojis, strike-through of `[/]`) are from reading `TasksView.svelte` and the Rust parser, not observed. I did not check whether the Todoist sync writes `✅` done dates, or the existing test assertions in `tasks.logic.test.ts` beyond file names and the `TasksView.test.ts` case list.
