# file card src/lib/features/collection/toolbar/filter.logic.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/features/collection/toolbar/filter.logic.ts ' codemap/files
sections: imports, imported-by, reach, tests, symbols, locals, calls
file src/lib/features/collection/toolbar/filter.logic.ts logic L560 module src/lib/features/collection in9 t9
## imports
imp src/lib/features/collection/toolbar/filter.logic.ts:1 -> src/lib/features/collection/collection.types.ts type:CollectionFilter,type:FilterItem,type:PropertyIndexRecord
imp src/lib/features/collection/toolbar/filter.logic.ts:2 -> src/lib/features/collection/expression/expression.types.ts type:ASTNode
imp src/lib/features/collection/toolbar/filter.logic.ts:3 -> src/lib/features/collection/expression/parser.ts parse
imp src/lib/features/collection/toolbar/filter.logic.ts:4 -> src/lib/core/filesystem/fs.logic.ts isViewFile
imp src/lib/features/collection/toolbar/filter.logic.ts:5 -> src/lib/core/frontmatter/properties.types.ts type:PropertyType
imp src/lib/features/collection/toolbar/filter.logic.ts:6 -> src/lib/features/collection/toolbar/toolbar.types.ts type:FilterConjunction,type:FilterGroup,type:FilterOperator,type:FilterRow
## imported-by
imp src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:17 -> src/lib/features/collection/toolbar/filter.logic.ts createEmptyExpressionRow,filterGroupsToFilter,getAllKnownProperties,parseFilterToGroups
imp src/lib/features/auto-organize/auto-organize.logic.ts:20 -> src/lib/features/collection/toolbar/filter.logic.ts isFilterObject,isUnaryOperator,parseExpressionToRow
imp src/lib/features/collection/CollectionView.svelte:21 -> src/lib/features/collection/toolbar/filter.logic.ts parseFilterToGroups,filterGroupsToFilter,getAllKnownProperties
imp src/lib/features/collection/toolbar/FilterPanel.svelte:19 -> src/lib/features/collection/toolbar/filter.logic.ts createEmptyFilterRow,inferPropertyType
imp src/lib/features/collection/toolbar/FilterRow.svelte:15 -> src/lib/features/collection/toolbar/filter.logic.ts getOperatorsForType,inferPropertyType,isUnaryOperator
imp src/lib/features/collection/toolbar/SortPanel.svelte:14 -> src/lib/features/collection/toolbar/filter.logic.ts inferPropertyType
imp src/lib/features/rail-shell/lens.logic.ts:42 -> src/lib/features/collection/toolbar/filter.logic.ts filterRowToExpression
imp src/lib/features/type-definitions/ViewDialog.svelte:9 -> src/lib/features/collection/toolbar/filter.logic.ts filterGroupsToFilter,getAllKnownProperties,isUnaryOperator,parseFilterToGroups
imp src/lib/features/type-definitions/type-note-list.logic.ts:3 -> src/lib/features/collection/toolbar/filter.logic.ts parseFilterToGroups,filterGroupsToFilter,getAllKnownProperties
## reach
in2 src/lib/features/collection/toolbar/filter.logic.ts 24 files in 8 modules: src/lib/features/rail-shell(11) src/lib/app(5) src/lib/features/auto-organize(3) src/lib/features/note-list(1) src/lib/features/search(1) +3 modules: q impact src/lib/features/collection/toolbar/filter.logic.ts --depth 2
out2 src/lib/features/collection/toolbar/filter.logic.ts 4 files in 3 modules: src/lib/features/collection(2) src/lib/core/filesystem(1) src/lib/utils(1)
## tests
test src/tests/help/examples-scoping.test.ts imports src/lib/features/collection/toolbar/filter.logic.ts
test src/tests/lib/features/collection/toolbar/filter-logic.test.ts imports src/lib/features/collection/toolbar/filter.logic.ts
test src/tests/lib/features/collection/toolbar/suggestions-skip-views.test.ts imports src/lib/features/collection/toolbar/filter.logic.ts
test src/tests/lib/features/collection/yaml-parser.test.ts imports src/lib/features/collection/toolbar/filter.logic.ts
test src/tests/lib/features/rail-shell/lens.logic.test.ts imports src/lib/features/collection/toolbar/filter.logic.ts
test src/tests/lib/features/type-definitions/ViewDialog.svelte.test.ts imports src/lib/features/collection/toolbar/filter.logic.ts
test src/tests/lib/features/type-definitions/type-definitions.service.test.ts imports src/lib/features/collection/toolbar/filter.logic.ts
test src/tests/lib/features/type-definitions/type-sidebar.logic.test.ts imports src/lib/features/collection/toolbar/filter.logic.ts
test src/tests/lib/plugins/queryjs/kb-api.view-page.test.ts imports src/lib/features/collection/toolbar/filter.logic.ts
## symbols
sym src/lib/features/collection/toolbar/filter.logic.ts:22 fn parseExpressionToRow(expr: string): FilterRow L10 | Tries to parse a simple expression into a visual FilterRow.
by src/lib/features/collection/toolbar/filter.logic.ts:parseExpressionToRow <- src/lib/features/auto-organize/auto-organize.logic.ts:41 in filterProblem call
sym src/lib/features/collection/toolbar/filter.logic.ts:38 fn filterRowToExpression(row: FilterRow): string L51 | Converts a FilterRow back into an expression string for YAML serialization.
by src/lib/features/collection/toolbar/filter.logic.ts:filterRowToExpression <- src/lib/features/rail-shell/lens.logic.ts:868 in describeViewFilters ref
sym src/lib/features/collection/toolbar/filter.logic.ts:94 fn parseFilterToGroups(filter: CollectionFilter | string | undefined): FilterGroup[] L47 | Converts a CollectionFilter or string (from YAML) into FilterGroup[] for the visual UI.
by src/lib/features/collection/toolbar/filter.logic.ts:parseFilterToGroups <- src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:144 in toGroups call
by src/lib/features/collection/toolbar/filter.logic.ts:parseFilterToGroups <- src/lib/features/collection/CollectionView.svelte:161 in seedFromDefinition call +1
by src/lib/features/collection/toolbar/filter.logic.ts:parseFilterToGroups <- src/lib/features/type-definitions/ViewDialog.svelte:96 in load call +1
by src/lib/features/collection/toolbar/filter.logic.ts:parseFilterToGroups <- src/lib/features/type-definitions/type-note-list.logic.ts:58 in seedToolbarStateFromDefinition call +2
sym src/lib/features/collection/toolbar/filter.logic.ts:146 fn filterGroupsToFilter(groups: FilterGroup[]): CollectionFilter | string | undefined L32 | Converts FilterGroup[] (from the UI) back into a CollectionFilter or string or undefined.
by src/lib/features/collection/toolbar/filter.logic.ts:filterGroupsToFilter <- src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:82 in filterDraft=$derived call
by src/lib/features/collection/toolbar/filter.logic.ts:filterGroupsToFilter <- src/lib/features/collection/CollectionView.svelte:259 in queryResult=$derived call +3
by src/lib/features/collection/toolbar/filter.logic.ts:filterGroupsToFilter <- src/lib/features/type-definitions/ViewDialog.svelte:129 in submit call +2
by src/lib/features/collection/toolbar/filter.logic.ts:filterGroupsToFilter <- src/lib/features/type-definitions/type-note-list.logic.ts:90 in buildOverriddenQuery call +4
sym src/lib/features/collection/toolbar/filter.logic.ts:182 fn getOperatorsForType(type: PropertyType): FilterOperator[] L14 | Returns the valid filter operators for a given property type.
by src/lib/features/collection/toolbar/filter.logic.ts:getOperatorsForType <- src/lib/features/collection/toolbar/FilterRow.svelte:48 in validOperators=$derived call +1
sym src/lib/features/collection/toolbar/filter.logic.ts:203 fn isUnaryOperator(op: FilterOperator): boolean L3 | Whether an operator takes no value: `filterRowToExpression` ignores the row's value for it, and the filter row shows no value input.
by src/lib/features/collection/toolbar/filter.logic.ts:isUnaryOperator <- src/lib/features/auto-organize/auto-organize.logic.ts:61 in hasBlankValue call
by src/lib/features/collection/toolbar/filter.logic.ts:isUnaryOperator <- src/lib/features/collection/toolbar/FilterRow.svelte:51 in unary=$derived call +1
by src/lib/features/collection/toolbar/filter.logic.ts:isUnaryOperator <- src/lib/features/type-definitions/ViewDialog.svelte:62 in blankValue=$derived call
sym src/lib/features/collection/toolbar/filter.logic.ts:223 fn getAllKnownProperties(index: Map<string, PropertyIndexRecord>): string[] L16 | Collects all known note property names from the index plus standard file.* properties.
by src/lib/features/collection/toolbar/filter.logic.ts:getAllKnownProperties <- src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:85 in availableProperties=$derived call +1
by src/lib/features/collection/toolbar/filter.logic.ts:getAllKnownProperties <- src/lib/features/collection/CollectionView.svelte:216 in availableProperties=$derived call
by src/lib/features/collection/toolbar/filter.logic.ts:getAllKnownProperties <- src/lib/features/type-definitions/ViewDialog.svelte:58 in availableProperties=$derived call
by src/lib/features/collection/toolbar/filter.logic.ts:getAllKnownProperties <- src/lib/features/type-definitions/type-note-list.logic.ts:118 in combineAvailableProperties call
sym src/lib/features/collection/toolbar/filter.logic.ts:244 fn inferPropertyType(property: string, index: Map<string, PropertyIndexRecord>): PropertyType L34 | Infers the PropertyType of a property by sampling the notes' values from the index.
by src/lib/features/collection/toolbar/filter.logic.ts:inferPropertyType <- src/lib/features/collection/toolbar/FilterPanel.svelte:75 in addFilter call
by src/lib/features/collection/toolbar/filter.logic.ts:inferPropertyType <- src/lib/features/collection/toolbar/FilterRow.svelte:36 in propertyType=$derived call +1
by src/lib/features/collection/toolbar/filter.logic.ts:inferPropertyType <- src/lib/features/collection/toolbar/SortPanel.svelte:79 in (markup) markup
sym src/lib/features/collection/toolbar/filter.logic.ts:282 fn createEmptyFilterRow(property: string, type: PropertyType): FilterRow L9 | Creates an empty FilterRow with sensible defaults for a given property type.
by src/lib/features/collection/toolbar/filter.logic.ts:createEmptyFilterRow <- src/lib/features/collection/toolbar/FilterPanel.svelte:76 in addFilter call
sym src/lib/features/collection/toolbar/filter.logic.ts:296 fn createEmptyExpressionRow(): FilterRow L3 | Creates an expression row with no text yet.
by src/lib/features/collection/toolbar/filter.logic.ts:createEmptyExpressionRow <- src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:163 in addExpression call
sym src/lib/features/collection/toolbar/filter.logic.ts:328 fn isFilterObject(item: unknown): item is CollectionFilter L5 | True for a non-null object whose `and` / `or` / `not`, where present, are lists.
by src/lib/features/collection/toolbar/filter.logic.ts:isFilterObject <- src/lib/features/auto-organize/auto-organize.logic.ts:45 in filterProblem call
## locals
local src/lib/features/collection/toolbar/filter.logic.ts:11 fn uid(): string L3
local src/lib/features/collection/toolbar/filter.logic.ts:303 fn itemToRow(item: FilterItem): FilterRow L15
local src/lib/features/collection/toolbar/filter.logic.ts:320 fn jsonRow(value: unknown): FilterRow L3
local src/lib/features/collection/toolbar/filter.logic.ts:335 fn holdsNull(filter: CollectionFilter): boolean L5
local src/lib/features/collection/toolbar/filter.logic.ts:345 fn rowToItem(row: FilterRow): FilterItem L4
local src/lib/features/collection/toolbar/filter.logic.ts:358 fn filterToExpression(filter: CollectionFilter): string L10
local src/lib/features/collection/toolbar/filter.logic.ts:373 fn astToFilterRow(ast: ASTNode): FilterRow | null L18
local src/lib/features/collection/toolbar/filter.logic.ts:393 fn parseBinaryToRow(ast: ASTNode & { type: 'binary' }): FilterRow | null L31
local src/lib/features/collection/toolbar/filter.logic.ts:426 fn parseNegatedToRow(operand: ASTNode): FilterRow | null L18
local src/lib/features/collection/toolbar/filter.logic.ts:446 fn parseCallToRow(ast: ASTNode & { type: 'call' }): FilterRow | null L41
local src/lib/features/collection/toolbar/filter.logic.ts:489 fn extractPropertyName(node: ASTNode): string | null L5
local src/lib/features/collection/toolbar/filter.logic.ts:496 fn flattenMember(node: ASTNode): string L7
local src/lib/features/collection/toolbar/filter.logic.ts:505 fn extractLiteralValue(node: ASTNode): string | number | boolean | null L6
local src/lib/features/collection/toolbar/filter.logic.ts:513 fn mapBinaryOp(op: string, isNumeric: boolean): FilterOperator | null L22
local src/lib/features/collection/toolbar/filter.logic.ts:537 fn mapDateBinaryOp(op: string): FilterOperator | null L10
local src/lib/features/collection/toolbar/filter.logic.ts:552 fn quoteUnlessNumber(val: string): string L3
local src/lib/features/collection/toolbar/filter.logic.ts:557 fn quoteString(val: string): string L4
## calls
call src/lib/features/collection/toolbar/filter.logic.ts:24 in parseExpressionToRow -> src/lib/features/collection/expression/parser.ts:parse call
call src/lib/features/collection/toolbar/filter.logic.ts:25 in parseExpressionToRow -> src/lib/features/collection/toolbar/filter.logic.ts:astToFilterRow call
call src/lib/features/collection/toolbar/filter.logic.ts:30 in parseExpressionToRow -> src/lib/features/collection/toolbar/filter.logic.ts:uid call
call src/lib/features/collection/toolbar/filter.logic.ts:46 in filterRowToExpression -> src/lib/features/collection/toolbar/filter.logic.ts:quoteString call +5
call src/lib/features/collection/toolbar/filter.logic.ts:60 in filterRowToExpression -> src/lib/features/collection/toolbar/filter.logic.ts:quoteUnlessNumber call +5
call src/lib/features/collection/toolbar/filter.logic.ts:100 in parseFilterToGroups -> src/lib/features/collection/toolbar/filter.logic.ts:parseExpressionToRow call
call src/lib/features/collection/toolbar/filter.logic.ts:108 in parseFilterToGroups -> src/lib/features/collection/toolbar/filter.logic.ts:isFilterObject call
call src/lib/features/collection/toolbar/filter.logic.ts:109 in parseFilterToGroups -> src/lib/features/collection/toolbar/filter.logic.ts:jsonRow call +1
call src/lib/features/collection/toolbar/filter.logic.ts:115 in parseFilterToGroups -> src/lib/features/collection/toolbar/filter.logic.ts:itemToRow ref +2
call src/lib/features/collection/toolbar/filter.logic.ts:159 in filterGroupsToFilter -> src/lib/features/collection/toolbar/filter.logic.ts:rowToItem call +1
call src/lib/features/collection/toolbar/filter.logic.ts:227 in getAllKnownProperties -> src/lib/core/filesystem/fs.logic.ts:isViewFile call
call src/lib/features/collection/toolbar/filter.logic.ts:261 in inferPropertyType -> src/lib/core/filesystem/fs.logic.ts:isViewFile call
call src/lib/features/collection/toolbar/filter.logic.ts:283 in createEmptyFilterRow -> src/lib/features/collection/toolbar/filter.logic.ts:getOperatorsForType call
call src/lib/features/collection/toolbar/filter.logic.ts:285 in createEmptyFilterRow -> src/lib/features/collection/toolbar/filter.logic.ts:uid call
call src/lib/features/collection/toolbar/filter.logic.ts:297 in createEmptyExpressionRow -> src/lib/features/collection/toolbar/filter.logic.ts:uid call
call src/lib/features/collection/toolbar/filter.logic.ts:305 in itemToRow -> src/lib/features/collection/toolbar/filter.logic.ts:parseExpressionToRow call
call src/lib/features/collection/toolbar/filter.logic.ts:309 in itemToRow -> src/lib/features/collection/toolbar/filter.logic.ts:isFilterObject call
call src/lib/features/collection/toolbar/filter.logic.ts:309 in itemToRow -> src/lib/features/collection/toolbar/filter.logic.ts:jsonRow call
call src/lib/features/collection/toolbar/filter.logic.ts:314 in itemToRow -> src/lib/features/collection/toolbar/filter.logic.ts:filterToExpression call
call src/lib/features/collection/toolbar/filter.logic.ts:315 in itemToRow -> src/lib/features/collection/toolbar/filter.logic.ts:holdsNull call
call src/lib/features/collection/toolbar/filter.logic.ts:315 in itemToRow -> src/lib/features/collection/toolbar/filter.logic.ts:uid call +1
call src/lib/features/collection/toolbar/filter.logic.ts:321 in jsonRow -> src/lib/features/collection/toolbar/filter.logic.ts:uid call
call src/lib/features/collection/toolbar/filter.logic.ts:337 in holdsNull -> src/lib/features/collection/toolbar/filter.logic.ts:holdsNull call
call src/lib/features/collection/toolbar/filter.logic.ts:337 in holdsNull -> src/lib/features/collection/toolbar/filter.logic.ts:isFilterObject call
call src/lib/features/collection/toolbar/filter.logic.ts:346 in rowToItem -> src/lib/features/collection/toolbar/filter.logic.ts:filterToExpression call
call src/lib/features/collection/toolbar/filter.logic.ts:347 in rowToItem -> src/lib/features/collection/toolbar/filter.logic.ts:filterRowToExpression call
call src/lib/features/collection/toolbar/filter.logic.ts:360 in filterToExpression -> src/lib/features/collection/toolbar/filter.logic.ts:filterToExpression call
call src/lib/features/collection/toolbar/filter.logic.ts:360 in filterToExpression -> src/lib/features/collection/toolbar/filter.logic.ts:isFilterObject call
call src/lib/features/collection/toolbar/filter.logic.ts:376 in astToFilterRow -> src/lib/features/collection/toolbar/filter.logic.ts:parseBinaryToRow call
call src/lib/features/collection/toolbar/filter.logic.ts:381 in astToFilterRow -> src/lib/features/collection/toolbar/filter.logic.ts:parseNegatedToRow call
call src/lib/features/collection/toolbar/filter.logic.ts:386 in astToFilterRow -> src/lib/features/collection/toolbar/filter.logic.ts:parseCallToRow call
call src/lib/features/collection/toolbar/filter.logic.ts:394 in parseBinaryToRow -> src/lib/features/collection/toolbar/filter.logic.ts:extractPropertyName call
call src/lib/features/collection/toolbar/filter.logic.ts:399 in parseBinaryToRow -> src/lib/features/collection/toolbar/filter.logic.ts:extractLiteralValue call +1
call src/lib/features/collection/toolbar/filter.logic.ts:401 in parseBinaryToRow -> src/lib/features/collection/toolbar/filter.logic.ts:mapDateBinaryOp call
call src/lib/features/collection/toolbar/filter.logic.ts:403 in parseBinaryToRow -> src/lib/features/collection/toolbar/filter.logic.ts:uid call +3
call src/lib/features/collection/toolbar/filter.logic.ts:419 in parseBinaryToRow -> src/lib/features/collection/toolbar/filter.logic.ts:mapBinaryOp call
call src/lib/features/collection/toolbar/filter.logic.ts:429 in parseNegatedToRow -> src/lib/features/collection/toolbar/filter.logic.ts:extractPropertyName call +1
call src/lib/features/collection/toolbar/filter.logic.ts:430 in parseNegatedToRow -> src/lib/features/collection/toolbar/filter.logic.ts:extractLiteralValue call
call src/lib/features/collection/toolbar/filter.logic.ts:432 in parseNegatedToRow -> src/lib/features/collection/toolbar/filter.logic.ts:uid call +1
call src/lib/features/collection/toolbar/filter.logic.ts:450 in parseCallToRow -> src/lib/features/collection/toolbar/filter.logic.ts:extractPropertyName call +3
call src/lib/features/collection/toolbar/filter.logic.ts:451 in parseCallToRow -> src/lib/features/collection/toolbar/filter.logic.ts:extractLiteralValue call +2
call src/lib/features/collection/toolbar/filter.logic.ts:453 in parseCallToRow -> src/lib/features/collection/toolbar/filter.logic.ts:uid call +3
call src/lib/features/collection/toolbar/filter.logic.ts:491 in extractPropertyName -> src/lib/features/collection/toolbar/filter.logic.ts:flattenMember call
call src/lib/features/collection/toolbar/filter.logic.ts:499 in flattenMember -> src/lib/features/collection/toolbar/filter.logic.ts:flattenMember call
call src/lib/features/collection/toolbar/filter.logic.ts:553 in quoteUnlessNumber -> src/lib/features/collection/toolbar/filter.logic.ts:quoteString call
