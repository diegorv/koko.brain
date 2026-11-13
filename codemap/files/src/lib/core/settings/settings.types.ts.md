# file card src/lib/core/settings/settings.types.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/core/settings/settings.types.ts ' codemap/files
sections: imports, imported-by, reach, tests, symbols
file src/lib/core/settings/settings.types.ts types L461 module src/lib/core/settings in24 t0
## imports
imp src/lib/core/settings/settings.types.ts:1 -> src/lib/core/settings/settings.logic.ts type:EVENT_CALENDAR_COLORS,type:EVENT_CALENDAR_VIEW_MODES,type:TODOIST_SYNC_CONTEXTS
imp src/lib/core/settings/settings.types.ts:398 -> src/lib/core/settings/theme.types.ts type:AppearanceSettings
## imported-by
imp src/lib/app/SettingsPanel.svelte:40 -> src/lib/core/settings/settings.types.ts type:SettingsSection
imp src/lib/core/settings/heading-typography.logic.ts:1 -> src/lib/core/settings/settings.types.ts type:HeadingFontWeight,type:HeadingTypography
imp src/lib/core/settings/sections/HeadingTypographyEditor.svelte:10 -> src/lib/core/settings/settings.types.ts type:HeadingTypography,type:HeadingFontWeight
imp src/lib/core/settings/sections/UpdateSection.svelte:13 -> src/lib/core/settings/settings.types.ts type:ReleaseChannel
imp src/lib/core/settings/sentry.service.ts:3 -> src/lib/core/settings/settings.types.ts type:SentrySettings
imp src/lib/core/settings/settings-panel.store.svelte.ts:1 -> src/lib/core/settings/settings.types.ts type:SettingsSection
imp src/lib/core/settings/settings-persistence.svelte.ts:5 -> src/lib/core/settings/settings.types.ts type:SettingsLoadOutcome
imp src/lib/core/settings/settings.logic.ts:2 -> src/lib/core/settings/settings.types.ts type:AppSettings,type:EditorSettings,type:EventCalendarSettings,type:HeadingLevelSettings,type:HeadingTypography,type:LayoutSettings,type:SettingsSection,type:TodoistSettings
imp src/lib/core/settings/settings.service.ts:3 -> src/lib/core/settings/settings.types.ts type:AppSettings,type:SettingsLoadOutcome
imp src/lib/core/settings/settings.store.svelte.ts:1 -> src/lib/core/settings/settings.types.ts type:AppSettings,type:PeriodicNotesUpdate,type:QuickCaptureUpdate,type:OneOnOneSettings,type:LayoutSettings,type:FolderNotesSettings,type:EditorSettings,type:TemplatesSettings,type:HistorySettings,type:SearchSettings,type:TodoistSettings,type:SentrySettings,type:AutoOrganizeSettings,type:TagColorSettings,type:QueryjsSettings,type:UpdateSettings,type:EventCalendarSettings
imp src/lib/features/event-calendar/EventCalendarSection.svelte:10 -> src/lib/core/settings/settings.types.ts type:EventCalendarViewMode
imp src/lib/features/event-calendar/event-calendar-event.logic.ts:12 -> src/lib/core/settings/settings.types.ts type:EventCalendarSettings
imp src/lib/features/event-calendar/event-calendar-form.logic.ts:10 -> src/lib/core/settings/settings.types.ts type:EventCalendarSettings
imp src/lib/features/event-calendar/event-calendar.types.ts:11 -> src/lib/core/settings/settings.types.ts type:EventCalendarColor,type:EventCalendarViewMode
imp src/lib/features/rail-shell/lens.logic.ts:2 -> src/lib/core/settings/settings.types.ts type:LayoutSettings
imp src/lib/features/todoist-sync/TodoistSection.svelte:10 -> src/lib/core/settings/settings.types.ts type:TodoistSyncContext
imp src/lib/plugins/calendar/calendar.logic.ts:3 -> src/lib/core/settings/settings.types.ts type:PeriodType
imp src/lib/plugins/calendar/calendar.service.ts:1 -> src/lib/core/settings/settings.types.ts type:PeriodType
imp src/lib/plugins/one-on-one/one-on-one.logic.ts:2 -> src/lib/core/settings/settings.types.ts type:PeriodicNotesSettings
imp src/lib/plugins/periodic-notes/periodic-notes.logic.ts:3 -> src/lib/core/settings/settings.types.ts type:PeriodType,type:PeriodicNotesSettings
imp src/lib/plugins/periodic-notes/periodic-notes.service.ts:8 -> src/lib/core/settings/settings.types.ts type:PeriodType
imp src/lib/plugins/queryjs/QueryjsSection.svelte:6 -> src/lib/core/settings/settings.types.ts type:AutoRunQueriesPolicy
imp src/lib/plugins/quick-capture/note-composer.logic.ts:3 -> src/lib/core/settings/settings.types.ts type:PeriodicNotesSettings
imp src/lib/utils/app-channel.ts:1 -> src/lib/core/settings/settings.types.ts type:ReleaseChannel
## reach
in2 src/lib/core/settings/settings.types.ts 99 files in 27 modules: src/lib/features/event-calendar(22) src/lib/core/settings(12) src/lib/app(11) src/lib/features/rail-shell(11) src/lib/features/search(4) +22 modules: q impact src/lib/core/settings/settings.types.ts --depth 2
out2 src/lib/core/settings/settings.types.ts 2 files in 2 modules: src/lib/core/settings(1) src/lib/utils(1)
## tests
test src/tests/lib/core/settings/heading-typography.logic.test.ts imports-type src/lib/core/settings/settings.types.ts
test src/tests/lib/core/settings/settings.logic.test.ts imports-type src/lib/core/settings/settings.types.ts
test src/tests/lib/plugins/one-on-one/one-on-one.logic.test.ts imports-type src/lib/core/settings/settings.types.ts
test src/tests/lib/plugins/periodic-notes/periodic-notes.logic.test.ts imports-type src/lib/core/settings/settings.types.ts
test src/tests/lib/plugins/quick-capture/note-composer.logic.test.ts imports-type src/lib/core/settings/settings.types.ts
## symbols
sym src/lib/core/settings/settings.types.ts:4 type PeriodType L1 | Supported periodic note types
by src/lib/core/settings/settings.types.ts:PeriodType <- src/lib/plugins/calendar/calendar.logic.ts:3 in (module) import
by src/lib/core/settings/settings.types.ts:PeriodType <- src/lib/plugins/calendar/calendar.service.ts:1 in (module) import
by src/lib/core/settings/settings.types.ts:PeriodType <- src/lib/plugins/periodic-notes/periodic-notes.logic.ts:3 in (module) import
by src/lib/core/settings/settings.types.ts:PeriodType <- src/lib/plugins/periodic-notes/periodic-notes.service.ts:8 in (module) import
sym src/lib/core/settings/settings.types.ts:7 interface PeriodicNoteTypeSettings L6 | Shared configuration for a single periodic note type
sym src/lib/core/settings/settings.types.ts:15 interface PeriodicNotesSettings L21 | Configuration for the periodic notes plugin
by src/lib/core/settings/settings.types.ts:PeriodicNotesSettings <- src/lib/plugins/one-on-one/one-on-one.logic.ts:2 in (module) import
by src/lib/core/settings/settings.types.ts:PeriodicNotesSettings <- src/lib/plugins/periodic-notes/periodic-notes.logic.ts:3 in (module) import
by src/lib/core/settings/settings.types.ts:PeriodicNotesSettings <- src/lib/plugins/quick-capture/note-composer.logic.ts:3 in (module) import
sym src/lib/core/settings/settings.types.ts:38 interface PeriodicNotesUpdate L8 | Deep-partial variant of PeriodicNotesSettings — nested period objects accept partial fields
by src/lib/core/settings/settings.types.ts:PeriodicNotesUpdate <- src/lib/core/settings/settings.store.svelte.ts:1 in (module) import
sym src/lib/core/settings/settings.types.ts:48 interface LayoutSettings L70 | Configuration for layout visibility preferences
by src/lib/core/settings/settings.types.ts:LayoutSettings <- src/lib/core/settings/settings.logic.ts:2 in (module) import
by src/lib/core/settings/settings.types.ts:LayoutSettings <- src/lib/core/settings/settings.store.svelte.ts:1 in (module) import
by src/lib/core/settings/settings.types.ts:LayoutSettings <- src/lib/features/rail-shell/lens.logic.ts:2 in (module) import
sym src/lib/core/settings/settings.types.ts:120 interface FolderNotesSettings L4 | Configuration for the folder notes feature
by src/lib/core/settings/settings.types.ts:FolderNotesSettings <- src/lib/core/settings/settings.store.svelte.ts:1 in (module) import
sym src/lib/core/settings/settings.types.ts:126 type HeadingFontWeight L1 | Font weight options for headings
by src/lib/core/settings/settings.types.ts:HeadingFontWeight <- src/lib/core/settings/heading-typography.logic.ts:1 in (module) import
by src/lib/core/settings/settings.types.ts:HeadingFontWeight <- src/lib/core/settings/sections/HeadingTypographyEditor.svelte:10 in (script) import
sym src/lib/core/settings/settings.types.ts:129 interface HeadingLevelSettings L10 | Typography settings for a single heading level
by src/lib/core/settings/settings.types.ts:HeadingLevelSettings <- src/lib/core/settings/settings.logic.ts:2 in (module) import
sym src/lib/core/settings/settings.types.ts:141 interface HeadingTypography L8 | Typography configuration for all heading levels (h1–h6)
by src/lib/core/settings/settings.types.ts:HeadingTypography <- src/lib/core/settings/heading-typography.logic.ts:1 in (module) import
by src/lib/core/settings/settings.types.ts:HeadingTypography <- src/lib/core/settings/sections/HeadingTypographyEditor.svelte:10 in (script) import
by src/lib/core/settings/settings.types.ts:HeadingTypography <- src/lib/core/settings/settings.logic.ts:2 in (module) import
sym src/lib/core/settings/settings.types.ts:151 interface EditorSettings L22 | Configuration for the markdown editor appearance
by src/lib/core/settings/settings.types.ts:EditorSettings <- src/lib/core/settings/settings.logic.ts:2 in (module) import
by src/lib/core/settings/settings.types.ts:EditorSettings <- src/lib/core/settings/settings.store.svelte.ts:1 in (module) import
sym src/lib/core/settings/settings.types.ts:175 interface TemplatesSettings L10 | Configuration for the templates plugin
by src/lib/core/settings/settings.types.ts:TemplatesSettings <- src/lib/core/settings/settings.store.svelte.ts:1 in (module) import
sym src/lib/core/settings/settings.types.ts:187 interface OneOnOneSettings L14 | Configuration for the 1:1 notes plugin
by src/lib/core/settings/settings.types.ts:OneOnOneSettings <- src/lib/core/settings/settings.store.svelte.ts:1 in (module) import
sym src/lib/core/settings/settings.types.ts:207 interface QuickCaptureTemplates L7 | Per-kind template paths for the Quick Capture composer + clipboard shortcut.
sym src/lib/core/settings/settings.types.ts:216 interface QuickCaptureSettings L8 | Configuration for the Quick Capture surface (composer popover + clipboard shortcut)
sym src/lib/core/settings/settings.types.ts:226 interface QuickCaptureUpdate L5 | Partial Quick Capture update — `templates` accepts a per-kind subset
by src/lib/core/settings/settings.types.ts:QuickCaptureUpdate <- src/lib/core/settings/settings.store.svelte.ts:1 in (module) import
sym src/lib/core/settings/settings.types.ts:233 interface HistorySettings L8 | Configuration for the file history feature
by src/lib/core/settings/settings.types.ts:HistorySettings <- src/lib/core/settings/settings.store.svelte.ts:1 in (module) import
sym src/lib/core/settings/settings.types.ts:243 interface SearchSettings L4 | Configuration for the search feature
by src/lib/core/settings/settings.types.ts:SearchSettings <- src/lib/core/settings/settings.store.svelte.ts:1 in (module) import
sym src/lib/core/settings/settings.types.ts:249 interface TodoistSettings L25 | Configuration for the Todoist integration
by src/lib/core/settings/settings.types.ts:TodoistSettings <- src/lib/core/settings/settings.logic.ts:2 in (module) import
by src/lib/core/settings/settings.types.ts:TodoistSettings <- src/lib/core/settings/settings.store.svelte.ts:1 in (module) import
sym src/lib/core/settings/settings.types.ts:276 type TodoistSyncContext L1 | One of the vault contexts in `TODOIST_SYNC_CONTEXTS`
by src/lib/core/settings/settings.types.ts:TodoistSyncContext <- src/lib/features/todoist-sync/TodoistSection.svelte:10 in (script) import
sym src/lib/core/settings/settings.types.ts:279 interface SentrySettings L6 | Configuration for the optional Sentry error-monitoring integration.
by src/lib/core/settings/settings.types.ts:SentrySettings <- src/lib/core/settings/sentry.service.ts:3 in (module) import
by src/lib/core/settings/settings.types.ts:SentrySettings <- src/lib/core/settings/settings.store.svelte.ts:1 in (module) import
sym src/lib/core/settings/settings.types.ts:287 interface AutoOrganizeSettings L6 | Settings for the auto-organize feature, persisted inside AppSettings
by src/lib/core/settings/settings.types.ts:AutoOrganizeSettings <- src/lib/core/settings/settings.store.svelte.ts:1 in (module) import
sym src/lib/core/settings/settings.types.ts:295 interface TagColorSettings L4 | Configuration for tag color assignments
by src/lib/core/settings/settings.types.ts:TagColorSettings <- src/lib/core/settings/settings.store.svelte.ts:1 in (module) import
sym src/lib/core/settings/settings.types.ts:301 type AutoRunQueriesPolicy L4 | Policy for QueryJS block execution — controls when `kb.pages()`/`dv.view()` blocks run
by src/lib/core/settings/settings.types.ts:AutoRunQueriesPolicy <- src/lib/plugins/queryjs/QueryjsSection.svelte:6 in (script) import
sym src/lib/core/settings/settings.types.ts:307 interface QueryjsSettings L4 | Configuration for the QueryJS scripting plugin
by src/lib/core/settings/settings.types.ts:QueryjsSettings <- src/lib/core/settings/settings.store.svelte.ts:1 in (module) import
sym src/lib/core/settings/settings.types.ts:325 type ReleaseChannel L1 | Release channel the in-app auto-updater follows.
by src/lib/core/settings/settings.types.ts:ReleaseChannel <- src/lib/core/settings/sections/UpdateSection.svelte:13 in (script) import
by src/lib/core/settings/settings.types.ts:ReleaseChannel <- src/lib/utils/app-channel.ts:1 in (module) import
sym src/lib/core/settings/settings.types.ts:328 interface UpdateSettings L29 | Configuration for the in-app auto-updater
by src/lib/core/settings/settings.types.ts:UpdateSettings <- src/lib/core/settings/settings.store.svelte.ts:1 in (module) import
sym src/lib/core/settings/settings.types.ts:359 type SettingsSection L1 | Sidebar navigation sections in the settings dialog
by src/lib/core/settings/settings.types.ts:SettingsSection <- src/lib/app/SettingsPanel.svelte:40 in (module) import
by src/lib/core/settings/settings.types.ts:SettingsSection <- src/lib/core/settings/settings-panel.store.svelte.ts:1 in (module) import
by src/lib/core/settings/settings.types.ts:SettingsSection <- src/lib/core/settings/settings.logic.ts:2 in (module) import
sym src/lib/core/settings/settings.types.ts:362 type EventCalendarColor L1 | One of the event colors in `EVENT_CALENDAR_COLORS`
by src/lib/core/settings/settings.types.ts:EventCalendarColor <- src/lib/features/event-calendar/event-calendar.types.ts:11 in (module) import
sym src/lib/core/settings/settings.types.ts:365 type EventCalendarViewMode L1 | One of the calendar view modes in `EVENT_CALENDAR_VIEW_MODES`
by src/lib/core/settings/settings.types.ts:EventCalendarViewMode <- src/lib/features/event-calendar/EventCalendarSection.svelte:10 in (script) import
by src/lib/core/settings/settings.types.ts:EventCalendarViewMode <- src/lib/features/event-calendar/event-calendar.types.ts:11 in (module) import
sym src/lib/core/settings/settings.types.ts:368 interface EventCalendarSettings L20 | Configuration for the event calendar
by src/lib/core/settings/settings.types.ts:EventCalendarSettings <- src/lib/core/settings/settings.logic.ts:2 in (module) import
by src/lib/core/settings/settings.types.ts:EventCalendarSettings <- src/lib/core/settings/settings.store.svelte.ts:1 in (module) import
by src/lib/core/settings/settings.types.ts:EventCalendarSettings <- src/lib/features/event-calendar/event-calendar-event.logic.ts:12 in (module) import
by src/lib/core/settings/settings.types.ts:EventCalendarSettings <- src/lib/features/event-calendar/event-calendar-form.logic.ts:10 in (module) import
sym src/lib/core/settings/settings.types.ts:390 interface AppSettings L63 | Top-level settings object persisted as `.kokobrain/settings.json` inside the vault
by src/lib/core/settings/settings.types.ts:AppSettings <- src/lib/core/settings/settings.logic.ts:2 in (module) import
by src/lib/core/settings/settings.types.ts:AppSettings <- src/lib/core/settings/settings.service.ts:3 in (module) import
by src/lib/core/settings/settings.types.ts:AppSettings <- src/lib/core/settings/settings.store.svelte.ts:1 in (module) import
sym src/lib/core/settings/settings.types.ts:461 type SettingsLoadOutcome L1 | How `loadSettings` ended for a vault, which decides whether the session may write settings.json. - `loaded`: the file was read and parsed; its settings are in …
by src/lib/core/settings/settings.types.ts:SettingsLoadOutcome <- src/lib/core/settings/settings-persistence.svelte.ts:5 in (module) import
by src/lib/core/settings/settings.types.ts:SettingsLoadOutcome <- src/lib/core/settings/settings.service.ts:3 in (module) import
