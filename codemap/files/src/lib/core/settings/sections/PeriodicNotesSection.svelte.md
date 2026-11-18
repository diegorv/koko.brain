# file card src/lib/core/settings/sections/PeriodicNotesSection.svelte
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/core/settings/sections/PeriodicNotesSection.svelte ' codemap/files
file src/lib/core/settings/sections/PeriodicNotesSection.svelte component L135 module src/lib/core/settings in1 t2
## imports
imp src/lib/core/settings/sections/PeriodicNotesSection.svelte:2 -> src/lib/components/ui/input/index.ts Input
imp src/lib/core/settings/sections/PeriodicNotesSection.svelte:3 -> src/lib/components/ui/switch/index.ts Switch
imp src/lib/core/settings/sections/PeriodicNotesSection.svelte:4 -> src/lib/core/settings/settings.store.svelte.ts settingsStore
imp src/lib/core/settings/sections/PeriodicNotesSection.svelte:5 -> src/lib/core/settings/sections/SettingItem.svelte default
## imported-by
imp src/lib/app/SettingsPanel.svelte:4 -> src/lib/core/settings/sections/PeriodicNotesSection.svelte default
## reach
in2 src/lib/core/settings/sections/PeriodicNotesSection.svelte 1 files in 1 modules: src/lib/app(1)
out2 src/lib/core/settings/sections/PeriodicNotesSection.svelte 5 files in 2 modules: src/lib/core/settings(3) src/lib/components(2)
## tests
test src/tests/lib/core/settings/PeriodicNotesSection.test.ts imports src/lib/core/settings/sections/PeriodicNotesSection.svelte
test src/tests/lib/core/settings/settings-copy.test.ts imports src/lib/core/settings/sections/PeriodicNotesSection.svelte
## symbols
sym src/lib/core/settings/sections/PeriodicNotesSection.svelte:1 component PeriodicNotesSection L135
by src/lib/core/settings/sections/PeriodicNotesSection.svelte:default <- src/lib/app/SettingsPanel.svelte:75 in sectionComponents ref
## locals
local src/lib/core/settings/sections/PeriodicNotesSection.svelte:7 fn inputValue(e: Event): string L3
local src/lib/core/settings/sections/PeriodicNotesSection.svelte:12 fn updatePeriod(period: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly', field: string, value: string | boolean) L5
## mounts
mount src/lib/core/settings/sections/PeriodicNotesSection.svelte:22 SettingItem -> src/lib/core/settings/sections/SettingItem.svelte
mount src/lib/core/settings/sections/PeriodicNotesSection.svelte:26 Input -> src/lib/components/ui/input/input.svelte
mount src/lib/core/settings/sections/PeriodicNotesSection.svelte:37 SettingItem -> src/lib/core/settings/sections/SettingItem.svelte
mount src/lib/core/settings/sections/PeriodicNotesSection.svelte:38 Input -> src/lib/components/ui/input/input.svelte
mount src/lib/core/settings/sections/PeriodicNotesSection.svelte:44 SettingItem -> src/lib/core/settings/sections/SettingItem.svelte
mount src/lib/core/settings/sections/PeriodicNotesSection.svelte:45 Input -> src/lib/components/ui/input/input.svelte
mount src/lib/core/settings/sections/PeriodicNotesSection.svelte:51 SettingItem -> src/lib/core/settings/sections/SettingItem.svelte
mount src/lib/core/settings/sections/PeriodicNotesSection.svelte:52 Switch -> src/lib/components/ui/switch/switch.svelte
mount src/lib/core/settings/sections/PeriodicNotesSection.svelte:58 SettingItem -> src/lib/core/settings/sections/SettingItem.svelte
mount src/lib/core/settings/sections/PeriodicNotesSection.svelte:60 Switch -> src/lib/components/ui/switch/switch.svelte
mount src/lib/core/settings/sections/PeriodicNotesSection.svelte:71 SettingItem -> src/lib/core/settings/sections/SettingItem.svelte
mount src/lib/core/settings/sections/PeriodicNotesSection.svelte:72 Input -> src/lib/components/ui/input/input.svelte
mount src/lib/core/settings/sections/PeriodicNotesSection.svelte:78 SettingItem -> src/lib/core/settings/sections/SettingItem.svelte
mount src/lib/core/settings/sections/PeriodicNotesSection.svelte:79 Input -> src/lib/components/ui/input/input.svelte
mount src/lib/core/settings/sections/PeriodicNotesSection.svelte:88 SettingItem -> src/lib/core/settings/sections/SettingItem.svelte
mount src/lib/core/settings/sections/PeriodicNotesSection.svelte:89 Input -> src/lib/components/ui/input/input.svelte
mount src/lib/core/settings/sections/PeriodicNotesSection.svelte:95 SettingItem -> src/lib/core/settings/sections/SettingItem.svelte
mount src/lib/core/settings/sections/PeriodicNotesSection.svelte:96 Input -> src/lib/components/ui/input/input.svelte
mount src/lib/core/settings/sections/PeriodicNotesSection.svelte:105 SettingItem -> src/lib/core/settings/sections/SettingItem.svelte
mount src/lib/core/settings/sections/PeriodicNotesSection.svelte:106 Input -> src/lib/components/ui/input/input.svelte
mount src/lib/core/settings/sections/PeriodicNotesSection.svelte:112 SettingItem -> src/lib/core/settings/sections/SettingItem.svelte
mount src/lib/core/settings/sections/PeriodicNotesSection.svelte:113 Input -> src/lib/components/ui/input/input.svelte
mount src/lib/core/settings/sections/PeriodicNotesSection.svelte:122 SettingItem -> src/lib/core/settings/sections/SettingItem.svelte
mount src/lib/core/settings/sections/PeriodicNotesSection.svelte:123 Input -> src/lib/components/ui/input/input.svelte
mount src/lib/core/settings/sections/PeriodicNotesSection.svelte:129 SettingItem -> src/lib/core/settings/sections/SettingItem.svelte
mount src/lib/core/settings/sections/PeriodicNotesSection.svelte:130 Input -> src/lib/components/ui/input/input.svelte
## calls
call src/lib/core/settings/sections/PeriodicNotesSection.svelte:13 in updatePeriod -> src/lib/core/settings/settings.store.svelte.ts:settingsStore.updatePeriodicNotes mcall
call src/lib/core/settings/sections/PeriodicNotesSection.svelte:29 in (markup) -> src/lib/core/settings/sections/PeriodicNotesSection.svelte:inputValue markup +10
call src/lib/core/settings/sections/PeriodicNotesSection.svelte:29 in (markup) -> src/lib/core/settings/settings.store.svelte.ts:settingsStore.updatePeriodicNotes markup
call src/lib/core/settings/sections/PeriodicNotesSection.svelte:40 in (markup) -> src/lib/core/settings/sections/PeriodicNotesSection.svelte:updatePeriod markup +11
