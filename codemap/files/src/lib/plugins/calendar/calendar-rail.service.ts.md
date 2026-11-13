# file card src/lib/plugins/calendar/calendar-rail.service.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/plugins/calendar/calendar-rail.service.ts ' codemap/files
file src/lib/plugins/calendar/calendar-rail.service.ts service L49 module src/lib/plugins/calendar in1 t1
## imports
imp src/lib/plugins/calendar/calendar-rail.service.ts:3 -> src/lib/core/settings/settings.store.svelte.ts settingsStore
imp src/lib/plugins/calendar/calendar-rail.service.ts:4 -> src/lib/features/event-calendar/event-calendar-view.store.svelte.ts eventCalendarViewStore
imp src/lib/plugins/calendar/calendar-rail.service.ts:5 -> src/lib/features/rail-shell/rail-registry.store.svelte.ts railRegistryStore
imp src/lib/plugins/calendar/calendar-rail.service.ts:6 -> src/lib/features/rail-shell/rail-shell.types.ts type:Lens
imp src/lib/plugins/calendar/calendar-rail.service.ts:7 -> src/lib/plugins/calendar/calendar.service.ts openOrCreatePeriodicNoteForDate
imp src/lib/plugins/calendar/calendar-rail.service.ts:8 -> src/lib/plugins/calendar/day-lens.logic.ts CALENDAR_RAIL_ITEM,DAY_LENS_KIND,dayNewNoteRule,parseRailDay,pickedDayLens,resolveDayLens
imp src/lib/plugins/calendar/calendar-rail.service.ts:9 -> src/lib/plugins/calendar/CalendarNavigator.svelte default
## imported-by
imp src/lib/app/lifecycle/app-lifecycle.service.ts:66 -> src/lib/plugins/calendar/calendar-rail.service.ts registerCalendarRail
## reach
in2 src/lib/plugins/calendar/calendar-rail.service.ts 1 files in 1 modules: src/routes(1)
out2 src/lib/plugins/calendar/calendar-rail.service.ts 22 files in 11 modules: src/lib/features/event-calendar(4) src/lib/core/settings(3) src/lib/features/type-definitions(3) src/lib/plugins/calendar(3) src/lib/utils(3) +6 modules
## tests
test src/tests/lib/plugins/calendar/calendar-rail.service.test.ts imports src/lib/plugins/calendar/calendar-rail.service.ts mirror
## symbols
sym src/lib/plugins/calendar/calendar-rail.service.ts:25 fn registerCalendarRail(): () => void L25 | Adds the Calendar navigator and the Day lens to the rail shell, which may not import plugins (ADR 0003).
by src/lib/plugins/calendar/calendar-rail.service.ts:registerCalendarRail <- src/lib/app/lifecycle/app-lifecycle.service.ts:277 in initializeVault call
## locals
local src/lib/plugins/calendar/calendar-rail.service.ts:12 fn openDailyNoteForLens(lens: Lens): Promise<void> L5
## calls
call src/lib/plugins/calendar/calendar-rail.service.ts:13 in openDailyNoteForLens -> src/lib/plugins/calendar/day-lens.logic.ts:parseRailDay call
call src/lib/plugins/calendar/calendar-rail.service.ts:15 in openDailyNoteForLens -> src/lib/plugins/calendar/calendar.service.ts:openOrCreatePeriodicNoteForDate call
call src/lib/plugins/calendar/calendar-rail.service.ts:26 in registerCalendarRail -> src/lib/features/rail-shell/rail-registry.store.svelte.ts:railRegistryStore.registerNavigator mcall
call src/lib/plugins/calendar/calendar-rail.service.ts:31 in registerCalendarRail -> src/lib/plugins/calendar/day-lens.logic.ts:pickedDayLens call
call src/lib/plugins/calendar/calendar-rail.service.ts:33 in registerCalendarRail -> src/lib/features/rail-shell/rail-registry.store.svelte.ts:railRegistryStore.registerLensProvider mcall
call src/lib/plugins/calendar/calendar-rail.service.ts:35 in registerCalendarRail -> src/lib/plugins/calendar/day-lens.logic.ts:resolveDayLens ref
call src/lib/plugins/calendar/calendar-rail.service.ts:36 in registerCalendarRail -> src/lib/plugins/calendar/day-lens.logic.ts:dayNewNoteRule ref
call src/lib/plugins/calendar/calendar-rail.service.ts:42 in registerCalendarRail -> src/lib/plugins/calendar/calendar-rail.service.ts:openDailyNoteForLens ref
## effects
reg src/lib/plugins/calendar/calendar-rail.service.ts:26 src/lib/features/rail-shell/rail-registry.store.svelte.ts:railRegistryStore.registerNavigator in registerCalendarRail args={ id: CALENDAR_RAIL_ITEM, label: 'Calendar', icon: CalendarDays, component: Cal…
reg src/lib/plugins/calendar/calendar-rail.service.ts:33 src/lib/features/rail-shell/rail-registry.store.svelte.ts:railRegistryStore.registerLensProvider in registerCalendarRail args={ kind: DAY_LENS_KIND, resolve: resolveDayLens, newNote: dayNewNoteRule, header…
