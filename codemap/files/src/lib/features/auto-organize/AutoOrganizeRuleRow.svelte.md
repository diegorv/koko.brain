# file card src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte ' codemap/files
sections: imports, imported-by, reach, tests, symbols, locals, mounts, mounted-at, calls, effects
file src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte component L711 module src/lib/features/auto-organize in1 t1
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
imp src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:31 -> src/lib/features/auto-organize/auto-organize.logic.ts BLANK_VALUE_ERROR,countMatchingNotes,countNotesToCreate,hasBlankValue,isRefusedKey,isValidCreatePath,isValidTemplatePath,renameProblem,sanitizeCreateNote,sanitizeRename,sanitizeRuleProperties,sanitizeRunAction,TEMPLATE_VARIABLES,unknownTemplateVariables
imp src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:47 -> src/lib/features/auto-organize/auto-organize.store.svelte.ts autoOrganizeStore
imp src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:48 -> src/lib/features/auto-organize/AutoOrganizeRuleProperty.svelte default
## imported-by
imp src/lib/features/auto-organize/AutoOrganizeSection.svelte:15 -> src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte default
## reach
in2 src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte 1 files in 1 modules: src/lib/app(1)
out2 src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte 36 files in 9 modules: src/lib/components(19) src/lib/features/collection(6) src/lib/core/settings(3) src/lib/core/frontmatter(2) src/lib/utils(2) +4 modules
## tests
test src/tests/lib/features/auto-organize/AutoOrganizeRuleRow.test.ts imports src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte mirror
## symbols
sym src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:1 component AutoOrganizeRuleRow props:rule,isFirst,isLast,focusName=,onupdate,onremove,onmoveup,onmovedown L711
by src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:default <- src/lib/features/auto-organize/AutoOrganizeSection.svelte:214 in (markup) mount
## locals
local src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:111 fn focusAdded(box: HTMLElement | undefined, add: () => void) L6
local src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:144 fn newRowKeys(count: number): number[] L3
local src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:196 fn toGroups(filter: FilterItem): FilterGroup[] L3
local src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:200 fn handleFiltersChange(next: FilterGroup[]) L8
local src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:214 fn addExpression() L5
local src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:221 fn commitFilter() L4
local src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:226 fn setProperties(next: RuleProperty[]) L3
local src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:230 fn addProperty() L4
local src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:235 fn removeProperty(i: number) L4
local src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:272 fn commitCreatePath(raw: string) L8
local src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:281 fn updateCreateNote(changes: Partial<RuleCreateNote>) L3
local src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:285 fn commitCreateTemplate(raw: string) L7
local src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:293 fn setCreateProperties(next: RuleProperty[]) L3
local src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:297 fn addCreateProperty() L4
local src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:302 fn removeCreateProperty(i: number) L4
local src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:337 fn variableWarnings(template: string, into: 'folder' | 'name'): string[] L8
local src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:351 fn commitRename(raw: string, source: keyof typeof RENAME_SOURCES) L14
local src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:366 fn setRenameSource(source: keyof typeof RENAME_SOURCES) L5
local src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:373 fn setRunAction(value: string) L4
local src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:379 fn commitActionInput(value: string) L4
local src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:384 fn handleIconSelect(pack: IconPackId, name: string, color?: string, textColor?: string) L3
local src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:388 fn handleIconRemove() L4
local src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:394 fn getResolvedIcon() L5
## mounts
mount src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:411 Input -> src/lib/components/ui/input/input.svelte
mount src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:422 Switch -> src/lib/components/ui/switch/switch.svelte
mount src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:427 Button -> src/lib/components/ui/button/button.svelte
mount src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:437 Button -> src/lib/components/ui/button/button.svelte
mount src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:447 Button -> src/lib/components/ui/button/button.svelte
mount src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:464 FilterPanel -> src/lib/features/collection/toolbar/FilterPanel.svelte
mount src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:475 Button -> src/lib/components/ui/button/button.svelte
mount src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:519 Input -> src/lib/components/ui/input/input.svelte
mount src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:544 Input -> src/lib/components/ui/input/input.svelte
mount src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:553 Button -> src/lib/components/ui/button/button.svelte
mount src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:562 IconRenderer -> src/lib/features/file-icons/IconRenderer.svelte
mount src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:587 AutoOrganizeRuleProperty -> src/lib/features/auto-organize/AutoOrganizeRuleProperty.svelte
mount src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:594 Button -> src/lib/components/ui/button/button.svelte
mount src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:604 Input -> src/lib/components/ui/input/input.svelte
mount src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:619 Input -> src/lib/components/ui/input/input.svelte
mount src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:631 AutoOrganizeRuleProperty -> src/lib/features/auto-organize/AutoOrganizeRuleProperty.svelte
mount src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:639 Button -> src/lib/components/ui/button/button.svelte
mount src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:649 Switch -> src/lib/components/ui/switch/switch.svelte
mount src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:674 Input -> src/lib/components/ui/input/input.svelte
mount src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:702 IconPicker -> src/lib/features/file-icons/IconPicker.svelte
## mounted-at
mount src/lib/features/auto-organize/AutoOrganizeSection.svelte:214 AutoOrganizeRuleRow -> src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte
## calls
call src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:85 in groups -> src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:toGroups call
call src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:87 in filterDraft=$derived -> src/lib/features/collection/toolbar/filter.logic.ts:filterGroupsToFilter call
call src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:89 in blankValue=$derived -> src/lib/features/auto-organize/auto-organize.logic.ts:hasBlankValue ref
call src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:92 in availableProperties=$derived -> src/lib/features/collection/toolbar/filter.logic.ts:getAllKnownProperties call
call src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:125 in matchCount=$derived -> src/lib/features/auto-organize/auto-organize.logic.ts:countMatchingNotes call
call src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:128 in validCreate=$derived -> src/lib/features/auto-organize/auto-organize.logic.ts:sanitizeCreateNote call
call src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:132 in createCount=$derived -> src/lib/features/auto-organize/auto-organize.logic.ts:countNotesToCreate call
call src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:153 in propertyKeys -> src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:newRowKeys call
call src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:154 in createPropertyKeys -> src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:newRowKeys call
call src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:160 in $effect.pre@158 -> src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:newRowKeys call
call src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:164 in $effect.pre@162 -> src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:newRowKeys call
call src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:167 in actionId=$derived -> src/lib/features/auto-organize/auto-organize.logic.ts:sanitizeRunAction call
call src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:171 in doesNothing=$derived -> src/lib/features/auto-organize/auto-organize.logic.ts:sanitizeRuleProperties call
call src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:173 in doesNothing=$derived -> src/lib/features/auto-organize/auto-organize.logic.ts:sanitizeRename call
call src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:179 in actionInput=$derived -> src/lib/core/rule-actions/rule-actions.store.svelte.ts:ruleActionsStore.get mcall
call src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:190 in keySuggestions=$derived -> src/lib/features/auto-organize/auto-organize.logic.ts:isRefusedKey call
call src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:190 in keySuggestions=$derived -> src/lib/features/collection/toolbar/filter.logic.ts:getAllKnownProperties call
call src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:197 in toGroups -> src/lib/features/collection/toolbar/filter.logic.ts:parseFilterToGroups call
call src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:206 in handleFiltersChange -> src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:commitFilter call
call src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:216 in addExpression -> src/lib/features/collection/toolbar/filter.logic.ts:createEmptyExpressionRow call
call src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:231 in addProperty -> src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:newRowKeys call
call src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:232 in addProperty -> src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:setProperties call
call src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:237 in removeProperty -> src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:setProperties call
call src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:248 in pathInvalid=$derived -> src/lib/features/auto-organize/auto-organize.logic.ts:isValidCreatePath call
call src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:251 in templateInvalid=$derived -> src/lib/features/auto-organize/auto-organize.logic.ts:isValidTemplatePath call
call src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:276 in commitCreatePath -> src/lib/features/auto-organize/auto-organize.logic.ts:isValidCreatePath call
call src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:288 in commitCreateTemplate -> src/lib/features/auto-organize/auto-organize.logic.ts:isValidTemplatePath call
call src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:290 in commitCreateTemplate -> src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:updateCreateNote call
call src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:294 in setCreateProperties -> src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:updateCreateNote call
call src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:298 in addCreateProperty -> src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:newRowKeys call
call src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:299 in addCreateProperty -> src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:setCreateProperties call
call src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:304 in removeCreateProperty -> src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:setCreateProperties call
call src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:321 in storedRenameProblem=$derived -> src/lib/features/auto-organize/auto-organize.logic.ts:renameProblem call
call src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:334 in VARIABLES_LINE -> src/lib/features/auto-organize/auto-organize.logic.ts:TEMPLATE_VARIABLES mcall
call src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:338 in variableWarnings -> src/lib/features/auto-organize/auto-organize.logic.ts:unknownTemplateVariables call
call src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:345 in destinationWarnings=$derived -> src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:variableWarnings call
call src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:346 in createPathWarnings=$derived -> src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:variableWarnings call
call src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:348 in renameWarnings=$derived -> src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:variableWarnings call
call src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:360 in commitRename -> src/lib/features/auto-organize/auto-organize.logic.ts:renameProblem call
call src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:369 in setRenameSource -> src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:commitRename call
call src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:397 in getResolvedIcon -> src/lib/features/file-icons/file-icons.icon-data.ts:getIconSync call
call src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:463 in (markup) -> src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:commitFilter markup
call src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:471 in (markup) -> src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:handleFiltersChange markup
call src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:479 in (markup) -> src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:addExpression markup
call src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:479 in (markup) -> src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:focusAdded markup +2
call src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:509 in (markup) -> src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:setRenameSource markup
call src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:527 in (markup) -> src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:commitRename markup
call src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:560 in (markup) -> src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:getResolvedIcon markup
call src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:590 in (markup) -> src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:setProperties markup
call src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:591 in (markup) -> src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:removeProperty markup
call src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:594 in (markup) -> src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:addProperty markup
call src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:610 in (markup) -> src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:commitCreatePath markup
call src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:625 in (markup) -> src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:commitCreateTemplate markup
call src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:635 in (markup) -> src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:setCreateProperties markup
call src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:636 in (markup) -> src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:removeCreateProperty markup
call src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:643 in (markup) -> src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:addCreateProperty markup
call src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:652 in (markup) -> src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:updateCreateNote markup
call src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:663 in (markup) -> src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:setRunAction markup
call src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:676 in (markup) -> src/lib/features/auto-organize/auto-organize.logic.ts:sanitizeRunAction markup
call src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:678 in (markup) -> src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:commitActionInput markup
call src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:708 in (markup) -> src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:handleIconSelect markup
call src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:709 in (markup) -> src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:handleIconRemove markup
## effects
fx src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:120 svelte.$effect in (script)
fx src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:122 timer.setTimeout delay=COUNT_DELAY_MS in $effect@120
fx src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:158 svelte.$effect in (script)
fx src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:162 svelte.$effect in (script)
fx src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:314 svelte.$effect in (script)
