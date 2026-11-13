# file card src/lib/core/markdown-editor/extensions/live-preview/inline/handlers/wikilink-handler.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/core/markdown-editor/extensions/live-preview/inline/handlers/wikilink-handler.ts ' codemap/files
file src/lib/core/markdown-editor/extensions/live-preview/inline/handlers/wikilink-handler.ts other L46 module src/lib/core/markdown-editor in1 t1
## imports
imp src/lib/core/markdown-editor/extensions/live-preview/inline/handlers/wikilink-handler.ts:1 -> src/lib/core/markdown-editor/extensions/live-preview/styles.ts hiddenSyntaxDeco,wikilinkTextDeco
imp src/lib/core/markdown-editor/extensions/live-preview/inline/handlers/wikilink-handler.ts:2 -> src/lib/core/markdown-editor/extensions/wikilink/decoration.logic.ts findWikilinkRanges
imp src/lib/core/markdown-editor/extensions/live-preview/inline/handlers/wikilink-handler.ts:3 -> src/lib/core/markdown-editor/extensions/live-preview/inline/inline-formatting-plugin.ts type:LineHandler
## imported-by
imp src/lib/core/markdown-editor/extensions/live-preview/inline/inline-extensions.ts:17 -> src/lib/core/markdown-editor/extensions/live-preview/inline/handlers/wikilink-handler.ts wikilinkHandler
## reach
in2 src/lib/core/markdown-editor/extensions/live-preview/inline/handlers/wikilink-handler.ts 1 files in 1 modules: src/lib/core/markdown-editor(1)
out2 src/lib/core/markdown-editor/extensions/live-preview/inline/handlers/wikilink-handler.ts 6 files in 2 modules: src/lib/core/markdown-editor(5) src/lib/utils(1)
## tests
test src/tests/lib/core/markdown-editor/extensions/live-preview/inline/handlers/wikilink-handler.test.ts imports src/lib/core/markdown-editor/extensions/live-preview/inline/handlers/wikilink-handler.ts mirror
## symbols
sym src/lib/core/markdown-editor/extensions/live-preview/inline/handlers/wikilink-handler.ts:17 const wikilinkHandler: LineHandler L30 | Wikilink rendering — `[[target]]`, `[[target#heading]]`, `[[target#^block-id]]`, `[[target|display]]`.
by src/lib/core/markdown-editor/extensions/live-preview/inline/handlers/wikilink-handler.ts:wikilinkHandler <- src/lib/core/markdown-editor/extensions/live-preview/inline/inline-extensions.ts:49 in PRODUCTION_LINE_HANDLERS ref +1
## calls
call src/lib/core/markdown-editor/extensions/live-preview/inline/handlers/wikilink-handler.ts:20 in wikilinkHandler.decorate -> src/lib/core/markdown-editor/extensions/wikilink/decoration.logic.ts:findWikilinkRanges call
call src/lib/core/markdown-editor/extensions/live-preview/inline/handlers/wikilink-handler.ts:27 in wikilinkHandler.decorate -> src/lib/core/markdown-editor/extensions/live-preview/styles.ts:hiddenSyntaxDeco mcall +3
call src/lib/core/markdown-editor/extensions/live-preview/inline/handlers/wikilink-handler.ts:29 in wikilinkHandler.decorate -> src/lib/core/markdown-editor/extensions/live-preview/styles.ts:wikilinkTextDeco mcall +1
