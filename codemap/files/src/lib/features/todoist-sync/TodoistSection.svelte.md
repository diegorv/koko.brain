# file card src/lib/features/todoist-sync/TodoistSection.svelte
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/features/todoist-sync/TodoistSection.svelte ' codemap/files
file src/lib/features/todoist-sync/TodoistSection.svelte component L208 module src/lib/features/todoist-sync in1 t1
## imports
imp src/lib/features/todoist-sync/TodoistSection.svelte:2 -> pkg:@tauri-apps/plugin-opener openUrl
imp src/lib/features/todoist-sync/TodoistSection.svelte:3 -> src/lib/components/ui/input/index.ts Input
imp src/lib/features/todoist-sync/TodoistSection.svelte:4 -> src/lib/components/ui/button/index.ts Button
imp src/lib/features/todoist-sync/TodoistSection.svelte:5 -> src/lib/components/ui/switch/index.ts Switch
imp src/lib/features/todoist-sync/TodoistSection.svelte:6 -> src/lib/components/ui/select/index.ts *
imp src/lib/features/todoist-sync/TodoistSection.svelte:7 -> src/lib/core/settings/sections/SettingItem.svelte default
imp src/lib/features/todoist-sync/TodoistSection.svelte:8 -> src/lib/core/settings/settings.store.svelte.ts settingsStore
imp src/lib/features/todoist-sync/TodoistSection.svelte:9 -> src/lib/core/settings/settings.logic.ts clampSyncIntervalMinutes
imp src/lib/features/todoist-sync/TodoistSection.svelte:10 -> src/lib/core/settings/settings.types.ts type:TodoistSyncContext
imp src/lib/features/todoist-sync/TodoistSection.svelte:11 -> src/lib/utils/debug.ts error
imp src/lib/features/todoist-sync/TodoistSection.svelte:12 -> src/lib/features/todoist-sync/sync-scope.logic.ts classifyTodoistError,syncErrorMessage,type:RootProjectChoice
imp src/lib/features/todoist-sync/TodoistSection.svelte:13 -> src/lib/features/todoist-sync/todoist-sync.service.ts fetchRootProjectChoices
## imported-by
imp src/lib/app/SettingsPanel.svelte:14 -> src/lib/features/todoist-sync/TodoistSection.svelte default
## reach
in2 src/lib/features/todoist-sync/TodoistSection.svelte 1 files in 1 modules: src/lib/app(1)
out2 src/lib/features/todoist-sync/TodoistSection.svelte 24 files in 6 modules: src/lib/components(14) src/lib/core/settings(3) src/lib/contracts(2) src/lib/features/todoist-sync(2) src/lib/utils(2) +1 modules
## tests
test src/tests/lib/features/todoist-sync/TodoistSection.test.ts imports src/lib/features/todoist-sync/TodoistSection.svelte mirror
## symbols
sym src/lib/features/todoist-sync/TodoistSection.svelte:1 component TodoistSection L208
by src/lib/features/todoist-sync/TodoistSection.svelte:default <- src/lib/app/SettingsPanel.svelte:83 in sectionComponents ref
## locals
local src/lib/features/todoist-sync/TodoistSection.svelte:36 fn handleTokenChange(value: string) L3
local src/lib/features/todoist-sync/TodoistSection.svelte:40 fn handleDefaultLabelChange(value: string) L3
local src/lib/features/todoist-sync/TodoistSection.svelte:45 fn handleIntervalChange(raw: string) L6
local src/lib/features/todoist-sync/TodoistSection.svelte:52 fn loadProjects() L16
## mounts
mount src/lib/features/todoist-sync/TodoistSection.svelte:74 SettingItem -> src/lib/core/settings/sections/SettingItem.svelte
mount src/lib/features/todoist-sync/TodoistSection.svelte:79 Input -> src/lib/components/ui/input/input.svelte
mount src/lib/features/todoist-sync/TodoistSection.svelte:99 SettingItem -> src/lib/core/settings/sections/SettingItem.svelte
mount src/lib/features/todoist-sync/TodoistSection.svelte:103 Input -> src/lib/components/ui/input/input.svelte
mount src/lib/features/todoist-sync/TodoistSection.svelte:115 SettingItem -> src/lib/core/settings/sections/SettingItem.svelte
mount src/lib/features/todoist-sync/TodoistSection.svelte:116 Switch -> src/lib/components/ui/switch/switch.svelte
mount src/lib/features/todoist-sync/TodoistSection.svelte:124 SettingItem -> src/lib/core/settings/sections/SettingItem.svelte
mount src/lib/features/todoist-sync/TodoistSection.svelte:129 Button -> src/lib/components/ui/button/button.svelte
mount src/lib/features/todoist-sync/TodoistSection.svelte:155 SettingItem -> src/lib/core/settings/sections/SettingItem.svelte
mount src/lib/features/todoist-sync/TodoistSection.svelte:156 Switch -> src/lib/components/ui/switch/switch.svelte
mount src/lib/features/todoist-sync/TodoistSection.svelte:164 SettingItem -> src/lib/core/settings/sections/SettingItem.svelte
mount src/lib/features/todoist-sync/TodoistSection.svelte:186 SettingItem -> src/lib/core/settings/sections/SettingItem.svelte
mount src/lib/features/todoist-sync/TodoistSection.svelte:187 Input -> src/lib/components/ui/input/input.svelte
mount src/lib/features/todoist-sync/TodoistSection.svelte:197 SettingItem -> src/lib/core/settings/sections/SettingItem.svelte
mount src/lib/features/todoist-sync/TodoistSection.svelte:198 Input -> src/lib/components/ui/input/input.svelte
## calls
call src/lib/features/todoist-sync/TodoistSection.svelte:37 in handleTokenChange -> src/lib/core/settings/settings.store.svelte.ts:settingsStore.updateTodoist mcall
call src/lib/features/todoist-sync/TodoistSection.svelte:41 in handleDefaultLabelChange -> src/lib/core/settings/settings.store.svelte.ts:settingsStore.updateTodoist mcall
call src/lib/features/todoist-sync/TodoistSection.svelte:49 in handleIntervalChange -> src/lib/core/settings/settings.logic.ts:clampSyncIntervalMinutes call
call src/lib/features/todoist-sync/TodoistSection.svelte:49 in handleIntervalChange -> src/lib/core/settings/settings.store.svelte.ts:settingsStore.updateTodoist mcall
call src/lib/features/todoist-sync/TodoistSection.svelte:60 in loadProjects -> src/lib/features/todoist-sync/todoist-sync.service.ts:fetchRootProjectChoices call
call src/lib/features/todoist-sync/TodoistSection.svelte:62 in loadProjects -> src/lib/utils/debug.ts:error call
call src/lib/features/todoist-sync/TodoistSection.svelte:63 in loadProjects -> src/lib/features/todoist-sync/sync-scope.logic.ts:classifyTodoistError call
call src/lib/features/todoist-sync/TodoistSection.svelte:63 in loadProjects -> src/lib/features/todoist-sync/sync-scope.logic.ts:syncErrorMessage call
call src/lib/features/todoist-sync/TodoistSection.svelte:82 in (markup) -> src/lib/features/todoist-sync/TodoistSection.svelte:handleTokenChange markup
call src/lib/features/todoist-sync/TodoistSection.svelte:106 in (markup) -> src/lib/features/todoist-sync/TodoistSection.svelte:handleDefaultLabelChange markup
call src/lib/features/todoist-sync/TodoistSection.svelte:118 in (markup) -> src/lib/core/settings/settings.store.svelte.ts:settingsStore.updateTodoist markup +4
call src/lib/features/todoist-sync/TodoistSection.svelte:129 in (markup) -> src/lib/features/todoist-sync/TodoistSection.svelte:loadProjects markup
call src/lib/features/todoist-sync/TodoistSection.svelte:204 in (markup) -> src/lib/features/todoist-sync/TodoistSection.svelte:handleIntervalChange markup
## effects
fx src/lib/features/todoist-sync/TodoistSection.svelte:92 tauri-opener.openUrl in (markup)
