# file card src/lib/core/markdown-editor/extensions/live-preview/parsers/fenced-code-block.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/core/markdown-editor/extensions/live-preview/parsers/fenced-code-block.ts ' codemap/files
file src/lib/core/markdown-editor/extensions/live-preview/parsers/fenced-code-block.ts other L199 module src/lib/core/markdown-editor in6 t2
## imported-by
imp src/lib/core/markdown-editor/extensions/live-preview/parsers/collection-block.ts:2 -> src/lib/core/markdown-editor/extensions/live-preview/parsers/fenced-code-block.ts findSpecialFenceBlocks
imp src/lib/core/markdown-editor/extensions/live-preview/parsers/mermaid.ts:2 -> src/lib/core/markdown-editor/extensions/live-preview/parsers/fenced-code-block.ts findSpecialFenceBlocks
imp src/lib/core/markdown-editor/extensions/live-preview/parsers/meta-bind-button.ts:2 -> src/lib/core/markdown-editor/extensions/live-preview/parsers/fenced-code-block.ts findSpecialFenceBlocks
imp src/lib/core/markdown-editor/extensions/live-preview/parsers/queryjs-block.ts:2 -> src/lib/core/markdown-editor/extensions/live-preview/parsers/fenced-code-block.ts findSpecialFenceBlocks
imp src/lib/core/markdown-editor/extensions/live-preview/plugins/block-comment-field.ts:5 -> src/lib/core/markdown-editor/extensions/live-preview/parsers/fenced-code-block.ts findAllFencedCodeBlocks
imp src/lib/core/markdown-editor/extensions/live-preview/plugins/code-block-field.ts:5 -> src/lib/core/markdown-editor/extensions/live-preview/parsers/fenced-code-block.ts findAllFencedCodeBlocks
## reach
in2 src/lib/core/markdown-editor/extensions/live-preview/parsers/fenced-code-block.ts 5 files in 1 modules: src/lib/core/markdown-editor(5)
out2 src/lib/core/markdown-editor/extensions/live-preview/parsers/fenced-code-block.ts 0 files in 0 modules: -
## tests
test src/tests/lib/core/markdown-editor/extensions/live-preview/parsers/fenced-code-block.test.ts imports src/lib/core/markdown-editor/extensions/live-preview/parsers/fenced-code-block.ts mirror
test src/tests/lib/core/markdown-editor/extensions/live-preview/parsers/combined-block-structures.test.ts imports src/lib/core/markdown-editor/extensions/live-preview/parsers/fenced-code-block.ts
## symbols
sym src/lib/core/markdown-editor/extensions/live-preview/parsers/fenced-code-block.ts:6 interface FencedCodeBlockRange L29 | Range positions for a fenced code block detected via the Lezer syntax tree
sym src/lib/core/markdown-editor/extensions/live-preview/parsers/fenced-code-block.ts:40 fn findAllFencedCodeBlocks(state: EditorState): FencedCodeBlockRange[] L58 | Finds all fenced code blocks using the Lezer syntax tree (`FencedCode` nodes).
by src/lib/core/markdown-editor/extensions/live-preview/parsers/fenced-code-block.ts:findAllFencedCodeBlocks <- src/lib/core/markdown-editor/extensions/live-preview/plugins/block-comment-field.ts:20 in computeBlockComments call
by src/lib/core/markdown-editor/extensions/live-preview/parsers/fenced-code-block.ts:findAllFencedCodeBlocks <- src/lib/core/markdown-editor/extensions/live-preview/plugins/code-block-field.ts:35 in computeCodeBlocks call
sym src/lib/core/markdown-editor/extensions/live-preview/parsers/fenced-code-block.ts:100 interface SpecialFenceBlock L12 | A closed fenced code block claimed by a specialized decorator (mermaid, queryjs, collection, meta-bind-button)
sym src/lib/core/markdown-editor/extensions/live-preview/parsers/fenced-code-block.ts:128 fn findSpecialFenceBlocks(state: EditorState, language: string, fenceChars: string): SpecialFenceBlock[] L19 | Finds the closed fenced code blocks whose info string is exactly `language` and whose fence character is one of `fenceChars` (e.g. "`" or "`~").
by src/lib/core/markdown-editor/extensions/live-preview/parsers/fenced-code-block.ts:findSpecialFenceBlocks <- src/lib/core/markdown-editor/extensions/live-preview/parsers/collection-block.ts:23 in findAllCollectionBlocks call
by src/lib/core/markdown-editor/extensions/live-preview/parsers/fenced-code-block.ts:findSpecialFenceBlocks <- src/lib/core/markdown-editor/extensions/live-preview/parsers/mermaid.ts:23 in findAllMermaidBlocks call
by src/lib/core/markdown-editor/extensions/live-preview/parsers/fenced-code-block.ts:findSpecialFenceBlocks <- src/lib/core/markdown-editor/extensions/live-preview/parsers/meta-bind-button.ts:23 in findAllMetaBindButtonBlocks call
by src/lib/core/markdown-editor/extensions/live-preview/parsers/fenced-code-block.ts:findSpecialFenceBlocks <- src/lib/core/markdown-editor/extensions/live-preview/parsers/queryjs-block.ts:23 in findAllQueryjsBlocks call
## locals
local src/lib/core/markdown-editor/extensions/live-preview/parsers/fenced-code-block.ts:156 fn fenceContent(state: EditorState, fence: SyntaxNode, firstLine: number, lastLine: number): string L13
local src/lib/core/markdown-editor/extensions/live-preview/parsers/fenced-code-block.ts:176 fn startsAtContentColumn(state: EditorState, fence: SyntaxNode): boolean L24
## calls
call src/lib/core/markdown-editor/extensions/live-preview/parsers/fenced-code-block.ts:86 in findAllFencedCodeBlocks -> src/lib/core/markdown-editor/extensions/live-preview/parsers/fenced-code-block.ts:fenceContent call
call src/lib/core/markdown-editor/extensions/live-preview/parsers/fenced-code-block.ts:131 in findSpecialFenceBlocks -> src/lib/core/markdown-editor/extensions/live-preview/parsers/fenced-code-block.ts:findAllFencedCodeBlocks call
call src/lib/core/markdown-editor/extensions/live-preview/parsers/fenced-code-block.ts:136 in findSpecialFenceBlocks -> src/lib/core/markdown-editor/extensions/live-preview/parsers/fenced-code-block.ts:startsAtContentColumn call
