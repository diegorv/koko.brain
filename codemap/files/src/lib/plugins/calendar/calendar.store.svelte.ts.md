# file card src/lib/plugins/calendar/calendar.store.svelte.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/plugins/calendar/calendar.store.svelte.ts ' codemap/files
file src/lib/plugins/calendar/calendar.store.svelte.ts store L56 module src/lib/plugins/calendar in2 t3
## imported-by
imp src/lib/plugins/calendar/CalendarNavigator.svelte:13 -> src/lib/plugins/calendar/calendar.store.svelte.ts calendarStore
imp src/lib/plugins/calendar/calendar.service.ts:3 -> src/lib/plugins/calendar/calendar.store.svelte.ts calendarStore
## reach
in2 src/lib/plugins/calendar/calendar.store.svelte.ts 2 files in 2 modules: src/lib/app(1) src/lib/plugins/calendar(1)
out2 src/lib/plugins/calendar/calendar.store.svelte.ts 0 files in 0 modules: -
## tests
test src/tests/lib/plugins/calendar/calendar.store.test.ts imports src/lib/plugins/calendar/calendar.store.svelte.ts mirror
test src/tests/lib/plugins/calendar/CalendarNavigator.test.ts imports src/lib/plugins/calendar/calendar.store.svelte.ts
test src/tests/lib/plugins/calendar/calendar.service.test.ts imports src/lib/plugins/calendar/calendar.store.svelte.ts
## symbols
sym src/lib/plugins/calendar/calendar.store.svelte.ts:7 store calendarStore L50 | Reactive store for the calendar panel state
by src/lib/plugins/calendar/calendar.store.svelte.ts:calendarStore <- src/lib/plugins/calendar/CalendarNavigator.svelte:27 in (script) mcall +9
by src/lib/plugins/calendar/calendar.store.svelte.ts:calendarStore <- src/lib/plugins/calendar/calendar.service.ts:16 in resetCalendar mcall
## store
store src/lib/plugins/calendar/calendar.store.svelte.ts:7 calendarStore esc:0
mem src/lib/plugins/calendar/calendar.store.svelte.ts:8 get calendarStore.currentYear r:src/lib/plugins/calendar/CalendarNavigator.svelte:32,src/lib/plugins/calendar/CalendarNavigator.svelte:44 w-via:nextMonth,prevMonth,nextYear,prevYear,showMonth,+2
mem src/lib/plugins/calendar/calendar.store.svelte.ts:9 get calendarStore.currentMonth r:src/lib/plugins/calendar/CalendarNavigator.svelte:33,src/lib/plugins/calendar/CalendarNavigator.svelte:44 w-via:nextMonth,prevMonth,showMonth,goToToday,reset
mem src/lib/plugins/calendar/calendar.store.svelte.ts:12 do calendarStore.nextMonth w:src/lib/plugins/calendar/CalendarNavigator.svelte:123 | Advances to the next month
mem src/lib/plugins/calendar/calendar.store.svelte.ts:22 do calendarStore.prevMonth w:src/lib/plugins/calendar/CalendarNavigator.svelte:107 | Goes back to the previous month
mem src/lib/plugins/calendar/calendar.store.svelte.ts:32 do calendarStore.nextYear w:src/lib/plugins/calendar/CalendarNavigator.svelte:131 | Advances to the next year
mem src/lib/plugins/calendar/calendar.store.svelte.ts:35 do calendarStore.prevYear w:src/lib/plugins/calendar/CalendarNavigator.svelte:99 | Goes back to the previous year
mem src/lib/plugins/calendar/calendar.store.svelte.ts:38 do calendarStore.showMonth w:src/lib/plugins/calendar/CalendarNavigator.svelte:27 | Shows the given month (0-11)
mem src/lib/plugins/calendar/calendar.store.svelte.ts:44 do calendarStore.goToToday w:src/lib/plugins/calendar/CalendarNavigator.svelte:63 | Navigates to the current month
mem src/lib/plugins/calendar/calendar.store.svelte.ts:51 do calendarStore.reset w:src/lib/plugins/calendar/calendar.service.ts:16 | Resets all state to defaults
