# file card src/lib/core/settings/sections/OneOnOneSection.svelte
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/core/settings/sections/OneOnOneSection.svelte ' codemap/files
file src/lib/core/settings/sections/OneOnOneSection.svelte component L101 module src/lib/core/settings in1 t1
## imports
imp src/lib/core/settings/sections/OneOnOneSection.svelte:2 -> src/lib/components/ui/input/index.ts Input
imp src/lib/core/settings/sections/OneOnOneSection.svelte:3 -> src/lib/core/settings/settings.store.svelte.ts settingsStore
imp src/lib/core/settings/sections/OneOnOneSection.svelte:4 -> src/lib/core/settings/sections/SettingItem.svelte default
## imported-by
imp src/lib/app/SettingsPanel.svelte:6 -> src/lib/core/settings/sections/OneOnOneSection.svelte default
## reach
in2 src/lib/core/settings/sections/OneOnOneSection.svelte 1 files in 1 modules: src/lib/app(1)
out2 src/lib/core/settings/sections/OneOnOneSection.svelte 4 files in 2 modules: src/lib/core/settings(3) src/lib/components(1)
## tests
test src/tests/lib/core/settings/OneOnOneSection.test.ts imports src/lib/core/settings/sections/OneOnOneSection.svelte
## symbols
sym src/lib/core/settings/sections/OneOnOneSection.svelte:1 component OneOnOneSection L101
by src/lib/core/settings/sections/OneOnOneSection.svelte:default <- src/lib/app/SettingsPanel.svelte:77 in sectionComponents ref
## locals
local src/lib/core/settings/sections/OneOnOneSection.svelte:6 fn inputValue(e: Event): string L3
local src/lib/core/settings/sections/OneOnOneSection.svelte:11 fn updateDueAfterDays(e: Event) L6
## mounts
mount src/lib/core/settings/sections/OneOnOneSection.svelte:24 SettingItem -> src/lib/core/settings/sections/SettingItem.svelte
mount src/lib/core/settings/sections/OneOnOneSection.svelte:28 Input -> src/lib/components/ui/input/input.svelte
mount src/lib/core/settings/sections/OneOnOneSection.svelte:36 SettingItem -> src/lib/core/settings/sections/SettingItem.svelte
mount src/lib/core/settings/sections/OneOnOneSection.svelte:40 Input -> src/lib/components/ui/input/input.svelte
mount src/lib/core/settings/sections/OneOnOneSection.svelte:50 SettingItem -> src/lib/core/settings/sections/SettingItem.svelte
mount src/lib/core/settings/sections/OneOnOneSection.svelte:54 Input -> src/lib/components/ui/input/input.svelte
mount src/lib/core/settings/sections/OneOnOneSection.svelte:62 SettingItem -> src/lib/core/settings/sections/SettingItem.svelte
mount src/lib/core/settings/sections/OneOnOneSection.svelte:66 Input -> src/lib/components/ui/input/input.svelte
mount src/lib/core/settings/sections/OneOnOneSection.svelte:74 SettingItem -> src/lib/core/settings/sections/SettingItem.svelte
mount src/lib/core/settings/sections/OneOnOneSection.svelte:78 Input -> src/lib/components/ui/input/input.svelte
mount src/lib/core/settings/sections/OneOnOneSection.svelte:88 SettingItem -> src/lib/core/settings/sections/SettingItem.svelte
mount src/lib/core/settings/sections/OneOnOneSection.svelte:92 Input -> src/lib/components/ui/input/input.svelte
## calls
call src/lib/core/settings/sections/OneOnOneSection.svelte:12 in updateDueAfterDays -> src/lib/core/settings/sections/OneOnOneSection.svelte:inputValue call
call src/lib/core/settings/sections/OneOnOneSection.svelte:15 in updateDueAfterDays -> src/lib/core/settings/settings.store.svelte.ts:settingsStore.updateOneOnOne mcall
call src/lib/core/settings/sections/OneOnOneSection.svelte:31 in (markup) -> src/lib/core/settings/sections/OneOnOneSection.svelte:inputValue markup +4
call src/lib/core/settings/sections/OneOnOneSection.svelte:31 in (markup) -> src/lib/core/settings/settings.store.svelte.ts:settingsStore.updateOneOnOne markup +4
call src/lib/core/settings/sections/OneOnOneSection.svelte:97 in (markup) -> src/lib/core/settings/sections/OneOnOneSection.svelte:updateDueAfterDays markup
