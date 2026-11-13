# file card src/lib/plugins/periodic-notes/periodic-notes.logic.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/plugins/periodic-notes/periodic-notes.logic.ts ' codemap/files
file src/lib/plugins/periodic-notes/periodic-notes.logic.ts logic L281 module src/lib/plugins/periodic-notes in5 t4
## imports
imp src/lib/plugins/periodic-notes/periodic-notes.logic.ts:2 -> src/lib/utils/date.ts formatToCapturingRegex
imp src/lib/plugins/periodic-notes/periodic-notes.logic.ts:3 -> src/lib/core/settings/settings.types.ts type:PeriodType,type:PeriodicNotesSettings
## imported-by
imp src/lib/app/deep-link-actions.ts:23 -> src/lib/plugins/periodic-notes/periodic-notes.logic.ts buildPeriodicNotePath
imp src/lib/app/editor-host.ts:33 -> src/lib/plugins/periodic-notes/periodic-notes.logic.ts detectPeriodicNoteType
imp src/lib/plugins/one-on-one/one-on-one.logic.ts:6 -> src/lib/plugins/periodic-notes/periodic-notes.logic.ts buildWikilinkPath
imp src/lib/plugins/periodic-notes/periodic-notes.service.ts:9 -> src/lib/plugins/periodic-notes/periodic-notes.logic.ts buildPeriodicNotePath,getFormatForPeriod,buildPeriodicVariables,shouldRefreshDailyNote
imp src/lib/plugins/quick-capture/note-composer.logic.ts:6 -> src/lib/plugins/periodic-notes/periodic-notes.logic.ts buildWikilinkPath
## reach
in2 src/lib/plugins/periodic-notes/periodic-notes.logic.ts 13 files in 6 modules: src/lib/app(5) src/lib/plugins/one-on-one(4) src/lib/plugins/calendar(1) src/lib/plugins/mods(1) src/lib/plugins/periodic-notes(1) +1 modules: q impact src/lib/plugins/periodic-notes/periodic-notes.logic.ts --depth 2
out2 src/lib/plugins/periodic-notes/periodic-notes.logic.ts 2 files in 1 modules: src/lib/core/settings(2)
## tests
test src/tests/lib/plugins/periodic-notes/periodic-notes.logic.test.ts imports src/lib/plugins/periodic-notes/periodic-notes.logic.ts mirror
test src/tests/lib/app/editor-host.test.ts imports src/lib/plugins/periodic-notes/periodic-notes.logic.ts
test src/tests/lib/features/deep-link/deep-link-dirty-buffer.test.ts imports src/lib/plugins/periodic-notes/periodic-notes.logic.ts
test src/tests/lib/plugins/periodic-notes/periodic-notes.service.test.ts imports src/lib/plugins/periodic-notes/periodic-notes.logic.ts
## symbols
sym src/lib/plugins/periodic-notes/periodic-notes.logic.ts:10 fn buildPeriodicNotePath(vaultPath: string, folder: string, format: string, date: dayjs.Dayjs): string L13 | Builds the full absolute path for a periodic note given a specific date.
by src/lib/plugins/periodic-notes/periodic-notes.logic.ts:buildPeriodicNotePath <- src/lib/app/deep-link-actions.ts:57 in executeDailyAction call
by src/lib/plugins/periodic-notes/periodic-notes.logic.ts:buildPeriodicNotePath <- src/lib/plugins/periodic-notes/periodic-notes.service.ts:27 in dailyNotePath call +4
sym src/lib/plugins/periodic-notes/periodic-notes.logic.ts:27 fn getFormatForPeriod(settings: PeriodicNotesSettings, periodType: PeriodType): string L3 | Returns the format string for a given period type from settings.
by src/lib/plugins/periodic-notes/periodic-notes.logic.ts:getFormatForPeriod <- src/lib/plugins/periodic-notes/periodic-notes.service.ts:27 in dailyNotePath call +3
sym src/lib/plugins/periodic-notes/periodic-notes.logic.ts:35 fn buildWikilinkPath(folder: string, format: string, date: dayjs.Dayjs): string L4 | Builds a wikilink-compatible relative path (no vault prefix, no `.md` extension).
by src/lib/plugins/periodic-notes/periodic-notes.logic.ts:buildWikilinkPath <- src/lib/plugins/one-on-one/one-on-one.logic.ts:62 in buildOneOnOneVariables call
by src/lib/plugins/periodic-notes/periodic-notes.logic.ts:buildWikilinkPath <- src/lib/plugins/quick-capture/note-composer.logic.ts:75 in buildCaptureVariables call
sym src/lib/plugins/periodic-notes/periodic-notes.logic.ts:48 fn buildPeriodicVariables(type: PeriodType, date: dayjs.Dayjs, settings: PeriodicNotesSettings): Record<string, string> L55 | Builds all custom template variables for a periodic note type.
by src/lib/plugins/periodic-notes/periodic-notes.logic.ts:buildPeriodicVariables <- src/lib/plugins/periodic-notes/periodic-notes.service.ts:51 in openOrCreatePeriodicNoteForDate call
sym src/lib/plugins/periodic-notes/periodic-notes.logic.ts:108 fn buildDailyLinksTable(folder: string, dailyFormat: string, date: dayjs.Dayjs): string L12 | Builds a markdown table with wikilinks to each day (Mon–Sun) of the week containing the given date.
sym src/lib/plugins/periodic-notes/periodic-notes.logic.ts:125 fn buildWeeklyLinksTable(folder: string, weeklyFormat: string, date: dayjs.Dayjs): string L15 | Builds a markdown table with wikilinks to each ISO week that overlaps the given month.
sym src/lib/plugins/periodic-notes/periodic-notes.logic.ts:145 fn buildMonthlyLinksTable(folder: string, monthlyFormat: string, date: dayjs.Dayjs): string L13 | Builds a markdown table with wikilinks to the 3 months of the quarter containing the given date.
sym src/lib/plugins/periodic-notes/periodic-notes.logic.ts:163 fn buildQuarterlyLinksTable(folder: string, quarterlyFormat: string, date: dayjs.Dayjs): string L10 | Builds a markdown table with wikilinks to the 4 quarters of the year containing the given date.
sym src/lib/plugins/periodic-notes/periodic-notes.logic.ts:179 fn shouldRefreshDailyNote(lastAutoOpenedDate: string | null, todayDate: string): boolean L7 | Determines whether the daily note should be refreshed based on date change.
by src/lib/plugins/periodic-notes/periodic-notes.logic.ts:shouldRefreshDailyNote <- src/lib/plugins/periodic-notes/periodic-notes.service.ts:137 in refreshDailyNoteIfDateChanged call
sym src/lib/plugins/periodic-notes/periodic-notes.logic.ts:206 fn detectPeriodicNoteType(target: string, settings: PeriodicNotesSettings): { periodType: PeriodType; date: dayjs.Dayjs } | null L25 | Detects whether a wikilink target matches a periodic note pattern.
by src/lib/plugins/periodic-notes/periodic-notes.logic.ts:detectPeriodicNoteType <- src/lib/app/editor-host.ts:56 in periodicTarget call +1
## locals
local src/lib/plugins/periodic-notes/periodic-notes.logic.ts:241 fn buildDateFromGroups(groups: Record<string, string>, periodType: PeriodType): dayjs.Dayjs | null L41
## calls
call src/lib/plugins/periodic-notes/periodic-notes.logic.ts:62 in buildPeriodicVariables -> src/lib/plugins/periodic-notes/periodic-notes.logic.ts:buildWikilinkPath call +16
call src/lib/plugins/periodic-notes/periodic-notes.logic.ts:78 in buildPeriodicVariables -> src/lib/plugins/periodic-notes/periodic-notes.logic.ts:buildDailyLinksTable call
call src/lib/plugins/periodic-notes/periodic-notes.logic.ts:85 in buildPeriodicVariables -> src/lib/plugins/periodic-notes/periodic-notes.logic.ts:buildWeeklyLinksTable call
call src/lib/plugins/periodic-notes/periodic-notes.logic.ts:91 in buildPeriodicVariables -> src/lib/plugins/periodic-notes/periodic-notes.logic.ts:buildMonthlyLinksTable call
call src/lib/plugins/periodic-notes/periodic-notes.logic.ts:97 in buildPeriodicVariables -> src/lib/plugins/periodic-notes/periodic-notes.logic.ts:buildQuarterlyLinksTable call
call src/lib/plugins/periodic-notes/periodic-notes.logic.ts:114 in buildDailyLinksTable -> src/lib/plugins/periodic-notes/periodic-notes.logic.ts:buildWikilinkPath call
call src/lib/plugins/periodic-notes/periodic-notes.logic.ts:132 in buildWeeklyLinksTable -> src/lib/plugins/periodic-notes/periodic-notes.logic.ts:buildWikilinkPath call
call src/lib/plugins/periodic-notes/periodic-notes.logic.ts:152 in buildMonthlyLinksTable -> src/lib/plugins/periodic-notes/periodic-notes.logic.ts:buildWikilinkPath call
call src/lib/plugins/periodic-notes/periodic-notes.logic.ts:167 in buildQuarterlyLinksTable -> src/lib/plugins/periodic-notes/periodic-notes.logic.ts:buildWikilinkPath call
call src/lib/plugins/periodic-notes/periodic-notes.logic.ts:218 in detectPeriodicNoteType -> src/lib/plugins/periodic-notes/periodic-notes.logic.ts:getFormatForPeriod call
call src/lib/plugins/periodic-notes/periodic-notes.logic.ts:219 in detectPeriodicNoteType -> src/lib/utils/date.ts:formatToCapturingRegex call
call src/lib/plugins/periodic-notes/periodic-notes.logic.ts:223 in detectPeriodicNoteType -> src/lib/plugins/periodic-notes/periodic-notes.logic.ts:buildDateFromGroups call
