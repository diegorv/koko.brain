# file card src/lib/core/markdown-editor/extensions/live-preview/core/mouse-selecting.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/core/markdown-editor/extensions/live-preview/core/mouse-selecting.ts ' codemap/files
file src/lib/core/markdown-editor/extensions/live-preview/core/mouse-selecting.ts other L56 module src/lib/core/markdown-editor in4 t8
## imported-by
imp src/lib/core/markdown-editor/extensions/live-preview/core/check-update-action.ts:3 -> src/lib/core/markdown-editor/extensions/live-preview/core/mouse-selecting.ts mouseSelectingField
imp src/lib/core/markdown-editor/extensions/live-preview/core/reveal.ts:2 -> src/lib/core/markdown-editor/extensions/live-preview/core/mouse-selecting.ts mouseSelectingField
imp src/lib/core/markdown-editor/extensions/live-preview/live-preview.ts:5 -> src/lib/core/markdown-editor/extensions/live-preview/core/mouse-selecting.ts mouseSelectingField,mouseSelectingHandlers
imp src/lib/core/markdown-editor/extensions/live-preview/plugins/queryjs-block-field.ts:9 -> src/lib/core/markdown-editor/extensions/live-preview/core/mouse-selecting.ts mouseSelectingField
## reach
in2 src/lib/core/markdown-editor/extensions/live-preview/core/mouse-selecting.ts 17 files in 1 modules: src/lib/core/markdown-editor(17)
out2 src/lib/core/markdown-editor/extensions/live-preview/core/mouse-selecting.ts 0 files in 0 modules: -
## tests
test src/tests/lib/core/markdown-editor/extensions/live-preview/core/mouse-selecting.test.ts imports src/lib/core/markdown-editor/extensions/live-preview/core/mouse-selecting.ts mirror
test src/tests/lib/core/markdown-editor/extensions/live-preview/core/block-decorator.test.ts imports src/lib/core/markdown-editor/extensions/live-preview/core/mouse-selecting.ts
test src/tests/lib/core/markdown-editor/extensions/live-preview/core/check-update-action.test.ts imports src/lib/core/markdown-editor/extensions/live-preview/core/mouse-selecting.ts
test src/tests/lib/core/markdown-editor/extensions/live-preview/core/reveal.test.ts imports src/lib/core/markdown-editor/extensions/live-preview/core/mouse-selecting.ts
test src/tests/lib/core/markdown-editor/extensions/live-preview/invariants-harness.test.ts imports src/lib/core/markdown-editor/extensions/live-preview/core/mouse-selecting.ts
test src/tests/lib/core/markdown-editor/extensions/live-preview/plugins/block-reveal.test.ts imports src/lib/core/markdown-editor/extensions/live-preview/core/mouse-selecting.ts
test src/tests/lib/core/markdown-editor/extensions/live-preview/plugins/keyboard-reveal.test.ts imports src/lib/core/markdown-editor/extensions/live-preview/core/mouse-selecting.ts
test src/tests/lib/core/markdown-editor/extensions/live-preview/plugins/queryjs-block-field.test.ts imports src/lib/core/markdown-editor/extensions/live-preview/core/mouse-selecting.ts
## symbols
sym src/lib/core/markdown-editor/extensions/live-preview/core/mouse-selecting.ts:5 const setMouseSelecting = StateEffect.define(…) L1 | Effect to set the mouse-selecting state (true = dragging, false = released)
sym src/lib/core/markdown-editor/extensions/live-preview/core/mouse-selecting.ts:8 const mouseSelectingField = StateField.define(…) L9 | Tracks whether the user is currently mouse-dragging a selection
by src/lib/core/markdown-editor/extensions/live-preview/core/mouse-selecting.ts:mouseSelectingField <- src/lib/core/markdown-editor/extensions/live-preview/core/check-update-action.ts:26 in checkUpdateAction ref +1
by src/lib/core/markdown-editor/extensions/live-preview/core/mouse-selecting.ts:mouseSelectingField <- src/lib/core/markdown-editor/extensions/live-preview/core/reveal.ts:67 in revealPredicate ref
by src/lib/core/markdown-editor/extensions/live-preview/core/mouse-selecting.ts:mouseSelectingField <- src/lib/core/markdown-editor/extensions/live-preview/live-preview.ts:82 in livePreviewExtensions ref
by src/lib/core/markdown-editor/extensions/live-preview/core/mouse-selecting.ts:mouseSelectingField <- src/lib/core/markdown-editor/extensions/live-preview/plugins/queryjs-block-field.ts:71 in queryjsBlockField ref +1
sym src/lib/core/markdown-editor/extensions/live-preview/core/mouse-selecting.ts:40 const mouseSelectingHandlers = EditorView.domEventHandlers(…) L17 | DOM event handlers that dispatch mouse-selecting state changes.
by src/lib/core/markdown-editor/extensions/live-preview/core/mouse-selecting.ts:mouseSelectingHandlers <- src/lib/core/markdown-editor/extensions/live-preview/live-preview.ts:83 in livePreviewExtensions ref
## locals
local src/lib/core/markdown-editor/extensions/live-preview/core/mouse-selecting.ts:19 fn releaseMouseSelecting(view: EditorView): void L5
## calls
call src/lib/core/markdown-editor/extensions/live-preview/core/mouse-selecting.ts:43 in mouseSelectingHandlers -> src/lib/core/markdown-editor/extensions/live-preview/core/mouse-selecting.ts:releaseMouseSelecting call +2
## effects
fx src/lib/core/markdown-editor/extensions/live-preview/core/mouse-selecting.ts:43 dom.mouseup view.dom.ownerDocument in mouseSelectingHandlers
