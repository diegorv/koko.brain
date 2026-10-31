# 04: The sidebar calendar starts the week on the configured day

**What to build:** the left sidebar month grid follows the Calendar setting `weekStartsOn` (Monday or Sunday), like the Calendar tab already does, so the two month grids agree. Today the sidebar hard-codes Monday.

**Blocked by:** none

**Status:** resolved

**Source:** left sidebar UX discovery on branch `docs/ux-sidebar-discovery` (`.scratch/ux-sidebar/discovery-2026-10-31.md`, detail in `work/0N-*.md`; read it with `git show docs/ux-sidebar-discovery:<path>`). Re-verify each claim against current `main` before changing code. Findings: `work/04-calendar-mode.md` F8.

- [x] With `weekStartsOn: Sunday` the weekday header and grid start on Sunday; with Monday, unchanged
- [x] ISO week numbers in the week column stay correct for both settings
- [x] Changing the setting updates the open sidebar without a restart
- [x] Logic test first for the grid with each week start

## Comments

- 2026-10-31, branch `issue/04-sidebar-calendar-week-start`: `buildMonthGrid` takes a `weekStartsOn` argument and returns weekday headers, week keys and weekend flags; `CalendarPanel` passes `settingsStore.eventCalendar.weekStartsOn`, so the sidebar grid follows the setting live, with ISO week numbers taken from each row's Monday. Review round 1: APPROVED (two nits; the spacing nit fixed, the commit-split nit noted only). Tests: `pnpm check` 0 errors; full suite 346 files, 8419 passed, 1 todo; `pnpm build` ok.
