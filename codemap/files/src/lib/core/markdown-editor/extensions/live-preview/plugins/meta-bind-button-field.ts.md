# file card src/lib/core/markdown-editor/extensions/live-preview/plugins/meta-bind-button-field.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/core/markdown-editor/extensions/live-preview/plugins/meta-bind-button-field.ts ' codemap/files
file src/lib/core/markdown-editor/extensions/live-preview/plugins/meta-bind-button-field.ts other L49 module src/lib/core/markdown-editor in1 t2
## imports
imp src/lib/core/markdown-editor/extensions/live-preview/plugins/meta-bind-button-field.ts:4 -> src/lib/core/markdown-editor/extensions/live-preview/parsers/meta-bind-button.ts findAllMetaBindButtonBlocks
imp src/lib/core/markdown-editor/extensions/live-preview/plugins/meta-bind-button-field.ts:5 -> src/lib/core/markdown-editor/extensions/live-preview/meta-bind-button.logic.ts buttonConfigError,parseButtonConfig
imp src/lib/core/markdown-editor/extensions/live-preview/plugins/meta-bind-button-field.ts:6 -> src/lib/core/markdown-editor/extensions/live-preview/widgets/meta-bind-button-widget.ts MetaBindButtonWidget,MetaBindButtonErrorWidget
imp src/lib/core/markdown-editor/extensions/live-preview/plugins/meta-bind-button-field.ts:7 -> src/lib/core/markdown-editor/extensions/live-preview/core/hide-lines.ts hideLines
imp src/lib/core/markdown-editor/extensions/live-preview/plugins/meta-bind-button-field.ts:8 -> src/lib/core/markdown-editor/extensions/live-preview/core/block-decorator.ts blockDecorator
imp src/lib/core/markdown-editor/extensions/live-preview/plugins/meta-bind-button-field.ts:9 -> src/lib/core/markdown-editor/extensions/live-preview/core/reveal.ts revealPredicate
## imported-by
imp src/lib/core/markdown-editor/extensions/live-preview/live-preview.ts:13 -> src/lib/core/markdown-editor/extensions/live-preview/plugins/meta-bind-button-field.ts metaBindButtonField
## reach
in2 src/lib/core/markdown-editor/extensions/live-preview/plugins/meta-bind-button-field.ts 1 files in 1 modules: src/lib/core/markdown-editor(1)
out2 src/lib/core/markdown-editor/extensions/live-preview/plugins/meta-bind-button-field.ts 11 files in 2 modules: src/lib/core/markdown-editor(10) src/lib/utils(1)
## tests
test src/tests/lib/core/markdown-editor/extensions/live-preview/plugins/meta-bind-button-field.test.ts imports src/lib/core/markdown-editor/extensions/live-preview/plugins/meta-bind-button-field.ts mirror
test src/tests/lib/core/markdown-editor/extensions/live-preview/plugins/block-reveal.test.ts imports src/lib/core/markdown-editor/extensions/live-preview/plugins/meta-bind-button-field.ts
## symbols
sym src/lib/core/markdown-editor/extensions/live-preview/plugins/meta-bind-button-field.ts:12 fn computeMetaBindButtons(state: EditorState): DecorationSet L27 | Computes meta-bind button decorations
sym src/lib/core/markdown-editor/extensions/live-preview/plugins/meta-bind-button-field.ts:45 const metaBindButtonField = blockDecorator(…) L5 | ViewPlugin that manages meta-bind button decorations independently.
by src/lib/core/markdown-editor/extensions/live-preview/plugins/meta-bind-button-field.ts:metaBindButtonField <- src/lib/core/markdown-editor/extensions/live-preview/live-preview.ts:54 in BLOCK_EXTENSIONS ref
## calls
call src/lib/core/markdown-editor/extensions/live-preview/plugins/meta-bind-button-field.ts:13 in computeMetaBindButtons -> src/lib/core/markdown-editor/extensions/live-preview/core/reveal.ts:revealPredicate call
call src/lib/core/markdown-editor/extensions/live-preview/plugins/meta-bind-button-field.ts:16 in computeMetaBindButtons -> src/lib/core/markdown-editor/extensions/live-preview/parsers/meta-bind-button.ts:findAllMetaBindButtonBlocks call
call src/lib/core/markdown-editor/extensions/live-preview/plugins/meta-bind-button-field.ts:20 in computeMetaBindButtons -> src/lib/core/markdown-editor/extensions/live-preview/meta-bind-button.logic.ts:parseButtonConfig call
call src/lib/core/markdown-editor/extensions/live-preview/plugins/meta-bind-button-field.ts:22 in computeMetaBindButtons -> src/lib/core/markdown-editor/extensions/live-preview/widgets/meta-bind-button-widget.ts:MetaBindButtonWidget new
call src/lib/core/markdown-editor/extensions/live-preview/plugins/meta-bind-button-field.ts:23 in computeMetaBindButtons -> src/lib/core/markdown-editor/extensions/live-preview/meta-bind-button.logic.ts:buttonConfigError call
call src/lib/core/markdown-editor/extensions/live-preview/plugins/meta-bind-button-field.ts:23 in computeMetaBindButtons -> src/lib/core/markdown-editor/extensions/live-preview/widgets/meta-bind-button-widget.ts:MetaBindButtonErrorWidget new
call src/lib/core/markdown-editor/extensions/live-preview/plugins/meta-bind-button-field.ts:29 in computeMetaBindButtons -> src/lib/core/markdown-editor/extensions/live-preview/core/hide-lines.ts:hideLines call
call src/lib/core/markdown-editor/extensions/live-preview/plugins/meta-bind-button-field.ts:45 in metaBindButtonField -> src/lib/core/markdown-editor/extensions/live-preview/core/block-decorator.ts:blockDecorator call
call src/lib/core/markdown-editor/extensions/live-preview/plugins/meta-bind-button-field.ts:48 in metaBindButtonField -> src/lib/core/markdown-editor/extensions/live-preview/plugins/meta-bind-button-field.ts:computeMetaBindButtons ref
