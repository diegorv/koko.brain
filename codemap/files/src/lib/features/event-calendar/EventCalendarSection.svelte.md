# file card src/lib/features/event-calendar/EventCalendarSection.svelte
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/features/event-calendar/EventCalendarSection.svelte ' codemap/files
file src/lib/features/event-calendar/EventCalendarSection.svelte component L273 module src/lib/features/event-calendar in1 t1
## imports
imp src/lib/features/event-calendar/EventCalendarSection.svelte:3 -> src/lib/components/ui/input/index.ts Input
imp src/lib/features/event-calendar/EventCalendarSection.svelte:4 -> src/lib/components/ui/switch/index.ts Switch
imp src/lib/features/event-calendar/EventCalendarSection.svelte:5 -> src/lib/components/ui/button/index.ts Button
imp src/lib/features/event-calendar/EventCalendarSection.svelte:6 -> src/lib/components/ui/select/index.ts *
imp src/lib/features/event-calendar/EventCalendarSection.svelte:7 -> src/lib/core/settings/settings.store.svelte.ts settingsStore
imp src/lib/features/event-calendar/EventCalendarSection.svelte:8 -> src/lib/core/settings/settings-panel.store.svelte.ts settingsPanelStore
imp src/lib/features/event-calendar/EventCalendarSection.svelte:9 -> src/lib/core/settings/settings.logic.ts clampDayStartHour,clampEventDuration,normalizeEventTypeName,EVENT_CALENDAR_VIEW_MODES
imp src/lib/features/event-calendar/EventCalendarSection.svelte:10 -> src/lib/core/settings/settings.types.ts type:EventCalendarViewMode
imp src/lib/features/event-calendar/EventCalendarSection.svelte:11 -> src/lib/core/settings/sections/SettingItem.svelte default
imp src/lib/features/event-calendar/EventCalendarSection.svelte:12 -> src/lib/core/vault/vault.store.svelte.ts vaultStore
imp src/lib/features/event-calendar/EventCalendarSection.svelte:13 -> src/lib/core/filesystem/fs.store.svelte.ts fsStore
imp src/lib/features/event-calendar/EventCalendarSection.svelte:14 -> src/lib/core/frontmatter/properties.logic.ts normalizeTypeCasing
imp src/lib/features/event-calendar/EventCalendarSection.svelte:15 -> src/lib/core/editor/editor.service.ts openFileInEditor
imp src/lib/features/event-calendar/EventCalendarSection.svelte:16 -> src/lib/features/type-definitions/type-definitions.store.svelte.ts typeDefinitionsStore
imp src/lib/features/event-calendar/EventCalendarSection.svelte:17 -> src/lib/features/type-definitions/type-definitions.logic.ts buildTypeNoteDir,typeNameTakenMessage,validateTypeName
imp src/lib/features/event-calendar/EventCalendarSection.svelte:18 -> src/lib/features/type-definitions/type-definitions.service.ts createTypeDefinition,refreshTypeDefinitions
imp src/lib/features/event-calendar/EventCalendarSection.svelte:19 -> src/lib/utils/debug.ts error
imp src/lib/features/event-calendar/EventCalendarSection.svelte:20 -> src/lib/features/event-calendar/EventColorSwatches.svelte default
imp src/lib/features/event-calendar/EventCalendarSection.svelte:21 -> src/lib/features/event-calendar/event-calendar-event.logic.ts resolveEventTypeName
## imported-by
imp src/lib/app/SettingsPanel.svelte:12 -> src/lib/features/event-calendar/EventCalendarSection.svelte default
## reach
in2 src/lib/features/event-calendar/EventCalendarSection.svelte 1 files in 1 modules: src/lib/app(1)
out2 src/lib/features/event-calendar/EventCalendarSection.svelte 45 files in 14 modules: src/lib/components(14) src/lib/core/editor(4) src/lib/core/filesystem(4) src/lib/core/settings(4) src/lib/utils(4) +9 modules
## tests
test src/tests/lib/features/event-calendar/EventCalendarSection.test.ts imports src/lib/features/event-calendar/EventCalendarSection.svelte mirror
## symbols
sym src/lib/features/event-calendar/EventCalendarSection.svelte:1 component EventCalendarSection L273
by src/lib/features/event-calendar/EventCalendarSection.svelte:default <- src/lib/app/SettingsPanel.svelte:89 in sectionComponents ref
## locals
local src/lib/features/event-calendar/EventCalendarSection.svelte:36 fn viewLabel(mode: string): string L3
local src/lib/features/event-calendar/EventCalendarSection.svelte:41 fn inputValue(e: Event): string L3
local src/lib/features/event-calendar/EventCalendarSection.svelte:74 fn openEventType() L38
## mounts
mount src/lib/features/event-calendar/EventCalendarSection.svelte:120 SettingItem -> src/lib/core/settings/sections/SettingItem.svelte
mount src/lib/features/event-calendar/EventCalendarSection.svelte:139 SettingItem -> src/lib/core/settings/sections/SettingItem.svelte
mount src/lib/features/event-calendar/EventCalendarSection.svelte:158 SettingItem -> src/lib/core/settings/sections/SettingItem.svelte
mount src/lib/features/event-calendar/EventCalendarSection.svelte:159 Input -> src/lib/components/ui/input/input.svelte
mount src/lib/features/event-calendar/EventCalendarSection.svelte:175 SettingItem -> src/lib/core/settings/sections/SettingItem.svelte
mount src/lib/features/event-calendar/EventCalendarSection.svelte:176 Switch -> src/lib/components/ui/switch/switch.svelte
mount src/lib/features/event-calendar/EventCalendarSection.svelte:184 SettingItem -> src/lib/core/settings/sections/SettingItem.svelte
mount src/lib/features/event-calendar/EventCalendarSection.svelte:185 Switch -> src/lib/components/ui/switch/switch.svelte
mount src/lib/features/event-calendar/EventCalendarSection.svelte:193 SettingItem -> src/lib/core/settings/sections/SettingItem.svelte
mount src/lib/features/event-calendar/EventCalendarSection.svelte:218 SettingItem -> src/lib/core/settings/sections/SettingItem.svelte
mount src/lib/features/event-calendar/EventCalendarSection.svelte:219 Input -> src/lib/components/ui/input/input.svelte
mount src/lib/features/event-calendar/EventCalendarSection.svelte:236 SettingItem -> src/lib/core/settings/sections/SettingItem.svelte
mount src/lib/features/event-calendar/EventCalendarSection.svelte:237 EventColorSwatches -> src/lib/features/event-calendar/EventColorSwatches.svelte
mount src/lib/features/event-calendar/EventCalendarSection.svelte:246 SettingItem -> src/lib/core/settings/sections/SettingItem.svelte
mount src/lib/features/event-calendar/EventCalendarSection.svelte:251 SettingItem -> src/lib/core/settings/sections/SettingItem.svelte
mount src/lib/features/event-calendar/EventCalendarSection.svelte:252 Button -> src/lib/components/ui/button/button.svelte
mount src/lib/features/event-calendar/EventCalendarSection.svelte:258 SettingItem -> src/lib/core/settings/sections/SettingItem.svelte
mount src/lib/features/event-calendar/EventCalendarSection.svelte:262 Input -> src/lib/components/ui/input/input.svelte
## calls
call src/lib/features/event-calendar/EventCalendarSection.svelte:50 in eventType=$derived -> src/lib/features/event-calendar/event-calendar-event.logic.ts:resolveEventTypeName call
call src/lib/features/event-calendar/EventCalendarSection.svelte:55 in eventFolder=$derived -> src/lib/features/type-definitions/type-definitions.logic.ts:buildTypeNoteDir call
call src/lib/features/event-calendar/EventCalendarSection.svelte:76 in openEventType -> src/lib/core/editor/editor.service.ts:openFileInEditor call
call src/lib/features/event-calendar/EventCalendarSection.svelte:77 in openEventType -> src/lib/core/settings/settings-panel.store.svelte.ts:settingsPanelStore.close mcall +1
call src/lib/features/event-calendar/EventCalendarSection.svelte:82 in openEventType -> src/lib/core/frontmatter/properties.logic.ts:normalizeTypeCasing call
call src/lib/features/event-calendar/EventCalendarSection.svelte:83 in openEventType -> src/lib/features/type-definitions/type-definitions.logic.ts:validateTypeName call
call src/lib/features/event-calendar/EventCalendarSection.svelte:91 in openEventType -> src/lib/features/type-definitions/type-definitions.logic.ts:typeNameTakenMessage call +1
call src/lib/features/event-calendar/EventCalendarSection.svelte:96 in openEventType -> src/lib/features/type-definitions/type-definitions.service.ts:createTypeDefinition call
call src/lib/features/event-calendar/EventCalendarSection.svelte:104 in openEventType -> src/lib/features/type-definitions/type-definitions.service.ts:refreshTypeDefinitions call
call src/lib/features/event-calendar/EventCalendarSection.svelte:104 in openEventType -> src/lib/utils/debug.ts:error call +1
call src/lib/features/event-calendar/EventCalendarSection.svelte:124 in (markup) -> src/lib/core/settings/settings.store.svelte.ts:settingsStore.updateEventCalendar markup +8
call src/lib/features/event-calendar/EventCalendarSection.svelte:166 in (markup) -> src/lib/core/settings/settings.logic.ts:clampDayStartHour markup
call src/lib/features/event-calendar/EventCalendarSection.svelte:166 in (markup) -> src/lib/features/event-calendar/EventCalendarSection.svelte:inputValue markup +2
call src/lib/features/event-calendar/EventCalendarSection.svelte:204 in (markup) -> src/lib/features/event-calendar/EventCalendarSection.svelte:viewLabel markup +1
call src/lib/features/event-calendar/EventCalendarSection.svelte:227 in (markup) -> src/lib/core/settings/settings.logic.ts:clampEventDuration markup
call src/lib/features/event-calendar/EventCalendarSection.svelte:252 in (markup) -> src/lib/features/event-calendar/EventCalendarSection.svelte:openEventType markup
call src/lib/features/event-calendar/EventCalendarSection.svelte:266 in (markup) -> src/lib/core/settings/settings.logic.ts:normalizeEventTypeName markup
