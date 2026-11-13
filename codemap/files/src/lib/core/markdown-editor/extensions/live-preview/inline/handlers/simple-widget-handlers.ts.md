# file card src/lib/core/markdown-editor/extensions/live-preview/inline/handlers/simple-widget-handlers.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/core/markdown-editor/extensions/live-preview/inline/handlers/simple-widget-handlers.ts ' codemap/files
file src/lib/core/markdown-editor/extensions/live-preview/inline/handlers/simple-widget-handlers.ts other L132 module src/lib/core/markdown-editor in1 t2
## imports
imp src/lib/core/markdown-editor/extensions/live-preview/inline/handlers/simple-widget-handlers.ts:2 -> src/lib/core/markdown-editor/extensions/live-preview/widgets.ts TaskCheckboxWidget,OrderedListMarkerWidget,UnorderedListMarkerWidget
imp src/lib/core/markdown-editor/extensions/live-preview/inline/handlers/simple-widget-handlers.ts:3 -> src/lib/core/markdown-editor/extensions/live-preview/widgets/math-widget.ts MathWidget
imp src/lib/core/markdown-editor/extensions/live-preview/inline/handlers/simple-widget-handlers.ts:4 -> src/lib/core/markdown-editor/extensions/live-preview/inline/inline-formatting-plugin.ts type:NodeHandler
## imported-by
imp src/lib/core/markdown-editor/extensions/live-preview/inline/inline-extensions.ts:14 -> src/lib/core/markdown-editor/extensions/live-preview/inline/handlers/simple-widget-handlers.ts simpleWidgetHandlers
## reach
in2 src/lib/core/markdown-editor/extensions/live-preview/inline/handlers/simple-widget-handlers.ts 1 files in 1 modules: src/lib/core/markdown-editor(1)
out2 src/lib/core/markdown-editor/extensions/live-preview/inline/handlers/simple-widget-handlers.ts 20 files in 3 modules: src/lib/core/markdown-editor(15) src/lib/utils(3) src/lib/core/frontmatter(2)
## tests
test src/tests/lib/core/markdown-editor/extensions/live-preview/inline/handlers/simple-widget-handlers.test.ts imports src/lib/core/markdown-editor/extensions/live-preview/inline/handlers/simple-widget-handlers.ts mirror
test src/tests/lib/core/markdown-editor/extensions/live-preview/inline/handlers/blockquote-handler.test.ts imports src/lib/core/markdown-editor/extensions/live-preview/inline/handlers/simple-widget-handlers.ts
## symbols
sym src/lib/core/markdown-editor/extensions/live-preview/inline/handlers/simple-widget-handlers.ts:19 const taskMarkerHandler: NodeHandler L14 | TaskMarker (`[ ]` / `[x]`) → checkbox widget (when cursor not on line).
sym src/lib/core/markdown-editor/extensions/live-preview/inline/handlers/simple-widget-handlers.ts:35 const horizontalRuleHandler: NodeHandler L12 | HorizontalRule (`---` / `***` / `___`) → hidden text + line border.
sym src/lib/core/markdown-editor/extensions/live-preview/inline/handlers/simple-widget-handlers.ts:57 const listMarkHandler: NodeHandler L43 | ListMark — dispatch by parent context. - Task list item → hide `- ` so only the checkbox shows - OrderedList item → replace `1. ` with styled-number widget - B…
sym src/lib/core/markdown-editor/extensions/live-preview/inline/handlers/simple-widget-handlers.ts:102 const hardBreakHandler: NodeHandler L10 | HardBreak (trailing spaces / `\`) → hide source, ::after shows `↵`.
sym src/lib/core/markdown-editor/extensions/live-preview/inline/handlers/simple-widget-handlers.ts:114 const inlineMathHandler: NodeHandler L10 | InlineMath (`$formula$`) → KaTeX widget (when its line is not touched).
sym src/lib/core/markdown-editor/extensions/live-preview/inline/handlers/simple-widget-handlers.ts:126 const simpleWidgetHandlers: readonly NodeHandler[] L7 | All 5 simple-widget handlers, registered as a single bundle.
by src/lib/core/markdown-editor/extensions/live-preview/inline/handlers/simple-widget-handlers.ts:simpleWidgetHandlers <- src/lib/core/markdown-editor/extensions/live-preview/inline/inline-extensions.ts:32 in PRODUCTION_NODE_HANDLERS ref +1
## calls
call src/lib/core/markdown-editor/extensions/live-preview/inline/handlers/simple-widget-handlers.ts:28 in taskMarkerHandler.decorate -> src/lib/core/markdown-editor/extensions/live-preview/widgets.ts:TaskCheckboxWidget new
call src/lib/core/markdown-editor/extensions/live-preview/inline/handlers/simple-widget-handlers.ts:86 in listMarkHandler.decorate -> src/lib/core/markdown-editor/extensions/live-preview/widgets.ts:OrderedListMarkerWidget new
call src/lib/core/markdown-editor/extensions/live-preview/inline/handlers/simple-widget-handlers.ts:94 in listMarkHandler.decorate -> src/lib/core/markdown-editor/extensions/live-preview/widgets.ts:UnorderedListMarkerWidget new
call src/lib/core/markdown-editor/extensions/live-preview/inline/handlers/simple-widget-handlers.ts:120 in inlineMathHandler.decorate -> src/lib/core/markdown-editor/extensions/live-preview/widgets/math-widget.ts:MathWidget new
