# file card src/lib/app/boot.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/app/boot.ts ' codemap/files
file src/lib/app/boot.ts other L97 module src/lib/app in1 t15
## imports
imp src/lib/app/boot.ts:1 -> src/lib/core/filesystem/note-change.service.ts registerContentInvalidationListener
imp src/lib/app/boot.ts:2 -> src/lib/core/filesystem/path-change.service.ts registerPathChangeConsumer
imp src/lib/app/boot.ts:3 -> src/lib/core/markdown-editor/extensions/live-preview/core/profiling.ts configureProfiling
imp src/lib/app/boot.ts:4 -> src/lib/core/settings/settings.store.svelte.ts settingsStore
imp src/lib/app/boot.ts:5 -> src/lib/core/vault/vault.store.svelte.ts vaultStore
imp src/lib/app/boot.ts:6 -> src/lib/core/vault/write-barrier.service.ts registerWriteBarrier
imp src/lib/app/boot.ts:7 -> src/lib/features/backlinks/backlinks.store.svelte.ts backlinksStore
imp src/lib/app/boot.ts:8 -> src/lib/features/collection/collection.store.svelte.ts collectionStore
imp src/lib/app/boot.ts:9 -> src/lib/features/collection/view-row-set.port.ts registerViewRowSetPort
imp src/lib/app/boot.ts:10 -> src/lib/features/event-calendar/event-calendar.service.ts drainEventCalendarWrites
imp src/lib/app/boot.ts:11 -> src/lib/features/file-icons/icon-resolver.ts registerTypeIconLookup
imp src/lib/app/boot.ts:12 -> src/lib/features/quick-switcher/quick-switcher.store.svelte.ts quickSwitcherStore
imp src/lib/app/boot.ts:13 -> src/lib/features/rail-shell/lens.logic.ts blockRowSet,viewEntriesLoaded,viewRowSet
imp src/lib/app/boot.ts:14 -> src/lib/features/type-definitions/type-definitions.store.svelte.ts typeDefinitionsStore
imp src/lib/app/boot.ts:15 -> src/lib/features/type-definitions/type-sidebar.logic.ts effectiveViewSortLabel
imp src/lib/app/boot.ts:16 -> src/lib/features/type-definitions/view-parse-cache.ts clearViewParseCacheUnder
imp src/lib/app/boot.ts:17 -> src/lib/plugins/kanban/kanban.service.ts clearLinkedContentCache
imp src/lib/app/boot.ts:18 -> src/lib/plugins/queryjs/queryjs-ports.ts registerQueryjsBlockPorts
imp src/lib/app/boot.ts:19 -> src/lib/utils/log.service.ts appendLog
imp src/lib/app/boot.ts:20 -> src/lib/app/deep-link-actions.ts registerDeepLinkActions
## imported-by
imp src/routes/(app)/+layout.svelte:14 -> src/lib/app/boot.ts registerAppPorts
## reach
in2 src/lib/app/boot.ts 0 files in 0 modules: -
out2 src/lib/app/boot.ts 67 files in 22 modules: src/lib/features/event-calendar(9) src/lib/core/filesystem(7) src/lib/core/editor(5) src/lib/features/collection(5) src/lib/utils(5) +17 modules
## tests
test src/tests/lib/app/boot.test.ts imports src/lib/app/boot.ts mirror
test src/tests/lib/app/EditorView.test.ts imports src/lib/app/boot.ts
test src/tests/lib/core/filesystem/fs.service.test.ts imports src/lib/app/boot.ts
test src/tests/lib/core/trash/trash.service.test.ts imports src/lib/app/boot.ts
test src/tests/lib/core/vault/vault-switch-failed-save.test.ts imports src/lib/app/boot.ts
test src/tests/lib/core/vault/vault.service.switch-save.test.ts imports src/lib/app/boot.ts
test src/tests/lib/core/vault/vault.service.test.ts imports src/lib/app/boot.ts
test src/tests/lib/features/canvas/canvas-tab-switch.test.ts imports src/lib/app/boot.ts
test src/tests/lib/features/collection/CollectionView.restored-view.test.ts imports src/lib/app/boot.ts
test src/tests/lib/features/collection/CollectionView.test.ts imports src/lib/app/boot.ts
test src/tests/lib/features/collection/collection-block-row-rule.test.ts imports src/lib/app/boot.ts
test src/tests/lib/features/deep-link/deep-link.service.test.ts imports src/lib/app/boot.ts
test src/tests/lib/features/event-calendar/event-calendar.model.test.ts imports src/lib/app/boot.ts
test src/tests/lib/features/event-calendar/event-calendar.service.test.ts imports src/lib/app/boot.ts
test src/tests/lib/features/file-icons/icon-resolver.test.ts imports src/lib/app/boot.ts
## symbols
sym src/lib/app/boot.ts:34 fn registerAppPorts(): void L50 | Wires the features and plugins that core reaches through ports for the whole app lifetime.
by src/lib/app/boot.ts:registerAppPorts <- src/routes/(app)/+layout.svelte:28 in (script) call
sym src/lib/app/boot.ts:89 fn unregisterAppPorts(): void L4 | Removes every registration `registerAppPorts` made, so a later call registers them again exactly once.
## calls
call src/lib/app/boot.ts:38 in registerAppPorts -> src/lib/core/markdown-editor/extensions/live-preview/core/profiling.ts:configureProfiling call
call src/lib/app/boot.ts:38 in registerAppPorts -> src/lib/utils/log.service.ts:appendLog ref
call src/lib/app/boot.ts:39 in registerAppPorts -> src/lib/core/filesystem/note-change.service.ts:registerContentInvalidationListener call +1
call src/lib/app/boot.ts:39 in registerAppPorts -> src/lib/features/backlinks/backlinks.store.svelte.ts:backlinksStore.markUnlinkedDirty mcall
call src/lib/app/boot.ts:40 in registerAppPorts -> src/lib/plugins/queryjs/queryjs-ports.ts:registerQueryjsBlockPorts call
call src/lib/app/boot.ts:41 in registerAppPorts -> src/lib/plugins/kanban/kanban.service.ts:clearLinkedContentCache ref
call src/lib/app/boot.ts:42 in registerAppPorts -> src/lib/core/vault/write-barrier.service.ts:registerWriteBarrier call
call src/lib/app/boot.ts:42 in registerAppPorts -> src/lib/features/event-calendar/event-calendar.service.ts:drainEventCalendarWrites ref
call src/lib/app/boot.ts:44 in registerAppPorts -> src/lib/core/filesystem/path-change.service.ts:registerPathChangeConsumer call +1
call src/lib/app/boot.ts:47 in registerAppPorts -> src/lib/features/type-definitions/view-parse-cache.ts:clearViewParseCacheUnder call
call src/lib/app/boot.ts:52 in registerAppPorts -> src/lib/features/quick-switcher/quick-switcher.store.svelte.ts:quickSwitcherStore.removeRecentPath mcall
call src/lib/app/boot.ts:54 in registerAppPorts -> src/lib/app/deep-link-actions.ts:registerDeepLinkActions call
call src/lib/app/boot.ts:55 in registerAppPorts -> src/lib/features/file-icons/icon-resolver.ts:registerTypeIconLookup call
call src/lib/app/boot.ts:56 in registerAppPorts -> src/lib/features/type-definitions/type-definitions.store.svelte.ts:typeDefinitionsStore.getEntryByPath mcall +1
call src/lib/app/boot.ts:57 in registerAppPorts -> src/lib/features/type-definitions/type-definitions.store.svelte.ts:typeDefinitionsStore.getTypeDefinitionPath mcall
call src/lib/app/boot.ts:61 in registerAppPorts -> src/lib/features/collection/view-row-set.port.ts:registerViewRowSetPort call
call src/lib/app/boot.ts:63 in registerAppPorts -> src/lib/features/rail-shell/lens.logic.ts:blockRowSet call
call src/lib/app/boot.ts:68 in registerAppPorts -> src/lib/features/rail-shell/lens.logic.ts:viewRowSet call
call src/lib/app/boot.ts:79 in registerAppPorts -> src/lib/features/rail-shell/lens.logic.ts:viewEntriesLoaded call
call src/lib/app/boot.ts:80 in registerAppPorts -> src/lib/features/type-definitions/type-sidebar.logic.ts:effectiveViewSortLabel call
call src/lib/app/boot.ts:97 in (module) -> src/lib/app/boot.ts:unregisterAppPorts ref
## effects
reg src/lib/app/boot.ts:38 src/lib/core/markdown-editor/extensions/live-preview/core/profiling.ts:configureProfiling in registerAppPorts args={ isEnabled: () => settingsStore.livePreviewProfiling, log: appendLog }
reg src/lib/app/boot.ts:39 src/lib/core/filesystem/note-change.service.ts:registerContentInvalidationListener in registerAppPorts args='backlinks-unlinked-dirty', () => backlinksStore.markUnlinkedDirty()
reg src/lib/app/boot.ts:41 src/lib/core/filesystem/note-change.service.ts:registerContentInvalidationListener in registerAppPorts args='kanban-linked-content', clearLinkedContentCache
reg src/lib/app/boot.ts:42 src/lib/core/vault/write-barrier.service.ts:registerWriteBarrier in registerAppPorts args='event-calendar', drainEventCalendarWrites
reg src/lib/app/boot.ts:44 src/lib/core/filesystem/path-change.service.ts:registerPathChangeConsumer in registerAppPorts args={ name: 'view-parse-cache', pathChanged: (from) => clearViewParseCacheUnder(fro…
reg src/lib/app/boot.ts:49 src/lib/core/filesystem/path-change.service.ts:registerPathChangeConsumer in registerAppPorts args={ name: 'quick-switcher-recents', pathChanged: (from) => quickSwitcherStore.rem…
reg src/lib/app/boot.ts:55 src/lib/features/file-icons/icon-resolver.ts:registerTypeIconLookup in registerAppPorts args={ typeOf: (path) => typeDefinitionsStore.getEntryByPath(path)?.isA, definitionP…
reg src/lib/app/boot.ts:61 src/lib/features/collection/view-row-set.port.ts:registerViewRowSetPort in registerAppPorts args={ blockRows: (records, view, definition) => blockRowSet(records, view, definiti…
