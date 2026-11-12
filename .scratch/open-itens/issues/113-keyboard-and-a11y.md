# 113: Keyboard navigation and accessible rows in the Tasks view

**Origin:** `tasks-view` Issue 10, moved here on 2026-11-08 and rewritten on 2026-11-12 from the Tasks view UX research (`.scratch/tasks-view-ux/research/`, `critique.md` D9, D10 and D17) and its review. It now runs before grouping (Issue 112). Its PRD stays in `.scratch/archived/tasks-view/`. Issue numbers in this text are open-itens numbers.

**What to build:** The task list has no keyboard model beyond tabbing through every circle and link, and the task text is a static element with a click handler (a `svelte-ignore` comment silences the a11y warnings). Make the list keyboard-first (PRD A8): one tab stop for the list, arrows to move, Space to toggle, Enter to open the note at the task's line, with the place kept across refreshes and tab switches.

- **Roving focus over rows, as a grid.** Each row element is the focus stop: `tabindex="0"` on the current row and `tabindex="-1"` on the others, with `data-task-row` on each. The controls inside a row (the circle, wikilink buttons, URL links, and later Issue 241's actions button) get `tabindex="0"` only in the current row and `tabindex="-1"` in every other row, so Tab from the current row walks its own controls and then leaves the list. Mouse clicks on any control still work. In-app roving examples: `EventCalendarHeader.svelte` and `EventColorSwatches.svelte`.
- A pure `resolveTaskKey(input)` in `src/lib/features/tasks/tasks-keys.logic.ts`, with `input = { key: string; onRow: boolean; meta: boolean; ctrl: boolean; alt: boolean; shift: boolean; index: number; count: number }`, returns `{ kind: 'focus'; index: number } | { kind: 'toggle' } | { kind: 'open' } | null`. ArrowDown and ArrowUp move by one and stop at the ends, Home and End go to the first and last row, Space toggles, Enter opens the note at the task's line (as a click on the text does). It returns `null` when `onRow` is false (the key landed on a control inside the row, so Space or Enter on the circle or a wikilink keeps its native click and does not run twice), when Meta, Ctrl, Alt or Shift is held, or when `count` is 0.
- One `keydown` handler on the list container calls it with `onRow: e.target` has `data-task-row`, and `index`/`count` over the rows currently rendered, in DOM order across groups. On a non-null action it calls `preventDefault()`. The search box, the filter row and the menus (portals) sit outside the list container, so their keys never reach this handler, and no typing-target check is needed. Issue 240 adds the rule for collapsed groups.
- **The current row is kept.** The Tasks store holds the current row as `{ filePath, lineNumber }` with a getter and a setter, set when a row gets focus. After a refetch that removes it (for example Space completed it under the Open filter), the current row becomes the next surviving row, else the previous one, and focus follows when focus was in the list. `tasksStore.reset()` clears it.
- **Focus on open.** After the view mounts on tab activation, or when the first rows of a session arrive after mount, focus goes to the current row, or to the first row when there is none (owner decision below). It moves only while `document.activeElement` is `<body>` or inside the view root, so it never pulls focus from wherever the user has gone (the palette, a dialog, another pane). It calls `focus({ preventScroll: true })` after Issue 234's scroll restore. With no rows, nothing is focused.
- **Roles and names.** Each note group's row container has `role="list"` and an `aria-label` set to the note title; each row has `role="listitem"`. The circle's label already reads `Mark task as done: <text> (<word>)` (Issues 110 and 109). The focusable rows and the container's keydown handler trigger Svelte's `a11y_no_noninteractive_tabindex` and `a11y_no_noninteractive_element_interactions` warnings; add `svelte-ignore` comments for exactly those two, with a one-line reason (a roving-focus list), and keep the text span's existing ignore: the span keeps its click, and the row is its keyboard path. The Status, Due, Priority and Tag triggers are dropdown triggers, not toggles, so they carry no `aria-pressed`.
- **Palette command** in `getBuiltInCommands` (`src/lib/app/commands.ts`), next to `tasks:toggle`, category `Navigation` like it:
  - `tasks:status-filter`: label `Tasks: Show all statuses` when `tasksStore.quick.show` is `open` and `statuses` is empty, else `Tasks: Show open only` (the store is read while the list is built, as `railGoToCommands` does). The action sets `show` to `all` or `open`, clears `statuses`, and calls `openTasksTab()` so the change is visible.
  - "Toggle Tasks View" keeps its behavior. No other Tasks command is added.

**Blocked by:** 239

**Status:** ready-for-agent

**Answered:** PRD A8: arrows, Home/End, Space, Enter and palette commands, no bare-letter shortcuts in v1 (owner, 2026-11-06). Focus on open goes to the first row, not the search box (owner, 2026-11-12, synthesis Q5 (b)).

**Gate:** frontend only: `pnpm check` + `pnpm vitest run`, plus `bash scripts/e2e.sh` for the Space-on-circle step.

- [ ] Failing test first, `src/tests/lib/features/tasks/tasks-keys.logic.test.ts`: ArrowDown and ArrowUp (including at the ends), Home, End, Space and Enter map to the right action and index; every key maps to `null` with `onRow: false`, with Meta or Shift held, and with `count: 0`.
- [ ] `TasksView.test.ts` with real stores: on mount the first row has focus; ArrowDown moves focus to the second row; Space there invokes `toggle_task_status` for that row's path and line; Enter makes its note the active tab. A Space keydown on a row's circle button is not handled by the list (`defaultPrevented` stays false, no IPC from the key handler).
- [ ] `TasksView.test.ts`: only the current row's circle has `tabindex="0"`; every other row's circle and links have `tabindex="-1"`.
- [ ] `TasksView.test.ts`: Space completes the focused row under the Open filter; after the refetch, focus is on the row that followed it. Completing the last row moves focus to the one before it. Unmount and mount again: focus returns to that row.
- [ ] `TasksView.test.ts`: with focus on an element outside the view when the first rows arrive, focus stays there.
- [ ] `tasks.store.test.ts`: the current-row getter and `reset()`.
- [ ] `src/tests/lib/app/commands.test.ts` covers the new command with the real tasks service for this case: the label flips with the store, and the action changes `tasksStore.quick` and makes the Tasks tab the active tab in `editorStore`.
- [ ] e2e: pressing Space with focus on a row's circle toggles that task exactly once.
- [ ] `help/documentation/10-tasks-and-todoist.md` and `help/documentation/20-keyboard-shortcuts.md` list the Tasks view keys and the palette command, and say that `/` opens the vault search, not the Tasks search box (PRD A12).

## Notes

- **Size:** M.
- Run in series with the other Tasks view Issues (see 108).
- No `isTypingTarget` move is needed any more: the handler only sees keys from the list.
- Shift+F10 and the ContextMenu key open the row menu in Issue 241, which extends `resolveTaskKey` and its `shift` field.
- Doc 10 embeds `screenshots/tasks-view.png`, and no such file exists under `help/`. Out of scope here; the owner knows.

## Comments

- 2026-11-10: the Todoist trigger bullet, the `tasks:sync-todoist` command and the Todoist parts of the criteria were removed: `todoist-bisync` Issue 15 deleted `TodoistPopover.svelte`, `todoist.service.ts` and `initTodoist`, and the two-way sync has its own palette commands. The keyboard and a11y work is unchanged.
- 2026-11-12: rewritten from the Tasks view UX review: grid-style tab order, focus guard, no typing check, `shift` in the key input.
