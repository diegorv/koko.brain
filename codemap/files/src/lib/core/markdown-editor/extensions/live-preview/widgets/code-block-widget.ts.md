# file card src/lib/core/markdown-editor/extensions/live-preview/widgets/code-block-widget.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/core/markdown-editor/extensions/live-preview/widgets/code-block-widget.ts ' codemap/files
file src/lib/core/markdown-editor/extensions/live-preview/widgets/code-block-widget.ts other L183 module src/lib/core/markdown-editor in1 t1
## imports
imp src/lib/core/markdown-editor/extensions/live-preview/widgets/code-block-widget.ts:2 -> src/lib/core/markdown-editor/extensions/live-preview/code-highlight.logic.ts highlightCode
imp src/lib/core/markdown-editor/extensions/live-preview/widgets/code-block-widget.ts:4 -> src/lib/core/markdown-editor/extensions/live-preview/core/form-control-events.ts isFormControlInputEvent
## imported-by
imp src/lib/core/markdown-editor/extensions/live-preview/plugins/code-block-field.ts:10 -> src/lib/core/markdown-editor/extensions/live-preview/widgets/code-block-widget.ts CodeBlockWidget
## reach
in2 src/lib/core/markdown-editor/extensions/live-preview/widgets/code-block-widget.ts 1 files in 1 modules: src/lib/core/markdown-editor(1)
out2 src/lib/core/markdown-editor/extensions/live-preview/widgets/code-block-widget.ts 0 files in 0 modules: -
## tests
test src/tests/lib/core/markdown-editor/extensions/live-preview/widgets/code-block-widget.test.ts imports src/lib/core/markdown-editor/extensions/live-preview/widgets/code-block-widget.ts mirror
## symbols
sym src/lib/core/markdown-editor/extensions/live-preview/widgets/code-block-widget.ts:13 const COMMON_LANGUAGES: readonly string[] L36 | Common languages offered in the language-switcher dropdown.
sym src/lib/core/markdown-editor/extensions/live-preview/widgets/code-block-widget.ts:51 interface CodeBlockLanguageRange L6 | Position info for the code block's language tag (or null when fence has no tag).
sym src/lib/core/markdown-editor/extensions/live-preview/widgets/code-block-widget.ts:59 class CodeBlockWidget extends WidgetType L125 | Widget that renders a fenced code block with syntax highlighting, language switcher, and copy button
by src/lib/core/markdown-editor/extensions/live-preview/widgets/code-block-widget.ts:CodeBlockWidget <- src/lib/core/markdown-editor/extensions/live-preview/plugins/code-block-field.ts:48 in computeCodeBlocks new +1
## calls
call src/lib/core/markdown-editor/extensions/live-preview/widgets/code-block-widget.ts:81 in CodeBlockWidget.toDOM -> src/lib/core/markdown-editor/extensions/live-preview/widgets/code-block-widget.ts:CodeBlockWidget.buildLanguageSelect call
call src/lib/core/markdown-editor/extensions/live-preview/widgets/code-block-widget.ts:112 in CodeBlockWidget.toDOM -> src/lib/core/markdown-editor/extensions/live-preview/code-highlight.logic.ts:highlightCode call
call src/lib/core/markdown-editor/extensions/live-preview/widgets/code-block-widget.ts:143 in CodeBlockWidget.ignoreEvent -> src/lib/core/markdown-editor/extensions/live-preview/core/form-control-events.ts:isFormControlInputEvent call
call src/lib/core/markdown-editor/extensions/live-preview/widgets/code-block-widget.ts:165 in CodeBlockWidget.buildLanguageSelect -> src/lib/core/markdown-editor/extensions/live-preview/widgets/code-block-widget.ts:CodeBlockWidget.dispatchLanguageChange call
## effects
fx src/lib/core/markdown-editor/extensions/live-preview/widgets/code-block-widget.ts:92 dom.mousedown copyBtn in CodeBlockWidget.toDOM
fx src/lib/core/markdown-editor/extensions/live-preview/widgets/code-block-widget.ts:97 timer.setTimeout delay=1500 in CodeBlockWidget.toDOM
fx src/lib/core/markdown-editor/extensions/live-preview/widgets/code-block-widget.ts:163 dom.mousedown select in CodeBlockWidget.buildLanguageSelect
fx src/lib/core/markdown-editor/extensions/live-preview/widgets/code-block-widget.ts:164 dom.change select in CodeBlockWidget.buildLanguageSelect
