# file card src/lib/core/markdown-editor/extensions/live-preview/widgets/mermaid-widget.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/core/markdown-editor/extensions/live-preview/widgets/mermaid-widget.ts ' codemap/files
file src/lib/core/markdown-editor/extensions/live-preview/widgets/mermaid-widget.ts other L136 module src/lib/core/markdown-editor in2 t2
## imports
imp src/lib/core/markdown-editor/extensions/live-preview/widgets/mermaid-widget.ts:2 -> src/lib/utils/color.ts isDarkColor
imp src/lib/core/markdown-editor/extensions/live-preview/widgets/mermaid-widget.ts:3 -> src/lib/utils/sanitize.ts sanitizeMermaidSvg
## imported-by
imp src/lib/app/lifecycle/app-lifecycle.service.ts:83 -> src/lib/core/markdown-editor/extensions/live-preview/widgets/mermaid-widget.ts clearMermaidCache
imp src/lib/core/markdown-editor/extensions/live-preview/plugins/mermaid-field.ts:5 -> src/lib/core/markdown-editor/extensions/live-preview/widgets/mermaid-widget.ts MermaidWidget
## reach
in2 src/lib/core/markdown-editor/extensions/live-preview/widgets/mermaid-widget.ts 2 files in 2 modules: src/lib/core/markdown-editor(1) src/routes(1)
out2 src/lib/core/markdown-editor/extensions/live-preview/widgets/mermaid-widget.ts 0 files in 0 modules: -
## tests
test src/tests/lib/core/markdown-editor/extensions/live-preview/widgets/mermaid-widget.test.ts imports src/lib/core/markdown-editor/extensions/live-preview/widgets/mermaid-widget.ts mirror
test src/tests/lib/core/markdown-editor/extensions/live-preview/plugins/special-fence-detection.test.ts imports src/lib/core/markdown-editor/extensions/live-preview/widgets/mermaid-widget.ts
## symbols
sym src/lib/core/markdown-editor/extensions/live-preview/widgets/mermaid-widget.ts:50 fn clearMermaidCache(): void L3 | Drops all cached renders.
by src/lib/core/markdown-editor/extensions/live-preview/widgets/mermaid-widget.ts:clearMermaidCache <- src/lib/app/lifecycle/app-lifecycle.service.ts:656 in teardownVault call
sym src/lib/core/markdown-editor/extensions/live-preview/widgets/mermaid-widget.ts:58 class MermaidWidget extends WidgetType L79 | Widget that renders a ```mermaid fenced code block as an inline SVG diagram. Uses mermaid.render() with async rendering and shows an error message for invalid …
by src/lib/core/markdown-editor/extensions/live-preview/widgets/mermaid-widget.ts:MermaidWidget <- src/lib/core/markdown-editor/extensions/live-preview/plugins/mermaid-field.ts:19 in computeMermaidBlocks new
## locals
local src/lib/core/markdown-editor/extensions/live-preview/widgets/mermaid-widget.ts:15 fn currentMermaidTheme(): MermaidTheme L4
local src/lib/core/markdown-editor/extensions/live-preview/widgets/mermaid-widget.ts:21 fn getMermaid(theme: MermaidTheme): Promise<typeof import('mermaid').default> L16
## calls
call src/lib/core/markdown-editor/extensions/live-preview/widgets/mermaid-widget.ts:17 in currentMermaidTheme -> src/lib/utils/color.ts:isDarkColor call
call src/lib/core/markdown-editor/extensions/live-preview/widgets/mermaid-widget.ts:89 in MermaidWidget.toDOM -> src/lib/core/markdown-editor/extensions/live-preview/widgets/mermaid-widget.ts:currentMermaidTheme call
call src/lib/core/markdown-editor/extensions/live-preview/widgets/mermaid-widget.ts:103 in MermaidWidget.toDOM -> src/lib/core/markdown-editor/extensions/live-preview/widgets/mermaid-widget.ts:getMermaid call
call src/lib/core/markdown-editor/extensions/live-preview/widgets/mermaid-widget.ts:107 in MermaidWidget.toDOM -> src/lib/utils/sanitize.ts:sanitizeMermaidSvg call
