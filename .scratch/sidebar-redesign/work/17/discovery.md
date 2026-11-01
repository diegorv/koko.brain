# Issue 17 discovery: Calendar navigator and day lens

No `spec.md`; the source is `PRD.md` (Navigators: Calendar, Lenses: Day, Persistence, Code placement, Q2). Builds
on `work/12` / `work/14` (navigator pane in AppShell, `layout.rail*` picks) and the registry from Issue 07
(`rail-registry.store.svelte.ts`, Kanban's folder creator as the wiring prior art). Only the differences are listed.
Periodic-note entries and "Open Calendar tab" are Issue 18: out of scope.

## Files that change
- `rail-shell/rail-shell.types.ts:103-123`: `RailNavigator.lens()` (the navigator's current pick, read reactively);
  `RailLensProvider.headerAction?` (label, icon, `run(lens)`) for the header's Daily note.
- `rail-shell/lens.logic.ts:93-140`: `restoreRailItem(saved, navigators)` accepts a registered navigator id and
  returns its `lens()`; export `toLensNote` and `entryNoteDate` (the subtitle's note-date call) for the day lens.
- `rail-shell/Rail.svelte:41-44`: registered navigators render between Types and Files (PRD order).
- `rail-shell/RailNoteList.svelte`: header button from the provider's `headerAction` (failure toasts).
- `core/layout/AppShell.svelte:110-140,206-235`: a registered navigator item shows its `component` in the
  navigator pane; the note list gets its `lens()`.
- `core/settings/settings.types.ts`, `settings.store.svelte.ts`: `layout.railDay: string | null` (default null).
- NEW `plugins/calendar/day-lens.logic.ts`: `DAY_LENS_KIND`, `parseRailDay`, `pickedDayLens`, `resolveDayLens`
  (system folder out, note date === day, newest change first, label `formatDateLabel`, rule
  `note date is <day>`), `noteDateCounts` (same rule, so dots equal the list lengths), `dayNewNoteRule` (plain
  note in the Cmd+N folder with `date: <day>`).
- NEW `plugins/calendar/CalendarNavigator.svelte`: « < Month Year > » over `calendarStore` month state,
  `CalendarGrid` with `weekStartsOn`, `acquireCalendarClock` + `todayKey`, dots from `noteDateCounts`; a day
  click writes `layout.railDay`.
- NEW `plugins/calendar/calendar-rail.service.ts`: `registerCalendarRail()` registers the navigator and the
  day lens provider (headerAction = `openOrCreatePeriodicNoteForDate('daily', day)`); one unregister.
- `core/app-lifecycle/app-lifecycle.service.ts:244-255`: added to `unregisterNoteChangeConsumers` list.

## Plan (test-first)
1. `day-lens.logic.test.ts`: exactly the day's notes (date > created > disk), system folder out, empty, bad
   saved day; counts equal list lengths; New here rule writes `date`.
2. `lens.logic.test.ts`: `restoreRailItem` with a registered navigator; `Rail.test.ts` order with Calendar.
3. `settings.service.test.ts`: default + round trip of `railDay`.
4. `CalendarNavigator.test.ts`: week start, today moves at midnight (fake timers), dots, pick writes setting.
5. `calendar-rail.service.test.ts` + lifecycle test: registered at open, gone at teardown; header Daily note
   calls the periodic service (mocked), error path.
6. `RailNoteList.test.ts`: provider header action rendered and run; failure toasts.

## Defaults taken
- No saved day: today (the live clock). A picked day never goes stale, so no restart fallback check.
- Archived notes stay in the day lens (the Lenses table sets no archived rule for Day); system folder excluded.
- Month label click goes to today's month (monthly note entry is Issue 18); week numbers keep opening weekly notes.
- The shown month is not persisted (PRD: calendar position out of scope).

## Risks
- AppShell navigator branch covered by E2E only (as 12/14); no E2E added here (Issue has no E2E criterion).
