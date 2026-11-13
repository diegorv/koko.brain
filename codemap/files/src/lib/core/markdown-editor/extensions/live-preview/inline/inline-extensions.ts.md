# file card src/lib/core/markdown-editor/extensions/live-preview/inline/inline-extensions.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/core/markdown-editor/extensions/live-preview/inline/inline-extensions.ts ' codemap/files
file src/lib/core/markdown-editor/extensions/live-preview/inline/inline-extensions.ts other L104 module src/lib/core/markdown-editor in1 t2
## imports
imp src/lib/core/markdown-editor/extensions/live-preview/inline/inline-extensions.ts:2 -> src/lib/core/markdown-editor/extensions/live-preview/inline/markdown-highlight-style.ts inlineHighlightExtension
imp src/lib/core/markdown-editor/extensions/live-preview/inline/inline-extensions.ts:3 -> src/lib/core/markdown-editor/extensions/live-preview/inline/inline-formatting-plugin.ts makeInlineFormattingPlugin,type:InlineFormattingHandlers,type:NodeHandler,type:LineHandler
imp src/lib/core/markdown-editor/extensions/live-preview/inline/inline-extensions.ts:9 -> src/lib/core/markdown-editor/extensions/live-preview/inline/handlers/highlight-handler.ts highlightHandler
imp src/lib/core/markdown-editor/extensions/live-preview/inline/inline-extensions.ts:10 -> src/lib/core/markdown-editor/extensions/live-preview/inline/handlers/heading-handler.ts headingHandlers
imp src/lib/core/markdown-editor/extensions/live-preview/inline/inline-extensions.ts:11 -> src/lib/core/markdown-editor/extensions/live-preview/inline/handlers/blockquote-handler.ts blockquoteHandler
imp src/lib/core/markdown-editor/extensions/live-preview/inline/inline-extensions.ts:12 -> src/lib/core/markdown-editor/extensions/live-preview/inline/handlers/inline-comment-handler.ts inlineCommentHandler
imp src/lib/core/markdown-editor/extensions/live-preview/inline/inline-extensions.ts:13 -> src/lib/core/markdown-editor/extensions/live-preview/inline/handlers/block-reference-handler.ts blockReferenceHandler
imp src/lib/core/markdown-editor/extensions/live-preview/inline/inline-extensions.ts:14 -> src/lib/core/markdown-editor/extensions/live-preview/inline/handlers/simple-widget-handlers.ts simpleWidgetHandlers
imp src/lib/core/markdown-editor/extensions/live-preview/inline/inline-extensions.ts:15 -> src/lib/core/markdown-editor/extensions/live-preview/inline/handlers/markdown-link-handlers.ts linkHandler,linkReferenceHandler
imp src/lib/core/markdown-editor/extensions/live-preview/inline/inline-extensions.ts:16 -> src/lib/core/markdown-editor/extensions/live-preview/inline/handlers/autolink-handlers.ts autolinkHandler,extendedAutolinkHandler
imp src/lib/core/markdown-editor/extensions/live-preview/inline/inline-extensions.ts:17 -> src/lib/core/markdown-editor/extensions/live-preview/inline/handlers/wikilink-handler.ts wikilinkHandler
imp src/lib/core/markdown-editor/extensions/live-preview/inline/inline-extensions.ts:18 -> src/lib/core/markdown-editor/extensions/live-preview/inline/handlers/tag-handler.ts tagHandler
imp src/lib/core/markdown-editor/extensions/live-preview/inline/inline-extensions.ts:19 -> src/lib/core/markdown-editor/extensions/live-preview/inline/handlers/mark-handlers.ts markHandlers,escapeHandler
imp src/lib/core/markdown-editor/extensions/live-preview/inline/inline-extensions.ts:20 -> src/lib/core/markdown-editor/extensions/live-preview/core/decorator-names.ts type:InlineHandlerName
## imported-by
imp src/lib/core/markdown-editor/extensions/live-preview/live-preview.ts:31 -> src/lib/core/markdown-editor/extensions/live-preview/inline/inline-extensions.ts inlineExtensions
## reach
in2 src/lib/core/markdown-editor/extensions/live-preview/inline/inline-extensions.ts 1 files in 1 modules: src/lib/core/markdown-editor(1)
out2 src/lib/core/markdown-editor/extensions/live-preview/inline/inline-extensions.ts 15 files in 2 modules: src/lib/core/markdown-editor(14) src/lib/utils(1)
## tests
test src/tests/lib/core/markdown-editor/extensions/live-preview/inline/inline-extensions.test.ts imports src/lib/core/markdown-editor/extensions/live-preview/inline/inline-extensions.ts mirror
test src/tests/lib/core/markdown-editor/extensions/live-preview/arrow-reveal.test.ts imports src/lib/core/markdown-editor/extensions/live-preview/inline/inline-extensions.ts
## symbols
sym src/lib/core/markdown-editor/extensions/live-preview/inline/inline-extensions.ts:28 const PRODUCTION_NODE_HANDLERS: readonly NodeHandler[] L11 | Production node handlers — every NodeHandler the inline pipeline dispatches on Lezer node names.
sym src/lib/core/markdown-editor/extensions/live-preview/inline/inline-extensions.ts:45 const PRODUCTION_LINE_HANDLERS: readonly LineHandler[] L7 | Production line handlers — regex-based parsers for markdown features without a usable Lezer node (inline comments `%%…%%`, block references `^id`, extended aut…
sym src/lib/core/markdown-editor/extensions/live-preview/inline/inline-extensions.ts:76 fn productionHandlers(disabledDecorators: Record<string, boolean> = {}): InlineFormattingHandlers L13 | Applies the Troubleshooting `disabledDecorators` kill-switches to the production registries.
sym src/lib/core/markdown-editor/extensions/live-preview/inline/inline-extensions.ts:99 fn inlineExtensions(disabledDecorators: Record<string, boolean> = {}): Extension[] L6 | Returns the full extension array for the inline pipeline: `HighlightStyle` (tag-based marks/styles) + `inlineFormattingPlugin` (everything that needs cursor re…
by src/lib/core/markdown-editor/extensions/live-preview/inline/inline-extensions.ts:inlineExtensions <- src/lib/core/markdown-editor/extensions/live-preview/live-preview.ts:95 in livePreviewExtensions call
## calls
call src/lib/core/markdown-editor/extensions/live-preview/inline/inline-extensions.ts:101 in inlineExtensions -> src/lib/core/markdown-editor/extensions/live-preview/inline/markdown-highlight-style.ts:inlineHighlightExtension call
call src/lib/core/markdown-editor/extensions/live-preview/inline/inline-extensions.ts:102 in inlineExtensions -> src/lib/core/markdown-editor/extensions/live-preview/inline/inline-extensions.ts:productionHandlers call
call src/lib/core/markdown-editor/extensions/live-preview/inline/inline-extensions.ts:102 in inlineExtensions -> src/lib/core/markdown-editor/extensions/live-preview/inline/inline-formatting-plugin.ts:makeInlineFormattingPlugin call
