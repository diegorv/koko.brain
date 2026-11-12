# 240: Tasks groups collapse and stay collapsed, and long groups show 50 rows

**Origin:** Tasks view UX research, 2026-11-12 (`.scratch/tasks-view-ux/research/`). The collapse and volume part of Issue 112's first draft, split out as `critique.md` D4, D7 and D9 asked. Issue numbers in this text are open-itens numbers.

**What to build:** A long list needs to fold. Groups collapse with a chevron and stay collapsed when you glance at a note and come back, and a group with hundreds of tasks shows the first 50.

- **Collapse.** Each group header (note and other groupings, Issue 112) starts with a chevron button with `aria-expanded` and an `aria-label` of `Collapse <label>` or `Expand <label>`. The title button still opens the note. The collapsed group keys live in the Tasks store, keyed by grouping and group key (for example `note:<filePath>`, `due:overdue`), with a getter and a toggle method. They survive the view's unmount and remount on tab activation. They are not saved across restarts (Issue 123 decides persistence). `tasksStore.reset()` clears them, so a vault switch starts expanded.
- **Keyboard.** Issue 113's roving focus skips the rows of collapsed groups. When the current row's group collapses, the current row moves to that group's chevron button, and focus follows when it was in the list.
- **Volume** (PRD A9). A group shows at most its first 50 rows, then a `Show N more` button (N = the remaining count) that shows all of that group's rows. The expanded-volume state is session-only and resets when the view remounts.

**Blocked by:** 112

**Status:** ready-for-agent

**Answered:** PRD A9: no virtualization, 50 rows per group then "Show N more" (owner, 2026-11-06; kept on 2026-11-12, synthesis Q13).

**Gate:** frontend only: `pnpm check` + `pnpm vitest run`.

- [ ] Failing test first, `TasksView.test.ts` with the real store: collapsing a note group hides its rows and sets `aria-expanded="false"`; unmount and mount again: the group is still collapsed. Fails today.
- [ ] `TasksView.test.ts`: with focus on a row, collapsing its group moves focus to the chevron; ArrowDown from the row above a collapsed group lands on the first row after it.
- [ ] `TasksView.test.ts`: a note with 60 tasks shows 50 rows and "Show 10 more"; clicking it shows all 60.
- [ ] `tasks.store.test.ts`: the collapsed-keys getter, the toggle and `reset()`.
- [ ] `help/documentation/10-tasks-and-todoist.md` mentions collapsing groups and the 50-row cap (PRD A12).

## Notes

- **Size:** S to M.
- Run in series with the other Tasks view Issues (see 108).
- No Collapse all / Expand all: neither the PRD nor the first draft asked for it.
- Sticky group headers are out: whether `position: sticky` works inside the bits-ui ScrollArea viewport is unverified.
