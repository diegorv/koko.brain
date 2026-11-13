# 54 discovery: Day headers open the periodic daily note

## Files that change

- New `src/lib/features/event-calendar/event-calendar-daily-note.store.svelte.ts`: the bridge. One `$state.raw` slot holding `(day: string) => Promise<void>`; `register(opener)` returns an unregister that clears the slot only while it still holds that opener; `available` getter; `open(day)` returns the opener's promise (rejects when nothing is registered).
- `src/lib/plugins/periodic-notes/periodic-notes.service.ts`: `registerCalendarDailyNoteOpener()` registers `day => openOrCreatePeriodicNoteForDate('daily', dayjs(day))` (plugin to feature import, allowed).
- `src/lib/core/app-lifecycle/app-lifecycle.service.ts:122,159,238-242,543`: register next to the note-change consumers in `initializeVault`, unregister in the entry unwind and in `teardownVault` (core already imports the plugin service at :67).
- `src/lib/features/event-calendar/EventDayHeaders.svelte`: wrap each header button in a div (border moves to it) and add a sibling icon button (`data-daily-note={day}`, NotebookPen) only when `available`. A nested button is invalid, so the header click keeps its select/day-view behavior.
- `src/lib/features/event-calendar/EventMonthGrid.svelte:76-93`: day-number element only (Issue 59 overlap): wrap the day-number button in a `pointer-events-none` row so empty-row clicks still land on the cell, plus the same icon button.

## Plan

1. Bridge store + plugin registration + lifecycle wiring, test-first: new `src/tests/lib/features/event-calendar/event-calendar-daily-note.store.test.ts`; `periodic-notes.service.test.ts` (registered opener calls `openOrCreateNote` with the daily path for that date, unregister clears `available`); `app-lifecycle.service.test.ts` (mock registers a stub into the real store; available after init, gone after teardown).
2. UI: headers + month day number. Tests in `EventTimeGrid.test.ts` and `EventMonthGrid.test.ts`: no button without a registration; with one, the button exists per day, has a label, calls the opener with the day and does not change the selected date/view. New E2E `e2e/specs/event-calendar-daily-note.spec.ts`: click the 2026-11-12 header action, `2026-11-12.md` tab becomes active (not run here; orchestrator runs it).

## Prior art

Registration/unwind: `registerCalendarNoteChangeConsumer` (`plugins/calendar/calendar.service.ts:134`) and the app-lifecycle "registers the collection consumer" test. E2E setup: `openCalendar` in `e2e/specs/event-calendar.spec.ts:97`.

## Risks

- `app-lifecycle.service.test.ts` mocks the periodic-notes service module; the new export must be added to that mock or init throws.
- Errors from the opener: the component toasts (`svelte-sonner`), mirroring `EventCalendarView.svelte:136`.

## Defaults taken

- "Periodic notes enabled" means the plugin registered its opener (there is no enable setting for periodic notes).
- The action is a separate icon button beside the date ("a link beside it"), not a change to the header click, which already selects and opens day view.
- Icon is muted, full opacity on hover/focus; always present when available.
