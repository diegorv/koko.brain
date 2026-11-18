# file card src/lib/core/markdown-editor/extensions/source-frontmatter/source-frontmatter.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/core/markdown-editor/extensions/source-frontmatter/source-frontmatter.ts ' codemap/files
file src/lib/core/markdown-editor/extensions/source-frontmatter/source-frontmatter.ts other L67 module src/lib/core/markdown-editor in1 t1
## imports
imp src/lib/core/markdown-editor/extensions/source-frontmatter/source-frontmatter.ts:4 -> src/lib/core/markdown-editor/extensions/live-preview/parsers/frontmatter.ts FRONTMATTER_FENCE_RE,findFrontmatterBlock
imp src/lib/core/markdown-editor/extensions/source-frontmatter/source-frontmatter.ts:5 -> src/lib/core/markdown-editor/extensions/live-preview/core/get-all-lines.ts getAllLines
## imported-by
imp src/lib/core/markdown-editor/extensions/source-frontmatter/index.ts:1 -> src/lib/core/markdown-editor/extensions/source-frontmatter/source-frontmatter.ts sourceFrontmatter
## reach
in2 src/lib/core/markdown-editor/extensions/source-frontmatter/source-frontmatter.ts 1 files in 1 modules: src/lib/core/markdown-editor(1)
out2 src/lib/core/markdown-editor/extensions/source-frontmatter/source-frontmatter.ts 0 files in 0 modules: -
## tests
test src/tests/lib/core/markdown-editor/extensions/source-frontmatter/source-frontmatter.test.ts imports src/lib/core/markdown-editor/extensions/source-frontmatter/source-frontmatter.ts mirror
## symbols
sym src/lib/core/markdown-editor/extensions/source-frontmatter/source-frontmatter.ts:13 fn buildSourceFrontmatterDecorations(state: EditorState): DecorationSet L15 | Line decorations for the frontmatter block, opening and closing fences included.
sym src/lib/core/markdown-editor/extensions/source-frontmatter/source-frontmatter.ts:33 const sourceFrontmatterPlugin = ViewPlugin.fromClass(…) L15 | Source-mode frontmatter decoration.
sym src/lib/core/markdown-editor/extensions/source-frontmatter/source-frontmatter.ts:56 const sourceFrontmatterStyles = EditorView.baseTheme(…) L7 | Draws the frontmatter as metadata.
sym src/lib/core/markdown-editor/extensions/source-frontmatter/source-frontmatter.ts:65 fn sourceFrontmatter(): Extension L3 | Source-mode-only extension that draws the frontmatter block at body size in the meta colour
by src/lib/core/markdown-editor/extensions/source-frontmatter/source-frontmatter.ts:sourceFrontmatter <- src/lib/core/markdown-editor/setup/editor-extensions.ts:108 in sourceModeExtensions call
## calls
call src/lib/core/markdown-editor/extensions/source-frontmatter/source-frontmatter.ts:16 in buildSourceFrontmatterDecorations -> src/lib/core/markdown-editor/extensions/live-preview/parsers/frontmatter.ts:FRONTMATTER_FENCE_RE mcall
call src/lib/core/markdown-editor/extensions/source-frontmatter/source-frontmatter.ts:18 in buildSourceFrontmatterDecorations -> src/lib/core/markdown-editor/extensions/live-preview/core/get-all-lines.ts:getAllLines call
call src/lib/core/markdown-editor/extensions/source-frontmatter/source-frontmatter.ts:19 in buildSourceFrontmatterDecorations -> src/lib/core/markdown-editor/extensions/live-preview/parsers/frontmatter.ts:findFrontmatterBlock call
call src/lib/core/markdown-editor/extensions/source-frontmatter/source-frontmatter.ts:38 in sourceFrontmatterPlugin -> src/lib/core/markdown-editor/extensions/source-frontmatter/source-frontmatter.ts:buildSourceFrontmatterDecorations call +1
