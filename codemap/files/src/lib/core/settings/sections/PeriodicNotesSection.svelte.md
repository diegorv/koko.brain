# file card src/lib/core/settings/sections/PeriodicNotesSection.svelte
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/core/settings/sections/PeriodicNotesSection.svelte ' codemap/files
file src/lib/core/settings/sections/PeriodicNotesSection.svelte component L187 module src/lib/core/settings in1 t2
## imports
imp src/lib/core/settings/sections/PeriodicNotesSection.svelte:2 -> src/lib/components/ui/input/index.ts Input
imp src/lib/core/settings/sections/PeriodicNotesSection.svelte:3 -> src/lib/components/ui/switch/index.ts Switch
imp src/lib/core/settings/sections/PeriodicNotesSection.svelte:4 -> src/lib/core/filesystem/fs.store.svelte.ts fsStore
imp src/lib/core/settings/sections/PeriodicNotesSection.svelte:5 -> src/lib/core/vault/vault.store.svelte.ts vaultStore
imp src/lib/core/settings/sections/PeriodicNotesSection.svelte:6 -> src/lib/utils/date.ts formatNow
imp src/lib/core/settings/sections/PeriodicNotesSection.svelte:7 -> src/lib/core/settings/settings.logic.ts isTemplateMissing
imp src/lib/core/settings/sections/PeriodicNotesSection.svelte:8 -> src/lib/core/settings/settings.store.svelte.ts settingsStore
imp src/lib/core/settings/sections/PeriodicNotesSection.svelte:9 -> src/lib/core/settings/settings.types.ts type:PeriodType
imp src/lib/core/settings/sections/PeriodicNotesSection.svelte:10 -> src/lib/core/settings/sections/SettingItem.svelte default
## imported-by
imp src/lib/app/SettingsPanel.svelte:4 -> src/lib/core/settings/sections/PeriodicNotesSection.svelte default
## reach
in2 src/lib/core/settings/sections/PeriodicNotesSection.svelte 1 files in 1 modules: src/lib/app(1)
out2 src/lib/core/settings/sections/PeriodicNotesSection.svelte 8 files in 5 modules: src/lib/components(2) src/lib/core/filesystem(2) src/lib/core/settings(2) src/lib/core/vault(1) src/lib/utils(1)
## tests
test src/tests/lib/core/settings/PeriodicNotesSection.test.ts imports src/lib/core/settings/sections/PeriodicNotesSection.svelte
test src/tests/lib/core/settings/settings-copy.test.ts imports src/lib/core/settings/sections/PeriodicNotesSection.svelte
## symbols
sym src/lib/core/settings/sections/PeriodicNotesSection.svelte:1 component PeriodicNotesSection L187
by src/lib/core/settings/sections/PeriodicNotesSection.svelte:default <- src/lib/app/SettingsPanel.svelte:75 in sectionComponents ref
## locals
local src/lib/core/settings/sections/PeriodicNotesSection.svelte:12 fn inputValue(e: Event): string L3
local src/lib/core/settings/sections/PeriodicNotesSection.svelte:17 fn updatePeriod(period: PeriodType, field: string, value: string | boolean) L5
local src/lib/core/settings/sections/PeriodicNotesSection.svelte:28 fn todayPath(format: string): string L5
local src/lib/core/settings/sections/PeriodicNotesSection.svelte:34 fn isMissing(period: PeriodType): boolean L3
## mounts
mount src/lib/core/settings/sections/PeriodicNotesSection.svelte:54 SettingItem -> src/lib/core/settings/sections/SettingItem.svelte
mount src/lib/core/settings/sections/PeriodicNotesSection.svelte:58 Input -> src/lib/components/ui/input/input.svelte
mount src/lib/core/settings/sections/PeriodicNotesSection.svelte:69 SettingItem -> src/lib/core/settings/sections/SettingItem.svelte
mount src/lib/core/settings/sections/PeriodicNotesSection.svelte:70 Input -> src/lib/components/ui/input/input.svelte
mount src/lib/core/settings/sections/PeriodicNotesSection.svelte:78 SettingItem -> src/lib/core/settings/sections/SettingItem.svelte
mount src/lib/core/settings/sections/PeriodicNotesSection.svelte:79 Input -> src/lib/components/ui/input/input.svelte
mount src/lib/core/settings/sections/PeriodicNotesSection.svelte:87 SettingItem -> src/lib/core/settings/sections/SettingItem.svelte
mount src/lib/core/settings/sections/PeriodicNotesSection.svelte:88 Switch -> src/lib/components/ui/switch/switch.svelte
mount src/lib/core/settings/sections/PeriodicNotesSection.svelte:94 SettingItem -> src/lib/core/settings/sections/SettingItem.svelte
mount src/lib/core/settings/sections/PeriodicNotesSection.svelte:96 Switch -> src/lib/components/ui/switch/switch.svelte
mount src/lib/core/settings/sections/PeriodicNotesSection.svelte:107 SettingItem -> src/lib/core/settings/sections/SettingItem.svelte
mount src/lib/core/settings/sections/PeriodicNotesSection.svelte:108 Input -> src/lib/components/ui/input/input.svelte
mount src/lib/core/settings/sections/PeriodicNotesSection.svelte:116 SettingItem -> src/lib/core/settings/sections/SettingItem.svelte
mount src/lib/core/settings/sections/PeriodicNotesSection.svelte:117 Input -> src/lib/components/ui/input/input.svelte
mount src/lib/core/settings/sections/PeriodicNotesSection.svelte:128 SettingItem -> src/lib/core/settings/sections/SettingItem.svelte
mount src/lib/core/settings/sections/PeriodicNotesSection.svelte:129 Input -> src/lib/components/ui/input/input.svelte
mount src/lib/core/settings/sections/PeriodicNotesSection.svelte:137 SettingItem -> src/lib/core/settings/sections/SettingItem.svelte
mount src/lib/core/settings/sections/PeriodicNotesSection.svelte:138 Input -> src/lib/components/ui/input/input.svelte
mount src/lib/core/settings/sections/PeriodicNotesSection.svelte:149 SettingItem -> src/lib/core/settings/sections/SettingItem.svelte
mount src/lib/core/settings/sections/PeriodicNotesSection.svelte:150 Input -> src/lib/components/ui/input/input.svelte
mount src/lib/core/settings/sections/PeriodicNotesSection.svelte:158 SettingItem -> src/lib/core/settings/sections/SettingItem.svelte
mount src/lib/core/settings/sections/PeriodicNotesSection.svelte:159 Input -> src/lib/components/ui/input/input.svelte
mount src/lib/core/settings/sections/PeriodicNotesSection.svelte:170 SettingItem -> src/lib/core/settings/sections/SettingItem.svelte
mount src/lib/core/settings/sections/PeriodicNotesSection.svelte:171 Input -> src/lib/components/ui/input/input.svelte
mount src/lib/core/settings/sections/PeriodicNotesSection.svelte:179 SettingItem -> src/lib/core/settings/sections/SettingItem.svelte
mount src/lib/core/settings/sections/PeriodicNotesSection.svelte:180 Input -> src/lib/components/ui/input/input.svelte
## calls
call src/lib/core/settings/sections/PeriodicNotesSection.svelte:18 in updatePeriod -> src/lib/core/settings/settings.store.svelte.ts:settingsStore.updatePeriodicNotes mcall
call src/lib/core/settings/sections/PeriodicNotesSection.svelte:29 in todayPath -> src/lib/utils/date.ts:formatNow call
call src/lib/core/settings/sections/PeriodicNotesSection.svelte:35 in isMissing -> src/lib/core/settings/settings.logic.ts:isTemplateMissing call
call src/lib/core/settings/sections/PeriodicNotesSection.svelte:41 in (markup) -> src/lib/core/settings/sections/PeriodicNotesSection.svelte:todayPath markup
call src/lib/core/settings/sections/PeriodicNotesSection.svelte:46 in (markup) -> src/lib/core/settings/sections/PeriodicNotesSection.svelte:isMissing markup +5
call src/lib/core/settings/sections/PeriodicNotesSection.svelte:61 in (markup) -> src/lib/core/settings/sections/PeriodicNotesSection.svelte:inputValue markup +10
call src/lib/core/settings/sections/PeriodicNotesSection.svelte:61 in (markup) -> src/lib/core/settings/settings.store.svelte.ts:settingsStore.updatePeriodicNotes markup
call src/lib/core/settings/sections/PeriodicNotesSection.svelte:73 in (markup) -> src/lib/core/settings/sections/PeriodicNotesSection.svelte:updatePeriod markup +11
