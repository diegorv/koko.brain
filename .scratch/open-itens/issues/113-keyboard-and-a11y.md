# 113: Keyboard navigation and accessible rows in the Tasks view

**Origin:** `tasks-view` Issue 10, moved here on 2026-11-08 and rewritten on 2026-11-12 from the Tasks view UX research (`.scratch/tasks-view-ux/research/`, `critique.md` D9, D10 and D17). It now runs before grouping (Issue 112). Its PRD stays in `.scratch/archived/tasks-view/`. Issue numbers in this text are open-itens numbers.

**What to build:** The task list has no keyboard model beyond tabbing through buttons, and the task text is a static element with a click handler (a `svelte-ignore` comment silences the a11y warnings). Make the list keyboard-first (PRD A8): arrows to move, Space to toggle, Enter to open the note at the task's line, with the place kept across refreshes and tab switches.

- **Roving focus over rows**, following the calendar keys pattern (`src/lib/features/event-calendar/event-calendar-keys.logic.ts`). Each row element is the focus stop: `tabindex="0"` on the current row and `tabindex="-1"` on the others, with `data-task-row` on each. The circle and the wikilinks inside a row keep their own tab order and native activation.
- A pure `resolveTaskKey(input)` in `src/lib/features/tasks/tasks-keys.logic.ts`, with `input = { key: string; typing: boolean; onRow: boolean; meta: boolean; ctrl: boolean; alt: boolean; index: number; count: number }`, returns `{ kind: 'focus'; index: number } | { kind: 'toggle' } | { kind: 'open' } | null`. ArrowDown and ArrowUp move by one and stop at the ends, Home and End go to the first and last row, Space toggles, Enter opens the note at the task's line (as a click on the text does). It returns `null` when `typing` is true, when `onRow` is false (the key landed on a control inside the row, so Space or Enter on the circle or a wikilink keeps its native click and does not run twice), or when Meta, Ctrl or Alt is held.
- One `keydown` handler on the list container calls it with `typing: isTypingTarget(e.target)`, `onRow: e.target` has `data-task-row`, and `index`/`count` over the rows currently rendered, in DOM order across groups. On a non-null action it calls `preventDefault()`. Popovers and dialogs render in a portal outside the list, so their keys never reach this handler. Issue 240 adds the rule for collapsed groups.
- **The current row is kept.** The Tasks store holds the current row as `{ filePath, lineNumber }` with a getter and a setter. After a refetch that removes it (for example Space completed it under the Open filter), the current row becomes the next surviving row, else the previous one, and focus follows when focus was in the list. After the view remounts on tab activation, focus goes to the current row, or to the first row when there is none (owner decision below). With no rows, nothing is focused. `tasksStore.reset()` clears it.
- `isTypingTarget` and its `TYPING_TAGS` set move from `event-calendar-keys.logic.ts` to `src/lib/utils/typing-target.ts`, and their importers (the calendar view and `src/lib/app/global-keybindings.ts`) use it from there. Its tests move to `src/tests/lib/utils/typing-target.test.ts`. `features/tasks` then imports nothing from `event-calendar`.
- **Roles and names.** Each note group's row container has `role="list"` and an `aria-label` set to the note title; each row has `role="listitem"`. The circle's `aria-label` becomes `Mark task as done: <text> (<word>)` or `Mark task as not done: <text> (<word>)`, where `<text>` is `taskDisplayText` (Issue 109) and `<word>` comes from Issue 237. The `svelte-ignore` goes once the text span no longer needs it (the span keeps its click; the row is the keyboard path). The Status, Due and Priority triggers are dropdown triggers, not toggles, so they carry no `aria-pressed`.
- **Palette command** in `getBuiltInCommands` (`src/lib/app/commands.ts`), next to `tasks:toggle`, category `Navigation` like it:
  - `tasks:status-filter`: label `Tasks: Show all statuses` when `tasksStore.quick.show` is `open` and `statuses` is empty, else `Tasks: Show open only` (the store is read while the list is built, as `railGoToCommands` does). The action sets `show` to `all` or `open`, clears `statuses`, and calls `openTasksTab()` so the change is visible.
  - "Toggle Tasks View" keeps its behavior. No other Tasks command is added.

**Blocked by:** 239

**Status:** ready-for-agent

**Answered:** PRD A8: arrows, Home/End, Space, Enter and palette commands, no bare-letter shortcuts in v1 (owner, 2026-11-06). Focus on open goes to the first row, not the search box (owner, 2026-11-12, synthesis Q5 (b)).

**Gate:** frontend only: `pnpm check` + `pnpm vitest run`, plus `bash scripts/e2e.sh` because the circle's accessible name changes (the spec matches its start).

- [ ] Failing test first, `src/tests/lib/features/tasks/tasks-keys.logic.test.ts`: ArrowDown and ArrowUp (including at the ends), Home, End, Space and Enter map to the right action and index; every key maps to `null` with `typing: true`, with `onRow: false`, and with Meta held.
- [ ] `TasksView.test.ts` with real stores: on mount the first row has focus; ArrowDown moves focus to the second row; Space there invokes `toggle_task_status` for that row's path and line; Enter makes its note the active tab; Space with focus on a row's circle button invokes `toggle_task_status` once, not twice; Space inside the search box toggles nothing.
- [ ] `TasksView.test.ts`: Space completes the focused row under the Open filter; after the refetch, focus is on the row that followed it. Unmount and mount again: focus returns to that row.
- [ ] `tasks.store.test.ts`: the current-row getter and `reset()`.
- [ ] The calendar keys tests still pass after the move of `isTypingTarget`.
- [ ] `src/tests/lib/app/commands.test.ts` covers the new command: the label flips with the store, and the action changes `tasksStore.quick` and opens the Tasks tab.
- [ ] `help/documentation/10-tasks-and-todoist.md` and `help/documentation/20-keyboard-shortcuts.md` list the Tasks view keys and the palette command (PRD A12).

## Notes

- **Size:** M.
- Run in series with the other Tasks view Issues (see 108).
- Moving `isTypingTarget` keeps `feature-cycle.test.ts` from seeing a `tasks -> event-calendar` pair; Issue 110 adds the `event-calendar -> tasks` pair.
- Shift+F10 and the ContextMenu key open the row menu in Issue 241, which runs after this one.
- Doc 10 embeds `screenshots/tasks-view.png`, and no such file exists under `help/`. Out of scope here; the owner knows.

## Comments

- 2026-11-10: the Todoist trigger bullet, the `tasks:sync-todoist` command and the Todoist parts of the criteria were removed: `todoist-bisync` Issue 15 deleted `TodoistPopover.svelte`, `todoist.service.ts` and `initTodoist`, and the two-way sync has its own palette commands. The keyboard and a11y work is unchanged.
