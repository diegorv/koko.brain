# file card src/lib/features/collection/toolbar/PropertiesPanel.svelte
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/features/collection/toolbar/PropertiesPanel.svelte ' codemap/files
file src/lib/features/collection/toolbar/PropertiesPanel.svelte component L168 module src/lib/features/collection in1 t0
## imports
imp src/lib/features/collection/toolbar/PropertiesPanel.svelte:2 -> src/lib/features/collection/collection.types.ts type:PropertyConfig
imp src/lib/features/collection/toolbar/PropertiesPanel.svelte:3 -> src/lib/features/collection/toolbar/toolbar.types.ts type:FormulaEntry
imp src/lib/features/collection/toolbar/PropertiesPanel.svelte:4 -> src/lib/features/collection/toolbar/properties.logic.ts toggleColumn
imp src/lib/features/collection/toolbar/PropertiesPanel.svelte:5 -> src/lib/features/collection/toolbar/formula.logic.ts addFormulaEntry,removeFormulaEntry,updateFormulaEntry,setFormulaEditing,validateFormulaName
imp src/lib/features/collection/toolbar/PropertiesPanel.svelte:12 -> src/lib/features/collection/toolbar/FormulaRow.svelte default
## imported-by
imp src/lib/features/collection/CollectionView.svelte:28 -> src/lib/features/collection/toolbar/PropertiesPanel.svelte default
## reach
in2 src/lib/features/collection/toolbar/PropertiesPanel.svelte 1 files in 1 modules: src/lib/app(1)
out2 src/lib/features/collection/toolbar/PropertiesPanel.svelte 4 files in 3 modules: src/lib/features/collection(2) src/lib/components(1) src/lib/core/filesystem(1)
## symbols
sym src/lib/features/collection/toolbar/PropertiesPanel.svelte:1 component PropertiesPanel props:visibleColumns,allColumns,propertyConfigs,onColumnsChange,formulaEntries,onFormulasChange L168
by src/lib/features/collection/toolbar/PropertiesPanel.svelte:default <- src/lib/features/collection/CollectionView.svelte:673 in (markup) mount
## locals
local src/lib/features/collection/toolbar/PropertiesPanel.svelte:55 fn getDisplayName(column: string): string L3
local src/lib/features/collection/toolbar/PropertiesPanel.svelte:61 fn handleToggle(column: string, checked: boolean) L3
local src/lib/features/collection/toolbar/PropertiesPanel.svelte:65 fn handleAddFormula() L7
## mounts
mount src/lib/features/collection/toolbar/PropertiesPanel.svelte:117 FormulaRow -> src/lib/features/collection/toolbar/FormulaRow.svelte
## mounted-at
mount src/lib/features/collection/CollectionView.svelte:673 PropertiesPanel -> src/lib/features/collection/toolbar/PropertiesPanel.svelte
## calls
call src/lib/features/collection/toolbar/PropertiesPanel.svelte:62 in handleToggle -> src/lib/features/collection/toolbar/properties.logic.ts:toggleColumn call
call src/lib/features/collection/toolbar/PropertiesPanel.svelte:66 in handleAddFormula -> src/lib/features/collection/toolbar/formula.logic.ts:addFormulaEntry call
call src/lib/features/collection/toolbar/PropertiesPanel.svelte:82 in (markup) -> src/lib/features/collection/toolbar/PropertiesPanel.svelte:handleToggle markup +2
call src/lib/features/collection/toolbar/PropertiesPanel.svelte:85 in (markup) -> src/lib/features/collection/toolbar/PropertiesPanel.svelte:getDisplayName markup +1
call src/lib/features/collection/toolbar/PropertiesPanel.svelte:119 in (markup) -> src/lib/features/collection/toolbar/formula.logic.ts:validateFormulaName markup
call src/lib/features/collection/toolbar/PropertiesPanel.svelte:121 in (markup) -> src/lib/features/collection/toolbar/formula.logic.ts:updateFormulaEntry markup
call src/lib/features/collection/toolbar/PropertiesPanel.svelte:122 in (markup) -> src/lib/features/collection/toolbar/formula.logic.ts:removeFormulaEntry markup +1
call src/lib/features/collection/toolbar/PropertiesPanel.svelte:136 in (markup) -> src/lib/features/collection/toolbar/formula.logic.ts:setFormulaEditing markup
call src/lib/features/collection/toolbar/PropertiesPanel.svelte:163 in (markup) -> src/lib/features/collection/toolbar/PropertiesPanel.svelte:handleAddFormula markup
## effects
fx src/lib/features/collection/toolbar/PropertiesPanel.svelte:68 timer.requestAnimationFrame in handleAddFormula
