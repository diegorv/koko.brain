# file card src/lib/utils/sanitize.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/utils/sanitize.ts ' codemap/files
file src/lib/utils/sanitize.ts other L86 module src/lib/utils in6 t1
## imported-by
imp src/lib/core/markdown-editor/extensions/live-preview/widgets/mermaid-widget.ts:3 -> src/lib/utils/sanitize.ts sanitizeMermaidSvg
imp src/lib/features/canvas/canvas-markdown.logic.ts:2 -> src/lib/utils/sanitize.ts sanitizeHtml
imp src/lib/features/collection/CollectionTableView.svelte:5 -> src/lib/utils/sanitize.ts sanitizeHtml
imp src/lib/features/collection/collection-block-widget.ts:10 -> src/lib/utils/sanitize.ts sanitizeHtml
imp src/lib/features/file-icons/IconRenderer.svelte:3 -> src/lib/utils/sanitize.ts sanitizeSvgContent
imp src/lib/features/search/search.logic.ts:30 -> src/lib/utils/sanitize.ts sanitizeSnippetHtml
## reach
in2 src/lib/utils/sanitize.ts 19 files in 11 modules: src/lib/app(3) src/lib/features/rail-shell(3) src/lib/features/auto-organize(2) src/lib/features/canvas(2) src/lib/features/properties(2) +6 modules: q impact src/lib/utils/sanitize.ts --depth 2
out2 src/lib/utils/sanitize.ts 0 files in 0 modules: -
## tests
test src/tests/lib/utils/sanitize.test.ts imports src/lib/utils/sanitize.ts mirror
## symbols
sym src/lib/utils/sanitize.ts:7 fn sanitizeHtml(html: string): string L25 | Sanitizes arbitrary HTML allowing a safe rich-text subset.
by src/lib/utils/sanitize.ts:sanitizeHtml <- src/lib/features/canvas/canvas-markdown.logic.ts:17 in renderCanvasMarkdown call
by src/lib/utils/sanitize.ts:sanitizeHtml <- src/lib/features/collection/CollectionTableView.svelte:74 in (markup) markup
by src/lib/utils/sanitize.ts:sanitizeHtml <- src/lib/features/collection/collection-block-widget.ts:458 in buildCollectionTable call
sym src/lib/utils/sanitize.ts:38 fn sanitizeSvgContent(svgInner: string): string L14 | Sanitizes SVG inner content (paths, circles, etc.) for use inside a trusted <svg> element.
by src/lib/utils/sanitize.ts:sanitizeSvgContent <- src/lib/features/file-icons/IconRenderer.svelte:36 in (markup) markup
sym src/lib/utils/sanitize.ts:57 fn sanitizeSnippetHtml(html: string): string L16 | Sanitizes an FTS5 snippet string that may contain <mark> tags.
by src/lib/utils/sanitize.ts:sanitizeSnippetHtml <- src/lib/features/search/SearchResult.svelte:168 in (markup) markup
sym src/lib/utils/sanitize.ts:77 fn sanitizeMermaidSvg(svg: string): string L10 | Sanitizes mermaid SVG output.
by src/lib/utils/sanitize.ts:sanitizeMermaidSvg <- src/lib/core/markdown-editor/extensions/live-preview/widgets/mermaid-widget.ts:107 in MermaidWidget.toDOM call
