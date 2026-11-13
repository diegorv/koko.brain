# Validated 02: scout 03 (Rust task parsing) and scout 04 (command palette entry)

Adversarial check, read-only. No source edited, no test, build or app run.

**Input gap:** `.scratch/tasks-view-ux/research/scout-03-rust-task-parsing.md` does not exist (the directory has scouts 01, 02, 04 to 15 and 17; 03 and 16 are missing). Nothing from scout 03 could be confirmed or refuted. This validator covered the Rust task parsing angle from the code instead, under "Missed by scouts".

## Confirmed (claim + evidence)

Scout 04, command registration:
- `tasks:toggle`, label "Toggle Tasks View", category "Navigation", `shortcutFor('tasks:toggle')`, action `toggleTasksTab()`: `src/lib/app/commands.ts:196-204`.
- Binding `t` + meta + shift, handler `toggleTasksTab()`: `src/lib/app/global-keybindings.ts:115-123`. `shortcutFor` throws when no binding names the command: `global-keybindings.ts:211-216`.
- `formatShortcut` renders modifier glyphs then the uppercased key, joined with no separator: `src/lib/utils/keybindings.ts:39-54`.
- Graph (Cmd+G) and Calendar (Cmd+Shift+C) toggles share the pattern and the "Navigation" category: `commands.ts:187-213`. "Toggle Tags View" has no shortcut: `commands.ts:265-272`.
- Calendar's open-then-mutate-store precedent: "Calendar: Go to Today" calls `openEventCalendarTab()` then `eventCalendarViewStore.goToToday()`: `commands.ts:222-230`.
- Todoist commands use category "Todoist" and a "Todoist: ..." label prefix: `commands.ts:247-264`. No "Tasks" category exists.
- `railGoToCommands()` builds "Go to <item>" from the rail registry: `commands.ts:61-72`. A grep of `src/lib/features/rail-shell` and `src/lib/app/rail-navigation.ts` for "task" (case-insensitive) returns nothing, so there is no Tasks rail item and no "Go to Tasks".
- The palette gets `getBuiltInCommands()` at render: `src/lib/app/AppOverlays.svelte:19`.

Scout 04, palette behavior:
- `AppCommand` has only `id`, `label`, `category`, `shortcut?`, `action`: `src/lib/features/command-palette/command-palette.types.ts:1-7`.
- Items show label, muted category, right-aligned shortcut; `shouldFilter={false}`: `CommandPalette.svelte:40-72`.
- Fuzzy match runs on `cmd.label` only: `command-palette.logic.ts:22-26`. "todo", "overdue" and "to-list" do not match "Toggle Tasks View" (no `d`, no `r` after `v...e`, no `-` in the label; `src/lib/utils/fuzzy-match.ts:8-40`).
- Empty query: recents first, rest alphabetical by label: `command-palette.logic.ts:9-18`.
- Recents in `localStorage` key `kokobrain:recent-commands`, max 20, reads and writes in try/catch: `command-palette.store.svelte.ts:1-22, 42-46`.
- Execute closes the palette, awaits the action, toasts `Command "<label>" failed.` on throw: `CommandPalette.svelte:27-37`.

Scout 04, tab lifecycle:
- `openTasksTab()` is idempotent (activate if present, else `addTab` with `fileType: 'tasks'`, name "Tasks"): `src/lib/features/tasks/tasks.service.ts:186-200`. `TASKS_VIRTUAL_PATH = '__virtual__/tasks'`: `src/lib/core/editor/editor.logic.ts:6`.
- `toggleTasksTab()` opens, closes when active, focuses when inactive: `tasks.service.ts:210-220`. So running "Toggle Tasks View" from the palette while the Tasks tab is active closes it.
- `closeTasksTab()` `tasks.service.ts:202-208`; `resetTasks()` resets the store and closes the tab: `tasks.service.ts:227-231`, called at vault teardown `src/lib/app/lifecycle/app-lifecycle.service.ts:664`.
- Rendered by `EditorView.svelte:40, 72-73`; `fileType` union at `src/lib/core/editor/editor.types.ts:12`; tab icon `ListChecks` at `src/lib/core/markdown-editor/EditorTabs.svelte:69-70`; static name "Tasks".
- Virtual tabs are skipped by save and dirty logic: `editor.service.ts:189, 211, 279, 428`.
- Tasks tab hides the right sidebar: `src/lib/core/layout/layout.logic.ts:15-20`.
- No tab session persistence: a grep of `src/lib` and `src-tauri/src` for tab restore or persistence patterns finds nothing, and `src/lib/core/editor` has no `localStorage` use. Scout 04 hedged this as weak evidence; it holds.

Scout 04, state:
- `TasksView.svelte:73-78`: `$effect` on `vaultStore.vaultIndexVersion` with `untrack(buildTaskIndex)`, which also runs on mount.
- The task index is not built at startup: comment at `src/lib/app/lifecycle/app-lifecycle.service.ts:407-409`.
- Default `sectionTag = '#to-list'`, `hideCompleted = true`, `dateFilter = 'all'`: `tasks.store.svelte.ts:6-10`; `reset()` restores them: `tasks.store.svelte.ts:27-33`.
- A non-empty tag calls `get_tasks_in_section_v2`, which reads every note with tasks from disk: `tasks.service.ts:70-73, 88-95`; Rust `src-tauri/src/commands/vault.rs:732-758`.
- `sectionTagInput` is a local copy seeded from the store once: `TasksView.svelte:31`.
- Date and hide-completed filters are client-side: `TasksView.svelte:46-52`. Only the section tag has a refetching service wrapper: `tasks.service.ts:96-99`.

Scout 04, tests:
- `commands.test.ts:26-27` only mocks `toggleTasksTab`; no assertion on the `tasks:toggle` command object.
- `global-keybindings.test.ts:212` and `527-533` cover the shortcut; `CommandPalette.test.ts:26-27` only mocks the service.

## Refuted or corrected (claim + why + correct fact)

1. **"`app-lifecycle.service.ts:407-409`" (scout 04).** Path given without a directory, and CLAUDE.md's structure lists `core/app-lifecycle`, which does not exist. Correct path: `src/lib/app/lifecycle/app-lifecycle.service.ts:407-409`. Content as quoted.
2. **"Category 'Navigation' is shared with 20+ commands" (scout 04).** Overstated as a fixed number. Fact: 12 static entries carry `category: 'Navigation'` in `commands.ts`; the count passes 20 only when the vault adds enough dynamic "Go to ..." (`commands.ts:61-72`) and "Open view: ..." (`commands.ts:78-90`) commands. Vault-dependent.
3. **"No other task-related palette command exists" (scout 04).** True for built-ins only. The palette also lists vault mod commands with `palette: true`, category "Mod": `commands.ts:397-402`. A mod could already add task commands; this validator did not search the vault (outside the repo).
4. **"`addTab` placement (end vs after active) ... was not inspected" (scout 04).** Now checked: a non-pinned tab is pushed to the end and made active: `src/lib/core/editor/editor.store.svelte.ts:52-61`.
5. **"an effect ... runs `buildTaskIndex()` on mount and on every index bump" (scout 04) understates the cost.** `EditorView.svelte:72-73` renders `TasksView` only inside `{#if isTasksTab}`, so switching to another tab unmounts it and switching back remounts it. Every refocus of the Tasks tab reruns `buildTaskIndex()`, which with the default tag is the full disk scan. Conversely, no refetch happens while the tab is in the background.
6. **Recommendation 2, "Tasks: Clear section filter" via `updateSectionTagFilter('')` (scout 04), has an unflagged bug.** If the Tasks tab is mounted, the refetch is correct but the toolbar input keeps showing the old tag, because `sectionTagInput` is seeded only at mount (`TasksView.svelte:31`) and nothing syncs it from the store. Any command that changes `sectionTag` from outside the view needs the input bound to the store or synced from it.
7. **Recommendation 4, "set state before opening so the first fetch uses the right tag" (scout 04), is incomplete.** It holds only when the tab is not mounted. When the tab is already open and active, `tasksStore.setSectionTag()` alone triggers no fetch: the effect depends only on `vaultIndexVersion` (`TasksView.svelte:73-78`). The command has to call `updateSectionTagFilter` (or `buildTaskIndex`) in that case.

## Missed by scouts

Rust task parsing (the absent scout 03's angle), all verified:
- **Every non-space checkbox counts as `checked`.** `checked: check_char != ' '` in `src-tauri/src/vault/parsing.rs:1649, 1665`. Statuses `[/]` in progress, `[!]` important, `[?]` question, `[>]` forwarded and `[-]` cancelled are all `checked: true` (`parsing.rs:1591-1602`).
  - Effect 1: `filterCompletedTasks` keeps only `!task.checked` (plus parents of unchecked children) (`src/lib/features/tasks/tasks.logic.ts:34-52`), and `hideCompleted` defaults to true. **By default the view hides in-progress and important tasks as if they were done.**
  - Effect 2: those rows render struck through (`TasksView.svelte:191`, `task.checked ? 'line-through'`) while the circle shows them open (`TasksView.svelte:170-186`, driven by `toggleTarget`). The row contradicts itself.
  - Effect 3: `computeTaskStats` counts them as completed (`tasks.logic.ts:91-105`).
  - This is the highest-value correctness slice.
- **Status set is closed:** the regexes accept only `[xX \-/?!>]` (`parsing.rs:1426-1435`). Any other char (for example `[*]`) is not a task, and `map_checkbox_char` falls back to Todo only for chars the regex already excluded (`parsing.rs:1600`).
- **Section matching is a case-sensitive substring of the heading text:** `heading_text.contains(&tag)` (`parsing.rs:1758`). `#to-list` also matches headings with `#to-list-old` or `#to-listing`, and `#To-List` does not match. A missing `#` is added (`parsing.rs:1725-1729`). The tag must sit in a heading; task-level or frontmatter tags do not count. A section ends at the next heading of equal or higher level (`parsing.rs:1754-1757`).
- **Rich metadata is parsed but never shown.** `parse_task_metadata` (`parsing.rs:1776-1885`) extracts due, scheduled, start, created, done and cancelled dates, priority, recurrence, id, dependsOn, onCompletion, tags and a cleaned `description`. `fromV2` carries all of it into the store (`tasks.service.ts:20-48`). The view renders `parseTaskTextSegments(task.text)`, the raw text with emoji signifiers and `#tags` inline (`TasksView.svelte:194`). Grouping, sorting or badges by due date and priority need no Rust change.
- **File order is fixed in Rust:** both commands sort groups by `modified_at` descending (`src-tauri/src/vault/index.rs:1082`, `commands/vault.rs:725`). Any other sort is a client-side choice.
- **Cheap path exists:** with an empty tag, `get_all_tasks_v2` reads the in-memory `VaultIndex` with no disk I/O (`commands/vault.rs:651-660`, `index.rs:1070-1084`). Owner question 3 in scout 04 (default tag) therefore also decides the cost of every mount and refocus (see correction 5).

View behavior both scouts missed:
- **Loading flash on every refetch.** `buildTaskIndex` sets `isLoading` true on each call (`tasks.service.ts:67`), and the template replaces the whole list with "Indexing tasks..." while loading (`TasksView.svelte:139-140`). A toggle refetches at once (`tasks.service.ts:176-179`), and the throttled version bump refetches again about 2 s later (`docs/agents/indexing-watcher-rules.md` rule 12). So one click can blank the list twice. Opinion: this likely resets the scroll position, since the content collapses; not run.
- **Fetch errors are invisible.** On failure `buildTaskIndex` calls `error()` (console, Sentry, log file) and clears loading (`tasks.service.ts:81-85`). The store has no error field, so the view shows the previous list or "No tasks found". CLAUDE.md § Error Handling / Components requires a toast or inline state for user-facing errors.
- **Double hash in the toolbar.** A `Hash` icon is drawn inside the input (`TasksView.svelte:125`) while the value itself is `#to-list`. Minor visual.
- **Typed tag lost on quick tab switch.** `onDestroy` clears the 400 ms debounce (`TasksView.svelte:42-44`), so a tag typed less than 400 ms before switching tabs is never applied, and the remount reseeds the input from the old store value.

Rule constraints for any redesign slice:
- Any new write action from the view (set a due date or priority, cancel, mark in progress) must go through a Rust task command and `settleTaskWrite`, the way `toggleTask` does. `indexing-watcher-rules.md` rule 6 names `task-write.service::settleTaskWrite` as the single owner for Rust task writes. A TS-side file rewrite would add a second owner.
- New panels must keep the `$effect` + `untrack()` + `vaultIndexVersion` consumer pattern (`indexing-watcher-rules.md` rule 2, ADR-0006), with no TS-side mirror of the task index.
- A Tasks rail item (scout 04 rec 7) is in ADR-0033's scope (rail items, navigators, the 2026-11-04 palette-command amendment), so it needs an ADR amendment, not just a ticket.
- Tests: `commands.test.ts` mocks `tasks.service.js`, which is allowed (services may be mocked, stores and `.logic.ts` may not; ADR-0007). A command that calls store setters directly can assert on real `tasksStore` state. A command that routes through a service function only proves a mock call unless the test asserts on the store.

## Net recommendations that survive

1. **Fix the status semantics first (correctness, small).** Base "completed" on `status` (`done`, and probably `cancelled`), not `checked`, in `filterCompletedTasks`, the line-through class and `computeTaskStats`, so `[/]` and `[!]` stay visible and unstruck. Pure `.logic.ts` change with unit tests; no Rust change needed. Owner decision: does cancelled count as completed for hiding?
2. **Render `metadata.description` plus metadata chips** (due, scheduled, priority, tags) instead of raw `task.text`. The data is already in the store.
3. **Keep the list during refetch.** Show a non-blocking indicator when groups already exist, so toggles do not blank the list.
4. **Add an inline error state** for a failed fetch (CLAUDE.md § Error Handling).
5. **Owner decision on the default section tag**, because of correction 5 (disk scan on every refocus). An empty default makes mount cheap. Alternatively keep the tag and avoid refetching on remount when the index version has not changed.
6. **Palette (scout 04 recs 1, 2, 5, 8, amended).** Add an idempotent "Tasks: Open" (`openTasksTab()`) next to the shortcut toggle, and a small "Tasks: ..." family with category "Tasks". Prerequisite: sync the toolbar input from the store (correction 6), and have tag-changing commands always refetch (correction 7). Test each command against real `tasksStore` state.
7. **Hold for owner input:** a rail item (ADR-0033 amendment), cross-restart persistence of filters (localStorage has a try/catch precedent in `command-palette.store.svelte.ts:7-22`; a settings slice is the alternative), and palette keyword search (touches every command).
8. **Optional:** make section matching whole-tag instead of substring (`parsing.rs:1758`). It is a Rust behavior change with existing tests at `parsing.rs:3051-3090`, so ask the owner first; it matters only if near-duplicate tags exist in headings.
