# 24 discovery: calendar events say what you can do; the new-event form opens clean

No `spec.md` in `.scratch/ux-quick-wins/`. Order follows the Issue's split point: 4, then 1+2, then 3.

## Files that change

- `src/lib/features/event-calendar/EventForm.svelte` (item 4): new `titleTouched` state, set in the title `oninput` and a new `onblur`; `:69-75` gate `aria-invalid`, `aria-describedby` and the `[data-error="title"]` paragraph on `titleTouched && errors.title`; `placeholder="Event title"`; message class `text-meta text-destructive`. `valid` (`:39`) keeps the full `errors`. `:78-82` sentence moves to a shared constant.
- `src/lib/features/event-calendar/event-calendar-keys.logic.ts` (item 1): new `CalendarGesture` interface (`gesture`, `label`, `views: readonly CalendarViewMode[]`) and `CALENDAR_GESTURES` after `CALENDAR_SHORTCUTS` (`:57-67`, untouched). Seven rows: time grid click/drag (day, week), All day lane click (day, week), month cell double-click (month), block drag (day, week), bottom-edge drag (day, week), all-day chip drag (day, week), month chip drag (month).
- `src/lib/features/event-calendar/EventShortcutsDialog.svelte:17-32` (item 1): after the key table, an `h3` "Mouse" (`data-gesture-heading`) and a second table, rows `data-gesture`, cells: gesture text, then label with the views ("Day / Week") in muted text.
- `help/documentation/27-calendar.md:46-61` (item 2): two rows, "Move an all-day event" and "Move an event in the month view".
- `src/lib/features/event-calendar/event-calendar-event.logic.ts`: exported `READ_ONLY_TIMING_NOTE` (the `EventForm.svelte:80` sentence), next to `readOnly: span` (`:222`). `event-calendar-form.logic.ts` does not change (Issue).
- `EventBlock.svelte` (item 3): `:43` label gains ", read-only"; `:75` `cursor-pointer` becomes `cursor-default` when read-only; a `Lock` icon (`aria-hidden`, `data-readonly-lock`) absolute in the top-right corner.
- `EventMonthGrid.svelte:123-137`, `EventAllDayLane.svelte:76-88`: `Lock` icon (`aria-hidden`, `data-readonly-lock`) after the label span plus `<span class="sr-only">, read-only</span>`.
- `EventPopover.svelte:165-180`: `<p data-popover-readonly>` with `READ_ONLY_TIMING_NOTE` when `event.readOnly`.

## Tests (prior art)

- `EventDialog.test.ts` "EventDialog: create" (`:526-540`, `openCreate`, `field`, `error`, `type`): new case, blur via `dispatchEvent(new FocusEvent('blur'))` (Svelte `onblur` is a direct listener).
- `event-calendar-keys.logic.test.ts:228-243` (`helpSection`): gesture rows non-empty, each label/gesture/views non-empty, gesture text is no chord of `CALENDAR_SHORTCUTS`; doc tie parses the "Creating, Moving and Resizing Events" table, a row's How cell (bold stripped, lower case) contains the gesture text.
- `EventCalendarView.test.ts:1043-1058` (`? opens the help`): new case for the Mouse heading and rows; the key-row assertion is unchanged.
- `EventPopover.test.ts:160` (read-only `Late` event), `EventTimeGrid.test.ts:142-150`, `EventMonthGrid.test.ts:567`, `EventAllDayLane.test.ts:140`: lock marker and name.

## Risks and defaults

- Chips are `<button>`s: Tailwind v4 preflight already gives them `cursor: default`, so only `EventBlock` changes cursor.
- Block name test reads `aria-label`; chip name reads `textContent` (the icon is an SVG with no text).
- The doc tie matches on the How cell, not the Action cell, so dialog labels can stay short ("New event") while doc actions say "in the month view".
- No E2E selector changes (E2E reads `data-readonly`). The Issue's "E2E reads `data-readonly` only" misses the `toHaveText` checks on the read-only Retreat and Late chips (`event-calendar.spec.ts:286-287,304-308`, `event-calendar-day-drag.spec.ts:94-95,139-140`): `toHaveText` reads `textContent`, which includes the `sr-only` suffix, so their expected text gains ", read-only". The Vitest spans test (`EventMonthGrid.test.ts:462`) reads the visible label span for the same reason.
