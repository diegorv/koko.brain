# file card src/lib/core/markdown-editor/extensions/live-preview/parsers/queryjs-block.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/core/markdown-editor/extensions/live-preview/parsers/queryjs-block.ts ' codemap/files
file src/lib/core/markdown-editor/extensions/live-preview/parsers/queryjs-block.ts other L27 module src/lib/core/markdown-editor in1 t1
## imports
imp src/lib/core/markdown-editor/extensions/live-preview/parsers/queryjs-block.ts:2 -> src/lib/core/markdown-editor/extensions/live-preview/parsers/fenced-code-block.ts findSpecialFenceBlocks
## imported-by
imp src/lib/core/markdown-editor/extensions/live-preview/plugins/queryjs-block-field.ts:5 -> src/lib/core/markdown-editor/extensions/live-preview/parsers/queryjs-block.ts findAllQueryjsBlocks
## reach
in2 src/lib/core/markdown-editor/extensions/live-preview/parsers/queryjs-block.ts 1 files in 1 modules: src/lib/core/markdown-editor(1)
out2 src/lib/core/markdown-editor/extensions/live-preview/parsers/queryjs-block.ts 0 files in 0 modules: -
## tests
test src/tests/lib/core/markdown-editor/extensions/live-preview/parsers/queryjs-block.test.ts imports src/lib/core/markdown-editor/extensions/live-preview/parsers/queryjs-block.ts mirror
## symbols
sym src/lib/core/markdown-editor/extensions/live-preview/parsers/queryjs-block.ts:5 interface QueryjsBlockInfo L12 | Information about a ```queryjs code block
sym src/lib/core/markdown-editor/extensions/live-preview/parsers/queryjs-block.ts:22 fn findAllQueryjsBlocks(state: EditorState): QueryjsBlockInfo[] L6 | Finds every closed ```queryjs block, from the Lezer `FencedCode` nodes. A queryjs fence nested in a larger fence is code text and is not returned.
by src/lib/core/markdown-editor/extensions/live-preview/parsers/queryjs-block.ts:findAllQueryjsBlocks <- src/lib/core/markdown-editor/extensions/live-preview/plugins/queryjs-block-field.ts:20 in computeQueryjsBlocks call
## calls
call src/lib/core/markdown-editor/extensions/live-preview/parsers/queryjs-block.ts:23 in findAllQueryjsBlocks -> src/lib/core/markdown-editor/extensions/live-preview/parsers/fenced-code-block.ts:findSpecialFenceBlocks call
