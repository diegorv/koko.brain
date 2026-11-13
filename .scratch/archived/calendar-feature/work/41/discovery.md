# Issue 41 discovery: multi-day spans and cross-midnight events

## Files that change
- `src/lib/features/event-calendar/event-calendar.types.ts:23-44, 62-66, 83`: `EventNote.endDate?` and `EventState.endDate?` (the last day of a span; absent for a single-day event). Issue reasons: drop `multi-day`, rename `crosses-midnight` to `end-before-start` (crossing midnight is now valid; the reason only covers an empty or inverted range).
- `event-calendar-event.logic.ts:122-181` `entryToEvent`: read `end_date` (invalid key -> `invalid-time` / `end_date`; before `date` -> `end-before-start` / `end_date`; trailing comment checked). A timed note without `end_date` whose `end` is before `start` ends the next day; `end: 00:00` after a later start is midnight (1440) of the same day, as the form already treats it. `endDate` is set and `readOnly: true` for every note with `end_date` (even the same day) and for a cross-midnight note. `:321-358` `eventState` / `EVENT_STATE_KEY_SET` carry `endDate`, so an undo precondition fails on a note that became a span. `:392-421` `mergePending`: a state-only overlay keeps `readOnly` for a span.
- `event-calendar-view.logic.ts:173-236`: `segmentOnDay(event, day)` clips a span to one day (first day `start..1440`, middle days `0..1440`, last day `0..end`, empty segments dropped). `groupEventsByDay` and `itemsByDay` / `itemsForDay` place a span on every visible day it covers; month chips of continuation days drop the time prefix. New `eventWhenLabel` gives the popover's date and time lines (date range and full duration for a span).
- `event-calendar-form.logic.ts:160-166` `validateDraft`: no time check when `timingLocked` (a cross-midnight event has `end < start`).
- `event-calendar.service.ts:356-367` `patchedState` keeps `endDate`; `:401` `writeEvent` refuses a timing patch on a read-only event (`EventCalendarError('read-only')`), so no write can desync `date` and `end_date`; `:791` restored placeholder keeps `readOnly` for a span.
- `EventPopover.svelte:169-174` uses `eventWhenLabel`. `EventCalendarNeedsAttention.svelte:15-30` reason texts.
- `help/documentation/27-calendar.md:82-108`.
- E2E `e2e/specs/event-calendar.spec.ts`: a two-day all-day span in week and month view, and a cross-midnight timed event on both day columns.

## Plan
1. Logic (types, projection, segments, form, overlay) test-first in the logic tests; rendering components pick the segments up through the view logic they already call.
2. Popover label, service guard and restore placeholder, help doc, E2E.

## Prior art
- `event-calendar-event.logic.test.ts` issue-reason table; `event-calendar-view.logic.test.ts` grouping and month chip cases; `event-calendar.service.test.ts` "Retreat" multi-day dialog-edit case; `EventPopover.test.ts` mount tests.

## Risks
- Same `data-event-path` on several day columns: every per-day `{#each}` is keyed by path within its own day, so keys stay unique. `querySelector` lookups by path take the first segment (popover anchor), which is fine.
- Timed spans render in the time grid (full-height middle days), not in the all-day lane.

## Defaults taken
- Spans stay read-only (no drag, resize or time edit; the dialog's notice explains why), which the Issue allows and ticket 59 assumes. Title, color and location edits still write.
- `end_date` with a `start` and no `end` ends at 24:00 of `end_date`. An all-day span ignores `start` / `end`.
- `end_date` equal to `date` is a single-day event, still read-only (a date move would desync it).
