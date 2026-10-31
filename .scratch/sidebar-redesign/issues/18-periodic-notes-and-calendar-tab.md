# 18: Periodic notes and Open Calendar tab in the Calendar navigator

**What to build:** Under the mini month the Calendar navigator lists the periodic notes for the shown period: the week, the month, the quarter and the year, each opening or creating its note through the existing periodic-note service. Yearly notes get their first sidebar entry point. Below them, "Open Calendar tab" opens the Calendar tab on the picked day (or today).

**Blocked by:** 17

**Status:** ready-for-agent

**Gate:** the frontend gate plus `bash scripts/e2e.sh` (this ticket has E2E criteria; never run Playwright by hand).

**Source:** `.scratch/sidebar-redesign/PRD.md` (Terms, Lenses table, Code placement, Decisions log Q1-Q28) and ADR 0033 (proposed). The approved prototype is `src/routes/prototype-sidebar/` on the local branch `docs/ux-sidebar-discovery` (read with `git show docs/ux-sidebar-discovery:<path>`). Relevant PRD sections: Navigators (Calendar), ADR 0033 Consequences.

- [ ] Each entry opens the existing note or creates it from its template, and names its period (for example "Week 44", "October 2026", "Q4 2026", "2026")
- [ ] The entries follow the shown month and the picked day's week
- [ ] Open Calendar tab opens the Calendar tab on the picked day
- [ ] E2E: opening the yearly note from the navigator creates it in the configured yearly format
- [ ] Tests follow docs/TESTING.md: real stores and real `.logic.ts`, assertions on store state and rendered content, happy path plus empty and error cases, a test for every new store getter
- [ ] New UI uses the region theme tokens (never hard-coded colors) and reads correctly in every built-in theme
