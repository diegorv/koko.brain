# file card src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte ' codemap/files
sections: imports, imported-by, reach, tests, symbols, locals, mounts, mounted-at, calls, effects
file src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte component L743 module src/lib/features/auto-organize in1 t1
## imports
imp src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:3 -> src/lib/components/ui/input/index.ts Input
imp src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:4 -> src/lib/components/ui/switch/index.ts Switch
imp src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:5 -> src/lib/components/ui/button/index.ts Button
imp src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:6 -> src/lib/components/ui/select/index.ts *
imp src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:7 -> src/lib/components/ui/dropdown-menu/index.ts *
imp src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:13 -> src/lib/features/file-icons/IconPicker.svelte default
imp src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:14 -> src/lib/features/file-icons/IconRenderer.svelte default
imp src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:15 -> src/lib/features/file-icons/file-icons.icon-data.ts getIconSync
imp src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:16 -> src/lib/features/file-icons/file-icons.store.svelte.ts fileIconsStore
imp src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:17 -> src/lib/features/collection/collection.store.svelte.ts collectionStore
imp src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:18 -> src/lib/features/collection/toolbar/filter.logic.ts addFilter,createEmptyExpressionRow,filterGroupsToFilter,getAllKnownProperties,parseFilterToGroups
imp src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:25 -> src/lib/features/collection/toolbar/FilterPanel.svelte default
imp src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:26 -> src/lib/features/collection/collection.types.ts type:FilterItem
imp src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:27 -> src/lib/features/collection/toolbar/toolbar.types.ts type:FilterGroup
imp src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:28 -> src/lib/core/vault/vault.store.svelte.ts vaultStore
imp src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:29 -> src/lib/core/settings/settings.store.svelte.ts settingsStore
imp src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:30 -> src/lib/core/rule-actions/rule-actions.store.svelte.ts ruleActionsStore
imp src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:31 -> src/lib/features/auto-organize/auto-organize.types.ts type:AutoOrganizeRule,type:RuleCreateNote,type:RuleProperty,type:RuleRename
imp src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:32 -> src/lib/features/file-icons/file-icons.types.ts type:IconPackId
imp src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:33 -> src/lib/features/auto-organize/auto-organize.logic.ts BLANK_VALUE_ERROR,countMatchingNotes,countNotesToCreate,hasBlankValue,isRefusedKey,isValidCreatePath,isValidTemplatePath,renameProblem,sanitizeCreateNote,sanitizeRename,sanitizeRuleProperties,sanitizeRunAction,TEMPLATE_VARIABLES,unknownTemplateVariables
imp src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:49 -> src/lib/features/auto-organize/auto-organize.store.svelte.ts autoOrganizeStore
imp src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:50 -> src/lib/features/auto-organize/AutoOrganizeRuleProperty.svelte default
## imported-by
imp src/lib/features/auto-organize/AutoOrganizeSection.svelte:15 -> src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte default
## reach
in2 src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte 1 files in 1 modules: src/lib/app(1)
out2 src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte 52 files in 9 modules: src/lib/components(35) src/lib/features/collection(6) src/lib/core/settings(3) src/lib/core/frontmatter(2) src/lib/utils(2) +4 modules
## tests
test src/tests/lib/features/auto-organize/AutoOrganizeRuleRow.test.ts imports src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte mirror
## symbols
sym src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:1 component AutoOrganizeRuleRow props:rule,isFirst,isLast,focusName=,onupdate,onremove,onmoveup,onmovedown L743
by src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:default <- src/lib/features/auto-organize/AutoOrganizeSection.svelte:214 in (markup) mount
## locals
local src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:113 fn focusAdded(box: HTMLElement | undefined, add: () => void) L6
local src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:146 fn newRowKeys(count: number): number[] L3
local src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:198 fn toGroups(filter: FilterItem): FilterGroup[] L3
local src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:202 fn handleFiltersChange(next: FilterGroup[]) L8
local src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:216 fn addExpression() L5
local src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:223 fn addPropertyFilter() L3
local src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:228 fn commitFilter() L4
local src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:233 fn setProperties(next: RuleProperty[]) L3
local src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:237 fn addProperty() L4
local src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:242 fn removeProperty(i: number) L4
local src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:293 fn commitCreatePath(raw: string) L10
local src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:304 fn updateCreateNote(changes: Partial<RuleCreateNote>) L3
local src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:308 fn commitCreateTemplate(raw: string) L7
local src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:316 fn setCreateProperties(next: RuleProperty[]) L3
local src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:320 fn addCreateProperty() L4
local src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:325 fn removeCreateProperty(i: number) L4
local src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:360 fn variableWarnings(template: string, into: 'folder' | 'name' | 'path'): string[] L8
local src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:375 fn commitRename(raw: string, source: keyof typeof RENAME_SOURCES) L14
local src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:390 fn setRenameSource(source: keyof typeof RENAME_SOURCES) L5
local src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:397 fn setRunAction(value: string) L4
local src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:403 fn commitActionInput(value: string) L4
local src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:408 fn handleIconSelect(pack: IconPackId, name: string, color?: string, textColor?: string) L3
local src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:412 fn handleIconRemove() L4
local src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:418 fn getResolvedIcon() L5
## mounts
mount src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:435 Input -> src/lib/components/ui/input/input.svelte
mount src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:446 Switch -> src/lib/components/ui/switch/switch.svelte
mount src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:451 Button -> src/lib/components/ui/button/button.svelte
mount src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:461 Button -> src/lib/components/ui/button/button.svelte
mount src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:471 Button -> src/lib/components/ui/button/button.svelte
mount src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:488 FilterPanel -> src/lib/features/collection/toolbar/FilterPanel.svelte
mount src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:503 Button -> src/lib/components/ui/button/button.svelte
mount src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:550 Input -> src/lib/components/ui/input/input.svelte
mount src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:575 Input -> src/lib/components/ui/input/input.svelte
mount src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:584 Button -> src/lib/components/ui/button/button.svelte
mount src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:593 IconRenderer -> src/lib/features/file-icons/IconRenderer.svelte
mount src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:618 AutoOrganizeRuleProperty -> src/lib/features/auto-organize/AutoOrganizeRuleProperty.svelte
mount src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:625 Button -> src/lib/components/ui/button/button.svelte
mount src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:635 Input -> src/lib/components/ui/input/input.svelte
mount src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:651 Input -> src/lib/components/ui/input/input.svelte
mount src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:663 AutoOrganizeRuleProperty -> src/lib/features/auto-organize/AutoOrganizeRuleProperty.svelte
mount src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:671 Button -> src/lib/components/ui/button/button.svelte
mount src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:681 Switch -> src/lib/components/ui/switch/switch.svelte
mount src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:706 Input -> src/lib/components/ui/input/input.svelte
mount src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:734 IconPicker -> src/lib/features/file-icons/IconPicker.svelte
## mounted-at
mount src/lib/features/auto-organize/AutoOrganizeSection.svelte:214 AutoOrganizeRuleRow -> src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte
## calls
call src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:87 in groups -> src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:toGroups call
call src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:89 in filterDraft=$derived -> src/lib/features/collection/toolbar/filter.logic.ts:filterGroupsToFilter call
call src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:91 in blankValue=$derived -> src/lib/features/auto-organize/auto-organize.logic.ts:hasBlankValue ref
call src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:94 in availableProperties=$derived -> src/lib/features/collection/toolbar/filter.logic.ts:getAllKnownProperties call
call src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:127 in matchCount=$derived -> src/lib/features/auto-organize/auto-organize.logic.ts:countMatchingNotes call
call src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:130 in validCreate=$derived -> src/lib/features/auto-organize/auto-organize.logic.ts:sanitizeCreateNote call
call src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:134 in createCount=$derived -> src/lib/features/auto-organize/auto-organize.logic.ts:countNotesToCreate call
call src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:155 in propertyKeys -> src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:newRowKeys call
call src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:156 in createPropertyKeys -> src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:newRowKeys call
call src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:162 in $effect.pre@160 -> src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:newRowKeys call
call src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:166 in $effect.pre@164 -> src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:newRowKeys call
call src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:169 in actionId=$derived -> src/lib/features/auto-organize/auto-organize.logic.ts:sanitizeRunAction call
call src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:173 in doesNothing=$derived -> src/lib/features/auto-organize/auto-organize.logic.ts:sanitizeRuleProperties call
call src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:175 in doesNothing=$derived -> src/lib/features/auto-organize/auto-organize.logic.ts:sanitizeRename call
call src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:181 in actionInput=$derived -> src/lib/core/rule-actions/rule-actions.store.svelte.ts:ruleActionsStore.get mcall
call src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:192 in keySuggestions=$derived -> src/lib/features/auto-organize/auto-organize.logic.ts:isRefusedKey call
call src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:192 in keySuggestions=$derived -> src/lib/features/collection/toolbar/filter.logic.ts:getAllKnownProperties call
call src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:199 in toGroups -> src/lib/features/collection/toolbar/filter.logic.ts:parseFilterToGroups call
call src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:208 in handleFiltersChange -> src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:commitFilter call
call src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:218 in addExpression -> src/lib/features/collection/toolbar/filter.logic.ts:createEmptyExpressionRow call
call src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:224 in addPropertyFilter -> src/lib/features/collection/toolbar/filter.logic.ts:addFilter call
call src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:238 in addProperty -> src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:newRowKeys call
call src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:239 in addProperty -> src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:setProperties call
call src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:244 in removeProperty -> src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:setProperties call
call src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:269 in pathInvalid=$derived -> src/lib/features/auto-organize/auto-organize.logic.ts:isValidCreatePath call
call src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:272 in templateInvalid=$derived -> src/lib/features/auto-organize/auto-organize.logic.ts:isValidTemplatePath call
call src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:297 in commitCreatePath -> src/lib/features/auto-organize/auto-organize.logic.ts:isValidCreatePath call
call src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:311 in commitCreateTemplate -> src/lib/features/auto-organize/auto-organize.logic.ts:isValidTemplatePath call
call src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:313 in commitCreateTemplate -> src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:updateCreateNote call
call src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:317 in setCreateProperties -> src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:updateCreateNote call
call src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:321 in addCreateProperty -> src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:newRowKeys call
call src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:322 in addCreateProperty -> src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:setCreateProperties call
call src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:327 in removeCreateProperty -> src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:setCreateProperties call
call src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:344 in storedRenameProblem=$derived -> src/lib/features/auto-organize/auto-organize.logic.ts:renameProblem call
call src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:357 in VARIABLES_LINE -> src/lib/features/auto-organize/auto-organize.logic.ts:TEMPLATE_VARIABLES mcall
call src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:361 in variableWarnings -> src/lib/features/auto-organize/auto-organize.logic.ts:unknownTemplateVariables call
call src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:368 in destinationWarnings=$derived -> src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:variableWarnings call
call src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:370 in createPathWarnings=$derived -> src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:variableWarnings call
call src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:372 in renameWarnings=$derived -> src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:variableWarnings call
call src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:384 in commitRename -> src/lib/features/auto-organize/auto-organize.logic.ts:renameProblem call
call src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:393 in setRenameSource -> src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:commitRename call
call src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:421 in getResolvedIcon -> src/lib/features/file-icons/file-icons.icon-data.ts:getIconSync call
call src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:487 in (markup) -> src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:commitFilter markup
call src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:496 in (markup) -> src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:handleFiltersChange markup
call src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:511 in (markup) -> src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:addPropertyFilter markup
call src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:511 in (markup) -> src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:focusAdded markup +3
call src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:512 in (markup) -> src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:addExpression markup
call src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:540 in (markup) -> src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:setRenameSource markup
call src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:558 in (markup) -> src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:commitRename markup
call src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:591 in (markup) -> src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:getResolvedIcon markup
call src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:621 in (markup) -> src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:setProperties markup
call src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:622 in (markup) -> src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:removeProperty markup
call src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:625 in (markup) -> src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:addProperty markup
call src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:642 in (markup) -> src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:commitCreatePath markup
call src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:657 in (markup) -> src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:commitCreateTemplate markup
call src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:667 in (markup) -> src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:setCreateProperties markup
call src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:668 in (markup) -> src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:removeCreateProperty markup
call src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:675 in (markup) -> src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:addCreateProperty markup
call src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:684 in (markup) -> src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:updateCreateNote markup
call src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:695 in (markup) -> src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:setRunAction markup
call src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:708 in (markup) -> src/lib/features/auto-organize/auto-organize.logic.ts:sanitizeRunAction markup
call src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:710 in (markup) -> src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:commitActionInput markup
call src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:740 in (markup) -> src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:handleIconSelect markup
call src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:741 in (markup) -> src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:handleIconRemove markup
## effects
fx src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:122 svelte.$effect in (script)
fx src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:124 timer.setTimeout delay=COUNT_DELAY_MS in $effect@122
fx src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:160 svelte.$effect in (script)
fx src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:164 svelte.$effect in (script)
fx src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:261 svelte.$effect in (script)
fx src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:337 svelte.$effect in (script)
