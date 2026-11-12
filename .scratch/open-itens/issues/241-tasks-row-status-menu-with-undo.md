# 241: Change a task's status from its row, with Undo

**Origin:** Tasks view UX research, 2026-11-12 (`.scratch/tasks-view-ux/research/`, `synthesis.md` T09, `critique.md` D10 and D15) and its review. The status part of Issue 122, carved out because it needs no Rust change. Issue numbers in this text are open-itens numbers.

**What to build:** The circle only flips between open and done. Each row gets a menu that sets any of the common statuses, opens the note at the task, or copies the task text, and a status change from the menu can be undone from a toast.

- **Row action button.** Each row ends with an always-visible button (`MoreHorizontal`, `aria-label="Task actions"`, never `opacity-0`), in the row's roving tab order (Issue 113). Right click on a row opens the same menu: one `ContextMenu` around the list that reads the row under the pointer, as `src/lib/features/note-list/NoteRowMenu.svelte` does, not one menu instance per row. With focus on a row, Shift+F10 and the ContextMenu key open it too: `resolveTaskKey` (Issue 113) gains `{ kind: 'menu' }` for those two keys (its `shift` field already exists).
- **Menu items** (a `DropdownMenu` from `#lib/components/ui/dropdown-menu/` on the button, and the same items in the `ContextMenu`):
  - Open at line: `openNoteAt(filePath, { kind: 'line', line })`, as a click on the text does.
  - Copy task text: the raw `task.text` without its trailing block id and Todoist anchor (Issue 109's stripping), so pasting it never duplicates a `🆔 td-` anchor (ADR-0037 freezes a link whose anchor sits on two lines).
  - Status: a radio group Todo, In progress, Done, Cancelled, with the row's current status checked.
- **The write.** A `setTaskStatus(filePath, task, target)` in `tasks.service.ts` runs the protocol `toggleTask` already runs: save a dirty open tab first and refuse when the line moved; call `toggle_task_status` with `expectedText`, `expectedStatus` and `target` (the command already accepts any target status and does nothing when the target equals the current one); on `stale`, refetch and show the existing "changed on disk" message, writing nothing; on success, `afterTaskWrite`. `toggleTask` becomes `setTaskStatus(filePath, task, toggleTarget(task.status))`, so the two paths cannot drift. The refusal messages become caller-neutral ("...so the list was refreshed. Try again."), and the tests that pin the old "Click it again" copy change on purpose. Choosing the current status writes nothing.
- **Undo, menu writes only.** A successful status change from the menu shows a toast with an Undo action, following `event-calendar.service.ts`'s Undo toast: Undo calls `setTaskStatus` with the previous status as the target and the new status and text as expected. Only the last menu write can be undone: a newer write from the view, menu or circle, dismisses the toast. `resetTasks()` dismisses it on a vault switch, and an Undo whose vault generation (Issue 234's reset generation) is stale is refused and writes nothing: `toggle_task_status` writes any absolute path, so a late Undo would otherwise write into the previous vault. The circle and Space stay without a toast (owner decision below).
- **Focus.** When the menu closes, focus returns to the row it was opened from. After a menu write or an Undo removes the row (Done or Cancelled under the Open filter), Issue 113's current-row rule picks the next row, and focus moves to it while `document.activeElement` is `<body>` or inside the view.
- **Todoist.** On a line with a Todoist anchor, a change between an open status (todo, in progress) and a closed one (done, cancelled) reaches Todoist on the next sync as a close or reopen, and so does an Undo; an Undo after a sync already ran sends a second change. A change between two open or two closed statuses does not reach Todoist (`isClosedStatus` in `todoist-sync`). This needs no code. The help page says it.

**Blocked by:** 240

**Status:** ready-for-agent

**Answered:** carve status changes out of Issue 122 into this Issue, frontend only (owner, 2026-11-12, synthesis Q7 (a)). Undo only for menu writes; the circle and Space keep no toast (owner, 2026-11-12). PRD A7: row edits cover status, due and priority, with no done-date stamp and no recurrence spawn (owner, 2026-11-06).

**Gate:** frontend only: `pnpm check` + `pnpm vitest run`, plus `bash scripts/e2e.sh` because the row gains a button the spec's row locators see.

- [ ] Failing test first, `tasks.service.test.ts` with real stores, mocking only `invoke`: `setTaskStatus(path, task, 'in-progress')` on a todo task sends `toggle_task_status` with `expectedStatus: 'todo'`, `target: 'in-progress'` and the raw text; a `stale` result refetches and writes nothing more. Fails today (the function does not exist).
- [ ] `tasks.service.test.ts` and `task-toggle-dirty-buffer.test.ts`: the circle path still sends `target: 'done'` for an open task and `'todo'` for a closed one, through `setTaskStatus`; the dirty-buffer cases keep their meaning with the new message copy.
- [ ] `TasksView.test.ts`: the row's Task actions button opens the menu with the current status checked; choosing Cancelled sends that target; the toast's Undo sends the previous status with `expectedStatus: 'cancelled'`; a circle click after it dismisses the toast.
- [ ] `TasksView.test.ts`: switch vaults (`resetTasks()`), then click Undo: no `toggle_task_status` is sent.
- [ ] `TasksView.test.ts`: Shift+F10 on a focused row opens the menu; closing it returns focus to that row; right click on the row opens the same items. Copy task text puts `Call Ana` on the clipboard for `Call Ana 🆔 td-123 ^abc`.
- [ ] `help/documentation/10-tasks-and-todoist.md` describes the row menu, Undo, and the Todoist rule above (PRD A12).

## Notes

- **Size:** S to M.
- Run in series with the other Tasks view Issues (see 108). It needs Issues 110, 113 and 234; the edge on 240 keeps the runs in order.
- Due and priority from the same menu stay in Issue 122 (Rust, `needs-triage`). "Open in Todoist" joins this menu in Issue 129.
- A task closed from the view vanishes at once under the Open filter, as today. Keeping it visible, dimmed, until the filter changes was proposed (synthesis T15) and left out.
