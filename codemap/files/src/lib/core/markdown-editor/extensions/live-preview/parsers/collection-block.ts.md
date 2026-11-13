# file card src/lib/core/markdown-editor/extensions/live-preview/parsers/collection-block.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/core/markdown-editor/extensions/live-preview/parsers/collection-block.ts ' codemap/files
file src/lib/core/markdown-editor/extensions/live-preview/parsers/collection-block.ts other L27 module src/lib/core/markdown-editor in1 t2
## imports
imp src/lib/core/markdown-editor/extensions/live-preview/parsers/collection-block.ts:2 -> src/lib/core/markdown-editor/extensions/live-preview/parsers/fenced-code-block.ts findSpecialFenceBlocks
## imported-by
imp src/lib/core/markdown-editor/extensions/live-preview/plugins/collection-block-field.ts:4 -> src/lib/core/markdown-editor/extensions/live-preview/parsers/collection-block.ts findAllCollectionBlocks
## reach
in2 src/lib/core/markdown-editor/extensions/live-preview/parsers/collection-block.ts 1 files in 1 modules: src/lib/core/markdown-editor(1)
out2 src/lib/core/markdown-editor/extensions/live-preview/parsers/collection-block.ts 0 files in 0 modules: -
## tests
test src/tests/lib/core/markdown-editor/extensions/live-preview/parsers/collection-block.test.ts imports src/lib/core/markdown-editor/extensions/live-preview/parsers/collection-block.ts mirror
test src/tests/lib/core/markdown-editor/extensions/live-preview/parsers/combined-block-structures.test.ts imports src/lib/core/markdown-editor/extensions/live-preview/parsers/collection-block.ts
## symbols
sym src/lib/core/markdown-editor/extensions/live-preview/parsers/collection-block.ts:5 interface CollectionBlockInfo L12 | Information about a ```collection code block
sym src/lib/core/markdown-editor/extensions/live-preview/parsers/collection-block.ts:22 fn findAllCollectionBlocks(state: EditorState): CollectionBlockInfo[] L6 | Finds every closed ```collection block, from the Lezer `FencedCode` nodes. A ```collection fence nested in a larger fence is code text and is not returned.
by src/lib/core/markdown-editor/extensions/live-preview/parsers/collection-block.ts:findAllCollectionBlocks <- src/lib/core/markdown-editor/extensions/live-preview/plugins/collection-block-field.ts:17 in computeCollectionBlocks call
## calls
call src/lib/core/markdown-editor/extensions/live-preview/parsers/collection-block.ts:23 in findAllCollectionBlocks -> src/lib/core/markdown-editor/extensions/live-preview/parsers/fenced-code-block.ts:findSpecialFenceBlocks call
