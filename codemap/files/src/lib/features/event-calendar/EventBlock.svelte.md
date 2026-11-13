# file card src/lib/features/event-calendar/EventBlock.svelte
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/features/event-calendar/EventBlock.svelte ' codemap/files
file src/lib/features/event-calendar/EventBlock.svelte component L122 module src/lib/features/event-calendar in1 t0
## imports
imp src/lib/features/event-calendar/EventBlock.svelte:2 -> src/lib/features/event-calendar/event-calendar-dates.logic.ts formatTime,formatTimeRange,type:TimeFormat
imp src/lib/features/event-calendar/EventBlock.svelte:3 -> src/lib/features/event-calendar/event-calendar-event.logic.ts eventColorStyle,type:PendingEventNote
imp src/lib/features/event-calendar/EventBlock.svelte:4 -> src/lib/features/event-calendar/event-calendar-layout.logic.ts minutesToPx
imp src/lib/features/event-calendar/EventBlock.svelte:5 -> src/lib/features/event-calendar/event-calendar-view.logic.ts eventRangeLabel
imp src/lib/features/event-calendar/EventBlock.svelte:6 -> src/lib/features/event-calendar/event-calendar-view.store.svelte.ts eventCalendarViewStore
imp src/lib/features/event-calendar/EventBlock.svelte:7 -> src/lib/features/event-calendar/event-calendar.types.ts type:EventNote
## imported-by
imp src/lib/features/event-calendar/EventTimeGrid.svelte:24 -> src/lib/features/event-calendar/EventBlock.svelte default
## reach
in2 src/lib/features/event-calendar/EventBlock.svelte 1 files in 1 modules: src/lib/features/event-calendar(1)
out2 src/lib/features/event-calendar/EventBlock.svelte 7 files in 4 modules: src/lib/core/settings(3) src/lib/core/frontmatter(2) src/lib/features/type-definitions(1) src/lib/types(1)
## symbols
sym src/lib/features/event-calendar/EventBlock.svelte:1 component EventBlock props:event,column,columns,timeFormat,whole L122
by src/lib/features/event-calendar/EventBlock.svelte:default <- src/lib/features/event-calendar/EventTimeGrid.svelte:302 in (markup) mount
## locals
local src/lib/features/event-calendar/EventBlock.svelte:57 fn openPopover(el: HTMLElement) L3
local src/lib/features/event-calendar/EventBlock.svelte:62 fn handleKeydown(e: KeyboardEvent) L6
## mounted-at
mount src/lib/features/event-calendar/EventTimeGrid.svelte:302 EventBlock -> src/lib/features/event-calendar/EventBlock.svelte
## calls
call src/lib/features/event-calendar/EventBlock.svelte:37 in height=$derived -> src/lib/features/event-calendar/event-calendar-layout.logic.ts:minutesToPx call
call src/lib/features/event-calendar/EventBlock.svelte:38 in time=$derived -> src/lib/features/event-calendar/event-calendar-dates.logic.ts:formatTimeRange call
call src/lib/features/event-calendar/EventBlock.svelte:42 in labelTime=$derived -> src/lib/features/event-calendar/event-calendar-view.logic.ts:eventRangeLabel call
call src/lib/features/event-calendar/EventBlock.svelte:46 in style=$derived -> src/lib/features/event-calendar/event-calendar-event.logic.ts:eventColorStyle call
call src/lib/features/event-calendar/EventBlock.svelte:47 in style=$derived -> src/lib/features/event-calendar/event-calendar-layout.logic.ts:minutesToPx call
call src/lib/features/event-calendar/EventBlock.svelte:58 in openPopover -> src/lib/features/event-calendar/event-calendar-view.store.svelte.ts:eventCalendarViewStore.openPopover mcall
call src/lib/features/event-calendar/EventBlock.svelte:66 in handleKeydown -> src/lib/features/event-calendar/EventBlock.svelte:openPopover call
call src/lib/features/event-calendar/EventBlock.svelte:85 in (markup) -> src/lib/features/event-calendar/EventBlock.svelte:openPopover markup
call src/lib/features/event-calendar/EventBlock.svelte:86 in (markup) -> src/lib/features/event-calendar/EventBlock.svelte:handleKeydown markup
call src/lib/features/event-calendar/EventBlock.svelte:93 in (markup) -> src/lib/features/event-calendar/event-calendar-dates.logic.ts:formatTime markup
