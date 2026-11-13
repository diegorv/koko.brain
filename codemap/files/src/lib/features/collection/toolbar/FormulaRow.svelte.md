# file card src/lib/features/collection/toolbar/FormulaRow.svelte
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/features/collection/toolbar/FormulaRow.svelte ' codemap/files
file src/lib/features/collection/toolbar/FormulaRow.svelte component L91 module src/lib/features/collection in1 t1
## imports
imp src/lib/features/collection/toolbar/FormulaRow.svelte:2 -> src/lib/components/ui/button/index.ts Button
imp src/lib/features/collection/toolbar/FormulaRow.svelte:6 -> src/lib/features/collection/toolbar/toolbar.types.ts type:FormulaEntry
imp src/lib/features/collection/toolbar/FormulaRow.svelte:7 -> src/lib/features/collection/toolbar/formula.logic.ts validateFormulaExpression
## imported-by
imp src/lib/features/collection/toolbar/PropertiesPanel.svelte:12 -> src/lib/features/collection/toolbar/FormulaRow.svelte default
## reach
in2 src/lib/features/collection/toolbar/FormulaRow.svelte 1 files in 1 modules: src/lib/features/collection(1)
out2 src/lib/features/collection/toolbar/FormulaRow.svelte 3 files in 2 modules: src/lib/features/collection(2) src/lib/components(1)
## tests
test src/tests/lib/features/collection/toolbar/FormulaRow.svelte.test.ts imports src/lib/features/collection/toolbar/FormulaRow.svelte mirror
## symbols
sym src/lib/features/collection/toolbar/FormulaRow.svelte:1 component FormulaRow props:entry,onUpdate,onRemove,nameError L91
by src/lib/features/collection/toolbar/FormulaRow.svelte:default <- src/lib/features/collection/toolbar/PropertiesPanel.svelte:117 in (markup) mount
## mounts
mount src/lib/features/collection/toolbar/FormulaRow.svelte:47 Button -> src/lib/components/ui/button/button.svelte
mount src/lib/features/collection/toolbar/FormulaRow.svelte:57 Button -> src/lib/components/ui/button/button.svelte
## mounted-at
mount src/lib/features/collection/toolbar/PropertiesPanel.svelte:117 FormulaRow -> src/lib/features/collection/toolbar/FormulaRow.svelte
## calls
call src/lib/features/collection/toolbar/FormulaRow.svelte:29 in expressionError=$derived -> src/lib/features/collection/toolbar/formula.logic.ts:validateFormulaExpression call
