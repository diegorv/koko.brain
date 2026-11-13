# file card src/lib/utils/platform.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/utils/platform.ts ' codemap/files
file src/lib/utils/platform.ts other L40 module src/lib/utils in5 t4
## imported-by
imp src/lib/core/markdown-editor/MarkdownEditor.svelte:32 -> src/lib/utils/platform.ts IS_MAC
imp src/lib/core/markdown-editor/extensions/live-preview/click-handler.ts:5 -> src/lib/utils/platform.ts IS_MAC,isOpenLinkModifier
imp src/lib/core/markdown-editor/extensions/live-preview/widgets.ts:21 -> src/lib/utils/platform.ts IS_MAC,isMacContextClick,isOpenLinkModifier
imp src/lib/core/markdown-editor/wikilink-click-target.ts:3 -> src/lib/utils/platform.ts isMacContextClick,isOpenLinkModifier
imp src/lib/plugins/queryjs/kb-api.ts:13 -> src/lib/utils/platform.ts IS_MAC,isMacContextClick
## reach
in2 src/lib/utils/platform.ts 14 files in 4 modules: src/lib/core/markdown-editor(10) src/lib/plugins/mods(2) src/lib/app(1) src/lib/plugins/queryjs(1)
out2 src/lib/utils/platform.ts 0 files in 0 modules: -
## tests
test src/tests/lib/utils/platform.test.ts imports src/lib/utils/platform.ts mirror
test src/tests/lib/core/markdown-editor/extensions/live-preview/inline/pipeline-dom.test.ts imports src/lib/utils/platform.ts
test src/tests/lib/core/markdown-editor/extensions/live-preview/table-widget.test.ts mocks src/lib/utils/platform.ts
test src/tests/lib/plugins/queryjs/kb-api.test.ts mocks src/lib/utils/platform.ts
## symbols
sym src/lib/utils/platform.ts:2 interface PlatformNavigator L6 | The subset of `Navigator` that platform detection reads.
sym src/lib/utils/platform.ts:10 type LinkClickModifiers L1 | The modifier flags of a mouse event that link-click helpers read.
sym src/lib/utils/platform.ts:17 fn detectMac(nav: PlatformNavigator | undefined): boolean L4 | Returns true when `nav` describes macOS.
sym src/lib/utils/platform.ts:23 const IS_MAC = detectMac(…) L1 | True when the app runs on macOS.
by src/lib/utils/platform.ts:IS_MAC <- src/lib/core/markdown-editor/MarkdownEditor.svelte:275 in handleEditorClick ref
by src/lib/utils/platform.ts:IS_MAC <- src/lib/core/markdown-editor/extensions/live-preview/click-handler.ts:17 in handleLivePreviewLinkMousedown ref +1
by src/lib/utils/platform.ts:IS_MAC <- src/lib/core/markdown-editor/extensions/live-preview/widgets.ts:285 in renderInlineSegments ref +2
by src/lib/utils/platform.ts:IS_MAC <- src/lib/plugins/queryjs/kb-api.ts:509 in KBAPI.renderValue ref
sym src/lib/utils/platform.ts:30 fn isOpenLinkModifier(e: LinkClickModifiers, mac: boolean): boolean L3 | True when a click carries the platform's "open link" modifier: Cmd on macOS, Ctrl on Windows/Linux.
by src/lib/utils/platform.ts:isOpenLinkModifier <- src/lib/core/markdown-editor/extensions/live-preview/click-handler.ts:18 in handleLivePreviewLinkMousedown call +1
by src/lib/utils/platform.ts:isOpenLinkModifier <- src/lib/core/markdown-editor/extensions/live-preview/widgets.ts:285 in renderInlineSegments call
by src/lib/utils/platform.ts:isOpenLinkModifier <- src/lib/core/markdown-editor/wikilink-click-target.ts:70 in resolveWikilinkClickPosition call
sym src/lib/utils/platform.ts:38 fn isMacContextClick(e: LinkClickModifiers, mac: boolean): boolean L3 | True for a macOS Ctrl+click.
by src/lib/utils/platform.ts:isMacContextClick <- src/lib/core/markdown-editor/extensions/live-preview/widgets.ts:342 in renderCellContent call +1
by src/lib/utils/platform.ts:isMacContextClick <- src/lib/core/markdown-editor/wikilink-click-target.ts:66 in resolveWikilinkClickPosition call
by src/lib/utils/platform.ts:isMacContextClick <- src/lib/plugins/queryjs/kb-api.ts:509 in KBAPI.renderValue call
## calls
call src/lib/utils/platform.ts:23 in IS_MAC -> src/lib/utils/platform.ts:detectMac call
