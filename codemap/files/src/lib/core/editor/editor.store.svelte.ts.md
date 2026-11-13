# file card src/lib/core/editor/editor.store.svelte.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/core/editor/editor.store.svelte.ts ' codemap/files
sections: imports, imported-by, reach, tests, symbols, store, calls
file src/lib/core/editor/editor.store.svelte.ts store L173 module src/lib/core/editor in48 t107
## imports
imp src/lib/core/editor/editor.store.svelte.ts:2 -> src/lib/core/editor/editor.types.ts type:EditorTab
imp src/lib/core/editor/editor.store.svelte.ts:3 -> src/lib/core/editor/editor.logic.ts reorderTabsAfterPinChange,getPinnedBoundary
## imported-by
imp src/lib/app/AppShell.svelte:54 -> src/lib/core/editor/editor.store.svelte.ts editorStore
imp src/lib/app/EditorView.svelte:8 -> src/lib/core/editor/editor.store.svelte.ts editorStore
imp src/lib/app/commands.ts:29 -> src/lib/core/editor/editor.store.svelte.ts editorStore
imp src/lib/app/editor-host.ts:6 -> src/lib/core/editor/editor.store.svelte.ts editorStore
imp src/lib/app/global-keybindings.ts:19 -> src/lib/core/editor/editor.store.svelte.ts editorStore
imp src/lib/core/editor/editor.service.ts:4 -> src/lib/core/editor/editor.store.svelte.ts editorStore
imp src/lib/core/editor/open-note-at.service.ts:4 -> src/lib/core/editor/editor.store.svelte.ts editorStore
imp src/lib/core/filesystem/link-updater.service.ts:3 -> src/lib/core/editor/editor.store.svelte.ts editorStore
imp src/lib/core/filesystem/path-change.service.ts:8 -> src/lib/core/editor/editor.store.svelte.ts editorStore
imp src/lib/core/frontmatter/frontmatter-write.service.ts:3 -> src/lib/core/editor/editor.store.svelte.ts editorStore
imp src/lib/core/layout/layout.service.ts:1 -> src/lib/core/editor/editor.store.svelte.ts editorStore
imp src/lib/core/markdown-editor/EditorTabs.svelte:10 -> src/lib/core/editor/editor.store.svelte.ts editorStore
imp src/lib/core/markdown-editor/MarkdownEditor.svelte:22 -> src/lib/core/editor/editor.store.svelte.ts editorStore
imp src/lib/core/status-bar/SaveStatus.svelte:4 -> src/lib/core/editor/editor.store.svelte.ts editorStore
imp src/lib/features/auto-organize/AutoOrganizeRuleProperty.svelte:14 -> src/lib/core/editor/editor.store.svelte.ts editorStore
imp src/lib/features/auto-organize/auto-organize.service.ts:12 -> src/lib/core/editor/editor.store.svelte.ts editorStore
imp src/lib/features/backlinks/BacklinksPanel.svelte:8 -> src/lib/core/editor/editor.store.svelte.ts editorStore
imp src/lib/features/backlinks/backlinks.service.ts:4 -> src/lib/core/editor/editor.store.svelte.ts editorStore
imp src/lib/features/copy-block-link/copy-block-link.service.ts:3 -> src/lib/core/editor/editor.store.svelte.ts editorStore
imp src/lib/features/event-calendar/event-calendar.service.ts:19 -> src/lib/core/editor/editor.store.svelte.ts editorStore
imp src/lib/features/file-history/file-history.service.ts:6 -> src/lib/core/editor/editor.store.svelte.ts editorStore
imp src/lib/features/file-icons/frontmatter-icon.service.ts:2 -> src/lib/core/editor/editor.store.svelte.ts editorStore
imp src/lib/features/note-action-bar/NoteActionBar.svelte:25 -> src/lib/core/editor/editor.store.svelte.ts editorStore
imp src/lib/features/outgoing-links/OutgoingLinksPanel.svelte:7 -> src/lib/core/editor/editor.store.svelte.ts editorStore
imp src/lib/features/outgoing-links/outgoing-links.service.ts:4 -> src/lib/core/editor/editor.store.svelte.ts editorStore
imp src/lib/features/properties/NoteInfo.svelte:4 -> src/lib/core/editor/editor.store.svelte.ts editorStore
imp src/lib/features/properties/PropertiesView.svelte:9 -> src/lib/core/editor/editor.store.svelte.ts editorStore
imp src/lib/features/properties/lifecycle.service.ts:1 -> src/lib/core/editor/editor.store.svelte.ts editorStore
imp src/lib/features/properties/properties.service.ts:1 -> src/lib/core/editor/editor.store.svelte.ts editorStore
imp src/lib/features/rail-shell/Rail.svelte:14 -> src/lib/core/editor/editor.store.svelte.ts editorStore
imp src/lib/features/rail-shell/RailNoteList.svelte:17 -> src/lib/core/editor/editor.store.svelte.ts editorStore
imp src/lib/features/rail-shell/TypesNavigator.svelte:17 -> src/lib/core/editor/editor.store.svelte.ts editorStore
imp src/lib/features/search/SemanticIndexStatus.svelte:7 -> src/lib/core/editor/editor.store.svelte.ts editorStore
imp src/lib/features/tags/tags.service.ts:4 -> src/lib/core/editor/editor.store.svelte.ts editorStore
imp src/lib/features/tasks/tasks.service.ts:3 -> src/lib/core/editor/editor.store.svelte.ts editorStore
imp src/lib/features/todoist-sync/closed-note-writer.service.ts:4 -> src/lib/core/editor/editor.store.svelte.ts editorStore
imp src/lib/features/todoist-sync/note-writer.service.ts:5 -> src/lib/core/editor/editor.store.svelte.ts editorStore
imp src/lib/features/todoist-sync/sync-now.service.ts:14 -> src/lib/core/editor/editor.store.svelte.ts editorStore
imp src/lib/features/todoist-sync/vault-scan.service.ts:3 -> src/lib/core/editor/editor.store.svelte.ts editorStore
imp src/lib/features/type-definitions/type-definitions.service.ts:8 -> src/lib/core/editor/editor.store.svelte.ts editorStore
more imported-by 8 not shown: src/lib/plugins/mods(2) src/lib/plugins/graph-view(1) src/lib/plugins/one-on-one(1) src/lib/plugins/queryjs(1) src/lib/plugins/table-of-contents(1) src/lib/plugins/word-count(1) src/routes(1): q importers src/lib/core/editor/editor.store.svelte.ts
## reach
in2 src/lib/core/editor/editor.store.svelte.ts 60 files in 28 modules: src/lib/features/event-calendar(10) src/lib/app(7) src/lib/features/rail-shell(6) src/lib/features/collection(3) src/lib/features/tasks(3) +23 modules: q impact src/lib/core/editor/editor.store.svelte.ts --depth 2
out2 src/lib/core/editor/editor.store.svelte.ts 1 files in 1 modules: src/lib/utils(1)
## tests
test src/tests/lib/core/editor/editor.store.test.ts imports src/lib/core/editor/editor.store.svelte.ts mirror
test src/tests/lib/app/AppShell.test.ts imports src/lib/core/editor/editor.store.svelte.ts
test src/tests/lib/app/EditorView.test.ts imports src/lib/core/editor/editor.store.svelte.ts
test src/tests/lib/app/boot.test.ts imports src/lib/core/editor/editor.store.svelte.ts
test src/tests/lib/app/commands.new-commands.test.ts imports src/lib/core/editor/editor.store.svelte.ts
test src/tests/lib/app/commands.test.ts imports src/lib/core/editor/editor.store.svelte.ts
test src/tests/lib/app/editor-host.test.ts imports src/lib/core/editor/editor.store.svelte.ts
test src/tests/lib/app/global-keybindings.test.ts imports src/lib/core/editor/editor.store.svelte.ts
test src/tests/lib/app/lifecycle/app-lifecycle.service.test.ts imports src/lib/core/editor/editor.store.svelte.ts
test src/tests/lib/app/lifecycle/watcher-handler.service.test.ts imports src/lib/core/editor/editor.store.svelte.ts
test src/tests/lib/app/meta-bind-open-view.test.ts imports src/lib/core/editor/editor.store.svelte.ts
test src/tests/lib/core/editor/editor.service.autosave-max-wait.test.ts imports src/lib/core/editor/editor.store.svelte.ts
test src/tests/lib/core/editor/editor.service.autosave-schedule.test.ts imports src/lib/core/editor/editor.store.svelte.ts
test src/tests/lib/core/editor/editor.service.reset-timers.test.ts imports src/lib/core/editor/editor.store.svelte.ts
test src/tests/lib/core/editor/editor.service.test.ts imports src/lib/core/editor/editor.store.svelte.ts
test src/tests/lib/core/editor/open-note-at.test.ts imports src/lib/core/editor/editor.store.svelte.ts
test src/tests/lib/core/filesystem/delete-dirty-tab.test.ts imports src/lib/core/editor/editor.store.svelte.ts
test src/tests/lib/core/filesystem/f165-delete-dirty-tab.test.ts imports src/lib/core/editor/editor.store.svelte.ts
test src/tests/lib/core/filesystem/link-updater.service.test.ts imports src/lib/core/editor/editor.store.svelte.ts
test src/tests/lib/core/filesystem/task-write.service.test.ts imports src/lib/core/editor/editor.store.svelte.ts
test src/tests/lib/core/frontmatter/frontmatter-write.service.test.ts imports src/lib/core/editor/editor.store.svelte.ts
test src/tests/lib/core/layout/layout.service.test.ts imports src/lib/core/editor/editor.store.svelte.ts
test src/tests/lib/core/markdown-editor/EditorTabs.test.ts imports src/lib/core/editor/editor.store.svelte.ts
test src/tests/lib/core/markdown-editor/MarkdownEditor.test.ts imports src/lib/core/editor/editor.store.svelte.ts
test src/tests/lib/core/markdown-editor/extensions/live-preview/plugins/queryjs-block-field.test.ts imports src/lib/core/editor/editor.store.svelte.ts
test src/tests/lib/core/markdown-editor/undo-history-across-notes.test.ts imports src/lib/core/editor/editor.store.svelte.ts
test src/tests/lib/core/settings/UpdateSection.restart.test.ts imports src/lib/core/editor/editor.store.svelte.ts
test src/tests/lib/core/vault/exit.service.test.ts imports src/lib/core/editor/editor.store.svelte.ts
test src/tests/lib/core/vault/vault-switch-failed-save.test.ts imports src/lib/core/editor/editor.store.svelte.ts
test src/tests/lib/core/vault/vault.service.switch-save.test.ts imports src/lib/core/editor/editor.store.svelte.ts
test src/tests/lib/features/auto-organize/AutoOrganizeRuleRow.test.ts imports src/lib/core/editor/editor.store.svelte.ts
test src/tests/lib/features/auto-organize/auto-organize.service.test.ts imports src/lib/core/editor/editor.store.svelte.ts
test src/tests/lib/features/backlinks/BacklinksPanel.test.ts imports src/lib/core/editor/editor.store.svelte.ts
test src/tests/lib/features/backlinks/LinkItem.test.ts imports src/lib/core/editor/editor.store.svelte.ts
test src/tests/lib/features/backlinks/backlinks.service.test.ts imports src/lib/core/editor/editor.store.svelte.ts
test src/tests/lib/features/canvas/canvas-tab-switch.test.ts imports src/lib/core/editor/editor.store.svelte.ts
test src/tests/lib/features/collection/CollectionView.view-writes.test.ts imports src/lib/core/editor/editor.store.svelte.ts
test src/tests/lib/features/collection/collection-block-click.test.ts imports src/lib/core/editor/editor.store.svelte.ts
test src/tests/lib/features/collection/collection-block-row-rule.test.ts imports src/lib/core/editor/editor.store.svelte.ts
test src/tests/lib/features/copy-block-link/copy-block-link.service.test.ts imports src/lib/core/editor/editor.store.svelte.ts
more tests 67 not shown: src/tests/lib/features/properties(11) src/tests/lib/features/tasks(10) src/tests/lib/features/rail-shell(8) src/tests/lib/plugins/mods(7) src/tests/lib/features/event-calendar(5) src/tests/lib/features/todoist-sync(4) src/tests/lib/features/deep-link(3) src/tests/lib/features/file-icons(2) +12 modules: q tests src/lib/core/editor/editor.store.svelte.ts
## symbols
sym src/lib/core/editor/editor.store.svelte.ts:33 store editorStore L141 | Central store for all editor tab state.
by src/lib/core/editor/editor.store.svelte.ts:editorStore <- src/lib/app/AppShell.svelte:61 in rightSidebarShown=$derived member +1
by src/lib/core/editor/editor.store.svelte.ts:editorStore <- src/lib/app/EditorView.svelte:37 in isCollectionTab=$derived member +25
by src/lib/core/editor/editor.store.svelte.ts:editorStore <- src/lib/app/commands.ts:383 in getBuiltInCommands member +2
by src/lib/core/editor/editor.store.svelte.ts:editorStore <- src/lib/app/editor-host.ts:41 in scrollToAnchor member +1
by src/lib/core/editor/editor.store.svelte.ts:editorStore <- src/lib/app/global-keybindings.ts:173 in GLOBAL_KEYBINDINGS member
by src/lib/core/editor/editor.store.svelte.ts:editorStore <- src/lib/core/editor/editor.service.ts:126 in syncExternalContentToEditor member +42
by src/lib/core/editor/editor.store.svelte.ts:editorStore <- src/lib/core/editor/open-note-at.service.ts:38 in openNoteAt member +2
by src/lib/core/editor/editor.store.svelte.ts:editorStore <- src/lib/core/filesystem/link-updater.service.ts:52 in updateLinksAfterRename member +3
more by 40 not shown: src/lib/features/properties(4) src/lib/features/todoist-sync(4) src/lib/features/rail-shell(3) src/lib/core/markdown-editor(2) src/lib/features/auto-organize(2) src/lib/features/backlinks(2) src/lib/features/outgoing-links(2) src/lib/plugins/mods(2) +19 modules: q importers src/lib/core/editor/editor.store.svelte.ts:editorStore
## store
store src/lib/core/editor/editor.store.svelte.ts:33 editorStore esc:1
mem src/lib/core/editor/editor.store.svelte.ts:34 get editorStore.tabs r:55 w-via:addTab,removeTab,updateContent,markSavedByPath,updateTabPath,+5
more r 55 not shown: src/lib/core/editor(19) src/lib/features/todoist-sync(6) src/lib/features/tasks(5) src/lib/core/markdown-editor(4) src/lib/features/event-calendar(4) src/lib/core/filesystem(3) src/lib/features/auto-organize(3) src/lib/features/tags(3) +5 modules: q store src/lib/core/editor/editor.store.svelte.ts:editorStore.tabs
mem src/lib/core/editor/editor.store.svelte.ts:35 get editorStore.activeIndex r:15 w-via:addTab,setActiveIndex,removeTab,togglePin,setPinned,+1
more r 15 not shown: src/lib/core/editor(6) src/lib/core/markdown-editor(4) src/lib/features/auto-organize(1) src/lib/features/event-calendar(1) src/lib/features/tags(1) src/lib/features/tasks(1) src/lib/plugins/graph-view(1): q store src/lib/core/editor/editor.store.svelte.ts:editorStore.activeIndex
mem src/lib/core/editor/editor.store.svelte.ts:37 get editorStore.activeTab r:43 w-via:addTab,setActiveIndex,removeTab,updateContent,markSavedByPath,+6 | The currently focused tab object, or null if none
more r 43 not shown: src/lib/app(17) src/lib/features/properties(7) src/lib/core/markdown-editor(3) src/lib/core/editor(2) src/lib/features/outgoing-links(2) src/lib/features/search(2) src/lib/plugins/word-count(2) src/routes(2) +6 modules: q store src/lib/core/editor/editor.store.svelte.ts:editorStore.activeTab
mem src/lib/core/editor/editor.store.svelte.ts:39 get editorStore.activeTabPath r:38 w-via:addTab,setActiveIndex,removeTab,updateContent,markSavedByPath,+6 | Shortcut to the active tab's file path, or null
more r 38 not shown: src/lib/app(5) src/lib/features/backlinks(5) src/lib/features/properties(4) src/lib/plugins/table-of-contents(4) src/lib/features/outgoing-links(3) src/lib/features/rail-shell(3) src/lib/core/editor(2) src/lib/core/markdown-editor(2) +8 modules: q store src/lib/core/editor/editor.store.svelte.ts:editorStore.activeTabPath
mem src/lib/core/editor/editor.store.svelte.ts:40 get editorStore.activeTabContent r:src/lib/plugins/table-of-contents/TableOfContentsPanel.svelte:35,src/routes/(app)/+layout.svelte:149 w-via:addTab,setActiveIndex,removeTab,updateContent,markSavedByPath,+6
mem src/lib/core/editor/editor.store.svelte.ts:41 get editorStore.pendingScrollPosition r:src/lib/core/markdown-editor/MarkdownEditor.svelte:592 w-via:setPendingScrollPosition,reset
mem src/lib/core/editor/editor.store.svelte.ts:42 get editorStore.isLivePreview r:9 w-via:setLivePreview,reset
more r 9 not shown: src/lib/app(4) src/lib/core/markdown-editor(3) src/lib/core/editor(1) src/lib/features/note-action-bar(1): q store src/lib/core/editor/editor.store.svelte.ts:editorStore.isLivePreview
mem src/lib/core/editor/editor.store.svelte.ts:43 get editorStore.editorView r:src/lib/app/commands.ts:383,src/lib/app/commands.ts:393,src/lib/features/file-history/file-history.service.ts:90,src/lib/features/todoist-sync/note-writer.service.ts:69 w-via:setEditorView,reset
mem src/lib/core/editor/editor.store.svelte.ts:49 get editorStore.externalContentSignal r:src/lib/core/markdown-editor/MarkdownEditor.svelte:631 w-via:bumpExternalContentSignal,reset | Counter that bumps on every external content write (Properties, task toggle, link rename, watcher reload).
mem src/lib/core/editor/editor.store.svelte.ts:52 do editorStore.addTab w:7 | Opens a new tab and makes it active (unpinned tabs go after pinned ones)
more w 7 not shown: src/lib/core/editor(1) src/lib/core/filesystem(1) src/lib/features/auto-organize(1) src/lib/features/event-calendar(1) src/lib/features/tags(1) src/lib/features/tasks(1) src/lib/plugins/graph-view(1): q store src/lib/core/editor/editor.store.svelte.ts:editorStore.addTab
mem src/lib/core/editor/editor.store.svelte.ts:64 do editorStore.setActiveIndex w:12 | Switches focus to the tab at the given index
more w 12 not shown: src/lib/core/editor(3) src/lib/features/event-calendar(2) src/lib/features/tags(2) src/lib/features/tasks(2) src/lib/plugins/graph-view(2) src/lib/features/auto-organize(1): q store src/lib/core/editor/editor.store.svelte.ts:editorStore.setActiveIndex
mem src/lib/core/editor/editor.store.svelte.ts:71 do editorStore.removeTab w:10 | Closes a tab and adjusts activeIndex to keep a valid selection
more w 10 not shown: src/lib/core/editor(2) src/lib/features/event-calendar(2) src/lib/features/tags(2) src/lib/features/tasks(2) src/lib/plugins/graph-view(2): q store src/lib/core/editor/editor.store.svelte.ts:editorStore.removeTab
mem src/lib/core/editor/editor.store.svelte.ts:84 do editorStore.updateContent w:src/lib/core/editor/editor.service.ts:304 | Updates the in-memory content of the active tab (called on every keystroke)
mem src/lib/core/editor/editor.store.svelte.ts:91 do editorStore.markSavedByPath w:src/lib/core/editor/editor.service.ts:244 | Syncs savedContent with the written content for a specific tab by path
mem src/lib/core/editor/editor.store.svelte.ts:98 do editorStore.setPendingScrollPosition w:src/lib/app/editor-host.ts:46,src/lib/core/editor/open-note-at.service.ts:48,src/lib/core/markdown-editor/MarkdownEditor.svelte:597
mem src/lib/core/editor/editor.store.svelte.ts:102 do editorStore.setLivePreview w:src/lib/app/EditorView.svelte:140,src/lib/core/editor/editor.service.ts:438
mem src/lib/core/editor/editor.store.svelte.ts:107 do editorStore.setEditorView w:src/lib/core/markdown-editor/MarkdownEditor.svelte:412,src/lib/core/markdown-editor/MarkdownEditor.svelte:430 | Stores the active CodeMirror EditorView reference for external access (e.g. command palette)
mem src/lib/core/editor/editor.store.svelte.ts:116 do editorStore.bumpExternalContentSignal w:src/lib/core/editor/editor.service.ts:138 | Increments the `externalContentSignal` counter so `MarkdownEditor.svelte`'s content-sync `$effect` re-runs and dispatches a doc replace.
mem src/lib/core/editor/editor.store.svelte.ts:121 do editorStore.updateTabPath w:src/lib/core/filesystem/link-updater.service.ts:99,src/lib/core/filesystem/link-updater.service.ts:105 | Updates the path and display name of a tab identified by its old path
mem src/lib/core/editor/editor.store.svelte.ts:130 do editorStore.updateTabContentByPath w:src/lib/core/editor/editor.service.ts:129 | Replaces the content and savedContent of a tab identified by its path (no dirty flag)
mem src/lib/core/editor/editor.store.svelte.ts:139 do editorStore.updateTabContentOnly w:src/lib/core/editor/editor.service.ts:131,src/lib/core/editor/editor.service.ts:315 | Updates only the content of a tab (preserves savedContent and dirty state)
mem src/lib/core/editor/editor.store.svelte.ts:147 do editorStore.togglePin w:src/lib/core/editor/editor.service.ts:419 | Toggles the pinned state of the tab at the given index and reorders tabs
mem src/lib/core/editor/editor.store.svelte.ts:156 do editorStore.setPinned w:src/lib/core/editor/editor.service.ts:445,src/lib/core/editor/editor.service.ts:453 | Sets the pinned state of the tab at the given index
mem src/lib/core/editor/editor.store.svelte.ts:165 do editorStore.reset w:src/lib/core/editor/editor.service.ts:525 | Resets all state to initial values (e.g. when switching vaults)
## calls
call src/lib/core/editor/editor.store.svelte.ts:54 in editorStore.addTab -> src/lib/core/editor/editor.logic.ts:getPinnedBoundary call
call src/lib/core/editor/editor.store.svelte.ts:150 in editorStore.togglePin -> src/lib/core/editor/editor.logic.ts:reorderTabsAfterPinChange call
call src/lib/core/editor/editor.store.svelte.ts:159 in editorStore.setPinned -> src/lib/core/editor/editor.logic.ts:reorderTabsAfterPinChange call
