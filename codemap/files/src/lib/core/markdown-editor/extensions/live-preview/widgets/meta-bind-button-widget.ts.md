# file card src/lib/core/markdown-editor/extensions/live-preview/widgets/meta-bind-button-widget.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/core/markdown-editor/extensions/live-preview/widgets/meta-bind-button-widget.ts ' codemap/files
file src/lib/core/markdown-editor/extensions/live-preview/widgets/meta-bind-button-widget.ts other L143 module src/lib/core/markdown-editor in1 t4
## imports
imp src/lib/core/markdown-editor/extensions/live-preview/widgets/meta-bind-button-widget.ts:3 -> src/lib/utils/sanitize-url.ts isSafeUrl
imp src/lib/core/markdown-editor/extensions/live-preview/widgets/meta-bind-button-widget.ts:4 -> src/lib/core/markdown-editor/editor-host.ts editorHost
imp src/lib/core/markdown-editor/extensions/live-preview/widgets/meta-bind-button-widget.ts:5 -> src/lib/core/markdown-editor/extensions/wikilink/decoration.logic.ts findWikilinkInfoAtPosition
imp src/lib/core/markdown-editor/extensions/live-preview/widgets/meta-bind-button-widget.ts:6 -> src/lib/core/markdown-editor/extensions/live-preview/wikilink-navigation.ts followWikilinkInfo
imp src/lib/core/markdown-editor/extensions/live-preview/widgets/meta-bind-button-widget.ts:7 -> src/lib/core/markdown-editor/extensions/live-preview/meta-bind-button.logic.ts type:ButtonAction,type:ButtonConfig,getButtonActions
imp src/lib/core/markdown-editor/extensions/live-preview/widgets/meta-bind-button-widget.ts:99 -> src/lib/core/markdown-editor/extensions/live-preview/widgets.ts dyn:dispatchMetaBindUpdate
## imported-by
imp src/lib/core/markdown-editor/extensions/live-preview/plugins/meta-bind-button-field.ts:6 -> src/lib/core/markdown-editor/extensions/live-preview/widgets/meta-bind-button-widget.ts MetaBindButtonWidget,MetaBindButtonErrorWidget
## reach
in2 src/lib/core/markdown-editor/extensions/live-preview/widgets/meta-bind-button-widget.ts 1 files in 1 modules: src/lib/core/markdown-editor(1)
out2 src/lib/core/markdown-editor/extensions/live-preview/widgets/meta-bind-button-widget.ts 16 files in 5 modules: src/lib/core/markdown-editor(9) src/lib/core/filesystem(2) src/lib/core/frontmatter(2) src/lib/utils(2) src/lib/types(1)
## tests
test src/tests/lib/app/meta-bind-open-view.test.ts imports src/lib/core/markdown-editor/extensions/live-preview/widgets/meta-bind-button-widget.ts
test src/tests/lib/core/markdown-editor/editor-host.test.ts imports src/lib/core/markdown-editor/extensions/live-preview/widgets/meta-bind-button-widget.ts
test src/tests/lib/core/markdown-editor/extensions/live-preview/meta-bind-writers.test.ts imports src/lib/core/markdown-editor/extensions/live-preview/widgets/meta-bind-button-widget.ts
test src/tests/lib/core/markdown-editor/extensions/live-preview/plugins/meta-bind-button-field.test.ts imports src/lib/core/markdown-editor/extensions/live-preview/widgets/meta-bind-button-widget.ts
## symbols
sym src/lib/core/markdown-editor/extensions/live-preview/widgets/meta-bind-button-widget.ts:14 class MetaBindButtonWidget extends WidgetType L46 | Widget that renders a ```meta-bind-button code block as an interactive button
by src/lib/core/markdown-editor/extensions/live-preview/widgets/meta-bind-button-widget.ts:MetaBindButtonWidget <- src/lib/core/markdown-editor/extensions/live-preview/plugins/meta-bind-button-field.ts:22 in computeMetaBindButtons new
sym src/lib/core/markdown-editor/extensions/live-preview/widgets/meta-bind-button-widget.ts:62 class MetaBindButtonErrorWidget extends WidgetType L24 | Widget that renders an error message for invalid button configurations
by src/lib/core/markdown-editor/extensions/live-preview/widgets/meta-bind-button-widget.ts:MetaBindButtonErrorWidget <- src/lib/core/markdown-editor/extensions/live-preview/plugins/meta-bind-button-field.ts:23 in computeMetaBindButtons new
## locals
local src/lib/core/markdown-editor/extensions/live-preview/widgets/meta-bind-button-widget.ts:95 fn executeButtonAction(action: ButtonAction, view: EditorView): Promise<boolean> L43
local src/lib/core/markdown-editor/extensions/live-preview/widgets/meta-bind-button-widget.ts:140 fn refuseOpen(link: string, reason: string): false L4
## calls
call src/lib/core/markdown-editor/extensions/live-preview/widgets/meta-bind-button-widget.ts:36 in MetaBindButtonWidget.toDOM -> src/lib/core/markdown-editor/extensions/live-preview/meta-bind-button.logic.ts:getButtonActions call
call src/lib/core/markdown-editor/extensions/live-preview/widgets/meta-bind-button-widget.ts:38 in MetaBindButtonWidget.toDOM -> src/lib/core/markdown-editor/extensions/live-preview/widgets/meta-bind-button-widget.ts:executeButtonAction call
call src/lib/core/markdown-editor/extensions/live-preview/widgets/meta-bind-button-widget.ts:51 in MetaBindButtonWidget.eq -> src/lib/core/markdown-editor/extensions/live-preview/meta-bind-button.logic.ts:getButtonActions call +1
call src/lib/core/markdown-editor/extensions/live-preview/widgets/meta-bind-button-widget.ts:100 in executeButtonAction -> src/lib/core/markdown-editor/extensions/live-preview/widgets.ts:dispatchMetaBindUpdate call
call src/lib/core/markdown-editor/extensions/live-preview/widgets/meta-bind-button-widget.ts:108 in executeButtonAction -> src/lib/core/markdown-editor/extensions/wikilink/decoration.logic.ts:findWikilinkInfoAtPosition call
call src/lib/core/markdown-editor/extensions/live-preview/widgets/meta-bind-button-widget.ts:110 in executeButtonAction -> src/lib/core/markdown-editor/extensions/live-preview/widgets/meta-bind-button-widget.ts:refuseOpen call +2
call src/lib/core/markdown-editor/extensions/live-preview/widgets/meta-bind-button-widget.ts:112 in executeButtonAction -> src/lib/core/markdown-editor/extensions/live-preview/wikilink-navigation.ts:followWikilinkInfo call
call src/lib/core/markdown-editor/extensions/live-preview/widgets/meta-bind-button-widget.ts:114 in executeButtonAction -> src/lib/utils/sanitize-url.ts:isSafeUrl call
## effects
fx src/lib/core/markdown-editor/extensions/live-preview/widgets/meta-bind-button-widget.ts:28 dom.mousedown button in MetaBindButtonWidget.toDOM
fx src/lib/core/markdown-editor/extensions/live-preview/widgets/meta-bind-button-widget.ts:33 dom.click button in MetaBindButtonWidget.toDOM
