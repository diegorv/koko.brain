# file card src/lib/core/markdown-editor/extensions/live-preview/plugins/collection-block-field.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/core/markdown-editor/extensions/live-preview/plugins/collection-block-field.ts ' codemap/files
file src/lib/core/markdown-editor/extensions/live-preview/plugins/collection-block-field.ts other L51 module src/lib/core/markdown-editor in1 t3
## imports
imp src/lib/core/markdown-editor/extensions/live-preview/plugins/collection-block-field.ts:4 -> src/lib/core/markdown-editor/extensions/live-preview/parsers/collection-block.ts findAllCollectionBlocks
imp src/lib/core/markdown-editor/extensions/live-preview/plugins/collection-block-field.ts:5 -> src/lib/core/markdown-editor/extensions/live-preview/core/fenced-block-renderers.ts fencedBlockRenderers
imp src/lib/core/markdown-editor/extensions/live-preview/plugins/collection-block-field.ts:6 -> src/lib/core/markdown-editor/extensions/live-preview/core/hide-lines.ts hideLines
imp src/lib/core/markdown-editor/extensions/live-preview/plugins/collection-block-field.ts:7 -> src/lib/core/markdown-editor/extensions/live-preview/core/block-decorator.ts blockDecorator
imp src/lib/core/markdown-editor/extensions/live-preview/plugins/collection-block-field.ts:8 -> src/lib/core/markdown-editor/extensions/live-preview/core/reveal.ts revealPredicate
## imported-by
imp src/lib/core/markdown-editor/extensions/live-preview/live-preview.ts:12 -> src/lib/core/markdown-editor/extensions/live-preview/plugins/collection-block-field.ts collectionBlockField
## reach
in2 src/lib/core/markdown-editor/extensions/live-preview/plugins/collection-block-field.ts 1 files in 1 modules: src/lib/core/markdown-editor(1)
out2 src/lib/core/markdown-editor/extensions/live-preview/plugins/collection-block-field.ts 6 files in 1 modules: src/lib/core/markdown-editor(6)
## tests
test src/tests/lib/core/markdown-editor/extensions/live-preview/plugins/collection-block-field.test.ts imports src/lib/core/markdown-editor/extensions/live-preview/plugins/collection-block-field.ts mirror
test src/tests/lib/core/markdown-editor/extensions/live-preview/plugins/block-reveal.test.ts imports src/lib/core/markdown-editor/extensions/live-preview/plugins/collection-block-field.ts
test src/tests/lib/core/markdown-editor/extensions/live-preview/plugins/special-fence-detection.test.ts imports src/lib/core/markdown-editor/extensions/live-preview/plugins/collection-block-field.ts
## symbols
sym src/lib/core/markdown-editor/extensions/live-preview/plugins/collection-block-field.ts:11 fn computeCollectionBlocks(state: EditorState): DecorationSet L30 | Computes collection block decorations; none when no `collection` renderer is registered.
sym src/lib/core/markdown-editor/extensions/live-preview/plugins/collection-block-field.ts:47 const collectionBlockField = blockDecorator(…) L5 | ViewPlugin that manages collection block decorations independently.
by src/lib/core/markdown-editor/extensions/live-preview/plugins/collection-block-field.ts:collectionBlockField <- src/lib/core/markdown-editor/extensions/live-preview/live-preview.ts:52 in BLOCK_EXTENSIONS ref
## calls
call src/lib/core/markdown-editor/extensions/live-preview/plugins/collection-block-field.ts:14 in computeCollectionBlocks -> src/lib/core/markdown-editor/extensions/live-preview/core/reveal.ts:revealPredicate call
call src/lib/core/markdown-editor/extensions/live-preview/plugins/collection-block-field.ts:17 in computeCollectionBlocks -> src/lib/core/markdown-editor/extensions/live-preview/parsers/collection-block.ts:findAllCollectionBlocks call
call src/lib/core/markdown-editor/extensions/live-preview/plugins/collection-block-field.ts:31 in computeCollectionBlocks -> src/lib/core/markdown-editor/extensions/live-preview/core/hide-lines.ts:hideLines call
call src/lib/core/markdown-editor/extensions/live-preview/plugins/collection-block-field.ts:47 in collectionBlockField -> src/lib/core/markdown-editor/extensions/live-preview/core/block-decorator.ts:blockDecorator call
call src/lib/core/markdown-editor/extensions/live-preview/plugins/collection-block-field.ts:50 in collectionBlockField -> src/lib/core/markdown-editor/extensions/live-preview/plugins/collection-block-field.ts:computeCollectionBlocks ref
