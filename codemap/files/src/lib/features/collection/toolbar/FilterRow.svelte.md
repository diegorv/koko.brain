# file card src/lib/features/collection/toolbar/FilterRow.svelte
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/features/collection/toolbar/FilterRow.svelte ' codemap/files
file src/lib/features/collection/toolbar/FilterRow.svelte component L205 module src/lib/features/collection in1 t1
## imports
imp src/lib/features/collection/toolbar/FilterRow.svelte:2 -> src/lib/components/ui/button/index.ts Button
imp src/lib/features/collection/toolbar/FilterRow.svelte:3 -> src/lib/components/ui/dropdown-menu/index.ts DropdownMenu,DropdownMenuTrigger,DropdownMenuContent,DropdownMenuItem,DropdownMenuSeparator,DropdownMenuLabel
imp src/lib/features/collection/toolbar/FilterRow.svelte:13 -> src/lib/features/collection/toolbar/toolbar.types.ts type:FilterRow,type:FilterOperator
imp src/lib/features/collection/toolbar/FilterRow.svelte:14 -> src/lib/features/collection/toolbar/toolbar.types.ts OPERATOR_LABELS
imp src/lib/features/collection/toolbar/FilterRow.svelte:15 -> src/lib/features/collection/toolbar/filter.logic.ts getOperatorsForType,inferPropertyType,isUnaryOperator
imp src/lib/features/collection/toolbar/FilterRow.svelte:16 -> src/lib/features/collection/collection.types.ts type:PropertyIndexRecord
imp src/lib/features/collection/toolbar/FilterRow.svelte:17 -> src/lib/features/collection/expression/evaluator.ts validateExpression
## imported-by
imp src/lib/features/collection/toolbar/FilterPanel.svelte:22 -> src/lib/features/collection/toolbar/FilterRow.svelte default
## reach
in2 src/lib/features/collection/toolbar/FilterRow.svelte 4 files in 4 modules: src/lib/features/auto-organize(1) src/lib/features/collection(1) src/lib/features/rail-shell(1) src/lib/features/type-definitions(1)
out2 src/lib/features/collection/toolbar/FilterRow.svelte 28 files in 5 modules: src/lib/components(18) src/lib/features/collection(6) src/lib/utils(2) src/lib/core/filesystem(1) src/lib/core/frontmatter(1)
## tests
test src/tests/lib/features/collection/toolbar/FilterRow.svelte.test.ts imports src/lib/features/collection/toolbar/FilterRow.svelte mirror
## symbols
sym src/lib/features/collection/toolbar/FilterRow.svelte:1 component FilterRow props:row,availableProperties,propertyIndex,onUpdate,onRemove L205
by src/lib/features/collection/toolbar/FilterRow.svelte:default <- src/lib/features/collection/toolbar/FilterPanel.svelte:135 in (markup) mount +1
## locals
local src/lib/features/collection/toolbar/FilterRow.svelte:73 fn handlePropertyChange(property: string) L5
local src/lib/features/collection/toolbar/FilterRow.svelte:79 fn handleOperatorChange(operator: FilterOperator) L3
local src/lib/features/collection/toolbar/FilterRow.svelte:83 fn handleValueChange(value: string) L3
local src/lib/features/collection/toolbar/FilterRow.svelte:87 fn handleRawChange(raw: string) L3
## mounts
mount src/lib/features/collection/toolbar/FilterRow.svelte:104 Button -> src/lib/components/ui/button/button.svelte
mount src/lib/features/collection/toolbar/FilterRow.svelte:123 DropdownMenu -> src/lib/components/ui/dropdown-menu/dropdown-menu.svelte
mount src/lib/features/collection/toolbar/FilterRow.svelte:124 DropdownMenuTrigger -> src/lib/components/ui/dropdown-menu/dropdown-menu-trigger.svelte
mount src/lib/features/collection/toolbar/FilterRow.svelte:132 DropdownMenuContent -> src/lib/components/ui/dropdown-menu/dropdown-menu-content.svelte
mount src/lib/features/collection/toolbar/FilterRow.svelte:134 DropdownMenuLabel -> src/lib/components/ui/dropdown-menu/dropdown-menu-label.svelte
mount src/lib/features/collection/toolbar/FilterRow.svelte:136 DropdownMenuItem -> src/lib/components/ui/dropdown-menu/dropdown-menu-item.svelte
mount src/lib/features/collection/toolbar/FilterRow.svelte:143 DropdownMenuSeparator -> src/lib/components/ui/dropdown-menu/dropdown-menu-separator.svelte
mount src/lib/features/collection/toolbar/FilterRow.svelte:145 DropdownMenuLabel -> src/lib/components/ui/dropdown-menu/dropdown-menu-label.svelte
mount src/lib/features/collection/toolbar/FilterRow.svelte:147 DropdownMenuItem -> src/lib/components/ui/dropdown-menu/dropdown-menu-item.svelte
mount src/lib/features/collection/toolbar/FilterRow.svelte:153 DropdownMenuSeparator -> src/lib/components/ui/dropdown-menu/dropdown-menu-separator.svelte
mount src/lib/features/collection/toolbar/FilterRow.svelte:154 DropdownMenuLabel -> src/lib/components/ui/dropdown-menu/dropdown-menu-label.svelte
mount src/lib/features/collection/toolbar/FilterRow.svelte:156 DropdownMenuItem -> src/lib/components/ui/dropdown-menu/dropdown-menu-item.svelte
mount src/lib/features/collection/toolbar/FilterRow.svelte:165 DropdownMenu -> src/lib/components/ui/dropdown-menu/dropdown-menu.svelte
mount src/lib/features/collection/toolbar/FilterRow.svelte:166 DropdownMenuTrigger -> src/lib/components/ui/dropdown-menu/dropdown-menu-trigger.svelte
mount src/lib/features/collection/toolbar/FilterRow.svelte:174 DropdownMenuContent -> src/lib/components/ui/dropdown-menu/dropdown-menu-content.svelte
mount src/lib/features/collection/toolbar/FilterRow.svelte:176 DropdownMenuItem -> src/lib/components/ui/dropdown-menu/dropdown-menu-item.svelte
mount src/lib/features/collection/toolbar/FilterRow.svelte:194 Button -> src/lib/components/ui/button/button.svelte
## mounted-at
mount src/lib/features/collection/toolbar/FilterPanel.svelte:135 FilterRow -> src/lib/features/collection/toolbar/FilterRow.svelte
mount src/lib/features/collection/toolbar/FilterPanel.svelte:200 FilterRow -> src/lib/features/collection/toolbar/FilterRow.svelte
## calls
call src/lib/features/collection/toolbar/FilterRow.svelte:36 in propertyType=$derived -> src/lib/features/collection/toolbar/filter.logic.ts:inferPropertyType call
call src/lib/features/collection/toolbar/FilterRow.svelte:44 in rawError=$derived -> src/lib/features/collection/expression/evaluator.ts:validateExpression call
call src/lib/features/collection/toolbar/FilterRow.svelte:48 in validOperators=$derived -> src/lib/features/collection/toolbar/filter.logic.ts:getOperatorsForType call
call src/lib/features/collection/toolbar/FilterRow.svelte:51 in unary=$derived -> src/lib/features/collection/toolbar/filter.logic.ts:isUnaryOperator call
call src/lib/features/collection/toolbar/FilterRow.svelte:74 in handlePropertyChange -> src/lib/features/collection/toolbar/filter.logic.ts:inferPropertyType call
call src/lib/features/collection/toolbar/FilterRow.svelte:75 in handlePropertyChange -> src/lib/features/collection/toolbar/filter.logic.ts:getOperatorsForType call
call src/lib/features/collection/toolbar/FilterRow.svelte:80 in handleOperatorChange -> src/lib/features/collection/toolbar/filter.logic.ts:isUnaryOperator call
call src/lib/features/collection/toolbar/FilterRow.svelte:98 in (markup) -> src/lib/features/collection/toolbar/FilterRow.svelte:handleRawChange markup
call src/lib/features/collection/toolbar/FilterRow.svelte:136 in (markup) -> src/lib/features/collection/toolbar/FilterRow.svelte:handlePropertyChange markup +2
call src/lib/features/collection/toolbar/FilterRow.svelte:176 in (markup) -> src/lib/features/collection/toolbar/FilterRow.svelte:handleOperatorChange markup
call src/lib/features/collection/toolbar/FilterRow.svelte:187 in (markup) -> src/lib/features/collection/toolbar/FilterRow.svelte:handleValueChange markup
