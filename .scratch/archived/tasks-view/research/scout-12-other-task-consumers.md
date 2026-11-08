# Scout 12: other consumers of tasks and checkboxes

Scope: read-only grep and read of `src/lib` and `src-tauri/src`. Paths are relative to the repo root. Anything not opened in this pass is marked "unverified".

## Facts

**Task index consumers (the Rust index is shared by two surfaces)**

- Tasks view and calendar both read the same Rust task index. The Tasks view calls `get_all_tasks_v2` or `get_tasks_in_section_v2` (`src/lib/features/tasks/tasks.service.ts:68-71`). The calendar calls `get_all_tasks_v2` directly (`src/lib/features/event-calendar/event-calendar.service.ts:114-121`) and says so in its doc comment: "without its section-tag filter" (`event-calendar.service.ts:106-108`).
- Consequence: the calendar ignores the Tasks view section tag. The Tasks view date filter applies to file `modifiedAt` (`src/lib/features/tasks/tasks.logic.ts` `filterByDate`, around line 76), so the calendar also ignores it. Two surfaces, two scoping rules, no shared filter model.
- Rust task model: `TaskMetadata` has `due_date` (📅), `scheduled_date` (⏳), `recurrence` (🔁), priority (`src-tauri/src/vault/task.rs:82-113`). Signifier table: `src-tauri/src/vault/parsing.rs:1449-1482`. The Tasks view shows only some of these (`TodoistPopover.svelte:123-132` shows due date and recurrence in the popover).
- Status enum from the checkbox char: `src-tauri/src/vault/parsing.rs:1586-1598`. Seven states: `' '` Todo, `x/X` Done, `-` Cancelled, `/` InProgress, `?` Question, `>` Forwarded, `!` Important; anything else maps to Todo. `src-tauri/src/vault/task.rs:42-50` is the TaskStatus enum.
- Tauri commands registered: `src-tauri/src/lib.rs:346-348` (`get_all_tasks_v2`, `get_tasks_in_section_v2`, `toggle_task_status`). Implementations: `src-tauri/src/commands/vault.rs:647`, `:737`, `:804`.

**Calendar (event-calendar plugin, a feature under src/lib/features)**

- Dated tasks: only tasks with `metadata.dueDate` appear. `src/lib/features/event-calendar/event-calendar-tasks.logic.ts:49-65`. Description is `metadata.description || task.text`.
- Undated and invalid-date tasks are dropped (`event-calendar-tasks.logic.ts:2-4` header comment).
- Display: `EventTaskLane.svelte` (time grid, lane under the all-day row), `EventMonthGrid.svelte:26-27, 85-138` (month cells; events take slots first via `monthCellSlots`, `event-calendar-tasks.logic.ts:92-95`), `EventTaskChip.svelte`.
- `EventTaskChip.svelte:18`: `closed = status === 'done' || status === 'cancelled'`. Strikethrough when closed. Click opens the note at the line (`EventTaskChip.svelte:34`, `openNoteAt(..., {kind:'line'})`). Calendar cannot toggle a task.
- Toggle setting: `settingsStore.eventCalendar.showTasks`, UI at `src/lib/features/event-calendar/EventCalendarSection.svelte:183-188` ("Show dated tasks ... due date (📅)"). Gate at `EventTimeGrid.svelte:77, 255` and `EventMonthGrid.svelte:26`.
- Load trigger: `EventCalendarView.svelte:200-215`. Effect re-runs on every `vaultIndexVersion` bump and when `showTasks` turns on; it calls `loadCalendarTasks()`. Every index bump while the calendar is mounted with tasks on triggers a full `get_all_tasks_v2` IPC (the whole index, not a delta). From code reading only; cost not measured.
- Store: `src/lib/features/event-calendar/event-calendar.store.svelte.ts:35, 108, 232, 244`.

**Kanban plugin (`.kanban` files, `src/lib/plugins/kanban`)**

- Card parse: `TASK_RE = /^-\s+\[([xX ])\]\s+(.*)$/` (`src/lib/plugins/kanban/kanban.logic.ts:14`). Used at `kanban.logic.ts:231-240` (`checked = x`). Only two states. `- [/]`, `- [-]`, `- [?]` and similar lines are not cards. They fall through to `sink.push(line)` as raw lines attached to the preceding card's `extraLines` or the lane head (`kanban.logic.ts:242-243`, header comment at `:161-175`).
- Serialization writes `- [ ]` or `- [x]` only (`kanban.logic.ts:265-272`, `pushItems`), so a non-kanban status line is preserved as raw text but is never a card.
- Toggle: `toggleItem` flips `checked` on the card (`kanban.logic.ts:401-413`). Whole-file write through the kanban board serializer, not the per-line `toggle_task_status` Rust command.
- Dates on cards use a different syntax: `{YYYY-MM-DD}` in the card text (`kanban.logic.ts:668-688`: `extractCardDate`, `setCardDate`, `removeCardDate`). The 📅 signifier is not used. `KanbanDatePicker.svelte` writes through this path.
- Index exclusion: the Rust index collects only `.md`, `.markdown`, `.view` (`src-tauri/src/utils/fs.rs:140-143`). `.kanban` is not in that list. A grep for `.kanban` in `src-tauri/src` finds only watcher and temp-file handling (`src-tauri/src/vault/watcher.rs:455`, `src-tauri/src/commands/vault.rs:316`), not indexing. So kanban cards are not in the task index and never appear in the Tasks view or calendar. (Verified by absence of `.kanban` in `is_markdown_filename`; the watcher handling was not traced further.)
- Kanban has its own table view (`KanbanTableView.svelte:45-75`, Done/Open column) and list view, both reading `item.checked`.

**.view files (tables and collections)**

- `.view` is in the markdown list (`utils/fs.rs:140-143`) so it enters the VaultIndex. `NoteEntry::from_content_full` takes an early return for `.view` (`src-tauri/src/vault/entry.rs:241-243`) and builds the entry from view frontmatter without calling `extract_tasks` (`entry.rs:249` is on the non-view path only). So task checkboxes inside `.view` bodies are not indexed. From code reading; `from_view_frontmatter` body (`entry.rs:294-330`) has no `tasks` assignment, which is consistent.

**Dock badge**

- `src/lib/features/dock-badge/dock-badge.logic.ts:14-16` returns `getInboxCount(entries)`, which counts lifecycle inbox notes (not organized, not archived), `src/lib/features/type-definitions/inbox-workflow.logic.ts:10-23`. No task count is shown. `dock-badge.service.ts:14-19` only sets the badge.

**Other surfaces: no task consumer found**

- Quick Capture (`src/lib/plugins/quick-capture/*.ts`): grep for task, todo, `[ ]` returned nothing. It writes notes; it does not create task lines.
- Periodic notes (`src/lib/plugins/periodic-notes/*.ts`): no task, todo, or rollover references. No carry-over of unchecked tasks from yesterday, from memory of grep only.
- One-on-one (`src/lib/plugins/one-on-one/*.ts`): no task references.
- Templates (`src/lib/plugins/templates`): no task references.
- Status bar (`src/lib/core/status-bar/*.svelte`): no task references.
- Deep links (`src/lib/features/deep-link/deep-link.types.ts`): action types are `open`, `new`, `search`, `daily`, `capture` (lines 13, 22, 43, 50, 81). No task action. `daily` (`:50-60`) and `capture` take `content` that can be appended or prepended to a note. Whether a caller can inject `- [ ]` lines that then get indexed is unverified; the path is generic text insertion.
- Markdown editor widget: `src/lib/core/markdown-editor/extensions/live-preview/inline/handlers/simple-widget-handlers.ts:53, 90` skips incomplete `- [ ]` markers in live preview. Display only.
- Todoist bridge (`src/lib/features/tasks/todoist-bridge.logic.ts:37-55`): maps `dueDate` and recurrence to Todoist fields. Owned by the Tasks scout, noted here only as a consumer of `metadata`.
- Settings: `TodoistSection.svelte` reads `settingsStore.todoist.apiToken` and `defaultLabel` (lines 26, 48). Owned by the Todoist scout.

**Stores and IPC touched by the task surfaces**

- `tasksStore` is imported only by the tasks feature (`tasks.service.ts:6`, `TasksView.svelte`). `resetTasks` runs at teardown (`src/lib/app/lifecycle/app-lifecycle.service.ts:57, 649`). `todoistStore.reset()` runs there too (`:69, 649`).
- `toggleTasksTab` is wired to commands and global keybindings (`src/lib/app/commands.ts:32`, `src/lib/app/global-keybindings.ts:13`). `TasksView` is mounted from `src/lib/app/EditorView.svelte:16`. Tasks is a singleton virtual tab (`src/lib/core/editor/editor.logic.ts:5`, `TASKS_VIRTUAL_PATH`).

## Problems and gaps

1. **Two date conventions for one concept.** The calendar reads 📅. Kanban cards use `{YYYY-MM-DD}` (`kanban.logic.ts:668`). A kanban card with a date is invisible to the calendar and the Tasks view. A user who sets a date on a kanban card expects it on the calendar. From code reading, not tested in the app.
2. **Two status vocabularies.** Kanban knows `[ ]` and `[x]` (`kanban.logic.ts:14`). The Rust index knows seven states (`parsing.rs:1586-1598`). A `[/]` in-progress or `[-]` cancelled line in a kanban file is not a card and cannot be moved as one. The calendar treats `cancelled` as closed (`EventTaskChip.svelte:18`), and the Tasks view has its own filter (`hideCompleted`, `tasks.logic.ts:34-57`). Whether `hideCompleted` treats `cancelled` as completed was not verified.
3. **Scope rules disagree.** The Tasks view supports a section tag (`tasks.service.ts:68-71`, `:88-95`). The calendar ignores it (`event-calendar.service.ts:106-108`). The Tasks view date filter uses file `modifiedAt`, not due date. Nothing in the task data model holds a rule the user could reuse across surfaces.
4. **Calendar cannot act on tasks.** Click opens the note at the line (`EventTaskChip.svelte:34`). No toggle, no reschedule, no drag. The Tasks view toggles through `toggle_task_status` (`tasks.service.ts:100-155`). The calendar does not reuse that path.
5. **Full reload on every index bump.** `EventCalendarView.svelte:205-215` calls `get_all_tasks_v2` for all tasks on every `vaultIndexVersion` bump while tasks overlay is on. The Tasks view does the same plus an extra section-tag scan when a tag is set (`tasks.service.ts:88-92` says the section-tag path re-reads every note with tasks). Cost not measured.
6. **Indexing gap for `.view` and `.kanban`.** Task checkboxes inside `.view` bodies and any `.kanban` file are invisible to the task index (`entry.rs:241-249`, `utils/fs.rs:140-143`). The owner uses tables (`.view`) and kanban heavily (per brief). If a user writes `- [ ] item 📅 2026-12-01` in a table body, it does not reach the calendar. Verify in the app before relying on this.
7. **Deep-link append and capture can write task-like text.** Not verified whether this produces indexed tasks; the path is generic.
8. **Priority, scheduled date, and recurrence are parsed but only partly shown.** Calendar uses only `dueDate` (`event-calendar-tasks.logic.ts:53`). Scheduled date (⏳) and priority are not used by any consumer found in this slice.

## Ideas worth keeping

- One shared "task query" (filter + sort + group) used by the Tasks view and the calendar, so a rule written once applies to both. Calendar already has `tasksByDay` and `tasksFromGroups` (`event-calendar-tasks.logic.ts:49, 74`) as pure functions, a good seam.
- Let the calendar reuse the Tasks view section-tag scope, or make scope an explicit calendar setting. Currently the calendar and Tasks view answer the question "which tasks" differently.
- Decide one date signifier. Options: adopt 📅 for kanban (write `📅 YYYY-MM-DD` instead of `{date}`), or teach the index to read `{date}`. Either way the calendar and Tasks view both see it.
- Make kanban cards and `.view` table rows optional task sources behind a query setting, not hardcoded.
- Calendar toggle via the existing `toggle_task_status` command, since the Tasks view already has the path (`tasks.service.ts:100-155`).
- Dock badge is inbox-based. A "tasks due today" badge could reuse the calendar's `tasksByDay` logic if the owner wants one. Optional.

## Open questions

1. Does the owner expect kanban card dates to appear on the calendar? Current behavior: they do not (from code). Needs a decision before the PRD picks a signifier.
2. Should the task index include `.kanban` and `.view` bodies? Cost: the index scans more content; benefit: one task model across surfaces. Owner decision.
3. Should `cancelled` and `in-progress` be first-class filters in the Tasks view? Today the Tasks view appears to have only `hideCompleted` (from `TasksView.svelte:123-127`). Verify in the Tasks scout.
4. Is there a daily-note rollover feature the owner wants? None found in `periodic-notes`. Confirm with the owner whether this is missing or intentionally absent.
5. Should the calendar show scheduled (⏳) or recurring (🔁) tasks? Parsed in Rust, unused in the calendar.
6. Unverified: performance of `get_all_tasks_v2` on a large vault when the calendar is open. Needs a measured run, not a claim.
