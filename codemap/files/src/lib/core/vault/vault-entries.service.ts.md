# file card src/lib/core/vault/vault-entries.service.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/core/vault/vault-entries.service.ts ' codemap/files
file src/lib/core/vault/vault-entries.service.ts service L84 module src/lib/core/vault in8 t21
## imports
imp src/lib/core/vault/vault-entries.service.ts:1 -> src/lib/contracts/ipc.ts call
imp src/lib/core/vault/vault-entries.service.ts:2 -> src/lib/utils/inflight.ts versionGated
imp src/lib/core/vault/vault-entries.service.ts:3 -> src/lib/types/vault-v2.types.ts type:NoteEntryV2
imp src/lib/core/vault/vault-entries.service.ts:4 -> src/lib/core/vault/vault-entries.logic.ts patchEntriesSnapshot
imp src/lib/core/vault/vault-entries.service.ts:5 -> src/lib/core/vault/vault.store.svelte.ts vaultStore
## imported-by
imp src/lib/app/editor-host.ts:24 -> src/lib/core/vault/vault-entries.service.ts getVaultEntries
imp src/lib/app/lifecycle/app-lifecycle.service.ts:82 -> src/lib/core/vault/vault-entries.service.ts invalidateVaultEntries
imp src/lib/app/tauri-listeners.service.ts:10 -> src/lib/core/vault/vault-entries.service.ts getVaultEntries,invalidateVaultEntries,patchVaultEntries
imp src/lib/features/event-calendar/event-calendar.service.ts:27 -> src/lib/core/vault/vault-entries.service.ts getVaultEntries
imp src/lib/features/properties/NoteInfo.svelte:5 -> src/lib/core/vault/vault-entries.service.ts getVaultEntries
imp src/lib/features/tasks/tasks.service.ts:8 -> src/lib/core/vault/vault-entries.service.ts getVaultEntries,invalidateVaultEntries
imp src/lib/plugins/mods/mod-app.service.ts:7 -> src/lib/core/vault/vault-entries.service.ts getVaultEntries
imp src/lib/plugins/queryjs/queryjs-block-widget.ts:6 -> src/lib/core/vault/vault-entries.service.ts getVaultEntries
## reach
in2 src/lib/core/vault/vault-entries.service.ts 20 files in 8 modules: src/lib/features/event-calendar(7) src/lib/app(5) src/lib/features/tasks(3) src/lib/features/rail-shell(1) src/lib/plugins/calendar(1) +3 modules: q impact src/lib/core/vault/vault-entries.service.ts --depth 2
out2 src/lib/core/vault/vault-entries.service.ts 4 files in 2 modules: src/lib/contracts(3) src/lib/core/vault(1)
## tests
test src/tests/lib/core/vault/vault-entries.service.test.ts imports src/lib/core/vault/vault-entries.service.ts mirror
test src/tests/fixtures/tasks.fixture.ts imports src/lib/core/vault/vault-entries.service.ts
test src/tests/lib/app/editor-host.test.ts imports src/lib/core/vault/vault-entries.service.ts
test src/tests/lib/app/tauri-listeners.service.test.ts imports src/lib/core/vault/vault-entries.service.ts
test src/tests/lib/features/backlinks/LinkItem.test.ts imports src/lib/core/vault/vault-entries.service.ts
test src/tests/lib/features/collection/CollectionView.restored-view.test.ts imports src/lib/core/vault/vault-entries.service.ts
test src/tests/lib/features/event-calendar/EventCalendarView.test.ts imports src/lib/core/vault/vault-entries.service.ts
test src/tests/lib/features/event-calendar/EventDialog.test.ts imports src/lib/core/vault/vault-entries.service.ts
test src/tests/lib/features/event-calendar/ShowInCalendarButton.test.ts imports src/lib/core/vault/vault-entries.service.ts
test src/tests/lib/features/event-calendar/event-calendar.model.test.ts imports src/lib/core/vault/vault-entries.service.ts
test src/tests/lib/features/event-calendar/event-calendar.service.test.ts imports src/lib/core/vault/vault-entries.service.ts
test src/tests/lib/features/properties/NoteInfo.test.ts imports src/lib/core/vault/vault-entries.service.ts
test src/tests/lib/features/search/SearchPanel.test.ts imports src/lib/core/vault/vault-entries.service.ts
test src/tests/lib/features/search/SearchResult.test.ts imports src/lib/core/vault/vault-entries.service.ts
test src/tests/lib/features/tasks/TasksView.row-menu.test.ts imports src/lib/core/vault/vault-entries.service.ts
test src/tests/lib/features/tasks/TasksView.test.ts imports src/lib/core/vault/vault-entries.service.ts
test src/tests/lib/features/tasks/task-toggle-dirty-buffer.test.ts imports src/lib/core/vault/vault-entries.service.ts
test src/tests/lib/features/tasks/tasks.service.test.ts imports src/lib/core/vault/vault-entries.service.ts
test src/tests/lib/plugins/mods/mods-host.service.test.ts imports src/lib/core/vault/vault-entries.service.ts
test src/tests/lib/plugins/queryjs/kb-api.view-page.test.ts imports src/lib/core/vault/vault-entries.service.ts
test src/tests/lib/plugins/queryjs/queryjs-block-widget.test.ts imports src/lib/core/vault/vault-entries.service.ts
## symbols
sym src/lib/core/vault/vault-entries.service.ts:36 fn getVaultEntries(): Promise<NoteEntryV2[]> L3 | Returns the full vault entries snapshot for the current index version.
by src/lib/core/vault/vault-entries.service.ts:getVaultEntries <- src/lib/app/editor-host.ts:131 in appEditorHost.listLinkCandidates call
by src/lib/core/vault/vault-entries.service.ts:getVaultEntries <- src/lib/app/tauri-listeners.service.ts:210 in registerVaultIndexUpdatedListener call
by src/lib/core/vault/vault-entries.service.ts:getVaultEntries <- src/lib/features/event-calendar/event-calendar.service.ts:81 in loadEvents call +1
by src/lib/core/vault/vault-entries.service.ts:getVaultEntries <- src/lib/features/properties/NoteInfo.svelte:25 in $effect@18 call
by src/lib/core/vault/vault-entries.service.ts:getVaultEntries <- src/lib/features/tasks/tasks.service.ts:80 in buildTaskIndex call
by src/lib/core/vault/vault-entries.service.ts:getVaultEntries <- src/lib/plugins/mods/mod-app.service.ts:82 in createModKb call
by src/lib/core/vault/vault-entries.service.ts:getVaultEntries <- src/lib/plugins/queryjs/queryjs-block-widget.ts:243 in QueryjsBlockWidget.execute call
sym src/lib/core/vault/vault-entries.service.ts:45 fn invalidateVaultEntries(): void L3 | Drops the cached snapshot.
by src/lib/core/vault/vault-entries.service.ts:invalidateVaultEntries <- src/lib/app/lifecycle/app-lifecycle.service.ts:145 in initializeVault call +2
by src/lib/core/vault/vault-entries.service.ts:invalidateVaultEntries <- src/lib/app/tauri-listeners.service.ts:262 in registerVaultIndexUpdatedListener call
by src/lib/core/vault/vault-entries.service.ts:invalidateVaultEntries <- src/lib/features/tasks/tasks.service.ts:537 in refreshAfterRefusal call
sym src/lib/core/vault/vault-entries.service.ts:50 interface EntriesDelta L6 | The changes a refresh window made to the index, as `patchVaultEntries` applies them.
sym src/lib/core/vault/vault-entries.service.ts:58 interface EntriesPatch L6 | The snapshot a patch started from and the one it produced.
sym src/lib/core/vault/vault-entries.service.ts:73 fn patchVaultEntries(readDelta: () => Promise<EntriesDelta>): Promise<EntriesPatch> | null L12 | Advances the snapshot to the current index version by applying the delta from `readDelta` to the cached snapshot (whatever version it was read at), so readers …
by src/lib/core/vault/vault-entries.service.ts:patchVaultEntries <- src/lib/app/tauri-listeners.service.ts:229 in registerVaultIndexUpdatedListener call
## calls
call src/lib/core/vault/vault-entries.service.ts:26 in vaultEntriesMemo -> src/lib/utils/inflight.ts:versionGated call
call src/lib/core/vault/vault-entries.service.ts:27 in vaultEntriesMemo -> src/lib/contracts/ipc.ts:call call
call src/lib/core/vault/vault-entries.service.ts:78 in patchVaultEntries -> src/lib/core/vault/vault-entries.logic.ts:patchEntriesSnapshot call
## effects
ipc-call src/lib/core/vault/vault-entries.service.ts:27 in vaultEntriesMemo -> ipc:get_all_vault_entries_v2 -> src-tauri/src/commands/vault.rs:563
