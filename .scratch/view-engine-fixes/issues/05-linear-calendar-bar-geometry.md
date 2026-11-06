# 05: Linear-calendar bars line up with their day columns

**What to build:** the linear calendar's track has 31 columns (`src/lib/features/collection/CollectionLinearCalendarView.svelte:144`, `:163`, `:189-194`), but `getBarLeft` and `getBarWidth` divide by the month's `daysInMonth` (`:67-73`). In February 2026 a bar for day 28 starts at 27/28 = 96.4% of the track while its column starts at 27/31 = 87.1%, about three cells right. Every month shorter than 31 days drifts.

- Move `getBarLeft` and `getBarWidth` into `linear-calendar.logic.ts` as pure functions and divide by 31.

**Blocked by:** none

**Status:** ready-for-agent

**Gate:** frontend: `pnpm check` + `pnpm vitest run`.

- [ ] Failing test first, `src/tests/lib/features/collection/linear-calendar-logic.test.ts`: February 2026, day 28 gives left `27/31` (87.1%) and width `1/31`; a 30-day month's day 30 gives left `29/31`.

## Notes

- No test checks bar geometry today. Whether the owner uses linear-calendar views is not known.
- **Size:** S.
