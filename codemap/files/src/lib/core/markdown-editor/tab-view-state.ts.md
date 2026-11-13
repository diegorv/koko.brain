# file card src/lib/core/markdown-editor/tab-view-state.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/core/markdown-editor/tab-view-state.ts ' codemap/files
file src/lib/core/markdown-editor/tab-view-state.ts other L111 module src/lib/core/markdown-editor in3 t2 | Per-tab view state (scroll position, cursor) preserved across tab switches AND across MarkdownEditor component remounts (e.g. when switching to a non-markdown …
## imported-by
imp src/lib/core/editor/editor.service.ts:10 -> src/lib/core/markdown-editor/tab-view-state.ts clearAllTabViewStates,deleteTabViewState
imp src/lib/core/filesystem/link-updater.service.ts:6 -> src/lib/core/markdown-editor/tab-view-state.ts renameTabViewState
imp src/lib/core/markdown-editor/MarkdownEditor.svelte:37 -> src/lib/core/markdown-editor/tab-view-state.ts saveTabViewState,getTabViewState,deleteTabViewState,saveTabEditorState,takeTabEditorState,clearTabEditorStates,takeTabRename
## reach
in2 src/lib/core/markdown-editor/tab-view-state.ts 53 files in 28 modules: src/lib/app(7) src/lib/features/event-calendar(5) src/lib/features/rail-shell(4) src/lib/core/filesystem(2) src/lib/core/vault(2) +23 modules: q impact src/lib/core/markdown-editor/tab-view-state.ts --depth 2
out2 src/lib/core/markdown-editor/tab-view-state.ts 0 files in 0 modules: -
## tests
test src/tests/lib/core/markdown-editor/tab-view-state.test.ts imports src/lib/core/markdown-editor/tab-view-state.ts mirror
test src/tests/lib/core/filesystem/link-updater.service.test.ts imports src/lib/core/markdown-editor/tab-view-state.ts
## symbols
sym src/lib/core/markdown-editor/tab-view-state.ts:11 interface TabViewState L5
sym src/lib/core/markdown-editor/tab-view-state.ts:38 fn saveTabViewState(path: string, state: TabViewState): void L3 | Saves scroll/cursor state for a tab
by src/lib/core/markdown-editor/tab-view-state.ts:saveTabViewState <- src/lib/core/markdown-editor/MarkdownEditor.svelte:442 in (script) call +1
sym src/lib/core/markdown-editor/tab-view-state.ts:43 fn getTabViewState(path: string): TabViewState | undefined L3 | Retrieves saved view state for a tab, or undefined if none
by src/lib/core/markdown-editor/tab-view-state.ts:getTabViewState <- src/lib/core/markdown-editor/MarkdownEditor.svelte:406 in (script) call +1
sym src/lib/core/markdown-editor/tab-view-state.ts:48 fn saveTabEditorState(path: string, state: EditorState): void L3 | Saves the editor state of a tab the user is leaving
by src/lib/core/markdown-editor/tab-view-state.ts:saveTabEditorState <- src/lib/core/markdown-editor/MarkdownEditor.svelte:485 in $effect@455 call
sym src/lib/core/markdown-editor/tab-view-state.ts:53 fn getTabEditorState(path: string): EditorState | undefined L3 | Retrieves the saved editor state of a tab, or undefined if none
sym src/lib/core/markdown-editor/tab-view-state.ts:62 fn takeTabEditorState(path: string): EditorState | undefined L5 | Removes and returns the saved editor state of a tab, or undefined if none.
by src/lib/core/markdown-editor/tab-view-state.ts:takeTabEditorState <- src/lib/core/markdown-editor/MarkdownEditor.svelte:226 in showTabState call
sym src/lib/core/markdown-editor/tab-view-state.ts:75 fn clearTabEditorStates(): void L4 | Removes every saved editor state and every unconsumed rename record; scroll/cursor states are kept.
by src/lib/core/markdown-editor/tab-view-state.ts:clearTabEditorStates <- src/lib/core/markdown-editor/MarkdownEditor.svelte:425 in (script) call +1
sym src/lib/core/markdown-editor/tab-view-state.ts:81 fn deleteTabViewState(path: string): void L4 | Removes saved view and editor state for a tab (e.g. when the tab is closed)
by src/lib/core/markdown-editor/tab-view-state.ts:deleteTabViewState <- src/lib/core/editor/editor.service.ts:391 in closeTab call +1
by src/lib/core/markdown-editor/tab-view-state.ts:deleteTabViewState <- src/lib/core/markdown-editor/MarkdownEditor.svelte:478 in $effect@455 call
sym src/lib/core/markdown-editor/tab-view-state.ts:87 fn renameTabViewState(oldPath: string, newPath: string): void L8 | Moves a tab's saved view and editor state to its new path after a rename or move
by src/lib/core/markdown-editor/tab-view-state.ts:renameTabViewState <- src/lib/core/filesystem/link-updater.service.ts:100 in updateTabAfterRenameOrMove call +1
sym src/lib/core/markdown-editor/tab-view-state.ts:100 fn takeTabRename(oldPath: string): string | undefined L5 | Returns the path `oldPath` was renamed to since the last call, or undefined if it was not renamed, and forgets every recorded rename.
by src/lib/core/markdown-editor/tab-view-state.ts:takeTabRename <- src/lib/core/markdown-editor/MarkdownEditor.svelte:468 in $effect@455 call
sym src/lib/core/markdown-editor/tab-view-state.ts:107 fn clearAllTabViewStates(): void L5 | Clears all saved view and editor states (e.g. on vault switch)
by src/lib/core/markdown-editor/tab-view-state.ts:clearAllTabViewStates <- src/lib/core/editor/editor.service.ts:526 in resetEditor call
## calls
call src/lib/core/markdown-editor/tab-view-state.ts:92 in renameTabViewState -> src/lib/core/markdown-editor/tab-view-state.ts:deleteTabViewState call
