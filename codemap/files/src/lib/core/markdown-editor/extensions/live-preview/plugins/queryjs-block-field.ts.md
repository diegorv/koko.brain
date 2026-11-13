# file card src/lib/core/markdown-editor/extensions/live-preview/plugins/queryjs-block-field.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/core/markdown-editor/extensions/live-preview/plugins/queryjs-block-field.ts ' codemap/files
file src/lib/core/markdown-editor/extensions/live-preview/plugins/queryjs-block-field.ts other L77 module src/lib/core/markdown-editor in1 t3
## imports
imp src/lib/core/markdown-editor/extensions/live-preview/plugins/queryjs-block-field.ts:5 -> src/lib/core/markdown-editor/extensions/live-preview/parsers/queryjs-block.ts findAllQueryjsBlocks
imp src/lib/core/markdown-editor/extensions/live-preview/plugins/queryjs-block-field.ts:6 -> src/lib/core/markdown-editor/extensions/live-preview/core/fenced-block-renderers.ts fencedBlockRenderers
imp src/lib/core/markdown-editor/extensions/live-preview/plugins/queryjs-block-field.ts:7 -> src/lib/core/markdown-editor/extensions/live-preview/core/hide-lines.ts hideLines
imp src/lib/core/markdown-editor/extensions/live-preview/plugins/queryjs-block-field.ts:8 -> src/lib/core/markdown-editor/extensions/live-preview/core/block-decorator.ts blockDecorator
imp src/lib/core/markdown-editor/extensions/live-preview/plugins/queryjs-block-field.ts:9 -> src/lib/core/markdown-editor/extensions/live-preview/core/effects.ts forceDecorationRebuild
imp src/lib/core/markdown-editor/extensions/live-preview/plugins/queryjs-block-field.ts:10 -> src/lib/core/markdown-editor/extensions/live-preview/core/mouse-selecting.ts mouseSelectingField
imp src/lib/core/markdown-editor/extensions/live-preview/plugins/queryjs-block-field.ts:11 -> src/lib/core/markdown-editor/extensions/live-preview/core/reveal.ts revealPredicate
## imported-by
imp src/lib/core/markdown-editor/extensions/live-preview/live-preview.ts:14 -> src/lib/core/markdown-editor/extensions/live-preview/plugins/queryjs-block-field.ts queryjsBlockField
## reach
in2 src/lib/core/markdown-editor/extensions/live-preview/plugins/queryjs-block-field.ts 1 files in 1 modules: src/lib/core/markdown-editor(1)
out2 src/lib/core/markdown-editor/extensions/live-preview/plugins/queryjs-block-field.ts 5 files in 1 modules: src/lib/core/markdown-editor(5)
## tests
test src/tests/lib/core/markdown-editor/extensions/live-preview/plugins/queryjs-block-field.test.ts imports src/lib/core/markdown-editor/extensions/live-preview/plugins/queryjs-block-field.ts mirror
test src/tests/lib/core/markdown-editor/extensions/live-preview/plugins/block-reveal.test.ts imports src/lib/core/markdown-editor/extensions/live-preview/plugins/queryjs-block-field.ts
test src/tests/lib/core/markdown-editor/extensions/live-preview/plugins/special-fence-detection.test.ts imports src/lib/core/markdown-editor/extensions/live-preview/plugins/queryjs-block-field.ts
## symbols
sym src/lib/core/markdown-editor/extensions/live-preview/plugins/queryjs-block-field.ts:14 fn computeQueryjsBlocks(state: EditorState): DecorationSet L30 | Computes queryjs block decorations; none when no `queryjs` renderer is registered.
sym src/lib/core/markdown-editor/extensions/live-preview/plugins/queryjs-block-field.ts:66 const queryjsBlockField = blockDecorator(…) L12 | ViewPlugin that manages queryjs block decorations independently.
by src/lib/core/markdown-editor/extensions/live-preview/plugins/queryjs-block-field.ts:queryjsBlockField <- src/lib/core/markdown-editor/extensions/live-preview/live-preview.ts:53 in BLOCK_EXTENSIONS ref
## calls
call src/lib/core/markdown-editor/extensions/live-preview/plugins/queryjs-block-field.ts:17 in computeQueryjsBlocks -> src/lib/core/markdown-editor/extensions/live-preview/core/reveal.ts:revealPredicate call
call src/lib/core/markdown-editor/extensions/live-preview/plugins/queryjs-block-field.ts:20 in computeQueryjsBlocks -> src/lib/core/markdown-editor/extensions/live-preview/parsers/queryjs-block.ts:findAllQueryjsBlocks call
call src/lib/core/markdown-editor/extensions/live-preview/plugins/queryjs-block-field.ts:34 in computeQueryjsBlocks -> src/lib/core/markdown-editor/extensions/live-preview/core/hide-lines.ts:hideLines call
call src/lib/core/markdown-editor/extensions/live-preview/plugins/queryjs-block-field.ts:66 in queryjsBlockField -> src/lib/core/markdown-editor/extensions/live-preview/core/block-decorator.ts:blockDecorator call
call src/lib/core/markdown-editor/extensions/live-preview/plugins/queryjs-block-field.ts:69 in queryjsBlockField -> src/lib/core/markdown-editor/extensions/live-preview/plugins/queryjs-block-field.ts:computeQueryjsBlocks ref
