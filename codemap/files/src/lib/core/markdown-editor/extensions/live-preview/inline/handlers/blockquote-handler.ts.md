# file card src/lib/core/markdown-editor/extensions/live-preview/inline/handlers/blockquote-handler.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/core/markdown-editor/extensions/live-preview/inline/handlers/blockquote-handler.ts ' codemap/files
file src/lib/core/markdown-editor/extensions/live-preview/inline/handlers/blockquote-handler.ts other L50 module src/lib/core/markdown-editor in1 t1
## imports
imp src/lib/core/markdown-editor/extensions/live-preview/inline/handlers/blockquote-handler.ts:2 -> src/lib/core/markdown-editor/extensions/live-preview/styles.ts blockquoteLineDeco,hiddenSyntaxDeco,revealedBlockSyntaxDeco
imp src/lib/core/markdown-editor/extensions/live-preview/inline/handlers/blockquote-handler.ts:3 -> src/lib/core/markdown-editor/extensions/live-preview/parsers/blockquote.ts findBlockquoteMarkRange
imp src/lib/core/markdown-editor/extensions/live-preview/inline/handlers/blockquote-handler.ts:4 -> src/lib/core/markdown-editor/extensions/live-preview/inline/inline-formatting-plugin.ts type:NodeHandler
## imported-by
imp src/lib/core/markdown-editor/extensions/live-preview/inline/inline-extensions.ts:11 -> src/lib/core/markdown-editor/extensions/live-preview/inline/handlers/blockquote-handler.ts blockquoteHandler
## reach
in2 src/lib/core/markdown-editor/extensions/live-preview/inline/handlers/blockquote-handler.ts 1 files in 1 modules: src/lib/core/markdown-editor(1)
out2 src/lib/core/markdown-editor/extensions/live-preview/inline/handlers/blockquote-handler.ts 7 files in 2 modules: src/lib/core/markdown-editor(6) src/lib/utils(1)
## tests
test src/tests/lib/core/markdown-editor/extensions/live-preview/inline/handlers/blockquote-handler.test.ts imports src/lib/core/markdown-editor/extensions/live-preview/inline/handlers/blockquote-handler.ts mirror
## symbols
sym src/lib/core/markdown-editor/extensions/live-preview/inline/handlers/blockquote-handler.ts:27 const blockquoteHandler: NodeHandler L24 | Decorates blockquotes with depth-aware line styling and cursor-aware mark visibility.
by src/lib/core/markdown-editor/extensions/live-preview/inline/handlers/blockquote-handler.ts:blockquoteHandler <- src/lib/core/markdown-editor/extensions/live-preview/inline/inline-extensions.ts:31 in PRODUCTION_NODE_HANDLERS ref +1
## calls
call src/lib/core/markdown-editor/extensions/live-preview/inline/handlers/blockquote-handler.ts:39 in blockquoteHandler.decorate -> src/lib/core/markdown-editor/extensions/live-preview/parsers/blockquote.ts:findBlockquoteMarkRange call
