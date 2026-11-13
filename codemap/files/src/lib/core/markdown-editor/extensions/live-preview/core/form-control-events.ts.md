# file card src/lib/core/markdown-editor/extensions/live-preview/core/form-control-events.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/core/markdown-editor/extensions/live-preview/core/form-control-events.ts ' codemap/files
file src/lib/core/markdown-editor/extensions/live-preview/core/form-control-events.ts other L32 module src/lib/core/markdown-editor in2 t1
## imported-by
imp src/lib/core/markdown-editor/extensions/live-preview/widgets.ts:24 -> src/lib/core/markdown-editor/extensions/live-preview/core/form-control-events.ts isFormControlInputEvent
imp src/lib/core/markdown-editor/extensions/live-preview/widgets/code-block-widget.ts:4 -> src/lib/core/markdown-editor/extensions/live-preview/core/form-control-events.ts isFormControlInputEvent
## reach
in2 src/lib/core/markdown-editor/extensions/live-preview/core/form-control-events.ts 9 files in 1 modules: src/lib/core/markdown-editor(9)
out2 src/lib/core/markdown-editor/extensions/live-preview/core/form-control-events.ts 0 files in 0 modules: -
## tests
test src/tests/lib/core/markdown-editor/extensions/live-preview/core/form-control-events.test.ts imports src/lib/core/markdown-editor/extensions/live-preview/core/form-control-events.ts mirror
## symbols
sym src/lib/core/markdown-editor/extensions/live-preview/core/form-control-events.ts:28 fn isFormControlInputEvent(event: Event): boolean L5 | `WidgetType.ignoreEvent` answer for a widget that holds form controls.
by src/lib/core/markdown-editor/extensions/live-preview/core/form-control-events.ts:isFormControlInputEvent <- src/lib/core/markdown-editor/extensions/live-preview/widgets.ts:446 in TableWidget.ignoreEvent call +3
by src/lib/core/markdown-editor/extensions/live-preview/core/form-control-events.ts:isFormControlInputEvent <- src/lib/core/markdown-editor/extensions/live-preview/widgets/code-block-widget.ts:143 in CodeBlockWidget.ignoreEvent call
