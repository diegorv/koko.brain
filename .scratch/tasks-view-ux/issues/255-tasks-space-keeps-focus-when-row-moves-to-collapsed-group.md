# 255: Space keeps focus in the Tasks list when the row moves into a collapsed group

**Origin:** filed by the main session on 2026-11-12 from Issue 240's deliver re-review (`.scratch/tasks-view-ux/work/240/review-2.md`, the minor finding shipped as is). Issue numbers in this text keep the open-itens numbering: the Tasks view Issues live in `.scratch/tasks-view-ux/issues/`, the others in `.scratch/open-itens/issues/`.

**What to build:** With the list grouped by Status and the Done group collapsed, pressing Space on a focused open row completes the task. The row moves into the collapsed Done group, leaves the rendered rows, and focus falls to `<body>`, so the arrow keys stop working until the user clicks the list again. Issue 113's rule should keep focus in the list: when the current row is no longer rendered, the current row moves to the next rendered row (else the previous one), and focus follows when it was in the list. Issue 240 decided a collapse or the 50-row cap is not a removal; this case is different, because the row left its own group's rendered rows by a write, not by a collapse.

- After a write from Space or the circle, when the written row ends up in a collapsed group (or past a group's 50-row cap), the current row becomes the next rendered row in display order, else the previous one, and focus moves to it while `document.activeElement` is `<body>` or inside the view. Reuse Issue 113's `nextCurrentRow` / `tabStopRow` logic in `tasks-keys.logic.ts`; do not add a second fallback.
- Expanding the Done group again does not move focus back.

**Blocked by:** 125

**Status:** resolved

**Gate:** frontend only: `pnpm check` + `pnpm vitest run`.

- [x] Failing test first, in the Tasks collapse or keyboard component test file with the real stores and Issue 110's fixture: grouped by Status with Done collapsed, focus an open row and press Space; after the refetch, focus is on the next open row (or the previous one when it was the last), not on `<body>`. Fails today.
- [x] A logic test in `tasks-keys.logic.test.ts` covers a current row that leaves the rendered set by moving into a collapsed group.
- [x] Clicking a chevron to collapse a group still moves no focus (Issue 240's rule), and its existing tests stay green.

## Notes

- **Size:** S.
- Runs after 125, which edits the same `TasksView.svelte`.

## Comments

- 2026-11-12: filed by the main session.
- 2026-11-12: delivered from branch issue/255-tasks-space-keeps-focus-when-row-moves-to-collapsed-group. TasksView's focus-follow effect now moves focus and the current row to the neighbour when a write hides the current row in a collapsed group (`nextCurrentRow` fed the rendered lists); chevron collapse still moves no focus. Tests: component cases for Space and circle click into collapsed Done, logic case in tasks-keys.logic.test.ts. Review fixes: circle-click test added, hidden check named. Full suite at 001ea3390: exit 0, 633 files, 16576 passed, 54 skipped, 1 todo. Reviews: round 1 APPROVED (3 minor/nit findings, 2 fixed, 1 rejected), round 2 APPROVED (no findings).
