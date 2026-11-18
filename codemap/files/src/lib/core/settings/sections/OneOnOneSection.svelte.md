# file card src/lib/core/settings/sections/OneOnOneSection.svelte
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/core/settings/sections/OneOnOneSection.svelte ' codemap/files
file src/lib/core/settings/sections/OneOnOneSection.svelte component L115 module src/lib/core/settings in1 t1
## imports
imp src/lib/core/settings/sections/OneOnOneSection.svelte:2 -> src/lib/components/ui/input/index.ts Input
imp src/lib/core/settings/sections/OneOnOneSection.svelte:3 -> src/lib/core/filesystem/fs.store.svelte.ts fsStore
imp src/lib/core/settings/sections/OneOnOneSection.svelte:4 -> src/lib/core/vault/vault.store.svelte.ts vaultStore
imp src/lib/core/settings/sections/OneOnOneSection.svelte:5 -> src/lib/core/settings/settings.logic.ts isTemplateMissing
imp src/lib/core/settings/sections/OneOnOneSection.svelte:6 -> src/lib/core/settings/settings.store.svelte.ts settingsStore
imp src/lib/core/settings/sections/OneOnOneSection.svelte:7 -> src/lib/core/settings/sections/SettingItem.svelte default
## imported-by
imp src/lib/app/SettingsPanel.svelte:6 -> src/lib/core/settings/sections/OneOnOneSection.svelte default
## reach
in2 src/lib/core/settings/sections/OneOnOneSection.svelte 1 files in 1 modules: src/lib/app(1)
out2 src/lib/core/settings/sections/OneOnOneSection.svelte 8 files in 5 modules: src/lib/core/settings(3) src/lib/core/filesystem(2) src/lib/components(1) src/lib/core/vault(1) src/lib/utils(1)
## tests
test src/tests/lib/core/settings/OneOnOneSection.test.ts imports src/lib/core/settings/sections/OneOnOneSection.svelte
## symbols
sym src/lib/core/settings/sections/OneOnOneSection.svelte:1 component OneOnOneSection L115
by src/lib/core/settings/sections/OneOnOneSection.svelte:default <- src/lib/app/SettingsPanel.svelte:77 in sectionComponents ref
## locals
local src/lib/core/settings/sections/OneOnOneSection.svelte:9 fn inputValue(e: Event): string L3
local src/lib/core/settings/sections/OneOnOneSection.svelte:14 fn updateDueAfterDays(e: Event) L6
## mounts
mount src/lib/core/settings/sections/OneOnOneSection.svelte:33 SettingItem -> src/lib/core/settings/sections/SettingItem.svelte
mount src/lib/core/settings/sections/OneOnOneSection.svelte:37 Input -> src/lib/components/ui/input/input.svelte
mount src/lib/core/settings/sections/OneOnOneSection.svelte:45 SettingItem -> src/lib/core/settings/sections/SettingItem.svelte
mount src/lib/core/settings/sections/OneOnOneSection.svelte:49 Input -> src/lib/components/ui/input/input.svelte
mount src/lib/core/settings/sections/OneOnOneSection.svelte:59 SettingItem -> src/lib/core/settings/sections/SettingItem.svelte
mount src/lib/core/settings/sections/OneOnOneSection.svelte:63 Input -> src/lib/components/ui/input/input.svelte
mount src/lib/core/settings/sections/OneOnOneSection.svelte:71 SettingItem -> src/lib/core/settings/sections/SettingItem.svelte
mount src/lib/core/settings/sections/OneOnOneSection.svelte:75 Input -> src/lib/components/ui/input/input.svelte
mount src/lib/core/settings/sections/OneOnOneSection.svelte:83 SettingItem -> src/lib/core/settings/sections/SettingItem.svelte
mount src/lib/core/settings/sections/OneOnOneSection.svelte:88 Input -> src/lib/components/ui/input/input.svelte
mount src/lib/core/settings/sections/OneOnOneSection.svelte:102 SettingItem -> src/lib/core/settings/sections/SettingItem.svelte
mount src/lib/core/settings/sections/OneOnOneSection.svelte:106 Input -> src/lib/components/ui/input/input.svelte
## calls
call src/lib/core/settings/sections/OneOnOneSection.svelte:15 in updateDueAfterDays -> src/lib/core/settings/sections/OneOnOneSection.svelte:inputValue call
call src/lib/core/settings/sections/OneOnOneSection.svelte:18 in updateDueAfterDays -> src/lib/core/settings/settings.store.svelte.ts:settingsStore.updateOneOnOne mcall
call src/lib/core/settings/sections/OneOnOneSection.svelte:21 in templateMissing=$derived -> src/lib/core/settings/settings.logic.ts:isTemplateMissing call
call src/lib/core/settings/sections/OneOnOneSection.svelte:40 in (markup) -> src/lib/core/settings/sections/OneOnOneSection.svelte:inputValue markup +4
call src/lib/core/settings/sections/OneOnOneSection.svelte:40 in (markup) -> src/lib/core/settings/settings.store.svelte.ts:settingsStore.updateOneOnOne markup +4
call src/lib/core/settings/sections/OneOnOneSection.svelte:111 in (markup) -> src/lib/core/settings/sections/OneOnOneSection.svelte:updateDueAfterDays markup
