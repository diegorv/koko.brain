# file card src/lib/plugins/calendar/day-lens.logic.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/plugins/calendar/day-lens.logic.ts ' codemap/files
file src/lib/plugins/calendar/day-lens.logic.ts logic L64 module src/lib/plugins/calendar in2 t4
## imports
imp src/lib/plugins/calendar/day-lens.logic.ts:1 -> src/lib/utils/capture-path.ts buildCaptureFolder
imp src/lib/plugins/calendar/day-lens.logic.ts:2 -> src/lib/utils/note-date.ts parseDateKey
imp src/lib/plugins/calendar/day-lens.logic.ts:3 -> src/lib/features/rail-shell/lens.logic.ts entryNoteDate,listEntries
imp src/lib/plugins/calendar/day-lens.logic.ts:4 -> src/lib/features/type-definitions/type-sidebar.logic.ts excludeSystemFolder,isListableNote
imp src/lib/plugins/calendar/day-lens.logic.ts:5 -> src/lib/features/rail-shell/rail-shell.types.ts type:Lens,type:LensContext,type:NewNoteContext,type:NewNoteRule,type:ResolvedLens
imp src/lib/plugins/calendar/day-lens.logic.ts:6 -> src/lib/plugins/calendar/calendar.logic.ts formatDateLabel
## imported-by
imp src/lib/plugins/calendar/CalendarNavigator.svelte:16 -> src/lib/plugins/calendar/day-lens.logic.ts noteDateCounts,parseRailDay,pickedDayLens
imp src/lib/plugins/calendar/calendar-rail.service.ts:8 -> src/lib/plugins/calendar/day-lens.logic.ts CALENDAR_RAIL_ITEM,DAY_LENS_KIND,dayNewNoteRule,parseRailDay,pickedDayLens,resolveDayLens
## reach
in2 src/lib/plugins/calendar/day-lens.logic.ts 1 files in 1 modules: src/lib/app(1)
out2 src/lib/plugins/calendar/day-lens.logic.ts 19 files in 9 modules: src/lib/features/collection(5) src/lib/core/filesystem(3) src/lib/features/type-definitions(3) src/lib/core/settings(2) src/lib/utils(2) +4 modules
## tests
test src/tests/lib/plugins/calendar/day-lens.logic.test.ts imports src/lib/plugins/calendar/day-lens.logic.ts mirror
test src/tests/lib/core/settings/settings.service.test.ts imports src/lib/plugins/calendar/day-lens.logic.ts
test src/tests/lib/plugins/calendar/CalendarNavigator.test.ts imports src/lib/plugins/calendar/day-lens.logic.ts
test src/tests/lib/plugins/calendar/calendar-rail.service.test.ts imports src/lib/plugins/calendar/day-lens.logic.ts
## symbols
sym src/lib/plugins/calendar/day-lens.logic.ts:9 const DAY_LENS_KIND L1 | The lens kind of a Calendar navigator day; its target is the day's `YYYY-MM-DD` key.
by src/lib/plugins/calendar/day-lens.logic.ts:DAY_LENS_KIND <- src/lib/plugins/calendar/calendar-rail.service.ts:34 in registerCalendarRail ref
sym src/lib/plugins/calendar/day-lens.logic.ts:12 const CALENDAR_RAIL_ITEM L1 | The rail item (and navigator id) of the Calendar navigator.
by src/lib/plugins/calendar/day-lens.logic.ts:CALENDAR_RAIL_ITEM <- src/lib/plugins/calendar/calendar-rail.service.ts:27 in registerCalendarRail ref
sym src/lib/plugins/calendar/day-lens.logic.ts:18 fn parseRailDay(saved: unknown): string | null L4 | A day saved in `layout.railDay`, or null.
by src/lib/plugins/calendar/day-lens.logic.ts:parseRailDay <- src/lib/plugins/calendar/CalendarNavigator.svelte:26 in (script) call
by src/lib/plugins/calendar/day-lens.logic.ts:parseRailDay <- src/lib/plugins/calendar/calendar-rail.service.ts:13 in openDailyNoteForLens call
sym src/lib/plugins/calendar/day-lens.logic.ts:24 fn pickedDayLens(saved: unknown, todayKey: string): Lens L3 | The Calendar navigator's lens: the saved day, else today (`todayKey`).
by src/lib/plugins/calendar/day-lens.logic.ts:pickedDayLens <- src/lib/plugins/calendar/CalendarNavigator.svelte:40 in pickedDay=$derived call
by src/lib/plugins/calendar/day-lens.logic.ts:pickedDayLens <- src/lib/plugins/calendar/calendar-rail.service.ts:31 in registerCalendarRail call
sym src/lib/plugins/calendar/day-lens.logic.ts:35 fn resolveDayLens(lens: Lens, ctx: LensContext): ResolvedLens L9 | Lists a day lens: the notes whose note date is the day (the PRD's rule, `noteDateKey`), system folder, type definitions and `.view` files excluded (`isListable…
by src/lib/plugins/calendar/day-lens.logic.ts:resolveDayLens <- src/lib/plugins/calendar/calendar-rail.service.ts:35 in registerCalendarRail ref
sym src/lib/plugins/calendar/day-lens.logic.ts:46 fn noteDateCounts(ctx: Pick<LensContext, 'entries' | 'vaultPath' | 'systemFolder'>): Map<string, number> L9 | Notes per note date, counted over the same entries and rule the day lens lists: the mini month's dots.
by src/lib/plugins/calendar/day-lens.logic.ts:noteDateCounts <- src/lib/plugins/calendar/CalendarNavigator.svelte:50 in dayCounts=$derived call
sym src/lib/plugins/calendar/day-lens.logic.ts:57 fn dayNewNoteRule(lens: Lens, ctx: NewNoteContext): NewNoteRule | null L8 | "+ New here" on a day: a plain note where Cmd+N puts one, with `date: <day>`.
by src/lib/plugins/calendar/day-lens.logic.ts:dayNewNoteRule <- src/lib/plugins/calendar/calendar-rail.service.ts:36 in registerCalendarRail ref
## calls
call src/lib/plugins/calendar/day-lens.logic.ts:20 in parseRailDay -> src/lib/utils/note-date.ts:parseDateKey call
call src/lib/plugins/calendar/day-lens.logic.ts:25 in pickedDayLens -> src/lib/plugins/calendar/day-lens.logic.ts:parseRailDay call
call src/lib/plugins/calendar/day-lens.logic.ts:36 in resolveDayLens -> src/lib/plugins/calendar/day-lens.logic.ts:parseRailDay call
call src/lib/plugins/calendar/day-lens.logic.ts:39 in resolveDayLens -> src/lib/plugins/calendar/calendar.logic.ts:formatDateLabel call
call src/lib/plugins/calendar/day-lens.logic.ts:41 in resolveDayLens -> src/lib/features/rail-shell/lens.logic.ts:entryNoteDate call
call src/lib/plugins/calendar/day-lens.logic.ts:41 in resolveDayLens -> src/lib/features/rail-shell/lens.logic.ts:listEntries call
call src/lib/plugins/calendar/day-lens.logic.ts:41 in resolveDayLens -> src/lib/features/type-definitions/type-sidebar.logic.ts:isListableNote call
call src/lib/plugins/calendar/day-lens.logic.ts:48 in noteDateCounts -> src/lib/features/type-definitions/type-sidebar.logic.ts:excludeSystemFolder call
call src/lib/plugins/calendar/day-lens.logic.ts:49 in noteDateCounts -> src/lib/features/type-definitions/type-sidebar.logic.ts:isListableNote call
call src/lib/plugins/calendar/day-lens.logic.ts:50 in noteDateCounts -> src/lib/features/rail-shell/lens.logic.ts:entryNoteDate call
call src/lib/plugins/calendar/day-lens.logic.ts:58 in dayNewNoteRule -> src/lib/plugins/calendar/day-lens.logic.ts:parseRailDay call
call src/lib/plugins/calendar/day-lens.logic.ts:61 in dayNewNoteRule -> src/lib/utils/capture-path.ts:buildCaptureFolder call
