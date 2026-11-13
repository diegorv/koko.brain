# file card src/lib/core/markdown-editor/extensions/live-preview/code-highlight.logic.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/core/markdown-editor/extensions/live-preview/code-highlight.logic.ts ' codemap/files
file src/lib/core/markdown-editor/extensions/live-preview/code-highlight.logic.ts logic L47 module src/lib/core/markdown-editor in1 t1
## imported-by
imp src/lib/core/markdown-editor/extensions/live-preview/widgets/code-block-widget.ts:2 -> src/lib/core/markdown-editor/extensions/live-preview/code-highlight.logic.ts highlightCode
## reach
in2 src/lib/core/markdown-editor/extensions/live-preview/code-highlight.logic.ts 1 files in 1 modules: src/lib/core/markdown-editor(1)
out2 src/lib/core/markdown-editor/extensions/live-preview/code-highlight.logic.ts 0 files in 0 modules: -
## tests
test src/tests/lib/core/markdown-editor/extensions/live-preview/code-highlight.logic.test.ts imports src/lib/core/markdown-editor/extensions/live-preview/code-highlight.logic.ts mirror
## symbols
sym src/lib/core/markdown-editor/extensions/live-preview/code-highlight.logic.ts:28 interface HighlightResult L4 | Result of syntax highlighting
sym src/lib/core/markdown-editor/extensions/live-preview/code-highlight.logic.ts:38 fn highlightCode(code: string, language?: string): HighlightResult L10 | Highlights code using lowlight (highlight.js wrapper).
by src/lib/core/markdown-editor/extensions/live-preview/code-highlight.logic.ts:highlightCode <- src/lib/core/markdown-editor/extensions/live-preview/widgets/code-block-widget.ts:112 in CodeBlockWidget.toDOM call
## locals
local src/lib/core/markdown-editor/extensions/live-preview/code-highlight.logic.ts:8 fn escapeHtml(text: string): string L3
local src/lib/core/markdown-editor/extensions/live-preview/code-highlight.logic.ts:13 fn hastToHtml(node: Root | Element | Text): string L13
## calls
call src/lib/core/markdown-editor/extensions/live-preview/code-highlight.logic.ts:14 in hastToHtml -> src/lib/core/markdown-editor/extensions/live-preview/code-highlight.logic.ts:escapeHtml call
call src/lib/core/markdown-editor/extensions/live-preview/code-highlight.logic.ts:18 in hastToHtml -> src/lib/core/markdown-editor/extensions/live-preview/code-highlight.logic.ts:hastToHtml call +1
call src/lib/core/markdown-editor/extensions/live-preview/code-highlight.logic.ts:43 in highlightCode -> src/lib/core/markdown-editor/extensions/live-preview/code-highlight.logic.ts:hastToHtml call
call src/lib/core/markdown-editor/extensions/live-preview/code-highlight.logic.ts:46 in highlightCode -> src/lib/core/markdown-editor/extensions/live-preview/code-highlight.logic.ts:escapeHtml call
