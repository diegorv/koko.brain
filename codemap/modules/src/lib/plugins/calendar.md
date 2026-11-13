# module card src/lib/plugins/calendar
cols: module <path> <layer> files <n> in-modules <n> out-modules <n> pub <public>/<exports> ipc <called>/<served> card ~<k>k · dep <from> -> <to> <file pairs> · in2/out2 <module> <n> modules: <module>(<via>) · entry <file> ext-in<n> <importers> · file … · sym … · grep: grep -rF -- '-> src/lib/plugins/calendar ' codemap/modules
module src/lib/plugins/calendar plugins files 7 in-modules 1 out-modules 7 pub 2/21 ipc 0/0 card ~0.9k
## neighbors
dep src/lib/app -> src/lib/plugins/calendar 2
dep src/lib/plugins/calendar -> src/lib/core/settings 4
dep src/lib/plugins/calendar -> src/lib/core/vault 1
dep src/lib/plugins/calendar -> src/lib/features/event-calendar 4
dep src/lib/plugins/calendar -> src/lib/features/rail-shell 4
dep src/lib/plugins/calendar -> src/lib/features/type-definitions 2
dep src/lib/plugins/calendar -> src/lib/plugins/periodic-notes 1
dep src/lib/plugins/calendar -> src/lib/utils 3
in2 src/lib/plugins/calendar 1 modules: src/routes(1)
out2 src/lib/plugins/calendar 10 modules: src/lib/core/filesystem(9) src/lib/features/collection(7) src/lib/types(5) src/lib/core/editor(4) src/lib/core/frontmatter(3) +5 modules
## entry files
entry src/lib/plugins/calendar/calendar-rail.service.ts ext-in1 src/lib/app/lifecycle/app-lifecycle.service.ts
entry src/lib/plugins/calendar/calendar.service.ts ext-in1 src/lib/app/lifecycle/app-lifecycle.service.ts
## files
file src/lib/plugins/calendar/CalendarGrid.svelte component L76 module src/lib/plugins/calendar in1 t1
file src/lib/plugins/calendar/CalendarNavigator.svelte component L163 module src/lib/plugins/calendar in1 t1
file src/lib/plugins/calendar/calendar-rail.service.ts service L49 module src/lib/plugins/calendar in1 t1
file src/lib/plugins/calendar/calendar.logic.ts logic L156 module src/lib/plugins/calendar in3 t3
file src/lib/plugins/calendar/calendar.service.ts service L17 module src/lib/plugins/calendar in3 t2
file src/lib/plugins/calendar/calendar.store.svelte.ts store L56 module src/lib/plugins/calendar in2 t3
file src/lib/plugins/calendar/day-lens.logic.ts logic L64 module src/lib/plugins/calendar in2 t4
## public
sym src/lib/plugins/calendar/calendar-rail.service.ts:25 fn registerCalendarRail(): () => void L25 | Adds the Calendar navigator and the Day lens to the rail shell, which may not import plugins (ADR 0003).
sym src/lib/plugins/calendar/calendar.service.ts:15 fn resetCalendar(): void L3 | Resets the calendar store
## stores
store src/lib/plugins/calendar/calendar.store.svelte.ts:7 calendarStore esc:0
## effects
fx-count svelte.$effect 1
## debt
-
