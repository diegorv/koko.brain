# file card src/lib/core/markdown-editor/extensions/live-preview/plugins/frontmatter-field.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/core/markdown-editor/extensions/live-preview/plugins/frontmatter-field.ts ' codemap/files
file src/lib/core/markdown-editor/extensions/live-preview/plugins/frontmatter-field.ts other L213 module src/lib/core/markdown-editor in1 t3
## imports
imp src/lib/core/markdown-editor/extensions/live-preview/plugins/frontmatter-field.ts:4 -> src/lib/core/markdown-editor/extensions/live-preview/parsers/frontmatter.ts findFrontmatterBlock
imp src/lib/core/markdown-editor/extensions/live-preview/plugins/frontmatter-field.ts:5 -> src/lib/core/markdown-editor/extensions/live-preview/styles.ts hiddenGutterMarker
imp src/lib/core/markdown-editor/extensions/live-preview/plugins/frontmatter-field.ts:6 -> src/lib/core/markdown-editor/extensions/live-preview/core/hide-lines.ts hideLines
imp src/lib/core/markdown-editor/extensions/live-preview/plugins/frontmatter-field.ts:7 -> src/lib/core/markdown-editor/extensions/live-preview/core/effects.ts forceDecorationRebuild
imp src/lib/core/markdown-editor/extensions/live-preview/plugins/frontmatter-field.ts:8 -> src/lib/core/markdown-editor/extensions/live-preview/core/get-all-lines.ts getAllLines
imp src/lib/core/markdown-editor/extensions/live-preview/plugins/frontmatter-field.ts:9 -> src/lib/core/markdown-editor/extensions/live-preview/core/profiling.ts profileStart,profileEnd
imp src/lib/core/markdown-editor/extensions/live-preview/plugins/frontmatter-field.ts:10 -> src/lib/core/markdown-editor/extensions/live-preview/core/block-band-click.ts soleBlockWidget
## imported-by
imp src/lib/core/markdown-editor/extensions/live-preview/live-preview.ts:7 -> src/lib/core/markdown-editor/extensions/live-preview/plugins/frontmatter-field.ts frontmatterClick,frontmatterField,frontmatterGuard,frontmatterGutter
## reach
in2 src/lib/core/markdown-editor/extensions/live-preview/plugins/frontmatter-field.ts 1 files in 1 modules: src/lib/core/markdown-editor(1)
out2 src/lib/core/markdown-editor/extensions/live-preview/plugins/frontmatter-field.ts 2 files in 2 modules: src/lib/core/markdown-editor(1) src/lib/utils(1)
## tests
test src/tests/lib/core/markdown-editor/extensions/live-preview/plugins/frontmatter-field-click.test.ts imports src/lib/core/markdown-editor/extensions/live-preview/plugins/frontmatter-field.ts mirror
test src/tests/lib/core/markdown-editor/extensions/live-preview/plugins/frontmatter-field.test.ts imports src/lib/core/markdown-editor/extensions/live-preview/plugins/frontmatter-field.ts mirror
test src/tests/lib/core/markdown-editor/extensions/live-preview/invariants-harness.test.ts imports src/lib/core/markdown-editor/extensions/live-preview/plugins/frontmatter-field.ts
## symbols
sym src/lib/core/markdown-editor/extensions/live-preview/plugins/frontmatter-field.ts:13 fn computeFrontmatter(state: EditorState): DecorationSet L14 | Computes frontmatter decorations - hides the entire block (properties managed via right sidebar)
sym src/lib/core/markdown-editor/extensions/live-preview/plugins/frontmatter-field.ts:32 const frontmatterField = StateField.define(…) L15 | StateField that manages frontmatter decorations independently.
by src/lib/core/markdown-editor/extensions/live-preview/plugins/frontmatter-field.ts:frontmatterField <- src/lib/core/markdown-editor/extensions/live-preview/live-preview.ts:47 in BLOCK_EXTENSIONS ref
sym src/lib/core/markdown-editor/extensions/live-preview/plugins/frontmatter-field.ts:53 fn frontmatterEnd(state: EditorState): number | null L7 | End of the hidden frontmatter (the end of its closing fence line), read from `frontmatterField`; `null` when nothing is hidden (no frontmatter, or the decorato…
sym src/lib/core/markdown-editor/extensions/live-preview/plugins/frontmatter-field.ts:89 const frontmatterClick = EditorView.mouseSelectionStyle.of(…) L23 | Mouse selection for a press that maps into the hidden frontmatter.
by src/lib/core/markdown-editor/extensions/live-preview/plugins/frontmatter-field.ts:frontmatterClick <- src/lib/core/markdown-editor/extensions/live-preview/live-preview.ts:47 in BLOCK_EXTENSIONS ref
sym src/lib/core/markdown-editor/extensions/live-preview/plugins/frontmatter-field.ts:196 const frontmatterGuard L1 | Keyboard guard for the hidden frontmatter: a change filter on `delete*` and `move*` user edits plus a selection clamp, so keyboard commands cannot edit or land…
by src/lib/core/markdown-editor/extensions/live-preview/plugins/frontmatter-field.ts:frontmatterGuard <- src/lib/core/markdown-editor/extensions/live-preview/live-preview.ts:47 in BLOCK_EXTENSIONS ref
sym src/lib/core/markdown-editor/extensions/live-preview/plugins/frontmatter-field.ts:199 const frontmatterGutter = gutterLineClass.compute(…) L15 | Hides gutter cells for all frontmatter lines
by src/lib/core/markdown-editor/extensions/live-preview/plugins/frontmatter-field.ts:frontmatterGutter <- src/lib/core/markdown-editor/extensions/live-preview/live-preview.ts:47 in BLOCK_EXTENSIONS ref
## locals
local src/lib/core/markdown-editor/extensions/live-preview/plugins/frontmatter-field.ts:62 fn bodyStart(state: EditorState): number | null L4
local src/lib/core/markdown-editor/extensions/live-preview/plugins/frontmatter-field.ts:68 fn isBlockWidgetLine(view: EditorView, pos: number): boolean L5
local src/lib/core/markdown-editor/extensions/live-preview/plugins/frontmatter-field.ts:114 fn isDeleteOrMove(tr: Transaction): boolean L3
## calls
call src/lib/core/markdown-editor/extensions/live-preview/plugins/frontmatter-field.ts:14 in computeFrontmatter -> src/lib/core/markdown-editor/extensions/live-preview/core/get-all-lines.ts:getAllLines call
call src/lib/core/markdown-editor/extensions/live-preview/plugins/frontmatter-field.ts:17 in computeFrontmatter -> src/lib/core/markdown-editor/extensions/live-preview/parsers/frontmatter.ts:findFrontmatterBlock call
call src/lib/core/markdown-editor/extensions/live-preview/plugins/frontmatter-field.ts:23 in computeFrontmatter -> src/lib/core/markdown-editor/extensions/live-preview/core/hide-lines.ts:hideLines call
call src/lib/core/markdown-editor/extensions/live-preview/plugins/frontmatter-field.ts:34 in frontmatterField -> src/lib/core/markdown-editor/extensions/live-preview/plugins/frontmatter-field.ts:computeFrontmatter call +1
call src/lib/core/markdown-editor/extensions/live-preview/plugins/frontmatter-field.ts:38 in frontmatterField -> src/lib/core/markdown-editor/extensions/live-preview/core/profiling.ts:profileStart call
call src/lib/core/markdown-editor/extensions/live-preview/plugins/frontmatter-field.ts:40 in frontmatterField -> src/lib/core/markdown-editor/extensions/live-preview/core/profiling.ts:profileEnd call
call src/lib/core/markdown-editor/extensions/live-preview/plugins/frontmatter-field.ts:63 in bodyStart -> src/lib/core/markdown-editor/extensions/live-preview/plugins/frontmatter-field.ts:frontmatterEnd call
call src/lib/core/markdown-editor/extensions/live-preview/plugins/frontmatter-field.ts:71 in isBlockWidgetLine -> src/lib/core/markdown-editor/extensions/live-preview/core/block-band-click.ts:soleBlockWidget call
call src/lib/core/markdown-editor/extensions/live-preview/plugins/frontmatter-field.ts:91 in frontmatterClick -> src/lib/core/markdown-editor/extensions/live-preview/plugins/frontmatter-field.ts:bodyStart call +1
call src/lib/core/markdown-editor/extensions/live-preview/plugins/frontmatter-field.ts:94 in frontmatterClick -> src/lib/core/markdown-editor/extensions/live-preview/plugins/frontmatter-field.ts:isBlockWidgetLine call
call src/lib/core/markdown-editor/extensions/live-preview/plugins/frontmatter-field.ts:131 in frontmatterChangeGuard -> src/lib/core/markdown-editor/extensions/live-preview/plugins/frontmatter-field.ts:isDeleteOrMove call
call src/lib/core/markdown-editor/extensions/live-preview/plugins/frontmatter-field.ts:132 in frontmatterChangeGuard -> src/lib/core/markdown-editor/extensions/live-preview/plugins/frontmatter-field.ts:bodyStart call
call src/lib/core/markdown-editor/extensions/live-preview/plugins/frontmatter-field.ts:160 in frontmatterSelectionGuard -> src/lib/core/markdown-editor/extensions/live-preview/plugins/frontmatter-field.ts:isDeleteOrMove call
call src/lib/core/markdown-editor/extensions/live-preview/plugins/frontmatter-field.ts:169 in frontmatterSelectionGuard -> src/lib/core/markdown-editor/extensions/live-preview/plugins/frontmatter-field.ts:bodyStart call
call src/lib/core/markdown-editor/extensions/live-preview/plugins/frontmatter-field.ts:202 in frontmatterGutter -> src/lib/core/markdown-editor/extensions/live-preview/core/get-all-lines.ts:getAllLines call
call src/lib/core/markdown-editor/extensions/live-preview/plugins/frontmatter-field.ts:205 in frontmatterGutter -> src/lib/core/markdown-editor/extensions/live-preview/parsers/frontmatter.ts:findFrontmatterBlock call
