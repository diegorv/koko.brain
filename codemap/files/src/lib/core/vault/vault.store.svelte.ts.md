# file card src/lib/core/vault/vault.store.svelte.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/core/vault/vault.store.svelte.ts ' codemap/files
sections: imports, imported-by, reach, tests, symbols, store, locals, calls, effects
file src/lib/core/vault/vault.store.svelte.ts store L159 module src/lib/core/vault in83 t150
## imports
imp src/lib/core/vault/vault.store.svelte.ts:1 -> src/lib/core/vault/vault.logic.ts extractVaultName,updateRecentVaults,type:RecentVault
## imported-by
imp src/lib/app/AppShell.svelte:5 -> src/lib/core/vault/vault.store.svelte.ts vaultStore
imp src/lib/app/LabsSection.svelte:7 -> src/lib/core/vault/vault.store.svelte.ts vaultStore
imp src/lib/app/boot.ts:5 -> src/lib/core/vault/vault.store.svelte.ts vaultStore
imp src/lib/app/commands.ts:14 -> src/lib/core/vault/vault.store.svelte.ts vaultStore
imp src/lib/app/editor-host.ts:25 -> src/lib/core/vault/vault.store.svelte.ts vaultStore
imp src/lib/app/lifecycle/app-lifecycle.service.ts:81 -> src/lib/core/vault/vault.store.svelte.ts vaultStore
imp src/lib/app/lifecycle/watcher-handler.service.ts:8 -> src/lib/core/vault/vault.store.svelte.ts vaultStore
imp src/lib/app/tauri-listeners.service.ts:8 -> src/lib/core/vault/vault.store.svelte.ts vaultStore
imp src/lib/core/filesystem/fs.service.ts:10 -> src/lib/core/vault/vault.store.svelte.ts vaultStore
imp src/lib/core/filesystem/fs.service.ts:130 -> src/lib/core/vault/vault.store.svelte.ts dyn:*
imp src/lib/core/filesystem/fs.service.ts:253 -> src/lib/core/vault/vault.store.svelte.ts dyn:vaultStore
imp src/lib/core/filesystem/link-updater.service.ts:7 -> src/lib/core/vault/vault.store.svelte.ts vaultStore
imp src/lib/core/filesystem/path-change.service.ts:11 -> src/lib/core/vault/vault.store.svelte.ts vaultStore
imp src/lib/core/filesystem/task-write.service.ts:3 -> src/lib/core/vault/vault.store.svelte.ts vaultStore
imp src/lib/core/frontmatter/frontmatter-write.service.ts:6 -> src/lib/core/vault/vault.store.svelte.ts vaultStore
imp src/lib/core/note-creator/note-creator.service.ts:9 -> src/lib/core/vault/vault.store.svelte.ts vaultStore
imp src/lib/core/settings/sections/TrashSection.svelte:8 -> src/lib/core/vault/vault.store.svelte.ts vaultStore
imp src/lib/core/vault/vault-entries.service.ts:5 -> src/lib/core/vault/vault.store.svelte.ts vaultStore
imp src/lib/core/vault/vault.service.ts:7 -> src/lib/core/vault/vault.store.svelte.ts vaultStore
imp src/lib/features/auto-organize/AutoOrganizeRuleProperty.svelte:16 -> src/lib/core/vault/vault.store.svelte.ts vaultStore
imp src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:26 -> src/lib/core/vault/vault.store.svelte.ts vaultStore
imp src/lib/features/auto-organize/AutoOrganizeSection.svelte:9 -> src/lib/core/vault/vault.store.svelte.ts vaultStore
imp src/lib/features/auto-organize/auto-organize.service.ts:16 -> src/lib/core/vault/vault.store.svelte.ts vaultStore
imp src/lib/features/backlinks/BacklinksPanel.svelte:10 -> src/lib/core/vault/vault.store.svelte.ts vaultStore
imp src/lib/features/backlinks/backlinks.service.ts:5 -> src/lib/core/vault/vault.store.svelte.ts vaultStore
imp src/lib/features/canvas/CanvasInner.svelte:46 -> src/lib/core/vault/vault.store.svelte.ts vaultStore
imp src/lib/features/canvas/FileNode.svelte:10 -> src/lib/core/vault/vault.store.svelte.ts vaultStore
imp src/lib/features/canvas/canvas-image.service.ts:2 -> src/lib/core/vault/vault.store.svelte.ts vaultStore
imp src/lib/features/collection/CollectionView.svelte:17 -> src/lib/core/vault/vault.store.svelte.ts vaultStore
imp src/lib/features/collection/collection-block-widget.ts:9 -> src/lib/core/vault/vault.store.svelte.ts vaultStore
imp src/lib/features/collection/collection.service.ts:7 -> src/lib/core/vault/vault.store.svelte.ts vaultStore
imp src/lib/features/deep-link/deep-link.service.ts:5 -> src/lib/core/vault/vault.store.svelte.ts vaultStore
imp src/lib/features/event-calendar/EventCalendarSection.svelte:12 -> src/lib/core/vault/vault.store.svelte.ts vaultStore
imp src/lib/features/event-calendar/EventCalendarView.svelte:14 -> src/lib/core/vault/vault.store.svelte.ts vaultStore
imp src/lib/features/event-calendar/ShowInCalendarButton.svelte:6 -> src/lib/core/vault/vault.store.svelte.ts vaultStore
imp src/lib/features/event-calendar/event-calendar.service.ts:28 -> src/lib/core/vault/vault.store.svelte.ts vaultStore
imp src/lib/features/file-history/FileHistoryDialog.svelte:8 -> src/lib/core/vault/vault.store.svelte.ts vaultStore
imp src/lib/features/file-history/file-history.service.ts:5 -> src/lib/core/vault/vault.store.svelte.ts vaultStore
imp src/lib/features/note-action-bar/note-action-bar.service.ts:7 -> src/lib/core/vault/vault.store.svelte.ts vaultStore
imp src/lib/features/note-list/NoteRow.svelte:7 -> src/lib/core/vault/vault.store.svelte.ts vaultStore
more imported-by 45 not shown: src/lib/features/rail-shell(6) src/lib/features/properties(5) src/lib/features/todoist-sync(5) src/lib/features/search(4) src/lib/plugins/mods(4) src/lib/features/outgoing-links(2) src/lib/features/tasks(2) src/lib/plugins/graph-view(2) +12 modules: q importers src/lib/core/vault/vault.store.svelte.ts
## reach
in2 src/lib/core/vault/vault.store.svelte.ts 40 files in 22 modules: src/lib/app(5) src/lib/features/event-calendar(5) src/lib/features/canvas(3) src/lib/features/rail-shell(3) src/lib/features/todoist-sync(3) +17 modules: q impact src/lib/core/vault/vault.store.svelte.ts --depth 2
out2 src/lib/core/vault/vault.store.svelte.ts 1 files in 1 modules: src/lib/utils(1)
## tests
test src/tests/lib/core/vault/vault.store.test.ts imports src/lib/core/vault/vault.store.svelte.ts mirror
test src/tests/fixtures/calendar-vault.fixture.ts imports src/lib/core/vault/vault.store.svelte.ts
test src/tests/fixtures/tasks.fixture.ts imports src/lib/core/vault/vault.store.svelte.ts
test src/tests/lib/app/AppShell.test.ts imports src/lib/core/vault/vault.store.svelte.ts
test src/tests/lib/app/EditorView.test.ts imports src/lib/core/vault/vault.store.svelte.ts
test src/tests/lib/app/LabsSection.test.ts imports src/lib/core/vault/vault.store.svelte.ts
test src/tests/lib/app/boot.test.ts imports src/lib/core/vault/vault.store.svelte.ts
test src/tests/lib/app/commands.new-commands.test.ts imports src/lib/core/vault/vault.store.svelte.ts
test src/tests/lib/app/commands.test.ts imports src/lib/core/vault/vault.store.svelte.ts
test src/tests/lib/app/commands.todoist.test.ts imports src/lib/core/vault/vault.store.svelte.ts
test src/tests/lib/app/deep-link-capture-frontmatter.test.ts imports src/lib/core/vault/vault.store.svelte.ts
test src/tests/lib/app/editor-host.test.ts imports src/lib/core/vault/vault.store.svelte.ts
test src/tests/lib/app/global-keybindings.test.ts imports src/lib/core/vault/vault.store.svelte.ts
test src/tests/lib/app/lifecycle/app-lifecycle.service.test.ts imports src/lib/core/vault/vault.store.svelte.ts
test src/tests/lib/app/lifecycle/watcher-handler.mixed-batch.test.ts imports src/lib/core/vault/vault.store.svelte.ts
test src/tests/lib/app/lifecycle/watcher-handler.service.test.ts imports src/lib/core/vault/vault.store.svelte.ts
test src/tests/lib/app/meta-bind-open-view.test.ts imports src/lib/core/vault/vault.store.svelte.ts
test src/tests/lib/app/tauri-listeners.service.test.ts imports src/lib/core/vault/vault.store.svelte.ts
test src/tests/lib/core/filesystem/delete-dirty-tab.test.ts imports src/lib/core/vault/vault.store.svelte.ts
test src/tests/lib/core/filesystem/f165-delete-dirty-tab.test.ts imports src/lib/core/vault/vault.store.svelte.ts
test src/tests/lib/core/filesystem/fs.service.race-audit.test.ts imports src/lib/core/vault/vault.store.svelte.ts
test src/tests/lib/core/filesystem/fs.service.test.ts imports src/lib/core/vault/vault.store.svelte.ts
test src/tests/lib/core/filesystem/fs.watcher.app-patch.test.ts imports src/lib/core/vault/vault.store.svelte.ts
test src/tests/lib/core/filesystem/link-updater.service.test.ts imports src/lib/core/vault/vault.store.svelte.ts
test src/tests/lib/core/filesystem/task-write.service.test.ts imports src/lib/core/vault/vault.store.svelte.ts
test src/tests/lib/core/frontmatter/frontmatter-write.service.test.ts imports src/lib/core/vault/vault.store.svelte.ts
test src/tests/lib/core/layout/layout.service.test.ts imports src/lib/core/vault/vault.store.svelte.ts
test src/tests/lib/core/note-creator/note-creator.service.test.ts imports src/lib/core/vault/vault.store.svelte.ts
test src/tests/lib/core/note-creator/note-creator.tree.test.ts imports src/lib/core/vault/vault.store.svelte.ts
test src/tests/lib/core/settings/TrashSection.test.ts imports src/lib/core/vault/vault.store.svelte.ts
test src/tests/lib/core/settings/settings-persistence.test.ts imports src/lib/core/vault/vault.store.svelte.ts
test src/tests/lib/core/settings/update-check.service.test.ts imports src/lib/core/vault/vault.store.svelte.ts
test src/tests/lib/core/trash/trash.restore-tree.test.ts imports src/lib/core/vault/vault.store.svelte.ts
test src/tests/lib/core/vault/vault-entries.service.test.ts imports src/lib/core/vault/vault.store.svelte.ts
test src/tests/lib/core/vault/vault-switch-failed-save.test.ts imports src/lib/core/vault/vault.store.svelte.ts
test src/tests/lib/core/vault/vault.service.switch-save.test.ts imports src/lib/core/vault/vault.store.svelte.ts
test src/tests/lib/core/vault/vault.service.test.ts imports src/lib/core/vault/vault.store.svelte.ts
test src/tests/lib/features/auto-organize/AutoOrganizeRuleRow.test.ts imports src/lib/core/vault/vault.store.svelte.ts
test src/tests/lib/features/auto-organize/auto-organize.no-chain.test.ts imports src/lib/core/vault/vault.store.svelte.ts
test src/tests/lib/features/auto-organize/auto-organize.service.test.ts imports src/lib/core/vault/vault.store.svelte.ts
more tests 110 not shown: src/tests/lib/features/rail-shell(17) src/tests/lib/plugins/mods(17) src/tests/lib/features/tasks(11) src/tests/lib/features/collection(7) src/tests/lib/features/properties(7) src/tests/lib/features/event-calendar(6) src/tests/lib/features/todoist-sync(6) src/tests/lib/features/deep-link(4) +17 modules: q tests src/lib/core/vault/vault.store.svelte.ts
## symbols
sym src/lib/core/vault/vault.store.svelte.ts:60 store vaultStore L100 | Reactive store for the current vault and the recent vaults list
by src/lib/core/vault/vault.store.svelte.ts:vaultStore <- src/lib/app/AppShell.svelte:71 in $effect@66 member +6
by src/lib/core/vault/vault.store.svelte.ts:vaultStore <- src/lib/app/LabsSection.svelte:25 in setModsEnabled member
by src/lib/core/vault/vault.store.svelte.ts:vaultStore <- src/lib/app/boot.ts:64 in registerAppPorts member +2
by src/lib/core/vault/vault.store.svelte.ts:vaultStore <- src/lib/app/commands.ts:153 in getBuiltInCommands member +3
by src/lib/core/vault/vault.store.svelte.ts:vaultStore <- src/lib/app/editor-host.ts:99 in vaultTags member +5
by src/lib/core/vault/vault.store.svelte.ts:vaultStore <- src/lib/app/lifecycle/app-lifecycle.service.ts:141 in initializeVault mcall +2
by src/lib/core/vault/vault.store.svelte.ts:vaultStore <- src/lib/app/lifecycle/watcher-handler.service.ts:41 in rebuildAllIndexes member
by src/lib/core/vault/vault.store.svelte.ts:vaultStore <- src/lib/app/tauri-listeners.service.ts:202 in registerVaultIndexUpdatedListener member +3
more by 75 not shown: src/lib/features/rail-shell(6) src/lib/features/properties(5) src/lib/features/todoist-sync(5) src/lib/core/filesystem(4) src/lib/features/auto-organize(4) src/lib/features/event-calendar(4) src/lib/features/search(4) src/lib/plugins/mods(4) +25 modules: q importers src/lib/core/vault/vault.store.svelte.ts:vaultStore
## store
store src/lib/core/vault/vault.store.svelte.ts:60 vaultStore esc:1
mem src/lib/core/vault/vault.store.svelte.ts:61 get vaultStore.path r:174 w-via:open,close,_reset
more r 174 not shown: src/lib/features/rail-shell(21) src/lib/app(20) src/lib/plugins/mods(18) src/lib/features/search(12) src/lib/features/event-calendar(11) src/lib/features/type-definitions(10) src/lib/core/filesystem(9) src/lib/core/settings(8) +22 modules: q store src/lib/core/vault/vault.store.svelte.ts:vaultStore.path
mem src/lib/core/vault/vault.store.svelte.ts:62 get vaultStore.name r:src/lib/features/note-action-bar/note-action-bar.service.ts:59,src/lib/plugins/quick-capture/quick-capture.service.ts:103 w-via:open,close,_reset
mem src/lib/core/vault/vault.store.svelte.ts:64 get vaultStore.isOpen r:src/lib/app/AppShell.svelte:184,src/lib/features/backlinks/BacklinksPanel.svelte:59,src/routes/(app)/+layout.svelte:76,src/routes/(app)/+layout.svelte:117 w-via:open,close,_reset | Whether a vault is currently open (computed from path)
mem src/lib/core/vault/vault.store.svelte.ts:65 get vaultStore.recentVaults r:src/lib/features/deep-link/deep-link.service.ts:142,src/routes/(app)/+page.svelte:36,src/routes/(app)/+page.svelte:46 w-via:open,removeRecent,_reset
mem src/lib/core/vault/vault.store.svelte.ts:71 get vaultStore.vaultIndexVersion r:28 w-via:bumpVaultIndexVersion,_reset | Current monotonic version of the Rust `VaultIndex`.
more r 28 not shown: src/lib/features/event-calendar(16) src/lib/features/backlinks(3) src/lib/features/outgoing-links(2) src/lib/features/tasks(2) src/lib/app(1) src/lib/core/vault(1) src/lib/features/properties(1) src/lib/features/tags(1) +1 modules: q store src/lib/core/vault/vault.store.svelte.ts:vaultStore.vaultIndexVersion
mem src/lib/core/vault/vault.store.svelte.ts:77 get vaultStore.indexReady r:11 w-via:bumpVaultIndexVersion,markIndexReady,resetIndexReady,_reset | Whether the current vault's index has emitted at least one `vault-index-updated` since it was opened.
more r 11 not shown: src/lib/features/event-calendar(4) src/lib/app(2) src/lib/features/todoist-sync(2) src/lib/features/backlinks(1) src/lib/features/tasks(1) src/routes(1): q store src/lib/core/vault/vault.store.svelte.ts:vaultStore.indexReady
mem src/lib/core/vault/vault.store.svelte.ts:80 do vaultStore.open w:src/lib/core/vault/vault.service.ts:25 | Opens a vault by path — updates state and persists to recent vaults
mem src/lib/core/vault/vault.store.svelte.ts:90 do vaultStore.close w:- | Closes the current vault (does not clear the recent list)
mem src/lib/core/vault/vault.store.svelte.ts:96 do vaultStore.removeRecent w:src/lib/core/vault/vault.service.ts:45,src/routes/(app)/+page.svelte:21 | Removes a vault from the recent list by path (e.g. when the directory no longer exists)
mem src/lib/core/vault/vault.store.svelte.ts:109 do vaultStore.bumpVaultIndexVersion w:src/lib/app/tauri-listeners.service.ts:268 | Sets the cached `vaultIndexVersion` to the latest value seen from the Rust `vault-index-updated` event.
mem src/lib/core/vault/vault.store.svelte.ts:115 do vaultStore.requestPromptIndexRefresh w:12 | Asks the next `vault-index-updated` refresh to run at once instead of after its throttle.
more w 12 not shown: src/lib/features/properties(3) src/lib/features/rail-shell(2) src/lib/features/tasks(2) src/lib/features/type-definitions(2) src/lib/features/collection(1) src/lib/features/note-list(1) src/lib/plugins/quick-capture(1): q store src/lib/core/vault/vault.store.svelte.ts:vaultStore.requestPromptIndexRefresh
mem src/lib/core/vault/vault.store.svelte.ts:120 do vaultStore.takePromptIndexRefresh w:src/lib/app/tauri-listeners.service.ts:298,src/lib/features/tasks/tasks.service.ts:304,src/lib/features/tasks/tasks.service.ts:307,src/lib/features/tasks/tasks.service.ts:401,src/lib/features/tasks/tasks.service.ts:404 | Returns whether a prompt refresh was requested, and clears the request.
mem src/lib/core/vault/vault.store.svelte.ts:132 do vaultStore.markIndexReady w:src/lib/app/lifecycle/app-lifecycle.service.ts:353 | Marks the current vault's index as built and lifts the post-teardown suppression window.
mem src/lib/core/vault/vault.store.svelte.ts:144 do vaultStore.resetIndexReady w:src/lib/app/lifecycle/app-lifecycle.service.ts:141,src/lib/app/lifecycle/app-lifecycle.service.ts:649 | Clears index readiness on vault teardown so the next vault shows the "Indexing vault..." state until its own index is built.
mem src/lib/core/vault/vault.store.svelte.ts:150 do vaultStore._reset w:-
## locals
local src/lib/core/vault/vault.store.svelte.ts:45 fn loadRecentVaults(): RecentVault[] L8
local src/lib/core/vault/vault.store.svelte.ts:55 fn persistRecentVaults(vaults: RecentVault[]) L3
## calls
call src/lib/core/vault/vault.store.svelte.ts:13 in recentVaults -> src/lib/core/vault/vault.store.svelte.ts:loadRecentVaults call
call src/lib/core/vault/vault.store.svelte.ts:81 in vaultStore.open -> src/lib/core/vault/vault.logic.ts:extractVaultName call
call src/lib/core/vault/vault.store.svelte.ts:85 in vaultStore.open -> src/lib/core/vault/vault.logic.ts:updateRecentVaults call
call src/lib/core/vault/vault.store.svelte.ts:86 in vaultStore.open -> src/lib/core/vault/vault.store.svelte.ts:persistRecentVaults call
call src/lib/core/vault/vault.store.svelte.ts:98 in vaultStore.removeRecent -> src/lib/core/vault/vault.store.svelte.ts:persistRecentVaults call
## effects
fx src/lib/core/vault/vault.store.svelte.ts:47 storage.getItem in loadRecentVaults
fx src/lib/core/vault/vault.store.svelte.ts:56 storage.setItem in persistRecentVaults
