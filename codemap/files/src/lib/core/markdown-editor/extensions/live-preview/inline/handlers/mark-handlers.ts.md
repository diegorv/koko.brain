# file card src/lib/core/markdown-editor/extensions/live-preview/inline/handlers/mark-handlers.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/core/markdown-editor/extensions/live-preview/inline/handlers/mark-handlers.ts ' codemap/files
file src/lib/core/markdown-editor/extensions/live-preview/inline/handlers/mark-handlers.ts other L51 module src/lib/core/markdown-editor in1 t1
## imports
imp src/lib/core/markdown-editor/extensions/live-preview/inline/handlers/mark-handlers.ts:1 -> src/lib/core/markdown-editor/extensions/live-preview/styles.ts hiddenSyntaxDeco
imp src/lib/core/markdown-editor/extensions/live-preview/inline/handlers/mark-handlers.ts:2 -> src/lib/core/markdown-editor/extensions/live-preview/inline/inline-formatting-plugin.ts type:NodeHandler
## imported-by
imp src/lib/core/markdown-editor/extensions/live-preview/inline/inline-extensions.ts:19 -> src/lib/core/markdown-editor/extensions/live-preview/inline/handlers/mark-handlers.ts markHandlers,escapeHandler
## reach
in2 src/lib/core/markdown-editor/extensions/live-preview/inline/handlers/mark-handlers.ts 1 files in 1 modules: src/lib/core/markdown-editor(1)
out2 src/lib/core/markdown-editor/extensions/live-preview/inline/handlers/mark-handlers.ts 6 files in 2 modules: src/lib/core/markdown-editor(5) src/lib/utils(1)
## tests
test src/tests/lib/core/markdown-editor/extensions/live-preview/inline/handlers/mark-handlers.test.ts imports src/lib/core/markdown-editor/extensions/live-preview/inline/handlers/mark-handlers.ts mirror
## symbols
sym src/lib/core/markdown-editor/extensions/live-preview/inline/handlers/mark-handlers.ts:32 const markHandlers: readonly NodeHandler[] L6 | Five mark handlers covering the inline formatting marks the legacy `inlineMarksPlugin` toggled.
by src/lib/core/markdown-editor/extensions/live-preview/inline/handlers/mark-handlers.ts:markHandlers <- src/lib/core/markdown-editor/extensions/live-preview/inline/inline-extensions.ts:36 in PRODUCTION_NODE_HANDLERS ref +1
sym src/lib/core/markdown-editor/extensions/live-preview/inline/handlers/mark-handlers.ts:44 const escapeHandler: NodeHandler L8 | Backslash escape sequences (`\*`, `\#`, …) — the `Escape` Lezer node spans `\` plus the escaped character.
by src/lib/core/markdown-editor/extensions/live-preview/inline/handlers/mark-handlers.ts:escapeHandler <- src/lib/core/markdown-editor/extensions/live-preview/inline/inline-extensions.ts:37 in PRODUCTION_NODE_HANDLERS ref +1
## locals
local src/lib/core/markdown-editor/extensions/live-preview/inline/handlers/mark-handlers.ts:12 fn makeMarkHandler(nodeType: string): NodeHandler L11
## calls
call src/lib/core/markdown-editor/extensions/live-preview/inline/handlers/mark-handlers.ts:19 in makeMarkHandler -> src/lib/core/markdown-editor/extensions/live-preview/styles.ts:hiddenSyntaxDeco mcall
call src/lib/core/markdown-editor/extensions/live-preview/inline/handlers/mark-handlers.ts:33 in markHandlers -> src/lib/core/markdown-editor/extensions/live-preview/inline/handlers/mark-handlers.ts:makeMarkHandler call +3
call src/lib/core/markdown-editor/extensions/live-preview/inline/handlers/mark-handlers.ts:49 in escapeHandler.decorate -> src/lib/core/markdown-editor/extensions/live-preview/styles.ts:hiddenSyntaxDeco mcall
