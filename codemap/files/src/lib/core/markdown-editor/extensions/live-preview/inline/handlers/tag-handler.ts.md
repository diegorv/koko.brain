# file card src/lib/core/markdown-editor/extensions/live-preview/inline/handlers/tag-handler.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/core/markdown-editor/extensions/live-preview/inline/handlers/tag-handler.ts ' codemap/files
file src/lib/core/markdown-editor/extensions/live-preview/inline/handlers/tag-handler.ts other L51 module src/lib/core/markdown-editor in1 t1
## imports
imp src/lib/core/markdown-editor/extensions/live-preview/inline/handlers/tag-handler.ts:2 -> src/lib/utils/tag-extraction.ts findInlineTags
imp src/lib/core/markdown-editor/extensions/live-preview/inline/handlers/tag-handler.ts:3 -> src/lib/core/markdown-editor/extensions/live-preview/styles.ts tagDeco
imp src/lib/core/markdown-editor/extensions/live-preview/inline/handlers/tag-handler.ts:4 -> src/lib/core/markdown-editor/extensions/live-preview/core/frontmatter-slice.ts frontmatterSlice
imp src/lib/core/markdown-editor/extensions/live-preview/inline/handlers/tag-handler.ts:5 -> src/lib/core/markdown-editor/extensions/live-preview/inline/inline-formatting-plugin.ts type:LineHandler
## imported-by
imp src/lib/core/markdown-editor/extensions/live-preview/inline/inline-extensions.ts:18 -> src/lib/core/markdown-editor/extensions/live-preview/inline/handlers/tag-handler.ts tagHandler
## reach
in2 src/lib/core/markdown-editor/extensions/live-preview/inline/handlers/tag-handler.ts 1 files in 1 modules: src/lib/core/markdown-editor(1)
out2 src/lib/core/markdown-editor/extensions/live-preview/inline/handlers/tag-handler.ts 6 files in 2 modules: src/lib/core/markdown-editor(5) src/lib/utils(1)
## tests
test src/tests/lib/core/markdown-editor/extensions/live-preview/inline/handlers/tag-handler.test.ts imports src/lib/core/markdown-editor/extensions/live-preview/inline/handlers/tag-handler.ts mirror
## symbols
sym src/lib/core/markdown-editor/extensions/live-preview/inline/handlers/tag-handler.ts:22 const tagHandler: LineHandler L30 | Styles body `#tags` as pills (`cm-lp-tag`), by the indexer's rule (`findInlineTags`).
by src/lib/core/markdown-editor/extensions/live-preview/inline/handlers/tag-handler.ts:tagHandler <- src/lib/core/markdown-editor/extensions/live-preview/inline/inline-extensions.ts:50 in PRODUCTION_LINE_HANDLERS ref
## calls
call src/lib/core/markdown-editor/extensions/live-preview/inline/handlers/tag-handler.ts:25 in tagHandler.decorate -> src/lib/utils/tag-extraction.ts:findInlineTags call
call src/lib/core/markdown-editor/extensions/live-preview/inline/handlers/tag-handler.ts:30 in tagHandler.decorate -> src/lib/core/markdown-editor/extensions/live-preview/core/frontmatter-slice.ts:frontmatterSlice call
call src/lib/core/markdown-editor/extensions/live-preview/inline/handlers/tag-handler.ts:48 in tagHandler.decorate -> src/lib/core/markdown-editor/extensions/live-preview/styles.ts:tagDeco mcall
