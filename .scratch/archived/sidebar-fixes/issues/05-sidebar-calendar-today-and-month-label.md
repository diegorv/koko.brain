# 05: Sidebar calendar: today moves at midnight, month-label double-click opens nothing twice

**What to build:** two small bugs in the sidebar month grid.
1. The "today" ring is computed once per month change, so an app left open overnight keeps highlighting yesterday. It follows the real date, like the Calendar tab's live clock.
2. The month label has a click (open the monthly note) and a double-click (go to today) on the same element, so a double-click first opens or creates the monthly note twice, racing `create_note`. A double-click must not create or open the monthly note twice.

**Blocked by:** none

**Status:** resolved

**Source:** left sidebar UX discovery on branch `docs/ux-sidebar-discovery` (`.scratch/ux-sidebar/discovery-2026-10-31.md`, detail in `work/0N-*.md`; read it with `git show docs/ux-sidebar-discovery:<path>`). Re-verify each claim against current `main` before changing code. Findings: `work/04-calendar-mode.md` F3 and F10.

- [x] Test first: after the clock passes midnight, the today cell moves without changing month
- [x] Double-clicking the month label opens the monthly note at most once and never creates it twice; going to today still works
- [x] A single click on the month label still opens the monthly note

## Comments

- 2026-10-31, branch `issue/05-sidebar-calendar-today-and-month-label`: `CalendarPanel` holds `acquireCalendarClock()` and passes `eventCalendarViewStore.todayKey` into `buildMonthGrid`, so the today ring moves at midnight without changing month; the month label's click handler skips clicks with `detail > 1`, so a double-click opens the monthly note at most once and still goes to today. Review round 1: APPROVED (one minor, three nits; the clock-holder comments and the test teardown order fixed, the one-frame remount nit and the double-click product call left as is). Tests: `pnpm check` 0 errors; full suite 346 files, 8423 passed, 1 todo; `pnpm build` ok.
