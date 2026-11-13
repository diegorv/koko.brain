# Issue 29 discovery: create, duplicate and delete in the UI

## Files that change
- `src/lib/features/event-calendar/EventDialog.svelte`: `open` (`:27`) and `opened` (`:31-34`) also cover `mode: 'create'` (draft from `draftForCreate` + settings); title "New event" vs "Edit event" (`:103`); create submit calls `createEvent`; edit footer snippet (`:108-110`) gains Delete / Duplicate icon buttons; create footer gets the "Open note after creating" checkbox.
- `src/lib/features/event-calendar/EventForm.svelte`: new `withNotes` prop renders a notes `<textarea>` (classes of `ui/input/input.svelte:44-47`, multi-line) bound to `draft.notes`, before the error line (`:162`).
- `src/lib/features/event-calendar/EventPopover.svelte`: footer (`:158-161`) gains Duplicate and Delete; focus via `lastPath` / `handleCloseAutoFocus` (`:84-101`).
- `src/lib/features/event-calendar/event-calendar.service.ts`: shared UI flows next to `toastEventError` (`:950`): `deleteEventFromUi(path, root)` ("Event deleted" toast with Undo -> `undoDeleteEvent`, focus root after) and `duplicateEventFromUi(path, root)` ("Event duplicated" + copy title, focus copy block after a tick, else root).
- `src/lib/features/event-calendar/EventAllDayLane.svelte`: cell click on empty space (`e.target === e.currentTarget`, `:40-45`) opens create `{ date, allDay: true }`.
- `src/lib/features/event-calendar/EventMonthGrid.svelte`: `ondblclick` on the empty cell (`:58-65`) opens create at `dayStartHour * 60`.
- `src/lib/features/command-palette/command-palette.service.ts`: after `event-calendar:toggle` (`:148-155`), `event-calendar:new-event` and `event-calendar:today`.
- Tests: `EventDialog.test.ts` (create submit, footer Delete/Duplicate, create checkbox), `EventPopover.test.ts` (Duplicate/Delete), `EventMonthGrid.test.ts` (dblclick), `EventTimeGrid.test.ts` or lane test (empty lane click), `event-calendar.service.test.ts` (the two UI flows), `command-palette.service.test.ts` (27 -> 29), `e2e/specs/event-calendar.spec.ts` (create, delete + Undo).

## Plan
- New-event palette command: `openEventCalendarTab()`, `setNow(Date.now())` (the clock only ticks while the view is mounted), `defaultCreateSlot(focusedDate, todayKey, nowMinutes, dayStartHour, defaultDurationMinutes)`, `openDialog({ mode: 'create', ...slot })`.
- Go-to-today command: `openEventCalendarTab()` + `goToToday()`.
- Dialog delete: `lastPath = null` before close so `handleCloseAutoFocus` lands on the root (the block disappears once the delete overlay lands). Popover delete: same through its `lastPath`.
- Create: `createEvent({ ...draft minus timingLocked, title: trimmed })`; on success `lastPath = newPath` so focus lands on the new block; checkbox on -> `openFileInEditor(newPath)` after close. Errors stay inline (as edit).

## Prior art
- Template: work/27 (dialog session guard, harness of `EventDialog.test.ts`). Fake-disk Trash harness (`mkdir`/`rename`/`remove`, `create_note`/`scan_vault` in `invoke`) from `event-calendar.service.test.ts:560-617`.

## Risks
- `toast` is called as a function (`toast('Event deleted', ...)`): test mocks of `svelte-sonner` need a callable `toast`.
- Real `deleteItem` in jsdom needs `scan_vault` to return an array.

## Defaults taken
- Pre-flight (b) is "yes" (plan `:1340`): the delete toast carries an Undo action.
- The new-event command uses the focused date (today unless the user navigated).
- Create dialog title "New event"; the create submit button stays "Save".
