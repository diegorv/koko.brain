# 58: WeekStrip above the day view

**What to build:** the prototype's WeekStrip above the day view: the seven days of the current week, the selected day marked, click to switch day.

**Blocked by:** None

**Status:** ready-for-agent

- Prototype parity row "Day view: The WeekStrip above day view is deferred (follow-up)".
- Plan: `.scratch/calendar-feature/plan-2026-10-28.md`, deleted by ticket 37; read it with `git show c0103ff5:.scratch/calendar-feature/plan-2026-10-28.md`.

- [ ] Strip renders in day view only, follows the week-start setting, and changes the day on click and by keyboard
- [ ] ARIA as the day headers (`aria-pressed`)
- [ ] Component test and an E2E click

## Comments

- 2026-10-28 17:45 — discovery — new EventWeekStrip above the day-view grid, aria-pressed buttons over weekDays(weekStartsOn) — b41e9b0c
- 2026-10-28 17:48 — implement — EventWeekStrip in day view, component + view tests green (event-calendar 19 files, 702 tests), pnpm check 0 errors; E2E at e2e/specs/event-calendar-week-strip.spec.ts not run here — 5434b264
