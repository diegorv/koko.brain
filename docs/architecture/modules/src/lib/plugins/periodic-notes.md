---
summary: "Daily, weekly, monthly, quarterly and yearly notes: paths, template variables, opening and daily-note auto-open."
---

## Responsibility

Owns the periodic notes plugin: computing a periodic note's path from Settings > Periodic Notes, building the template variables (navigation links and link tables) per period type, recognising wikilink targets that name a periodic note, and opening or creating those notes through the note creator. It also owns the daily note lifecycle: auto-open at vault startup, auto-pin, reopening when the date changes on window focus, and registering the Calendar's day-header opener. It does not own note creation (core/note-creator), template rendering, the settings store, the opener store (features/event-calendar) or the Calendar UI.

## Key files

- `src/lib/plugins/periodic-notes/periodic-notes.logic.ts`: Pure path, wikilink and template variable builders, link tables, shouldRefreshDailyNote and detectPeriodicNoteType.
- `src/lib/plugins/periodic-notes/periodic-notes.service.ts`: Public surface: openOrCreatePeriodicNoteForDate, openOrCreateDailyNote, dailyNotePath, autoOpenDailyNote, refreshDailyNoteIfDateChanged, registerCalendarDailyNoteOpener, resetPeriodicNotes.
- `src/lib/plugins/periodic-notes/DailyNoteButton.svelte`: Icon button that calls openOrCreateDailyNote. No file under src imports it.

## State

- lastAutoOpenedDate: module-level YYYY-MM-DD string or null in periodic-notes.service.ts, cleared by resetPeriodicNotes.
- Reads settingsStore.periodicNotes and vaultStore.path. It writes no files itself.
- The registered Calendar opener is held by eventCalendarDailyNoteStore in features/event-calendar.

## Collaborators

- `src/lib/core/note-creator`: openOrCreateNote handles every open or create and reaches IPC create_folder and create_note.
- `src/lib/core/settings`: settingsStore.periodicNotes plus the PeriodType and PeriodicNotesSettings types.
- `src/lib/core/vault`: vaultStore.path. With no vault, the open functions return silently and dailyNotePath throws.
- `src/lib/core/editor`: pinTabByPath and unpinTabByPath pin the auto-opened daily note tab.
- `src/lib/features/event-calendar`: registerCalendarDailyNoteOpener registers the opener in eventCalendarDailyNoteStore (event-calendar-daily-note.store.svelte.ts), the bridge that keeps the Calendar from importing plugins/.
- `src/lib/utils`: formatToCapturingRegex from date.ts builds the regex for detectPeriodicNoteType, and appendLog writes startup timing lines.
- `IPC:create_folder`: Reached through core/note-creator when the note's folder is missing. The plugin invokes no command itself.
- `IPC:create_note`: Reached through core/note-creator when the note is created.
- `src/lib/plugins/calendar`: Caller: calendar.service.ts wraps openOrCreatePeriodicNoteForDate.
- `src/lib/plugins/one-on-one`: Caller: one-on-one.logic.ts uses buildWikilinkPath.
- `src/lib/plugins/quick-capture`: Caller: note-composer.logic.ts uses buildWikilinkPath.
- `src/lib/plugins/mods`: Caller: mod-app.service.ts exposes dailyNotePath and openOrCreateDailyNote.
- `src/lib/app`: app-lifecycle.service.ts registers the opener, runs autoOpenDailyNote and calls resetPeriodicNotes. tauri-listeners.service.ts calls refreshDailyNoteIfDateChanged on window focus. commands.ts, deep-link-actions.ts (openOrCreateDailyNote, buildPeriodicNotePath) and editor-host.ts (detectPeriodicNoteType, openOrCreatePeriodicNoteForDate) also call into it.

## Gotchas

- The plugin has no Rust side and no direct IPC call. Note creation reaches the backend through core/note-creator.
- shouldRefreshDailyNote returns false while lastAutoOpenedDate is null, so the focus refresh does nothing until autoOpenDailyNote has run in the session.
- autoOpenDailyNote and refreshDailyNoteIfDateChanged return early unless settings daily.autoOpen is true. autoPin only pins or unpins the tab.
- The Calendar's day-header daily-note action is shown only while an opener is registered. Removing the registration hides it without an error.
- detectPeriodicNoteType returns null when a folder is set and the target does not start with it, and tries daily, weekly, monthly, quarterly, yearly in that order. editor-host.ts retries a bare target with the folder prefix.
- buildDateFromGroups builds from January 1 of the parsed year before setting month and day, so today's day of month cannot push the parsed month into the next one.
- DailyNoteButton.svelte is unused. The Calendar views use EventDailyNoteButton in features/event-calendar.
