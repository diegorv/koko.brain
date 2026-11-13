# file card src/lib/features/event-calendar/EventCalendarHeader.svelte
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/features/event-calendar/EventCalendarHeader.svelte ' codemap/files
file src/lib/features/event-calendar/EventCalendarHeader.svelte component L124 module src/lib/features/event-calendar in1 t0
## imports
imp src/lib/features/event-calendar/EventCalendarHeader.svelte:5 -> src/lib/components/ui/button/index.ts Button
imp src/lib/features/event-calendar/EventCalendarHeader.svelte:6 -> src/lib/components/ui/tooltip/index.ts *
imp src/lib/features/event-calendar/EventCalendarHeader.svelte:7 -> src/lib/features/event-calendar/event-calendar-view.store.svelte.ts eventCalendarViewStore
imp src/lib/features/event-calendar/EventCalendarHeader.svelte:8 -> src/lib/features/event-calendar/event-calendar.types.ts type:CalendarViewMode
## imported-by
imp src/lib/features/event-calendar/EventCalendarView.svelte:27 -> src/lib/features/event-calendar/EventCalendarHeader.svelte default
## reach
in2 src/lib/features/event-calendar/EventCalendarHeader.svelte 1 files in 1 modules: src/lib/app(1)
out2 src/lib/features/event-calendar/EventCalendarHeader.svelte 10 files in 3 modules: src/lib/components(6) src/lib/core/settings(2) src/lib/features/event-calendar(2)
## symbols
sym src/lib/features/event-calendar/EventCalendarHeader.svelte:1 component EventCalendarHeader L124
by src/lib/features/event-calendar/EventCalendarHeader.svelte:default <- src/lib/features/event-calendar/EventCalendarView.svelte:238 in (markup) mount
## locals
local src/lib/features/event-calendar/EventCalendarHeader.svelte:24 fn handleTabKeydown(e: KeyboardEvent) L9
## mounts
mount src/lib/features/event-calendar/EventCalendarHeader.svelte:43 Button -> src/lib/components/ui/button/button.svelte
mount src/lib/features/event-calendar/EventCalendarHeader.svelte:48 Button -> src/lib/components/ui/button/button.svelte
mount src/lib/features/event-calendar/EventCalendarHeader.svelte:65 Button -> src/lib/components/ui/button/button.svelte
mount src/lib/features/event-calendar/EventCalendarHeader.svelte:82 Button -> src/lib/components/ui/button/button.svelte
## mounted-at
mount src/lib/features/event-calendar/EventCalendarView.svelte:238 EventCalendarHeader -> src/lib/features/event-calendar/EventCalendarHeader.svelte
## calls
call src/lib/features/event-calendar/EventCalendarHeader.svelte:30 in handleTabKeydown -> src/lib/features/event-calendar/event-calendar-view.store.svelte.ts:eventCalendarViewStore.setView mcall
call src/lib/features/event-calendar/EventCalendarHeader.svelte:43 in (markup) -> src/lib/features/event-calendar/event-calendar-view.store.svelte.ts:eventCalendarViewStore.goToToday markup
call src/lib/features/event-calendar/EventCalendarHeader.svelte:53 in (markup) -> src/lib/features/event-calendar/event-calendar-view.store.svelte.ts:eventCalendarViewStore.step markup +1
call src/lib/features/event-calendar/EventCalendarHeader.svelte:88 in (markup) -> src/lib/features/event-calendar/event-calendar-view.store.svelte.ts:eventCalendarViewStore.openHelp markup
call src/lib/features/event-calendar/EventCalendarHeader.svelte:104 in (markup) -> src/lib/features/event-calendar/EventCalendarHeader.svelte:handleTabKeydown markup
call src/lib/features/event-calendar/EventCalendarHeader.svelte:118 in (markup) -> src/lib/features/event-calendar/event-calendar-view.store.svelte.ts:eventCalendarViewStore.setView markup
