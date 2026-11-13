# file card src/lib/core/markdown-editor/extensions/live-preview/inline/handlers/highlight-handler.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/core/markdown-editor/extensions/live-preview/inline/handlers/highlight-handler.ts ' codemap/files
file src/lib/core/markdown-editor/extensions/live-preview/inline/handlers/highlight-handler.ts other L19 module src/lib/core/markdown-editor in1 t2
## imports
imp src/lib/core/markdown-editor/extensions/live-preview/inline/handlers/highlight-handler.ts:1 -> src/lib/core/markdown-editor/extensions/live-preview/styles.ts highlightTextDeco
imp src/lib/core/markdown-editor/extensions/live-preview/inline/handlers/highlight-handler.ts:2 -> src/lib/core/markdown-editor/extensions/live-preview/inline/inline-formatting-plugin.ts type:NodeHandler
## imported-by
imp src/lib/core/markdown-editor/extensions/live-preview/inline/inline-extensions.ts:9 -> src/lib/core/markdown-editor/extensions/live-preview/inline/handlers/highlight-handler.ts highlightHandler
## reach
in2 src/lib/core/markdown-editor/extensions/live-preview/inline/handlers/highlight-handler.ts 1 files in 1 modules: src/lib/core/markdown-editor(1)
out2 src/lib/core/markdown-editor/extensions/live-preview/inline/handlers/highlight-handler.ts 6 files in 2 modules: src/lib/core/markdown-editor(5) src/lib/utils(1)
## tests
test src/tests/lib/core/markdown-editor/extensions/live-preview/inline/handlers/highlight-handler.test.ts imports src/lib/core/markdown-editor/extensions/live-preview/inline/handlers/highlight-handler.ts mirror
test src/tests/lib/core/markdown-editor/extensions/live-preview/invariants-harness.test.ts mocks src/lib/core/markdown-editor/extensions/live-preview/inline/handlers/highlight-handler.ts
## symbols
sym src/lib/core/markdown-editor/extensions/live-preview/inline/handlers/highlight-handler.ts:14 const highlightHandler: NodeHandler L6 | Decorates `==text==` highlight ranges.
by src/lib/core/markdown-editor/extensions/live-preview/inline/handlers/highlight-handler.ts:highlightHandler <- src/lib/core/markdown-editor/extensions/live-preview/inline/inline-extensions.ts:29 in PRODUCTION_NODE_HANDLERS ref +1
## calls
call src/lib/core/markdown-editor/extensions/live-preview/inline/handlers/highlight-handler.ts:17 in highlightHandler.decorate -> src/lib/core/markdown-editor/extensions/live-preview/styles.ts:highlightTextDeco mcall
