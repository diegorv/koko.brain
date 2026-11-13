# file card src/lib/core/markdown-editor/extensions/live-preview/inline/handlers/autolink-handlers.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/core/markdown-editor/extensions/live-preview/inline/handlers/autolink-handlers.ts ' codemap/files
file src/lib/core/markdown-editor/extensions/live-preview/inline/handlers/autolink-handlers.ts other L49 module src/lib/core/markdown-editor in1 t1
## imports
imp src/lib/core/markdown-editor/extensions/live-preview/inline/handlers/autolink-handlers.ts:2 -> src/lib/core/markdown-editor/extensions/live-preview/styles.ts hiddenSyntaxDeco,linkTextDeco
imp src/lib/core/markdown-editor/extensions/live-preview/inline/handlers/autolink-handlers.ts:3 -> src/lib/core/markdown-editor/extensions/live-preview/parsers/link.ts findExtendedAutolinkRanges
imp src/lib/core/markdown-editor/extensions/live-preview/inline/handlers/autolink-handlers.ts:4 -> src/lib/core/markdown-editor/extensions/live-preview/inline/inline-formatting-plugin.ts type:NodeHandler,type:LineHandler
## imported-by
imp src/lib/core/markdown-editor/extensions/live-preview/inline/inline-extensions.ts:16 -> src/lib/core/markdown-editor/extensions/live-preview/inline/handlers/autolink-handlers.ts autolinkHandler,extendedAutolinkHandler
## reach
in2 src/lib/core/markdown-editor/extensions/live-preview/inline/handlers/autolink-handlers.ts 1 files in 1 modules: src/lib/core/markdown-editor(1)
out2 src/lib/core/markdown-editor/extensions/live-preview/inline/handlers/autolink-handlers.ts 6 files in 2 modules: src/lib/core/markdown-editor(5) src/lib/utils(1)
## tests
test src/tests/lib/core/markdown-editor/extensions/live-preview/inline/handlers/autolink-handlers.test.ts imports src/lib/core/markdown-editor/extensions/live-preview/inline/handlers/autolink-handlers.ts mirror
## symbols
sym src/lib/core/markdown-editor/extensions/live-preview/inline/handlers/autolink-handlers.ts:10 const autolinkHandler: NodeHandler L9 | Autolink `<url>` / `<email>` — Lezer node `Autolink`.
by src/lib/core/markdown-editor/extensions/live-preview/inline/handlers/autolink-handlers.ts:autolinkHandler <- src/lib/core/markdown-editor/extensions/live-preview/inline/inline-extensions.ts:35 in PRODUCTION_NODE_HANDLERS ref +1
sym src/lib/core/markdown-editor/extensions/live-preview/inline/handlers/autolink-handlers.ts:26 const extendedAutolinkHandler: LineHandler L24 | Extended autolinks — bare `https://example.com` URLs that don't sit inside `[text](url)`, `<url>`, or `![image](src)`.
by src/lib/core/markdown-editor/extensions/live-preview/inline/handlers/autolink-handlers.ts:extendedAutolinkHandler <- src/lib/core/markdown-editor/extensions/live-preview/inline/inline-extensions.ts:48 in PRODUCTION_LINE_HANDLERS ref +1
## calls
call src/lib/core/markdown-editor/extensions/live-preview/inline/handlers/autolink-handlers.ts:14 in autolinkHandler.decorate -> src/lib/core/markdown-editor/extensions/live-preview/styles.ts:hiddenSyntaxDeco mcall +1
call src/lib/core/markdown-editor/extensions/live-preview/inline/handlers/autolink-handlers.ts:15 in autolinkHandler.decorate -> src/lib/core/markdown-editor/extensions/live-preview/styles.ts:linkTextDeco mcall
call src/lib/core/markdown-editor/extensions/live-preview/inline/handlers/autolink-handlers.ts:41 in extendedAutolinkHandler.decorate -> src/lib/core/markdown-editor/extensions/live-preview/parsers/link.ts:findExtendedAutolinkRanges call
call src/lib/core/markdown-editor/extensions/live-preview/inline/handlers/autolink-handlers.ts:46 in extendedAutolinkHandler.decorate -> src/lib/core/markdown-editor/extensions/live-preview/styles.ts:linkTextDeco mcall
