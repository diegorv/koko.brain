# file card src/lib/core/settings/sections/TroubleshootingSection.svelte
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/core/settings/sections/TroubleshootingSection.svelte ' codemap/files
file src/lib/core/settings/sections/TroubleshootingSection.svelte component L158 module src/lib/core/settings in1 t1
## imports
imp src/lib/core/settings/sections/TroubleshootingSection.svelte:2 -> src/lib/components/ui/button/index.ts Button
imp src/lib/core/settings/sections/TroubleshootingSection.svelte:3 -> src/lib/components/ui/switch/index.ts Switch
imp src/lib/core/settings/sections/TroubleshootingSection.svelte:4 -> src/lib/utils/debug.ts setTauriDebugMode
imp src/lib/core/settings/sections/TroubleshootingSection.svelte:5 -> src/lib/utils/log.service.ts initLogSession,teardownLogSession,openLogDir,startHeartbeat,stopHeartbeat,isLogSessionActive
imp src/lib/core/settings/sections/TroubleshootingSection.svelte:9 -> src/lib/core/markdown-editor/extensions/live-preview/core/decorator-names.ts DECORATOR_LABELS,DECORATOR_NAMES
imp src/lib/core/settings/sections/TroubleshootingSection.svelte:10 -> src/lib/core/settings/settings.store.svelte.ts settingsStore
imp src/lib/core/settings/sections/TroubleshootingSection.svelte:11 -> src/lib/core/settings/sections/SettingItem.svelte default
## imported-by
imp src/lib/app/SettingsPanel.svelte:16 -> src/lib/core/settings/sections/TroubleshootingSection.svelte default
## reach
in2 src/lib/core/settings/sections/TroubleshootingSection.svelte 1 files in 1 modules: src/lib/app(1)
out2 src/lib/core/settings/sections/TroubleshootingSection.svelte 8 files in 3 modules: src/lib/core/settings(4) src/lib/components(2) src/lib/contracts(2)
## tests
test src/tests/lib/core/settings/TroubleshootingSection.test.ts imports src/lib/core/settings/sections/TroubleshootingSection.svelte
## symbols
sym src/lib/core/settings/sections/TroubleshootingSection.svelte:1 component TroubleshootingSection L158
by src/lib/core/settings/sections/TroubleshootingSection.svelte:default <- src/lib/app/SettingsPanel.svelte:85 in sectionComponents ref
## locals
local src/lib/core/settings/sections/TroubleshootingSection.svelte:13 fn isDecoratorDisabled(name: string): boolean L3
## mounts
mount src/lib/core/settings/sections/TroubleshootingSection.svelte:23 SettingItem -> src/lib/core/settings/sections/SettingItem.svelte
mount src/lib/core/settings/sections/TroubleshootingSection.svelte:27 Switch -> src/lib/components/ui/switch/switch.svelte
mount src/lib/core/settings/sections/TroubleshootingSection.svelte:35 SettingItem -> src/lib/core/settings/sections/SettingItem.svelte
mount src/lib/core/settings/sections/TroubleshootingSection.svelte:39 Switch -> src/lib/components/ui/switch/switch.svelte
mount src/lib/core/settings/sections/TroubleshootingSection.svelte:54 SettingItem -> src/lib/core/settings/sections/SettingItem.svelte
mount src/lib/core/settings/sections/TroubleshootingSection.svelte:58 Switch -> src/lib/components/ui/switch/switch.svelte
mount src/lib/core/settings/sections/TroubleshootingSection.svelte:65 SettingItem -> src/lib/core/settings/sections/SettingItem.svelte
mount src/lib/core/settings/sections/TroubleshootingSection.svelte:69 Switch -> src/lib/components/ui/switch/switch.svelte
mount src/lib/core/settings/sections/TroubleshootingSection.svelte:82 SettingItem -> src/lib/core/settings/sections/SettingItem.svelte
mount src/lib/core/settings/sections/TroubleshootingSection.svelte:86 Button -> src/lib/components/ui/button/button.svelte
mount src/lib/core/settings/sections/TroubleshootingSection.svelte:93 SettingItem -> src/lib/core/settings/sections/SettingItem.svelte
mount src/lib/core/settings/sections/TroubleshootingSection.svelte:97 Switch -> src/lib/components/ui/switch/switch.svelte
mount src/lib/core/settings/sections/TroubleshootingSection.svelte:112 SettingItem -> src/lib/core/settings/sections/SettingItem.svelte
mount src/lib/core/settings/sections/TroubleshootingSection.svelte:115 Switch -> src/lib/components/ui/switch/switch.svelte
mount src/lib/core/settings/sections/TroubleshootingSection.svelte:127 SettingItem -> src/lib/core/settings/sections/SettingItem.svelte
mount src/lib/core/settings/sections/TroubleshootingSection.svelte:131 Switch -> src/lib/components/ui/switch/switch.svelte
mount src/lib/core/settings/sections/TroubleshootingSection.svelte:140 SettingItem -> src/lib/core/settings/sections/SettingItem.svelte
mount src/lib/core/settings/sections/TroubleshootingSection.svelte:144 Switch -> src/lib/components/ui/switch/switch.svelte
## calls
call src/lib/core/settings/sections/TroubleshootingSection.svelte:30 in (markup) -> src/lib/core/settings/settings.store.svelte.ts:settingsStore.updateDebugMode markup
call src/lib/core/settings/sections/TroubleshootingSection.svelte:42 in (markup) -> src/lib/core/settings/settings.store.svelte.ts:settingsStore.updateDebugLogToFile markup
call src/lib/core/settings/sections/TroubleshootingSection.svelte:44 in (markup) -> src/lib/utils/log.service.ts:initLogSession markup +1
call src/lib/core/settings/sections/TroubleshootingSection.svelte:45 in (markup) -> src/lib/utils/log.service.ts:startHeartbeat markup +2
call src/lib/core/settings/sections/TroubleshootingSection.svelte:48 in (markup) -> src/lib/utils/log.service.ts:teardownLogSession markup +1
call src/lib/core/settings/sections/TroubleshootingSection.svelte:61 in (markup) -> src/lib/core/settings/settings.store.svelte.ts:settingsStore.updateDebugModRunMessages markup
call src/lib/core/settings/sections/TroubleshootingSection.svelte:72 in (markup) -> src/lib/core/settings/settings.store.svelte.ts:settingsStore.updateDebugHeartbeat markup
call src/lib/core/settings/sections/TroubleshootingSection.svelte:73 in (markup) -> src/lib/utils/log.service.ts:isLogSessionActive markup
call src/lib/core/settings/sections/TroubleshootingSection.svelte:76 in (markup) -> src/lib/utils/log.service.ts:stopHeartbeat markup
call src/lib/core/settings/sections/TroubleshootingSection.svelte:86 in (markup) -> src/lib/utils/log.service.ts:openLogDir markup
call src/lib/core/settings/sections/TroubleshootingSection.svelte:100 in (markup) -> src/lib/core/settings/settings.store.svelte.ts:settingsStore.updateLivePreviewProfiling markup
call src/lib/core/settings/sections/TroubleshootingSection.svelte:117 in (markup) -> src/lib/core/settings/sections/TroubleshootingSection.svelte:isDecoratorDisabled markup
call src/lib/core/settings/sections/TroubleshootingSection.svelte:119 in (markup) -> src/lib/core/settings/settings.store.svelte.ts:settingsStore.toggleDecorator markup
call src/lib/core/settings/sections/TroubleshootingSection.svelte:134 in (markup) -> src/lib/core/settings/settings.store.svelte.ts:settingsStore.updateDebugModeTauri markup
call src/lib/core/settings/sections/TroubleshootingSection.svelte:135 in (markup) -> src/lib/utils/debug.ts:setTauriDebugMode markup
call src/lib/core/settings/sections/TroubleshootingSection.svelte:147 in (markup) -> src/lib/core/settings/settings.store.svelte.ts:settingsStore.updateDebugTauriLogToFile markup
