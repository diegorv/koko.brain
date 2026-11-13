# file card src/lib/plugins/calendar/CalendarNavigator.svelte
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/plugins/calendar/CalendarNavigator.svelte ' codemap/files
file src/lib/plugins/calendar/CalendarNavigator.svelte component L163 module src/lib/plugins/calendar in1 t1
## imports
imp src/lib/plugins/calendar/CalendarNavigator.svelte:8 -> src/lib/core/settings/settings.store.svelte.ts settingsStore
imp src/lib/plugins/calendar/CalendarNavigator.svelte:9 -> src/lib/core/vault/vault.store.svelte.ts vaultStore
imp src/lib/plugins/calendar/CalendarNavigator.svelte:10 -> src/lib/features/event-calendar/event-calendar.service.ts acquireCalendarClock,openEventCalendarTab
imp src/lib/plugins/calendar/CalendarNavigator.svelte:11 -> src/lib/features/event-calendar/event-calendar-view.store.svelte.ts eventCalendarViewStore
imp src/lib/plugins/calendar/CalendarNavigator.svelte:12 -> src/lib/features/type-definitions/type-definitions.store.svelte.ts typeDefinitionsStore
imp src/lib/plugins/calendar/CalendarNavigator.svelte:13 -> src/lib/plugins/calendar/calendar.store.svelte.ts calendarStore
imp src/lib/plugins/calendar/CalendarNavigator.svelte:14 -> src/lib/plugins/calendar/calendar.service.ts openOrCreatePeriodicNoteForDate
imp src/lib/plugins/calendar/CalendarNavigator.svelte:15 -> src/lib/plugins/calendar/calendar.logic.ts buildMonthGrid,periodicNoteEntries,type:PeriodicNoteEntry
imp src/lib/plugins/calendar/CalendarNavigator.svelte:16 -> src/lib/plugins/calendar/day-lens.logic.ts noteDateCounts,parseRailDay,pickedDayLens
imp src/lib/plugins/calendar/CalendarNavigator.svelte:17 -> src/lib/plugins/calendar/CalendarGrid.svelte default
## imported-by
imp src/lib/plugins/calendar/calendar-rail.service.ts:9 -> src/lib/plugins/calendar/CalendarNavigator.svelte default
## reach
in2 src/lib/plugins/calendar/CalendarNavigator.svelte 1 files in 1 modules: src/lib/app(1)
out2 src/lib/plugins/calendar/CalendarNavigator.svelte 37 files in 13 modules: src/lib/features/event-calendar(9) src/lib/utils(4) src/lib/core/editor(3) src/lib/core/filesystem(3) src/lib/core/settings(3) +8 modules
## tests
test src/tests/lib/plugins/calendar/CalendarNavigator.test.ts imports src/lib/plugins/calendar/CalendarNavigator.svelte mirror
## symbols
sym src/lib/plugins/calendar/CalendarNavigator.svelte:1 component CalendarNavigator L163
by src/lib/plugins/calendar/CalendarNavigator.svelte:default <- src/lib/plugins/calendar/calendar-rail.service.ts:30 in registerCalendarRail ref
## locals
local src/lib/plugins/calendar/CalendarNavigator.svelte:57 fn pickDay(dateKey: string) L3
local src/lib/plugins/calendar/CalendarNavigator.svelte:62 fn goToToday() L4
local src/lib/plugins/calendar/CalendarNavigator.svelte:68 fn openPeriodicEntry(entry: PeriodicNoteEntry) L6
local src/lib/plugins/calendar/CalendarNavigator.svelte:76 fn openCalendarTab() L3
local src/lib/plugins/calendar/CalendarNavigator.svelte:80 fn openWeeklyNote(dateKey: string) L3
## mounts
mount src/lib/plugins/calendar/CalendarNavigator.svelte:139 CalendarGrid -> src/lib/plugins/calendar/CalendarGrid.svelte
## calls
call src/lib/plugins/calendar/CalendarNavigator.svelte:21 in $effect@21 -> src/lib/features/event-calendar/event-calendar.service.ts:acquireCalendarClock call
call src/lib/plugins/calendar/CalendarNavigator.svelte:26 in (script) -> src/lib/plugins/calendar/day-lens.logic.ts:parseRailDay call
call src/lib/plugins/calendar/CalendarNavigator.svelte:27 in (script) -> src/lib/plugins/calendar/calendar.store.svelte.ts:calendarStore.showMonth mcall
call src/lib/plugins/calendar/CalendarNavigator.svelte:31 in grid=$derived -> src/lib/plugins/calendar/calendar.logic.ts:buildMonthGrid call
call src/lib/plugins/calendar/CalendarNavigator.svelte:40 in pickedDay=$derived -> src/lib/plugins/calendar/day-lens.logic.ts:pickedDayLens call
call src/lib/plugins/calendar/CalendarNavigator.svelte:44 in periodicEntries=$derived -> src/lib/plugins/calendar/calendar.logic.ts:periodicNoteEntries call
call src/lib/plugins/calendar/CalendarNavigator.svelte:50 in dayCounts=$derived -> src/lib/plugins/calendar/day-lens.logic.ts:noteDateCounts call
call src/lib/plugins/calendar/CalendarNavigator.svelte:58 in pickDay -> src/lib/core/settings/settings.store.svelte.ts:settingsStore.updateLayout mcall
call src/lib/plugins/calendar/CalendarNavigator.svelte:63 in goToToday -> src/lib/plugins/calendar/calendar.store.svelte.ts:calendarStore.goToToday mcall
call src/lib/plugins/calendar/CalendarNavigator.svelte:64 in goToToday -> src/lib/core/settings/settings.store.svelte.ts:settingsStore.updateLayout mcall
call src/lib/plugins/calendar/CalendarNavigator.svelte:69 in openPeriodicEntry -> src/lib/plugins/calendar/calendar.service.ts:openOrCreatePeriodicNoteForDate call
call src/lib/plugins/calendar/CalendarNavigator.svelte:77 in openCalendarTab -> src/lib/features/event-calendar/event-calendar.service.ts:openEventCalendarTab call
call src/lib/plugins/calendar/CalendarNavigator.svelte:81 in openWeeklyNote -> src/lib/plugins/calendar/calendar.service.ts:openOrCreatePeriodicNoteForDate call
call src/lib/plugins/calendar/CalendarNavigator.svelte:99 in (markup) -> src/lib/plugins/calendar/calendar.store.svelte.ts:calendarStore.prevYear markup
call src/lib/plugins/calendar/CalendarNavigator.svelte:107 in (markup) -> src/lib/plugins/calendar/calendar.store.svelte.ts:calendarStore.prevMonth markup
call src/lib/plugins/calendar/CalendarNavigator.svelte:115 in (markup) -> src/lib/plugins/calendar/CalendarNavigator.svelte:goToToday markup
call src/lib/plugins/calendar/CalendarNavigator.svelte:123 in (markup) -> src/lib/plugins/calendar/calendar.store.svelte.ts:calendarStore.nextMonth markup
call src/lib/plugins/calendar/CalendarNavigator.svelte:131 in (markup) -> src/lib/plugins/calendar/calendar.store.svelte.ts:calendarStore.nextYear markup
call src/lib/plugins/calendar/CalendarNavigator.svelte:139 in (markup) -> src/lib/plugins/calendar/CalendarNavigator.svelte:openWeeklyNote markup
call src/lib/plugins/calendar/CalendarNavigator.svelte:139 in (markup) -> src/lib/plugins/calendar/CalendarNavigator.svelte:pickDay markup
call src/lib/plugins/calendar/CalendarNavigator.svelte:146 in (markup) -> src/lib/plugins/calendar/CalendarNavigator.svelte:openPeriodicEntry markup
call src/lib/plugins/calendar/CalendarNavigator.svelte:155 in (markup) -> src/lib/plugins/calendar/CalendarNavigator.svelte:openCalendarTab markup
## effects
fx src/lib/plugins/calendar/CalendarNavigator.svelte:21 svelte.$effect in (script)
reg src/lib/plugins/calendar/CalendarNavigator.svelte:21 src/lib/features/event-calendar/event-calendar.service.ts:acquireCalendarClock in $effect@21
