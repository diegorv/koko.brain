# file card src/lib/app/LabsSection.svelte
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/app/LabsSection.svelte ' codemap/files
file src/lib/app/LabsSection.svelte component L52 module src/lib/app in1 t1
## imports
imp src/lib/app/LabsSection.svelte:5 -> src/lib/components/ui/switch/index.ts Switch
imp src/lib/app/LabsSection.svelte:6 -> src/lib/core/settings/sections/SettingItem.svelte default
imp src/lib/app/LabsSection.svelte:7 -> src/lib/core/vault/vault.store.svelte.ts vaultStore
imp src/lib/app/LabsSection.svelte:8 -> src/lib/utils/debug.ts error
imp src/lib/app/LabsSection.svelte:9 -> src/lib/plugins/mods/mods-enabled.store.svelte.ts modsEnabledStore
imp src/lib/app/LabsSection.svelte:10 -> src/lib/plugins/mods/mods-host.service.ts startModsHost,stopModsHost
imp src/lib/app/LabsSection.svelte:11 -> src/lib/plugins/mods/ModsStatusList.svelte default
## imported-by
imp src/lib/app/SettingsPanel.svelte:20 -> src/lib/app/LabsSection.svelte default
## reach
in2 src/lib/app/LabsSection.svelte 1 files in 1 modules: src/lib/app(1)
out2 src/lib/app/LabsSection.svelte 32 files in 12 modules: src/lib/plugins/mods(13) src/lib/features/file-icons(3) src/lib/utils(3) src/lib/components(2) src/lib/contracts(2) +7 modules
## tests
test src/tests/lib/app/LabsSection.test.ts imports src/lib/app/LabsSection.svelte mirror
## symbols
sym src/lib/app/LabsSection.svelte:1 component LabsSection L52
by src/lib/app/LabsSection.svelte:default <- src/lib/app/SettingsPanel.svelte:90 in sectionComponents ref
## locals
local src/lib/app/LabsSection.svelte:17 fn setModsEnabled(enabled: boolean) L17
## mounts
mount src/lib/app/LabsSection.svelte:39 SettingItem -> src/lib/core/settings/sections/SettingItem.svelte
mount src/lib/app/LabsSection.svelte:43 Switch -> src/lib/components/ui/switch/switch.svelte
mount src/lib/app/LabsSection.svelte:50 ModsStatusList -> src/lib/plugins/mods/ModsStatusList.svelte
## calls
call src/lib/app/LabsSection.svelte:19 in setModsEnabled -> src/lib/plugins/mods/mods-enabled.store.svelte.ts:modsEnabledStore.setEnabled mcall
call src/lib/app/LabsSection.svelte:21 in setModsEnabled -> src/lib/utils/debug.ts:error call +1
call src/lib/app/LabsSection.svelte:27 in setModsEnabled -> src/lib/plugins/mods/mods-host.service.ts:startModsHost call
call src/lib/app/LabsSection.svelte:31 in setModsEnabled -> src/lib/plugins/mods/mods-host.service.ts:stopModsHost call
call src/lib/app/LabsSection.svelte:45 in (markup) -> src/lib/app/LabsSection.svelte:setModsEnabled markup
