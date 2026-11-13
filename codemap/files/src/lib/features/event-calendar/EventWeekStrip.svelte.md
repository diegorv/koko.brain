# file card src/lib/features/event-calendar/EventWeekStrip.svelte
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/features/event-calendar/EventWeekStrip.svelte ' codemap/files
file src/lib/features/event-calendar/EventWeekStrip.svelte component L60 module src/lib/features/event-calendar in1 t1
## imports
imp src/lib/features/event-calendar/EventWeekStrip.svelte:2 -> src/lib/core/settings/settings.store.svelte.ts settingsStore
imp src/lib/features/event-calendar/EventWeekStrip.svelte:3 -> src/lib/features/event-calendar/event-calendar-dates.logic.ts dayOfWeek,formatLong,formatWeekday,fromKey,weekDays,WEEKDAYS_SHORT
imp src/lib/features/event-calendar/EventWeekStrip.svelte:4 -> src/lib/features/event-calendar/event-calendar-view.store.svelte.ts eventCalendarViewStore
## imported-by
imp src/lib/features/event-calendar/EventCalendarView.svelte:34 -> src/lib/features/event-calendar/EventWeekStrip.svelte default
## reach
in2 src/lib/features/event-calendar/EventWeekStrip.svelte 1 files in 1 modules: src/lib/app(1)
out2 src/lib/features/event-calendar/EventWeekStrip.svelte 5 files in 2 modules: src/lib/core/settings(3) src/lib/features/event-calendar(2)
## tests
test src/tests/lib/features/event-calendar/EventWeekStrip.test.ts imports src/lib/features/event-calendar/EventWeekStrip.svelte mirror
## symbols
sym src/lib/features/event-calendar/EventWeekStrip.svelte:1 component EventWeekStrip L60
by src/lib/features/event-calendar/EventWeekStrip.svelte:default <- src/lib/features/event-calendar/EventCalendarView.svelte:251 in (markup) mount
## mounted-at
mount src/lib/features/event-calendar/EventCalendarView.svelte:251 EventWeekStrip -> src/lib/features/event-calendar/EventWeekStrip.svelte
## calls
call src/lib/features/event-calendar/EventWeekStrip.svelte:8 in days=$derived -> src/lib/features/event-calendar/event-calendar-dates.logic.ts:weekDays call
call src/lib/features/event-calendar/EventWeekStrip.svelte:42 in (markup) -> src/lib/features/event-calendar/event-calendar-dates.logic.ts:formatLong markup
call src/lib/features/event-calendar/EventWeekStrip.svelte:42 in (markup) -> src/lib/features/event-calendar/event-calendar-dates.logic.ts:formatWeekday markup
call src/lib/features/event-calendar/EventWeekStrip.svelte:45 in (markup) -> src/lib/features/event-calendar/event-calendar-view.store.svelte.ts:eventCalendarViewStore.setDate markup
call src/lib/features/event-calendar/EventWeekStrip.svelte:47 in (markup) -> src/lib/features/event-calendar/event-calendar-dates.logic.ts:dayOfWeek markup
call src/lib/features/event-calendar/EventWeekStrip.svelte:56 in (markup) -> src/lib/features/event-calendar/event-calendar-dates.logic.ts:fromKey markup
## effects
fx src/lib/features/event-calendar/EventWeekStrip.svelte:16 svelte.$effect in (script)
fx src/lib/features/event-calendar/EventWeekStrip.svelte:20 svelte.$effect in (script)
