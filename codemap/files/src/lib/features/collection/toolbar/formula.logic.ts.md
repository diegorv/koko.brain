# file card src/lib/features/collection/toolbar/formula.logic.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/features/collection/toolbar/formula.logic.ts ' codemap/files
file src/lib/features/collection/toolbar/formula.logic.ts logic L144 module src/lib/features/collection in3 t2
## imports
imp src/lib/features/collection/toolbar/formula.logic.ts:1 -> src/lib/features/collection/toolbar/toolbar.types.ts type:FormulaEntry
imp src/lib/features/collection/toolbar/formula.logic.ts:2 -> src/lib/features/collection/expression/parser.ts parse
## imported-by
imp src/lib/features/collection/CollectionView.svelte:22 -> src/lib/features/collection/toolbar/formula.logic.ts formulasToEntries,entriesToFormulas
imp src/lib/features/collection/toolbar/FormulaRow.svelte:7 -> src/lib/features/collection/toolbar/formula.logic.ts validateFormulaExpression
imp src/lib/features/collection/toolbar/PropertiesPanel.svelte:5 -> src/lib/features/collection/toolbar/formula.logic.ts addFormulaEntry,removeFormulaEntry,updateFormulaEntry,setFormulaEditing,validateFormulaName
## reach
in2 src/lib/features/collection/toolbar/formula.logic.ts 1 files in 1 modules: src/lib/app(1)
out2 src/lib/features/collection/toolbar/formula.logic.ts 3 files in 1 modules: src/lib/features/collection(3)
## tests
test src/tests/lib/features/collection/toolbar/FormulaRow.svelte.test.ts imports src/lib/features/collection/toolbar/formula.logic.ts
test src/tests/lib/features/collection/toolbar/formula-logic.test.ts imports src/lib/features/collection/toolbar/formula.logic.ts
## symbols
sym src/lib/features/collection/toolbar/formula.logic.ts:15 fn formulasToEntries(formulas: Record<string, string> | undefined): FormulaEntry[] L11 | Converts a formulas Record (from CollectionDefinition) into FormulaEntry[] for the UI.
by src/lib/features/collection/toolbar/formula.logic.ts:formulasToEntries <- src/lib/features/collection/CollectionView.svelte:164 in seedFromDefinition call
sym src/lib/features/collection/toolbar/formula.logic.ts:31 fn entriesToFormulas(entries: FormulaEntry[]): Record<string, string> | undefined L12 | Converts FormulaEntry[] (from the UI) back into a Record<string, string>.
by src/lib/features/collection/toolbar/formula.logic.ts:entriesToFormulas <- src/lib/features/collection/CollectionView.svelte:211 in activeFormulas=$derived call +1
sym src/lib/features/collection/toolbar/formula.logic.ts:48 fn createEmptyFormulaEntry(): FormulaEntry L8 | Creates a new empty FormulaEntry for the "Add formula" action.
sym src/lib/features/collection/toolbar/formula.logic.ts:61 fn addFormulaEntry(entries: FormulaEntry[]): FormulaEntry[] L3 | Adds a new formula entry to the list.
by src/lib/features/collection/toolbar/formula.logic.ts:addFormulaEntry <- src/lib/features/collection/toolbar/PropertiesPanel.svelte:66 in handleAddFormula call
sym src/lib/features/collection/toolbar/formula.logic.ts:68 fn removeFormulaEntry(entries: FormulaEntry[], id: string): FormulaEntry[] L6 | Removes a formula entry by ID.
by src/lib/features/collection/toolbar/formula.logic.ts:removeFormulaEntry <- src/lib/features/collection/toolbar/PropertiesPanel.svelte:122 in (markup) markup +1
sym src/lib/features/collection/toolbar/formula.logic.ts:79 fn updateFormulaEntry(entries: FormulaEntry[], id: string, updates: Partial<Pick<FormulaEntry, 'name' | 'expression' | 'editing'>>): Formula… L14 | Updates a formula entry's name and/or expression.
by src/lib/features/collection/toolbar/formula.logic.ts:updateFormulaEntry <- src/lib/features/collection/toolbar/PropertiesPanel.svelte:121 in (markup) markup
sym src/lib/features/collection/toolbar/formula.logic.ts:98 fn validateFormulaExpression(expression: string): string | undefined L11 | Validates a formula expression by attempting to parse it.
by src/lib/features/collection/toolbar/formula.logic.ts:validateFormulaExpression <- src/lib/features/collection/toolbar/FormulaRow.svelte:29 in expressionError=$derived call
sym src/lib/features/collection/toolbar/formula.logic.ts:114 fn validateFormulaName(name: string, existingEntries: FormulaEntry[], currentId: string): string | undefined L17 | Validates a formula name.
by src/lib/features/collection/toolbar/formula.logic.ts:validateFormulaName <- src/lib/features/collection/toolbar/PropertiesPanel.svelte:119 in (markup) markup
sym src/lib/features/collection/toolbar/formula.logic.ts:136 fn setFormulaEditing(entries: FormulaEntry[], id: string): FormulaEntry[] L9 | Sets a formula entry into editing mode, and takes all other entries out of editing mode.
by src/lib/features/collection/toolbar/formula.logic.ts:setFormulaEditing <- src/lib/features/collection/toolbar/PropertiesPanel.svelte:136 in (markup) markup
## locals
local src/lib/features/collection/toolbar/formula.logic.ts:7 fn uid(): string L3
## calls
call src/lib/features/collection/toolbar/formula.logic.ts:20 in formulasToEntries -> src/lib/features/collection/toolbar/formula.logic.ts:uid call
call src/lib/features/collection/toolbar/formula.logic.ts:50 in createEmptyFormulaEntry -> src/lib/features/collection/toolbar/formula.logic.ts:uid call
call src/lib/features/collection/toolbar/formula.logic.ts:62 in addFormulaEntry -> src/lib/features/collection/toolbar/formula.logic.ts:createEmptyFormulaEntry call
call src/lib/features/collection/toolbar/formula.logic.ts:88 in updateFormulaEntry -> src/lib/features/collection/toolbar/formula.logic.ts:validateFormulaExpression call
call src/lib/features/collection/toolbar/formula.logic.ts:103 in validateFormulaExpression -> src/lib/features/collection/expression/parser.ts:parse call
