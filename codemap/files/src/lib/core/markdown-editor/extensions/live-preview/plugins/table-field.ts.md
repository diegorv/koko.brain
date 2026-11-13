# file card src/lib/core/markdown-editor/extensions/live-preview/plugins/table-field.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/core/markdown-editor/extensions/live-preview/plugins/table-field.ts ' codemap/files
file src/lib/core/markdown-editor/extensions/live-preview/plugins/table-field.ts other L69 module src/lib/core/markdown-editor in1 t4
## imports
imp src/lib/core/markdown-editor/extensions/live-preview/plugins/table-field.ts:4 -> src/lib/core/markdown-editor/extensions/live-preview/parsers/table.ts findAllTables
imp src/lib/core/markdown-editor/extensions/live-preview/plugins/table-field.ts:5 -> src/lib/core/markdown-editor/extensions/live-preview/widgets.ts TableWidget
imp src/lib/core/markdown-editor/extensions/live-preview/plugins/table-field.ts:6 -> src/lib/core/markdown-editor/extensions/live-preview/core/hide-lines.ts hideLines
imp src/lib/core/markdown-editor/extensions/live-preview/plugins/table-field.ts:7 -> src/lib/core/markdown-editor/extensions/live-preview/core/block-decorator.ts blockDecorator
imp src/lib/core/markdown-editor/extensions/live-preview/plugins/table-field.ts:8 -> src/lib/core/markdown-editor/extensions/live-preview/core/reveal.ts revealPredicate
imp src/lib/core/markdown-editor/extensions/live-preview/plugins/table-field.ts:9 -> src/lib/core/markdown-editor/extensions/live-preview/styles.ts tableLineDeco
imp src/lib/core/markdown-editor/extensions/live-preview/plugins/table-field.ts:10 -> src/lib/core/markdown-editor/extensions/live-preview/core/frontmatter-slice.ts frontmatterSlice
imp src/lib/core/markdown-editor/extensions/live-preview/plugins/table-field.ts:11 -> src/lib/core/frontmatter/properties.logic.ts parseFrontmatterProperties
imp src/lib/core/markdown-editor/extensions/live-preview/plugins/table-field.ts:12 -> src/lib/core/frontmatter/properties.types.ts type:Property
## imported-by
imp src/lib/core/markdown-editor/extensions/live-preview/live-preview.ts:10 -> src/lib/core/markdown-editor/extensions/live-preview/plugins/table-field.ts tableField
## reach
in2 src/lib/core/markdown-editor/extensions/live-preview/plugins/table-field.ts 1 files in 1 modules: src/lib/core/markdown-editor(1)
out2 src/lib/core/markdown-editor/extensions/live-preview/plugins/table-field.ts 17 files in 2 modules: src/lib/core/markdown-editor(13) src/lib/utils(4)
## tests
test src/tests/lib/core/markdown-editor/extensions/live-preview/plugins/table-field.test.ts imports src/lib/core/markdown-editor/extensions/live-preview/plugins/table-field.ts mirror
test src/tests/lib/core/markdown-editor/extensions/live-preview/plugins/block-reveal.test.ts imports src/lib/core/markdown-editor/extensions/live-preview/plugins/table-field.ts
test src/tests/lib/core/markdown-editor/extensions/live-preview/plugins/keyboard-reveal.test.ts imports src/lib/core/markdown-editor/extensions/live-preview/plugins/table-field.ts
test src/tests/lib/core/markdown-editor/extensions/live-preview/table-widget.test.ts imports src/lib/core/markdown-editor/extensions/live-preview/plugins/table-field.ts
## symbols
sym src/lib/core/markdown-editor/extensions/live-preview/plugins/table-field.ts:15 fn computeTables(state: EditorState): DecorationSet L43 | Computes table decorations using the Lezer syntax tree
sym src/lib/core/markdown-editor/extensions/live-preview/plugins/table-field.ts:65 const tableField = blockDecorator(…) L5 | ViewPlugin that manages table decorations independently.
by src/lib/core/markdown-editor/extensions/live-preview/plugins/table-field.ts:tableField <- src/lib/core/markdown-editor/extensions/live-preview/live-preview.ts:50 in BLOCK_EXTENSIONS ref
## calls
call src/lib/core/markdown-editor/extensions/live-preview/plugins/table-field.ts:16 in computeTables -> src/lib/core/markdown-editor/extensions/live-preview/core/reveal.ts:revealPredicate call
call src/lib/core/markdown-editor/extensions/live-preview/plugins/table-field.ts:18 in computeTables -> src/lib/core/frontmatter/properties.logic.ts:parseFrontmatterProperties call
call src/lib/core/markdown-editor/extensions/live-preview/plugins/table-field.ts:18 in computeTables -> src/lib/core/markdown-editor/extensions/live-preview/core/frontmatter-slice.ts:frontmatterSlice call
call src/lib/core/markdown-editor/extensions/live-preview/plugins/table-field.ts:19 in computeTables -> src/lib/core/markdown-editor/extensions/live-preview/parsers/table.ts:findAllTables call
call src/lib/core/markdown-editor/extensions/live-preview/plugins/table-field.ts:37 in computeTables -> src/lib/core/markdown-editor/extensions/live-preview/widgets.ts:TableWidget new
call src/lib/core/markdown-editor/extensions/live-preview/plugins/table-field.ts:53 in computeTables -> src/lib/core/markdown-editor/extensions/live-preview/core/hide-lines.ts:hideLines call
call src/lib/core/markdown-editor/extensions/live-preview/plugins/table-field.ts:65 in tableField -> src/lib/core/markdown-editor/extensions/live-preview/core/block-decorator.ts:blockDecorator call
call src/lib/core/markdown-editor/extensions/live-preview/plugins/table-field.ts:68 in tableField -> src/lib/core/markdown-editor/extensions/live-preview/plugins/table-field.ts:computeTables ref
