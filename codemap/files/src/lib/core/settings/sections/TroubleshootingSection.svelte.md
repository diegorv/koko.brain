# file card src/lib/core/settings/sections/TroubleshootingSection.svelte
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/core/settings/sections/TroubleshootingSection.svelte ' codemap/files
file src/lib/core/settings/sections/TroubleshootingSection.svelte component L180 module src/lib/core/settings in1 t1
## imports
imp src/lib/core/settings/sections/TroubleshootingSection.svelte:4 -> src/lib/components/ui/button/index.ts Button
imp src/lib/core/settings/sections/TroubleshootingSection.svelte:5 -> src/lib/components/ui/switch/index.ts Switch
imp src/lib/core/settings/sections/TroubleshootingSection.svelte:6 -> src/lib/utils/debug.ts setTauriDebugMode
imp src/lib/core/settings/sections/TroubleshootingSection.svelte:7 -> src/lib/utils/log.service.ts initLogSession,teardownLogSession,openLogDir,startHeartbeat,stopHeartbeat,isLogSessionActive
imp src/lib/core/settings/sections/TroubleshootingSection.svelte:11 -> src/lib/core/markdown-editor/extensions/live-preview/core/decorator-names.ts DECORATOR_LABELS,DECORATOR_NAMES
imp src/lib/core/settings/sections/TroubleshootingSection.svelte:12 -> src/lib/core/settings/settings.store.svelte.ts settingsStore
imp src/lib/core/settings/sections/TroubleshootingSection.svelte:13 -> src/lib/core/settings/sections/SettingItem.svelte default
## imported-by
imp src/lib/app/SettingsPanel.svelte:16 -> src/lib/core/settings/sections/TroubleshootingSection.svelte default
## reach
in2 src/lib/core/settings/sections/TroubleshootingSection.svelte 1 files in 1 modules: src/lib/app(1)
out2 src/lib/core/settings/sections/TroubleshootingSection.svelte 8 files in 3 modules: src/lib/core/settings(4) src/lib/components(2) src/lib/contracts(2)
## tests
test src/tests/lib/core/settings/TroubleshootingSection.test.ts imports src/lib/core/settings/sections/TroubleshootingSection.svelte
## symbols
sym src/lib/core/settings/sections/TroubleshootingSection.svelte:1 component TroubleshootingSection L180
by src/lib/core/settings/sections/TroubleshootingSection.svelte:default <- src/lib/app/SettingsPanel.svelte:85 in sectionComponents ref
## locals
local src/lib/core/settings/sections/TroubleshootingSection.svelte:15 fn isDecoratorDisabled(name: string): boolean L3
local src/lib/core/settings/sections/TroubleshootingSection.svelte:25 fn startLogSession(turnOff: () => void) L9
## mounts
mount src/lib/core/settings/sections/TroubleshootingSection.svelte:44 SettingItem -> src/lib/core/settings/sections/SettingItem.svelte
mount src/lib/core/settings/sections/TroubleshootingSection.svelte:48 Switch -> src/lib/components/ui/switch/switch.svelte
mount src/lib/core/settings/sections/TroubleshootingSection.svelte:56 SettingItem -> src/lib/core/settings/sections/SettingItem.svelte
mount src/lib/core/settings/sections/TroubleshootingSection.svelte:60 Switch -> src/lib/components/ui/switch/switch.svelte
mount src/lib/core/settings/sections/TroubleshootingSection.svelte:73 SettingItem -> src/lib/core/settings/sections/SettingItem.svelte
mount src/lib/core/settings/sections/TroubleshootingSection.svelte:77 Switch -> src/lib/components/ui/switch/switch.svelte
mount src/lib/core/settings/sections/TroubleshootingSection.svelte:84 SettingItem -> src/lib/core/settings/sections/SettingItem.svelte
mount src/lib/core/settings/sections/TroubleshootingSection.svelte:89 Switch -> src/lib/components/ui/switch/switch.svelte
mount src/lib/core/settings/sections/TroubleshootingSection.svelte:104 SettingItem -> src/lib/core/settings/sections/SettingItem.svelte
mount src/lib/core/settings/sections/TroubleshootingSection.svelte:108 Button -> src/lib/components/ui/button/button.svelte
mount src/lib/core/settings/sections/TroubleshootingSection.svelte:115 SettingItem -> src/lib/core/settings/sections/SettingItem.svelte
mount src/lib/core/settings/sections/TroubleshootingSection.svelte:119 Switch -> src/lib/components/ui/switch/switch.svelte
mount src/lib/core/settings/sections/TroubleshootingSection.svelte:136 SettingItem -> src/lib/core/settings/sections/SettingItem.svelte
mount src/lib/core/settings/sections/TroubleshootingSection.svelte:139 Switch -> src/lib/components/ui/switch/switch.svelte
mount src/lib/core/settings/sections/TroubleshootingSection.svelte:151 SettingItem -> src/lib/core/settings/sections/SettingItem.svelte
mount src/lib/core/settings/sections/TroubleshootingSection.svelte:155 Switch -> src/lib/components/ui/switch/switch.svelte
mount src/lib/core/settings/sections/TroubleshootingSection.svelte:164 SettingItem -> src/lib/core/settings/sections/SettingItem.svelte
mount src/lib/core/settings/sections/TroubleshootingSection.svelte:168 Switch -> src/lib/components/ui/switch/switch.svelte
## calls
call src/lib/core/settings/sections/TroubleshootingSection.svelte:26 in startLogSession -> src/lib/utils/log.service.ts:initLogSession call
call src/lib/core/settings/sections/TroubleshootingSection.svelte:27 in startLogSession -> src/lib/utils/log.service.ts:isLogSessionActive call
call src/lib/core/settings/sections/TroubleshootingSection.svelte:32 in startLogSession -> src/lib/utils/log.service.ts:startHeartbeat call
call src/lib/core/settings/sections/TroubleshootingSection.svelte:51 in (markup) -> src/lib/core/settings/settings.store.svelte.ts:settingsStore.updateDebugMode markup
call src/lib/core/settings/sections/TroubleshootingSection.svelte:63 in (markup) -> src/lib/core/settings/settings.store.svelte.ts:settingsStore.updateDebugLogToFile markup +1
call src/lib/core/settings/sections/TroubleshootingSection.svelte:65 in (markup) -> src/lib/core/settings/sections/TroubleshootingSection.svelte:startLogSession markup +1
call src/lib/core/settings/sections/TroubleshootingSection.svelte:67 in (markup) -> src/lib/utils/log.service.ts:teardownLogSession markup +1
call src/lib/core/settings/sections/TroubleshootingSection.svelte:80 in (markup) -> src/lib/core/settings/settings.store.svelte.ts:settingsStore.updateDebugModRunMessages markup
call src/lib/core/settings/sections/TroubleshootingSection.svelte:94 in (markup) -> src/lib/core/settings/settings.store.svelte.ts:settingsStore.updateDebugHeartbeat markup
call src/lib/core/settings/sections/TroubleshootingSection.svelte:95 in (markup) -> src/lib/utils/log.service.ts:isLogSessionActive markup
call src/lib/core/settings/sections/TroubleshootingSection.svelte:96 in (markup) -> src/lib/utils/log.service.ts:startHeartbeat markup
call src/lib/core/settings/sections/TroubleshootingSection.svelte:98 in (markup) -> src/lib/utils/log.service.ts:stopHeartbeat markup
call src/lib/core/settings/sections/TroubleshootingSection.svelte:108 in (markup) -> src/lib/utils/log.service.ts:openLogDir markup
call src/lib/core/settings/sections/TroubleshootingSection.svelte:124 in (markup) -> src/lib/core/settings/settings.store.svelte.ts:settingsStore.updateLivePreviewProfiling markup
call src/lib/core/settings/sections/TroubleshootingSection.svelte:141 in (markup) -> src/lib/core/settings/sections/TroubleshootingSection.svelte:isDecoratorDisabled markup
call src/lib/core/settings/sections/TroubleshootingSection.svelte:143 in (markup) -> src/lib/core/settings/settings.store.svelte.ts:settingsStore.toggleDecorator markup
call src/lib/core/settings/sections/TroubleshootingSection.svelte:158 in (markup) -> src/lib/core/settings/settings.store.svelte.ts:settingsStore.updateDebugModeTauri markup
call src/lib/core/settings/sections/TroubleshootingSection.svelte:159 in (markup) -> src/lib/utils/debug.ts:setTauriDebugMode markup
call src/lib/core/settings/sections/TroubleshootingSection.svelte:171 in (markup) -> src/lib/core/settings/settings.store.svelte.ts:settingsStore.updateDebugTauriLogToFile markup +1
