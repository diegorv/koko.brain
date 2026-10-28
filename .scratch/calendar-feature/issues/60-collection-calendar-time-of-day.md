# 60: Collection calendar views place timed records on the right days

**What to build:** the collection calendar and linear-calendar views place timed events on the right days and do not miss or add a day because of the time component of their dates.

**Blocked by:** None

**Status:** ready-for-agent

- Anchors from the event-calendar plan (Follow-ups), read on the current tree:
  - `src/lib/features/collection/calendar.logic.ts:120-130`: the multi-day loop steps `current` from the start timestamp and stops at `current.getTime() <= endTime`, so a record from day 1 at 10:00 to day 3 at 09:00 is placed on days 1-2 only.
  - `src/lib/features/collection/linear-calendar.logic.ts:147-148`: `yearEnd` is Dec 31 at 00:00, so a record starting Dec 31 at 10:00 is skipped as outside the year.
  - `linear-calendar.logic.ts:175-180`: `lastDay` is the month's last day at 00:00, so a record starting that day after midnight is left out of the month.
- Fix by comparing date keys (day granularity), not timestamps.

- [ ] Failing tests first for each of the three cases above
- [ ] Day-granular comparisons; tests green
