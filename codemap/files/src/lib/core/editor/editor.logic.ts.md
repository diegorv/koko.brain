# file card src/lib/core/editor/editor.logic.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/core/editor/editor.logic.ts ' codemap/files
sections: imports, imported-by, reach, tests, symbols, calls
file src/lib/core/editor/editor.logic.ts logic L140 module src/lib/core/editor in21 t18
## imports
imp src/lib/core/editor/editor.logic.ts:1 -> src/lib/utils/path.ts basename
imp src/lib/core/editor/editor.logic.ts:3 -> src/lib/core/editor/editor.types.ts type:EditorTab
## imported-by
imp src/lib/app/EditorView.svelte:27 -> src/lib/core/editor/editor.logic.ts isMarkdownNoteTab,isVirtualTab
imp src/lib/core/editor/editor.service.ts:5 -> src/lib/core/editor/editor.logic.ts findTabIndex,getFileName,isTabDirty,isTabPinned,isVirtualTab
imp src/lib/core/editor/editor.store.svelte.ts:3 -> src/lib/core/editor/editor.logic.ts reorderTabsAfterPinChange,getPinnedBoundary
imp src/lib/core/editor/open-note-at.service.ts:3 -> src/lib/core/editor/editor.logic.ts lineStartToOffset
imp src/lib/core/filesystem/link-updater.service.ts:5 -> src/lib/core/editor/editor.logic.ts isTabDirty
imp src/lib/core/filesystem/path-change.service.ts:9 -> src/lib/core/editor/editor.logic.ts isTabDirty,isVirtualTab
imp src/lib/core/layout/layout.logic.ts:1 -> src/lib/core/editor/editor.logic.ts EVENT_CALENDAR_VIRTUAL_PATH,getFileName,GRAPH_VIRTUAL_PATH,TAGS_VIRTUAL_PATH,TASKS_VIRTUAL_PATH
imp src/lib/core/markdown-editor/EditorTabs.svelte:12 -> src/lib/core/editor/editor.logic.ts isTabDirty,isTabPinned,isVirtualTab
imp src/lib/core/markdown-editor/MarkdownEditor.svelte:23 -> src/lib/core/editor/editor.logic.ts findTabIndex,getPositionAfterFrontmatter
imp src/lib/core/status-bar/SaveStatus.svelte:5 -> src/lib/core/editor/editor.logic.ts isTabDirty,isVirtualTab
imp src/lib/features/auto-organize/auto-organize.service.ts:6 -> src/lib/core/editor/editor.logic.ts isTabDirty
imp src/lib/features/event-calendar/event-calendar.service.ts:17 -> src/lib/core/editor/editor.logic.ts EVENT_CALENDAR_VIRTUAL_PATH,findTabIndex
imp src/lib/features/properties/lifecycle.service.ts:2 -> src/lib/core/editor/editor.logic.ts isMarkdownNoteTab
imp src/lib/features/search/SemanticIndexStatus.svelte:8 -> src/lib/core/editor/editor.logic.ts isVirtualTab
imp src/lib/features/tags/tags.service.ts:5 -> src/lib/core/editor/editor.logic.ts findTabIndex,TAGS_VIRTUAL_PATH
imp src/lib/features/tasks/tasks.service.ts:5 -> src/lib/core/editor/editor.logic.ts findTabIndex,isTabDirty,TASKS_VIRTUAL_PATH
imp src/lib/features/type-definitions/type-definitions.service.ts:9 -> src/lib/core/editor/editor.logic.ts isTabDirty
imp src/lib/plugins/graph-view/graph-view.service.ts:3 -> src/lib/core/editor/editor.logic.ts findTabIndex,GRAPH_VIRTUAL_PATH,isMarkdownNoteTab
imp src/lib/plugins/mods/mod-vault.service.ts:5 -> src/lib/core/editor/editor.logic.ts isTabDirty
imp src/lib/plugins/word-count/WordCount.svelte:4 -> src/lib/core/editor/editor.logic.ts isVirtualTab
imp src/routes/(app)/+layout.svelte:20 -> src/lib/core/editor/editor.logic.ts isVirtualTab
## reach
in2 src/lib/core/editor/editor.logic.ts 80 files in 33 modules: src/lib/features/event-calendar(10) src/lib/app(9) src/lib/features/rail-shell(8) src/lib/features/todoist-sync(4) src/lib/features/backlinks(3) +28 modules: q impact src/lib/core/editor/editor.logic.ts --depth 2
out2 src/lib/core/editor/editor.logic.ts 0 files in 0 modules: -
## tests
test src/tests/lib/core/editor/editor.logic.test.ts imports src/lib/core/editor/editor.logic.ts mirror
test src/tests/lib/app/EditorView.test.ts imports src/lib/core/editor/editor.logic.ts
test src/tests/lib/app/commands.new-commands.test.ts imports src/lib/core/editor/editor.logic.ts
test src/tests/lib/app/commands.test.ts imports src/lib/core/editor/editor.logic.ts
test src/tests/lib/app/global-keybindings.test.ts imports src/lib/core/editor/editor.logic.ts
test src/tests/lib/core/editor/editor.service.test.ts imports src/lib/core/editor/editor.logic.ts
test src/tests/lib/core/layout/layout.logic.test.ts imports src/lib/core/editor/editor.logic.ts
test src/tests/lib/core/layout/layout.service.test.ts imports src/lib/core/editor/editor.logic.ts
test src/tests/lib/core/markdown-editor/MarkdownEditor.test.ts imports src/lib/core/editor/editor.logic.ts
test src/tests/lib/core/markdown-editor/undo-history-across-notes.test.ts imports src/lib/core/editor/editor.logic.ts
test src/tests/lib/features/backlinks/LinkItem.test.ts imports src/lib/core/editor/editor.logic.ts
test src/tests/lib/features/event-calendar/ShowInCalendarButton.test.ts imports src/lib/core/editor/editor.logic.ts
test src/tests/lib/features/event-calendar/event-calendar.service.test.ts imports src/lib/core/editor/editor.logic.ts
test src/tests/lib/features/search/SearchResult.test.ts imports src/lib/core/editor/editor.logic.ts
test src/tests/lib/features/tags/tags.service.test.ts imports src/lib/core/editor/editor.logic.ts
test src/tests/lib/features/todoist-sync/note-writer.service.test.ts imports src/lib/core/editor/editor.logic.ts
test src/tests/lib/plugins/calendar/CalendarNavigator.test.ts imports src/lib/core/editor/editor.logic.ts
test src/tests/lib/plugins/graph-view/graph-view.service.test.ts imports src/lib/core/editor/editor.logic.ts
## symbols
sym src/lib/core/editor/editor.logic.ts:6 const TASKS_VIRTUAL_PATH L1 | Virtual path used for the singleton Tasks tab
by src/lib/core/editor/editor.logic.ts:TASKS_VIRTUAL_PATH <- src/lib/core/layout/layout.logic.ts:17 in NO_RIGHT_SIDEBAR_PATHS ref
by src/lib/core/editor/editor.logic.ts:TASKS_VIRTUAL_PATH <- src/lib/features/tasks/tasks.service.ts:548 in openTasksTab ref +3
sym src/lib/core/editor/editor.logic.ts:9 const GRAPH_VIRTUAL_PATH L1 | Virtual path used for the singleton Graph View tab
by src/lib/core/editor/editor.logic.ts:GRAPH_VIRTUAL_PATH <- src/lib/core/layout/layout.logic.ts:19 in NO_RIGHT_SIDEBAR_PATHS ref
by src/lib/core/editor/editor.logic.ts:GRAPH_VIRTUAL_PATH <- src/lib/plugins/graph-view/graph-view.service.ts:35 in openGraphTab ref +4
sym src/lib/core/editor/editor.logic.ts:12 const TAGS_VIRTUAL_PATH L1 | Virtual path used for the singleton Tags tab
by src/lib/core/editor/editor.logic.ts:TAGS_VIRTUAL_PATH <- src/lib/core/layout/layout.logic.ts:18 in NO_RIGHT_SIDEBAR_PATHS ref
by src/lib/core/editor/editor.logic.ts:TAGS_VIRTUAL_PATH <- src/lib/features/tags/tags.service.ts:126 in openTagsTab ref +3
sym src/lib/core/editor/editor.logic.ts:15 const EVENT_CALENDAR_VIRTUAL_PATH L1 | Virtual path used for the singleton Calendar tab
by src/lib/core/editor/editor.logic.ts:EVENT_CALENDAR_VIRTUAL_PATH <- src/lib/core/layout/layout.logic.ts:16 in NO_RIGHT_SIDEBAR_PATHS ref
by src/lib/core/editor/editor.logic.ts:EVENT_CALENDAR_VIRTUAL_PATH <- src/lib/features/event-calendar/event-calendar.service.ts:141 in openEventCalendarTab ref +3
sym src/lib/core/editor/editor.logic.ts:18 fn isVirtualTab(tab: Pick<EditorTab, 'path'>): boolean L3 | Returns true if the tab represents a virtual (non-file) view
by src/lib/core/editor/editor.logic.ts:isVirtualTab <- src/lib/app/EditorView.svelte:44 in isVirtual=$derived call
by src/lib/core/editor/editor.logic.ts:isVirtualTab <- src/lib/core/editor/editor.service.ts:238 in writeTab call +4
by src/lib/core/editor/editor.logic.ts:isVirtualTab <- src/lib/core/filesystem/path-change.service.ts:67 in saveDirtyTabsUnder call
by src/lib/core/editor/editor.logic.ts:isVirtualTab <- src/lib/core/markdown-editor/EditorTabs.svelte:63 in (markup) markup
by src/lib/core/editor/editor.logic.ts:isVirtualTab <- src/lib/core/status-bar/SaveStatus.svelte:9 in status=$derived call
by src/lib/core/editor/editor.logic.ts:isVirtualTab <- src/lib/features/search/SemanticIndexStatus.svelte:31 in $effect@29 call
by src/lib/core/editor/editor.logic.ts:isVirtualTab <- src/lib/plugins/word-count/WordCount.svelte:13 in isMarkdown=$derived call
by src/lib/core/editor/editor.logic.ts:isVirtualTab <- src/routes/(app)/+layout.svelte:113 in $effect@105 call +1
sym src/lib/core/editor/editor.logic.ts:28 fn isMarkdownNoteTab(tab: Pick<EditorTab, 'path' | 'fileType'>): boolean L5 | Returns true for a tab showing a markdown note file: not virtual, rendered as markdown (no special `fileType`), and named `*.md`, which leaves out other text f…
by src/lib/core/editor/editor.logic.ts:isMarkdownNoteTab <- src/lib/app/EditorView.svelte:45 in isMarkdownNote=$derived call
by src/lib/core/editor/editor.logic.ts:isMarkdownNoteTab <- src/lib/features/properties/lifecycle.service.ts:32 in updateActiveNote call
by src/lib/core/editor/editor.logic.ts:isMarkdownNoteTab <- src/lib/plugins/graph-view/graph-view.service.ts:26 in captureCenterPath call
sym src/lib/core/editor/editor.logic.ts:35 fn getFileName(path: string): string L3 | Extracts the file name from a full path (e.g. "/docs/note.md" → "note.md")
by src/lib/core/editor/editor.logic.ts:getFileName <- src/lib/core/editor/editor.service.ts:160 in openFileInEditor call +2
by src/lib/core/editor/editor.logic.ts:getFileName <- src/lib/core/layout/layout.logic.ts:26 in hidesRightSidebar call
sym src/lib/core/editor/editor.logic.ts:40 fn findTabIndex(tabs: Pick<EditorTab, 'path'>[], path: string): number L3 | Returns the index of an already-open tab by its file path, or -1 if not found
by src/lib/core/editor/editor.logic.ts:findTabIndex <- src/lib/core/editor/editor.service.ts:164 in openFileInEditor call +4
by src/lib/core/editor/editor.logic.ts:findTabIndex <- src/lib/core/markdown-editor/MarkdownEditor.svelte:469 in $effect@455 call +1
by src/lib/core/editor/editor.logic.ts:findTabIndex <- src/lib/features/event-calendar/event-calendar.service.ts:141 in openEventCalendarTab call +2
by src/lib/core/editor/editor.logic.ts:findTabIndex <- src/lib/features/tags/tags.service.ts:126 in openTagsTab call +2
by src/lib/core/editor/editor.logic.ts:findTabIndex <- src/lib/features/tasks/tasks.service.ts:548 in openTasksTab call +2
by src/lib/core/editor/editor.logic.ts:findTabIndex <- src/lib/plugins/graph-view/graph-view.service.ts:37 in openGraphTab call +2
sym src/lib/core/editor/editor.logic.ts:45 fn isTabDirty(tab: Pick<EditorTab, 'content' | 'savedContent'>): boolean L3 | Checks whether a tab has unsaved changes by comparing current content to the last saved snapshot
by src/lib/core/editor/editor.logic.ts:isTabDirty <- src/lib/core/editor/editor.service.ts:238 in writeTab call +4
by src/lib/core/editor/editor.logic.ts:isTabDirty <- src/lib/core/filesystem/link-updater.service.ts:53 in updateLinksAfterRename call
by src/lib/core/editor/editor.logic.ts:isTabDirty <- src/lib/core/filesystem/path-change.service.ts:67 in saveDirtyTabsUnder call
by src/lib/core/editor/editor.logic.ts:isTabDirty <- src/lib/core/markdown-editor/EditorTabs.svelte:63 in (markup) markup
by src/lib/core/editor/editor.logic.ts:isTabDirty <- src/lib/core/status-bar/SaveStatus.svelte:10 in status=$derived call
by src/lib/core/editor/editor.logic.ts:isTabDirty <- src/lib/features/auto-organize/auto-organize.service.ts:482 in applyRename call
by src/lib/core/editor/editor.logic.ts:isTabDirty <- src/lib/features/tasks/tasks.service.ts:344 in preflightTaskWrite call
by src/lib/core/editor/editor.logic.ts:isTabDirty <- src/lib/features/type-definitions/type-definitions.service.ts:388 in rewriteViewFileNow call +1
more by 1 not shown: src/lib/plugins/mods(1): q importers src/lib/core/editor/editor.logic.ts:isTabDirty
sym src/lib/core/editor/editor.logic.ts:50 fn isTabPinned(tab: Pick<EditorTab, 'pinned'>): boolean L3 | Returns whether a tab is pinned
by src/lib/core/editor/editor.logic.ts:isTabPinned <- src/lib/core/editor/editor.service.ts:365 in closeTab call
by src/lib/core/editor/editor.logic.ts:isTabPinned <- src/lib/core/markdown-editor/EditorTabs.svelte:47 in (markup) markup
sym src/lib/core/editor/editor.logic.ts:58 fn getPinnedBoundary(tabs: Pick<EditorTab, 'pinned'>[]): number L8 | Returns the boundary index between pinned and unpinned tabs.
by src/lib/core/editor/editor.logic.ts:getPinnedBoundary <- src/lib/core/editor/editor.store.svelte.ts:54 in editorStore.addTab call
sym src/lib/core/editor/editor.logic.ts:73 fn reorderTabsAfterPinChange(tabs: EditorTab[], tabIndex: number, activeIndex: number, pin: boolean): { tabs: EditorTab[]; activeIndex: number } L31 | Computes the new active index after pinning/unpinning a tab.
by src/lib/core/editor/editor.logic.ts:reorderTabsAfterPinChange <- src/lib/core/editor/editor.store.svelte.ts:150 in editorStore.togglePin call +1
sym src/lib/core/editor/editor.logic.ts:110 fn getPositionAfterFrontmatter(content: string): number L14 | Returns the document position of the first line after a YAML frontmatter block.
by src/lib/core/editor/editor.logic.ts:getPositionAfterFrontmatter <- src/lib/core/markdown-editor/MarkdownEditor.svelte:407 in (script) call +1
sym src/lib/core/editor/editor.logic.ts:132 fn lineStartToOffset(content: string, lineStart: number): number L9 | Converts a 1-indexed line number to the character offset where that line starts.
by src/lib/core/editor/editor.logic.ts:lineStartToOffset <- src/lib/core/editor/open-note-at.service.ts:46 in openNoteAt call
## calls
call src/lib/core/editor/editor.logic.ts:29 in isMarkdownNoteTab -> src/lib/core/editor/editor.logic.ts:isVirtualTab call
call src/lib/core/editor/editor.logic.ts:36 in getFileName -> src/lib/utils/path.ts:basename call
call src/lib/core/editor/editor.logic.ts:85 in reorderTabsAfterPinChange -> src/lib/core/editor/editor.logic.ts:getPinnedBoundary call
