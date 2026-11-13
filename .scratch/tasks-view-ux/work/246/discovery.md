# 246 discovery: Due and Priority in the Tasks row menu, with Undo

No `spec.md` in `.scratch/tasks-view-ux/`; the Issue is the spec. Repeats 241's menu write + Undo (`work/241`) and 244's overlay (`work/244`); only the differences are listed. 122 delivered `write_task_text` (`contracts/commands.ts:125`), `TaskTextWriteResult.task`, `setDueToken` / `setPriorityToken` (`utils/task-tokens.ts:108,122`) and the e2e mock `writeTaskText` (`e2e/mocks/vault-index.ts:619`).

## Files that change
- New `src/lib/features/tasks/task-row-edit.logic.ts`: `resolveDuePreset` (via `formatDateWithOffset`), `PRIORITY_SIGNIFIERS` (five levels), `prioritySignifier(p)` (null for none), `priorityMenuLabel(p)`.
- `task-query.logic.ts:195-202,244`: `TaskOverlayEntry.metadata?`; `buildTaskRows` uses `written?.metadata ?? task.metadata`.
- `tasks.service.ts:213-271`: dirty-tab block (:222-235) becomes private `preflightTaskWrite(filePath, lineNumber)`; new `updateTask` (`write_task_text`, `vaultRelativeKey`, prompt flag rules, stale / throw copy); `afterTaskWrite` (:326) takes optional `metadata`; the toast body of `setTaskStatusFromMenu` (:295-315) becomes a private `holdUndoToast` shared with new `updateTaskFromMenu`.
- `TasksView.svelte:555-567`: `rowMenuItems` gains `Menu.Sub` Due (Today, Tomorrow, In a week, Pick a date, Clear when `metadata.dueDate`) and Priority (radio group, `metadata.priority ?? 'none'`); one view-level `Dialog` with `Input type="date"`; `handleRowMenuCloseFocus` (:447) also treats focus inside `[role="dialog"]` as free, and the dialog's `onCloseAutoFocus` reuses it.
- `e2e/specs/tasks-view.spec.ts`: Due > Today test under the 2026-11-05 clock block.
- `help/documentation/10-tasks-and-todoist.md:149-155`: Due and Priority items, Undo, Todoist effect.

## Tests (prior art)
- New `task-row-edit.logic.test.ts` (pure).
- `tasks.service.test.ts`: `setTaskStatus` / "from the menu" blocks (:827-1045) and the overlay fake Rust (:1141-1311) copied for `write_task_text`.
- `task-toggle-dirty-buffer.test.ts`: fake gains `write_task_text`; three `updateTask` cases beside the toggle ones.
- New `TasksView.row-edit.test.ts` on `tasks.fixture.ts`; `mockTaskFetch` gains an optional `writeText` answer (as `toggle`). Copy helpers from `TasksView.row-menu.test.ts`.
- `TasksView.row-menu.test.ts`: the three exact item lists gain `Due`, `Priority` (sub-triggers are `menuitem`s).

## Defaults taken
1. Toast text uses the raw ISO date: `Due set to 2026-11-06`.
2. Picking the checked priority writes nothing (view returns before `updateTask`), as bits-ui re-fires `onValueChange`.
3. A status write on a line whose overlay entry carries `metadata` with the same text keeps that metadata, so a circle click after a due edit does not bring back the pre-edit chip.
4. A note outside the open vault (`vaultRelativeKey` null) or no vault open: `updateTask` throws into its catch (`Failed to save task change.`).
5. Pick a date's Save is disabled while the input is empty.

## Risks
- `typeof DropdownMenu | typeof ContextMenu` union for `Sub*` may not type-check; fallback is two literal blocks.
- jsdom submenu open: `openMenu` (pointerdown) may not open a sub-trigger; fall back to ArrowRight on the focused sub-trigger and say so in the delivery comment.
- Menu close focus and dialog open focus fire in the same turn; the dialog must win.
