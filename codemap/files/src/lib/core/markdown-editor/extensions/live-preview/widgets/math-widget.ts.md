# file card src/lib/core/markdown-editor/extensions/live-preview/widgets/math-widget.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/core/markdown-editor/extensions/live-preview/widgets/math-widget.ts ' codemap/files
file src/lib/core/markdown-editor/extensions/live-preview/widgets/math-widget.ts other L77 module src/lib/core/markdown-editor in3 t1
## imported-by
imp src/lib/app/lifecycle/app-lifecycle.service.ts:85 -> src/lib/core/markdown-editor/extensions/live-preview/widgets/math-widget.ts clearMathCache
imp src/lib/core/markdown-editor/extensions/live-preview/inline/handlers/simple-widget-handlers.ts:3 -> src/lib/core/markdown-editor/extensions/live-preview/widgets/math-widget.ts MathWidget
imp src/lib/core/markdown-editor/extensions/live-preview/plugins/block-math-field.ts:5 -> src/lib/core/markdown-editor/extensions/live-preview/widgets/math-widget.ts MathWidget
## reach
in2 src/lib/core/markdown-editor/extensions/live-preview/widgets/math-widget.ts 3 files in 2 modules: src/lib/core/markdown-editor(2) src/routes(1)
out2 src/lib/core/markdown-editor/extensions/live-preview/widgets/math-widget.ts 0 files in 0 modules: -
## tests
test src/tests/lib/core/markdown-editor/extensions/live-preview/widgets/math-widget.test.ts imports src/lib/core/markdown-editor/extensions/live-preview/widgets/math-widget.ts mirror
## symbols
sym src/lib/core/markdown-editor/extensions/live-preview/widgets/math-widget.ts:13 fn clearMathCache(): void L3 | Drops all cached renders.
by src/lib/core/markdown-editor/extensions/live-preview/widgets/math-widget.ts:clearMathCache <- src/lib/app/lifecycle/app-lifecycle.service.ts:658 in teardownVault call
sym src/lib/core/markdown-editor/extensions/live-preview/widgets/math-widget.ts:19 class MathWidget extends WidgetType L59 | Widget that renders a math formula with KaTeX: `$$...$$` blocks as a centered display `<div>`, inline `$...$` as a `<span>`.
by src/lib/core/markdown-editor/extensions/live-preview/widgets/math-widget.ts:MathWidget <- src/lib/core/markdown-editor/extensions/live-preview/inline/handlers/simple-widget-handlers.ts:120 in inlineMathHandler.decorate new
by src/lib/core/markdown-editor/extensions/live-preview/widgets/math-widget.ts:MathWidget <- src/lib/core/markdown-editor/extensions/live-preview/plugins/block-math-field.ts:20 in computeBlockMath new
