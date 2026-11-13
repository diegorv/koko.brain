# file card src/lib/core/markdown-editor/extensions/live-preview/inline/inline-formatting-plugin.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/core/markdown-editor/extensions/live-preview/inline/inline-formatting-plugin.ts ' codemap/files
file src/lib/core/markdown-editor/extensions/live-preview/inline/inline-formatting-plugin.ts other L208 module src/lib/core/markdown-editor in12 t13
## imports
imp src/lib/core/markdown-editor/extensions/live-preview/inline/inline-formatting-plugin.ts:5 -> src/lib/core/markdown-editor/extensions/live-preview/core/check-update-action.ts checkUpdateAction,isPureScroll
imp src/lib/core/markdown-editor/extensions/live-preview/inline/inline-formatting-plugin.ts:6 -> src/lib/core/markdown-editor/extensions/live-preview/core/reveal.ts revealPredicate,type:RevealPredicate
imp src/lib/core/markdown-editor/extensions/live-preview/inline/inline-formatting-plugin.ts:7 -> src/lib/core/markdown-editor/extensions/live-preview/core/is-inside-block-context.ts isInsideBlockContext
imp src/lib/core/markdown-editor/extensions/live-preview/inline/inline-formatting-plugin.ts:8 -> src/lib/core/markdown-editor/extensions/live-preview/core/expanded-ranges.ts expandedVisibleRanges
imp src/lib/core/markdown-editor/extensions/live-preview/inline/inline-formatting-plugin.ts:9 -> src/lib/core/markdown-editor/extensions/live-preview/core/profiling.ts editorLog,profileStart,profileEnd
## imported-by
imp src/lib/core/markdown-editor/extensions/live-preview/inline/handlers/autolink-handlers.ts:4 -> src/lib/core/markdown-editor/extensions/live-preview/inline/inline-formatting-plugin.ts type:NodeHandler,type:LineHandler
imp src/lib/core/markdown-editor/extensions/live-preview/inline/handlers/block-reference-handler.ts:3 -> src/lib/core/markdown-editor/extensions/live-preview/inline/inline-formatting-plugin.ts type:LineHandler
imp src/lib/core/markdown-editor/extensions/live-preview/inline/handlers/blockquote-handler.ts:4 -> src/lib/core/markdown-editor/extensions/live-preview/inline/inline-formatting-plugin.ts type:NodeHandler
imp src/lib/core/markdown-editor/extensions/live-preview/inline/handlers/heading-handler.ts:2 -> src/lib/core/markdown-editor/extensions/live-preview/inline/inline-formatting-plugin.ts type:NodeHandler
imp src/lib/core/markdown-editor/extensions/live-preview/inline/handlers/highlight-handler.ts:2 -> src/lib/core/markdown-editor/extensions/live-preview/inline/inline-formatting-plugin.ts type:NodeHandler
imp src/lib/core/markdown-editor/extensions/live-preview/inline/handlers/inline-comment-handler.ts:4 -> src/lib/core/markdown-editor/extensions/live-preview/inline/inline-formatting-plugin.ts type:LineHandler
imp src/lib/core/markdown-editor/extensions/live-preview/inline/handlers/mark-handlers.ts:2 -> src/lib/core/markdown-editor/extensions/live-preview/inline/inline-formatting-plugin.ts type:NodeHandler
imp src/lib/core/markdown-editor/extensions/live-preview/inline/handlers/markdown-link-handlers.ts:3 -> src/lib/core/markdown-editor/extensions/live-preview/inline/inline-formatting-plugin.ts type:NodeHandler
imp src/lib/core/markdown-editor/extensions/live-preview/inline/handlers/simple-widget-handlers.ts:4 -> src/lib/core/markdown-editor/extensions/live-preview/inline/inline-formatting-plugin.ts type:NodeHandler
imp src/lib/core/markdown-editor/extensions/live-preview/inline/handlers/tag-handler.ts:5 -> src/lib/core/markdown-editor/extensions/live-preview/inline/inline-formatting-plugin.ts type:LineHandler
imp src/lib/core/markdown-editor/extensions/live-preview/inline/handlers/wikilink-handler.ts:3 -> src/lib/core/markdown-editor/extensions/live-preview/inline/inline-formatting-plugin.ts type:LineHandler
imp src/lib/core/markdown-editor/extensions/live-preview/inline/inline-extensions.ts:3 -> src/lib/core/markdown-editor/extensions/live-preview/inline/inline-formatting-plugin.ts makeInlineFormattingPlugin,type:InlineFormattingHandlers,type:NodeHandler,type:LineHandler
## reach
in2 src/lib/core/markdown-editor/extensions/live-preview/inline/inline-formatting-plugin.ts 1 files in 1 modules: src/lib/core/markdown-editor(1)
out2 src/lib/core/markdown-editor/extensions/live-preview/inline/inline-formatting-plugin.ts 2 files in 1 modules: src/lib/core/markdown-editor(2)
## tests
test src/tests/lib/core/markdown-editor/extensions/live-preview/inline/inline-formatting-plugin.test.ts imports src/lib/core/markdown-editor/extensions/live-preview/inline/inline-formatting-plugin.ts mirror
test src/tests/lib/core/markdown-editor/extensions/live-preview/arrow-reveal.test.ts imports src/lib/core/markdown-editor/extensions/live-preview/inline/inline-formatting-plugin.ts
test src/tests/lib/core/markdown-editor/extensions/live-preview/inline/handlers/autolink-handlers.test.ts imports src/lib/core/markdown-editor/extensions/live-preview/inline/inline-formatting-plugin.ts
test src/tests/lib/core/markdown-editor/extensions/live-preview/inline/handlers/block-reference-handler.test.ts imports src/lib/core/markdown-editor/extensions/live-preview/inline/inline-formatting-plugin.ts
test src/tests/lib/core/markdown-editor/extensions/live-preview/inline/handlers/blockquote-handler.test.ts imports src/lib/core/markdown-editor/extensions/live-preview/inline/inline-formatting-plugin.ts
test src/tests/lib/core/markdown-editor/extensions/live-preview/inline/handlers/heading-handler.test.ts imports src/lib/core/markdown-editor/extensions/live-preview/inline/inline-formatting-plugin.ts
test src/tests/lib/core/markdown-editor/extensions/live-preview/inline/handlers/highlight-handler.test.ts imports src/lib/core/markdown-editor/extensions/live-preview/inline/inline-formatting-plugin.ts
test src/tests/lib/core/markdown-editor/extensions/live-preview/inline/handlers/inline-comment-handler.test.ts imports src/lib/core/markdown-editor/extensions/live-preview/inline/inline-formatting-plugin.ts
test src/tests/lib/core/markdown-editor/extensions/live-preview/inline/handlers/mark-handlers.test.ts imports src/lib/core/markdown-editor/extensions/live-preview/inline/inline-formatting-plugin.ts
test src/tests/lib/core/markdown-editor/extensions/live-preview/inline/handlers/markdown-link-handlers.test.ts imports src/lib/core/markdown-editor/extensions/live-preview/inline/inline-formatting-plugin.ts
test src/tests/lib/core/markdown-editor/extensions/live-preview/inline/handlers/simple-widget-handlers.test.ts imports src/lib/core/markdown-editor/extensions/live-preview/inline/inline-formatting-plugin.ts
test src/tests/lib/core/markdown-editor/extensions/live-preview/inline/handlers/tag-handler.test.ts imports src/lib/core/markdown-editor/extensions/live-preview/inline/inline-formatting-plugin.ts
test src/tests/lib/core/markdown-editor/extensions/live-preview/inline/handlers/wikilink-handler.test.ts imports src/lib/core/markdown-editor/extensions/live-preview/inline/inline-formatting-plugin.ts
## symbols
sym src/lib/core/markdown-editor/extensions/live-preview/inline/inline-formatting-plugin.ts:23 interface NodeDecorateArgs L7 | Arguments passed to a node-handler's `decorate` function.
sym src/lib/core/markdown-editor/extensions/live-preview/inline/inline-formatting-plugin.ts:32 interface NodeHandler L6 | Handler that decorates a Lezer node by name.
by src/lib/core/markdown-editor/extensions/live-preview/inline/inline-formatting-plugin.ts:NodeHandler <- src/lib/core/markdown-editor/extensions/live-preview/inline/handlers/autolink-handlers.ts:4 in (module) import
by src/lib/core/markdown-editor/extensions/live-preview/inline/inline-formatting-plugin.ts:NodeHandler <- src/lib/core/markdown-editor/extensions/live-preview/inline/handlers/blockquote-handler.ts:4 in (module) import
by src/lib/core/markdown-editor/extensions/live-preview/inline/inline-formatting-plugin.ts:NodeHandler <- src/lib/core/markdown-editor/extensions/live-preview/inline/handlers/heading-handler.ts:2 in (module) import
by src/lib/core/markdown-editor/extensions/live-preview/inline/inline-formatting-plugin.ts:NodeHandler <- src/lib/core/markdown-editor/extensions/live-preview/inline/handlers/highlight-handler.ts:2 in (module) import
by src/lib/core/markdown-editor/extensions/live-preview/inline/inline-formatting-plugin.ts:NodeHandler <- src/lib/core/markdown-editor/extensions/live-preview/inline/handlers/mark-handlers.ts:2 in (module) import
by src/lib/core/markdown-editor/extensions/live-preview/inline/inline-formatting-plugin.ts:NodeHandler <- src/lib/core/markdown-editor/extensions/live-preview/inline/handlers/markdown-link-handlers.ts:3 in (module) import
by src/lib/core/markdown-editor/extensions/live-preview/inline/inline-formatting-plugin.ts:NodeHandler <- src/lib/core/markdown-editor/extensions/live-preview/inline/handlers/simple-widget-handlers.ts:4 in (module) import
by src/lib/core/markdown-editor/extensions/live-preview/inline/inline-formatting-plugin.ts:NodeHandler <- src/lib/core/markdown-editor/extensions/live-preview/inline/inline-extensions.ts:6 in (module) import
sym src/lib/core/markdown-editor/extensions/live-preview/inline/inline-formatting-plugin.ts:40 interface LineDecorateArgs L7 | Arguments passed to a line-handler's `decorate` function.
sym src/lib/core/markdown-editor/extensions/live-preview/inline/inline-formatting-plugin.ts:53 interface LineHandler L6 | Handler that decorates per-line ranges via regex parsers — used for markdown features that have no Lezer node (`==highlight==`, inline comments `<!-- -->`, blo…
by src/lib/core/markdown-editor/extensions/live-preview/inline/inline-formatting-plugin.ts:LineHandler <- src/lib/core/markdown-editor/extensions/live-preview/inline/handlers/autolink-handlers.ts:4 in (module) import
by src/lib/core/markdown-editor/extensions/live-preview/inline/inline-formatting-plugin.ts:LineHandler <- src/lib/core/markdown-editor/extensions/live-preview/inline/handlers/block-reference-handler.ts:3 in (module) import
by src/lib/core/markdown-editor/extensions/live-preview/inline/inline-formatting-plugin.ts:LineHandler <- src/lib/core/markdown-editor/extensions/live-preview/inline/handlers/inline-comment-handler.ts:4 in (module) import
by src/lib/core/markdown-editor/extensions/live-preview/inline/inline-formatting-plugin.ts:LineHandler <- src/lib/core/markdown-editor/extensions/live-preview/inline/handlers/tag-handler.ts:5 in (module) import
by src/lib/core/markdown-editor/extensions/live-preview/inline/inline-formatting-plugin.ts:LineHandler <- src/lib/core/markdown-editor/extensions/live-preview/inline/handlers/wikilink-handler.ts:3 in (module) import
by src/lib/core/markdown-editor/extensions/live-preview/inline/inline-formatting-plugin.ts:LineHandler <- src/lib/core/markdown-editor/extensions/live-preview/inline/inline-extensions.ts:7 in (module) import
sym src/lib/core/markdown-editor/extensions/live-preview/inline/inline-formatting-plugin.ts:61 interface InlineFormattingHandlers L4 | Bundle of all handlers for one instance of the inline plugin.
by src/lib/core/markdown-editor/extensions/live-preview/inline/inline-formatting-plugin.ts:InlineFormattingHandlers <- src/lib/core/markdown-editor/extensions/live-preview/inline/inline-extensions.ts:5 in (module) import
sym src/lib/core/markdown-editor/extensions/live-preview/inline/inline-formatting-plugin.ts:103 fn buildInlineDecorations(state: EditorState, ranges: readonly { from: number; to: number }[], handlers: InlineFormattingHandlers): DecorationSet L62 | Pure builder — exposed so tests can call it without mounting an EditorView.
sym src/lib/core/markdown-editor/extensions/live-preview/inline/inline-formatting-plugin.ts:176 fn makeInlineFormattingPlugin(handlers: InlineFormattingHandlers): Extension L33 | Factory: returns a `ViewPlugin` that runs the inline pipeline with the given handlers.
by src/lib/core/markdown-editor/extensions/live-preview/inline/inline-formatting-plugin.ts:makeInlineFormattingPlugin <- src/lib/core/markdown-editor/extensions/live-preview/inline/inline-extensions.ts:102 in inlineExtensions call
## locals
local src/lib/core/markdown-editor/extensions/live-preview/inline/inline-formatting-plugin.ts:76 fn runIsolated(handler: NodeHandler | LineHandler, label: string, decorations: Range<Decoration>[], decorate: () => void): void L16
## calls
call src/lib/core/markdown-editor/extensions/live-preview/inline/inline-formatting-plugin.ts:89 in runIsolated -> src/lib/core/markdown-editor/extensions/live-preview/core/profiling.ts:editorLog call
call src/lib/core/markdown-editor/extensions/live-preview/inline/inline-formatting-plugin.ts:121 in buildInlineDecorations -> src/lib/core/markdown-editor/extensions/live-preview/core/reveal.ts:revealPredicate call
call src/lib/core/markdown-editor/extensions/live-preview/inline/inline-formatting-plugin.ts:132 in buildInlineDecorations -> src/lib/core/markdown-editor/extensions/live-preview/core/is-inside-block-context.ts:isInsideBlockContext call +1
call src/lib/core/markdown-editor/extensions/live-preview/inline/inline-formatting-plugin.ts:137 in buildInlineDecorations -> src/lib/core/markdown-editor/extensions/live-preview/inline/inline-formatting-plugin.ts:runIsolated call +1
call src/lib/core/markdown-editor/extensions/live-preview/inline/inline-formatting-plugin.ts:182 in makeInlineFormattingPlugin -> src/lib/core/markdown-editor/extensions/live-preview/inline/inline-formatting-plugin.ts:buildInlineDecorations call +1
call src/lib/core/markdown-editor/extensions/live-preview/inline/inline-formatting-plugin.ts:184 in makeInlineFormattingPlugin -> src/lib/core/markdown-editor/extensions/live-preview/core/expanded-ranges.ts:expandedVisibleRanges call +1
call src/lib/core/markdown-editor/extensions/live-preview/inline/inline-formatting-plugin.ts:192 in makeInlineFormattingPlugin -> src/lib/core/markdown-editor/extensions/live-preview/core/check-update-action.ts:isPureScroll call
call src/lib/core/markdown-editor/extensions/live-preview/inline/inline-formatting-plugin.ts:194 in makeInlineFormattingPlugin -> src/lib/core/markdown-editor/extensions/live-preview/core/check-update-action.ts:checkUpdateAction call
call src/lib/core/markdown-editor/extensions/live-preview/inline/inline-formatting-plugin.ts:197 in makeInlineFormattingPlugin -> src/lib/core/markdown-editor/extensions/live-preview/core/profiling.ts:profileStart call
call src/lib/core/markdown-editor/extensions/live-preview/inline/inline-formatting-plugin.ts:203 in makeInlineFormattingPlugin -> src/lib/core/markdown-editor/extensions/live-preview/core/profiling.ts:profileEnd call
