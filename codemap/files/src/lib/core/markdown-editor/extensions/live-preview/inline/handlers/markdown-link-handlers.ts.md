# file card src/lib/core/markdown-editor/extensions/live-preview/inline/handlers/markdown-link-handlers.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/core/markdown-editor/extensions/live-preview/inline/handlers/markdown-link-handlers.ts ' codemap/files
file src/lib/core/markdown-editor/extensions/live-preview/inline/handlers/markdown-link-handlers.ts other L70 module src/lib/core/markdown-editor in1 t1
## imports
imp src/lib/core/markdown-editor/extensions/live-preview/inline/handlers/markdown-link-handlers.ts:2 -> src/lib/core/markdown-editor/extensions/live-preview/styles.ts hiddenSyntaxDeco,linkTextDeco
imp src/lib/core/markdown-editor/extensions/live-preview/inline/handlers/markdown-link-handlers.ts:3 -> src/lib/core/markdown-editor/extensions/live-preview/inline/inline-formatting-plugin.ts type:NodeHandler
## imported-by
imp src/lib/core/markdown-editor/extensions/live-preview/inline/inline-extensions.ts:15 -> src/lib/core/markdown-editor/extensions/live-preview/inline/handlers/markdown-link-handlers.ts linkHandler,linkReferenceHandler
## reach
in2 src/lib/core/markdown-editor/extensions/live-preview/inline/handlers/markdown-link-handlers.ts 1 files in 1 modules: src/lib/core/markdown-editor(1)
out2 src/lib/core/markdown-editor/extensions/live-preview/inline/handlers/markdown-link-handlers.ts 6 files in 2 modules: src/lib/core/markdown-editor(5) src/lib/utils(1)
## tests
test src/tests/lib/core/markdown-editor/extensions/live-preview/inline/handlers/markdown-link-handlers.test.ts imports src/lib/core/markdown-editor/extensions/live-preview/inline/handlers/markdown-link-handlers.ts mirror
## symbols
sym src/lib/core/markdown-editor/extensions/live-preview/inline/handlers/markdown-link-handlers.ts:22 const linkHandler: NodeHandler L37 | Markdown link `[text](url)` and reference link `[text][ref]`.
by src/lib/core/markdown-editor/extensions/live-preview/inline/handlers/markdown-link-handlers.ts:linkHandler <- src/lib/core/markdown-editor/extensions/live-preview/inline/inline-extensions.ts:33 in PRODUCTION_NODE_HANDLERS ref +1
sym src/lib/core/markdown-editor/extensions/live-preview/inline/handlers/markdown-link-handlers.ts:64 const linkReferenceHandler: NodeHandler L7 | Reference link **definition** `[ref]: url`.
by src/lib/core/markdown-editor/extensions/live-preview/inline/handlers/markdown-link-handlers.ts:linkReferenceHandler <- src/lib/core/markdown-editor/extensions/live-preview/inline/inline-extensions.ts:34 in PRODUCTION_NODE_HANDLERS ref +1
## calls
call src/lib/core/markdown-editor/extensions/live-preview/inline/handlers/markdown-link-handlers.ts:54 in linkHandler.decorate -> src/lib/core/markdown-editor/extensions/live-preview/styles.ts:hiddenSyntaxDeco mcall +1
call src/lib/core/markdown-editor/extensions/live-preview/inline/handlers/markdown-link-handlers.ts:55 in linkHandler.decorate -> src/lib/core/markdown-editor/extensions/live-preview/styles.ts:linkTextDeco mcall
