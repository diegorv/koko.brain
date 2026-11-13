# Issue 04 discovery: sidebar calendar follows `weekStartsOn`

## Re-verified on main (F8)

- `calendar.logic.ts:36-46` `buildMonthGrid(year, month)` always backs up to
  the Monday on or before the 1st; `:52` takes `cursor.isoWeek()` of the row's
  first day.
- `CalendarGrid.svelte:16` hard-codes `MON..SUN`; weekend colour is `i >= 5`
  (`:49`) and `di >= 5` (`:59`); week click passes `week[0].dateKey` (`:36`).
- `CalendarPanel.svelte:21` builds the grid from the store year/month only.
- Setting lives at `settingsStore.eventCalendar.weekStartsOn` (0 | 1), type
  `WeekStart` in `features/event-calendar/event-calendar-dates.logic.ts:15`.

## Plan

1. `buildMonthGrid(year, month, weekStartsOn: WeekStart = 1)`: back up to the
   configured first day. Week number and a new `weekKeys[]` (the ISO Monday of
   each row) come from the row's Monday, so a Sunday-first row (Sun..Sat)
   reports the ISO week of its Mon..Sat majority. Add `dayHeaders`
   (`{ label, isWeekend }[]`) and `CalendarDay.isWeekend` so the component no
   longer assumes column 5/6 are the weekend.
2. `CalendarGrid.svelte`: render `grid.dayHeaders`, colour by `isWeekend`,
   week click passes `grid.weekKeys[wi]` (so W{n} opens week n's note, not the
   previous week's for a Sunday row).
3. `CalendarPanel.svelte:21`: pass `settingsStore.eventCalendar.weekStartsOn`
   inside the `$derived`, so a setting change rebuilds the open grid.

## Tests (prior art)

- `src/tests/lib/plugins/calendar/calendar.logic.test.ts` (buildMonthGrid
  block): Sunday-first first cell, headers, week numbers, week keys, weekend.
- `CalendarGrid.test.ts`: header order + week click key for Sunday grid.
- `CalendarPanel.test.ts`: `settingsStore.updateEventCalendar({ weekStartsOn: 0 })`
  after mount changes the first header / first day (pattern from
  `EventWeekStrip.test.ts:53`).

## Risks / defaults

- Default `weekStartsOn = 1` keeps every existing caller and test unchanged.
- Weekly-note click with Sunday start now targets the row's Monday; with
  Monday start it is `week[0]` as before.
- `calendar.logic.ts` (plugin) imports a type from a feature `.logic.ts`:
  allowed (logic may import other `.logic.ts`; plugins may use features).
