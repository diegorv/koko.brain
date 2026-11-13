# file card src/lib/core/settings/sections/FileHistorySection.svelte
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/core/settings/sections/FileHistorySection.svelte ' codemap/files
file src/lib/core/settings/sections/FileHistorySection.svelte component L56 module src/lib/core/settings in1 t1
## imports
imp src/lib/core/settings/sections/FileHistorySection.svelte:2 -> src/lib/components/ui/input/index.ts Input
imp src/lib/core/settings/sections/FileHistorySection.svelte:3 -> src/lib/components/ui/switch/index.ts Switch
imp src/lib/core/settings/sections/FileHistorySection.svelte:4 -> src/lib/utils/clamp.ts clamp
imp src/lib/core/settings/sections/FileHistorySection.svelte:5 -> src/lib/core/settings/settings.store.svelte.ts settingsStore
imp src/lib/core/settings/sections/FileHistorySection.svelte:6 -> src/lib/core/settings/sections/SettingItem.svelte default
## imported-by
imp src/lib/app/SettingsPanel.svelte:10 -> src/lib/core/settings/sections/FileHistorySection.svelte default
## reach
in2 src/lib/core/settings/sections/FileHistorySection.svelte 1 files in 1 modules: src/lib/app(1)
out2 src/lib/core/settings/sections/FileHistorySection.svelte 5 files in 2 modules: src/lib/core/settings(3) src/lib/components(2)
## tests
test src/tests/lib/core/settings/settings-copy.test.ts imports src/lib/core/settings/sections/FileHistorySection.svelte
## symbols
sym src/lib/core/settings/sections/FileHistorySection.svelte:1 component FileHistorySection L56
by src/lib/core/settings/sections/FileHistorySection.svelte:default <- src/lib/app/SettingsPanel.svelte:80 in sectionComponents ref
## locals
local src/lib/core/settings/sections/FileHistorySection.svelte:8 fn clampRetentionDays(value: number): number L3
## mounts
mount src/lib/core/settings/sections/FileHistorySection.svelte:16 SettingItem -> src/lib/core/settings/sections/SettingItem.svelte
mount src/lib/core/settings/sections/FileHistorySection.svelte:20 Switch -> src/lib/components/ui/switch/switch.svelte
mount src/lib/core/settings/sections/FileHistorySection.svelte:28 SettingItem -> src/lib/core/settings/sections/SettingItem.svelte
mount src/lib/core/settings/sections/FileHistorySection.svelte:32 Input -> src/lib/components/ui/input/input.svelte
mount src/lib/core/settings/sections/FileHistorySection.svelte:45 SettingItem -> src/lib/core/settings/sections/SettingItem.svelte
mount src/lib/core/settings/sections/FileHistorySection.svelte:49 Switch -> src/lib/components/ui/switch/switch.svelte
## calls
call src/lib/core/settings/sections/FileHistorySection.svelte:9 in clampRetentionDays -> src/lib/utils/clamp.ts:clamp call
call src/lib/core/settings/sections/FileHistorySection.svelte:23 in (markup) -> src/lib/core/settings/settings.store.svelte.ts:settingsStore.updateHistory markup +2
call src/lib/core/settings/sections/FileHistorySection.svelte:39 in (markup) -> src/lib/core/settings/sections/FileHistorySection.svelte:clampRetentionDays markup
