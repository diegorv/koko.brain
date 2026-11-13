# file card src/lib/core/markdown-editor/extensions/live-preview/styles.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/core/markdown-editor/extensions/live-preview/styles.ts ' codemap/files
file src/lib/core/markdown-editor/extensions/live-preview/styles.ts other L1006 module src/lib/core/markdown-editor in16 t6
## imports
imp src/lib/core/markdown-editor/extensions/live-preview/styles.ts:3 -> src/lib/utils/font-stacks.ts MONO_FONT_STACK
## imported-by
imp src/lib/core/markdown-editor/extensions/live-preview/core/hide-lines.ts:3 -> src/lib/core/markdown-editor/extensions/live-preview/styles.ts hiddenLineDeco
imp src/lib/core/markdown-editor/extensions/live-preview/inline/handlers/autolink-handlers.ts:2 -> src/lib/core/markdown-editor/extensions/live-preview/styles.ts hiddenSyntaxDeco,linkTextDeco
imp src/lib/core/markdown-editor/extensions/live-preview/inline/handlers/blockquote-handler.ts:2 -> src/lib/core/markdown-editor/extensions/live-preview/styles.ts blockquoteLineDeco,hiddenSyntaxDeco,revealedBlockSyntaxDeco
imp src/lib/core/markdown-editor/extensions/live-preview/inline/handlers/heading-handler.ts:1 -> src/lib/core/markdown-editor/extensions/live-preview/styles.ts headingLineDeco,hiddenSyntaxDeco,revealedBlockSyntaxDeco
imp src/lib/core/markdown-editor/extensions/live-preview/inline/handlers/highlight-handler.ts:1 -> src/lib/core/markdown-editor/extensions/live-preview/styles.ts highlightTextDeco
imp src/lib/core/markdown-editor/extensions/live-preview/inline/handlers/inline-comment-handler.ts:2 -> src/lib/core/markdown-editor/extensions/live-preview/styles.ts hiddenSyntaxDeco
imp src/lib/core/markdown-editor/extensions/live-preview/inline/handlers/mark-handlers.ts:1 -> src/lib/core/markdown-editor/extensions/live-preview/styles.ts hiddenSyntaxDeco
imp src/lib/core/markdown-editor/extensions/live-preview/inline/handlers/markdown-link-handlers.ts:2 -> src/lib/core/markdown-editor/extensions/live-preview/styles.ts hiddenSyntaxDeco,linkTextDeco
imp src/lib/core/markdown-editor/extensions/live-preview/inline/handlers/tag-handler.ts:3 -> src/lib/core/markdown-editor/extensions/live-preview/styles.ts tagDeco
imp src/lib/core/markdown-editor/extensions/live-preview/inline/handlers/wikilink-handler.ts:1 -> src/lib/core/markdown-editor/extensions/live-preview/styles.ts hiddenSyntaxDeco,wikilinkTextDeco
imp src/lib/core/markdown-editor/extensions/live-preview/live-preview.ts:4 -> src/lib/core/markdown-editor/extensions/live-preview/styles.ts livePreviewActiveLineTheme,livePreviewStyles
imp src/lib/core/markdown-editor/extensions/live-preview/plugins/callout-field.ts:7 -> src/lib/core/markdown-editor/extensions/live-preview/styles.ts hiddenLineDeco,hiddenSyntaxDeco,revealedBlockSyntaxDeco
imp src/lib/core/markdown-editor/extensions/live-preview/plugins/code-block-field.ts:9 -> src/lib/core/markdown-editor/extensions/live-preview/styles.ts codeBlockLineDeco
imp src/lib/core/markdown-editor/extensions/live-preview/plugins/footnote-plugin.ts:14 -> src/lib/core/markdown-editor/extensions/live-preview/styles.ts footnoteRefDeco,footnoteDefMarkerDeco,hiddenSyntaxDeco
imp src/lib/core/markdown-editor/extensions/live-preview/plugins/frontmatter-field.ts:5 -> src/lib/core/markdown-editor/extensions/live-preview/styles.ts hiddenGutterMarker
imp src/lib/core/markdown-editor/extensions/live-preview/plugins/table-field.ts:9 -> src/lib/core/markdown-editor/extensions/live-preview/styles.ts tableLineDeco
## reach
in2 src/lib/core/markdown-editor/extensions/live-preview/styles.ts 10 files in 1 modules: src/lib/core/markdown-editor(10)
out2 src/lib/core/markdown-editor/extensions/live-preview/styles.ts 0 files in 0 modules: -
## tests
test src/tests/lib/core/markdown-editor/extensions/live-preview/styles.test.ts imports src/lib/core/markdown-editor/extensions/live-preview/styles.ts mirror
test src/tests/lib/core/markdown-editor/extensions/live-preview/arrow-reveal.test.ts imports src/lib/core/markdown-editor/extensions/live-preview/styles.ts
test src/tests/lib/core/markdown-editor/extensions/live-preview/core/hide-lines.test.ts imports src/lib/core/markdown-editor/extensions/live-preview/styles.ts
test src/tests/lib/core/markdown-editor/extensions/live-preview/plugins/code-block-field.test.ts imports src/lib/core/markdown-editor/extensions/live-preview/styles.ts
test src/tests/lib/core/markdown-editor/extensions/live-preview/plugins/table-field.test.ts imports src/lib/core/markdown-editor/extensions/live-preview/styles.ts
test src/tests/lib/core/markdown-editor/heading-fallbacks.test.ts imports src/lib/core/markdown-editor/extensions/live-preview/styles.ts
## symbols
sym src/lib/core/markdown-editor/extensions/live-preview/styles.ts:11 const hiddenSyntaxDeco = Decoration.replace(…) L1 | Hides markdown syntax (`#`, `>`, `**`, link brackets, `%%comments%%`, …) off the revealed lines.
by src/lib/core/markdown-editor/extensions/live-preview/styles.ts:hiddenSyntaxDeco <- src/lib/core/markdown-editor/extensions/live-preview/inline/handlers/autolink-handlers.ts:14 in autolinkHandler.decorate mcall +1
by src/lib/core/markdown-editor/extensions/live-preview/styles.ts:hiddenSyntaxDeco <- src/lib/core/markdown-editor/extensions/live-preview/inline/handlers/blockquote-handler.ts:47 in blockquoteHandler.decorate ref
by src/lib/core/markdown-editor/extensions/live-preview/styles.ts:hiddenSyntaxDeco <- src/lib/core/markdown-editor/extensions/live-preview/inline/handlers/heading-handler.ts:24 in makeATXHandler ref +1
by src/lib/core/markdown-editor/extensions/live-preview/styles.ts:hiddenSyntaxDeco <- src/lib/core/markdown-editor/extensions/live-preview/inline/handlers/inline-comment-handler.ts:23 in inlineCommentHandler.decorate ref
by src/lib/core/markdown-editor/extensions/live-preview/styles.ts:hiddenSyntaxDeco <- src/lib/core/markdown-editor/extensions/live-preview/inline/handlers/mark-handlers.ts:19 in makeMarkHandler mcall +1
by src/lib/core/markdown-editor/extensions/live-preview/styles.ts:hiddenSyntaxDeco <- src/lib/core/markdown-editor/extensions/live-preview/inline/handlers/markdown-link-handlers.ts:54 in linkHandler.decorate mcall +1
by src/lib/core/markdown-editor/extensions/live-preview/styles.ts:hiddenSyntaxDeco <- src/lib/core/markdown-editor/extensions/live-preview/inline/handlers/wikilink-handler.ts:27 in wikilinkHandler.decorate mcall +3
by src/lib/core/markdown-editor/extensions/live-preview/styles.ts:hiddenSyntaxDeco <- src/lib/core/markdown-editor/extensions/live-preview/plugins/callout-field.ts:193 in computeCallouts ref
more by 1 not shown: src/lib/core/markdown-editor(1): q importers src/lib/core/markdown-editor/extensions/live-preview/styles.ts:hiddenSyntaxDeco
sym src/lib/core/markdown-editor/extensions/live-preview/styles.ts:14 const revealedBlockSyntaxDeco = Decoration.mark(…) L1 | Dims block syntax on a revealed line; pairs with `hiddenSyntaxDeco`.
by src/lib/core/markdown-editor/extensions/live-preview/styles.ts:revealedBlockSyntaxDeco <- src/lib/core/markdown-editor/extensions/live-preview/inline/handlers/blockquote-handler.ts:47 in blockquoteHandler.decorate ref
by src/lib/core/markdown-editor/extensions/live-preview/styles.ts:revealedBlockSyntaxDeco <- src/lib/core/markdown-editor/extensions/live-preview/inline/handlers/heading-handler.ts:24 in makeATXHandler ref +1
by src/lib/core/markdown-editor/extensions/live-preview/styles.ts:revealedBlockSyntaxDeco <- src/lib/core/markdown-editor/extensions/live-preview/plugins/callout-field.ts:193 in computeCallouts ref
sym src/lib/core/markdown-editor/extensions/live-preview/styles.ts:16 const linkTextDeco = Decoration.mark(…) L1
by src/lib/core/markdown-editor/extensions/live-preview/styles.ts:linkTextDeco <- src/lib/core/markdown-editor/extensions/live-preview/inline/handlers/autolink-handlers.ts:15 in autolinkHandler.decorate mcall +1
by src/lib/core/markdown-editor/extensions/live-preview/styles.ts:linkTextDeco <- src/lib/core/markdown-editor/extensions/live-preview/inline/handlers/markdown-link-handlers.ts:55 in linkHandler.decorate mcall
sym src/lib/core/markdown-editor/extensions/live-preview/styles.ts:17 const blockquoteLineDeco = Decoration.line(…) L1
by src/lib/core/markdown-editor/extensions/live-preview/styles.ts:blockquoteLineDeco <- src/lib/core/markdown-editor/extensions/live-preview/inline/handlers/blockquote-handler.ts:8 in blockquoteDepthDeco ref +1
sym src/lib/core/markdown-editor/extensions/live-preview/styles.ts:18 const wikilinkTextDeco = Decoration.mark(…) L1
by src/lib/core/markdown-editor/extensions/live-preview/styles.ts:wikilinkTextDeco <- src/lib/core/markdown-editor/extensions/live-preview/inline/handlers/wikilink-handler.ts:29 in wikilinkHandler.decorate mcall +1
sym src/lib/core/markdown-editor/extensions/live-preview/styles.ts:19 const highlightTextDeco = Decoration.mark(…) L1
by src/lib/core/markdown-editor/extensions/live-preview/styles.ts:highlightTextDeco <- src/lib/core/markdown-editor/extensions/live-preview/inline/handlers/highlight-handler.ts:17 in highlightHandler.decorate mcall
sym src/lib/core/markdown-editor/extensions/live-preview/styles.ts:21 const tagDeco = Decoration.mark(…) L1 | Pill on a body `#tag` (`#` included); the same style for every tag.
by src/lib/core/markdown-editor/extensions/live-preview/styles.ts:tagDeco <- src/lib/core/markdown-editor/extensions/live-preview/inline/handlers/tag-handler.ts:48 in tagHandler.decorate mcall
sym src/lib/core/markdown-editor/extensions/live-preview/styles.ts:22 const footnoteRefDeco = Decoration.mark(…) L1
by src/lib/core/markdown-editor/extensions/live-preview/styles.ts:footnoteRefDeco <- src/lib/core/markdown-editor/extensions/live-preview/plugins/footnote-plugin.ts:77 in buildFootnoteDecorations mcall +1
sym src/lib/core/markdown-editor/extensions/live-preview/styles.ts:23 const footnoteDefMarkerDeco = Decoration.mark(…) L1
by src/lib/core/markdown-editor/extensions/live-preview/styles.ts:footnoteDefMarkerDeco <- src/lib/core/markdown-editor/extensions/live-preview/plugins/footnote-plugin.ts:83 in buildFootnoteDecorations mcall
sym src/lib/core/markdown-editor/extensions/live-preview/styles.ts:24 const hiddenLineDeco = Decoration.line(…) L1
by src/lib/core/markdown-editor/extensions/live-preview/styles.ts:hiddenLineDeco <- src/lib/core/markdown-editor/extensions/live-preview/core/hide-lines.ts:17 in hideLines ref
by src/lib/core/markdown-editor/extensions/live-preview/styles.ts:hiddenLineDeco <- src/lib/core/markdown-editor/extensions/live-preview/plugins/callout-field.ts:240 in computeCallouts mcall
sym src/lib/core/markdown-editor/extensions/live-preview/styles.ts:37 const CODE_BLOCK_FONT_SIZE L1 | Code text size, relative to the body.
sym src/lib/core/markdown-editor/extensions/live-preview/styles.ts:39 const TABLE_FONT_SIZE L1 | Table text size, relative to the body; shared by the widget and the revealed source lines.
sym src/lib/core/markdown-editor/extensions/live-preview/styles.ts:44 const codeBlockLineDeco = Decoration.line(…) L1 | Every line of a revealed code block.
by src/lib/core/markdown-editor/extensions/live-preview/styles.ts:codeBlockLineDeco <- src/lib/core/markdown-editor/extensions/live-preview/plugins/code-block-field.ts:20 in markCodeLines ref
sym src/lib/core/markdown-editor/extensions/live-preview/styles.ts:46 const tableLineDeco = Decoration.line(…) L1 | Every line of a revealed table; a line decoration for the same reason as `codeBlockLineDeco`.
by src/lib/core/markdown-editor/extensions/live-preview/styles.ts:tableLineDeco <- src/lib/core/markdown-editor/extensions/live-preview/plugins/table-field.ts:26 in computeTables ref
sym src/lib/core/markdown-editor/extensions/live-preview/styles.ts:54 const hiddenGutterMarker L1 | Singleton gutter marker for hiding gutter elements on collapsed lines
by src/lib/core/markdown-editor/extensions/live-preview/styles.ts:hiddenGutterMarker <- src/lib/core/markdown-editor/extensions/live-preview/plugins/frontmatter-field.ts:209 in frontmatterGutter ref
sym src/lib/core/markdown-editor/extensions/live-preview/styles.ts:56 const headingLineDeco: Record<number, Decoration> L8
by src/lib/core/markdown-editor/extensions/live-preview/styles.ts:headingLineDeco <- src/lib/core/markdown-editor/extensions/live-preview/inline/handlers/heading-handler.ts:18 in makeATXHandler ref +1
sym src/lib/core/markdown-editor/extensions/live-preview/styles.ts:83 const livePreviewActiveLineTheme = EditorView.theme(…) L17 | Live preview paints no cursor-line fill: the cursor lands on the blank line after the hidden frontmatter when a note opens, and the fill showed as an empty sla…
by src/lib/core/markdown-editor/extensions/live-preview/styles.ts:livePreviewActiveLineTheme <- src/lib/core/markdown-editor/extensions/live-preview/live-preview.ts:101 in livePreviewExtensions ref
sym src/lib/core/markdown-editor/extensions/live-preview/styles.ts:101 const livePreviewStyles = EditorView.baseTheme(…) L906
by src/lib/core/markdown-editor/extensions/live-preview/styles.ts:livePreviewStyles <- src/lib/core/markdown-editor/extensions/live-preview/live-preview.ts:101 in livePreviewExtensions ref
