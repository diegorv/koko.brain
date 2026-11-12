# Scout 04: command palette entry and tab placement for the Tasks view

Read-only research. No source file was edited and no test, build or app was run.

## Summary

The Tasks view has exactly one entry point besides the shortcut: the palette command `tasks:toggle` ("Toggle Tasks View", category "Navigation", shown as the Cmd+Shift+T glyphs). It is a pure toggle that opens, focuses or closes a virtual editor tab, and it carries no parameters. No other task-related palette command exists (no filters, no "open with filter", no "new task", no "show overdue"). Every view setting (date filter, hide-completed, section tag) is session-only store state that can only be changed with the mouse inside the view. The palette itself is a plain label-only fuzzy list with no per-command icons, no argument prompts and no sub-commands, so "open with filter" must be built as separate flat commands or as a store call that runs before opening the tab.

## Facts (verified in code)

### Command registration and display

- The command is declared at `src/lib/app/commands.ts:196-204`: `id: 'tasks:toggle'`, `label: 'Toggle Tasks View'`, `category: 'Navigation'`, `shortcut: shortcutFor('tasks:toggle')`, action calls `toggleTasksTab()`.
- The binding is declared at `src/lib/app/global-keybindings.ts:115-122`: `command: 'tasks:toggle'`, key `t`, `meta: true`, `shift: true`, handler `toggleTasksTab()`. `shortcutFor` (`global-keybindings.ts:211-216`) derives the palette label from that binding and throws if none exists, so the shortcut is declared once.
- The shortcut renders through `formatShortcut` (`src/lib/utils/keybindings.ts:40-54`) as the modifier glyphs then the uppercased key. For this command the label is Cmd, Shift, T glyphs concatenated with no separators.
- Sibling toggles use the same pattern and category: Graph (`commands.ts:188-195`, Cmd+G), Calendar (`commands.ts:205-213`, Cmd+Shift+C). Tags (`commands.ts:265-272`) has no shortcut at all.
- Calendar has a richer command family at `commands.ts:214-246`: "New Calendar Event", "Calendar: Go to Today", "Calendar: Undo", "Calendar: Redo". Each is a flat command that either opens the tab first (`openEventCalendarTab()` then a store call at `commands.ts:225-228`) or calls a service. This is the in-repo precedent for "open view with a preset state".
- Todoist commands (`commands.ts:247-263`) use category "Todoist" and the prefix style "Todoist: Sync now". Categories are free strings; there is no "Tasks" category today.
- `commands.ts:63-72`: `railGoToCommands()` generates "Go to <rail item>" commands from the rail registry. A grep of `src/lib/features/rail-shell` and `src/lib/app/rail-navigation.ts` for "task" returned nothing, so Tasks is not a rail item and has no "Go to Tasks" command.
- Commands are built at render time: `src/lib/app/AppOverlays.svelte:19` passes `getBuiltInCommands()` as the `commands` prop.

### Palette behavior

- `src/lib/features/command-palette/AppCommand` (`command-palette.types.ts:1-7`) has only `id`, `label`, `category`, optional `shortcut`, `action`. No icon, no keywords/aliases, no `when`/enabled predicate, no argument input.
- `CommandPalette.svelte:47-70`: input placeholder "Type a command...", items render label plus category in a small muted line and the shortcut on the right. `shouldFilter={false}`, ranking is done in `command-palette.logic.ts`.
- `command-palette.logic.ts:20-24` fuzzy-matches the query against `cmd.label` only. Category and id are not searched. Typing "task" matches "Toggle Tasks View" (subsequence match, `fuzzy-match.ts:9-33`), but typing "todo", "overdue" or "to-list" would not.
- Empty query (`command-palette.logic.ts:9-18`): recent commands first, the rest sorted alphabetically by label.
- Recents are stored in `localStorage` key `kokobrain:recent-commands`, max 20 (`command-palette.store.svelte.ts:1-2, 42-46`).
- `CommandPalette.svelte:27-37`: executing closes the palette, then awaits `command.action()`; failures toast `Command "<label>" failed.`.

### Tab open/close/placement

- `tasks.service.ts:186-200` `openTasksTab()`: finds a tab with path `TASKS_VIRTUAL_PATH` (`'__virtual__/tasks'`, `src/lib/core/editor/editor.logic.ts:6`); if present it activates it, otherwise `editorStore.addTab({ path, name: 'Tasks', content: '', savedContent: '', fileType: 'tasks' })`.
- `tasks.service.ts:210-220` `toggleTasksTab()`: not open, open it; open and active, close it; open but not active, focus it.
- `tasks.service.ts:203-208` `closeTasksTab()`, and `tasks.service.ts:227-231` `resetTasks()` (vault teardown) resets the store and closes the tab.
- Tabs are a single flat strip. There is no pane or split API in the Tasks service; it only talks to `editorStore`. `addTab` placement (end vs after active) lives in the editor store and was not inspected.
- The tab is rendered by `src/lib/app/EditorView.svelte:40,72-73` when `activeTab.fileType === 'tasks'`, as a `TasksView` filling the editor area. `fileType` union is at `src/lib/core/editor/editor.types.ts:12`.
- Tab strip icon is `ListChecks` (`src/lib/core/markdown-editor/EditorTabs.svelte:69-70`), title is the static string "Tasks". The title cannot reflect a filter or a count.
- A virtual tab is never dirty-tracked or saved (`editor.service.ts:189, 211, 279, 428` skip `isVirtualTab`).
- `src/lib/core/layout/layout.logic.ts:15-20`: the Tasks tab hides the right sidebar (properties, outline, backlinks).
- I grepped `src/lib/core/editor/*.ts` for session or restore logic and found no persistence of open tabs, so a Tasks tab apparently does not come back after an app restart (opinion-level: no match is weak evidence, not a read of a restore path).

### Mount and state lifecycle

- `TasksView.svelte:73-79`: an effect on `vaultStore.vaultIndexVersion` runs `buildTaskIndex()` on mount and on every index bump. `app-lifecycle.service.ts:407-409` confirms the task index is not built at startup: the first load happens when the tab mounts.
- Default `sectionTag` is `'#to-list'` (`tasks.store.svelte.ts:8`), so the first open always runs `get_tasks_in_section_v2` (`tasks.service.ts:70-73`), a disk re-read of every note with tasks (`tasks.service.ts:89-95`). `hideCompleted` defaults to true, `dateFilter` to `'all'` (`tasks.store.svelte.ts:4-10`).
- `tasksStore` is a module-level store: closing the tab does not reset filters; only `resetTasks()` does (`tasks.store.svelte.ts:27-33`). Filters therefore survive close and reopen within a vault session but not an app restart. The section tag input is a local copy seeded from the store (`TasksView.svelte:31`).
- All filter setters exist on the store (`setDateFilter`, `setSectionTag`, `setHideCompleted`, `tasks.store.svelte.ts:22-24`), but only `updateSectionTagFilter` (`tasks.service.ts:96-99`) has a service wrapper that refetches. Date filter and hide-completed are applied client-side in the view (`TasksView.svelte:47-48`), so a command could set them directly.

### Tests

- `tasks:toggle` has no direct assertion in `src/tests/lib/app/commands.test.ts`: the only hit is the `toggleTasksTab` mock at line 27. The shortcut is covered by `src/tests/lib/app/global-keybindings.test.ts:212, 527-533`. `src/tests/lib/features/command-palette/CommandPalette.test.ts:26-27` only mocks the service. Any new command will need its own test following the project rule on assertions against real stores.

## Problems and opportunities

Facts that are problems, then opinions marked as such.

1. The only palette entry is a toggle named "Toggle Tasks View". Fact: the same key closes the view when it is active (`tasks.service.ts:215-216`). Opinion: for a palette "open Tasks" is the usual intent, and the close-on-repeat behavior is surprising when the palette is used instead of the shortcut. Keeping toggle for the shortcut while adding an idempotent "Open Tasks" for the palette is cheap.
2. No task-related commands beyond the toggle. Fact: filters, hide-completed and section tag are mouse-only and reset on app restart. Opinion: the palette is the natural place for "Tasks: Show completed", "Tasks: Last 7 days", "Tasks: All sections".
3. The command is only found by label ("task" or "tasks view"). Fact: category and ids are not searched. Opinion: adding the word in the label (e.g. "Tasks: Open") plus the category "Tasks" helps; "todo" and "checklist" would not match anything.
4. Category "Navigation" is shared with 20+ commands, and the palette sorts the empty-query list alphabetically (`command-palette.logic.ts:14-16`), so a "Tasks: ..." family would group naturally by label prefix, as "Calendar: ..." and "Todoist: ..." do.
5. Opening cost: the first open runs the heavy section scan (see Mount and state lifecycle). Opinion: an "open with filter" command that sets a different tag before mount would cause one fetch instead of two only if the state is set before the tab is added; setting after mount triggers a second fetch via `updateSectionTagFilter`.
6. Tab title is static "Tasks" with a static icon, so an active filter or open-task count cannot be surfaced in the tab strip without changing `tab.name` or `EditorTabs.svelte`.
7. The palette has no argument prompt. A command like "filter by section tag X" can only exist for fixed values, or the view's own input remains the only way to set arbitrary tags.
8. Missing test coverage for the `tasks:toggle` command object itself (label, category, shortcut, action).

## Recommendations for the redesign

All are opinions grounded in the facts above.

1. Add an idempotent "Tasks: Open" command (calls `openTasksTab()`, which already exists and is idempotent, `tasks.service.ts:187-200`). Keep `tasks:toggle` for the shortcut, and consider renaming its label so both are discoverable under "Tasks".
2. Introduce a "Tasks: ..." command family following the Calendar precedent (`commands.ts:223-229`): each command mutates `tasksStore` then calls `openTasksTab()`. Candidate set: "Tasks: Show completed" / "Tasks: Hide completed" (or one toggle), "Tasks: All time" / "Last 7 days" / "Last 30 days", "Tasks: Clear section filter" (sets tag to empty via `updateSectionTagFilter('')`). Keep the set small; every command is a flat entry in a list that is already long.
3. If the redesign adds new filters (status, priority, due), expose them through the store first, then add commands only for the high-value presets. Fixed presets avoid needing a palette argument UI.
4. Use `openTasksTab()` then store setters, but set state before opening when possible so the first fetch uses the right tag.
5. Make the category "Tasks" for the new family (a free string, `command-palette.types.ts:4`) so the muted subtitle in the palette reads correctly.
6. If the owner wants persistence of filters across restarts, the pattern in this repo is a settings or localStorage slice (the palette store uses `localStorage` with try/catch, `command-palette.store.svelte.ts:7-22`); the Tasks store currently has neither.
7. If the owner wants a "Tasks" rail item or a stronger entry point, note that no rail item exists (`src/lib/features/rail-shell` has no tasks reference). That is a larger slice and a separate decision.
8. Tests for each slice: assert the command exists with the expected id, label, category and shortcut in `commands.test.ts`, and assert the real `tasksStore` state after running `action()` (not only that a mock was called), per the project rule against mock-only assertions. `tasks.service` is mocked in that file today (`commands.test.ts:26-27`), so a state-setting command needs either an un-mocked service or the store assertion done through the real store.
9. Tab title: if a count or filter badge is wanted in the tab, it needs `EditorTabs.svelte` support for virtual tabs; a static `name` in `addTab` would go stale.

## Open questions for the owner

1. Should Cmd+Shift+T keep closing the view when it is active, or should it only open/focus it (with Cmd+W or Close Tab to close)?
2. Which filter presets, if any, deserve palette commands? Examples: show completed, last 7 days, last 30 days, all sections, overdue, due today.
3. Is `#to-list` meant to stay the default section tag for everyone, or should the default be empty (all tasks) with the tag as an opt-in filter? This changes what a bare "Tasks: Open" shows and the cost of the first open.
4. Should filter choices persist across app restarts (today they reset on restart and on vault change)?
5. Should Tasks get a rail item or a "Go to Tasks" entry in addition to the tab and palette command?
6. Should the palette search also match category or keywords (so "todo" finds the Tasks commands)? That touches `command-palette.logic.ts` and affects every command, so it is a wider change than the Tasks view.
