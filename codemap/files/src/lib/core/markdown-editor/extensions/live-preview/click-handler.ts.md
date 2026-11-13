# file card src/lib/core/markdown-editor/extensions/live-preview/click-handler.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/core/markdown-editor/extensions/live-preview/click-handler.ts ' codemap/files
file src/lib/core/markdown-editor/extensions/live-preview/click-handler.ts other L70 module src/lib/core/markdown-editor in1 t1
## imports
imp src/lib/core/markdown-editor/extensions/live-preview/click-handler.ts:2 -> src/lib/core/markdown-editor/extensions/live-preview/parsers/link.ts findMarkdownLinkUrlAtPosition
imp src/lib/core/markdown-editor/extensions/live-preview/click-handler.ts:3 -> src/lib/utils/sanitize-url.ts isSafeUrl
imp src/lib/core/markdown-editor/extensions/live-preview/click-handler.ts:4 -> src/lib/utils/tag-extraction.ts findInlineTags
imp src/lib/core/markdown-editor/extensions/live-preview/click-handler.ts:5 -> src/lib/utils/platform.ts IS_MAC,isOpenLinkModifier
imp src/lib/core/markdown-editor/extensions/live-preview/click-handler.ts:6 -> src/lib/core/markdown-editor/editor-host.ts editorHost
imp src/lib/core/markdown-editor/extensions/live-preview/click-handler.ts:7 -> src/lib/core/markdown-editor/extensions/live-preview/core/profiling.ts reportError
## imported-by
imp src/lib/core/markdown-editor/extensions/live-preview/live-preview.ts:3 -> src/lib/core/markdown-editor/extensions/live-preview/click-handler.ts livePreviewClickHandler
## reach
in2 src/lib/core/markdown-editor/extensions/live-preview/click-handler.ts 1 files in 1 modules: src/lib/core/markdown-editor(1)
out2 src/lib/core/markdown-editor/extensions/live-preview/click-handler.ts 2 files in 2 modules: src/lib/core/filesystem(1) src/lib/types(1)
## tests
test src/tests/lib/core/markdown-editor/extensions/live-preview/click-handler.test.ts imports src/lib/core/markdown-editor/extensions/live-preview/click-handler.ts mirror
## symbols
sym src/lib/core/markdown-editor/extensions/live-preview/click-handler.ts:17 fn handleLivePreviewLinkMousedown(e: MouseEvent, view: EditorView, mac: boolean = IS_MAC): boolean L25 | Handles a mousedown on a live-preview link.
sym src/lib/core/markdown-editor/extensions/live-preview/click-handler.ts:52 fn handleLivePreviewTagMousedown(e: MouseEvent, view: EditorView, mac: boolean = IS_MAC): boolean L15 | Handles a mousedown on a live-preview tag pill (`.cm-lp-tag`).
sym src/lib/core/markdown-editor/extensions/live-preview/click-handler.ts:68 const livePreviewClickHandler = EditorView.domEventHandlers(…) L3
by src/lib/core/markdown-editor/extensions/live-preview/click-handler.ts:livePreviewClickHandler <- src/lib/core/markdown-editor/extensions/live-preview/live-preview.ts:101 in livePreviewExtensions ref
## calls
call src/lib/core/markdown-editor/extensions/live-preview/click-handler.ts:18 in handleLivePreviewLinkMousedown -> src/lib/utils/platform.ts:isOpenLinkModifier call
call src/lib/core/markdown-editor/extensions/live-preview/click-handler.ts:27 in handleLivePreviewLinkMousedown -> src/lib/core/markdown-editor/extensions/live-preview/parsers/link.ts:findMarkdownLinkUrlAtPosition call
call src/lib/core/markdown-editor/extensions/live-preview/click-handler.ts:34 in handleLivePreviewLinkMousedown -> src/lib/utils/sanitize-url.ts:isSafeUrl call
call src/lib/core/markdown-editor/extensions/live-preview/click-handler.ts:38 in handleLivePreviewLinkMousedown -> src/lib/core/markdown-editor/extensions/live-preview/core/profiling.ts:reportError call
call src/lib/core/markdown-editor/extensions/live-preview/click-handler.ts:53 in handleLivePreviewTagMousedown -> src/lib/utils/platform.ts:isOpenLinkModifier call
call src/lib/core/markdown-editor/extensions/live-preview/click-handler.ts:60 in handleLivePreviewTagMousedown -> src/lib/utils/tag-extraction.ts:findInlineTags call
call src/lib/core/markdown-editor/extensions/live-preview/click-handler.ts:69 in livePreviewClickHandler -> src/lib/core/markdown-editor/extensions/live-preview/click-handler.ts:handleLivePreviewLinkMousedown call
call src/lib/core/markdown-editor/extensions/live-preview/click-handler.ts:69 in livePreviewClickHandler -> src/lib/core/markdown-editor/extensions/live-preview/click-handler.ts:handleLivePreviewTagMousedown call
