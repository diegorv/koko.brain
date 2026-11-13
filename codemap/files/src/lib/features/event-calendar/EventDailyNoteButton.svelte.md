# file card src/lib/features/event-calendar/EventDailyNoteButton.svelte
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/features/event-calendar/EventDailyNoteButton.svelte ' codemap/files
file src/lib/features/event-calendar/EventDailyNoteButton.svelte component L38 module src/lib/features/event-calendar in2 t0
## imports
imp src/lib/features/event-calendar/EventDailyNoteButton.svelte:4 -> src/lib/features/event-calendar/event-calendar-dates.logic.ts formatLong
imp src/lib/features/event-calendar/EventDailyNoteButton.svelte:5 -> src/lib/features/event-calendar/event-calendar-daily-note.store.svelte.ts eventCalendarDailyNoteStore
## imported-by
imp src/lib/features/event-calendar/EventDayHeaders.svelte:4 -> src/lib/features/event-calendar/EventDailyNoteButton.svelte default
imp src/lib/features/event-calendar/EventMonthGrid.svelte:11 -> src/lib/features/event-calendar/EventDailyNoteButton.svelte default
## reach
in2 src/lib/features/event-calendar/EventDailyNoteButton.svelte 2 files in 1 modules: src/lib/features/event-calendar(2)
out2 src/lib/features/event-calendar/EventDailyNoteButton.svelte 0 files in 0 modules: -
## symbols
sym src/lib/features/event-calendar/EventDailyNoteButton.svelte:1 component EventDailyNoteButton props:day,class= L38
by src/lib/features/event-calendar/EventDailyNoteButton.svelte:default <- src/lib/features/event-calendar/EventDayHeaders.svelte:47 in (markup) mount
by src/lib/features/event-calendar/EventDailyNoteButton.svelte:default <- src/lib/features/event-calendar/EventMonthGrid.svelte:120 in (markup) mount
## locals
local src/lib/features/event-calendar/EventDailyNoteButton.svelte:17 fn handleClick() L7
## mounted-at
mount src/lib/features/event-calendar/EventDayHeaders.svelte:47 EventDailyNoteButton -> src/lib/features/event-calendar/EventDailyNoteButton.svelte
mount src/lib/features/event-calendar/EventMonthGrid.svelte:120 EventDailyNoteButton -> src/lib/features/event-calendar/EventDailyNoteButton.svelte
## calls
call src/lib/features/event-calendar/EventDailyNoteButton.svelte:18 in handleClick -> src/lib/features/event-calendar/event-calendar-daily-note.store.svelte.ts:eventCalendarDailyNoteStore.open mcall
call src/lib/features/event-calendar/EventDailyNoteButton.svelte:31 in (markup) -> src/lib/features/event-calendar/event-calendar-dates.logic.ts:formatLong markup
call src/lib/features/event-calendar/EventDailyNoteButton.svelte:34 in (markup) -> src/lib/features/event-calendar/EventDailyNoteButton.svelte:handleClick markup
