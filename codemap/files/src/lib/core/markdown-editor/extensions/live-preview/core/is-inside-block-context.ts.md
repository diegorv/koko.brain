# file card src/lib/core/markdown-editor/extensions/live-preview/core/is-inside-block-context.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/core/markdown-editor/extensions/live-preview/core/is-inside-block-context.ts ' codemap/files
file src/lib/core/markdown-editor/extensions/live-preview/core/is-inside-block-context.ts other L21 module src/lib/core/markdown-editor in6 t1
## imported-by
imp src/lib/core/markdown-editor/extensions/live-preview/inline/inline-formatting-plugin.ts:7 -> src/lib/core/markdown-editor/extensions/live-preview/core/is-inside-block-context.ts isInsideBlockContext
imp src/lib/core/markdown-editor/extensions/live-preview/plugins/footnote-plugin.ts:12 -> src/lib/core/markdown-editor/extensions/live-preview/core/is-inside-block-context.ts isInsideBlockContext
imp src/lib/core/markdown-editor/extensions/live-preview/plugins/image-plugin.ts:12 -> src/lib/core/markdown-editor/extensions/live-preview/core/is-inside-block-context.ts isInsideBlockContext
imp src/lib/core/markdown-editor/extensions/live-preview/plugins/meta-bind-input-plugin.ts:12 -> src/lib/core/markdown-editor/extensions/live-preview/core/is-inside-block-context.ts isInsideBlockContext
imp src/lib/core/markdown-editor/extensions/live-preview/plugins/wikilink-embed-plugin.ts:12 -> src/lib/core/markdown-editor/extensions/live-preview/core/is-inside-block-context.ts isInsideBlockContext
imp src/lib/core/markdown-editor/wikilink-click-target.ts:4 -> src/lib/core/markdown-editor/extensions/live-preview/core/is-inside-block-context.ts isInsideBlockContext
## reach
in2 src/lib/core/markdown-editor/extensions/live-preview/core/is-inside-block-context.ts 16 files in 1 modules: src/lib/core/markdown-editor(16)
out2 src/lib/core/markdown-editor/extensions/live-preview/core/is-inside-block-context.ts 0 files in 0 modules: -
## tests
test src/tests/lib/core/markdown-editor/extensions/live-preview/core/is-inside-block-context.test.ts imports src/lib/core/markdown-editor/extensions/live-preview/core/is-inside-block-context.ts mirror
## symbols
sym src/lib/core/markdown-editor/extensions/live-preview/core/is-inside-block-context.ts:13 fn isInsideBlockContext(node: SyntaxNodeRef): boolean L9 | Returns true if the given syntax node is inside a block context (code block, HTML block, etc.) where inline markdown decorations should not be applied.
by src/lib/core/markdown-editor/extensions/live-preview/core/is-inside-block-context.ts:isInsideBlockContext <- src/lib/core/markdown-editor/extensions/live-preview/inline/inline-formatting-plugin.ts:132 in buildInlineDecorations call +1
by src/lib/core/markdown-editor/extensions/live-preview/core/is-inside-block-context.ts:isInsideBlockContext <- src/lib/core/markdown-editor/extensions/live-preview/plugins/footnote-plugin.ts:72 in buildFootnoteDecorations call
by src/lib/core/markdown-editor/extensions/live-preview/core/is-inside-block-context.ts:isInsideBlockContext <- src/lib/core/markdown-editor/extensions/live-preview/plugins/image-plugin.ts:114 in buildImageDecorations call
by src/lib/core/markdown-editor/extensions/live-preview/core/is-inside-block-context.ts:isInsideBlockContext <- src/lib/core/markdown-editor/extensions/live-preview/plugins/meta-bind-input-plugin.ts:70 in buildMetaBindInputDecorations call
by src/lib/core/markdown-editor/extensions/live-preview/core/is-inside-block-context.ts:isInsideBlockContext <- src/lib/core/markdown-editor/extensions/live-preview/plugins/wikilink-embed-plugin.ts:74 in buildWikilinkEmbedDecorations call
by src/lib/core/markdown-editor/extensions/live-preview/core/is-inside-block-context.ts:isInsideBlockContext <- src/lib/core/markdown-editor/wikilink-click-target.ts:74 in resolveWikilinkClickPosition call
