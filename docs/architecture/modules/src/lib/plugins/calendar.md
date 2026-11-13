---
summary: "Calendar rail navigator and Day lens: month grid, periodic-note shortcuts and a list of notes by note date."
---

## Responsibility

Owns the Calendar navigator shown by the rail shell (month grid with week numbers and note-count dots, periodic-note shortcuts for the picked day's week and the shown month, quarter and year, and a button that opens the Calendar tab) and the day lens that lists the notes whose note date is the picked day. It also owns the lens's new-note rule and its daily-note header action. It does not own event data (features/event-calendar), periodic note creation and templates (plugins/periodic-notes), or the rail registry (features/rail-shell). It has no Rust code and calls no Tauri command.

## Key files

- `src/lib/plugins/calendar/calendar-rail.service.ts`: registerCalendarRail registers the navigator and the day lens provider with the rail registry and returns one unregister function.
- `src/lib/plugins/calendar/day-lens.logic.ts`: Day lens rules: parseRailDay, pickedDayLens, resolveDayLens, noteDateCounts for the dots, dayNewNoteRule.
- `src/lib/plugins/calendar/CalendarNavigator.svelte`: Navigator UI: month navigation, grid, periodic-note entries and the Calendar tab button. Reads and writes the picked day through settings.
- `src/lib/plugins/calendar/calendar.logic.ts`: Pure month grid construction, the periodic note entry list and date key and label helpers.
- `src/lib/plugins/calendar/calendar.store.svelte.ts`: Module-level state for the shown year and month, with getter access and navigation methods.
- `src/lib/plugins/calendar/calendar.service.ts`: openOrCreatePeriodicNoteForDate (delegates to periodic-notes) and resetCalendar.
- `src/lib/plugins/calendar/CalendarGrid.svelte`: Presentational month grid with week-number buttons and day cells with note-count dots.

## State

- calendarStore: module-level $state for the shown year and month. Not persisted; resetCalendar resets it to today.
- The picked day is persisted in settingsStore.layout.railDay (written through updateLayout), not in calendarStore. null means today.
- No files, database tables or IPC of its own.

## Collaborators

- `src/lib/core/settings`: Reads layout.railDay, eventCalendar.weekStartsOn and templates.systemFolder, writes layout.railDay, and uses the PeriodType type.
- `src/lib/core/vault`: vaultStore.path locates the note-count dots' entries for the system folder filter.
- `src/lib/plugins/periodic-notes`: openOrCreatePeriodicNoteForDate creates and opens daily, weekly, monthly, quarterly and yearly notes. Allowed plugin-to-plugin import.
- `src/lib/features/event-calendar`: Supplies the live todayKey, the calendar clock (acquireCalendarClock), openEventCalendarTab and the WeekStart type.
- `src/lib/features/rail-shell`: registerNavigator and registerLensProvider in the rail registry, the Lens types, and listEntries and entryNoteDate in lens.logic.ts.
- `src/lib/features/type-definitions`: typeDefinitionsStore.entries and entriesVersion feed the dots. excludeSystemFolder and isListableNote filter entries.
- `src/lib/utils`: parseDateKey validates day keys, buildCaptureFolder computes the new-note folder, and date.ts is imported for its dayjs setup.
- `src/lib/app`: app-lifecycle.service.ts calls registerCalendarRail at vault open and resetCalendar on reset.

## Gotchas

- The rail shell must not import this folder (ADR-0003). registerCalendarRail is the bridge: the app lifecycle calls it and the shell sees only registry entries.
- parseRailDay accepts only a bare YYYY-MM-DD key that round-trips through parseDateKey, because the value comes from settings.json.
- CalendarNavigator re-shows the month of the saved day on mount, since calendarStore holds only the shown month.
- The week shortcut uses the Monday of the picked day's row so it opens the same weekly note as the week-number button of that row.
- Error handling differs by button: openPeriodicEntry toasts on failure, while the week-number click only logs with console.error.
- The note-count dots read typeDefinitionsStore.entriesVersion inside the derived value to depend on the version counter.
