# file card src/lib/app/lifecycle/app-lifecycle.service.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/app/lifecycle/app-lifecycle.service.ts ' codemap/files
sections: imports, imported-by, reach, tests, symbols, calls, effects
file src/lib/app/lifecycle/app-lifecycle.service.ts service L686 module src/lib/app in1 t3
## imports
imp src/lib/app/lifecycle/app-lifecycle.service.ts:2 -> src/lib/contracts/ipc.ts call
imp src/lib/app/lifecycle/app-lifecycle.service.ts:3 -> src/lib/core/editor/editor.service.ts resetEditor,saveAllDirtyTabs,reloadExternallyChangedTabs
imp src/lib/app/lifecycle/app-lifecycle.service.ts:4 -> src/lib/core/editor/editor.hooks.ts resetHooks
imp src/lib/app/lifecycle/app-lifecycle.service.ts:5 -> src/lib/plugins/queryjs/queryjs-session.store.svelte.ts queryjsSessionStore
imp src/lib/app/lifecycle/app-lifecycle.service.ts:6 -> src/lib/core/filesystem/fs.service.ts resetFileSystem,loadDirectoryTree
imp src/lib/app/lifecycle/app-lifecycle.service.ts:7 -> src/lib/utils/debounce.ts debounce
imp src/lib/app/lifecycle/app-lifecycle.service.ts:8 -> src/lib/utils/inflight.ts serializeWithRerun
imp src/lib/app/lifecycle/app-lifecycle.service.ts:9 -> src/lib/utils/debug.ts debug,error,logProcessMemory,perfStart,perfEnd,setTauriDebugMode,stopTauriDebugListener
imp src/lib/app/lifecycle/app-lifecycle.service.ts:10 -> src/lib/utils/log.service.ts initLogSession,teardownLogSession,startHeartbeat
imp src/lib/app/lifecycle/app-lifecycle.service.ts:11 -> src/lib/core/filesystem/fs.watcher.ts startWatching,stopWatching,onFileChange
imp src/lib/app/lifecycle/app-lifecycle.service.ts:16 -> src/lib/features/backlinks/backlinks.service.ts buildIndex,resetBacklinks
imp src/lib/app/lifecycle/app-lifecycle.service.ts:20 -> src/lib/features/collection/collection.service.ts buildPropertyIndex,registerCollectionNoteChangeConsumer,registerCollectionPathChangeConsumer,resetCollection
imp src/lib/app/lifecycle/app-lifecycle.service.ts:21 -> src/lib/features/outgoing-links/outgoing-links.service.ts resetOutgoingLinks
imp src/lib/app/lifecycle/app-lifecycle.service.ts:24 -> src/lib/features/tags/tags.service.ts buildTagIndex,resetTags
imp src/lib/app/lifecycle/app-lifecycle.service.ts:25 -> src/lib/app/lifecycle/watcher-handler.service.ts rebuildAllIndexes
imp src/lib/app/lifecycle/app-lifecycle.service.ts:26 -> src/lib/features/search/search.service.ts resetSearch,buildSearchIndex,registerSearchIndexHook,initSemanticSearch,buildSemanticIndex,startSemanticProgressListener,stopSemanticProgressListener
imp src/lib/app/lifecycle/app-lifecycle.service.ts:35 -> src/lib/features/search/search.store.svelte.ts searchStore
imp src/lib/app/lifecycle/app-lifecycle.service.ts:36 -> src/lib/features/rail-shell/neighbourhood.store.svelte.ts neighbourhoodStore
imp src/lib/app/lifecycle/app-lifecycle.service.ts:37 -> src/lib/core/settings/settings.service.ts loadSettings,resetSettings
imp src/lib/app/lifecycle/app-lifecycle.service.ts:38 -> src/lib/core/settings/settings-persistence.svelte.ts startSettingsPersistence,stopSettingsPersistence
imp src/lib/app/lifecycle/app-lifecycle.service.ts:39 -> src/lib/core/settings/update-check.service.ts maybeAutoCheckForUpdates
imp src/lib/app/lifecycle/app-lifecycle.service.ts:40 -> src/lib/core/settings/settings.store.svelte.ts settingsStore
imp src/lib/app/lifecycle/app-lifecycle.service.ts:41 -> src/lib/core/settings/sentry.service.ts configureSentry,disableSentry
imp src/lib/app/lifecycle/app-lifecycle.service.ts:42 -> src/lib/features/properties/properties.service.ts resetProperties
imp src/lib/app/lifecycle/app-lifecycle.service.ts:43 -> src/lib/plugins/graph-view/graph-view.service.ts resetGraphView
imp src/lib/app/lifecycle/app-lifecycle.service.ts:44 -> src/lib/plugins/templates/templates.service.ts resetTemplates,ensureTemplatesFolder
imp src/lib/app/lifecycle/app-lifecycle.service.ts:48 -> src/lib/features/properties/bookmark-migration.service.ts migrateBookmarksToFavorites
imp src/lib/app/lifecycle/app-lifecycle.service.ts:49 -> src/lib/core/trash/trash.service.ts loadTrash,resetTrash
imp src/lib/app/lifecycle/app-lifecycle.service.ts:50 -> src/lib/features/file-icons/file-icons.service.ts loadRecentIcons,buildFrontmatterIconIndex,registerFileIconsNoteChangeConsumer,resetFileIcons
imp src/lib/app/lifecycle/app-lifecycle.service.ts:56 -> src/lib/plugins/calendar/calendar.service.ts resetCalendar
imp src/lib/app/lifecycle/app-lifecycle.service.ts:57 -> src/lib/features/tasks/tasks.service.ts loadSavedTasksView,resetTasks
imp src/lib/app/lifecycle/app-lifecycle.service.ts:58 -> src/lib/features/event-calendar/event-calendar.service.ts drainEventCalendarWrites,registerEventCalendarPathChangeConsumer,resetEventCalendar
imp src/lib/app/lifecycle/app-lifecycle.service.ts:59 -> src/lib/features/rail-shell/files-navigator.service.ts registerFilesNavigatorPathChangeConsumer
imp src/lib/app/lifecycle/app-lifecycle.service.ts:60 -> src/lib/features/rail-shell/types-navigator.service.ts registerTypesNavigatorPathChangeConsumer
imp src/lib/app/lifecycle/app-lifecycle.service.ts:61 -> src/lib/features/rail-shell/neighbourhood.service.ts registerNeighbourhoodPathChangeConsumer
imp src/lib/app/lifecycle/app-lifecycle.service.ts:62 -> src/lib/features/quick-switcher/quick-switcher.service.ts resetQuickSwitcher
imp src/lib/app/lifecycle/app-lifecycle.service.ts:63 -> src/lib/features/command-palette/command-palette.service.ts resetCommandPalette
imp src/lib/app/lifecycle/app-lifecycle.service.ts:64 -> src/lib/plugins/periodic-notes/periodic-notes.service.ts autoOpenDailyNote,registerCalendarDailyNoteOpener,resetPeriodicNotes
imp src/lib/app/lifecycle/app-lifecycle.service.ts:65 -> src/lib/plugins/kanban/kanban.service.ts registerKanbanFolderCreator,resetKanban
imp src/lib/app/lifecycle/app-lifecycle.service.ts:66 -> src/lib/plugins/calendar/calendar-rail.service.ts registerCalendarRail
imp src/lib/app/lifecycle/app-lifecycle.service.ts:67 -> src/lib/plugins/one-on-one/one-on-one.service.ts registerOneOnOneActionBarAction
imp src/lib/app/lifecycle/app-lifecycle.service.ts:68 -> src/lib/plugins/one-on-one/one-on-one-today.service.ts registerOneOnOneTodaySection
imp src/lib/app/lifecycle/app-lifecycle.service.ts:69 -> src/lib/plugins/mods/mods-host.service.ts startModsHost,stopModsHost
imp src/lib/app/lifecycle/app-lifecycle.service.ts:70 -> src/lib/plugins/mods/mods-runs.store.svelte.ts modsRunsStore
imp src/lib/app/lifecycle/app-lifecycle.service.ts:71 -> src/lib/features/todoist-sync/sync-scheduler.service.ts startAutoSync,stopAutoSync
imp src/lib/app/lifecycle/app-lifecycle.service.ts:72 -> src/lib/features/todoist-sync/todoist-sync.store.svelte.ts todoistSyncStore
imp src/lib/app/lifecycle/app-lifecycle.service.ts:73 -> src/lib/features/properties/lifecycle-filter.store.svelte.ts lifecycleFilterStore
imp src/lib/app/lifecycle/app-lifecycle.service.ts:74 -> src/lib/features/type-definitions/type-definitions.store.svelte.ts typeDefinitionsStore
imp src/lib/app/lifecycle/app-lifecycle.service.ts:75 -> src/lib/features/file-history/file-history.service.ts registerFileHistoryHook,closeFileHistory
imp src/lib/app/lifecycle/app-lifecycle.service.ts:76 -> src/lib/features/deep-link/deep-link.service.ts executePendingAction,resetDeepLink
imp src/lib/app/lifecycle/app-lifecycle.service.ts:77 -> src/lib/features/auto-organize/auto-organize.service.ts loadAutoOrganizeConfig,toggleAutoOrganizeHook,resetAutoOrganize
imp src/lib/app/lifecycle/app-lifecycle.service.ts:78 -> src/lib/core/filesystem/folder-notes.logic.ts buildContentOrderMap
imp src/lib/app/lifecycle/app-lifecycle.service.ts:79 -> src/lib/core/filesystem/fs.logic.ts applyFolderOrder
imp src/lib/app/lifecycle/app-lifecycle.service.ts:80 -> src/lib/core/filesystem/fs.store.svelte.ts fsStore
imp src/lib/app/lifecycle/app-lifecycle.service.ts:81 -> src/lib/core/vault/vault.store.svelte.ts vaultStore
imp src/lib/app/lifecycle/app-lifecycle.service.ts:82 -> src/lib/core/vault/vault-entries.service.ts invalidateVaultEntries
imp src/lib/app/lifecycle/app-lifecycle.service.ts:83 -> src/lib/core/markdown-editor/extensions/live-preview/widgets/mermaid-widget.ts clearMermaidCache
imp src/lib/app/lifecycle/app-lifecycle.service.ts:84 -> src/lib/features/collection/collection-block-widget.ts clearCollectionCache
imp src/lib/app/lifecycle/app-lifecycle.service.ts:85 -> src/lib/core/markdown-editor/extensions/live-preview/widgets/math-widget.ts clearMathCache
imp src/lib/app/lifecycle/app-lifecycle.service.ts:86 -> src/lib/features/type-definitions/view-parse-cache.ts clearAllViewParseCache
## imported-by
imp src/routes/(app)/+layout.svelte:10 -> src/lib/app/lifecycle/app-lifecycle.service.ts initializeVault,teardownVault
## reach
in2 src/lib/app/lifecycle/app-lifecycle.service.ts 0 files in 0 modules: -
out2 src/lib/app/lifecycle/app-lifecycle.service.ts 137 files in 38 modules: src/lib/plugins/mods(12) src/lib/features/event-calendar(10) src/lib/core/settings(8) src/lib/features/collection(8) src/lib/features/tasks(8) +33 modules
## tests
test src/tests/lib/app/lifecycle/app-lifecycle.service.test.ts imports src/lib/app/lifecycle/app-lifecycle.service.ts mirror
test src/tests/lib/app/boot.test.ts imports src/lib/app/lifecycle/app-lifecycle.service.ts
test src/tests/lib/core/vault/vault-switch-failed-save.test.ts imports src/lib/app/lifecycle/app-lifecycle.service.ts
## symbols
sym src/lib/app/lifecycle/app-lifecycle.service.ts:137 fn initializeVault(vaultPath: string): Promise<void> L423 | Initializes all app systems when a vault is opened.
by src/lib/app/lifecycle/app-lifecycle.service.ts:initializeVault <- src/routes/(app)/+layout.svelte:81 in $effect@75 call
sym src/lib/app/lifecycle/app-lifecycle.service.ts:565 fn teardownVault(): void L122 | Tears down all app systems when a vault is closed.
by src/lib/app/lifecycle/app-lifecycle.service.ts:teardownVault <- src/routes/(app)/+layout.svelte:86 in $effect@75 call
## calls
call src/lib/app/lifecycle/app-lifecycle.service.ts:141 in initializeVault -> src/lib/core/vault/vault.store.svelte.ts:vaultStore.resetIndexReady mcall
call src/lib/app/lifecycle/app-lifecycle.service.ts:145 in initializeVault -> src/lib/core/vault/vault-entries.service.ts:invalidateVaultEntries call +1
call src/lib/app/lifecycle/app-lifecycle.service.ts:149 in initializeVault -> src/lib/features/event-calendar/event-calendar.service.ts:resetEventCalendar call
call src/lib/app/lifecycle/app-lifecycle.service.ts:154 in initializeVault -> src/lib/core/settings/settings-persistence.svelte.ts:stopSettingsPersistence call
call src/lib/app/lifecycle/app-lifecycle.service.ts:157 in initializeVault -> src/lib/core/settings/sentry.service.ts:disableSentry call
call src/lib/app/lifecycle/app-lifecycle.service.ts:167 in initializeVault -> src/lib/plugins/mods/mods-host.service.ts:stopModsHost call
call src/lib/app/lifecycle/app-lifecycle.service.ts:169 in initializeVault -> src/lib/features/todoist-sync/sync-scheduler.service.ts:stopAutoSync call
call src/lib/app/lifecycle/app-lifecycle.service.ts:172 in initializeVault -> src/lib/features/todoist-sync/todoist-sync.store.svelte.ts:todoistSyncStore.reset mcall
call src/lib/app/lifecycle/app-lifecycle.service.ts:185 in initializeVault -> src/lib/utils/debug.ts:debug call +19
call src/lib/app/lifecycle/app-lifecycle.service.ts:192 in initializeVault -> src/lib/core/editor/editor.service.ts:saveAllDirtyTabs call
call src/lib/app/lifecycle/app-lifecycle.service.ts:198 in initializeVault -> src/lib/features/event-calendar/event-calendar.service.ts:drainEventCalendarWrites call
call src/lib/app/lifecycle/app-lifecycle.service.ts:200 in initializeVault -> src/lib/app/lifecycle/app-lifecycle.service.ts:teardownVault call
call src/lib/app/lifecycle/app-lifecycle.service.ts:209 in initializeVault -> src/lib/utils/debug.ts:perfStart call +6
call src/lib/app/lifecycle/app-lifecycle.service.ts:210 in initializeVault -> src/lib/core/settings/settings.service.ts:loadSettings call
call src/lib/app/lifecycle/app-lifecycle.service.ts:211 in initializeVault -> src/lib/utils/debug.ts:perfEnd call +6
call src/lib/app/lifecycle/app-lifecycle.service.ts:213 in initializeVault -> src/lib/features/tasks/tasks.service.ts:loadSavedTasksView call
call src/lib/app/lifecycle/app-lifecycle.service.ts:215 in initializeVault -> src/lib/core/settings/sentry.service.ts:configureSentry call
call src/lib/app/lifecycle/app-lifecycle.service.ts:217 in initializeVault -> src/lib/utils/debug.ts:error call +15
call src/lib/app/lifecycle/app-lifecycle.service.ts:225 in initializeVault -> src/lib/core/settings/settings-persistence.svelte.ts:startSettingsPersistence call
call src/lib/app/lifecycle/app-lifecycle.service.ts:229 in initializeVault -> src/lib/utils/debug.ts:setTauriDebugMode call
call src/lib/app/lifecycle/app-lifecycle.service.ts:235 in initializeVault -> src/lib/utils/log.service.ts:initLogSession call
call src/lib/app/lifecycle/app-lifecycle.service.ts:237 in initializeVault -> src/lib/utils/log.service.ts:startHeartbeat call
call src/lib/app/lifecycle/app-lifecycle.service.ts:248 in initializeVault -> src/lib/contracts/ipc.ts:call call +2
call src/lib/app/lifecycle/app-lifecycle.service.ts:262 in initializeVault -> src/lib/features/collection/collection.service.ts:registerCollectionNoteChangeConsumer call
call src/lib/app/lifecycle/app-lifecycle.service.ts:263 in initializeVault -> src/lib/features/file-icons/file-icons.service.ts:registerFileIconsNoteChangeConsumer call
call src/lib/app/lifecycle/app-lifecycle.service.ts:265 in initializeVault -> src/lib/features/event-calendar/event-calendar.service.ts:registerEventCalendarPathChangeConsumer call
call src/lib/app/lifecycle/app-lifecycle.service.ts:266 in initializeVault -> src/lib/features/rail-shell/files-navigator.service.ts:registerFilesNavigatorPathChangeConsumer call
call src/lib/app/lifecycle/app-lifecycle.service.ts:267 in initializeVault -> src/lib/features/rail-shell/types-navigator.service.ts:registerTypesNavigatorPathChangeConsumer call
call src/lib/app/lifecycle/app-lifecycle.service.ts:268 in initializeVault -> src/lib/features/collection/collection.service.ts:registerCollectionPathChangeConsumer call
call src/lib/app/lifecycle/app-lifecycle.service.ts:269 in initializeVault -> src/lib/features/rail-shell/neighbourhood.service.ts:registerNeighbourhoodPathChangeConsumer call
call src/lib/app/lifecycle/app-lifecycle.service.ts:271 in initializeVault -> src/lib/plugins/one-on-one/one-on-one.service.ts:registerOneOnOneActionBarAction call
call src/lib/app/lifecycle/app-lifecycle.service.ts:273 in initializeVault -> src/lib/plugins/one-on-one/one-on-one-today.service.ts:registerOneOnOneTodaySection call
call src/lib/app/lifecycle/app-lifecycle.service.ts:275 in initializeVault -> src/lib/plugins/kanban/kanban.service.ts:registerKanbanFolderCreator call
call src/lib/app/lifecycle/app-lifecycle.service.ts:277 in initializeVault -> src/lib/plugins/calendar/calendar-rail.service.ts:registerCalendarRail call
call src/lib/app/lifecycle/app-lifecycle.service.ts:281 in initializeVault -> src/lib/plugins/periodic-notes/periodic-notes.service.ts:registerCalendarDailyNoteOpener call
call src/lib/app/lifecycle/app-lifecycle.service.ts:285 in initializeVault -> src/lib/features/file-history/file-history.service.ts:registerFileHistoryHook call
call src/lib/app/lifecycle/app-lifecycle.service.ts:310 in initializeVault -> src/lib/features/properties/bookmark-migration.service.ts:migrateBookmarksToFavorites call
call src/lib/app/lifecycle/app-lifecycle.service.ts:311 in initializeVault -> src/lib/features/file-icons/file-icons.service.ts:loadRecentIcons call
call src/lib/app/lifecycle/app-lifecycle.service.ts:312 in initializeVault -> src/lib/core/trash/trash.service.ts:loadTrash call
call src/lib/app/lifecycle/app-lifecycle.service.ts:313 in initializeVault -> src/lib/features/auto-organize/auto-organize.service.ts:loadAutoOrganizeConfig call
call src/lib/app/lifecycle/app-lifecycle.service.ts:337 in initializeVault -> src/lib/features/backlinks/backlinks.service.ts:buildIndex call
call src/lib/app/lifecycle/app-lifecycle.service.ts:339 in initializeVault -> src/lib/core/filesystem/fs.service.ts:loadDirectoryTree call
call src/lib/app/lifecycle/app-lifecycle.service.ts:353 in initializeVault -> src/lib/core/vault/vault.store.svelte.ts:vaultStore.markIndexReady mcall
call src/lib/app/lifecycle/app-lifecycle.service.ts:386 in initializeVault -> src/lib/core/filesystem/folder-notes.logic.ts:buildContentOrderMap call
call src/lib/app/lifecycle/app-lifecycle.service.ts:387 in initializeVault -> src/lib/core/filesystem/fs.store.svelte.ts:fsStore.setContentOrder mcall
call src/lib/app/lifecycle/app-lifecycle.service.ts:389 in initializeVault -> src/lib/core/filesystem/fs.logic.ts:applyFolderOrder call
call src/lib/app/lifecycle/app-lifecycle.service.ts:390 in initializeVault -> src/lib/core/filesystem/fs.store.svelte.ts:fsStore.setFileTree mcall
call src/lib/app/lifecycle/app-lifecycle.service.ts:407 in initializeVault -> src/lib/plugins/templates/templates.service.ts:ensureTemplatesFolder call
call src/lib/app/lifecycle/app-lifecycle.service.ts:433 in initializeVault -> src/lib/features/tags/tags.service.ts:buildTagIndex call
call src/lib/app/lifecycle/app-lifecycle.service.ts:434 in initializeVault -> src/lib/features/collection/collection.service.ts:buildPropertyIndex call
call src/lib/app/lifecycle/app-lifecycle.service.ts:435 in initializeVault -> src/lib/features/file-icons/file-icons.service.ts:buildFrontmatterIconIndex call
call src/lib/app/lifecycle/app-lifecycle.service.ts:445 in initializeVault -> src/lib/features/search/search.service.ts:buildSearchIndex call
call src/lib/app/lifecycle/app-lifecycle.service.ts:450 in initializeVault -> src/lib/features/search/search.service.ts:registerSearchIndexHook call
call src/lib/app/lifecycle/app-lifecycle.service.ts:454 in initializeVault -> src/lib/features/auto-organize/auto-organize.service.ts:toggleAutoOrganizeHook call
call src/lib/app/lifecycle/app-lifecycle.service.ts:473 in initializeVault -> src/lib/features/search/search.service.ts:startSemanticProgressListener call
call src/lib/app/lifecycle/app-lifecycle.service.ts:475 in initializeVault -> src/lib/features/search/search.service.ts:initSemanticSearch call
call src/lib/app/lifecycle/app-lifecycle.service.ts:479 in initializeVault -> src/lib/core/settings/settings.store.svelte.ts:settingsStore.updateSearch mcall +1
call src/lib/app/lifecycle/app-lifecycle.service.ts:480 in initializeVault -> src/lib/features/search/search.service.ts:stopSemanticProgressListener call +1
call src/lib/app/lifecycle/app-lifecycle.service.ts:489 in initializeVault -> src/lib/features/search/search.service.ts:buildSemanticIndex call
call src/lib/app/lifecycle/app-lifecycle.service.ts:506 in initializeVault -> src/lib/utils/inflight.ts:serializeWithRerun call
call src/lib/app/lifecycle/app-lifecycle.service.ts:511 in initializeVault -> src/lib/core/editor/editor.service.ts:reloadExternallyChangedTabs call
call src/lib/app/lifecycle/app-lifecycle.service.ts:512 in initializeVault -> src/lib/app/lifecycle/watcher-handler.service.ts:rebuildAllIndexes call
call src/lib/app/lifecycle/app-lifecycle.service.ts:514 in initializeVault -> src/lib/utils/debounce.ts:debounce call
call src/lib/app/lifecycle/app-lifecycle.service.ts:519 in initializeVault -> src/lib/core/filesystem/fs.watcher.ts:onFileChange call
call src/lib/app/lifecycle/app-lifecycle.service.ts:524 in initializeVault -> src/lib/core/filesystem/fs.watcher.ts:startWatching call
call src/lib/app/lifecycle/app-lifecycle.service.ts:528 in initializeVault -> src/lib/features/deep-link/deep-link.service.ts:executePendingAction call
call src/lib/app/lifecycle/app-lifecycle.service.ts:542 in initializeVault -> src/lib/plugins/periodic-notes/periodic-notes.service.ts:autoOpenDailyNote call
call src/lib/app/lifecycle/app-lifecycle.service.ts:545 in initializeVault -> src/lib/core/settings/update-check.service.ts:maybeAutoCheckForUpdates call
call src/lib/app/lifecycle/app-lifecycle.service.ts:550 in initializeVault -> src/lib/plugins/mods/mods-host.service.ts:startModsHost call
call src/lib/app/lifecycle/app-lifecycle.service.ts:554 in initializeVault -> src/lib/features/todoist-sync/sync-scheduler.service.ts:startAutoSync call
call src/lib/app/lifecycle/app-lifecycle.service.ts:558 in initializeVault -> src/lib/utils/debug.ts:logProcessMemory call
call src/lib/app/lifecycle/app-lifecycle.service.ts:566 in teardownVault -> src/lib/utils/debug.ts:debug call +2
call src/lib/app/lifecycle/app-lifecycle.service.ts:601 in teardownVault -> src/lib/plugins/mods/mods-host.service.ts:stopModsHost call
call src/lib/app/lifecycle/app-lifecycle.service.ts:602 in teardownVault -> src/lib/features/todoist-sync/sync-scheduler.service.ts:stopAutoSync call
call src/lib/app/lifecycle/app-lifecycle.service.ts:610 in teardownVault -> src/lib/core/settings/settings-persistence.svelte.ts:stopSettingsPersistence call
call src/lib/app/lifecycle/app-lifecycle.service.ts:611 in teardownVault -> src/lib/core/filesystem/fs.watcher.ts:stopWatching call
call src/lib/app/lifecycle/app-lifecycle.service.ts:612 in teardownVault -> src/lib/features/search/search.service.ts:stopSemanticProgressListener call
call src/lib/app/lifecycle/app-lifecycle.service.ts:613 in teardownVault -> src/lib/utils/debug.ts:stopTauriDebugListener call
call src/lib/app/lifecycle/app-lifecycle.service.ts:614 in teardownVault -> src/lib/utils/log.service.ts:teardownLogSession call
call src/lib/app/lifecycle/app-lifecycle.service.ts:615 in teardownVault -> src/lib/core/settings/sentry.service.ts:disableSentry call
call src/lib/app/lifecycle/app-lifecycle.service.ts:622 in teardownVault -> src/lib/contracts/ipc.ts:call call +2
call src/lib/app/lifecycle/app-lifecycle.service.ts:623 in teardownVault -> src/lib/utils/debug.ts:error call +2
call src/lib/app/lifecycle/app-lifecycle.service.ts:639 in teardownVault -> src/lib/features/file-history/file-history.service.ts:closeFileHistory call
call src/lib/app/lifecycle/app-lifecycle.service.ts:649 in teardownVault -> src/lib/core/vault/vault.store.svelte.ts:vaultStore.resetIndexReady mcall
call src/lib/app/lifecycle/app-lifecycle.service.ts:650 in teardownVault -> src/lib/core/vault/vault-entries.service.ts:invalidateVaultEntries call
call src/lib/app/lifecycle/app-lifecycle.service.ts:651 in teardownVault -> src/lib/core/editor/editor.hooks.ts:resetHooks call
call src/lib/app/lifecycle/app-lifecycle.service.ts:652 in teardownVault -> src/lib/plugins/queryjs/queryjs-session.store.svelte.ts:queryjsSessionStore.reset mcall
call src/lib/app/lifecycle/app-lifecycle.service.ts:655 in teardownVault -> src/lib/plugins/mods/mods-runs.store.svelte.ts:modsRunsStore.reset mcall
call src/lib/app/lifecycle/app-lifecycle.service.ts:656 in teardownVault -> src/lib/core/markdown-editor/extensions/live-preview/widgets/mermaid-widget.ts:clearMermaidCache call
call src/lib/app/lifecycle/app-lifecycle.service.ts:657 in teardownVault -> src/lib/features/collection/collection-block-widget.ts:clearCollectionCache call
call src/lib/app/lifecycle/app-lifecycle.service.ts:658 in teardownVault -> src/lib/core/markdown-editor/extensions/live-preview/widgets/math-widget.ts:clearMathCache call
call src/lib/app/lifecycle/app-lifecycle.service.ts:659 in teardownVault -> src/lib/features/type-definitions/view-parse-cache.ts:clearAllViewParseCache call
call src/lib/app/lifecycle/app-lifecycle.service.ts:660 in teardownVault -> src/lib/core/editor/editor.service.ts:resetEditor call
call src/lib/app/lifecycle/app-lifecycle.service.ts:661 in teardownVault -> src/lib/core/filesystem/fs.service.ts:resetFileSystem call
call src/lib/app/lifecycle/app-lifecycle.service.ts:662 in teardownVault -> src/lib/features/backlinks/backlinks.service.ts:resetBacklinks call
call src/lib/app/lifecycle/app-lifecycle.service.ts:663 in teardownVault -> src/lib/features/outgoing-links/outgoing-links.service.ts:resetOutgoingLinks call
call src/lib/app/lifecycle/app-lifecycle.service.ts:664 in teardownVault -> src/lib/features/tags/tags.service.ts:resetTags call
call src/lib/app/lifecycle/app-lifecycle.service.ts:665 in teardownVault -> src/lib/core/settings/settings.service.ts:resetSettings call
call src/lib/app/lifecycle/app-lifecycle.service.ts:666 in teardownVault -> src/lib/features/search/search.service.ts:resetSearch call
call src/lib/app/lifecycle/app-lifecycle.service.ts:667 in teardownVault -> src/lib/plugins/graph-view/graph-view.service.ts:resetGraphView call
call src/lib/app/lifecycle/app-lifecycle.service.ts:668 in teardownVault -> src/lib/plugins/kanban/kanban.service.ts:resetKanban call
call src/lib/app/lifecycle/app-lifecycle.service.ts:669 in teardownVault -> src/lib/plugins/templates/templates.service.ts:resetTemplates call
call src/lib/app/lifecycle/app-lifecycle.service.ts:670 in teardownVault -> src/lib/features/file-icons/file-icons.service.ts:resetFileIcons call
call src/lib/app/lifecycle/app-lifecycle.service.ts:671 in teardownVault -> src/lib/plugins/calendar/calendar.service.ts:resetCalendar call
call src/lib/app/lifecycle/app-lifecycle.service.ts:672 in teardownVault -> src/lib/features/event-calendar/event-calendar.service.ts:resetEventCalendar call
call src/lib/app/lifecycle/app-lifecycle.service.ts:673 in teardownVault -> src/lib/features/tasks/tasks.service.ts:resetTasks call
call src/lib/app/lifecycle/app-lifecycle.service.ts:674 in teardownVault -> src/lib/features/properties/properties.service.ts:resetProperties call
call src/lib/app/lifecycle/app-lifecycle.service.ts:675 in teardownVault -> src/lib/features/collection/collection.service.ts:resetCollection call
call src/lib/app/lifecycle/app-lifecycle.service.ts:676 in teardownVault -> src/lib/features/quick-switcher/quick-switcher.service.ts:resetQuickSwitcher call
call src/lib/app/lifecycle/app-lifecycle.service.ts:677 in teardownVault -> src/lib/features/command-palette/command-palette.service.ts:resetCommandPalette call
call src/lib/app/lifecycle/app-lifecycle.service.ts:678 in teardownVault -> src/lib/features/auto-organize/auto-organize.service.ts:resetAutoOrganize call
call src/lib/app/lifecycle/app-lifecycle.service.ts:679 in teardownVault -> src/lib/features/deep-link/deep-link.service.ts:resetDeepLink call
call src/lib/app/lifecycle/app-lifecycle.service.ts:680 in teardownVault -> src/lib/plugins/periodic-notes/periodic-notes.service.ts:resetPeriodicNotes call
call src/lib/app/lifecycle/app-lifecycle.service.ts:681 in teardownVault -> src/lib/core/trash/trash.service.ts:resetTrash call
call src/lib/app/lifecycle/app-lifecycle.service.ts:682 in teardownVault -> src/lib/features/todoist-sync/todoist-sync.store.svelte.ts:todoistSyncStore.reset mcall
call src/lib/app/lifecycle/app-lifecycle.service.ts:683 in teardownVault -> src/lib/features/properties/lifecycle-filter.store.svelte.ts:lifecycleFilterStore.reset mcall
call src/lib/app/lifecycle/app-lifecycle.service.ts:684 in teardownVault -> src/lib/features/type-definitions/type-definitions.store.svelte.ts:typeDefinitionsStore.reset mcall
call src/lib/app/lifecycle/app-lifecycle.service.ts:685 in teardownVault -> src/lib/features/rail-shell/neighbourhood.store.svelte.ts:neighbourhoodStore.reset mcall
## effects
ipc-call src/lib/app/lifecycle/app-lifecycle.service.ts:248 in initializeVault -> ipc:open_vault_db -> src-tauri/src/commands/db.rs:7
ipc-call src/lib/app/lifecycle/app-lifecycle.service.ts:298 in initializeVault -> ipc:cleanup_history -> src-tauri/src/commands/history.rs:153
ipc-call src/lib/app/lifecycle/app-lifecycle.service.ts:385 in initializeVault -> ipc:get_all_vault_entries_v2 -> src-tauri/src/commands/vault.rs:563
fx src/lib/app/lifecycle/app-lifecycle.service.ts:429 timer.setTimeout delay=0 in initializeVault
fx src/lib/app/lifecycle/app-lifecycle.service.ts:469 timer.setTimeout delay=SEMANTIC_INIT_DEFER_MS in initializeVault
fx src/lib/app/lifecycle/app-lifecycle.service.ts:514 timer-wrap.debounce args=() => { runWatcherBatch().catch((err) => { error('LIFECYCLE… in initializeVault
reg src/lib/app/lifecycle/app-lifecycle.service.ts:519 src/lib/core/filesystem/fs.watcher.ts:onFileChange in initializeVault args=(paths) => { debug('LIFECYCLE', `file change listener fired at ${Date.now()}, p…
fx src/lib/app/lifecycle/app-lifecycle.service.ts:540 timer.setTimeout delay=0 in initializeVault
ipc-call src/lib/app/lifecycle/app-lifecycle.service.ts:622 in teardownVault -> ipc:save_vault_cache -> src-tauri/src/commands/vault.rs:1764
ipc-call src/lib/app/lifecycle/app-lifecycle.service.ts:632 in teardownVault -> ipc:shutdown_semantic -> src-tauri/src/commands/semantic.rs:1253
ipc-call src/lib/app/lifecycle/app-lifecycle.service.ts:636 in teardownVault -> ipc:close_vault_db -> src-tauri/src/commands/db.rs:15
