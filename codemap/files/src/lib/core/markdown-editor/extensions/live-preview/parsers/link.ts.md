# file card src/lib/core/markdown-editor/extensions/live-preview/parsers/link.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/core/markdown-editor/extensions/live-preview/parsers/link.ts ' codemap/files
file src/lib/core/markdown-editor/extensions/live-preview/parsers/link.ts other L111 module src/lib/core/markdown-editor in2 t2
## imported-by
imp src/lib/core/markdown-editor/extensions/live-preview/click-handler.ts:2 -> src/lib/core/markdown-editor/extensions/live-preview/parsers/link.ts findMarkdownLinkUrlAtPosition
imp src/lib/core/markdown-editor/extensions/live-preview/inline/handlers/autolink-handlers.ts:3 -> src/lib/core/markdown-editor/extensions/live-preview/parsers/link.ts findExtendedAutolinkRanges
## reach
in2 src/lib/core/markdown-editor/extensions/live-preview/parsers/link.ts 2 files in 1 modules: src/lib/core/markdown-editor(2)
out2 src/lib/core/markdown-editor/extensions/live-preview/parsers/link.ts 0 files in 0 modules: -
## tests
test src/tests/lib/core/markdown-editor/extensions/live-preview/parsers/link.test.ts imports src/lib/core/markdown-editor/extensions/live-preview/parsers/link.ts mirror
test src/tests/lib/core/markdown-editor/extensions/live-preview/parsers/combined-link-image-wikilink.test.ts imports src/lib/core/markdown-editor/extensions/live-preview/parsers/link.ts
## symbols
sym src/lib/core/markdown-editor/extensions/live-preview/parsers/link.ts:5 interface ExtendedAutolinkRange L8 | Range positions for a bare URL (extended autolink)
sym src/lib/core/markdown-editor/extensions/live-preview/parsers/link.ts:25 fn findExtendedAutolinkRanges(text: string, offset: number): ExtendedAutolinkRange[] L23 | Finds all bare URL ranges on a single line (extended autolinks).
by src/lib/core/markdown-editor/extensions/live-preview/parsers/link.ts:findExtendedAutolinkRanges <- src/lib/core/markdown-editor/extensions/live-preview/inline/handlers/autolink-handlers.ts:41 in extendedAutolinkHandler.decorate call
sym src/lib/core/markdown-editor/extensions/live-preview/parsers/link.ts:74 fn findMarkdownLinkUrlAtPosition(state: EditorState, from: number, to: number, docPos: number): string | null L38 | Finds the URL of a markdown link at a given document position using the Lezer tree.
by src/lib/core/markdown-editor/extensions/live-preview/parsers/link.ts:findMarkdownLinkUrlAtPosition <- src/lib/core/markdown-editor/extensions/live-preview/click-handler.ts:27 in handleLivePreviewLinkMousedown call
## locals
local src/lib/core/markdown-editor/extensions/live-preview/parsers/link.ts:50 fn trimTrailingPunctuation(url: string): string L19
## calls
call src/lib/core/markdown-editor/extensions/live-preview/parsers/link.ts:35 in findExtendedAutolinkRanges -> src/lib/core/markdown-editor/extensions/live-preview/parsers/link.ts:trimTrailingPunctuation call
