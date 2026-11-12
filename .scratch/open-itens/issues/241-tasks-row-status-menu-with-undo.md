# 241: Change a task's status from its row, with Undo

**Origin:** Tasks view UX research, 2026-11-12 (`.scratch/tasks-view-ux/research/`, `synthesis.md` T09, `critique.md` D10 and D15). The status part of Issue 122, carved out because it needs no Rust change. Issue numbers in this text are open-itens numbers.

**What to build:** The circle only flips between open and done. Each row gets a menu that sets any of the common statuses, opens the note at the task, or copies the task text, and every status change can be undone from a toast.

- **Row action button.** Each row ends with an always-visible button (`MoreHorizontal`, `aria-label="Task actions"`, never `opacity-0`). Right click on the row opens the same menu. With focus on a row, Shift+F10 and the ContextMenu key open it too: `resolveTaskKey` (Issue 113) gains `{ kind: 'menu' }`.
- **Menu items** (a `DropdownMenu` from `#lib/components/ui/dropdown-menu/` with the same items in a `ContextMenu` for right click):
  - Open at line: `openNoteAt(filePath, { kind: 'line', line })`, as a click on the text does.
  - Copy task text: the raw `task.text` to the clipboard.
  - Status: a radio group Todo, In progress, Done, Cancelled, with the row's current status checked.
- **The write.** A `setTaskStatus(filePath, task, target)` in `tasks.service.ts` runs the protocol `toggleTask` already runs: save a dirty open tab first and refuse when the line moved; call `toggle_task_status` with `expectedText`, `expectedStatus` and `target` (the command already accepts any target status); on `stale`, refetch and show the existing "changed on disk" message, writing nothing; on success, `afterTaskWrite`. `toggleTask` becomes `setTaskStatus(filePath, task, toggleTarget(task.status))`, so the two paths cannot drift. Choosing the current status writes nothing.
- **Undo.** A successful status change from the menu shows a toast with an Undo action (the pattern `event-calendar.service.ts` uses). Undo calls `setTaskStatus` with the previous status as the target and the new status and text as expected. Only the last write from the view can be undone: a newer write replaces the toast.
- **Todoist.** A status change on a line with a Todoist anchor reaches Todoist on the next sync as a close or reopen, and so does an Undo; an Undo after a sync already ran sends a second change. This needs no code. The help page says it.

**Blocked by:** 240

**Status:** ready-for-agent

**Answered:** carve status changes out of Issue 122 into this Issue, frontend only (owner, 2026-11-12, synthesis Q7 (a)). PRD A7: row edits cover status, due and priority, with no done-date stamp and no recurrence spawn (owner, 2026-11-06).

**Gate:** frontend only: `pnpm check` + `pnpm vitest run`, plus `bash scripts/e2e.sh` because the row gains a button the spec's row locators see.

- [ ] Failing test first, `tasks.service.test.ts` with real stores, mocking only `invoke`: `setTaskStatus(path, task, 'in-progress')` on a todo task sends `toggle_task_status` with `expectedStatus: 'todo'`, `target: 'in-progress'` and the raw text; a `stale` result refetches and writes nothing more. Fails today (the function does not exist).
- [ ] `tasks.service.test.ts`: the circle path still sends `target: 'done'` for an open task and `'todo'` for a closed one, through `setTaskStatus`.
- [ ] `TasksView.test.ts`: the row's Task actions button opens the menu with the current status checked; choosing Cancelled sends that target; the toast's Undo sends the previous status with `expectedStatus: 'cancelled'`.
- [ ] `TasksView.test.ts`: Shift+F10 on a focused row opens the menu; right click on the row opens the same items.
- [ ] `help/documentation/10-tasks-and-todoist.md` describes the row menu, Undo, and the Todoist line above (PRD A12).

## Notes

- **Size:** S to M.
- Run in series with the other Tasks view Issues (see 108). It needs Issues 110, 237 and 113; the edge on 240 keeps the runs in order.
- Due and priority from the same menu stay in Issue 122 (Rust, `needs-triage`).
- A task closed from the view vanishes at once under the Open filter, as today. Keeping it visible, dimmed, until the filter changes was proposed (synthesis T15) and left out.
