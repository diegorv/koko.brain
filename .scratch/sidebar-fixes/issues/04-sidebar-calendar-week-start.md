# 04: The sidebar calendar starts the week on the configured day

**What to build:** the left sidebar month grid follows the Calendar setting `weekStartsOn` (Monday or Sunday), like the Calendar tab already does, so the two month grids agree. Today the sidebar hard-codes Monday.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

**Source:** left sidebar UX discovery on branch `docs/ux-sidebar-discovery` (`.scratch/ux-sidebar/discovery-2026-10-31.md`, detail in `work/0N-*.md`; read it with `git show docs/ux-sidebar-discovery:<path>`). Re-verify each claim against current `main` before changing code. Findings: `work/04-calendar-mode.md` F8.

- [ ] With `weekStartsOn: Sunday` the weekday header and grid start on Sunday; with Monday, unchanged
- [ ] ISO week numbers in the week column stay correct for both settings
- [ ] Changing the setting updates the open sidebar without a restart
- [ ] Logic test first for the grid with each week start
