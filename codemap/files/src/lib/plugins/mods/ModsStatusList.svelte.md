# file card src/lib/plugins/mods/ModsStatusList.svelte
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/plugins/mods/ModsStatusList.svelte ' codemap/files
file src/lib/plugins/mods/ModsStatusList.svelte component L168 module src/lib/plugins/mods in1 t1
## imports
imp src/lib/plugins/mods/ModsStatusList.svelte:5 -> src/lib/components/ui/input/index.ts Input
imp src/lib/plugins/mods/ModsStatusList.svelte:6 -> src/lib/components/ui/switch/index.ts Switch
imp src/lib/plugins/mods/ModsStatusList.svelte:7 -> src/lib/core/vault/vault.store.svelte.ts vaultStore
imp src/lib/plugins/mods/ModsStatusList.svelte:8 -> src/lib/utils/debug.ts error
imp src/lib/plugins/mods/ModsStatusList.svelte:10 -> src/lib/plugins/mods/mods-enabled.store.svelte.ts modsEnabledStore
imp src/lib/plugins/mods/ModsStatusList.svelte:11 -> src/lib/plugins/mods/mods-host.service.ts disableMod,enableMod,readModSettings,saveModSetting
imp src/lib/plugins/mods/ModsStatusList.svelte:12 -> src/lib/plugins/mods/mods.logic.ts type:ModSettingField
imp src/lib/plugins/mods/ModsStatusList.svelte:13 -> src/lib/plugins/mods/mods.store.svelte.ts modsStore,type:ModStatusEntry
## imported-by
imp src/lib/app/LabsSection.svelte:11 -> src/lib/plugins/mods/ModsStatusList.svelte default
## reach
in2 src/lib/plugins/mods/ModsStatusList.svelte 1 files in 1 modules: src/lib/app(1)
out2 src/lib/plugins/mods/ModsStatusList.svelte 30 files in 12 modules: src/lib/plugins/mods(11) src/lib/features/file-icons(3) src/lib/utils(3) src/lib/components(2) src/lib/contracts(2) +7 modules
## tests
test src/tests/lib/plugins/mods/ModsStatusList.test.ts imports src/lib/plugins/mods/ModsStatusList.svelte mirror
## symbols
sym src/lib/plugins/mods/ModsStatusList.svelte:1 component ModsStatusList L168
by src/lib/plugins/mods/ModsStatusList.svelte:default <- src/lib/app/LabsSection.svelte:50 in (markup) mount
## locals
local src/lib/plugins/mods/ModsStatusList.svelte:25 fn setModEnabled(entry: ModStatusEntry, enabled: boolean) L17
local src/lib/plugins/mods/ModsStatusList.svelte:69 fn settingValue(field: ModSettingField, values: Record<string, unknown>): boolean | string L5
local src/lib/plugins/mods/ModsStatusList.svelte:76 fn commitSetting(entry: ModStatusEntry, field: ModSettingField, value: boolean | string) L8
## mounts
mount src/lib/plugins/mods/ModsStatusList.svelte:104 Switch -> src/lib/components/ui/switch/switch.svelte
mount src/lib/plugins/mods/ModsStatusList.svelte:147 Switch -> src/lib/components/ui/switch/switch.svelte
mount src/lib/plugins/mods/ModsStatusList.svelte:152 Input -> src/lib/components/ui/input/input.svelte
## mounted-at
mount src/lib/app/LabsSection.svelte:50 ModsStatusList -> src/lib/plugins/mods/ModsStatusList.svelte
## calls
call src/lib/plugins/mods/ModsStatusList.svelte:27 in setModEnabled -> src/lib/plugins/mods/mods-enabled.store.svelte.ts:modsEnabledStore.setModEnabled mcall
call src/lib/plugins/mods/ModsStatusList.svelte:29 in setModEnabled -> src/lib/utils/debug.ts:error call +1
call src/lib/plugins/mods/ModsStatusList.svelte:35 in setModEnabled -> src/lib/plugins/mods/mods-host.service.ts:enableMod call
call src/lib/plugins/mods/ModsStatusList.svelte:39 in setModEnabled -> src/lib/plugins/mods/mods-host.service.ts:disableMod call
call src/lib/plugins/mods/ModsStatusList.svelte:60 in $effect@51 -> src/lib/plugins/mods/mods-host.service.ts:readModSettings call
call src/lib/plugins/mods/ModsStatusList.svelte:79 in commitSetting -> src/lib/plugins/mods/ModsStatusList.svelte:settingValue call
call src/lib/plugins/mods/ModsStatusList.svelte:82 in commitSetting -> src/lib/plugins/mods/mods-host.service.ts:saveModSetting call
call src/lib/plugins/mods/ModsStatusList.svelte:92 in (markup) -> src/lib/plugins/mods/mods.store.svelte.ts:modsStore.callbackErrorFor markup
call src/lib/plugins/mods/ModsStatusList.svelte:107 in (markup) -> src/lib/plugins/mods/ModsStatusList.svelte:setModEnabled markup
call src/lib/plugins/mods/ModsStatusList.svelte:143 in (markup) -> src/lib/plugins/mods/ModsStatusList.svelte:settingValue markup
call src/lib/plugins/mods/ModsStatusList.svelte:149 in (markup) -> src/lib/plugins/mods/ModsStatusList.svelte:commitSetting markup +1
## effects
fx src/lib/plugins/mods/ModsStatusList.svelte:51 svelte.$effect in (script)
