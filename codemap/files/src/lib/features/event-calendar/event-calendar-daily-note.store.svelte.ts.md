# file card src/lib/features/event-calendar/event-calendar-daily-note.store.svelte.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/features/event-calendar/event-calendar-daily-note.store.svelte.ts ' codemap/files
file src/lib/features/event-calendar/event-calendar-daily-note.store.svelte.ts store L61 module src/lib/features/event-calendar in3 t6 | Bridge from the Calendar to whatever opens a day's daily note.
## imported-by
imp src/lib/features/event-calendar/EventDailyNoteButton.svelte:5 -> src/lib/features/event-calendar/event-calendar-daily-note.store.svelte.ts eventCalendarDailyNoteStore
imp src/lib/features/rail-shell/RailNoteList.svelte:61 -> src/lib/features/event-calendar/event-calendar-daily-note.store.svelte.ts eventCalendarDailyNoteStore
imp src/lib/plugins/periodic-notes/periodic-notes.service.ts:6 -> src/lib/features/event-calendar/event-calendar-daily-note.store.svelte.ts eventCalendarDailyNoteStore
## reach
in2 src/lib/features/event-calendar/event-calendar-daily-note.store.svelte.ts 11 files in 5 modules: src/lib/app(6) src/lib/features/event-calendar(2) src/lib/plugins/calendar(1) src/lib/plugins/mods(1) src/lib/plugins/periodic-notes(1)
out2 src/lib/features/event-calendar/event-calendar-daily-note.store.svelte.ts 0 files in 0 modules: -
## tests
test src/tests/lib/features/event-calendar/event-calendar-daily-note.store.test.ts imports src/lib/features/event-calendar/event-calendar-daily-note.store.svelte.ts mirror
test src/tests/lib/app/lifecycle/app-lifecycle.service.test.ts imports src/lib/features/event-calendar/event-calendar-daily-note.store.svelte.ts
test src/tests/lib/features/event-calendar/EventMonthGrid.test.ts imports src/lib/features/event-calendar/event-calendar-daily-note.store.svelte.ts
test src/tests/lib/features/event-calendar/EventTimeGrid.test.ts imports src/lib/features/event-calendar/event-calendar-daily-note.store.svelte.ts
test src/tests/lib/features/rail-shell/RailNoteList.test.ts imports src/lib/features/event-calendar/event-calendar-daily-note.store.svelte.ts
test src/tests/lib/plugins/periodic-notes/periodic-notes.service.test.ts imports src/lib/features/event-calendar/event-calendar-daily-note.store.svelte.ts
## symbols
sym src/lib/features/event-calendar/event-calendar-daily-note.store.svelte.ts:10 type DailyNoteOpener L1 | Opens or creates the daily note of a `YYYY-MM-DD` day key.
sym src/lib/features/event-calendar/event-calendar-daily-note.store.svelte.ts:22 store eventCalendarDailyNoteStore L40
by src/lib/features/event-calendar/event-calendar-daily-note.store.svelte.ts:eventCalendarDailyNoteStore <- src/lib/features/event-calendar/EventDailyNoteButton.svelte:18 in handleClick mcall +1
by src/lib/features/event-calendar/event-calendar-daily-note.store.svelte.ts:eventCalendarDailyNoteStore <- src/lib/features/rail-shell/RailNoteList.svelte:625 in TODAY_DAILY_NOTE.run mcall +1
by src/lib/features/event-calendar/event-calendar-daily-note.store.svelte.ts:eventCalendarDailyNoteStore <- src/lib/plugins/periodic-notes/periodic-notes.service.ts:84 in registerCalendarDailyNoteOpener mcall
## store
store src/lib/features/event-calendar/event-calendar-daily-note.store.svelte.ts:22 eventCalendarDailyNoteStore esc:0
mem src/lib/features/event-calendar/event-calendar-daily-note.store.svelte.ts:24 get eventCalendarDailyNoteStore.available r:src/lib/features/event-calendar/EventDailyNoteButton.svelte:27,src/lib/features/rail-shell/RailNoteList.svelte:634 w-via:register | Whether an opener is registered, i.e. whether the daily note action is shown.
mem src/lib/features/event-calendar/event-calendar-daily-note.store.svelte.ts:37 do eventCalendarDailyNoteStore.register w:src/lib/plugins/periodic-notes/periodic-notes.service.ts:84 | Registers `next` as the opener, replacing any previous one.
mem src/lib/features/event-calendar/event-calendar-daily-note.store.svelte.ts:51 do eventCalendarDailyNoteStore.open w:src/lib/features/event-calendar/EventDailyNoteButton.svelte:18,src/lib/features/rail-shell/RailNoteList.svelte:625 | Opens the daily note of `day`; rejects when no opener is registered or the opener fails.
