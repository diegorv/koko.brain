# file card src/lib/core/settings/sections/FilesSection.svelte
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/core/settings/sections/FilesSection.svelte ' codemap/files
file src/lib/core/settings/sections/FilesSection.svelte component L46 module src/lib/core/settings in1 t2
## imports
imp src/lib/core/settings/sections/FilesSection.svelte:2 -> src/lib/components/ui/input/index.ts Input
imp src/lib/core/settings/sections/FilesSection.svelte:3 -> src/lib/components/ui/switch/index.ts Switch
imp src/lib/core/settings/sections/FilesSection.svelte:4 -> src/lib/core/settings/settings.store.svelte.ts settingsStore
imp src/lib/core/settings/sections/FilesSection.svelte:5 -> src/lib/core/settings/sections/SettingItem.svelte default
## imported-by
imp src/lib/app/SettingsPanel.svelte:7 -> src/lib/core/settings/sections/FilesSection.svelte default
## reach
in2 src/lib/core/settings/sections/FilesSection.svelte 1 files in 1 modules: src/lib/app(1)
out2 src/lib/core/settings/sections/FilesSection.svelte 5 files in 2 modules: src/lib/core/settings(3) src/lib/components(2)
## tests
test src/tests/lib/core/settings/FilesSection.test.ts imports src/lib/core/settings/sections/FilesSection.svelte
test src/tests/lib/core/settings/settings-copy.test.ts imports src/lib/core/settings/sections/FilesSection.svelte
## symbols
sym src/lib/core/settings/sections/FilesSection.svelte:1 component FilesSection L46
by src/lib/core/settings/sections/FilesSection.svelte:default <- src/lib/app/SettingsPanel.svelte:78 in sectionComponents ref
## mounts
mount src/lib/core/settings/sections/FilesSection.svelte:11 SettingItem -> src/lib/core/settings/sections/SettingItem.svelte
mount src/lib/core/settings/sections/FilesSection.svelte:15 Input -> src/lib/components/ui/input/input.svelte
mount src/lib/core/settings/sections/FilesSection.svelte:23 SettingItem -> src/lib/core/settings/sections/SettingItem.svelte
mount src/lib/core/settings/sections/FilesSection.svelte:27 Input -> src/lib/components/ui/input/input.svelte
mount src/lib/core/settings/sections/FilesSection.svelte:35 SettingItem -> src/lib/core/settings/sections/SettingItem.svelte
mount src/lib/core/settings/sections/FilesSection.svelte:39 Switch -> src/lib/components/ui/switch/switch.svelte
## calls
call src/lib/core/settings/sections/FilesSection.svelte:18 in (markup) -> src/lib/core/settings/settings.store.svelte.ts:settingsStore.updateTemplates markup +1
call src/lib/core/settings/sections/FilesSection.svelte:42 in (markup) -> src/lib/core/settings/settings.store.svelte.ts:settingsStore.updateFolderNotes markup
