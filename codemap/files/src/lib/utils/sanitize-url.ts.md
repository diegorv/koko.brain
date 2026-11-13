# file card src/lib/utils/sanitize-url.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/utils/sanitize-url.ts ' codemap/files
file src/lib/utils/sanitize-url.ts other L15 module src/lib/utils in5 t1
## imported-by
imp src/lib/core/markdown-editor/extensions/live-preview/click-handler.ts:3 -> src/lib/utils/sanitize-url.ts isSafeUrl
imp src/lib/core/markdown-editor/extensions/live-preview/widgets.ts:19 -> src/lib/utils/sanitize-url.ts isSafeUrl
imp src/lib/core/markdown-editor/extensions/live-preview/widgets/meta-bind-button-widget.ts:3 -> src/lib/utils/sanitize-url.ts isSafeUrl
imp src/lib/features/canvas/LinkNode.svelte:7 -> src/lib/utils/sanitize-url.ts isSafeUrl
imp src/lib/features/tasks/tasks.logic.ts:3 -> src/lib/utils/sanitize-url.ts isSafeUrl
## reach
in2 src/lib/utils/sanitize-url.ts 14 files in 3 modules: src/lib/core/markdown-editor(9) src/lib/features/tasks(4) src/lib/features/canvas(1)
out2 src/lib/utils/sanitize-url.ts 0 files in 0 modules: -
## tests
test src/tests/lib/utils/sanitize-url.test.ts imports src/lib/utils/sanitize-url.ts mirror
## symbols
sym src/lib/utils/sanitize-url.ts:5 fn isSafeUrl(url: string): boolean L11 | Returns true if the URL is safe to open or use as a resource src
by src/lib/utils/sanitize-url.ts:isSafeUrl <- src/lib/core/markdown-editor/extensions/live-preview/click-handler.ts:34 in handleLivePreviewLinkMousedown call
by src/lib/utils/sanitize-url.ts:isSafeUrl <- src/lib/core/markdown-editor/extensions/live-preview/widgets.ts:163 in ImageWidget.toDOM call +2
by src/lib/utils/sanitize-url.ts:isSafeUrl <- src/lib/core/markdown-editor/extensions/live-preview/widgets/meta-bind-button-widget.ts:114 in executeButtonAction call
by src/lib/utils/sanitize-url.ts:isSafeUrl <- src/lib/features/canvas/LinkNode.svelte:81 in handleClick call
by src/lib/utils/sanitize-url.ts:isSafeUrl <- src/lib/features/tasks/tasks.logic.ts:60 in parseTaskTextSegments call
