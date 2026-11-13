# file card src/lib/core/markdown-editor/extensions/live-preview/inline/handlers/heading-handler.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/core/markdown-editor/extensions/live-preview/inline/handlers/heading-handler.ts ' codemap/files
file src/lib/core/markdown-editor/extensions/live-preview/inline/handlers/heading-handler.ts other L63 module src/lib/core/markdown-editor in1 t1
## imports
imp src/lib/core/markdown-editor/extensions/live-preview/inline/handlers/heading-handler.ts:1 -> src/lib/core/markdown-editor/extensions/live-preview/styles.ts headingLineDeco,hiddenSyntaxDeco,revealedBlockSyntaxDeco
imp src/lib/core/markdown-editor/extensions/live-preview/inline/handlers/heading-handler.ts:2 -> src/lib/core/markdown-editor/extensions/live-preview/inline/inline-formatting-plugin.ts type:NodeHandler
## imported-by
imp src/lib/core/markdown-editor/extensions/live-preview/inline/inline-extensions.ts:10 -> src/lib/core/markdown-editor/extensions/live-preview/inline/handlers/heading-handler.ts headingHandlers
## reach
in2 src/lib/core/markdown-editor/extensions/live-preview/inline/handlers/heading-handler.ts 1 files in 1 modules: src/lib/core/markdown-editor(1)
out2 src/lib/core/markdown-editor/extensions/live-preview/inline/handlers/heading-handler.ts 6 files in 2 modules: src/lib/core/markdown-editor(5) src/lib/utils(1)
## tests
test src/tests/lib/core/markdown-editor/extensions/live-preview/inline/handlers/heading-handler.test.ts imports src/lib/core/markdown-editor/extensions/live-preview/inline/handlers/heading-handler.ts mirror
## symbols
sym src/lib/core/markdown-editor/extensions/live-preview/inline/handlers/heading-handler.ts:54 const headingHandlers: readonly NodeHandler[] L10 | 8 node handlers covering every heading variant the legacy `headingPlugin` supported: 6 ATX levels + 2 setext levels.
by src/lib/core/markdown-editor/extensions/live-preview/inline/handlers/heading-handler.ts:headingHandlers <- src/lib/core/markdown-editor/extensions/live-preview/inline/inline-extensions.ts:30 in PRODUCTION_NODE_HANDLERS ref +1
## locals
local src/lib/core/markdown-editor/extensions/live-preview/inline/handlers/heading-handler.ts:13 fn makeATXHandler(level: number): NodeHandler L16
local src/lib/core/markdown-editor/extensions/live-preview/inline/handlers/heading-handler.ts:36 fn makeSetextHandler(level: 1 | 2): NodeHandler L13
## calls
call src/lib/core/markdown-editor/extensions/live-preview/inline/handlers/heading-handler.ts:55 in headingHandlers -> src/lib/core/markdown-editor/extensions/live-preview/inline/handlers/heading-handler.ts:makeATXHandler call +5
call src/lib/core/markdown-editor/extensions/live-preview/inline/handlers/heading-handler.ts:61 in headingHandlers -> src/lib/core/markdown-editor/extensions/live-preview/inline/handlers/heading-handler.ts:makeSetextHandler call +1
