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
