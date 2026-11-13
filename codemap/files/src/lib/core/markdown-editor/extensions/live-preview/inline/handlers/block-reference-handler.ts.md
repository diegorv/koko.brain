# file card src/lib/core/markdown-editor/extensions/live-preview/inline/handlers/block-reference-handler.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/core/markdown-editor/extensions/live-preview/inline/handlers/block-reference-handler.ts ' codemap/files
file src/lib/core/markdown-editor/extensions/live-preview/inline/handlers/block-reference-handler.ts other L25 module src/lib/core/markdown-editor in1 t1
## imports
imp src/lib/core/markdown-editor/extensions/live-preview/inline/handlers/block-reference-handler.ts:2 -> src/lib/core/markdown-editor/extensions/live-preview/parsers/block-reference.ts findBlockReference
imp src/lib/core/markdown-editor/extensions/live-preview/inline/handlers/block-reference-handler.ts:3 -> src/lib/core/markdown-editor/extensions/live-preview/inline/inline-formatting-plugin.ts type:LineHandler
## imported-by
imp src/lib/core/markdown-editor/extensions/live-preview/inline/inline-extensions.ts:13 -> src/lib/core/markdown-editor/extensions/live-preview/inline/handlers/block-reference-handler.ts blockReferenceHandler
## reach
in2 src/lib/core/markdown-editor/extensions/live-preview/inline/handlers/block-reference-handler.ts 1 files in 1 modules: src/lib/core/markdown-editor(1)
out2 src/lib/core/markdown-editor/extensions/live-preview/inline/handlers/block-reference-handler.ts 5 files in 1 modules: src/lib/core/markdown-editor(5)
## tests
test src/tests/lib/core/markdown-editor/extensions/live-preview/inline/handlers/block-reference-handler.test.ts imports src/lib/core/markdown-editor/extensions/live-preview/inline/handlers/block-reference-handler.ts mirror
## symbols
sym src/lib/core/markdown-editor/extensions/live-preview/inline/handlers/block-reference-handler.ts:15 const blockReferenceHandler: LineHandler L11 | Hides block-reference suffixes (` ^block-id`) at end-of-line.
by src/lib/core/markdown-editor/extensions/live-preview/inline/handlers/block-reference-handler.ts:blockReferenceHandler <- src/lib/core/markdown-editor/extensions/live-preview/inline/inline-extensions.ts:47 in PRODUCTION_LINE_HANDLERS ref
## calls
call src/lib/core/markdown-editor/extensions/live-preview/inline/handlers/block-reference-handler.ts:18 in blockReferenceHandler.decorate -> src/lib/core/markdown-editor/extensions/live-preview/parsers/block-reference.ts:findBlockReference call
