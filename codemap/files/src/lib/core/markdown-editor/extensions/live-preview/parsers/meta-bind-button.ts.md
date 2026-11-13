# file card src/lib/core/markdown-editor/extensions/live-preview/parsers/meta-bind-button.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/core/markdown-editor/extensions/live-preview/parsers/meta-bind-button.ts ' codemap/files
file src/lib/core/markdown-editor/extensions/live-preview/parsers/meta-bind-button.ts other L27 module src/lib/core/markdown-editor in1 t2
## imports
imp src/lib/core/markdown-editor/extensions/live-preview/parsers/meta-bind-button.ts:2 -> src/lib/core/markdown-editor/extensions/live-preview/parsers/fenced-code-block.ts findSpecialFenceBlocks
## imported-by
imp src/lib/core/markdown-editor/extensions/live-preview/plugins/meta-bind-button-field.ts:4 -> src/lib/core/markdown-editor/extensions/live-preview/parsers/meta-bind-button.ts findAllMetaBindButtonBlocks
## reach
in2 src/lib/core/markdown-editor/extensions/live-preview/parsers/meta-bind-button.ts 1 files in 1 modules: src/lib/core/markdown-editor(1)
out2 src/lib/core/markdown-editor/extensions/live-preview/parsers/meta-bind-button.ts 0 files in 0 modules: -
## tests
test src/tests/lib/core/markdown-editor/extensions/live-preview/parsers/meta-bind-button.test.ts imports src/lib/core/markdown-editor/extensions/live-preview/parsers/meta-bind-button.ts mirror
test src/tests/lib/core/markdown-editor/extensions/live-preview/parsers/combined-block-structures.test.ts imports src/lib/core/markdown-editor/extensions/live-preview/parsers/meta-bind-button.ts
## symbols
sym src/lib/core/markdown-editor/extensions/live-preview/parsers/meta-bind-button.ts:5 interface MetaBindButtonBlock L12 | Information about a ```meta-bind-button code block
sym src/lib/core/markdown-editor/extensions/live-preview/parsers/meta-bind-button.ts:22 fn findAllMetaBindButtonBlocks(state: EditorState): MetaBindButtonBlock[] L6 | Finds every closed ```meta-bind-button block, from the Lezer `FencedCode` nodes. A ```meta-bind-button fence nested in a larger fence is code text and is not r…
by src/lib/core/markdown-editor/extensions/live-preview/parsers/meta-bind-button.ts:findAllMetaBindButtonBlocks <- src/lib/core/markdown-editor/extensions/live-preview/plugins/meta-bind-button-field.ts:16 in computeMetaBindButtons call
## calls
call src/lib/core/markdown-editor/extensions/live-preview/parsers/meta-bind-button.ts:23 in findAllMetaBindButtonBlocks -> src/lib/core/markdown-editor/extensions/live-preview/parsers/fenced-code-block.ts:findSpecialFenceBlocks call
