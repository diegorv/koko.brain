# file card src/lib/plugins/calendar/calendar.service.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/plugins/calendar/calendar.service.ts ' codemap/files
file src/lib/plugins/calendar/calendar.service.ts service L17 module src/lib/plugins/calendar in3 t2
## imports
imp src/lib/plugins/calendar/calendar.service.ts:1 -> src/lib/core/settings/settings.types.ts type:PeriodType
imp src/lib/plugins/calendar/calendar.service.ts:2 -> src/lib/plugins/periodic-notes/periodic-notes.service.ts openOrCreatePeriodicNoteForDate
imp src/lib/plugins/calendar/calendar.service.ts:3 -> src/lib/plugins/calendar/calendar.store.svelte.ts calendarStore
## imported-by
imp src/lib/app/lifecycle/app-lifecycle.service.ts:56 -> src/lib/plugins/calendar/calendar.service.ts resetCalendar
imp src/lib/plugins/calendar/CalendarNavigator.svelte:14 -> src/lib/plugins/calendar/calendar.service.ts openOrCreatePeriodicNoteForDate
imp src/lib/plugins/calendar/calendar-rail.service.ts:7 -> src/lib/plugins/calendar/calendar.service.ts openOrCreatePeriodicNoteForDate
## reach
in2 src/lib/plugins/calendar/calendar.service.ts 1 files in 1 modules: src/routes(1)
out2 src/lib/plugins/calendar/calendar.service.ts 9 files in 7 modules: src/lib/core/settings(3) src/lib/core/editor(1) src/lib/core/note-creator(1) src/lib/core/vault(1) src/lib/features/event-calendar(1) +2 modules
## tests
test src/tests/lib/plugins/calendar/calendar.service.test.ts imports src/lib/plugins/calendar/calendar.service.ts mirror
test src/tests/lib/app/lifecycle/app-lifecycle.service.test.ts mocks src/lib/plugins/calendar/calendar.service.ts
## symbols
sym src/lib/plugins/calendar/calendar.service.ts:10 fn openOrCreatePeriodicNoteForDate(periodType: PeriodType, dateKey: string): Promise<void> L3 | Opens or creates a periodic note of any type for an arbitrary date.
by src/lib/plugins/calendar/calendar.service.ts:openOrCreatePeriodicNoteForDate <- src/lib/plugins/calendar/CalendarNavigator.svelte:69 in openPeriodicEntry call +1
by src/lib/plugins/calendar/calendar.service.ts:openOrCreatePeriodicNoteForDate <- src/lib/plugins/calendar/calendar-rail.service.ts:15 in openDailyNoteForLens call
sym src/lib/plugins/calendar/calendar.service.ts:15 fn resetCalendar(): void L3 | Resets the calendar store
by src/lib/plugins/calendar/calendar.service.ts:resetCalendar <- src/lib/app/lifecycle/app-lifecycle.service.ts:671 in teardownVault call
## calls
call src/lib/plugins/calendar/calendar.service.ts:11 in openOrCreatePeriodicNoteForDate -> src/lib/plugins/periodic-notes/periodic-notes.service.ts:openOrCreatePeriodicNoteForDate call
call src/lib/plugins/calendar/calendar.service.ts:16 in resetCalendar -> src/lib/plugins/calendar/calendar.store.svelte.ts:calendarStore.reset mcall
