# file card src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte ' codemap/files
sections: imports, imported-by, reach, tests, symbols, locals, mounts, mounted-at, calls, effects
file src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte component L549 module src/lib/features/auto-organize in1 t1
## imports
imp src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:3 -> src/lib/components/ui/input/index.ts Input
imp src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:4 -> src/lib/components/ui/switch/index.ts Switch
imp src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:5 -> src/lib/components/ui/button/index.ts Button
imp src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:6 -> src/lib/components/ui/select/index.ts *
imp src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:12 -> src/lib/features/file-icons/IconPicker.svelte default
imp src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:13 -> src/lib/features/file-icons/IconRenderer.svelte default
imp src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:14 -> src/lib/features/file-icons/file-icons.icon-data.ts getIconSync
imp src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:15 -> src/lib/features/file-icons/file-icons.store.svelte.ts fileIconsStore
imp src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:16 -> src/lib/features/collection/collection.store.svelte.ts collectionStore
imp src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:17 -> src/lib/features/collection/toolbar/filter.logic.ts createEmptyExpressionRow,filterGroupsToFilter,getAllKnownProperties,parseFilterToGroups
imp src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:23 -> src/lib/features/collection/toolbar/FilterPanel.svelte default
imp src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:24 -> src/lib/features/collection/collection.types.ts type:FilterItem
imp src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:25 -> src/lib/features/collection/toolbar/toolbar.types.ts type:FilterGroup
imp src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:26 -> src/lib/core/vault/vault.store.svelte.ts vaultStore
imp src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:27 -> src/lib/core/settings/settings.store.svelte.ts settingsStore
imp src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:28 -> src/lib/core/rule-actions/rule-actions.store.svelte.ts ruleActionsStore
imp src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:29 -> src/lib/features/auto-organize/auto-organize.types.ts type:AutoOrganizeRule,type:RuleCreateNote,type:RuleProperty,type:RuleRename
imp src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:30 -> src/lib/features/file-icons/file-icons.types.ts type:IconPackId
imp src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:31 -> src/lib/features/auto-organize/auto-organize.logic.ts BLANK_VALUE_ERROR,countMatchingNotes,countNotesToCreate,hasBlankValue,isRefusedKey,isValidCreatePath,isValidTemplatePath,renameProblem,sanitizeCreateNote,sanitizeRename,sanitizeRuleProperties,sanitizeRunAction
imp src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:45 -> src/lib/features/auto-organize/auto-organize.store.svelte.ts autoOrganizeStore
imp src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:46 -> src/lib/features/auto-organize/AutoOrganizeRuleProperty.svelte default
## imported-by
imp src/lib/features/auto-organize/AutoOrganizeSection.svelte:11 -> src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte default
## reach
in2 src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte 1 files in 1 modules: src/lib/app(1)
out2 src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte 36 files in 9 modules: src/lib/components(19) src/lib/features/collection(6) src/lib/core/settings(3) src/lib/core/frontmatter(2) src/lib/utils(2) +4 modules
## tests
test src/tests/lib/features/auto-organize/AutoOrganizeRuleRow.test.ts imports src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte mirror
## symbols
sym src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:1 component AutoOrganizeRuleRow props:rule,isFirst,isLast,onupdate,onremove,onmoveup,onmovedown L549
by src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:default <- src/lib/features/auto-organize/AutoOrganizeSection.svelte:163 in (markup) mount
## locals
local src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:143 fn toGroups(filter: FilterItem): FilterGroup[] L3
local src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:147 fn handleFiltersChange(next: FilterGroup[]) L8
local src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:161 fn addExpression() L5
local src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:168 fn commitFilter() L4
local src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:173 fn setProperties(next: RuleProperty[]) L3
local src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:177 fn addProperty() L3
local src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:196 fn commitCreatePath(raw: string) L6
local src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:203 fn updateCreateNote(changes: Partial<RuleCreateNote>) L3
local src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:207 fn commitCreateTemplate(raw: string) L6
local src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:214 fn setCreateProperties(next: RuleProperty[]) L3
local src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:235 fn commitRename(raw: string, source: keyof typeof RENAME_SOURCES) L14
local src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:250 fn setRenameSource(source: keyof typeof RENAME_SOURCES) L5
local src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:257 fn setRunAction(value: string) L4
local src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:263 fn commitActionInput(value: string) L4
local src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:268 fn handleIconSelect(pack: IconPackId, name: string, color?: string, textColor?: string) L3
local src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:272 fn handleIconRemove() L4
local src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:278 fn getResolvedIcon() L5
## mounts
mount src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:288 Input -> src/lib/components/ui/input/input.svelte
mount src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:294 Switch -> src/lib/components/ui/switch/switch.svelte
mount src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:298 Button -> src/lib/components/ui/button/button.svelte
mount src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:307 Button -> src/lib/components/ui/button/button.svelte
mount src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:316 Button -> src/lib/components/ui/button/button.svelte
mount src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:332 FilterPanel -> src/lib/features/collection/toolbar/FilterPanel.svelte
mount src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:343 Button -> src/lib/components/ui/button/button.svelte
mount src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:384 Input -> src/lib/components/ui/input/input.svelte
mount src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:402 Input -> src/lib/components/ui/input/input.svelte
mount src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:408 Button -> src/lib/components/ui/button/button.svelte
mount src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:417 IconRenderer -> src/lib/features/file-icons/IconRenderer.svelte
mount src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:428 AutoOrganizeRuleProperty -> src/lib/features/auto-organize/AutoOrganizeRuleProperty.svelte
mount src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:435 Button -> src/lib/components/ui/button/button.svelte
mount src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:445 Input -> src/lib/components/ui/input/input.svelte
mount src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:457 Input -> src/lib/components/ui/input/input.svelte
mount src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:469 AutoOrganizeRuleProperty -> src/lib/features/auto-organize/AutoOrganizeRuleProperty.svelte
mount src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:477 Button -> src/lib/components/ui/button/button.svelte
mount src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:487 Switch -> src/lib/components/ui/switch/switch.svelte
mount src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:512 Input -> src/lib/components/ui/input/input.svelte
mount src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:540 IconPicker -> src/lib/features/file-icons/IconPicker.svelte
## mounted-at
mount src/lib/features/auto-organize/AutoOrganizeSection.svelte:163 AutoOrganizeRuleRow -> src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte
## calls
call src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:80 in groups -> src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:toGroups call
call src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:82 in filterDraft=$derived -> src/lib/features/collection/toolbar/filter.logic.ts:filterGroupsToFilter call
call src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:84 in blankValue=$derived -> src/lib/features/auto-organize/auto-organize.logic.ts:hasBlankValue ref
call src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:85 in availableProperties=$derived -> src/lib/features/collection/toolbar/filter.logic.ts:getAllKnownProperties call
call src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:97 in matchCount=$derived -> src/lib/features/auto-organize/auto-organize.logic.ts:countMatchingNotes call
call src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:100 in validCreate=$derived -> src/lib/features/auto-organize/auto-organize.logic.ts:sanitizeCreateNote call
call src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:104 in createCount=$derived -> src/lib/features/auto-organize/auto-organize.logic.ts:countNotesToCreate call
call src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:114 in actionId=$derived -> src/lib/features/auto-organize/auto-organize.logic.ts:sanitizeRunAction call
call src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:118 in doesNothing=$derived -> src/lib/features/auto-organize/auto-organize.logic.ts:sanitizeRuleProperties call
call src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:120 in doesNothing=$derived -> src/lib/features/auto-organize/auto-organize.logic.ts:sanitizeRename call
call src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:126 in actionInput=$derived -> src/lib/core/rule-actions/rule-actions.store.svelte.ts:ruleActionsStore.get mcall
call src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:137 in keySuggestions=$derived -> src/lib/features/auto-organize/auto-organize.logic.ts:isRefusedKey call
call src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:137 in keySuggestions=$derived -> src/lib/features/collection/toolbar/filter.logic.ts:getAllKnownProperties call
call src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:144 in toGroups -> src/lib/features/collection/toolbar/filter.logic.ts:parseFilterToGroups call
call src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:153 in handleFiltersChange -> src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:commitFilter call
call src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:163 in addExpression -> src/lib/features/collection/toolbar/filter.logic.ts:createEmptyExpressionRow call
call src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:178 in addProperty -> src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:setProperties call
call src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:189 in pathInvalid=$derived -> src/lib/features/auto-organize/auto-organize.logic.ts:isValidCreatePath call
call src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:192 in templateInvalid=$derived -> src/lib/features/auto-organize/auto-organize.logic.ts:isValidTemplatePath call
call src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:198 in commitCreatePath -> src/lib/features/auto-organize/auto-organize.logic.ts:isValidCreatePath call
call src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:209 in commitCreateTemplate -> src/lib/features/auto-organize/auto-organize.logic.ts:isValidTemplatePath call
call src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:211 in commitCreateTemplate -> src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:updateCreateNote call
call src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:215 in setCreateProperties -> src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:updateCreateNote call
call src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:232 in renameError=$derived -> src/lib/features/auto-organize/auto-organize.logic.ts:renameProblem call
call src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:244 in commitRename -> src/lib/features/auto-organize/auto-organize.logic.ts:renameProblem call
call src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:253 in setRenameSource -> src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:commitRename call
call src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:281 in getResolvedIcon -> src/lib/features/file-icons/file-icons.icon-data.ts:getIconSync call
call src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:331 in (markup) -> src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:commitFilter markup
call src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:339 in (markup) -> src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:handleFiltersChange markup
call src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:347 in (markup) -> src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:addExpression markup
call src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:374 in (markup) -> src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:setRenameSource markup
call src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:390 in (markup) -> src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:commitRename markup
call src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:415 in (markup) -> src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:getResolvedIcon markup
call src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:431 in (markup) -> src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:setProperties markup +1
call src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:435 in (markup) -> src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:addProperty markup
call src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:449 in (markup) -> src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:commitCreatePath markup
call src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:461 in (markup) -> src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:commitCreateTemplate markup
call src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:473 in (markup) -> src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:setCreateProperties markup +2
call src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:490 in (markup) -> src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:updateCreateNote markup
call src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:501 in (markup) -> src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:setRunAction markup
call src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:514 in (markup) -> src/lib/features/auto-organize/auto-organize.logic.ts:sanitizeRunAction markup
call src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:516 in (markup) -> src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:commitActionInput markup
call src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:546 in (markup) -> src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:handleIconSelect markup
call src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:547 in (markup) -> src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:handleIconRemove markup
## effects
fx src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:92 svelte.$effect in (script)
fx src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:94 timer.setTimeout delay=COUNT_DELAY_MS in $effect@92
fx src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:225 svelte.$effect in (script)
