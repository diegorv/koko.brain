# file card src/lib/core/markdown-editor/extensions/live-preview/wikilink-navigation.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/core/markdown-editor/extensions/live-preview/wikilink-navigation.ts ' codemap/files
file src/lib/core/markdown-editor/extensions/live-preview/wikilink-navigation.ts other L66 module src/lib/core/markdown-editor in4 t3
## imports
imp src/lib/core/markdown-editor/extensions/live-preview/wikilink-navigation.ts:3 -> src/lib/core/filesystem/fs.logic.ts isBinaryFile
imp src/lib/core/markdown-editor/extensions/live-preview/wikilink-navigation.ts:4 -> src/lib/core/markdown-editor/editor-host.ts type:EditorHost,type:LinkAnchor
imp src/lib/core/markdown-editor/extensions/live-preview/wikilink-navigation.ts:5 -> src/lib/core/markdown-editor/editor-host.ts editorHost
imp src/lib/core/markdown-editor/extensions/live-preview/wikilink-navigation.ts:6 -> src/lib/core/markdown-editor/extensions/wikilink/index.ts findWikilinkInfoAtPosition,findHeadingPosition,findBlockIdPosition,type:WikilinkInfo
imp src/lib/core/markdown-editor/extensions/live-preview/wikilink-navigation.ts:7 -> src/lib/core/markdown-editor/extensions/live-preview/core/profiling.ts reportError
## imported-by
imp src/lib/app/editor-host.ts:19 -> src/lib/core/markdown-editor/extensions/live-preview/wikilink-navigation.ts followWikilink
imp src/lib/core/markdown-editor/MarkdownEditor.svelte:30 -> src/lib/core/markdown-editor/extensions/live-preview/wikilink-navigation.ts followWikilinkClick
imp src/lib/core/markdown-editor/extensions/live-preview/widgets.ts:25 -> src/lib/core/markdown-editor/extensions/live-preview/wikilink-navigation.ts followWikilinkInfo
imp src/lib/core/markdown-editor/extensions/live-preview/widgets/meta-bind-button-widget.ts:6 -> src/lib/core/markdown-editor/extensions/live-preview/wikilink-navigation.ts followWikilinkInfo
## reach
in2 src/lib/core/markdown-editor/extensions/live-preview/wikilink-navigation.ts 9 files in 2 modules: src/lib/core/markdown-editor(8) src/lib/app(1)
out2 src/lib/core/markdown-editor/extensions/live-preview/wikilink-navigation.ts 8 files in 4 modules: src/lib/core/markdown-editor(4) src/lib/core/filesystem(2) src/lib/types(1) src/lib/utils(1)
## tests
test src/tests/lib/app/editor-host.test.ts imports src/lib/core/markdown-editor/extensions/live-preview/wikilink-navigation.ts
test src/tests/lib/app/meta-bind-open-view.test.ts imports src/lib/core/markdown-editor/extensions/live-preview/wikilink-navigation.ts
test src/tests/lib/core/markdown-editor/editor-host.test.ts imports src/lib/core/markdown-editor/extensions/live-preview/wikilink-navigation.ts
## symbols
sym src/lib/core/markdown-editor/extensions/live-preview/wikilink-navigation.ts:17 fn followWikilink(host: EditorHost, target: string, anchor?: LinkAnchor): Promise<void> L6 | Follows a wikilink target through the host: opens the note it resolves to, or creates it (a periodic note when the name matches a periodic format).
by src/lib/core/markdown-editor/extensions/live-preview/wikilink-navigation.ts:followWikilink <- src/lib/app/editor-host.ts:206 in openWikilinkTarget call
sym src/lib/core/markdown-editor/extensions/live-preview/wikilink-navigation.ts:28 fn followWikilinkClick(view: EditorView, pos: number): Promise<void> L11 | Follows the wikilink at `pos` in `view` through `followWikilinkInfo`.
by src/lib/core/markdown-editor/extensions/live-preview/wikilink-navigation.ts:followWikilinkClick <- src/lib/core/markdown-editor/MarkdownEditor.svelte:288 in handleEditorClick call
sym src/lib/core/markdown-editor/extensions/live-preview/wikilink-navigation.ts:45 fn followWikilinkInfo(view: EditorView, info: WikilinkInfo): Promise<void> L22 | Follows a parsed wikilink from `view`.
by src/lib/core/markdown-editor/extensions/live-preview/wikilink-navigation.ts:followWikilinkInfo <- src/lib/core/markdown-editor/extensions/live-preview/widgets.ts:348 in renderCellContent call +1
by src/lib/core/markdown-editor/extensions/live-preview/wikilink-navigation.ts:followWikilinkInfo <- src/lib/core/markdown-editor/extensions/live-preview/widgets/meta-bind-button-widget.ts:112 in executeButtonAction call
## calls
call src/lib/core/markdown-editor/extensions/live-preview/wikilink-navigation.ts:18 in followWikilink -> src/lib/core/filesystem/fs.logic.ts:isBinaryFile call
call src/lib/core/markdown-editor/extensions/live-preview/wikilink-navigation.ts:32 in followWikilinkClick -> src/lib/core/markdown-editor/extensions/wikilink/decoration.logic.ts:findWikilinkInfoAtPosition call
call src/lib/core/markdown-editor/extensions/live-preview/wikilink-navigation.ts:34 in followWikilinkClick -> src/lib/core/markdown-editor/extensions/live-preview/core/profiling.ts:reportError call
call src/lib/core/markdown-editor/extensions/live-preview/wikilink-navigation.ts:37 in followWikilinkClick -> src/lib/core/markdown-editor/extensions/live-preview/wikilink-navigation.ts:followWikilinkInfo call
call src/lib/core/markdown-editor/extensions/live-preview/wikilink-navigation.ts:53 in followWikilinkInfo -> src/lib/core/markdown-editor/extensions/wikilink/navigation.logic.ts:findHeadingPosition call
call src/lib/core/markdown-editor/extensions/live-preview/wikilink-navigation.ts:54 in followWikilinkInfo -> src/lib/core/markdown-editor/extensions/wikilink/navigation.logic.ts:findBlockIdPosition call
call src/lib/core/markdown-editor/extensions/live-preview/wikilink-navigation.ts:62 in followWikilinkInfo -> src/lib/core/markdown-editor/extensions/live-preview/wikilink-navigation.ts:followWikilink call
call src/lib/core/markdown-editor/extensions/live-preview/wikilink-navigation.ts:64 in followWikilinkInfo -> src/lib/core/markdown-editor/extensions/live-preview/core/profiling.ts:reportError call
