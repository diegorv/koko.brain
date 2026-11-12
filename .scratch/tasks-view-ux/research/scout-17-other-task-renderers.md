# Scout 17: other task renderers and queries

## Summary

Task data has one source of truth: the Rust `VaultIndex`, parsed once by `extract_tasks` into `Task` / `TaskMetadata` (status, priority, due/scheduled/start/created/done/cancelled dates, recurrence, id, dependsOn, tags). Four TS consumers read it: the Tasks view, the Event Calendar task lane, the Todoist sync scan, and QueryJS/mods (`page.file.tasks`). Only the Tasks view and the Calendar chip render tasks as UI, and they share no component or logic: each hand-rolls its own circle icon, its own "closed" rule and its own click-to-open behaviour. QueryJS exposes a lossy task shape (text, completed, line, path) with a read-only `kb.ui.taskList`. Kanban and the live-preview checkbox widget are separate, regex-based line parsers that are not task-index consumers. periodic-notes, one-on-one, calendar (plugin), templates and quick-capture contain no task code. There is a small, real opportunity: extract a shared task row/chip primitive plus a shared `isClosed(status)` and status-glyph helper, and let the Tasks view and the Calendar both use it. Anything richer in the redesign (priority, due date, tags) is already in the data but is rendered by nobody today.

## Facts (verified in code)

### Single data source

- Rust task type with all metadata fields: `src-tauri/src/vault/task.rs:19-33` (`Task`), `:37-47` (`TaskStatus`, 7 values), `:53-60` (`TaskPriority`), `:78-120` (`TaskMetadata`).
- Parsed once per note: `src-tauri/src/vault/parsing.rs:1635` (`parse_task_line`), `:1692` (`extract_tasks`), `:1721` (`extract_tasks_from_section`). `checked` is `check_char != ' '` (`:1648`, `:1668`), so `[/]`, `[?]`, `[>]`, `[!]` and `[-]` are all `checked: true`.
- IPCs: `get_all_tasks_v2` (`src-tauri/src/commands/vault.rs:652`, sorted by modifiedAt desc, files with no tasks dropped), `get_tasks_in_section_v2` (`:733-749`, re-reads every note with tasks from disk), `toggle_task_status` and `write_task_lines` (`src/lib/contracts/commands.ts:104-113`).
- Version bump contract: panels re-fetch on `vaultStore.vaultIndexVersion` (`docs/agents/indexing-watcher-rules.md` item 5).

### Consumer 1: Tasks view

- `src/lib/features/tasks/TasksView.svelte:25-29` (date pills), `:46-52` (filters), `:73-78` (index-version effect), `:90-223` (markup). Uses only `text`, `checked`, `indent`, `lineNumber`, `status` (for the toggle target). Never reads `task.metadata`.
- Re-maps every metadata field by hand in `tasks.service.ts:20-48` (`fromV2`), only to multiply `modifiedAt` by 1000. Types are duplicated in `tasks.types.ts:4-29` instead of reusing the generated `Task` / `FileTaskGroup`.
- Hierarchy filter `filterCompletedTasks` keys off `checked` (`tasks.logic.ts:17-52`), so an in-progress `[/]` or important `[!]` task counts as "completed" and is hidden by the default hide-completed toggle. Facts: `checked` semantics at `parsing.rs:1648`; filter at `tasks.logic.ts:40`. Row icon already works around this via `toggleTarget` (`TasksView.svelte:170-171`, `task-status.logic.ts:7-9`), so the circle and the hide filter disagree for these statuses.
- `computeTaskStats` also counts `checked` as completed (`tasks.logic.ts:100-105`).
- Text segments (wikilinks, safe markdown links) are rendered by `parseTaskTextSegments` (`tasks.logic.ts:116-161`) over `task.text`, which still contains the raw emoji signifiers (`metadata.description` is the clean text and is not used).
- Click behaviour: circle toggles (`:177-187`), text opens note at line via `openNoteAt` (`:64-69`, `:190-192`).
- Tab wiring: `commands.ts:197-202`, `global-keybindings.ts:116-121`, `EditorView.svelte:40,72-73`, `editor.types.ts:12`.

### Consumer 2: Event Calendar task lane

- `src/lib/features/event-calendar/event-calendar-tasks.logic.ts:49-66` (`tasksFromGroups`): flattens `get_all_tasks_v2`, keeps only tasks with a valid `dueDate`, uses `metadata.description || text`.
- Fetch: `event-calendar.service.ts:114-121` calls `get_all_tasks_v2` directly, with its own `taskLoadToken` latest-wins guard (`:54-55`, `:341`), separate from the Tasks view's `latestTaskIndexRequest` (`tasks.service.ts:55`). Triggered from `EventCalendarView.svelte:203-212` on index bump, gated by setting `eventCalendar.showTasks` (`settings.types.ts:377-378`, toggle in `EventCalendarSection.svelte:186-187`).
- Rendering: `EventTaskChip.svelte:16-42` (outlined button, `Circle` / `CircleCheckBig` icons from lucide, line-through when closed, click opens note at line) and `EventTaskLane.svelte` (day cells, `:22-24` layout), plus month cell slot split `monthCellSlots` (`event-calendar-tasks.logic.ts:92-96`).
- Read-only: no toggle on the chip (`EventTaskChip.svelte:21-24` comment, click only opens the note).
- Its closed rule is correct and explicit: `status === 'done' || status === 'cancelled'` (`EventTaskChip.svelte:16-18`). Comment there states the same Rust `checked` caveat as above.

### Consumer 3: Todoist sync scan

- `features/todoist-sync/vault-scan.service.ts:57` calls `get_all_tasks_v2` directly; `:29-36` `fieldsOf` copies description, dueDate, priority, tags; `:19-27` hand-maintains `STATUS_CHAR` (mirror of Rust `status_to_char`, `parsing.rs:1604`).
- It has its own TS task-line regexes that "mirror the Rust parser" (`task-line.logic.ts:1-9, 27-45`: `TASK_LINE_RES`, `SIGNIFIER_CHARS`, `DUE_RE`, `PRIORITY_RE`) and `task-line-edits.logic.ts` (`extractTaskLines`). Not a renderer, but a third copy of status/signifier knowledge.
- Writes go through `write_task_lines`, settled by the shared `settleTaskWrite` (`core/filesystem/task-write.service.ts:23-37`), the same settle step the Tasks view toggle uses (`tasks.service.ts:176-179`). This is the one piece of genuinely shared task code, and it is in `core/` precisely so features do not import each other (`task-write.service.ts:10-11`).

### Consumer 4: QueryJS and mods

- Contract: `KBTaskV1 { text, completed, line, path }` (`plugins/queryjs/contract/kb-api.v1.ts:39-49`), exposed as `page.file.tasks` (`:75-76`).
- Mapping: `queryjs.logic.ts:125-130` (`buildKBPage`) maps `NoteEntryV2.tasks` to KBTask and drops status, priority, all dates, tags, indent. `completed` is the Rust `checked` flag, so `[/]`, `[?]`, `[-]` read as completed to a script.
- Renderer: `kb-api.ts:348-367` `taskList(tasks: {text, completed}[])`: `<ul class="cm-lp-qjs-tasklist">` with disabled `<input type=checkbox>`; contract at `kb-api.v1.ts:697-698`. Plain text, no wikilinks, no toggle, no metadata.
- No `kb.tasks()` global query exists; a script must flatten `dv.pages().file.tasks` itself.
- Mods: `ModContext.kb()` returns a QueryJS `KBAPI` (`plugins/mods/mods-host.service.ts:76-79`), so mods read tasks only through the same lossy `KBTaskV1`, throttled (the doc says tasks can lag a recent write). `grep` found no task-specific mod API beyond that. Contract change is additive-minor, removal/rename is major (`indexing-watcher-rules.md` item 12; `kbapi-firewall.test.ts`).

### Other places that mention tasks but do not consume the index

- Kanban: own `TASK_RE = /^-\s+\[([xX ])\]\s+(.*)$/` (`plugins/kanban/kanban.logic.ts:14`), parsed at `:231-236` into `KanbanItem { text, checked }`. Only `[ ]` / `[x]` are tasks there; a `[/]` line is not a card. Cards live under `##` lanes of a `.kanban` note. Entirely independent of the index.
- Live preview checkbox: `TaskCheckboxWidget` (`core/markdown-editor/extensions/live-preview/widgets.ts:28-55`) writes `' '` or `'x'` directly via a CodeMirror dispatch, so `[/]`, `[-]` etc. toggle to `x` or blank here, while the Tasks view toggle uses `toggleTarget` (done/cancelled reopen to todo, others complete). Styles: `live-preview/styles.ts:231-251`, tokens `--lp-task-border`, `--lp-task-hover`, `--lp-task-checked`.
- periodic-notes, one-on-one, calendar plugin, templates, quick-capture: grep for "task" over `src/lib/plugins/{periodic-notes,one-on-one,calendar,templates,quick-capture}` found nothing. Collection (`CollectionView.svelte`) only matches `queueMicrotask`. `type-definitions.logic.ts:43` has a `Task` note type icon (a note type, unrelated to checklist items). `features/event-calendar/EventCalendarSection.svelte` is settings UI only.
- The `#to-list` default and section semantics: see scout-08. Nothing else in `src`/`docs` references `to-list` (grep).

### Test coverage of what exists

`src/tests/lib/features/tasks/` has TasksView, service, store, logic and toggle tests; `src/tests/lib/features/event-calendar/` has `EventTaskLane.test.ts` and `event-calendar-tasks.logic.test.ts`. No test for a shared task row, because none exists.

## Problems and opportunities

Duplication found (facts), ranked by how much it matters to the redesign:

1. **Two "is this task closed" rules.** Tasks view hide filter and stats use `checked` (counts `[/]`, `[?]`, `[>]`, `[!]` as done); the Calendar chip and the toggle icon use `status` (done/cancelled only). QueryJS `completed` copies `checked`. One shared predicate fixes the Tasks view filter bug and keeps the surfaces consistent.
2. **Two row renderers, no shared component.** Same icons (`Circle`, `CircleCheckBig`), same open-at-line click (`openNoteAt(path, {kind:'line', line})`), same line-through style, different markup (`TasksView.svelte:172-214` vs `EventTaskChip.svelte:25-42`).
3. **Metadata is parsed, shipped over IPC, and never shown.** Priority, due, scheduled, start, tags, recurrence are in every `Task`; the Calendar uses only `dueDate` and `description`, the Tasks view uses none. The Tasks view also renders `task.text` with raw emoji signifiers instead of `metadata.description`.
4. **Three independent fetchers of `get_all_tasks_v2`** (Tasks service, Calendar service, Todoist scan), each with its own latest-wins token. Not shared cache. Unlike QueryJS, which has a version-keyed memo (`getVaultEntries`), the task list is re-fetched per consumer per bump. A Tasks view and an open Calendar tab both refetch on the same bump.
5. **Type and mapping duplication.** `tasks.types.ts` re-declares what the generated `Task` / `FileTaskGroup` already provide; `fromV2` copies 13 metadata fields one by one for a seconds-to-ms conversion. The Calendar and Todoist consume the generated `FileTaskGroupV2` directly. Reuse is possible without touching Rust.
6. **Status knowledge copied in four places:** Rust `map_checkbox_char`, TS `STATUS_CHAR` (`vault-scan.service.ts:19-27`), `toggleTarget` (`task-status.logic.ts`), and the live-preview widget's `' '`/`'x'` rule. A shared status glyph map would also feed the redesign's per-status icons (in-progress, question, forwarded, important are all indistinguishable in the Tasks view today).
7. **Toggle semantics differ between surfaces.** Editor widget always writes `x` or blank; Tasks view writes done/todo through Rust with staleness check; Calendar and QueryJS cannot toggle at all.
8. **QueryJS surface is lossy and awkward.** `kb.ui.taskList` has no metadata, no wikilinks, no toggle. If the redesign introduces a rich task row, a script-facing rendering of it would be new contract surface (minor bump), not a reuse.

Opportunities that are cheap:

- Reuse is safe because every renderer lives in `features/` or `plugins/` and `core/` is the allowed shared layer (`CLAUDE.md` layer rules). A shared presentation primitive could live in `features/tasks/` (Calendar importing from `features/tasks` would be a feature-to-feature import, check `layer-baseline.json`) or in `core/`, as `task-write.service.ts` already does for the same reason. This is the main design decision.
- Calendar chip and Tasks row could share a `TaskStatusIcon` and `isTaskClosed(status)`, plus the open-at-line handler, without sharing layout.

## Recommendations for the redesign

Opinions, derived from the facts above.

1. Add one pure helper next to `toggleTarget`: `isClosed(status)` (done or cancelled) and use it in `filterCompletedTasks`, `computeTaskStats` and the Calendar chip. Fixes the "in-progress tasks vanish under hide-completed" mismatch as a vertical slice with its own test.
2. Add a shared `TaskStatusIcon` component (7 statuses, today only 2 look different) and use it in both `TasksView` and `EventTaskChip`. Keep it presentational (props: status, size), no store imports.
3. Render `metadata.description` instead of raw `text`, and surface due date, priority and tags as chips on the row. Data is already on the client; no Rust or IPC change needed. This is also the place the Calendar already goes (`description || text`), so reuse that choice.
4. Drop the hand-rolled `TaskItem` / `FileTaskGroup` copy only if cheap; otherwise leave it. It is not user-visible, and the Pre-Change Checklist cost (store, service, tests) is high for a pure cleanup. Suggest a separate cleanup ticket, not part of the UX slices.
5. Do not unify the three `get_all_tasks_v2` fetchers in the UX slices. Keep each consumer's token guard. If Calendar and Tasks open together cause measurable duplicate IPC, that is a later perf ticket (a version-keyed memo like `getVaultEntries`).
6. Leave kanban and the live-preview widget alone: different file format (kanban) and a different write path (editor transaction). Mention the toggle-semantics gap to the owner only.
7. Treat any `kb.tasks`/richer `KBTaskV1` as out of scope for the UX redesign; it is a contract change (additive minor) with firewall tests. If wanted, make it its own ticket after the view settles, so the KBTask shape can mirror the chosen row fields.
8. Calendar toggle: if the redesign adds an inline toggle, route it through `toggleTask` in `tasks.service.ts`; do not create a second toggle path. The Calendar would then import from `features/tasks`, check `layer-baseline.json` first (ADR-0003); if that is a new violation, move `toggleTask` or a thin wrapper into `core/` next to `task-write.service.ts`.

## Open questions for the owner

1. Should in-progress, important, question and forwarded tasks count as "open" (visible under hide-completed, counted as pending)? Today the filter says no, the circle icon says yes.
2. Should the Tasks view toggle also set the done date (and handle recurrence), or stay a pure checkbox flip as today?
3. Do you want the Calendar task chips to be clickable-to-toggle, or stay read-only?
4. Is a richer script-facing task API (`kb.tasks()`, status/due/priority in `KBTaskV1`) wanted, or is `page.file.tasks` enough for your mods and QueryJS blocks?
5. Where should a shared task row primitive live: `features/tasks` (Calendar imports it) or `core/`? Depends on how strict you want to be with the layer baseline.
6. Do you use the status characters `[/]`, `[?]`, `[>]`, `[!]` day to day? If not, a single open/closed icon is enough and slice 2 above shrinks.
