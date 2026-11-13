# file card src/lib/core/markdown-editor/extensions/live-preview/parsers/mermaid.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/core/markdown-editor/extensions/live-preview/parsers/mermaid.ts ' codemap/files
file src/lib/core/markdown-editor/extensions/live-preview/parsers/mermaid.ts other L27 module src/lib/core/markdown-editor in1 t2
## imports
imp src/lib/core/markdown-editor/extensions/live-preview/parsers/mermaid.ts:2 -> src/lib/core/markdown-editor/extensions/live-preview/parsers/fenced-code-block.ts findSpecialFenceBlocks
## imported-by
imp src/lib/core/markdown-editor/extensions/live-preview/plugins/mermaid-field.ts:4 -> src/lib/core/markdown-editor/extensions/live-preview/parsers/mermaid.ts findAllMermaidBlocks
## reach
in2 src/lib/core/markdown-editor/extensions/live-preview/parsers/mermaid.ts 1 files in 1 modules: src/lib/core/markdown-editor(1)
out2 src/lib/core/markdown-editor/extensions/live-preview/parsers/mermaid.ts 0 files in 0 modules: -
## tests
test src/tests/lib/core/markdown-editor/extensions/live-preview/parsers/mermaid.test.ts imports src/lib/core/markdown-editor/extensions/live-preview/parsers/mermaid.ts mirror
test src/tests/lib/core/markdown-editor/extensions/live-preview/parsers/combined-block-structures.test.ts imports src/lib/core/markdown-editor/extensions/live-preview/parsers/mermaid.ts
## symbols
sym src/lib/core/markdown-editor/extensions/live-preview/parsers/mermaid.ts:5 interface MermaidBlockInfo L12 | Information about a ```mermaid fenced code block
sym src/lib/core/markdown-editor/extensions/live-preview/parsers/mermaid.ts:22 fn findAllMermaidBlocks(state: EditorState): MermaidBlockInfo[] L6 | Finds every closed ```mermaid block, from the Lezer `FencedCode` nodes. A ```mermaid fence nested in a larger fence is code text and is not returned.
by src/lib/core/markdown-editor/extensions/live-preview/parsers/mermaid.ts:findAllMermaidBlocks <- src/lib/core/markdown-editor/extensions/live-preview/plugins/mermaid-field.ts:15 in computeMermaidBlocks call
## calls
call src/lib/core/markdown-editor/extensions/live-preview/parsers/mermaid.ts:23 in findAllMermaidBlocks -> src/lib/core/markdown-editor/extensions/live-preview/parsers/fenced-code-block.ts:findSpecialFenceBlocks call
