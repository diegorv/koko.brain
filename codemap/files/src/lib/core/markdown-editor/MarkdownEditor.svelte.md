# file card src/lib/core/markdown-editor/MarkdownEditor.svelte
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/core/markdown-editor/MarkdownEditor.svelte ' codemap/files
sections: imports, imported-by, reach, tests, symbols, locals, mounted-at, calls, effects
file src/lib/core/markdown-editor/MarkdownEditor.svelte component L762 module src/lib/core/markdown-editor in1 t3
## imports
imp src/lib/core/markdown-editor/MarkdownEditor.svelte:13 -> pkg:@tauri-apps/plugin-clipboard-manager readText
imp src/lib/core/markdown-editor/MarkdownEditor.svelte:21 -> src/lib/components/ui/context-menu/index.ts *
imp src/lib/core/markdown-editor/MarkdownEditor.svelte:22 -> src/lib/core/editor/editor.store.svelte.ts editorStore
imp src/lib/core/markdown-editor/MarkdownEditor.svelte:23 -> src/lib/core/editor/editor.logic.ts findTabIndex,getPositionAfterFrontmatter
imp src/lib/core/markdown-editor/MarkdownEditor.svelte:24 -> src/lib/core/settings/settings.store.svelte.ts settingsStore
imp src/lib/core/markdown-editor/MarkdownEditor.svelte:25 -> src/lib/core/settings/applied-theme.store.svelte.ts appliedThemeStore
imp src/lib/core/markdown-editor/MarkdownEditor.svelte:26 -> src/lib/core/settings/settings.service.ts applyHeadingTypography
imp src/lib/core/markdown-editor/MarkdownEditor.svelte:27 -> src/lib/core/settings/settings.logic.ts effectiveContentWidth
imp src/lib/core/markdown-editor/MarkdownEditor.svelte:28 -> src/lib/core/editor/editor.service.ts onContentChange
imp src/lib/core/markdown-editor/MarkdownEditor.svelte:29 -> src/lib/core/markdown-editor/extensions/live-preview/index.ts forceDecorationRebuild
imp src/lib/core/markdown-editor/MarkdownEditor.svelte:30 -> src/lib/core/markdown-editor/extensions/live-preview/wikilink-navigation.ts followWikilinkClick
imp src/lib/core/markdown-editor/MarkdownEditor.svelte:31 -> src/lib/utils/debug.ts debug,error,perfStart,perfEnd,perfBaseline
imp src/lib/core/markdown-editor/MarkdownEditor.svelte:32 -> src/lib/utils/platform.ts IS_MAC
imp src/lib/core/markdown-editor/MarkdownEditor.svelte:33 -> src/lib/utils/keybindings.ts formatShortcut
imp src/lib/core/markdown-editor/MarkdownEditor.svelte:34 -> src/lib/core/markdown-editor/editor-host.ts type:BlockLinkActions,type:EditorHost
imp src/lib/core/markdown-editor/MarkdownEditor.svelte:35 -> src/lib/core/markdown-editor/extensions/live-preview/core/fenced-block-renderers.ts type:FencedBlockRenderer
imp src/lib/core/markdown-editor/MarkdownEditor.svelte:36 -> src/lib/core/markdown-editor/highlight-styles.ts getLanguageEffects,getLanguageEffectsSync
imp src/lib/core/markdown-editor/MarkdownEditor.svelte:37 -> src/lib/core/markdown-editor/tab-view-state.ts saveTabViewState,getTabViewState,deleteTabViewState,saveTabEditorState,takeTabEditorState,clearTabEditorStates,takeTabRename
imp src/lib/core/markdown-editor/MarkdownEditor.svelte:46 -> src/lib/core/markdown-editor/setup/index.ts buildEditorTheme,createExtensions,editorModeEffects
imp src/lib/core/markdown-editor/MarkdownEditor.svelte:47 -> src/lib/core/markdown-editor/setup/editor-extensions.ts COPY_BLOCK_LINK_SHORTCUT
imp src/lib/core/markdown-editor/MarkdownEditor.svelte:48 -> src/lib/core/markdown-editor/doc-diff.logic.ts docDiff
imp src/lib/core/markdown-editor/MarkdownEditor.svelte:49 -> src/lib/core/markdown-editor/wikilink-click-target.ts resolveWikilinkClickPosition
## imported-by
imp src/lib/app/EditorView.svelte:12 -> src/lib/core/markdown-editor/MarkdownEditor.svelte default
## reach
in2 src/lib/core/markdown-editor/MarkdownEditor.svelte 1 files in 1 modules: src/lib/app(1)
out2 src/lib/core/markdown-editor/MarkdownEditor.svelte 49 files in 8 modules: src/lib/components(16) src/lib/core/markdown-editor(13) src/lib/core/settings(7) src/lib/utils(6) src/lib/contracts(2) +3 modules
## tests
test src/tests/lib/core/markdown-editor/MarkdownEditor.test.ts imports src/lib/core/markdown-editor/MarkdownEditor.svelte mirror
test src/tests/lib/core/markdown-editor/undo-history-across-notes.test.ts imports src/lib/core/markdown-editor/MarkdownEditor.svelte
test src/tests/lib/features/todoist-sync/note-writer.service.test.ts imports src/lib/core/markdown-editor/MarkdownEditor.svelte
## symbols
sym src/lib/core/markdown-editor/MarkdownEditor.svelte:1 component MarkdownEditor props:host,renderers,blockLinks L762
by src/lib/core/markdown-editor/MarkdownEditor.svelte:default <- src/lib/app/EditorView.svelte:93 in (markup) mount
## locals
local src/lib/core/markdown-editor/MarkdownEditor.svelte:84 fn applyLanguageForTab(tabName: string) L5
local src/lib/core/markdown-editor/MarkdownEditor.svelte:96 fn toDocText(content: string): string L3
local src/lib/core/markdown-editor/MarkdownEditor.svelte:107 fn freshState(content: string, cursorPos: number): EditorState L27
local src/lib/core/markdown-editor/MarkdownEditor.svelte:139 fn setViewState(next: EditorState) L13
local src/lib/core/markdown-editor/MarkdownEditor.svelte:175 fn replaceDoc(content: string, cursorPos: number) L30
local src/lib/core/markdown-editor/MarkdownEditor.svelte:221 fn showTabState(path: string, content: string, cursorPos: number, langEffects: StateEffect<unknown>[]) L34
local src/lib/core/markdown-editor/MarkdownEditor.svelte:257 fn tabScrollLogOn(): boolean L3
local src/lib/core/markdown-editor/MarkdownEditor.svelte:267 fn logTabScroll(step: string, path: string) L5
local src/lib/core/markdown-editor/MarkdownEditor.svelte:273 fn handleEditorClick(e: MouseEvent) L17
local src/lib/core/markdown-editor/MarkdownEditor.svelte:302 fn handleContextMenu(e: MouseEvent) L9
local src/lib/core/markdown-editor/MarkdownEditor.svelte:313 fn selectedText(state: EditorState): string L6
local src/lib/core/markdown-editor/MarkdownEditor.svelte:321 fn writeSelection(editorView: EditorView): Promise<boolean> L10
local src/lib/core/markdown-editor/MarkdownEditor.svelte:332 fn handleCopy() L6
local src/lib/core/markdown-editor/MarkdownEditor.svelte:339 fn handleCut() L10
local src/lib/core/markdown-editor/MarkdownEditor.svelte:354 fn handlePaste() L18
local src/lib/core/markdown-editor/MarkdownEditor.svelte:373 fn handleSelectAll() L5
local src/lib/core/markdown-editor/MarkdownEditor.svelte:384 fn moveCursorToContextMenuPos(editorView: EditorView) L4
local src/lib/core/markdown-editor/MarkdownEditor.svelte:389 fn handleCopyBlockLink() L5
local src/lib/core/markdown-editor/MarkdownEditor.svelte:395 fn handleCopyBlockEmbed() L5
## mounted-at
mount src/lib/app/EditorView.svelte:93 MarkdownEditor -> src/lib/core/markdown-editor/MarkdownEditor.svelte
## calls
call src/lib/core/markdown-editor/MarkdownEditor.svelte:86 in applyLanguageForTab -> src/lib/core/markdown-editor/highlight-styles.ts:getLanguageEffects call
call src/lib/core/markdown-editor/MarkdownEditor.svelte:108 in freshState -> src/lib/core/markdown-editor/MarkdownEditor.svelte:toDocText call
call src/lib/core/markdown-editor/MarkdownEditor.svelte:112 in freshState -> src/lib/core/markdown-editor/setup/editor-extensions.ts:createExtensions call
call src/lib/core/markdown-editor/MarkdownEditor.svelte:117 in freshState -> src/lib/core/settings/settings.logic.ts:effectiveContentWidth call
call src/lib/core/markdown-editor/MarkdownEditor.svelte:128 in freshState -> src/lib/core/editor/editor.service.ts:onContentChange call
call src/lib/core/markdown-editor/MarkdownEditor.svelte:144 in setViewState -> src/lib/utils/debug.ts:error call +1
call src/lib/core/markdown-editor/MarkdownEditor.svelte:178 in replaceDoc -> src/lib/core/markdown-editor/MarkdownEditor.svelte:toDocText call
call src/lib/core/markdown-editor/MarkdownEditor.svelte:179 in replaceDoc -> src/lib/core/markdown-editor/doc-diff.logic.ts:docDiff call +1
call src/lib/core/markdown-editor/MarkdownEditor.svelte:183 in replaceDoc -> src/lib/core/markdown-editor/MarkdownEditor.svelte:freshState call
call src/lib/core/markdown-editor/MarkdownEditor.svelte:186 in replaceDoc -> src/lib/core/markdown-editor/MarkdownEditor.svelte:setViewState call
call src/lib/core/markdown-editor/MarkdownEditor.svelte:196 in replaceDoc -> src/lib/utils/debug.ts:error call +1
call src/lib/core/markdown-editor/MarkdownEditor.svelte:223 in showTabState -> src/lib/core/markdown-editor/MarkdownEditor.svelte:toDocText call
call src/lib/core/markdown-editor/MarkdownEditor.svelte:226 in showTabState -> src/lib/core/markdown-editor/tab-view-state.ts:takeTabEditorState call
call src/lib/core/markdown-editor/MarkdownEditor.svelte:227 in showTabState -> src/lib/core/markdown-editor/doc-diff.logic.ts:docDiff call
call src/lib/core/markdown-editor/MarkdownEditor.svelte:235 in showTabState -> src/lib/core/markdown-editor/setup/editor-theme.ts:buildEditorTheme call
call src/lib/core/markdown-editor/MarkdownEditor.svelte:244 in showTabState -> src/lib/core/markdown-editor/setup/editor-extensions.ts:editorModeEffects call
call src/lib/core/markdown-editor/MarkdownEditor.svelte:248 in showTabState -> src/lib/core/markdown-editor/MarkdownEditor.svelte:freshState call +1
call src/lib/core/markdown-editor/MarkdownEditor.svelte:250 in showTabState -> src/lib/utils/debug.ts:error call
call src/lib/core/markdown-editor/MarkdownEditor.svelte:253 in showTabState -> src/lib/core/markdown-editor/MarkdownEditor.svelte:setViewState call
call src/lib/core/markdown-editor/MarkdownEditor.svelte:268 in logTabScroll -> src/lib/core/markdown-editor/MarkdownEditor.svelte:tabScrollLogOn call
call src/lib/core/markdown-editor/MarkdownEditor.svelte:270 in logTabScroll -> src/lib/utils/debug.ts:debug call
call src/lib/core/markdown-editor/MarkdownEditor.svelte:275 in handleEditorClick -> src/lib/core/markdown-editor/wikilink-click-target.ts:resolveWikilinkClickPosition call
call src/lib/core/markdown-editor/MarkdownEditor.svelte:288 in handleEditorClick -> src/lib/core/markdown-editor/extensions/live-preview/wikilink-navigation.ts:followWikilinkClick call
call src/lib/core/markdown-editor/MarkdownEditor.svelte:323 in writeSelection -> src/lib/core/markdown-editor/MarkdownEditor.svelte:selectedText call
call src/lib/core/markdown-editor/MarkdownEditor.svelte:326 in writeSelection -> src/lib/utils/debug.ts:error call
call src/lib/core/markdown-editor/MarkdownEditor.svelte:335 in handleCopy -> src/lib/core/markdown-editor/MarkdownEditor.svelte:writeSelection call
call src/lib/core/markdown-editor/MarkdownEditor.svelte:344 in handleCut -> src/lib/core/markdown-editor/MarkdownEditor.svelte:writeSelection call
call src/lib/core/markdown-editor/MarkdownEditor.svelte:367 in handlePaste -> src/lib/utils/debug.ts:error call
call src/lib/core/markdown-editor/MarkdownEditor.svelte:391 in handleCopyBlockLink -> src/lib/core/markdown-editor/MarkdownEditor.svelte:moveCursorToContextMenuPos call
call src/lib/core/markdown-editor/MarkdownEditor.svelte:397 in handleCopyBlockEmbed -> src/lib/core/markdown-editor/MarkdownEditor.svelte:moveCursorToContextMenuPos call
call src/lib/core/markdown-editor/MarkdownEditor.svelte:406 in (script) -> src/lib/core/markdown-editor/tab-view-state.ts:getTabViewState call
call src/lib/core/markdown-editor/MarkdownEditor.svelte:407 in (script) -> src/lib/core/editor/editor.logic.ts:getPositionAfterFrontmatter call
call src/lib/core/markdown-editor/MarkdownEditor.svelte:407 in (script) -> src/lib/core/markdown-editor/MarkdownEditor.svelte:toDocText call
call src/lib/core/markdown-editor/MarkdownEditor.svelte:409 in (script) -> src/lib/core/markdown-editor/MarkdownEditor.svelte:freshState call
call src/lib/core/markdown-editor/MarkdownEditor.svelte:412 in (script) -> src/lib/core/editor/editor.store.svelte.ts:editorStore.setEditorView mcall +1
call src/lib/core/markdown-editor/MarkdownEditor.svelte:413 in (script) -> src/lib/core/markdown-editor/MarkdownEditor.svelte:applyLanguageForTab call
call src/lib/core/markdown-editor/MarkdownEditor.svelte:425 in (script) -> src/lib/core/markdown-editor/tab-view-state.ts:clearTabEditorStates call +1
call src/lib/core/markdown-editor/MarkdownEditor.svelte:426 in (script) -> src/lib/core/markdown-editor/MarkdownEditor.svelte:handleEditorClick ref +1
call src/lib/core/markdown-editor/MarkdownEditor.svelte:442 in (script) -> src/lib/core/markdown-editor/tab-view-state.ts:saveTabViewState call
call src/lib/core/markdown-editor/MarkdownEditor.svelte:468 in $effect@455 -> src/lib/core/markdown-editor/tab-view-state.ts:takeTabRename call
call src/lib/core/markdown-editor/MarkdownEditor.svelte:469 in $effect@455 -> src/lib/core/editor/editor.logic.ts:findTabIndex call +1
call src/lib/core/markdown-editor/MarkdownEditor.svelte:478 in $effect@455 -> src/lib/core/markdown-editor/tab-view-state.ts:deleteTabViewState call
call src/lib/core/markdown-editor/MarkdownEditor.svelte:480 in $effect@455 -> src/lib/core/markdown-editor/tab-view-state.ts:saveTabViewState call
call src/lib/core/markdown-editor/MarkdownEditor.svelte:485 in $effect@455 -> src/lib/core/markdown-editor/tab-view-state.ts:saveTabEditorState call
call src/lib/core/markdown-editor/MarkdownEditor.svelte:494 in $effect@455 -> src/lib/core/markdown-editor/tab-view-state.ts:getTabViewState call
call src/lib/core/markdown-editor/MarkdownEditor.svelte:495 in $effect@455 -> src/lib/core/editor/editor.logic.ts:getPositionAfterFrontmatter call
call src/lib/core/markdown-editor/MarkdownEditor.svelte:495 in $effect@455 -> src/lib/core/markdown-editor/MarkdownEditor.svelte:toDocText call
call src/lib/core/markdown-editor/MarkdownEditor.svelte:502 in $effect@455 -> src/lib/core/markdown-editor/highlight-styles.ts:getLanguageEffectsSync call
call src/lib/core/markdown-editor/MarkdownEditor.svelte:508 in $effect@455 -> src/lib/utils/debug.ts:debug call +3
call src/lib/core/markdown-editor/MarkdownEditor.svelte:515 in $effect@455 -> src/lib/core/markdown-editor/MarkdownEditor.svelte:logTabScroll call +7
call src/lib/core/markdown-editor/MarkdownEditor.svelte:516 in $effect@455 -> src/lib/utils/debug.ts:perfStart call +1
call src/lib/core/markdown-editor/MarkdownEditor.svelte:518 in $effect@455 -> src/lib/core/markdown-editor/MarkdownEditor.svelte:showTabState call
call src/lib/core/markdown-editor/MarkdownEditor.svelte:522 in $effect@455 -> src/lib/utils/debug.ts:perfEnd call +1
call src/lib/core/markdown-editor/MarkdownEditor.svelte:528 in $effect@455 -> src/lib/core/markdown-editor/MarkdownEditor.svelte:applyLanguageForTab call
call src/lib/core/markdown-editor/MarkdownEditor.svelte:560 in $effect@455 -> src/lib/core/markdown-editor/MarkdownEditor.svelte:tabScrollLogOn call
call src/lib/core/markdown-editor/MarkdownEditor.svelte:577 in $effect@455 -> src/lib/core/markdown-editor/extensions/live-preview/core/effects.ts:forceDecorationRebuild mcall
call src/lib/core/markdown-editor/MarkdownEditor.svelte:597 in $effect@591 -> src/lib/core/editor/editor.store.svelte.ts:editorStore.setPendingScrollPosition mcall
call src/lib/core/markdown-editor/MarkdownEditor.svelte:605 in $effect@591 -> src/lib/core/markdown-editor/MarkdownEditor.svelte:logTabScroll call +1
call src/lib/core/markdown-editor/MarkdownEditor.svelte:640 in $effect@630 -> src/lib/utils/debug.ts:perfStart call
call src/lib/core/markdown-editor/MarkdownEditor.svelte:649 in $effect@630 -> src/lib/core/markdown-editor/MarkdownEditor.svelte:replaceDoc call
call src/lib/core/markdown-editor/MarkdownEditor.svelte:653 in $effect@630 -> src/lib/utils/debug.ts:perfBaseline call
call src/lib/core/markdown-editor/MarkdownEditor.svelte:662 in $effect@657 -> src/lib/core/markdown-editor/setup/editor-extensions.ts:editorModeEffects call
call src/lib/core/markdown-editor/MarkdownEditor.svelte:672 in $effect@667 -> src/lib/core/markdown-editor/extensions/live-preview/core/effects.ts:forceDecorationRebuild mcall
call src/lib/core/markdown-editor/MarkdownEditor.svelte:688 in $effect@683 -> src/lib/core/markdown-editor/extensions/live-preview/core/effects.ts:forceDecorationRebuild mcall
call src/lib/core/markdown-editor/MarkdownEditor.svelte:700 in contentWidth=$derived -> src/lib/core/settings/settings.logic.ts:effectiveContentWidth call
call src/lib/core/markdown-editor/MarkdownEditor.svelte:711 in $effect@703 -> src/lib/core/markdown-editor/setup/editor-theme.ts:buildEditorTheme call
call src/lib/core/markdown-editor/MarkdownEditor.svelte:722 in $effect@718 -> src/lib/core/settings/settings.service.ts:applyHeadingTypography call
call src/lib/core/markdown-editor/MarkdownEditor.svelte:731 in (markup) -> src/lib/core/markdown-editor/MarkdownEditor.svelte:handleContextMenu markup
call src/lib/core/markdown-editor/MarkdownEditor.svelte:735 in (markup) -> src/lib/core/markdown-editor/MarkdownEditor.svelte:handleCut markup
call src/lib/core/markdown-editor/MarkdownEditor.svelte:739 in (markup) -> src/lib/core/markdown-editor/MarkdownEditor.svelte:handleCopy markup
call src/lib/core/markdown-editor/MarkdownEditor.svelte:743 in (markup) -> src/lib/core/markdown-editor/MarkdownEditor.svelte:handlePaste markup
call src/lib/core/markdown-editor/MarkdownEditor.svelte:747 in (markup) -> src/lib/core/markdown-editor/MarkdownEditor.svelte:handleSelectAll markup
call src/lib/core/markdown-editor/MarkdownEditor.svelte:752 in (markup) -> src/lib/core/markdown-editor/MarkdownEditor.svelte:handleCopyBlockLink markup
call src/lib/core/markdown-editor/MarkdownEditor.svelte:755 in (markup) -> src/lib/utils/keybindings.ts:formatShortcut markup
call src/lib/core/markdown-editor/MarkdownEditor.svelte:757 in (markup) -> src/lib/core/markdown-editor/MarkdownEditor.svelte:handleCopyBlockEmbed markup
## effects
fx src/lib/core/markdown-editor/MarkdownEditor.svelte:358 tauri-clipboard-manager.readText in handlePaste
fx src/lib/core/markdown-editor/MarkdownEditor.svelte:418 timer.requestAnimationFrame in (script)
fx src/lib/core/markdown-editor/MarkdownEditor.svelte:426 dom.mousedown container in (script)
fx src/lib/core/markdown-editor/MarkdownEditor.svelte:455 svelte.$effect in (script)
fx src/lib/core/markdown-editor/MarkdownEditor.svelte:560 dom.scroll scrollDOM in $effect@455
fx src/lib/core/markdown-editor/MarkdownEditor.svelte:566 timer.requestAnimationFrame in $effect@455
fx src/lib/core/markdown-editor/MarkdownEditor.svelte:572 timer.requestAnimationFrame in $effect@455
fx src/lib/core/markdown-editor/MarkdownEditor.svelte:579 timer.requestAnimationFrame in $effect@455
fx src/lib/core/markdown-editor/MarkdownEditor.svelte:591 svelte.$effect in (script)
fx src/lib/core/markdown-editor/MarkdownEditor.svelte:600 timer.requestAnimationFrame in $effect@591
fx src/lib/core/markdown-editor/MarkdownEditor.svelte:601 timer.requestAnimationFrame in $effect@591
fx src/lib/core/markdown-editor/MarkdownEditor.svelte:630 svelte.$effect in (script)
fx src/lib/core/markdown-editor/MarkdownEditor.svelte:657 svelte.$effect in (script)
fx src/lib/core/markdown-editor/MarkdownEditor.svelte:667 svelte.$effect in (script)
fx src/lib/core/markdown-editor/MarkdownEditor.svelte:683 svelte.$effect in (script)
fx src/lib/core/markdown-editor/MarkdownEditor.svelte:703 svelte.$effect in (script)
fx src/lib/core/markdown-editor/MarkdownEditor.svelte:718 svelte.$effect in (script)
