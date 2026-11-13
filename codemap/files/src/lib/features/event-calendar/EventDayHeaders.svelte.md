# file card src/lib/features/event-calendar/EventDayHeaders.svelte
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/features/event-calendar/EventDayHeaders.svelte ' codemap/files
file src/lib/features/event-calendar/EventDayHeaders.svelte component L50 module src/lib/features/event-calendar in1 t0
## imports
imp src/lib/features/event-calendar/EventDayHeaders.svelte:2 -> src/lib/features/event-calendar/event-calendar-dates.logic.ts dayOfWeek,formatLong,formatWeekday,fromKey,WEEKDAYS_SHORT
imp src/lib/features/event-calendar/EventDayHeaders.svelte:3 -> src/lib/features/event-calendar/event-calendar-view.store.svelte.ts eventCalendarViewStore
imp src/lib/features/event-calendar/EventDayHeaders.svelte:4 -> src/lib/features/event-calendar/EventDailyNoteButton.svelte default
## imported-by
imp src/lib/features/event-calendar/EventTimeGrid.svelte:25 -> src/lib/features/event-calendar/EventDayHeaders.svelte default
## reach
in2 src/lib/features/event-calendar/EventDayHeaders.svelte 1 files in 1 modules: src/lib/features/event-calendar(1)
out2 src/lib/features/event-calendar/EventDayHeaders.svelte 4 files in 2 modules: src/lib/features/event-calendar(3) src/lib/core/settings(1)
## symbols
sym src/lib/features/event-calendar/EventDayHeaders.svelte:1 component EventDayHeaders props:days L50
by src/lib/features/event-calendar/EventDayHeaders.svelte:default <- src/lib/features/event-calendar/EventTimeGrid.svelte:253 in (markup) mount
## locals
local src/lib/features/event-calendar/EventDayHeaders.svelte:14 fn handleClick(day: string) L5
## mounts
mount src/lib/features/event-calendar/EventDayHeaders.svelte:47 EventDailyNoteButton -> src/lib/features/event-calendar/EventDailyNoteButton.svelte
## mounted-at
mount src/lib/features/event-calendar/EventTimeGrid.svelte:253 EventDayHeaders -> src/lib/features/event-calendar/EventDayHeaders.svelte
## calls
call src/lib/features/event-calendar/EventDayHeaders.svelte:16 in handleClick -> src/lib/features/event-calendar/event-calendar-view.store.svelte.ts:eventCalendarViewStore.setDate mcall
call src/lib/features/event-calendar/EventDayHeaders.svelte:17 in handleClick -> src/lib/features/event-calendar/event-calendar-view.store.svelte.ts:eventCalendarViewStore.setView mcall
call src/lib/features/event-calendar/EventDayHeaders.svelte:31 in (markup) -> src/lib/features/event-calendar/event-calendar-dates.logic.ts:formatLong markup
call src/lib/features/event-calendar/EventDayHeaders.svelte:31 in (markup) -> src/lib/features/event-calendar/event-calendar-dates.logic.ts:formatWeekday markup
call src/lib/features/event-calendar/EventDayHeaders.svelte:33 in (markup) -> src/lib/features/event-calendar/EventDayHeaders.svelte:handleClick markup
call src/lib/features/event-calendar/EventDayHeaders.svelte:35 in (markup) -> src/lib/features/event-calendar/event-calendar-dates.logic.ts:dayOfWeek markup
call src/lib/features/event-calendar/EventDayHeaders.svelte:44 in (markup) -> src/lib/features/event-calendar/event-calendar-dates.logic.ts:fromKey markup
