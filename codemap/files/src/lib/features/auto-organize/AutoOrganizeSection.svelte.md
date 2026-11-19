# file card src/lib/features/auto-organize/AutoOrganizeSection.svelte
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/features/auto-organize/AutoOrganizeSection.svelte ' codemap/files
file src/lib/features/auto-organize/AutoOrganizeSection.svelte component L285 module src/lib/features/auto-organize in1 t1
## imports
imp src/lib/features/auto-organize/AutoOrganizeSection.svelte:4 -> src/lib/components/ui/switch/index.ts Switch
imp src/lib/features/auto-organize/AutoOrganizeSection.svelte:5 -> src/lib/components/ui/input/index.ts Input
imp src/lib/features/auto-organize/AutoOrganizeSection.svelte:6 -> src/lib/components/ui/button/index.ts Button
imp src/lib/features/auto-organize/AutoOrganizeSection.svelte:9 -> src/lib/core/settings/settings.store.svelte.ts settingsStore
imp src/lib/features/auto-organize/AutoOrganizeSection.svelte:10 -> src/lib/core/vault/vault.store.svelte.ts vaultStore
imp src/lib/features/auto-organize/AutoOrganizeSection.svelte:11 -> src/lib/core/filesystem/fs.store.svelte.ts fsStore
imp src/lib/features/auto-organize/AutoOrganizeSection.svelte:12 -> src/lib/core/filesystem/fs.logic.ts collectAllDirPaths,getRelativePath
imp src/lib/features/auto-organize/AutoOrganizeSection.svelte:13 -> src/lib/core/settings/sections/SettingItem.svelte default
imp src/lib/features/auto-organize/AutoOrganizeSection.svelte:14 -> src/lib/features/type-definitions/type-definitions.store.svelte.ts typeDefinitionsStore
imp src/lib/features/auto-organize/AutoOrganizeSection.svelte:15 -> src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte default
imp src/lib/features/auto-organize/AutoOrganizeSection.svelte:16 -> src/lib/features/auto-organize/auto-organize.store.svelte.ts autoOrganizeStore
imp src/lib/features/auto-organize/AutoOrganizeSection.svelte:17 -> src/lib/features/auto-organize/auto-organize.service.ts saveAutoOrganizeConfig,toggleAutoOrganizeHook
imp src/lib/features/auto-organize/AutoOrganizeSection.svelte:18 -> src/lib/features/auto-organize/auto-organize.logic.ts generateRuleId,isDuplicateExcluded,isExcludedFolderMissing
imp src/lib/features/auto-organize/AutoOrganizeSection.svelte:19 -> src/lib/features/auto-organize/auto-organize.types.ts type:AutoOrganizeRule
imp src/lib/features/auto-organize/AutoOrganizeSection.svelte:20 -> src/lib/utils/debug.ts error
imp src/lib/features/auto-organize/AutoOrganizeSection.svelte:21 -> src/lib/utils/clamp.ts clamp
## imported-by
imp src/lib/app/SettingsPanel.svelte:11 -> src/lib/features/auto-organize/AutoOrganizeSection.svelte default
## reach
in2 src/lib/features/auto-organize/AutoOrganizeSection.svelte 1 files in 1 modules: src/lib/app(1)
out2 src/lib/features/auto-organize/AutoOrganizeSection.svelte 45 files in 15 modules: src/lib/features/collection(9) src/lib/features/file-icons(6) src/lib/components(5) src/lib/core/settings(4) src/lib/core/editor(3) +10 modules
## tests
test src/tests/lib/features/auto-organize/AutoOrganizeSection.test.ts imports src/lib/features/auto-organize/AutoOrganizeSection.svelte mirror
## symbols
sym src/lib/features/auto-organize/AutoOrganizeSection.svelte:1 component AutoOrganizeSection L285
by src/lib/features/auto-organize/AutoOrganizeSection.svelte:default <- src/lib/app/SettingsPanel.svelte:81 in sectionComponents ref
## locals
local src/lib/features/auto-organize/AutoOrganizeSection.svelte:51 fn clampDebounce(value: number): number L3
local src/lib/features/auto-organize/AutoOrganizeSection.svelte:55 fn saveConfig() L9
local src/lib/features/auto-organize/AutoOrganizeSection.svelte:66 fn saveConfigDebounced() L6
local src/lib/features/auto-organize/AutoOrganizeSection.svelte:73 fn addRule() L13
local src/lib/features/auto-organize/AutoOrganizeSection.svelte:87 fn updateRule(id: string, updates: Partial<AutoOrganizeRule>) L4
local src/lib/features/auto-organize/AutoOrganizeSection.svelte:92 fn removeRule(id: string) L4
local src/lib/features/auto-organize/AutoOrganizeSection.svelte:97 fn moveRuleUp(id: string) L8
local src/lib/features/auto-organize/AutoOrganizeSection.svelte:106 fn moveRuleDown(id: string) L8
local src/lib/features/auto-organize/AutoOrganizeSection.svelte:115 fn addExcludedFolder() L12
local src/lib/features/auto-organize/AutoOrganizeSection.svelte:128 fn removeExcludedFolder(folder: string) L6
## mounts
mount src/lib/features/auto-organize/AutoOrganizeSection.svelte:139 SettingItem -> src/lib/core/settings/sections/SettingItem.svelte
mount src/lib/features/auto-organize/AutoOrganizeSection.svelte:143 Switch -> src/lib/components/ui/switch/switch.svelte
mount src/lib/features/auto-organize/AutoOrganizeSection.svelte:159 SettingItem -> src/lib/core/settings/sections/SettingItem.svelte
mount src/lib/features/auto-organize/AutoOrganizeSection.svelte:163 Input -> src/lib/components/ui/input/input.svelte
mount src/lib/features/auto-organize/AutoOrganizeSection.svelte:195 Button -> src/lib/components/ui/button/button.svelte
mount src/lib/features/auto-organize/AutoOrganizeSection.svelte:214 AutoOrganizeRuleRow -> src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte
mount src/lib/features/auto-organize/AutoOrganizeSection.svelte:236 Input -> src/lib/components/ui/input/input.svelte
mount src/lib/features/auto-organize/AutoOrganizeSection.svelte:247 Button -> src/lib/components/ui/button/button.svelte
## calls
call src/lib/features/auto-organize/AutoOrganizeSection.svelte:38 in vaultFolders=$derived -> src/lib/core/filesystem/fs.logic.ts:collectAllDirPaths call
call src/lib/features/auto-organize/AutoOrganizeSection.svelte:38 in vaultFolders=$derived -> src/lib/core/filesystem/fs.logic.ts:getRelativePath call
call src/lib/features/auto-organize/AutoOrganizeSection.svelte:52 in clampDebounce -> src/lib/utils/clamp.ts:clamp call
call src/lib/features/auto-organize/AutoOrganizeSection.svelte:57 in saveConfig -> src/lib/features/auto-organize/auto-organize.service.ts:saveAutoOrganizeConfig call
call src/lib/features/auto-organize/AutoOrganizeSection.svelte:58 in saveConfig -> src/lib/utils/debug.ts:error call
call src/lib/features/auto-organize/AutoOrganizeSection.svelte:69 in saveConfigDebounced -> src/lib/features/auto-organize/AutoOrganizeSection.svelte:saveConfig call
call src/lib/features/auto-organize/AutoOrganizeSection.svelte:75 in addRule -> src/lib/features/auto-organize/auto-organize.logic.ts:generateRuleId call
call src/lib/features/auto-organize/AutoOrganizeSection.svelte:83 in addRule -> src/lib/features/auto-organize/auto-organize.store.svelte.ts:autoOrganizeStore.addRule mcall
call src/lib/features/auto-organize/AutoOrganizeSection.svelte:84 in addRule -> src/lib/features/auto-organize/AutoOrganizeSection.svelte:saveConfig call
call src/lib/features/auto-organize/AutoOrganizeSection.svelte:88 in updateRule -> src/lib/features/auto-organize/auto-organize.store.svelte.ts:autoOrganizeStore.updateRule mcall
call src/lib/features/auto-organize/AutoOrganizeSection.svelte:89 in updateRule -> src/lib/features/auto-organize/AutoOrganizeSection.svelte:saveConfigDebounced call
call src/lib/features/auto-organize/AutoOrganizeSection.svelte:93 in removeRule -> src/lib/features/auto-organize/auto-organize.store.svelte.ts:autoOrganizeStore.removeRule mcall
call src/lib/features/auto-organize/AutoOrganizeSection.svelte:94 in removeRule -> src/lib/features/auto-organize/AutoOrganizeSection.svelte:saveConfig call
call src/lib/features/auto-organize/AutoOrganizeSection.svelte:102 in moveRuleUp -> src/lib/features/auto-organize/auto-organize.store.svelte.ts:autoOrganizeStore.reorderRules mcall
call src/lib/features/auto-organize/AutoOrganizeSection.svelte:103 in moveRuleUp -> src/lib/features/auto-organize/AutoOrganizeSection.svelte:saveConfig call
call src/lib/features/auto-organize/AutoOrganizeSection.svelte:111 in moveRuleDown -> src/lib/features/auto-organize/auto-organize.store.svelte.ts:autoOrganizeStore.reorderRules mcall
call src/lib/features/auto-organize/AutoOrganizeSection.svelte:112 in moveRuleDown -> src/lib/features/auto-organize/AutoOrganizeSection.svelte:saveConfig call
call src/lib/features/auto-organize/AutoOrganizeSection.svelte:118 in addExcludedFolder -> src/lib/features/auto-organize/auto-organize.logic.ts:isDuplicateExcluded call
call src/lib/features/auto-organize/AutoOrganizeSection.svelte:122 in addExcludedFolder -> src/lib/features/auto-organize/auto-organize.store.svelte.ts:autoOrganizeStore.setExcludedFolders mcall
call src/lib/features/auto-organize/AutoOrganizeSection.svelte:125 in addExcludedFolder -> src/lib/features/auto-organize/AutoOrganizeSection.svelte:saveConfig call
call src/lib/features/auto-organize/AutoOrganizeSection.svelte:129 in removeExcludedFolder -> src/lib/features/auto-organize/auto-organize.store.svelte.ts:autoOrganizeStore.setExcludedFolders mcall
call src/lib/features/auto-organize/AutoOrganizeSection.svelte:132 in removeExcludedFolder -> src/lib/features/auto-organize/AutoOrganizeSection.svelte:saveConfig call
call src/lib/features/auto-organize/AutoOrganizeSection.svelte:147 in (markup) -> src/lib/core/settings/settings.store.svelte.ts:settingsStore.updateAutoOrganize markup +2
call src/lib/features/auto-organize/AutoOrganizeSection.svelte:148 in (markup) -> src/lib/features/auto-organize/auto-organize.service.ts:toggleAutoOrganizeHook markup
call src/lib/features/auto-organize/AutoOrganizeSection.svelte:176 in (markup) -> src/lib/features/auto-organize/AutoOrganizeSection.svelte:clampDebounce markup +1
call src/lib/features/auto-organize/AutoOrganizeSection.svelte:195 in (markup) -> src/lib/features/auto-organize/AutoOrganizeSection.svelte:addRule markup
call src/lib/features/auto-organize/AutoOrganizeSection.svelte:219 in (markup) -> src/lib/features/auto-organize/AutoOrganizeSection.svelte:updateRule markup
call src/lib/features/auto-organize/AutoOrganizeSection.svelte:220 in (markup) -> src/lib/features/auto-organize/AutoOrganizeSection.svelte:removeRule markup
call src/lib/features/auto-organize/AutoOrganizeSection.svelte:221 in (markup) -> src/lib/features/auto-organize/AutoOrganizeSection.svelte:moveRuleUp markup
call src/lib/features/auto-organize/AutoOrganizeSection.svelte:222 in (markup) -> src/lib/features/auto-organize/AutoOrganizeSection.svelte:moveRuleDown markup
call src/lib/features/auto-organize/AutoOrganizeSection.svelte:244 in (markup) -> src/lib/features/auto-organize/AutoOrganizeSection.svelte:addExcludedFolder markup +1
call src/lib/features/auto-organize/AutoOrganizeSection.svelte:268 in (markup) -> src/lib/features/auto-organize/auto-organize.logic.ts:isExcludedFolderMissing markup
call src/lib/features/auto-organize/AutoOrganizeSection.svelte:274 in (markup) -> src/lib/features/auto-organize/AutoOrganizeSection.svelte:removeExcludedFolder markup
## effects
fx src/lib/features/auto-organize/AutoOrganizeSection.svelte:68 timer.setTimeout delay=500 in saveConfigDebounced
