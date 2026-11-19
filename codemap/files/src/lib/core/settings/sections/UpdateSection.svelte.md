# file card src/lib/core/settings/sections/UpdateSection.svelte
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/core/settings/sections/UpdateSection.svelte ' codemap/files
file src/lib/core/settings/sections/UpdateSection.svelte component L394 module src/lib/core/settings in1 t5
## imports
imp src/lib/core/settings/sections/UpdateSection.svelte:2 -> src/lib/components/ui/button/index.ts Button
imp src/lib/core/settings/sections/UpdateSection.svelte:3 -> src/lib/components/ui/select/index.ts *
imp src/lib/core/settings/sections/UpdateSection.svelte:4 -> src/lib/components/ui/switch/index.ts Switch
imp src/lib/core/settings/sections/UpdateSection.svelte:5 -> pkg:@tauri-apps/api/core invoke,Channel
imp src/lib/core/settings/sections/UpdateSection.svelte:6 -> pkg:@tauri-apps/plugin-process relaunch
imp src/lib/core/settings/sections/UpdateSection.svelte:7 -> pkg:@tauri-apps/plugin-opener openUrl
imp src/lib/core/settings/sections/UpdateSection.svelte:8 -> pkg:@tauri-apps/plugin-dialog ask
imp src/lib/core/settings/sections/UpdateSection.svelte:9 -> src/lib/contracts/index.ts type:UpdateMetadata
imp src/lib/core/settings/sections/UpdateSection.svelte:10 -> src/lib/contracts/ipc.ts call
imp src/lib/core/settings/sections/UpdateSection.svelte:11 -> src/lib/core/vault/exit.service.ts prepareForExit
imp src/lib/core/settings/sections/UpdateSection.svelte:12 -> src/lib/core/settings/settings.store.svelte.ts settingsStore
imp src/lib/core/settings/sections/UpdateSection.svelte:13 -> src/lib/core/settings/settings.types.ts type:ReleaseChannel
imp src/lib/core/settings/sections/UpdateSection.svelte:14 -> src/lib/core/settings/BuildInfo.svelte default
imp src/lib/core/settings/sections/UpdateSection.svelte:15 -> src/lib/core/settings/sections/SettingItem.svelte default
## imported-by
imp src/lib/app/SettingsPanel.svelte:17 -> src/lib/core/settings/sections/UpdateSection.svelte default
## reach
in2 src/lib/core/settings/sections/UpdateSection.svelte 1 files in 1 modules: src/lib/app(1)
out2 src/lib/core/settings/sections/UpdateSection.svelte 74 files in 6 modules: src/lib/contracts(54) src/lib/components(13) src/lib/core/settings(4) src/lib/core/editor(1) src/lib/core/vault(1) +1 modules
## tests
test src/tests/lib/core/settings/UpdateSection.changelog.test.ts imports src/lib/core/settings/sections/UpdateSection.svelte
test src/tests/lib/core/settings/UpdateSection.channel.test.ts imports src/lib/core/settings/sections/UpdateSection.svelte
test src/tests/lib/core/settings/UpdateSection.download.test.ts imports src/lib/core/settings/sections/UpdateSection.svelte
test src/tests/lib/core/settings/UpdateSection.layout.test.ts imports src/lib/core/settings/sections/UpdateSection.svelte
test src/tests/lib/core/settings/UpdateSection.restart.test.ts imports src/lib/core/settings/sections/UpdateSection.svelte
## symbols
sym src/lib/core/settings/sections/UpdateSection.svelte:1 component UpdateSection L394
by src/lib/core/settings/sections/UpdateSection.svelte:default <- src/lib/app/SettingsPanel.svelte:86 in sectionComponents ref
## locals
local src/lib/core/settings/sections/UpdateSection.svelte:71 fn channelOptionLabel(value: ReleaseChannel): string L3
local src/lib/core/settings/sections/UpdateSection.svelte:75 fn channelOptionDescription(value: ReleaseChannel): string L3
local src/lib/core/settings/sections/UpdateSection.svelte:79 fn handleChannelChange(value: string) L10
local src/lib/core/settings/sections/UpdateSection.svelte:90 fn handleAutoCheckChange(value: boolean) L3
local src/lib/core/settings/sections/UpdateSection.svelte:100 fn formatLastChecked(ts: number | null): string L8
local src/lib/core/settings/sections/UpdateSection.svelte:122 fn formatBytes(bytes: number): string L4
local src/lib/core/settings/sections/UpdateSection.svelte:145 fn downgradeLosses(target: ReleaseChannel): string L6
local src/lib/core/settings/sections/UpdateSection.svelte:166 fn checkForUpdates(opts: { allowDowngrades?: boolean; forceChannel?: ReleaseChannel } = {}) L49
local src/lib/core/settings/sections/UpdateSection.svelte:229 fn confirmDowngrade(target: ReleaseChannel) L20
local src/lib/core/settings/sections/UpdateSection.svelte:255 fn restartApp() L4
## mounts
mount src/lib/core/settings/sections/UpdateSection.svelte:266 SettingItem -> src/lib/core/settings/sections/SettingItem.svelte
mount src/lib/core/settings/sections/UpdateSection.svelte:267 BuildInfo -> src/lib/core/settings/BuildInfo.svelte
mount src/lib/core/settings/sections/UpdateSection.svelte:270 SettingItem -> src/lib/core/settings/sections/SettingItem.svelte
mount src/lib/core/settings/sections/UpdateSection.svelte:275 Button -> src/lib/components/ui/button/button.svelte
mount src/lib/core/settings/sections/UpdateSection.svelte:302 Button -> src/lib/components/ui/button/button.svelte
mount src/lib/core/settings/sections/UpdateSection.svelte:310 Button -> src/lib/components/ui/button/button.svelte
mount src/lib/core/settings/sections/UpdateSection.svelte:319 SettingItem -> src/lib/core/settings/sections/SettingItem.svelte
mount src/lib/core/settings/sections/UpdateSection.svelte:342 SettingItem -> src/lib/core/settings/sections/SettingItem.svelte
mount src/lib/core/settings/sections/UpdateSection.svelte:347 Button -> src/lib/components/ui/button/button.svelte
mount src/lib/core/settings/sections/UpdateSection.svelte:350 Button -> src/lib/components/ui/button/button.svelte
mount src/lib/core/settings/sections/UpdateSection.svelte:357 SettingItem -> src/lib/core/settings/sections/SettingItem.svelte
mount src/lib/core/settings/sections/UpdateSection.svelte:361 Switch -> src/lib/components/ui/switch/switch.svelte
## calls
call src/lib/core/settings/sections/UpdateSection.svelte:80 in handleChannelChange -> src/lib/core/settings/settings.store.svelte.ts:settingsStore.updateUpdates mcall
call src/lib/core/settings/sections/UpdateSection.svelte:91 in handleAutoCheckChange -> src/lib/core/settings/settings.store.svelte.ts:settingsStore.updateUpdates mcall
call src/lib/core/settings/sections/UpdateSection.svelte:174 in checkForUpdates -> src/lib/contracts/ipc.ts:call call
call src/lib/core/settings/sections/UpdateSection.svelte:181 in checkForUpdates -> src/lib/core/settings/settings.store.svelte.ts:settingsStore.updateUpdates mcall
call src/lib/core/settings/sections/UpdateSection.svelte:230 in confirmDowngrade -> src/lib/core/settings/sections/UpdateSection.svelte:channelOptionLabel call +1
call src/lib/core/settings/sections/UpdateSection.svelte:238 in confirmDowngrade -> src/lib/core/settings/sections/UpdateSection.svelte:downgradeLosses call
call src/lib/core/settings/sections/UpdateSection.svelte:247 in confirmDowngrade -> src/lib/core/settings/sections/UpdateSection.svelte:checkForUpdates call
call src/lib/core/settings/sections/UpdateSection.svelte:256 in restartApp -> src/lib/core/vault/exit.service.ts:prepareForExit call
call src/lib/core/settings/sections/UpdateSection.svelte:272 in (markup) -> src/lib/core/settings/sections/UpdateSection.svelte:channelOptionLabel markup +3
call src/lib/core/settings/sections/UpdateSection.svelte:272 in (markup) -> src/lib/core/settings/sections/UpdateSection.svelte:formatLastChecked markup
call src/lib/core/settings/sections/UpdateSection.svelte:275 in (markup) -> src/lib/core/settings/sections/UpdateSection.svelte:checkForUpdates markup +1
call src/lib/core/settings/sections/UpdateSection.svelte:285 in (markup) -> src/lib/core/settings/sections/UpdateSection.svelte:formatBytes markup
call src/lib/core/settings/sections/UpdateSection.svelte:302 in (markup) -> src/lib/core/settings/sections/UpdateSection.svelte:restartApp markup
call src/lib/core/settings/sections/UpdateSection.svelte:321 in (markup) -> src/lib/core/settings/sections/UpdateSection.svelte:channelOptionDescription markup
call src/lib/core/settings/sections/UpdateSection.svelte:326 in (markup) -> src/lib/core/settings/sections/UpdateSection.svelte:handleChannelChange markup
call src/lib/core/settings/sections/UpdateSection.svelte:344 in (markup) -> src/lib/core/settings/sections/UpdateSection.svelte:downgradeLosses markup
call src/lib/core/settings/sections/UpdateSection.svelte:347 in (markup) -> src/lib/core/settings/sections/UpdateSection.svelte:confirmDowngrade markup
call src/lib/core/settings/sections/UpdateSection.svelte:363 in (markup) -> src/lib/core/settings/sections/UpdateSection.svelte:handleAutoCheckChange markup
## effects
ipc-call src/lib/core/settings/sections/UpdateSection.svelte:174 in checkForUpdates -> ipc:check_for_update_on_channel -> src-tauri/src/commands/update_channel.rs:95
fx src/lib/core/settings/sections/UpdateSection.svelte:202 tauri-api-core.invoke in checkForUpdates
fx src/lib/core/settings/sections/UpdateSection.svelte:237 tauri-dialog.ask in confirmDowngrade
fx src/lib/core/settings/sections/UpdateSection.svelte:257 tauri-process.relaunch in restartApp
fx src/lib/core/settings/sections/UpdateSection.svelte:350 tauri-opener.openUrl in (markup)
fx src/lib/core/settings/sections/UpdateSection.svelte:384 tauri-opener.openUrl in (markup)
