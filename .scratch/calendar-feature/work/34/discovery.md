# Issue 34 discovery: Calendar user guide and project docs

Docs only. No source file changes, so no test changes (rule 11 does not apply) and no gate beyond `git diff --cached --stat` listing only docs.

## Facts read from the code (the page must match them)
- Open: `Cmd+Shift+C` (`core/keybindings/keybindings.logic.ts:89`), palette "Toggle Calendar View", "New Calendar Event", "Calendar: Go to Today", "Calendar: Undo", "Calendar: Redo" (`features/command-palette/command-palette.service.ts:157-191`); the sidebar month panel's "Open Calendar" button and day double-click (`plugins/calendar/CalendarPanel.svelte:46-51`).
- View keys (`event-calendar-keys.logic.ts:62-89`): T, N, D/W/M, Left/Right, Delete/Backspace, Escape, Cmd+Z, Cmd+Shift+Z, Ctrl+Y; nothing fires while typing or with the dialog open.
- Grid: 15-minute snap and minimum (`event-calendar-layout.logic.ts:14-17`), 96 px minimum column (`:20`) so a narrow pane scrolls sideways; month cell double-click creates at "Day starts at" (`EventMonthGrid.svelte:45-48`); all-day lane click creates an all-day event (`EventAllDayLane.svelte:35-37`).
- Schema (`event-calendar-event.logic.ts:120-181`): `date`, `start`, `end`, `all_day`, `event_color` (green, purple, cyan, orange, pink, blue), `location`, `event_title`, `end_date` (multi-day, read-only on start day). Needs-attention texts: `EventCalendarNeedsAttention.svelte:15-36`.
- Type match ignores case, `_type`/`type` alias (`:81-85`); system folder excluded, `_archived` counted (`:200-212`).
- Settings > Calendar (`EventCalendarSection.svelte:98-241`); defaults `settings.store.svelte.ts:102-111`.
- Write refusals and toasts: `event-calendar.service.ts:545-551, 944-970, 1052-1070`; history cap 100 (`event-calendar-history.logic.ts:35`).
- `restore` source: `core/filesystem/note-change.service.ts:15-17, 92-94`; `core/trash/trash.service.ts:105-106, 230`.

## Files that change
- `help/documentation/27-calendar.md` (new).
- `help/documentation/README.md` index table (after row 26).
- `08-periodic-notes-and-calendar.md` "The Calendar Panel" (`:18-51`): the Open Calendar button, double-click, link.
- `18-trash.md` "Restoring Items" (`:26-32`): restored notes are indexed at once; Calendar link.
- `19-settings.md`: new "## Calendar" after "## Types" (`:141-149`), matching the settings sidebar order (`settings.logic.ts:162-168`).
- `20-keyboard-shortcuts.md`: `Cmd+Shift+C` in Navigation (`:5-15`), a "Calendar" section after Canvas (`:52-57`), palette commands (`:66-80`).
- `25-types-and-relationships.md`: an Event note with `date` shows on the Calendar, near the Event row (`:477`) and the Event example (`:577`).
- `README.md` Views & Tools list (`:43-50`).
- `CLAUDE.md` Project Structure (`:65-68`) and Indexing rule 6 (`:272`, `:274`).

## Defaults taken
- `archify` skill is not in this session's skill list: both archify files stay untouched; ticket 36 files the follow-up.
- The issue's recipe says `filter: _type == "Event"`; the real `.collection` key is `filters:` with a quoted expression (`12-collection.md:186-205, 365`), so the recipe uses `filters: '_type == "Event"'` with a `calendar` view and `dateProperty: date`.
- One docs commit for the implementation, as the Issue asks.
