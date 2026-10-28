# 38: Date helpers match the prototype where ticket 05 guessed

**What to build:** ticket 05 ported `calender-app-design/src/lib/dates.ts` into `src/lib/features/event-calendar/event-calendar-dates.logic.ts` without access to the prototype, and five of its guesses diverge from it. The owner compared both implementations side by side on every date from 2020 to 2030 in 5 time zones (UTC, America/New_York, America/Sao_Paulo, Australia/Lord_Howe, Pacific/Apia). Everything else matched exactly. This ticket brings the five divergences back to the prototype, because ticket 08 builds the header subtitles from `formatWeekday` and `formatRange`, and tickets 22, 23 and 26 port the prototype's call sites literally.

The prototype is at commit `b4a9e8b`, unpacked at `/Users/diegorv/Dev/pet-projects/koko/calender-app-design` (the plan's `/home/user/calender-app-design`).

Fix, matching `calender-app-design/src/lib/dates.ts`:
1. `diffDays(a, b)` returns `b - a` in days (`dates.ts:90`). `diffDays('2026-11-08', '2026-11-14')` is `6`; the port gives `-6`. Keep the rounding that makes a 23 h or 25 h day count as one (plan line 114).
2. `formatLong` has no weekday: `November 10, 2026` (`dates.ts:109`). The prototype popover builds `formatWeekday + ", " + formatLong` (`event-popover.tsx:59`); with the current port that renders `Tue, Tuesday, November 10, 2026`.
3. `formatWeekday` is the long name: `Tuesday` (`dates.ts:119`). The prototype day subtitle is `Week 46 · Tuesday, Nov 10` (`calendar-header.tsx:45`).
4. `formatRange` has no year: `Nov 8 – 14` and `Nov 29 – Dec 5` (`dates.ts:123`, `dates.test.ts:36-38`). The year is already in the header title.
5. Export the constants `MONTHS`, `MONTHS_SHORT`, `WEEKDAYS` and `WEEKDAYS_SHORT` (`"SUN"`..`"SAT"`) (`dates.ts:4-20`). `WEEKDAYS_SHORT` heads the grid columns (`time-grid.tsx:75,116`, `month-view.tsx:51`).

Out of scope: `formatTime` does not wrap outside 0..1440 (the prototype turns -30 into `23:30`, the port gives `-1:-30`). Callers clamp first, and the JSDoc from ticket 05 already documents the 0..1440 range.

**Plan reference:** Task 3 in `.scratch/calendar-feature/plan-2026-10-28.md` (lines 112-125). Line 121 already asked for the prototype's `dates.test.ts:15-59` cases to be ported, which pin items 1 and 4.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

**Touches:**
- `src/lib/features/event-calendar/event-calendar-dates.logic.ts` (modify)
- `src/tests/lib/features/event-calendar/event-calendar-dates.logic.test.ts` (modify)

**Gate:** frontend (`pnpm check` + `pnpm vitest run` + `pnpm build`).

- [ ] `diffDays('2026-11-08', '2026-11-14') === 6`, and the DST cases (2026-03-08, 2026-11-01 in America/New_York) still count whole days
- [ ] `formatLong('2026-11-10') === 'November 10, 2026'`
- [ ] `formatWeekday('2026-11-10') === 'Tuesday'`
- [ ] `formatRange('2026-11-08', '2026-11-14') === 'Nov 8 – 14'` and `formatRange('2026-11-29', '2026-12-05') === 'Nov 29 – Dec 5'`, verbatim from `dates.test.ts:36-38`
- [ ] `MONTHS`, `MONTHS_SHORT`, `WEEKDAYS`, `WEEKDAYS_SHORT` are exported with the prototype's values, each with JSDoc and a test
- [ ] Every prototype case in `dates.test.ts:15-59` is ported verbatim and passes
- [ ] No other export's output changes (the owner's comparison found them identical)
- [ ] Gate green; one commit in the full CLAUDE.md format

## Comments
