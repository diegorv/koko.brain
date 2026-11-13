# file card src/lib/features/collection/collection.service.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/features/collection/collection.service.ts ' codemap/files
file src/lib/features/collection/collection.service.ts service L220 module src/lib/features/collection in4 t22
## imports
imp src/lib/features/collection/collection.service.ts:1 -> src/lib/contracts/ipc.ts call
imp src/lib/features/collection/collection.service.ts:2 -> src/lib/core/filesystem/note-change.service.ts registerNoteChangeConsumer
imp src/lib/features/collection/collection.service.ts:3 -> src/lib/core/filesystem/path-change.service.ts registerPathChangeConsumer
imp src/lib/features/collection/collection.service.ts:4 -> src/lib/core/filesystem/fs.logic.ts isMarkdownFile
imp src/lib/features/collection/collection.service.ts:5 -> src/lib/utils/debug.ts debug,error,timeAsync
imp src/lib/features/collection/collection.service.ts:6 -> src/lib/core/filesystem/fs.service.ts createFile
imp src/lib/features/collection/collection.service.ts:7 -> src/lib/core/vault/vault.store.svelte.ts vaultStore
imp src/lib/features/collection/collection.service.ts:8 -> src/lib/features/collection/collection.store.svelte.ts collectionStore
imp src/lib/features/collection/collection.service.ts:9 -> src/lib/features/collection/collection.types.ts type:PropertyIndexRecord
imp src/lib/features/collection/collection.service.ts:10 -> src/lib/types/vault-v2.types.ts type:NoteRecordV2
imp src/lib/features/collection/collection.service.ts:11 -> src/lib/features/collection/collection.logic.ts buildNoteRecord
## imported-by
imp src/lib/app/lifecycle/app-lifecycle.service.ts:20 -> src/lib/features/collection/collection.service.ts buildPropertyIndex,registerCollectionNoteChangeConsumer,registerCollectionPathChangeConsumer,resetCollection
imp src/lib/app/lifecycle/watcher-handler.service.ts:3 -> src/lib/features/collection/collection.service.ts buildPropertyIndex
imp src/lib/app/tauri-listeners.service.ts:17 -> src/lib/features/collection/collection.service.ts applyPropertyDelta,buildPropertyIndex,propertyIndexNeedsWholeRead
imp src/lib/features/rail-shell/FilesNavigator.svelte:44 -> src/lib/features/collection/collection.service.ts createCollectionFile
## reach
in2 src/lib/features/collection/collection.service.ts 2 files in 2 modules: src/lib/app(1) src/routes(1)
out2 src/lib/features/collection/collection.service.ts 25 files in 9 modules: src/lib/core/editor(5) src/lib/core/filesystem(4) src/lib/features/collection(4) src/lib/utils(4) src/lib/contracts(3) +4 modules
## tests
test src/tests/lib/features/collection/collection.service.test.ts imports src/lib/features/collection/collection.service.ts mirror
test src/tests/lib/app/EditorView.test.ts imports src/lib/features/collection/collection.service.ts
test src/tests/lib/app/lifecycle/index-updater.service.test.ts imports src/lib/features/collection/collection.service.ts
test src/tests/lib/app/lifecycle/watcher-handler.mixed-batch.test.ts imports src/lib/features/collection/collection.service.ts
test src/tests/lib/core/editor/editor.hooks.test.ts imports src/lib/features/collection/collection.service.ts
test src/tests/lib/core/filesystem/fs.service.test.ts imports src/lib/features/collection/collection.service.ts
test src/tests/lib/core/filesystem/link-updater.service.test.ts imports src/lib/features/collection/collection.service.ts
test src/tests/lib/core/filesystem/note-change.service.test.ts imports src/lib/features/collection/collection.service.ts
test src/tests/lib/core/note-creator/note-creator.service.test.ts imports src/lib/features/collection/collection.service.ts
test src/tests/lib/features/collection/CollectionView.restored-view.test.ts imports src/lib/features/collection/collection.service.ts
test src/tests/lib/features/collection/collection-view-index-path-change.test.ts imports src/lib/features/collection/collection.service.ts
test src/tests/lib/features/collection/toolbar/suggestions-skip-views.test.ts imports src/lib/features/collection/collection.service.ts
test src/tests/lib/features/file-icons/file-icons.service.test.ts imports src/lib/features/collection/collection.service.ts
test src/tests/lib/features/file-icons/frontmatter-icon.service.test.ts imports src/lib/features/collection/collection.service.ts
test src/tests/lib/features/properties/lifecycle.service.favorite-path.test.ts imports src/lib/features/collection/collection.service.ts
test src/tests/lib/features/properties/lifecycle.service.rail-pin.test.ts imports src/lib/features/collection/collection.service.ts
test src/tests/lib/features/type-definitions/type-definitions.service.test.ts imports src/lib/features/collection/collection.service.ts
test src/tests/lib/plugins/mods/mod-note-saved.test.ts imports src/lib/features/collection/collection.service.ts
test src/tests/lib/plugins/mods/mod-query.service.test.ts imports src/lib/features/collection/collection.service.ts
test src/tests/lib/plugins/queryjs/kb-api.view-page.test.ts imports src/lib/features/collection/collection.service.ts
test src/tests/lib/app/lifecycle/app-lifecycle.service.test.ts mocks src/lib/features/collection/collection.service.ts
test src/tests/lib/app/lifecycle/watcher-handler.service.test.ts mocks src/lib/features/collection/collection.service.ts
## symbols
sym src/lib/features/collection/collection.service.ts:30 fn createCollectionFile(parentPath: string): Promise<string> L6 | Creates the `Untitled.view` of New table in `parentPath` (`Untitled 1.view` when taken) with `NEW_TABLE_TEMPLATE`.
by src/lib/features/collection/collection.service.ts:createCollectionFile <- src/lib/features/rail-shell/FilesNavigator.svelte:89 in fileCreators=$derived ref
sym src/lib/features/collection/collection.service.ts:90 fn buildPropertyIndex(): Promise<void> L22 | Builds the property index from the Rust `VaultIndex`.
by src/lib/features/collection/collection.service.ts:buildPropertyIndex <- src/lib/app/lifecycle/app-lifecycle.service.ts:434 in initializeVault call
by src/lib/features/collection/collection.service.ts:buildPropertyIndex <- src/lib/app/lifecycle/watcher-handler.service.ts:77 in rebuildAllIndexes call
by src/lib/features/collection/collection.service.ts:buildPropertyIndex <- src/lib/app/tauri-listeners.service.ts:208 in registerVaultIndexUpdatedListener call +1
sym src/lib/features/collection/collection.service.ts:118 fn propertyIndexNeedsWholeRead(): boolean L3 | Whether the property index needs a whole read before per-path deltas can keep it current: it was never built, or the latest whole read failed (a failed full-re…
by src/lib/features/collection/collection.service.ts:propertyIndexNeedsWholeRead <- src/lib/app/tauri-listeners.service.ts:237 in registerVaultIndexUpdatedListener call
sym src/lib/features/collection/collection.service.ts:132 fn applyPropertyDelta(records: NoteRecordV2[], removed: Iterable<string>): void L7 | Patches the property index for the paths one `vault-index-updated` refresh window changed: `records` (from `get_index_delta`) replace or add their notes, `remo…
by src/lib/features/collection/collection.service.ts:applyPropertyDelta <- src/lib/app/tauri-listeners.service.ts:245 in registerVaultIndexUpdatedListener call
sym src/lib/features/collection/collection.service.ts:152 fn updateNoteInIndex(path: string, content: string) L11 | Updates a single note's record in the property index.
sym src/lib/features/collection/collection.service.ts:167 fn removeNoteFromIndex(path: string) L3 | Removes a note from the property index.
sym src/lib/features/collection/collection.service.ts:182 fn registerCollectionNoteChangeConsumer(): () => void L10 | Registers the property index as a note-change consumer, so `applyNoteChange` keeps it in sync on every write and eviction.
by src/lib/features/collection/collection.service.ts:registerCollectionNoteChangeConsumer <- src/lib/app/lifecycle/app-lifecycle.service.ts:262 in initializeVault call
sym src/lib/features/collection/collection.service.ts:212 fn registerCollectionPathChangeConsumer(): () => void L3 | Registers the remembered view indexes as a path-change consumer, so a renamed or moved collection reopens on its last view.
by src/lib/features/collection/collection.service.ts:registerCollectionPathChangeConsumer <- src/lib/app/lifecycle/app-lifecycle.service.ts:268 in initializeVault call
sym src/lib/features/collection/collection.service.ts:217 fn resetCollection(): void L4 | Resets the collection store to its initial state.
by src/lib/features/collection/collection.service.ts:resetCollection <- src/lib/app/lifecycle/app-lifecycle.service.ts:675 in teardownVault call
## locals
local src/lib/features/collection/collection.service.ts:44 fn fromV2(record: NoteRecordV2): PropertyIndexRecord L17
local src/lib/features/collection/collection.service.ts:122 fn patchIndex(index: Map<string, PropertyIndexRecord>, delta: PropertyDelta): void L4
local src/lib/features/collection/collection.service.ts:197 fn followViewIndexPathChange(from: string, to: string | null): void L9
## calls
call src/lib/features/collection/collection.service.ts:33 in createCollectionFile -> src/lib/core/vault/vault.store.svelte.ts:vaultStore.requestPromptIndexRefresh mcall
call src/lib/features/collection/collection.service.ts:34 in createCollectionFile -> src/lib/core/filesystem/fs.service.ts:createFile call
call src/lib/features/collection/collection.service.ts:94 in buildPropertyIndex -> src/lib/utils/debug.ts:timeAsync call
call src/lib/features/collection/collection.service.ts:95 in buildPropertyIndex -> src/lib/contracts/ipc.ts:call call
call src/lib/features/collection/collection.service.ts:98 in buildPropertyIndex -> src/lib/features/collection/collection.service.ts:fromV2 call
call src/lib/features/collection/collection.service.ts:100 in buildPropertyIndex -> src/lib/features/collection/collection.service.ts:patchIndex call
call src/lib/features/collection/collection.service.ts:101 in buildPropertyIndex -> src/lib/features/collection/collection.store.svelte.ts:collectionStore.setPropertyIndex mcall
call src/lib/features/collection/collection.service.ts:103 in buildPropertyIndex -> src/lib/utils/debug.ts:debug call
call src/lib/features/collection/collection.service.ts:107 in buildPropertyIndex -> src/lib/utils/debug.ts:error call
call src/lib/features/collection/collection.service.ts:124 in patchIndex -> src/lib/features/collection/collection.service.ts:fromV2 call
call src/lib/features/collection/collection.service.ts:136 in applyPropertyDelta -> src/lib/features/collection/collection.service.ts:patchIndex call
call src/lib/features/collection/collection.service.ts:137 in applyPropertyDelta -> src/lib/features/collection/collection.store.svelte.ts:collectionStore.setPropertyIndex mcall
call src/lib/features/collection/collection.service.ts:154 in updateNoteInIndex -> src/lib/features/collection/collection.logic.ts:buildNoteRecord call
call src/lib/features/collection/collection.service.ts:161 in updateNoteInIndex -> src/lib/features/collection/collection.store.svelte.ts:collectionStore.updateRecord mcall
call src/lib/features/collection/collection.service.ts:168 in removeNoteFromIndex -> src/lib/features/collection/collection.store.svelte.ts:collectionStore.removeRecord mcall
call src/lib/features/collection/collection.service.ts:183 in registerCollectionNoteChangeConsumer -> src/lib/core/filesystem/note-change.service.ts:registerNoteChangeConsumer call
call src/lib/features/collection/collection.service.ts:186 in registerCollectionNoteChangeConsumer -> src/lib/core/filesystem/fs.logic.ts:isMarkdownFile call
call src/lib/features/collection/collection.service.ts:187 in registerCollectionNoteChangeConsumer -> src/lib/features/collection/collection.service.ts:updateNoteInIndex call
call src/lib/features/collection/collection.service.ts:189 in registerCollectionNoteChangeConsumer -> src/lib/features/collection/collection.service.ts:removeNoteFromIndex ref
call src/lib/features/collection/collection.service.ts:199 in followViewIndexPathChange -> src/lib/features/collection/collection.store.svelte.ts:collectionStore.viewIndexPaths mcall
call src/lib/features/collection/collection.service.ts:201 in followViewIndexPathChange -> src/lib/features/collection/collection.store.svelte.ts:collectionStore.getViewIndex mcall
call src/lib/features/collection/collection.service.ts:202 in followViewIndexPathChange -> src/lib/features/collection/collection.store.svelte.ts:collectionStore.deleteViewIndex mcall
call src/lib/features/collection/collection.service.ts:203 in followViewIndexPathChange -> src/lib/features/collection/collection.store.svelte.ts:collectionStore.setViewIndex mcall
call src/lib/features/collection/collection.service.ts:213 in registerCollectionPathChangeConsumer -> src/lib/core/filesystem/path-change.service.ts:registerPathChangeConsumer call
call src/lib/features/collection/collection.service.ts:213 in registerCollectionPathChangeConsumer -> src/lib/features/collection/collection.service.ts:followViewIndexPathChange ref
call src/lib/features/collection/collection.service.ts:218 in resetCollection -> src/lib/features/collection/collection.store.svelte.ts:collectionStore.reset mcall
## effects
ipc-call src/lib/features/collection/collection.service.ts:95 in buildPropertyIndex -> ipc:get_all_property_records -> src-tauri/src/commands/vault.rs:1056
reg src/lib/features/collection/collection.service.ts:183 src/lib/core/filesystem/note-change.service.ts:registerNoteChangeConsumer in registerCollectionNoteChangeConsumer args={ name: 'collection', upsert: (path, content) => { if (!isMarkdownFile(path)) r…
reg src/lib/features/collection/collection.service.ts:213 src/lib/core/filesystem/path-change.service.ts:registerPathChangeConsumer in registerCollectionPathChangeConsumer args={ name: 'collection-view-index', pathChanged: followViewIndexPathChange }
