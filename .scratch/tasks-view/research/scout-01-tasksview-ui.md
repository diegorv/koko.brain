# Scout 01: TasksView UI inventory

Scope: `src/lib/features/tasks/TasksView.svelte` and what it touches. Read-only pass. Everything below is from reading code, not from running the app. Line numbers are as read at scout time. Claims marked "unverified" were not checked.

## Facts

### Mounting and how the user opens it

- Mounted only from `EditorView.svelte:71-72`: `{#if isTasksTab} <TasksView onOpenWikilink={openWikilinkTarget} />`. `isTasksTab` is `activeTab.fileType === 'tasks'` (`EditorView.svelte:39`).
- It is a virtual editor tab, not a rail panel or modal. Tab path is `__virtual__/tasks` (`src/lib/core/editor/editor.logic.ts:6`), name "Tasks", `fileType: 'tasks'` (`tasks.service.ts:163-176`).
- Openers:
  - Command palette "Toggle Tasks View", category Navigation (`src/lib/app/commands.ts:191-198`), calls `toggleTasksTab()`.
  - Shortcut Mod+Shift+T (`src/lib/app/global-keybindings.ts:116-123`). Confirmed by `e2e/specs/tasks-view.spec.ts:6-7`.
  - No other entry point found (no rail button, no menu item, no link). Grep for `openTasksTab`, `toggleTasksTab`, `TASKS_VIRTUAL_PATH` returned only the sites above plus `layout.logic.ts:6,17`.
- `toggleTasksTab` (`tasks.service.ts:187-196`): closes the tab if it is active, focuses it if open but inactive, opens it otherwise.
- Tab icon: `ListChecks` (`src/lib/core/markdown-editor/EditorTabs.svelte:69-70`).
- Right sidebar is hidden on this tab (`src/lib/core/layout/layout.logic.ts:10-14`).
- The bottom-right view-mode toggle is not rendered for virtual tabs (`EditorView.svelte:94` `{#if !isVirtual}`). Inferred: `isVirtualTab` covers this path. Not checked in `editor.logic.ts`.
- Closing: `resetTasks()` (`tasks.service.ts:203-207`) closes the tab on vault reset (`app-lifecycle.service.ts:640`).

### Toolbar controls (`TasksView.svelte:103-164`)

1. Date chips: "All time" / "Last 7 days" / "Last 30 days" (`:31-35`, `:107-117`). Active chip gets `bg-primary/20 text-primary`. No `aria-pressed`. Writes `tasksStore.setDateFilter`.
2. Hide-completed toggle (`:120-135`): icon-only button. Shows `EyeOff` when hiding and `Eye` when showing. Only a `title` gives a text name ("Show completed tasks" / "Hide completed tasks"). No aria-label, no aria-pressed.
3. Todoist sync button (`:137-152`). Rendered only if `settingsStore.todoist.apiToken` is non-empty (`:70`). Shows a spinner while `todoistStore.isSyncing`. Calls `syncTodoistTasks()`. Its catch logs `console.error` only (`:85-91`).
4. Section-tag text input (`:154-163`): `Hash` icon, placeholder "section tag", `w-28`. No visible label. Debounced 400 ms (`:40-46`) before `updateSectionTagFilter`. Its initial value is `tasksStore.sectionTag`, which defaults to `#to-list` (`tasks.store.svelte.ts:8`).

### Content states (`TasksView.svelte:166-276`)

- Loading: "Indexing tasks..." replaces the whole list whenever `tasksStore.isLoading` (`:169-170`).
- Empty: "No tasks found" for any cause (`:171-172`). The same text covers no tasks in vault, filters that exclude everything, and a section tag that matches no heading.
- Count line: "N tasks in M files" over the filtered set (`:174-176`).
- Scroll: `ScrollArea` with `flex-1 min-h-0` (`:167`).

### File groups (`:178-195`)

- Groups are stacked in `space-y-6`. Each has a header: file name button (`:183-188`) styled `text-purple-400 hover:underline`, then `(formatDate(modifiedAt))` (`:189-191`), then `(count)` (`:192-194`).
- File-name click calls `openFileInEditor(filePath)` (`:62-64`). The function takes a path only (`src/lib/core/editor/editor.service.ts:99`). It does not jump to the task line.
- `formatDate` (`:93-100`): `en-US` `Nov 5, 2026`-style, date only, no time. It formats file `modifiedAt`, not a task date.
- Groups are keyed by `filePath` (`:179`).

### Task rows (`:197-269`)

- Row: `group` class, indent via inline `padding-left: indent*1.25+0.25 rem` (`:200-203`), hover background.
- Checkbox button (`:204-214`): `aria-label` "Mark task as done/not done" (`:206`). `Circle` or `CircleCheckBig`. This is the only keyboard path to toggle.
- Text span (`:215-220`): `onclick` calls `handleToggle` too. The comment at `:215` says so on purpose. Clicking any text toggles the task. Text is rendered from `parseTaskTextSegments` (`:221-239`):
  - wikilink segments are buttons that call `onOpenWikilink` and stop propagation (`:225-228`);
  - markdown-link segments are anchors with `target=_blank`, stop propagation (`:230-237`).
  - Unsafe or relative URLs stay plain text (`src/lib/features/tasks/tasks.logic.ts:142-148`).
- Rows are keyed by `task.lineNumber` (`:199`).
- Completed rows: `line-through text-muted-foreground` (`:218`).
- Metadata (due, scheduled, start, priority, recurrence, tags) is not rendered in the row. Only `text` and `checked` are displayed. `status` is not displayed.
- Per-row Todoist (`:241-267`): if sent, a `Cloud` icon (open) or `CloudCheck` green icon (completed) links to the Todoist URL. Otherwise `<TodoistPopover>` renders.

### Store and state (`tasks.store.svelte.ts`)

- Module-level `$state`, getters, no persistence code (`:4-34`).
- Defaults: `dateFilter='all'` (`:6`), `sectionTag='#to-list'` (`:8`), `hideCompleted=true` (`:10`), `isLoading=false` (`:12`).
- The `TasksView` local `sectionTagInput` is initialised from the store once (`TasksView.svelte:37`).
- Filter state is lost on app restart (reset to defaults). Inferred from the lack of storage calls in the store file. Not checked whether the settings store persists any of it.

### Pipeline

- `filteredGroups` (`TasksView.svelte:52-58`): `filterByDate(fileTaskGroups, dateFilter)`, then `filterCompleted` if `hideCompleted`.
- `filterByDate` (`tasks.logic.ts:76-88`) filters on `group.modifiedAt`, the file's mtime. It does not look at task dates.
- `filterCompletedTasks` (`tasks.logic.ts:34-52`): keeps a completed parent if it has unchecked descendants (indent-based). `filterCompleted` (`:59-70`) drops empty groups.
- `computeTaskStats` (`:91-113`): total, completed, pending, fileCount.
- `buildTaskIndex` (`tasks.service.ts:63-84`):
  - sets `isLoading=true` on every call (`:65`);
  - calls `get_tasks_in_section_v2` when the trimmed tag is non-empty, else `get_all_tasks_v2` (`:69-71`);
  - converts `modifiedAt` seconds to ms (`:18-46`, `:22`);
  - drops results from superseded requests (`:53`, `:72`).
- Refetch triggers: mount, every `vaultStore.vaultIndexVersion` change (`TasksView.svelte:78-83`), section-tag input (`tasks.service.ts:94-97`), each successful toggle (`tasks.service.ts:150`).

### Toggle path (`tasks.service.ts:121-155`)

- If the note's tab is dirty, it saves first, then checks that the target line text did not move. If it moved, it refetches and shows a toast (`:124-136`).
- Calls Rust `toggle_task_status` (`:137-140`), syncs the open tab with `syncExternalContentToEditor(... 'none')` (`:149`), then refetches (`:150`).

### Rust side

- `get_all_tasks_v2` (`src-tauri/src/commands/vault.rs:646-655`): reads the in-memory `VaultIndex`.
- `get_tasks_in_section_v2` (`vault.rs:736-753`): async, collects every index entry with tasks (`section_task_candidates`, `:672-683`), then re-reads each file from disk on a blocking thread (`tasks_in_section`, `:689-725`). It runs on every refetch when the tag is non-empty, which is the default.
- Section semantics (`src-tauri/src/vault/parsing.rs:1705-1752`):
  - empty tag returns all tasks (`:1706-1707`);
  - a `#` is prepended if missing (`:1709-1713`);
  - a task belongs to a section when its nearest governing heading's text contains the tag as a substring (`:1739`, `heading_text.contains(&tag)`), so `#to-list` also matches `#to-listen`. Case-sensitive.
  - a section ends at the next heading of equal or higher level (`:1736-1737`);
  - fenced code is skipped (`:1720-1732`).
- Checked semantics: `checked: check_char != ' '` (`parsing.rs:1633` and `:1650`). So `[-]` cancelled, `[/]` in-progress and other non-space marks count as checked, and are struck through and hidden by hide-completed.
- Status enum: `Todo, Done, Cancelled, InProgress, Question, Forwarded, Important` (`src-tauri/src/vault/task.rs:42-51`). The UI ignores it.
- Metadata struct (`task.rs:82-130`): description, dueDate, scheduledDate, startDate, createdDate, doneDate, cancelledDate, priority, recurrence, id, dependsOn, onCompletion, tags. Mapped into TS in `tasks.service.ts:29-42` and `task-metadata.types.ts`. Only the Todoist popover reads it.
- Tag index exists: `lookup_all_tags` (`vault.rs:640`, command body; the enclosing command name was not read).

### Todoist

- Only caller of `syncTodoistTasks` is `TasksView.svelte:87` (manual button). `initTodoist` runs on mount (`TasksView.svelte:72-74`, `todoist.service.ts:238-244`) and loads `.kokobrain/todoist-sent.json`.
- `syncTodoistTasks` (`todoist.service.ts:250-286`): fetches each sent task, sets `todoistCompleted` and `syncedAt` only. It does not change the local checkbox. Per-task failures are logged via `debug` only (`:276-278`). Missing token throws (`:252`).
- Send (`todoist.service.ts:181-235`):
  - args: `buildTodoistArgs(metadata)` then `content: metadataArgs.content || text`, then popover overrides (`:196-205`);
  - default label from settings is merged into every task (`:207-211`);
  - remembers project, section and priority (`:227-229`).
- `buildTodoistArgs` (`src/lib/features/tasks/todoist-bridge.logic.ts`): if recurrence is present it sets `dueString` and drops `dueDate` (`else if`). Tags become labels. Priority maps `highest→4 … high→3, medium→2, else→1`, and 1 is omitted.
- Sent-state key is `${filePath}:${text}` (`todoist.store.svelte.ts:24-31`, `:49-50`, `:70-83`). Text includes the emoji metadata.
- Projects are cached in the store and fetched only when empty or forced (`todoist.service.ts:137-144`). The popover calls `loadProjects()` without force (`TodoistPopover.svelte:71`).
- `TodoistPopover.svelte`:
  - trigger is `opacity-0`, shown on row hover or focus-within (`:113`);
  - fields: project (`:144-167`), section (only if the project has sections, `:170-195`), priority (`:198-214`), send button (`:221-234`);
  - priority from metadata overrides the remembered value (`:63-68`);
  - a preview shows due, recurrence and tags (`:123-141`), with hardcoded emoji 📅 and 🔁 (`:127`, `:133`).
- Settings UI: `src/lib/core/settings/sections/TodoistSection.svelte` (53 lines): API token and default label only (`:20-50`).

### Tests

- Unit: `src/tests/lib/features/tasks/` (tasks.service, tasks.store, todoist.service, todoist.store, todoist-bridge.logic, task-toggle-dirty-buffer, tauri-fetch-adapter, todoist-client). Also `src/tests/lib/features/command-palette/CommandPalette.test.ts` and `src/tests/lib/app/global-keybindings.test.ts`.
- E2E: `e2e/specs/tasks-view.spec.ts` (3 tests seen in the read). Its comment at `:14-17` says a fresh vault shows "No tasks found" until the section tag is cleared.
- No component test for `TasksView.svelte` was found by the grep of `src/tests` and `e2e` for `TasksView`.

## Problems and gaps

Ranked by how much they block the owner's stated needs (rules, filtering, categorising, Todoist).

1. **Default section tag hides everything.** `#to-list` is pre-filled (`tasks.store.svelte.ts:8`). On a fresh open the view shows "No tasks found" (`TasksView.svelte:171-172`), and the e2e test documents this (`tasks-view.spec.ts:14-17`). Nothing explains why or offers a fix.
2. **Source rules are one free-text substring on a heading.** `parsing.rs:1739`. No picker, no autocomplete (a tag index exists, `vault.rs:640`), no AND/OR, no exclude, no folder/file scope, no per-task tag filter, no status filter. The owner's "which notes/tasks are sourced" cannot be expressed.
3. **Date chips filter on file mtime, not task dates.** `tasks.logic.ts:76-88`, `TasksView.svelte:52-53`. Any edit to a note moves it into the window. A task due next month in a note edited yesterday shows, and an overdue task in an older note disappears. The due/scheduled/start data is parsed (`task.rs:88-96`) and ignored.
4. **Hide-completed is on by default and counts non-done marks as done.** `tasks.store.svelte.ts:10`, `parsing.rs:1633`. `[-]` cancelled and `[/]` in-progress are hidden and struck through. The `status` enum is unused in the UI (`task.rs:42-51`).
5. **Clicking task text toggles the task.** `TasksView.svelte:215-220`. Selecting or copying text toggles state. The row has no way to open the task's line. The file-name button opens the file only (`TasksView.svelte:62-64`, `editor.service.ts:99`).
6. **Every refetch shows "Indexing tasks..." and replaces the list.** `tasks.service.ts:65` sets loading on every call. `TasksView.svelte:169-170` swaps the list out. Toggles (`tasks.service.ts:150`) and each vault-index version bump (`TasksView.svelte:78-83`) trigger it. Scroll position is likely lost; unverified in the running app.
7. **Each refetch with the default tag re-reads every note with tasks from disk.** `tasks.service.ts:88-92`, `vault.rs:689-753`. Cost grows with vault size. Not measured.
8. **Metadata is parsed and not shown.** No due, priority, recurrence, tag or status badges in the row (`TasksView.svelte:199-268`). Priority and due are only visible inside the Todoist popover.
9. **Grouping and sorting are fixed.** Files are sorted by mtime desc (`vault.rs:723`, doc at `:643-645`). Tasks stay in document order. No group by due date, priority, tag or status.
10. **Empty state is ambiguous.** One string for four causes (`TasksView.svelte:171-172`). No "clear section tag" action.
11. **Filter state is not persisted.** Date filter, hide-completed and section tag reset on restart (`tasks.store.svelte.ts:4-10`). Inferred from the absence of storage code; not checked against settings persistence.
12. **Section-tag input has no visible label** (`TasksView.svelte:156-162`, placeholder only). Filter chips and hide-completed toggle have no `aria-pressed` (`:107-134`). Hide-completed is icon-only with a title. Its icon shows the state being hidden (`EyeOff` when hiding), which is easy to misread.
13. **Keyboard access to Todoist send is hidden.** The trigger is `opacity-0` until hover or focus-within (`TodoistPopover.svelte:113`). Touch users cannot see it.
14. **Sync is manual, one-way, and silent on partial failure.** `TasksView.svelte:85-91` (console.error only, no toast, against the project's error rule). `todoist.service.ts:276-278` (debug only). Local checkbox is not updated (`todoist.service.ts:270-275`).
15. **Sent-task identity is text-based.** `todoist.store.svelte.ts:24-31`. Editing the task text (including adding a date emoji) or renaming or moving the note makes the task look unsent. A second send is then possible. Two identical lines in one file share one entry. Not reproduced.
16. **Recurrence drops the due date when both exist.** `todoist-bridge.logic.ts` `buildTodoistArgs`, the `if recurrence ... else if dueDate` branch.
17. **Every task gets the default label silently.** `todoist.service.ts:207-211`. No per-send opt-out in the popover (`TodoistPopover.svelte`).
18. **No way to send in bulk, unsend, or refresh the project list.** Projects cache for the session (`todoist.service.ts:141-144`). Popover never forces refresh (`TodoistPopover.svelte:71`).
19. **Styling.** Hardcoded `text-purple-400` for file headers (`TasksView.svelte:184`) and literal emoji in the popover preview (`TodoistPopover.svelte:127`, `:133`). Other styling was not audited.
20. **Row keyed by line number** (`TasksView.svelte:199`). Inserting a line above shifts keys, so DOM rows can be reused for other tasks. Minor.
21. **No empty-group or completed-group collapse.** Hide-completed removes completed families (`tasks.logic.ts:34-52`) with no count of what was hidden.

## Ideas worth keeping

- The heading-as-section model (`parsing.rs:1701-1752`) is an existing, tested feature. Keep it as one source rule and make it a picker over the tag index (`vault.rs:640`) instead of a free-text field.
- The parsed `TaskMetadata` (`task.rs:82-130`) already carries due, scheduled, start, priority, recurrence, tags and id. Filters and badges need no Rust change for the UI.
- `filterByDate`, `filterCompleted` and `computeTaskStats` are pure and in `tasks.logic.ts`. Good seam for a richer filter pipeline with unit tests.
- The request-sequence guard in `buildTaskIndex` (`tasks.service.ts:53-84`) and the dirty-buffer handling in `toggleTask` (`:121-155`) are careful and worth keeping.
- `metadata.id` (`task.rs:120`) is a candidate stable key for Todoist sent-state, replacing the text key (`todoist.store.svelte.ts:24-31`).
- Per-row Todoist state (cloud icon, completed check, link) is a good pattern. Keep it, move the trigger into the row's visible actions.

## Open questions

- Is `#to-list` an owner convention to keep as a default, or an accident of development? It controls whether a new user sees anything.
- Should date chips mean task due or scheduled dates, file activity, or both? Currently file mtime.
- Should `[-]` and `[/]` be separate from done? Owner's expectation for hide-completed?
- Should filter state persist across restarts?
- Does `buildTodoistArgs` send raw wikilink and link syntax from `metadata.description`? Not verified.
- Does anything call `todoistStore.reset()` on vault switch? Not verified (only `resetTasks` at `app-lifecycle.service.ts:640` was seen).
- Do external links in the Tauri webview open in the system browser? From memory only; `target=_blank` at `TasksView.svelte:230-237` was not traced.
- Should sync also flip the local checkbox when Todoist completes the task? Currently no.
- Is a tab the right home, or should Tasks become a sidebar panel or a `.view`-style file (the view-unification work in `.scratch/view-unification/`)? Not read by this scout.

## Not checked

- Nothing was run: no app, no tests, no build. Timing and flicker claims come from code reading.
- Did not read `editor.logic.ts` `isVirtualTab`, the settings persistence layer, or the `.view` unification code.
