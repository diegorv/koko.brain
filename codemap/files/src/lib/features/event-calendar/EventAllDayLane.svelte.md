# file card src/lib/features/event-calendar/EventAllDayLane.svelte
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/features/event-calendar/EventAllDayLane.svelte ' codemap/files
file src/lib/features/event-calendar/EventAllDayLane.svelte component L104 module src/lib/features/event-calendar in1 t1
## imports
imp src/lib/features/event-calendar/EventAllDayLane.svelte:2 -> src/lib/features/event-calendar/event-calendar-day-drag.svelte.ts DayDrag
imp src/lib/features/event-calendar/EventAllDayLane.svelte:3 -> src/lib/features/event-calendar/event-calendar-drag.logic.ts previewDayMove
imp src/lib/features/event-calendar/EventAllDayLane.svelte:4 -> src/lib/features/event-calendar/event-calendar-event.logic.ts eventColorStyle
imp src/lib/features/event-calendar/EventAllDayLane.svelte:5 -> src/lib/features/event-calendar/event-calendar-view.logic.ts buildAllDayChips,laneRows
imp src/lib/features/event-calendar/EventAllDayLane.svelte:6 -> src/lib/features/event-calendar/event-calendar-view.store.svelte.ts eventCalendarViewStore
imp src/lib/features/event-calendar/EventAllDayLane.svelte:7 -> src/lib/features/event-calendar/event-calendar.types.ts type:EventNote
## imported-by
imp src/lib/features/event-calendar/EventTimeGrid.svelte:23 -> src/lib/features/event-calendar/EventAllDayLane.svelte default
## reach
in2 src/lib/features/event-calendar/EventAllDayLane.svelte 1 files in 1 modules: src/lib/features/event-calendar(1)
out2 src/lib/features/event-calendar/EventAllDayLane.svelte 11 files in 5 modules: src/lib/features/event-calendar(4) src/lib/core/settings(3) src/lib/core/frontmatter(2) src/lib/features/type-definitions(1) src/lib/types(1)
## tests
test src/tests/lib/features/event-calendar/EventAllDayLane.test.ts imports src/lib/features/event-calendar/EventAllDayLane.svelte mirror
## symbols
sym src/lib/features/event-calendar/EventAllDayLane.svelte:1 component EventAllDayLane props:days,events L104
by src/lib/features/event-calendar/EventAllDayLane.svelte:default <- src/lib/features/event-calendar/EventTimeGrid.svelte:254 in (markup) mount
## locals
local src/lib/features/event-calendar/EventAllDayLane.svelte:42 fn openDay(day: string) L4
local src/lib/features/event-calendar/EventAllDayLane.svelte:48 fn handleCellClick(e: MouseEvent, day: string) L3
## mounted-at
mount src/lib/features/event-calendar/EventTimeGrid.svelte:254 EventAllDayLane -> src/lib/features/event-calendar/EventAllDayLane.svelte
## calls
call src/lib/features/event-calendar/EventAllDayLane.svelte:27 in drag -> src/lib/features/event-calendar/event-calendar-day-drag.svelte.ts:DayDrag new
call src/lib/features/event-calendar/EventAllDayLane.svelte:28 in cells=$derived -> src/lib/features/event-calendar/event-calendar-drag.logic.ts:previewDayMove call
call src/lib/features/event-calendar/EventAllDayLane.svelte:28 in cells=$derived -> src/lib/features/event-calendar/event-calendar-view.logic.ts:buildAllDayChips call
call src/lib/features/event-calendar/EventAllDayLane.svelte:29 in rows=$derived -> src/lib/features/event-calendar/event-calendar-view.logic.ts:laneRows call
call src/lib/features/event-calendar/EventAllDayLane.svelte:43 in openDay -> src/lib/features/event-calendar/event-calendar-view.store.svelte.ts:eventCalendarViewStore.setDate mcall
call src/lib/features/event-calendar/EventAllDayLane.svelte:44 in openDay -> src/lib/features/event-calendar/event-calendar-view.store.svelte.ts:eventCalendarViewStore.setView mcall
call src/lib/features/event-calendar/EventAllDayLane.svelte:49 in handleCellClick -> src/lib/features/event-calendar/event-calendar-view.store.svelte.ts:eventCalendarViewStore.openDialog mcall
call src/lib/features/event-calendar/EventAllDayLane.svelte:73 in (markup) -> src/lib/features/event-calendar/EventAllDayLane.svelte:handleCellClick markup
call src/lib/features/event-calendar/EventAllDayLane.svelte:81 in (markup) -> src/lib/features/event-calendar/event-calendar-event.logic.ts:eventColorStyle markup
call src/lib/features/event-calendar/EventAllDayLane.svelte:85 in (markup) -> src/lib/features/event-calendar/event-calendar-view.store.svelte.ts:eventCalendarViewStore.openPopover markup
call src/lib/features/event-calendar/EventAllDayLane.svelte:96 in (markup) -> src/lib/features/event-calendar/EventAllDayLane.svelte:openDay markup
## effects
fx src/lib/features/event-calendar/EventAllDayLane.svelte:36 svelte.$effect in (script)
