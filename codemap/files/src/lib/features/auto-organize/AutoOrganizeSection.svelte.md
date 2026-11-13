# file card src/lib/features/auto-organize/AutoOrganizeSection.svelte
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/features/auto-organize/AutoOrganizeSection.svelte ' codemap/files
file src/lib/features/auto-organize/AutoOrganizeSection.svelte component L218 module src/lib/features/auto-organize in1 t1
## imports
imp src/lib/features/auto-organize/AutoOrganizeSection.svelte:3 -> src/lib/components/ui/switch/index.ts Switch
imp src/lib/features/auto-organize/AutoOrganizeSection.svelte:4 -> src/lib/components/ui/input/index.ts Input
imp src/lib/features/auto-organize/AutoOrganizeSection.svelte:5 -> src/lib/components/ui/button/index.ts Button
imp src/lib/features/auto-organize/AutoOrganizeSection.svelte:8 -> src/lib/core/settings/settings.store.svelte.ts settingsStore
imp src/lib/features/auto-organize/AutoOrganizeSection.svelte:9 -> src/lib/core/vault/vault.store.svelte.ts vaultStore
imp src/lib/features/auto-organize/AutoOrganizeSection.svelte:10 -> src/lib/core/settings/sections/SettingItem.svelte default
imp src/lib/features/auto-organize/AutoOrganizeSection.svelte:11 -> src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte default
imp src/lib/features/auto-organize/AutoOrganizeSection.svelte:12 -> src/lib/features/auto-organize/auto-organize.store.svelte.ts autoOrganizeStore
imp src/lib/features/auto-organize/AutoOrganizeSection.svelte:13 -> src/lib/features/auto-organize/auto-organize.service.ts saveAutoOrganizeConfig,toggleAutoOrganizeHook
imp src/lib/features/auto-organize/AutoOrganizeSection.svelte:14 -> src/lib/features/auto-organize/auto-organize.logic.ts generateRuleId
imp src/lib/features/auto-organize/AutoOrganizeSection.svelte:15 -> src/lib/features/auto-organize/auto-organize.types.ts type:AutoOrganizeRule
imp src/lib/features/auto-organize/AutoOrganizeSection.svelte:16 -> src/lib/utils/debug.ts error
imp src/lib/features/auto-organize/AutoOrganizeSection.svelte:17 -> src/lib/utils/clamp.ts clamp
## imported-by
imp src/lib/app/SettingsPanel.svelte:11 -> src/lib/features/auto-organize/AutoOrganizeSection.svelte default
## reach
in2 src/lib/features/auto-organize/AutoOrganizeSection.svelte 1 files in 1 modules: src/lib/app(1)
out2 src/lib/features/auto-organize/AutoOrganizeSection.svelte 42 files in 14 modules: src/lib/features/collection(9) src/lib/features/file-icons(6) src/lib/components(4) src/lib/core/settings(4) src/lib/core/editor(3) +9 modules
## tests
test src/tests/lib/features/auto-organize/AutoOrganizeSection.test.ts imports src/lib/features/auto-organize/AutoOrganizeSection.svelte mirror
## symbols
sym src/lib/features/auto-organize/AutoOrganizeSection.svelte:1 component AutoOrganizeSection L218
by src/lib/features/auto-organize/AutoOrganizeSection.svelte:default <- src/lib/app/SettingsPanel.svelte:81 in sectionComponents ref
## locals
local src/lib/features/auto-organize/AutoOrganizeSection.svelte:29 fn clampDebounce(value: number): number L3
local src/lib/features/auto-organize/AutoOrganizeSection.svelte:33 fn saveConfig() L7
local src/lib/features/auto-organize/AutoOrganizeSection.svelte:42 fn saveConfigDebounced() L6
local src/lib/features/auto-organize/AutoOrganizeSection.svelte:49 fn addRule() L12
local src/lib/features/auto-organize/AutoOrganizeSection.svelte:62 fn updateRule(id: string, updates: Partial<AutoOrganizeRule>) L4
local src/lib/features/auto-organize/AutoOrganizeSection.svelte:67 fn removeRule(id: string) L4
local src/lib/features/auto-organize/AutoOrganizeSection.svelte:72 fn moveRuleUp(id: string) L8
local src/lib/features/auto-organize/AutoOrganizeSection.svelte:81 fn moveRuleDown(id: string) L8
local src/lib/features/auto-organize/AutoOrganizeSection.svelte:90 fn addExcludedFolder() L8
local src/lib/features/auto-organize/AutoOrganizeSection.svelte:99 fn removeExcludedFolder(folder: string) L6
## mounts
mount src/lib/features/auto-organize/AutoOrganizeSection.svelte:110 SettingItem -> src/lib/core/settings/sections/SettingItem.svelte
mount src/lib/features/auto-organize/AutoOrganizeSection.svelte:114 Switch -> src/lib/components/ui/switch/switch.svelte
mount src/lib/features/auto-organize/AutoOrganizeSection.svelte:123 SettingItem -> src/lib/core/settings/sections/SettingItem.svelte
mount src/lib/features/auto-organize/AutoOrganizeSection.svelte:127 Input -> src/lib/components/ui/input/input.svelte
mount src/lib/features/auto-organize/AutoOrganizeSection.svelte:145 Button -> src/lib/components/ui/button/button.svelte
mount src/lib/features/auto-organize/AutoOrganizeSection.svelte:163 AutoOrganizeRuleRow -> src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte
mount src/lib/features/auto-organize/AutoOrganizeSection.svelte:184 Input -> src/lib/components/ui/input/input.svelte
mount src/lib/features/auto-organize/AutoOrganizeSection.svelte:192 Button -> src/lib/components/ui/button/button.svelte
## calls
call src/lib/features/auto-organize/AutoOrganizeSection.svelte:30 in clampDebounce -> src/lib/utils/clamp.ts:clamp call
call src/lib/features/auto-organize/AutoOrganizeSection.svelte:35 in saveConfig -> src/lib/features/auto-organize/auto-organize.service.ts:saveAutoOrganizeConfig call
call src/lib/features/auto-organize/AutoOrganizeSection.svelte:36 in saveConfig -> src/lib/utils/debug.ts:error call
call src/lib/features/auto-organize/AutoOrganizeSection.svelte:45 in saveConfigDebounced -> src/lib/features/auto-organize/AutoOrganizeSection.svelte:saveConfig call
call src/lib/features/auto-organize/AutoOrganizeSection.svelte:51 in addRule -> src/lib/features/auto-organize/auto-organize.logic.ts:generateRuleId call
call src/lib/features/auto-organize/AutoOrganizeSection.svelte:58 in addRule -> src/lib/features/auto-organize/auto-organize.store.svelte.ts:autoOrganizeStore.addRule mcall
call src/lib/features/auto-organize/AutoOrganizeSection.svelte:59 in addRule -> src/lib/features/auto-organize/AutoOrganizeSection.svelte:saveConfig call
call src/lib/features/auto-organize/AutoOrganizeSection.svelte:63 in updateRule -> src/lib/features/auto-organize/auto-organize.store.svelte.ts:autoOrganizeStore.updateRule mcall
call src/lib/features/auto-organize/AutoOrganizeSection.svelte:64 in updateRule -> src/lib/features/auto-organize/AutoOrganizeSection.svelte:saveConfigDebounced call
call src/lib/features/auto-organize/AutoOrganizeSection.svelte:68 in removeRule -> src/lib/features/auto-organize/auto-organize.store.svelte.ts:autoOrganizeStore.removeRule mcall
call src/lib/features/auto-organize/AutoOrganizeSection.svelte:69 in removeRule -> src/lib/features/auto-organize/AutoOrganizeSection.svelte:saveConfig call
call src/lib/features/auto-organize/AutoOrganizeSection.svelte:77 in moveRuleUp -> src/lib/features/auto-organize/auto-organize.store.svelte.ts:autoOrganizeStore.reorderRules mcall
call src/lib/features/auto-organize/AutoOrganizeSection.svelte:78 in moveRuleUp -> src/lib/features/auto-organize/AutoOrganizeSection.svelte:saveConfig call
call src/lib/features/auto-organize/AutoOrganizeSection.svelte:86 in moveRuleDown -> src/lib/features/auto-organize/auto-organize.store.svelte.ts:autoOrganizeStore.reorderRules mcall
call src/lib/features/auto-organize/AutoOrganizeSection.svelte:87 in moveRuleDown -> src/lib/features/auto-organize/AutoOrganizeSection.svelte:saveConfig call
call src/lib/features/auto-organize/AutoOrganizeSection.svelte:94 in addExcludedFolder -> src/lib/features/auto-organize/auto-organize.store.svelte.ts:autoOrganizeStore.setExcludedFolders mcall
call src/lib/features/auto-organize/AutoOrganizeSection.svelte:96 in addExcludedFolder -> src/lib/features/auto-organize/AutoOrganizeSection.svelte:saveConfig call
call src/lib/features/auto-organize/AutoOrganizeSection.svelte:100 in removeExcludedFolder -> src/lib/features/auto-organize/auto-organize.store.svelte.ts:autoOrganizeStore.setExcludedFolders mcall
call src/lib/features/auto-organize/AutoOrganizeSection.svelte:103 in removeExcludedFolder -> src/lib/features/auto-organize/AutoOrganizeSection.svelte:saveConfig call
call src/lib/features/auto-organize/AutoOrganizeSection.svelte:117 in (markup) -> src/lib/core/settings/settings.store.svelte.ts:settingsStore.updateAutoOrganize markup +1
call src/lib/features/auto-organize/AutoOrganizeSection.svelte:118 in (markup) -> src/lib/features/auto-organize/auto-organize.service.ts:toggleAutoOrganizeHook markup
call src/lib/features/auto-organize/AutoOrganizeSection.svelte:136 in (markup) -> src/lib/features/auto-organize/AutoOrganizeSection.svelte:clampDebounce markup
call src/lib/features/auto-organize/AutoOrganizeSection.svelte:145 in (markup) -> src/lib/features/auto-organize/AutoOrganizeSection.svelte:addRule markup
call src/lib/features/auto-organize/AutoOrganizeSection.svelte:167 in (markup) -> src/lib/features/auto-organize/AutoOrganizeSection.svelte:updateRule markup
call src/lib/features/auto-organize/AutoOrganizeSection.svelte:168 in (markup) -> src/lib/features/auto-organize/AutoOrganizeSection.svelte:removeRule markup
call src/lib/features/auto-organize/AutoOrganizeSection.svelte:169 in (markup) -> src/lib/features/auto-organize/AutoOrganizeSection.svelte:moveRuleUp markup
call src/lib/features/auto-organize/AutoOrganizeSection.svelte:170 in (markup) -> src/lib/features/auto-organize/AutoOrganizeSection.svelte:moveRuleDown markup
call src/lib/features/auto-organize/AutoOrganizeSection.svelte:189 in (markup) -> src/lib/features/auto-organize/AutoOrganizeSection.svelte:addExcludedFolder markup +1
call src/lib/features/auto-organize/AutoOrganizeSection.svelte:209 in (markup) -> src/lib/features/auto-organize/AutoOrganizeSection.svelte:removeExcludedFolder markup
## effects
fx src/lib/features/auto-organize/AutoOrganizeSection.svelte:44 timer.setTimeout delay=500 in saveConfigDebounced
