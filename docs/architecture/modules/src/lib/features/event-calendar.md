---
summary: "Calendar tab: shows event notes and dated tasks, and creates, edits, moves and undoes event notes."
---

## Responsibility

Owns the Calendar tab: the EventCalendarView tree (month, week, day and agenda views, dialogs, popover, settings section), the projection of vault entries into calendar events and issues, view state, and the write path for event notes (per-path queue, pending-write overlay, rollback, calendar-level undo and redo). Pure date, layout, drag, keyboard, form and task logic sits in *.logic.ts files. It does not own the vault index, frontmatter serialization, note creation, deletion or trash (core), the daily-note file (plugins/periodic-notes), or the sidebar calendar panel (plugins/calendar).

## Key files

- `src/lib/features/event-calendar/event-calendar.service.ts`: Read side (loadEvents, loadCalendarTasks), tab open, close and toggle, clock, and the event-note write path with undo, redo and path-change following.
- `src/lib/features/event-calendar/event-calendar.store.svelte.ts`: Projected snapshot, pending-write overlay, undo history, load state, dated tasks, cached derived lists.
- `src/lib/features/event-calendar/event-calendar-view.store.svelte.ts`: View mode, focused date, popover and dialog targets, clock time, focus requests, session-only archived toggle.
- `src/lib/features/event-calendar/event-calendar.types.ts`: EventNote, pending writes, undo operations, drag state, layout items. Days are YYYY-MM-DD keys, times are minutes from midnight.
- `src/lib/features/event-calendar/event-calendar-event.logic.ts`: Projection of vault entries into events and issues, and the event frontmatter mapping.
- `src/lib/features/event-calendar/EventCalendarView.svelte`: Root component, mounted by the editor view for the virtual calendar tab; reloads on vaultIndexVersion changes.
- `src/lib/features/event-calendar/event-calendar-daily-note.store.svelte.ts`: Lets the periodic-notes plugin register the daily-note opener without features importing plugins.

## State

- eventCalendarStore: projected events and issues, pending-write overlay by path, undo and redo history, load error and flag, dated tasks.
- eventCalendarViewStore: view mode, focused date, popover and dialog state, help flag, clock time, focus request, showArchived (session only).
- eventCalendarDailyNoteStore: the registered daily-note opener and in-flight opens keyed by day.
- Module state in event-calendar.service.ts: load and task-load tokens, reference-counted clock timer, per-path write queue and history tail, write generation, projection memo key.
- Nothing is persisted here: event data lives in note frontmatter, written through core frontmatter services.
- A virtual editor tab at EVENT_CALENDAR_VIRTUAL_PATH with fileType 'event-calendar'.

## Collaborators

- `IPC:get_all_tasks_v2`: loadCalendarTasks reads dated tasks. Also used by features/tasks.
- `src/lib/core/vault`: getVaultEntries (backed by get_all_vault_entries_v2 and memoized per vaultIndexVersion) supplies the snapshot that loadEvents projects; vaultStore for path and version.
- `src/lib/core/frontmatter`: updateNoteFrontmatter performs every event field write, and its error type drives rollback; parsing and rebuild helpers for create and duplicate.
- `src/lib/core/filesystem`: createFile, deleteItem, renameItem, name helpers, and registerPathChangeConsumer so undo history follows renames and deletes.
- `src/lib/core/trash`: restoreItem and trashStore for restoring deleted events and undoing a delete.
- `src/lib/core/editor`: openFileInEditor and saveFileByPath, tab management for the virtual tab, EVENT_CALENDAR_VIRTUAL_PATH.
- `src/lib/core/settings`: settingsStore.eventCalendar (week start, weekends, default view, colors, day start) and the color and view mode lists.
- `src/lib/features/type-definitions`: createTypedNote creates event notes and the store resolves the event type; EventCalendarSection creates the Event type definition; the projection uses excludeSystemFolder.
- `src/lib/features/tasks`: EventTaskChip uses isTaskOpen from task-status.logic.
- `src/lib/app`: EditorView mounts the view; SettingsPanel mounts EventCalendarSection; commands and global-keybindings open and toggle the tab; boot registers the write barrier; app-lifecycle drains writes, registers the path-change consumer and resets.
- `src/lib/plugins/calendar`: Sidebar calendar holds the clock, opens the Calendar tab on a picked day, reads the view store and uses the date logic.
- `src/lib/plugins/periodic-notes`: Registers the daily-note opener into eventCalendarDailyNoteStore.
- `src/lib/plugins/one-on-one`: MyPeopleSection reads eventCalendarViewStore.
- `src/lib/features/rail-shell`: RailNoteList holds the clock, reads the view store and uses the daily-note store.
- `src/lib/features/search`: SearchResult renders ShowInCalendarButton.
- `src/lib/features/backlinks`: LinkItem renders ShowInCalendarButton.

## Gotchas

- Event data is a projection, not a separate store: loadEvents projects the entries snapshot, which is memoized per vaultIndexVersion, so a settings change re-projects without IPC.
- Writes are optimistic. A pending-write overlay shows a change until the vault index catches up, and rollback runs when a write fails.
- drainEventCalendarWrites must be awaited before a vault switch or window close (boot registers it as a write barrier, app-lifecycle awaits it) or an in-flight write can be lost.
- resetEventCalendar bumps a generation so late write results leave the stores alone, but keeps the write queue and the clock. The clock runs only while a consumer holds it through acquireCalendarClock.
- Calendar undo and redo is separate from the editor's undo and follows renames and deletes through the path-change consumer.
- The Calendar is a virtual tab, not a note file. Code that treats every tab as a note must check for it.
- features may not import plugins. The daily-note action goes through the daily-note store that periodic-notes registers into. The folder does import features/tasks and features/type-definitions.
- Event notes are read through the vault entries snapshot and written as ordinary frontmatter, so Rust has no event-calendar module.
- The name EventNote avoids confusion with CalendarEvent in features/collection/calendar.logic.ts.
