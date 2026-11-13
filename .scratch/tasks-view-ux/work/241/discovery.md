# 241 discovery: row status menu with Undo

No `spec.md` in `.scratch/tasks-view-ux/`; the Issue is the spec. Builds on 110 (fixture, glyphs), 113 (keys, focus), 234 (reset generation), 240 (tab stop); see `work/113`, `work/240`.

## Files that change

- `src/lib/features/tasks/tasks-keys.logic.ts:30,44-63`: `TaskKeyAction` gains `{ kind: 'menu' }`; `resolveTaskKey` checks Shift+F10 / bare ContextMenu (onRow, count > 0) before the modifier guard.
- `src/lib/features/tasks/task-status.logic.ts`: `ROW_MENU_STATUSES` (todo, in-progress, done, cancelled in `TASK_STATUSES` order) and `statusMenuLabel(status)` (capitalized `statusGlyph(status).word`), shared by the view and the toast text.
- `src/lib/features/tasks/tasks.service.ts:158-224,284-289`: `setTaskStatus` takes `toggleTask`'s body (equal-status return first, then `dismissStatusUndo()`, dirty-tab block, IPC with `target`, new refusal copy, returns true only on a changed write); `toggleTask` delegates with `toggleTarget`; `setTaskStatusFromMenu` captures `tasksResetGeneration`, shows the Undo toast (one module-level id, guarded dismiss); `resetTasks` dismisses it.
- `src/lib/features/tasks/TasksView.svelte`:
  - `taskRow` (:573-659): trailing always-visible `Ellipsis` `DropdownMenu` trigger (`data-task-actions`, roving tabindex), one Root per row; row `oncontextmenu` sets the context row.
  - list container (:860-890): wrapped in one `ContextMenu.Trigger` `child` snippet, suppresses outside `[data-task-row]`.
  - one `rowMenuItems(Menu, row)` snippet rendered in both contents (bits-ui ContextMenu and DropdownMenu items are the same `menu/*` components); Open at line, Copy task text, status radio group.
  - `handleListKeydown` (:349-374): `menu` action clicks the row's `[data-task-actions]`.
  - `onCloseAutoFocus` handler on both contents.
- `help/documentation/10-tasks-and-todoist.md:123-146`: row menu, Undo, Todoist rule, keyboard rows.
- Tests: `tasks.service.test.ts` (callable sonner mock), `task-toggle-dirty-buffer.test.ts` (copy), `tasks-keys.logic.test.ts`, `task-status.logic.test.ts`, new `TasksView.row-menu.test.ts` on `tasks.fixture.ts`. Prior art: `TasksView.keyboard.test.ts` (setup, `statefulTasks`), `EventPopover.test.ts` `settleUnmount`, `NoteRowMenu.test.ts` clipboard.

## Defaults taken

1. Opening a row's menu (either kind) makes that row the current row, as focus on a control in the row does. A pointer-opened menu never focuses its trigger (bits-ui prevents it), so without this the Open-filter fallback would read the previous current row (A) instead of B's neighbour (C) when the refetch lands before the menu unmounts, which it does (IPC in microtasks, unmount after a frame).
2. `onCloseAutoFocus` always calls `preventDefault()`; when focus sits outside the view and outside any `[role="menu"]` it focuses nothing, so the bits-ui default does not pull focus back to the trigger either.
3. The menu's first two items carry `inset` so their text lines up with the radio items; no icons.
4. A `writeText` rejection only toasts (no `error()` log): nothing for Sentry.

## Risks

- A union-typed snippet parameter (`typeof DropdownMenu | typeof ContextMenu`) may not type-check; fallback is two literal blocks plus a same-labels test (the Issue allows it).
- The list container gets the trigger's `tabindex="-1"`: a click on its blank area focuses the container. `focusIsFree` already treats any element inside the list (itself included) as free.
- Sonner may call `onDismiss` for a toast after a newer one is held; `forget` clears the id only when it matches.
