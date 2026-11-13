# module card src/lib/core/settings
cols: module <path> <layer> files <n> in-modules <n> out-modules <n> pub <public>/<exports> ipc <called>/<served> card ~<k>k · dep <from> -> <to> <file pairs> · in2/out2 <module> <n> modules: <module>(<via>) · entry <file> ext-in<n> <importers> · file … · sym … · grep: grep -rF -- '-> src/lib/core/settings ' codemap/modules
sections: neighbors, entry files, files, public, stores, effects, debt
module src/lib/core/settings core files 38 in-modules 29 out-modules 6 pub 53/175 ipc 3/0 card ~6.7k
## neighbors
dep src/lib/app -> src/lib/core/settings 32
dep src/lib/core/layout -> src/lib/core/settings 1
dep src/lib/core/markdown-editor -> src/lib/core/settings 4
dep src/lib/core/vault -> src/lib/core/settings 1
dep src/lib/features/auto-organize -> src/lib/core/settings 4
dep src/lib/features/deep-link -> src/lib/core/settings 1
dep src/lib/features/event-calendar -> src/lib/core/settings 19
dep src/lib/features/file-history -> src/lib/core/settings 1
dep src/lib/features/file-icons -> src/lib/core/settings 1
dep src/lib/features/note-action-bar -> src/lib/core/settings 2
dep src/lib/features/properties -> src/lib/core/settings 1
dep src/lib/features/quick-switcher -> src/lib/core/settings 1
dep src/lib/features/rail-shell -> src/lib/core/settings 13
dep src/lib/features/search -> src/lib/core/settings 5
dep src/lib/features/tags -> src/lib/core/settings 3
dep src/lib/features/tasks -> src/lib/core/settings 4
dep src/lib/features/todoist-sync -> src/lib/core/settings 8
dep src/lib/features/type-definitions -> src/lib/core/settings 2
dep src/lib/plugins/calendar -> src/lib/core/settings 4
dep src/lib/plugins/graph-view -> src/lib/core/settings 1
dep src/lib/plugins/mods -> src/lib/core/settings 3
dep src/lib/plugins/one-on-one -> src/lib/core/settings 3
dep src/lib/plugins/periodic-notes -> src/lib/core/settings 3
dep src/lib/plugins/queryjs -> src/lib/core/settings 4
dep src/lib/plugins/quick-capture -> src/lib/core/settings 2
dep src/lib/plugins/table-of-contents -> src/lib/core/settings 1
dep src/lib/plugins/templates -> src/lib/core/settings 1
dep src/lib/utils -> src/lib/core/settings 3
dep src/routes -> src/lib/core/settings 3
dep src/lib/core/settings -> src/lib/components 30
dep src/lib/core/settings -> src/lib/contracts 5
dep src/lib/core/settings -> src/lib/core/markdown-editor 1
dep src/lib/core/settings -> src/lib/core/trash 4
dep src/lib/core/settings -> src/lib/core/vault 2
dep src/lib/core/settings -> src/lib/utils 16
in2 src/lib/core/settings 11 modules: src/lib/core/filesystem(5) src/lib/core/editor(2) src/lib/features/backlinks(2) src/lib/features/collection(2) src/lib/features/note-list(2) +6 modules
out2 src/lib/core/settings 2 modules: src/lib/core/filesystem(4) src/lib/core/editor(2)
## entry files
entry src/lib/core/settings/settings.store.svelte.ts ext-in67 src/lib/app/AppShell.svelte src/lib/app/EditorView.svelte src/lib/app/boot.ts src/lib/app/commands.ts src/lib/app/deep-link-actions.ts more importers 62 not shown: src/lib/features/event-calendar(10) src/lib/features/rail-shell(9) src/lib/features/todoist-sync(5) +22 modules: q importers src/lib/core/settings/settings.store.svelte.ts
entry src/lib/core/settings/settings.types.ts ext-in15 src/lib/app/SettingsPanel.svelte src/lib/features/event-calendar/EventCalendarSection.svelte src/lib/features/event-calendar/event-calendar-event.logic.ts src/lib/features/event-calendar/event-calendar-form.logic.ts src/lib/features/event-calendar/event-calendar.types.ts more importers 10 not shown: src/lib/plugins/calendar(2) src/lib/plugins/periodic-notes(2) src/lib/features/rail-shell(1) +5 modules: q importers src/lib/core/settings/settings.types.ts
entry src/lib/core/settings/sections/SettingItem.svelte ext-in7 src/lib/app/LabsSection.svelte src/lib/features/auto-organize/AutoOrganizeSection.svelte src/lib/features/event-calendar/EventCalendarSection.svelte src/lib/features/rail-shell/LayoutSection.svelte src/lib/features/search/SearchSection.svelte more importers 2 not shown: src/lib/features/todoist-sync(1) src/lib/plugins/queryjs(1): q importers src/lib/core/settings/sections/SettingItem.svelte
entry src/lib/core/settings/settings.logic.ts ext-in6 src/lib/app/SettingsPanel.svelte src/lib/core/markdown-editor/MarkdownEditor.svelte src/lib/features/event-calendar/EventCalendarSection.svelte src/lib/features/event-calendar/EventColorSwatches.svelte src/lib/features/event-calendar/event-calendar-event.logic.ts more importers 1 not shown: src/lib/features/todoist-sync(1): q importers src/lib/core/settings/settings.logic.ts
entry src/lib/core/settings/applied-theme.store.svelte.ts ext-in5 src/lib/app/AppOverlays.svelte src/lib/core/markdown-editor/MarkdownEditor.svelte src/lib/features/rail-shell/Rail.svelte src/lib/plugins/graph-view/GraphView.svelte src/lib/plugins/mods/mod-theme.svelte.ts
entry src/lib/core/settings/settings-panel.store.svelte.ts ext-in5 src/lib/app/SettingsPanel.svelte src/lib/app/commands.ts src/lib/app/global-keybindings.ts src/lib/app/tauri-listeners.service.ts src/lib/features/event-calendar/EventCalendarSection.svelte
entry src/lib/core/settings/rail-pin.logic.ts ext-in2 src/lib/features/rail-shell/lens.logic.ts src/lib/features/type-definitions/type-definitions.service.ts
entry src/lib/core/settings/sentry.service.ts ext-in2 src/lib/app/lifecycle/app-lifecycle.service.ts src/lib/utils/debug.ts
entry src/lib/core/settings/settings-persistence.svelte.ts ext-in2 src/lib/app/lifecycle/app-lifecycle.service.ts src/lib/core/vault/exit.service.ts
entry src/lib/core/settings/settings.service.ts ext-in2 src/lib/app/lifecycle/app-lifecycle.service.ts src/lib/core/markdown-editor/MarkdownEditor.svelte
entry src/lib/core/settings/theme.service.ts ext-in2 src/routes/(app)/+layout.svelte src/routes/composer/+page.svelte
entry src/lib/core/settings/BuildInfo.svelte ext-in1 src/routes/(app)/+page.svelte
entry src/lib/core/settings/sections/AppearanceSection.svelte ext-in1 src/lib/app/SettingsPanel.svelte
entry src/lib/core/settings/sections/EditorSection.svelte ext-in1 src/lib/app/SettingsPanel.svelte
entry src/lib/core/settings/sections/FileHistorySection.svelte ext-in1 src/lib/app/SettingsPanel.svelte
entry src/lib/core/settings/sections/FilesSection.svelte ext-in1 src/lib/app/SettingsPanel.svelte
entry src/lib/core/settings/sections/OneOnOneSection.svelte ext-in1 src/lib/app/SettingsPanel.svelte
entry src/lib/core/settings/sections/PeriodicNotesSection.svelte ext-in1 src/lib/app/SettingsPanel.svelte
entry src/lib/core/settings/sections/QuickCaptureSection.svelte ext-in1 src/lib/app/SettingsPanel.svelte
entry src/lib/core/settings/sections/SentrySection.svelte ext-in1 src/lib/app/SettingsPanel.svelte
entry src/lib/core/settings/sections/TrashSection.svelte ext-in1 src/lib/app/SettingsPanel.svelte
entry src/lib/core/settings/sections/TroubleshootingSection.svelte ext-in1 src/lib/app/SettingsPanel.svelte
entry src/lib/core/settings/sections/TypesSection.svelte ext-in1 src/lib/app/SettingsPanel.svelte
entry src/lib/core/settings/sections/UpdateSection.svelte ext-in1 src/lib/app/SettingsPanel.svelte
entry src/lib/core/settings/theme-builder.logic.ts ext-in1 src/lib/features/file-icons/file-icons.logic.ts
entry src/lib/core/settings/theme-editor.logic.ts ext-in1 src/lib/features/tags/TagColorPicker.svelte
entry src/lib/core/settings/update-check.service.ts ext-in1 src/lib/app/lifecycle/app-lifecycle.service.ts
## files
file src/lib/core/settings/BuildInfo.svelte component L51 module src/lib/core/settings in2 t1
file src/lib/core/settings/applied-theme.store.svelte.ts store L35 module src/lib/core/settings in6 t7
file src/lib/core/settings/heading-typography.logic.ts logic L35 module src/lib/core/settings in1 t4
file src/lib/core/settings/rail-pin.logic.ts logic L22 module src/lib/core/settings in2 t1 | Keys of the rail items pinned with `_rail: true`, saved in `layout.railItem`.
file src/lib/core/settings/sections/AppearanceSection.svelte component L306 module src/lib/core/settings in1 t1
file src/lib/core/settings/sections/EditorSection.svelte component L174 module src/lib/core/settings in1 t2
file src/lib/core/settings/sections/FileHistorySection.svelte component L56 module src/lib/core/settings in1 t1
file src/lib/core/settings/sections/FilesSection.svelte component L46 module src/lib/core/settings in1 t2
file src/lib/core/settings/sections/HeadingTypographyEditor.svelte component L118 module src/lib/core/settings in1 t1
file src/lib/core/settings/sections/OneOnOneSection.svelte component L101 module src/lib/core/settings in1 t1
file src/lib/core/settings/sections/PeriodicNotesSection.svelte component L132 module src/lib/core/settings in1 t1
file src/lib/core/settings/sections/QuickCaptureSection.svelte component L79 module src/lib/core/settings in1 t2
file src/lib/core/settings/sections/SentrySection.svelte component L95 module src/lib/core/settings in1 t0
file src/lib/core/settings/sections/SettingItem.svelte component L41 module src/lib/core/settings in18 t1
file src/lib/core/settings/sections/ThemeColorRow.svelte component L73 module src/lib/core/settings in1 t0
file src/lib/core/settings/sections/ThemeEditor.svelte component L202 module src/lib/core/settings in1 t1
file src/lib/core/settings/sections/ThemePreview.svelte component L53 module src/lib/core/settings in1 t1
file src/lib/core/settings/sections/TrashSection.svelte component L138 module src/lib/core/settings in1 t1
file src/lib/core/settings/sections/TroubleshootingSection.svelte component L158 module src/lib/core/settings in1 t1
file src/lib/core/settings/sections/TypesSection.svelte component L58 module src/lib/core/settings in1 t1
file src/lib/core/settings/sections/UpdateSection.svelte component L338 module src/lib/core/settings in1 t3
file src/lib/core/settings/sentry.logic.ts logic L28 module src/lib/core/settings in1 t1
file src/lib/core/settings/sentry.service.ts service L134 module src/lib/core/settings in3 t6
file src/lib/core/settings/settings-panel.store.svelte.ts store L24 module src/lib/core/settings in5 t6
file src/lib/core/settings/settings-persistence.svelte.ts other L122 module src/lib/core/settings in2 t9
file src/lib/core/settings/settings.logic.ts logic L303 module src/lib/core/settings in11 t2
file src/lib/core/settings/settings.service.ts service L297 module src/lib/core/settings in3 t6
file src/lib/core/settings/settings.store.svelte.ts store L415 module src/lib/core/settings in83 t124
file src/lib/core/settings/settings.types.ts types L461 module src/lib/core/settings in24 t0
file src/lib/core/settings/theme-builder.logic.ts logic L318 module src/lib/core/settings in3 t10
file src/lib/core/settings/theme-catalog.service.ts service L45 module src/lib/core/settings in1 t1
file src/lib/core/settings/theme-editor.logic.ts logic L303 module src/lib/core/settings in3 t1
file src/lib/core/settings/theme-package.logic.ts logic L404 module src/lib/core/settings in4 t3
file src/lib/core/settings/theme-validation.logic.ts logic L76 module src/lib/core/settings in2 t1
file src/lib/core/settings/theme.logic.ts logic L409 module src/lib/core/settings in7 t16
file src/lib/core/settings/theme.service.ts service L87 module src/lib/core/settings in5 t7
file src/lib/core/settings/theme.types.ts types L251 module src/lib/core/settings in10 t0
file src/lib/core/settings/update-check.service.ts service L37 module src/lib/core/settings in1 t2
## public
sym src/lib/core/settings/BuildInfo.svelte:1 component BuildInfo props:variant= L51
sym src/lib/core/settings/applied-theme.store.svelte.ts:14 store appliedThemeStore L22 | Reactive mode of the applied theme.
sym src/lib/core/settings/rail-pin.logic.ts:9 const VIEW_PIN_PREFIX L1 | The rail item key prefix of a pinned `.view`; the rest is its absolute path.
sym src/lib/core/settings/rail-pin.logic.ts:12 const TYPE_PIN_PREFIX L1 | The rail item key prefix of a pinned type; the rest is its `TypeMetadata.name`.
sym src/lib/core/settings/rail-pin.logic.ts:15 fn viewPinKey(path: string): string L3 | The rail item key of the `.view` at `path` pinned to the rail.
sym src/lib/core/settings/rail-pin.logic.ts:20 fn typePinKey(name: string): string L3 | The rail item key of the type `name` pinned to the rail.
sym src/lib/core/settings/sections/AppearanceSection.svelte:1 component AppearanceSection L306
sym src/lib/core/settings/sections/EditorSection.svelte:1 component EditorSection L174
sym src/lib/core/settings/sections/FileHistorySection.svelte:1 component FileHistorySection L56
sym src/lib/core/settings/sections/FilesSection.svelte:1 component FilesSection L46
sym src/lib/core/settings/sections/OneOnOneSection.svelte:1 component OneOnOneSection L101
sym src/lib/core/settings/sections/PeriodicNotesSection.svelte:1 component PeriodicNotesSection L132
sym src/lib/core/settings/sections/QuickCaptureSection.svelte:1 component QuickCaptureSection L79
sym src/lib/core/settings/sections/SentrySection.svelte:1 component SentrySection L95
sym src/lib/core/settings/sections/SettingItem.svelte:1 component SettingItem props:label,description,layout=,children L41
sym src/lib/core/settings/sections/TrashSection.svelte:1 component TrashSection L138
sym src/lib/core/settings/sections/TroubleshootingSection.svelte:1 component TroubleshootingSection L158
sym src/lib/core/settings/sections/TypesSection.svelte:1 component TypesSection L58
sym src/lib/core/settings/sections/UpdateSection.svelte:1 component UpdateSection L338
sym src/lib/core/settings/sentry.service.ts:94 fn configureSentry(settings: SentrySettings): Promise<SentryConfigurationResult> L6 | Enables or disables error monitoring for one vault.
sym src/lib/core/settings/sentry.service.ts:102 fn disableSentry(): Promise<SentryConfigurationResult> L3 | Disables the active Sentry client without changing persisted settings.
sym src/lib/core/settings/sentry.service.ts:112 fn captureSentryException(tag: string, exception: unknown): void L7 | Captures a handled application error only when the current vault opted in to Sentry.
sym src/lib/core/settings/settings-panel.store.svelte.ts:7 store settingsPanelStore L18 | Reactive store for the in-app settings panel (open/close + active section).
sym src/lib/core/settings/settings-persistence.svelte.ts:55 fn startSettingsPersistence(vaultPath: string, outcome: SettingsLoadOutcome = 'loaded'): void L25 | Starts persisting every settings mutation to `vaultPath`.
sym src/lib/core/settings/settings-persistence.svelte.ts:86 fn flushSettingsPersistence(): Promise<void> L19 | Writes the pending settings change immediately instead of waiting out the debounce.
sym src/lib/core/settings/settings-persistence.svelte.ts:113 fn stopSettingsPersistence(): Promise<void> L10 | Flushes the pending write, then stops persisting.
sym src/lib/core/settings/settings.logic.ts:83 fn effectiveContentWidth(editor: Pick<EditorSettings, 'contentWidth' | 'wideNotes'>): number L3 | The max width notes are laid out at: 0 (full width) for wide notes, else the configured `contentWidth`
sym src/lib/core/settings/settings.logic.ts:108 const EVENT_CALENDAR_COLORS L1 | Event colors the calendar offers; the only runtime copy of this list
sym src/lib/core/settings/settings.logic.ts:111 const EVENT_CALENDAR_VIEW_MODES L1 | Calendar view modes; the only runtime copy of this list
sym src/lib/core/settings/settings.logic.ts:114 fn clampDayStartHour(hour: number): number L5 | Clamps the calendar's first visible hour to an integer within 0–12 (a non-finite value becomes 0)
sym src/lib/core/settings/settings.logic.ts:121 fn clampEventDuration(minutes: number): number L5 | Rounds a default event duration to a multiple of 15 within 15–480 minutes (a non-finite value becomes 15)
sym src/lib/core/settings/settings.logic.ts:131 fn normalizeEventTypeName(name: unknown): string L6 | Trims the type name event notes carry.
sym src/lib/core/settings/settings.logic.ts:168 fn clampSyncIntervalMinutes(minutes: number): number L6 | Rounds the Todoist sync interval to whole minutes, at least 1.
sym src/lib/core/settings/settings.logic.ts:255 const SETTINGS_SECTION_GROUPS: readonly SettingsSectionGroup[] L49 | Navigation items for the settings sidebar, organized by group
sym src/lib/core/settings/settings.service.ts:39 fn loadSettings(vaultPath: string): Promise<SettingsLoadOutcome> L42 | Reads settings from disk and merges them with defaults, then persists the result so new default keys are written to disk.
sym src/lib/core/settings/settings.service.ts:285 fn applyHeadingTypography(): void L8 | Applies heading typography CSS variables to the document root
sym src/lib/core/settings/settings.service.ts:295 fn resetSettings() L3 | Restores settings to their defaults (does not write to disk)
sym src/lib/core/settings/settings.store.svelte.ts:167 store settingsStore L249 | Reactive store for the app's persisted settings
sym src/lib/core/settings/settings.types.ts:4 type PeriodType L1 | Supported periodic note types
sym src/lib/core/settings/settings.types.ts:15 interface PeriodicNotesSettings L21 | Configuration for the periodic notes plugin
sym src/lib/core/settings/settings.types.ts:48 interface LayoutSettings L70 | Configuration for layout visibility preferences
sym src/lib/core/settings/settings.types.ts:276 type TodoistSyncContext L1 | One of the vault contexts in `TODOIST_SYNC_CONTEXTS`
sym src/lib/core/settings/settings.types.ts:301 type AutoRunQueriesPolicy L4 | Policy for QueryJS block execution — controls when `kb.pages()`/`dv.view()` blocks run
sym src/lib/core/settings/settings.types.ts:325 type ReleaseChannel L1 | Release channel the in-app auto-updater follows.
sym src/lib/core/settings/settings.types.ts:359 type SettingsSection L1 | Sidebar navigation sections in the settings dialog
sym src/lib/core/settings/settings.types.ts:362 type EventCalendarColor L1 | One of the event colors in `EVENT_CALENDAR_COLORS`
sym src/lib/core/settings/settings.types.ts:365 type EventCalendarViewMode L1 | One of the calendar view modes in `EVENT_CALENDAR_VIEW_MODES`
sym src/lib/core/settings/settings.types.ts:368 interface EventCalendarSettings L20 | Configuration for the event calendar
sym src/lib/core/settings/theme-builder.logic.ts:8 const TYPE_PALETTE_NAMES L1 | Names of the categorical type palette.
sym src/lib/core/settings/theme-editor.logic.ts:231 fn hexToColorInputValue(value: string): string L6 | Converts a color value to a format accepted by `<input type="color">` (`#rrggbb`).
sym src/lib/core/settings/theme.service.ts:13 const THEME_VARS_STORAGE_KEY L1 | localStorage key holding the CSS variables of the theme last applied in the main window.
sym src/lib/core/settings/theme.service.ts:54 fn applyStoredTheme(): void L15 | Applies the theme the main window last mirrored to localStorage.
sym src/lib/core/settings/update-check.service.ts:19 fn maybeAutoCheckForUpdates(): Promise<void> L19 | Trigger a non-interactive update check on app launch if the user has `updates.autoCheck` enabled.
## stores
store src/lib/core/settings/applied-theme.store.svelte.ts:14 appliedThemeStore esc:0
store src/lib/core/settings/settings-panel.store.svelte.ts:7 settingsPanelStore esc:0
store src/lib/core/settings/settings.store.svelte.ts:167 settingsStore esc:1
## effects
fx-count storage.getItem 1
fx-count storage.setItem 1
fx-count svelte.$effect 4
fx-count tauri-api-core.invoke 1
fx-count tauri-dialog.ask 3
fx-count tauri-fs.copyFile 1
fx-count tauri-fs.exists 2
fx-count tauri-fs.mkdir 1
fx-count tauri-fs.readTextFile 1
fx-count tauri-fs.writeTextFile 1
fx-count tauri-http.fetch 1
fx-count tauri-opener.openUrl 2
fx-count tauri-process.relaunch 1
fx-count timer.setTimeout 2
ipc-count ipc:check_for_update_on_channel 2
ipc-count ipc:configure_sentry 1
ipc-count ipc:list_system_fonts 1
## debt
debt src/lib/utils/app-channel.ts -> src/lib/core/settings/settings.types.ts
debt src/lib/utils/debug.ts -> src/lib/core/settings/sentry.service.ts
debt src/lib/utils/debug.ts -> src/lib/core/settings/settings.store.svelte.ts
