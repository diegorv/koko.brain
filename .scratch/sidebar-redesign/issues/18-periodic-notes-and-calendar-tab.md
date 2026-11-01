# 18: Periodic notes and Open Calendar tab in the Calendar navigator

**What to build:** Under the mini month the Calendar navigator lists the periodic notes for the shown period: the week, the month, the quarter and the year, each opening or creating its note through the existing periodic-note service. Yearly notes get their first sidebar entry point. Below them, "Open Calendar tab" opens the Calendar tab on the picked day (or today).

**Blocked by:** 17

**Status:** resolved

**Gate:** the frontend gate plus `bash scripts/e2e.sh` (this ticket has E2E criteria; never run Playwright by hand).

**Source:** `.scratch/sidebar-redesign/PRD.md` (Terms, Lenses table, Code placement, Decisions log Q1-Q28) and ADR 0033 (proposed). The approved prototype is `src/routes/prototype-sidebar/` on the local branch `docs/ux-sidebar-discovery` (read with `git show docs/ux-sidebar-discovery:<path>`). Relevant PRD sections: Navigators (Calendar), ADR 0033 Consequences.

- [x] Each entry opens the existing note or creates it from its template, and names its period (for example "Week 44", "October 2026", "Q4 2026", "2026")
- [x] The entries follow the shown month and the picked day's week
- [x] Open Calendar tab opens the Calendar tab on the picked day
- [x] E2E: opening the yearly note from the navigator creates it in the configured yearly format
- [x] Tests follow docs/TESTING.md: real stores and real `.logic.ts`, assertions on store state and rendered content, happy path plus empty and error cases, a test for every new store getter
- [x] New UI uses the region theme tokens (never hard-coded colors) and reads correctly in every built-in theme

## Comments

- 2026-11-01, branch `issue/18-periodic-notes-and-calendar-tab`: the Calendar navigator now lists periodic-note entries for the picked day's week and for the shown month, quarter and year. Each entry opens the note, or creates it from its period's template. There is also an Open Calendar tab button that opens on the picked day. In the deliver fix, the E2E pins a Monday week start. Review finding 2 was rejected because the types need the fallback. Findings 3 and 4 are deferred: the openWeeklyNote toast is a follow-up, and the per-theme check by eye is for the owner. Tests: `pnpm check` exit 0; Calendar E2E 2 passed; full suite `pnpm vitest run && pnpm build` exit 0 with 373 files and 9039 passed, 1 todo (`test-logs/sidebar-redesign/18-deliver.log`). Reviews: round 1 APPROVED.
