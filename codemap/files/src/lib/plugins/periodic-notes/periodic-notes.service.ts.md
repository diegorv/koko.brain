# file card src/lib/plugins/periodic-notes/periodic-notes.service.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/plugins/periodic-notes/periodic-notes.service.ts ' codemap/files
file src/lib/plugins/periodic-notes/periodic-notes.service.ts service L170 module src/lib/plugins/periodic-notes in8 t9
## imports
imp src/lib/plugins/periodic-notes/periodic-notes.service.ts:2 -> src/lib/core/settings/settings.store.svelte.ts settingsStore
imp src/lib/plugins/periodic-notes/periodic-notes.service.ts:3 -> src/lib/core/vault/vault.store.svelte.ts vaultStore
imp src/lib/plugins/periodic-notes/periodic-notes.service.ts:4 -> src/lib/core/editor/editor.service.ts pinTabByPath,unpinTabByPath
imp src/lib/plugins/periodic-notes/periodic-notes.service.ts:5 -> src/lib/core/note-creator/note-creator.service.ts openOrCreateNote
imp src/lib/plugins/periodic-notes/periodic-notes.service.ts:6 -> src/lib/features/event-calendar/event-calendar-daily-note.store.svelte.ts eventCalendarDailyNoteStore
imp src/lib/plugins/periodic-notes/periodic-notes.service.ts:7 -> src/lib/utils/log.service.ts appendLog
imp src/lib/plugins/periodic-notes/periodic-notes.service.ts:8 -> src/lib/core/settings/settings.types.ts type:PeriodType
imp src/lib/plugins/periodic-notes/periodic-notes.service.ts:9 -> src/lib/plugins/periodic-notes/periodic-notes.logic.ts buildPeriodicNotePath,getFormatForPeriod,buildPeriodicVariables,shouldRefreshDailyNote
## imported-by
imp src/lib/app/commands.ts:27 -> src/lib/plugins/periodic-notes/periodic-notes.service.ts openOrCreateDailyNote
imp src/lib/app/deep-link-actions.ts:24 -> src/lib/plugins/periodic-notes/periodic-notes.service.ts openOrCreateDailyNote
imp src/lib/app/editor-host.ts:34 -> src/lib/plugins/periodic-notes/periodic-notes.service.ts openOrCreatePeriodicNoteForDate
imp src/lib/app/lifecycle/app-lifecycle.service.ts:64 -> src/lib/plugins/periodic-notes/periodic-notes.service.ts autoOpenDailyNote,registerCalendarDailyNoteOpener,resetPeriodicNotes
imp src/lib/app/tauri-listeners.service.ts:7 -> src/lib/plugins/periodic-notes/periodic-notes.service.ts refreshDailyNoteIfDateChanged
imp src/lib/plugins/calendar/calendar.service.ts:2 -> src/lib/plugins/periodic-notes/periodic-notes.service.ts openOrCreatePeriodicNoteForDate
imp src/lib/plugins/mods/mod-app.service.ts:19 -> src/lib/plugins/periodic-notes/periodic-notes.service.ts dailyNotePath,openOrCreateDailyNote
imp src/lib/plugins/periodic-notes/DailyNoteButton.svelte:5 -> src/lib/plugins/periodic-notes/periodic-notes.service.ts openOrCreateDailyNote
## reach
in2 src/lib/plugins/periodic-notes/periodic-notes.service.ts 7 files in 4 modules: src/lib/app(3) src/lib/plugins/calendar(2) src/lib/plugins/mods(1) src/routes(1)
out2 src/lib/plugins/periodic-notes/periodic-notes.service.ts 17 files in 7 modules: src/lib/core/editor(4) src/lib/utils(4) src/lib/core/filesystem(3) src/lib/core/settings(3) src/lib/contracts(1) +2 modules
## tests
test src/tests/lib/plugins/periodic-notes/periodic-notes.service.test.ts imports src/lib/plugins/periodic-notes/periodic-notes.service.ts mirror
test src/tests/lib/plugins/mods/mods-host.service.test.ts imports src/lib/plugins/periodic-notes/periodic-notes.service.ts
test src/tests/lib/app/commands.test.ts mocks src/lib/plugins/periodic-notes/periodic-notes.service.ts
test src/tests/lib/app/deep-link-capture-frontmatter.test.ts mocks src/lib/plugins/periodic-notes/periodic-notes.service.ts
test src/tests/lib/app/lifecycle/app-lifecycle.service.test.ts mocks src/lib/plugins/periodic-notes/periodic-notes.service.ts
test src/tests/lib/app/tauri-listeners.service.test.ts mocks src/lib/plugins/periodic-notes/periodic-notes.service.ts
test src/tests/lib/features/command-palette/CommandPalette.test.ts mocks src/lib/plugins/periodic-notes/periodic-notes.service.ts
test src/tests/lib/features/deep-link/deep-link.service.race-audit.test.ts mocks src/lib/plugins/periodic-notes/periodic-notes.service.ts
test src/tests/lib/features/deep-link/deep-link.service.test.ts mocks src/lib/plugins/periodic-notes/periodic-notes.service.ts
## symbols
sym src/lib/plugins/periodic-notes/periodic-notes.service.ts:23 fn dailyNotePath(date: Date = new Date()): string L6 | Absolute path of the daily note of `date`, from Settings > Periodic Notes.
by src/lib/plugins/periodic-notes/periodic-notes.service.ts:dailyNotePath <- src/lib/plugins/mods/mod-app.service.ts:45 in MOD_APP ref
sym src/lib/plugins/periodic-notes/periodic-notes.service.ts:38 fn openOrCreatePeriodicNoteForDate(periodType: PeriodType, date: dayjs.Dayjs): Promise<void> L24 | Opens or creates a periodic note for a specific date.
by src/lib/plugins/periodic-notes/periodic-notes.service.ts:openOrCreatePeriodicNoteForDate <- src/lib/app/editor-host.ts:158 in appEditorHost.createNote call
by src/lib/plugins/periodic-notes/periodic-notes.service.ts:openOrCreatePeriodicNoteForDate <- src/lib/plugins/calendar/calendar.service.ts:11 in openOrCreatePeriodicNoteForDate call
sym src/lib/plugins/periodic-notes/periodic-notes.service.ts:67 fn openOrCreatePeriodicNote(periodType: PeriodType): Promise<void> L3 | Opens or creates a periodic note for today (daily, weekly, monthly, or quarterly).
sym src/lib/plugins/periodic-notes/periodic-notes.service.ts:75 fn openOrCreateDailyNote(): Promise<void> L3 | Opens today's daily note, creating it from a template if it doesn't exist.
by src/lib/plugins/periodic-notes/periodic-notes.service.ts:openOrCreateDailyNote <- src/lib/app/commands.ts:355 in getBuiltInCommands call
by src/lib/plugins/periodic-notes/periodic-notes.service.ts:openOrCreateDailyNote <- src/lib/app/deep-link-actions.ts:50 in executeDailyAction call
by src/lib/plugins/periodic-notes/periodic-notes.service.ts:openOrCreateDailyNote <- src/lib/plugins/mods/mod-app.service.ts:47 in MOD_APP ref
by src/lib/plugins/periodic-notes/periodic-notes.service.ts:openOrCreateDailyNote <- src/lib/plugins/periodic-notes/DailyNoteButton.svelte:16 in (markup) markup
sym src/lib/plugins/periodic-notes/periodic-notes.service.ts:83 fn registerCalendarDailyNoteOpener(): () => void L3 | Lets the Calendar's day headers open the daily note of their day.
by src/lib/plugins/periodic-notes/periodic-notes.service.ts:registerCalendarDailyNoteOpener <- src/lib/app/lifecycle/app-lifecycle.service.ts:281 in initializeVault call
sym src/lib/plugins/periodic-notes/periodic-notes.service.ts:92 fn autoOpenDailyNote(): Promise<void> L30 | Auto-opens (and optionally pins) today's daily note on vault startup.
by src/lib/plugins/periodic-notes/periodic-notes.service.ts:autoOpenDailyNote <- src/lib/app/lifecycle/app-lifecycle.service.ts:542 in initializeVault call
sym src/lib/plugins/periodic-notes/periodic-notes.service.ts:129 fn refreshDailyNoteIfDateChanged(): Promise<void> L32 | Refreshes the auto-pinned daily note when the date has changed.
by src/lib/plugins/periodic-notes/periodic-notes.service.ts:refreshDailyNoteIfDateChanged <- src/lib/app/tauri-listeners.service.ts:332 in registerFocusListener call
sym src/lib/plugins/periodic-notes/periodic-notes.service.ts:163 fn resetPeriodicNotes(): void L3 | Resets periodic notes module state.
by src/lib/plugins/periodic-notes/periodic-notes.service.ts:resetPeriodicNotes <- src/lib/app/lifecycle/app-lifecycle.service.ts:680 in teardownVault call
sym src/lib/plugins/periodic-notes/periodic-notes.service.ts:168 fn _getLastAutoOpenedDate(): string | null L3 | Exposed for testing only — returns the last auto-opened date string.
## calls
call src/lib/plugins/periodic-notes/periodic-notes.service.ts:27 in dailyNotePath -> src/lib/plugins/periodic-notes/periodic-notes.logic.ts:buildPeriodicNotePath call
call src/lib/plugins/periodic-notes/periodic-notes.service.ts:27 in dailyNotePath -> src/lib/plugins/periodic-notes/periodic-notes.logic.ts:getFormatForPeriod call
call src/lib/plugins/periodic-notes/periodic-notes.service.ts:46 in openOrCreatePeriodicNoteForDate -> src/lib/plugins/periodic-notes/periodic-notes.logic.ts:getFormatForPeriod call
call src/lib/plugins/periodic-notes/periodic-notes.service.ts:47 in openOrCreatePeriodicNoteForDate -> src/lib/plugins/periodic-notes/periodic-notes.logic.ts:buildPeriodicNotePath call
call src/lib/plugins/periodic-notes/periodic-notes.service.ts:51 in openOrCreatePeriodicNoteForDate -> src/lib/plugins/periodic-notes/periodic-notes.logic.ts:buildPeriodicVariables call
call src/lib/plugins/periodic-notes/periodic-notes.service.ts:53 in openOrCreatePeriodicNoteForDate -> src/lib/core/note-creator/note-creator.service.ts:openOrCreateNote call
call src/lib/plugins/periodic-notes/periodic-notes.service.ts:68 in openOrCreatePeriodicNote -> src/lib/plugins/periodic-notes/periodic-notes.service.ts:openOrCreatePeriodicNoteForDate call
call src/lib/plugins/periodic-notes/periodic-notes.service.ts:76 in openOrCreateDailyNote -> src/lib/plugins/periodic-notes/periodic-notes.service.ts:openOrCreatePeriodicNote call
call src/lib/plugins/periodic-notes/periodic-notes.service.ts:84 in registerCalendarDailyNoteOpener -> src/lib/features/event-calendar/event-calendar-daily-note.store.svelte.ts:eventCalendarDailyNoteStore.register mcall
call src/lib/plugins/periodic-notes/periodic-notes.service.ts:84 in registerCalendarDailyNoteOpener -> src/lib/plugins/periodic-notes/periodic-notes.service.ts:openOrCreatePeriodicNoteForDate call
call src/lib/plugins/periodic-notes/periodic-notes.service.ts:101 in autoOpenDailyNote -> src/lib/utils/log.service.ts:appendLog call +3
call src/lib/plugins/periodic-notes/periodic-notes.service.ts:105 in autoOpenDailyNote -> src/lib/plugins/periodic-notes/periodic-notes.logic.ts:getFormatForPeriod call
call src/lib/plugins/periodic-notes/periodic-notes.service.ts:106 in autoOpenDailyNote -> src/lib/plugins/periodic-notes/periodic-notes.logic.ts:buildPeriodicNotePath call
call src/lib/plugins/periodic-notes/periodic-notes.service.ts:110 in autoOpenDailyNote -> src/lib/plugins/periodic-notes/periodic-notes.service.ts:openOrCreatePeriodicNoteForDate call
call src/lib/plugins/periodic-notes/periodic-notes.service.ts:115 in autoOpenDailyNote -> src/lib/core/editor/editor.service.ts:pinTabByPath call
call src/lib/plugins/periodic-notes/periodic-notes.service.ts:137 in refreshDailyNoteIfDateChanged -> src/lib/plugins/periodic-notes/periodic-notes.logic.ts:shouldRefreshDailyNote call
call src/lib/plugins/periodic-notes/periodic-notes.service.ts:140 in refreshDailyNoteIfDateChanged -> src/lib/plugins/periodic-notes/periodic-notes.logic.ts:getFormatForPeriod call
call src/lib/plugins/periodic-notes/periodic-notes.service.ts:145 in refreshDailyNoteIfDateChanged -> src/lib/plugins/periodic-notes/periodic-notes.logic.ts:buildPeriodicNotePath call +1
call src/lib/plugins/periodic-notes/periodic-notes.service.ts:146 in refreshDailyNoteIfDateChanged -> src/lib/core/editor/editor.service.ts:unpinTabByPath call
call src/lib/plugins/periodic-notes/periodic-notes.service.ts:151 in refreshDailyNoteIfDateChanged -> src/lib/plugins/periodic-notes/periodic-notes.service.ts:openOrCreatePeriodicNoteForDate call
call src/lib/plugins/periodic-notes/periodic-notes.service.ts:156 in refreshDailyNoteIfDateChanged -> src/lib/core/editor/editor.service.ts:pinTabByPath call
## effects
reg src/lib/plugins/periodic-notes/periodic-notes.service.ts:84 src/lib/features/event-calendar/event-calendar-daily-note.store.svelte.ts:eventCalendarDailyNoteStore.register in registerCalendarDailyNoteOpener args=(day) => openOrCreatePeriodicNoteForDate('daily', dayjs(day, 'YYYY-MM-DD'))
