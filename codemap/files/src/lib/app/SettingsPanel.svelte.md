# file card src/lib/app/SettingsPanel.svelte
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/app/SettingsPanel.svelte ' codemap/files
file src/lib/app/SettingsPanel.svelte component L162 module src/lib/app in1 t1
## imports
imp src/lib/app/SettingsPanel.svelte:2 -> src/lib/core/settings/sections/AppearanceSection.svelte default
imp src/lib/app/SettingsPanel.svelte:3 -> src/lib/core/settings/sections/EditorSection.svelte default
imp src/lib/app/SettingsPanel.svelte:4 -> src/lib/core/settings/sections/PeriodicNotesSection.svelte default
imp src/lib/app/SettingsPanel.svelte:5 -> src/lib/core/settings/sections/QuickCaptureSection.svelte default
imp src/lib/app/SettingsPanel.svelte:6 -> src/lib/core/settings/sections/OneOnOneSection.svelte default
imp src/lib/app/SettingsPanel.svelte:7 -> src/lib/core/settings/sections/FilesSection.svelte default
imp src/lib/app/SettingsPanel.svelte:8 -> src/lib/features/search/SearchSection.svelte default
imp src/lib/app/SettingsPanel.svelte:9 -> src/lib/features/rail-shell/LayoutSection.svelte default
imp src/lib/app/SettingsPanel.svelte:10 -> src/lib/core/settings/sections/FileHistorySection.svelte default
imp src/lib/app/SettingsPanel.svelte:11 -> src/lib/features/auto-organize/AutoOrganizeSection.svelte default
imp src/lib/app/SettingsPanel.svelte:12 -> src/lib/features/event-calendar/EventCalendarSection.svelte default
imp src/lib/app/SettingsPanel.svelte:13 -> src/lib/core/settings/sections/TrashSection.svelte default
imp src/lib/app/SettingsPanel.svelte:14 -> src/lib/features/todoist-sync/TodoistSection.svelte default
imp src/lib/app/SettingsPanel.svelte:15 -> src/lib/core/settings/sections/SentrySection.svelte default
imp src/lib/app/SettingsPanel.svelte:16 -> src/lib/core/settings/sections/TroubleshootingSection.svelte default
imp src/lib/app/SettingsPanel.svelte:17 -> src/lib/core/settings/sections/UpdateSection.svelte default
imp src/lib/app/SettingsPanel.svelte:18 -> src/lib/plugins/queryjs/QueryjsSection.svelte default
imp src/lib/app/SettingsPanel.svelte:19 -> src/lib/core/settings/sections/TypesSection.svelte default
imp src/lib/app/SettingsPanel.svelte:20 -> src/lib/app/LabsSection.svelte default
imp src/lib/app/SettingsPanel.svelte:40 -> src/lib/core/settings/settings.types.ts type:SettingsSection
imp src/lib/app/SettingsPanel.svelte:96 -> src/lib/components/ui/button/index.ts Button
imp src/lib/app/SettingsPanel.svelte:97 -> src/lib/components/ui/scroll-area/index.ts ScrollArea
imp src/lib/app/SettingsPanel.svelte:98 -> src/lib/core/settings/settings-panel.store.svelte.ts settingsPanelStore
imp src/lib/app/SettingsPanel.svelte:99 -> src/lib/core/settings/settings.logic.ts SETTINGS_SECTION_GROUPS
## imported-by
imp src/lib/app/AppOverlays.svelte:3 -> src/lib/app/SettingsPanel.svelte default
## reach
in2 src/lib/app/SettingsPanel.svelte 1 files in 1 modules: src/routes(1)
out2 src/lib/app/SettingsPanel.svelte 57 files in 18 modules: src/lib/core/settings(12) src/lib/components(8) src/lib/features/auto-organize(5) src/lib/core/trash(4) src/lib/utils(4) +13 modules
## tests
test src/tests/lib/app/SettingsPanel.test.ts imports src/lib/app/SettingsPanel.svelte mirror
## symbols
sym src/lib/app/SettingsPanel.svelte:1 component SettingsPanel L162
by src/lib/app/SettingsPanel.svelte:default <- src/lib/app/AppOverlays.svelte:17 in (markup) mount
sym src/lib/app/SettingsPanel.svelte:71 const sectionComponents: Record<SettingsSection, Component> L21 | Content component rendered for each settings section.
## locals
local src/lib/app/SettingsPanel.svelte:105 fn handleKeydown(event: KeyboardEvent) L5
## mounts
mount src/lib/app/SettingsPanel.svelte:151 Button -> src/lib/components/ui/button/button.svelte
mount src/lib/app/SettingsPanel.svelte:155 ScrollArea -> src/lib/components/ui/scroll-area/scroll-area.svelte
## mounted-at
mount src/lib/app/AppOverlays.svelte:17 SettingsPanel -> src/lib/app/SettingsPanel.svelte
## calls
call src/lib/app/SettingsPanel.svelte:107 in handleKeydown -> src/lib/core/settings/settings-panel.store.svelte.ts:settingsPanelStore.close mcall
call src/lib/app/SettingsPanel.svelte:112 in (markup) -> src/lib/app/SettingsPanel.svelte:handleKeydown markup
call src/lib/app/SettingsPanel.svelte:139 in (markup) -> src/lib/core/settings/settings-panel.store.svelte.ts:settingsPanelStore.setSection markup
call src/lib/app/SettingsPanel.svelte:151 in (markup) -> src/lib/core/settings/settings-panel.store.svelte.ts:settingsPanelStore.close markup
## effects
fx src/lib/app/SettingsPanel.svelte:112 dom.keydown svelte:window in (markup)
