# file card src/lib/app/AppShell.svelte
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/app/AppShell.svelte ' codemap/files
sections: imports, imported-by, reach, tests, symbols, locals, mounts, mounted-at, calls, effects
file src/lib/app/AppShell.svelte component L314 module src/lib/app in1 t2
## imports
imp src/lib/app/AppShell.svelte:4 -> src/lib/utils/log.service.ts appendLog
imp src/lib/app/AppShell.svelte:5 -> src/lib/core/vault/vault.store.svelte.ts vaultStore
imp src/lib/app/AppShell.svelte:6 -> src/lib/core/settings/settings.store.svelte.ts settingsStore
imp src/lib/app/AppShell.svelte:7 -> src/lib/core/filesystem/fs.store.svelte.ts fsStore
imp src/lib/app/AppShell.svelte:8 -> src/lib/features/type-definitions/type-definitions.store.svelte.ts typeDefinitionsStore
imp src/lib/app/AppShell.svelte:9 -> src/lib/features/type-definitions/type-sidebar.logic.ts collectViewFiles,excludeSystemFolder
imp src/lib/app/AppShell.svelte:10 -> src/lib/features/dock-badge/dock-badge.logic.ts dockBadgeCount
imp src/lib/app/AppShell.svelte:11 -> src/lib/features/dock-badge/dock-badge.service.ts applyDockBadge
imp src/lib/app/AppShell.svelte:12 -> src/lib/components/ui/resizable/index.ts *
imp src/lib/app/AppShell.svelte:13 -> src/lib/components/ui/scroll-area/index.ts ScrollArea
imp src/lib/app/AppShell.svelte:14 -> src/lib/features/rail-shell/Rail.svelte default
imp src/lib/app/AppShell.svelte:15 -> src/lib/features/rail-shell/RailNoteList.svelte default
imp src/lib/app/AppShell.svelte:16 -> src/lib/features/rail-shell/TypesNavigator.svelte default
imp src/lib/app/AppShell.svelte:17 -> src/lib/features/rail-shell/FilesNavigator.svelte default
imp src/lib/app/AppShell.svelte:18 -> src/lib/features/rail-shell/rail-registry.store.svelte.ts railRegistryStore
imp src/lib/app/AppShell.svelte:19 -> src/lib/features/rail-shell/neighbourhood.store.svelte.ts neighbourhoodStore
imp src/lib/app/AppShell.svelte:20 -> src/lib/features/rail-shell/lens.logic.ts FILES_RAIL_ITEM,parseExpandedFolders,pickedFolderLens,staleFolderPickFix,toggleExpandedFolder,pickedTypesLens,pinnedRailItems,restoreRailItem,SEARCH_LENS,INITIAL_TYPES_PICK_CHECK,staleRailPinFix,staleTypesPickFix,stepTypesPickCheck,TYPES_RAIL_ITEM,typeNavigatorRows,viewNavigatorRows
imp src/lib/app/AppShell.svelte:38 -> src/lib/features/rail-shell/lens.logic.ts type:TypesPickCheck
imp src/lib/app/AppShell.svelte:39 -> src/lib/features/rail-shell/rail-items.logic.ts parseRailCollapsed,parseRailHidden,parseRailStyle,parseRailWidth,railFormWidth,railHeaderPad
imp src/lib/app/AppShell.svelte:40 -> src/lib/app/EditorView.svelte default
imp src/lib/app/AppShell.svelte:41 -> src/lib/app/rail-navigation.ts selectRailItem
imp src/lib/app/AppShell.svelte:42 -> src/lib/features/backlinks/BacklinksPanel.svelte default
imp src/lib/app/AppShell.svelte:43 -> src/lib/features/outgoing-links/OutgoingLinksPanel.svelte default
imp src/lib/app/AppShell.svelte:44 -> src/lib/features/properties/NoteInfo.svelte default
imp src/lib/app/AppShell.svelte:45 -> src/lib/features/properties/PropertiesView.svelte default
imp src/lib/app/AppShell.svelte:46 -> src/lib/features/search/SearchPanel.svelte default
imp src/lib/app/AppShell.svelte:47 -> src/lib/plugins/table-of-contents/TableOfContentsPanel.svelte default
imp src/lib/app/AppShell.svelte:48 -> src/lib/core/status-bar/StatusBar.svelte default
imp src/lib/app/AppShell.svelte:49 -> src/lib/plugins/word-count/WordCount.svelte default
imp src/lib/app/AppShell.svelte:50 -> src/lib/features/search/SearchStatus.svelte default
imp src/lib/app/AppShell.svelte:51 -> src/lib/core/status-bar/SaveStatus.svelte default
imp src/lib/app/AppShell.svelte:52 -> src/lib/features/search/SemanticIndexStatus.svelte default
imp src/lib/app/AppShell.svelte:53 -> src/lib/features/todoist-sync/TodoistSyncStatus.svelte default
imp src/lib/app/AppShell.svelte:54 -> src/lib/core/editor/editor.store.svelte.ts editorStore
imp src/lib/app/AppShell.svelte:55 -> src/lib/core/layout/layout.service.ts toggleRightSidebar
imp src/lib/app/AppShell.svelte:56 -> src/lib/core/layout/layout.logic.ts hidesRightSidebar,isRightSidebarShown
## imported-by
imp src/routes/(app)/+layout.svelte:24 -> src/lib/app/AppShell.svelte default
## reach
in2 src/lib/app/AppShell.svelte 0 files in 0 modules: -
out2 src/lib/app/AppShell.svelte 119 files in 32 modules: src/lib/features/rail-shell(17) src/lib/features/collection(10) src/lib/components(9) src/lib/features/file-icons(8) src/lib/core/filesystem(7) +27 modules
## tests
test src/tests/lib/app/AppShell.test.ts imports src/lib/app/AppShell.svelte mirror
test src/tests/lib/app/meta-bind-open-view.test.ts imports src/lib/app/AppShell.svelte
## symbols
sym src/lib/app/AppShell.svelte:1 component AppShell props:children L314
by src/lib/app/AppShell.svelte:default <- src/routes/(app)/+layout.svelte:185 in (markup) mount
## locals
local src/lib/app/AppShell.svelte:92 fn handleRightSidebarResize(size: number) L3
local src/lib/app/AppShell.svelte:96 fn handleNoteListResize(size: number) L3
local src/lib/app/AppShell.svelte:100 fn handleNavigatorResize(size: number) L3
## mounts
mount src/lib/app/AppShell.svelte:201 Rail -> src/lib/features/rail-shell/Rail.svelte
mount src/lib/app/AppShell.svelte:217 TypesNavigator -> src/lib/features/rail-shell/TypesNavigator.svelte
mount src/lib/app/AppShell.svelte:223 FilesNavigator -> src/lib/features/rail-shell/FilesNavigator.svelte
mount src/lib/app/AppShell.svelte:246 SearchPanel -> src/lib/features/search/SearchPanel.svelte
mount src/lib/app/AppShell.svelte:248 RailNoteList -> src/lib/features/rail-shell/RailNoteList.svelte
mount src/lib/app/AppShell.svelte:262 EditorView -> src/lib/app/EditorView.svelte
mount src/lib/app/AppShell.svelte:277 ScrollArea -> src/lib/components/ui/scroll-area/scroll-area.svelte
mount src/lib/app/AppShell.svelte:279 PropertiesView -> src/lib/features/properties/PropertiesView.svelte
mount src/lib/app/AppShell.svelte:282 TableOfContentsPanel -> src/lib/plugins/table-of-contents/TableOfContentsPanel.svelte
mount src/lib/app/AppShell.svelte:285 BacklinksPanel -> src/lib/features/backlinks/BacklinksPanel.svelte
mount src/lib/app/AppShell.svelte:288 OutgoingLinksPanel -> src/lib/features/outgoing-links/OutgoingLinksPanel.svelte
mount src/lib/app/AppShell.svelte:291 NoteInfo -> src/lib/features/properties/NoteInfo.svelte
mount src/lib/app/AppShell.svelte:302 StatusBar -> src/lib/core/status-bar/StatusBar.svelte
mount src/lib/app/AppShell.svelte:304 SearchStatus -> src/lib/features/search/SearchStatus.svelte
mount src/lib/app/AppShell.svelte:305 SemanticIndexStatus -> src/lib/features/search/SemanticIndexStatus.svelte
mount src/lib/app/AppShell.svelte:308 TodoistSyncStatus -> src/lib/features/todoist-sync/TodoistSyncStatus.svelte
mount src/lib/app/AppShell.svelte:309 SaveStatus -> src/lib/core/status-bar/SaveStatus.svelte
mount src/lib/app/AppShell.svelte:310 WordCount -> src/lib/plugins/word-count/WordCount.svelte
## mounted-at
mount src/routes/(app)/+layout.svelte:185 AppShell -> src/lib/app/AppShell.svelte
## calls
call src/lib/app/AppShell.svelte:61 in rightSidebarShown=$derived -> src/lib/core/layout/layout.logic.ts:isRightSidebarShown call
call src/lib/app/AppShell.svelte:69 in $effect@66 -> src/lib/features/type-definitions/type-sidebar.logic.ts:excludeSystemFolder call
call src/lib/app/AppShell.svelte:74 in $effect@66 -> src/lib/features/dock-badge/dock-badge.logic.ts:dockBadgeCount call
call src/lib/app/AppShell.svelte:76 in $effect@66 -> src/lib/features/dock-badge/dock-badge.service.ts:applyDockBadge call
call src/lib/app/AppShell.svelte:82 in (script) -> src/lib/utils/log.service.ts:appendLog call +2
call src/lib/app/AppShell.svelte:93 in handleRightSidebarResize -> src/lib/core/settings/settings.store.svelte.ts:settingsStore.updateLayout mcall
call src/lib/app/AppShell.svelte:97 in handleNoteListResize -> src/lib/core/settings/settings.store.svelte.ts:settingsStore.updateLayout mcall
call src/lib/app/AppShell.svelte:101 in handleNavigatorResize -> src/lib/core/settings/settings.store.svelte.ts:settingsStore.updateLayout mcall
call src/lib/app/AppShell.svelte:106 in railItem=$derived -> src/lib/features/rail-shell/lens.logic.ts:restoreRailItem call
call src/lib/app/AppShell.svelte:110 in railItem=$derived -> src/lib/features/rail-shell/rail-items.logic.ts:parseRailHidden call
call src/lib/app/AppShell.svelte:123 in viewFilesKey=$derived -> src/lib/features/type-definitions/type-sidebar.logic.ts:collectViewFiles call
call src/lib/app/AppShell.svelte:128 in viewRows=$derived -> src/lib/features/rail-shell/lens.logic.ts:viewNavigatorRows call
call src/lib/app/AppShell.svelte:133 in entryTypeRows=$derived -> src/lib/features/rail-shell/lens.logic.ts:typeNavigatorRows call
call src/lib/app/AppShell.svelte:148 in railLens=$derived -> src/lib/features/rail-shell/lens.logic.ts:pickedTypesLens call
call src/lib/app/AppShell.svelte:150 in railLens=$derived -> src/lib/features/rail-shell/lens.logic.ts:pickedFolderLens call
call src/lib/app/AppShell.svelte:162 in $effect@161 -> src/lib/features/rail-shell/lens.logic.ts:stepTypesPickCheck call
call src/lib/app/AppShell.svelte:172 in $effect@161 -> src/lib/features/type-definitions/type-sidebar.logic.ts:collectViewFiles call
call src/lib/app/AppShell.svelte:173 in $effect@161 -> src/lib/features/rail-shell/lens.logic.ts:staleTypesPickFix call
call src/lib/app/AppShell.svelte:175 in $effect@161 -> src/lib/features/rail-shell/lens.logic.ts:staleFolderPickFix call
call src/lib/app/AppShell.svelte:177 in $effect@161 -> src/lib/features/rail-shell/lens.logic.ts:pinnedRailItems call
call src/lib/app/AppShell.svelte:177 in $effect@161 -> src/lib/features/rail-shell/lens.logic.ts:staleRailPinFix call
call src/lib/app/AppShell.svelte:178 in $effect@161 -> src/lib/core/settings/settings.store.svelte.ts:settingsStore.updateLayout mcall
call src/lib/app/AppShell.svelte:187 in (markup) -> src/lib/features/rail-shell/rail-items.logic.ts:parseRailCollapsed markup
call src/lib/app/AppShell.svelte:187 in (markup) -> src/lib/features/rail-shell/rail-items.logic.ts:parseRailStyle markup
call src/lib/app/AppShell.svelte:187 in (markup) -> src/lib/features/rail-shell/rail-items.logic.ts:parseRailWidth markup
call src/lib/app/AppShell.svelte:187 in (markup) -> src/lib/features/rail-shell/rail-items.logic.ts:railFormWidth markup
call src/lib/app/AppShell.svelte:187 in (markup) -> src/lib/features/rail-shell/rail-items.logic.ts:railHeaderPad markup
call src/lib/app/AppShell.svelte:189 in (markup) -> src/lib/core/layout/layout.logic.ts:hidesRightSidebar markup
call src/lib/app/AppShell.svelte:192 in (markup) -> src/lib/core/layout/layout.service.ts:toggleRightSidebar markup
call src/lib/app/AppShell.svelte:203 in (markup) -> src/lib/app/rail-navigation.ts:selectRailItem markup
call src/lib/app/AppShell.svelte:212 in (markup) -> src/lib/app/AppShell.svelte:handleNavigatorResize markup
call src/lib/app/AppShell.svelte:220 in (markup) -> src/lib/core/settings/settings.store.svelte.ts:settingsStore.updateLayout markup +3
call src/lib/app/AppShell.svelte:225 in (markup) -> src/lib/features/rail-shell/lens.logic.ts:parseExpandedFolders markup
call src/lib/app/AppShell.svelte:229 in (markup) -> src/lib/features/rail-shell/lens.logic.ts:toggleExpandedFolder markup
call src/lib/app/AppShell.svelte:243 in (markup) -> src/lib/app/AppShell.svelte:handleNoteListResize markup
call src/lib/app/AppShell.svelte:273 in (markup) -> src/lib/app/AppShell.svelte:handleRightSidebarResize markup
## effects
fx src/lib/app/AppShell.svelte:66 svelte.$effect in (script)
fx src/lib/app/AppShell.svelte:85 timer.requestAnimationFrame in (script)
fx src/lib/app/AppShell.svelte:86 timer.requestAnimationFrame in (script)
fx src/lib/app/AppShell.svelte:161 svelte.$effect in (script)
