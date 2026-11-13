# file card src/lib/core/markdown-editor/extensions/live-preview/plugins/mermaid-field.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/core/markdown-editor/extensions/live-preview/plugins/mermaid-field.ts ' codemap/files
file src/lib/core/markdown-editor/extensions/live-preview/plugins/mermaid-field.ts other L49 module src/lib/core/markdown-editor in1 t3
## imports
imp src/lib/core/markdown-editor/extensions/live-preview/plugins/mermaid-field.ts:4 -> src/lib/core/markdown-editor/extensions/live-preview/parsers/mermaid.ts findAllMermaidBlocks
imp src/lib/core/markdown-editor/extensions/live-preview/plugins/mermaid-field.ts:5 -> src/lib/core/markdown-editor/extensions/live-preview/widgets/mermaid-widget.ts MermaidWidget
imp src/lib/core/markdown-editor/extensions/live-preview/plugins/mermaid-field.ts:6 -> src/lib/core/markdown-editor/extensions/live-preview/core/hide-lines.ts hideLines
imp src/lib/core/markdown-editor/extensions/live-preview/plugins/mermaid-field.ts:7 -> src/lib/core/markdown-editor/extensions/live-preview/core/block-decorator.ts blockDecorator
imp src/lib/core/markdown-editor/extensions/live-preview/plugins/mermaid-field.ts:8 -> src/lib/core/markdown-editor/extensions/live-preview/core/reveal.ts revealPredicate
## imported-by
imp src/lib/core/markdown-editor/extensions/live-preview/live-preview.ts:15 -> src/lib/core/markdown-editor/extensions/live-preview/plugins/mermaid-field.ts mermaidField
## reach
in2 src/lib/core/markdown-editor/extensions/live-preview/plugins/mermaid-field.ts 1 files in 1 modules: src/lib/core/markdown-editor(1)
out2 src/lib/core/markdown-editor/extensions/live-preview/plugins/mermaid-field.ts 8 files in 2 modules: src/lib/core/markdown-editor(6) src/lib/utils(2)
## tests
test src/tests/lib/core/markdown-editor/extensions/live-preview/plugins/mermaid-field.test.ts imports src/lib/core/markdown-editor/extensions/live-preview/plugins/mermaid-field.ts mirror
test src/tests/lib/core/markdown-editor/extensions/live-preview/plugins/block-reveal.test.ts imports src/lib/core/markdown-editor/extensions/live-preview/plugins/mermaid-field.ts
test src/tests/lib/core/markdown-editor/extensions/live-preview/plugins/special-fence-detection.test.ts imports src/lib/core/markdown-editor/extensions/live-preview/plugins/mermaid-field.ts
## symbols
sym src/lib/core/markdown-editor/extensions/live-preview/plugins/mermaid-field.ts:11 fn computeMermaidBlocks(state: EditorState): DecorationSet L28 | Computes mermaid block decorations
sym src/lib/core/markdown-editor/extensions/live-preview/plugins/mermaid-field.ts:45 const mermaidField = blockDecorator(…) L5 | ViewPlugin that manages mermaid diagram decorations.
by src/lib/core/markdown-editor/extensions/live-preview/plugins/mermaid-field.ts:mermaidField <- src/lib/core/markdown-editor/extensions/live-preview/live-preview.ts:55 in BLOCK_EXTENSIONS ref
## calls
call src/lib/core/markdown-editor/extensions/live-preview/plugins/mermaid-field.ts:12 in computeMermaidBlocks -> src/lib/core/markdown-editor/extensions/live-preview/core/reveal.ts:revealPredicate call
call src/lib/core/markdown-editor/extensions/live-preview/plugins/mermaid-field.ts:15 in computeMermaidBlocks -> src/lib/core/markdown-editor/extensions/live-preview/parsers/mermaid.ts:findAllMermaidBlocks call
call src/lib/core/markdown-editor/extensions/live-preview/plugins/mermaid-field.ts:19 in computeMermaidBlocks -> src/lib/core/markdown-editor/extensions/live-preview/widgets/mermaid-widget.ts:MermaidWidget new
call src/lib/core/markdown-editor/extensions/live-preview/plugins/mermaid-field.ts:29 in computeMermaidBlocks -> src/lib/core/markdown-editor/extensions/live-preview/core/hide-lines.ts:hideLines call
call src/lib/core/markdown-editor/extensions/live-preview/plugins/mermaid-field.ts:45 in mermaidField -> src/lib/core/markdown-editor/extensions/live-preview/core/block-decorator.ts:blockDecorator call
call src/lib/core/markdown-editor/extensions/live-preview/plugins/mermaid-field.ts:48 in mermaidField -> src/lib/core/markdown-editor/extensions/live-preview/plugins/mermaid-field.ts:computeMermaidBlocks ref
