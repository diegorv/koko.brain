# 113: Keyboard navigation and accessible rows

**Origin:** `tasks-view` Issue 10, moved here on 2026-11-08. Its PRD, raw evidence and closed siblings stay in `.scratch/archived/tasks-view/`. Bare Issue numbers in the text below use that feature's numbering; `priority-2026-11-08.md` in this folder maps them to the numbers here.

**What to build:** The task list has no keyboard model beyond tabbing through buttons, the task text is a static element with a click handler (the `svelte-ignore` at `TasksView.svelte:216` silences the a11y warnings). PRD assumption A8.

- **Roving focus over rows**, following the calendar keys pattern (`src/lib/features/event-calendar/event-calendar-keys.logic.ts`). Each row element is the focus stop: `tabindex="0"` on the active row (the first visible row until the user moves) and `tabindex="-1"` on the others, with `data-task-row` on each. The circle and the wikilinks inside a row keep their own tab order and native activation.
- A pure `resolveTaskKey(input)` in `src/lib/features/tasks/tasks-keys.logic.ts`, with `input = { key: string; typing: boolean; onRow: boolean; meta: boolean; ctrl: boolean; alt: boolean; index: number; count: number }`, returns `{ kind: 'focus'; index: number } | { kind: 'toggle' } | { kind: 'open' } | null`: ArrowDown and ArrowUp move by one and stop at the ends, Home and End go to the first and last row, Space toggles, Enter opens the note at the task's line (as Issue 01's click does). It returns `null` when `typing` is true, when `onRow` is false (the key landed on a control inside the row, so Space or Enter on the circle or a wikilink keeps its native click and does not run twice), or when Meta, Ctrl or Alt is held.
- One `keydown` handler on the list container calls it with `typing: isTypingTarget(e.target)`, `onRow: e.target` has `data-task-row`, and `index`/`count` over the rows currently rendered, in DOM order across groups and skipping collapsed groups (Issue 08). On a non-null action it calls `preventDefault()`. Popovers and dialogs render in a portal outside the list, so their keys never reach this handler; that is the popover and dialog check.
- `isTypingTarget` (`event-calendar-keys.logic.ts:80`) moves to `src/lib/utils/typing-target.ts` with its `TYPING_TAGS` set (`:73`), and its importers use it from there: the calendar (`EventCalendarView.svelte:26`) and `src/lib/app/global-keybindings.ts:11`. Its tests move from `event-calendar-keys.logic.test.ts:24-40` to `src/tests/lib/utils/typing-target.test.ts`. `features/tasks` then imports nothing from `event-calendar`.
- **Roles and names.** Each group's row container has `role="list"` and `aria-label` set to the group label; each row has `role="listitem"`. The circle's `aria-label` becomes `Mark task as done: <description> (<word>)` or `Mark task as not done: <description> (<word>)` (Issue 05's label with the description added). The `svelte-ignore` at `:216` goes once the text span no longer needs it (the span keeps its click; the row is the keyboard path). Any toggle button left in the toolbar carries `aria-pressed`; the dropdown triggers of Issues 07 and 08 are not toggles.
- The Tasks tab focuses its search box (Issue 07) on mount (`TasksView` mounts each time the tab becomes active, `EditorView.svelte:71-72`).
- **Palette commands** in `getBuiltInCommands` (`src/lib/app/commands.ts:93`), next to `tasks:toggle` (`:190-197`), category `Navigation` like it:
  - `tasks:status-filter`: label `Tasks: Show all statuses` when `tasksStore.quick.show` is `open` and `statuses` is empty, else `Tasks: Show open only` (the store is read while the list is built, as `railGoToCommands` does at `:52-58`). The action sets `show` to `all` or `open`, clears `statuses`, and calls `openTasksTab()` so the change is visible.

**Blocked by:** 112

**Status:** ready-for-agent

**Gate:** frontend only: `pnpm check` + `pnpm vitest run`, plus `bash scripts/e2e.sh` because the circle's accessible name changes (the spec matches it by substring).

- [ ] Failing test first, `src/tests/lib/features/tasks/tasks-keys.logic.test.ts`: ArrowDown/ArrowUp (including at the ends), Home, End, Space and Enter map to the right action and index; every key maps to `null` with `typing: true`, with `onRow: false`, and with Meta held.
- [ ] `TasksView.test.ts` with real stores: focus the first row and press ArrowDown: focus moves to the second row; Space there invokes `toggle_task_status` for that row's path and line; Enter makes its note the active tab; Space with focus on a row's circle button invokes `toggle_task_status` once, not twice; Space inside the search box toggles nothing (the section-tag textbox goes away in Issue 13, so do not test against it).
- [ ] The calendar keys tests still pass after the move of `isTypingTarget`.
- [ ] `src/tests/lib/app/commands.test.ts` covers the new command: the status label flips with the store, and the action changes `tasksStore.quick` and opens the Tasks tab.

## Notes

- **Size:** M.
- Moving `isTypingTarget` keeps `feature-cycle.test.ts` from seeing a `tasks -> event-calendar` pair; Issue 06 adds the `event-calendar -> tasks` pair.

## Comments

- 2026-11-10: the Todoist trigger bullet, the `tasks:sync-todoist` command and the Todoist parts of the criteria were removed: `todoist-bisync` Issue 15 deleted `TodoistPopover.svelte`, `todoist.service.ts` and `initTodoist`, and the two-way sync has its own palette commands. The keyboard and a11y work is unchanged.
