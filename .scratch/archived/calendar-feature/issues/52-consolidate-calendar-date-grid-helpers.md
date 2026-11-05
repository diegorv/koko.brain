# 52: One set of calendar date and grid helpers

**What to build:** the date and month-grid helpers duplicated across `plugins/calendar`, `features/collection` and `features/event-calendar` live in one place (`utils/` when pure).

**Blocked by:** 60

**Status:** needs-triage

- Candidates: `features/event-calendar/event-calendar-dates.logic.ts`, `features/collection/calendar.logic.ts`, `features/collection/linear-calendar.logic.ts`, `plugins/calendar/*`.
- Open: which helpers are truly identical (week start, ISO week, date keys) and which differ on purpose. Do ticket 60 (collection time-of-day defects) first or together, so the move does not freeze a bug.

- [ ] Inventory of duplicates with a keep/merge decision per helper
- [ ] If accepted: shared helpers with their tests, callers migrated, no behavior change
