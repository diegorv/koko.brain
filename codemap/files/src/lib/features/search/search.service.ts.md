# file card src/lib/features/search/search.service.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/features/search/search.service.ts ' codemap/files
sections: imports, imported-by, reach, tests, symbols, locals, calls, effects
file src/lib/features/search/search.service.ts service L425 module src/lib/features/search in3 t3
## imports
imp src/lib/features/search/search.service.ts:1 -> pkg:@tauri-apps/api/event type:UnlistenFn
imp src/lib/features/search/search.service.ts:2 -> src/lib/contracts/events.ts EVENT_NAMES
imp src/lib/features/search/search.service.ts:3 -> src/lib/contracts/ipc.ts call,on
imp src/lib/features/search/search.service.ts:4 -> src/lib/features/search/search.store.svelte.ts searchStore
imp src/lib/features/search/search.service.ts:5 -> src/lib/core/filesystem/fs.logic.ts isViewFile
imp src/lib/features/search/search.service.ts:6 -> src/lib/core/vault/vault.store.svelte.ts vaultStore
imp src/lib/features/search/search.service.ts:7 -> src/lib/core/editor/editor.hooks.ts addAfterSaveObserver
imp src/lib/features/search/search.service.ts:8 -> src/lib/features/search/search-hybrid.logic.ts mergeResults
imp src/lib/features/search/search.service.ts:9 -> src/lib/features/search/search.logic.ts parseSearchQuery,performSearchOverFiles,performOperatorOnlySearch,matchesPathFilter
imp src/lib/features/search/search.service.ts:10 -> src/lib/utils/path.ts vaultRelativeKey
imp src/lib/features/search/search.service.ts:11 -> src/lib/utils/debug.ts debug,error
imp src/lib/features/search/search.service.ts:12 -> src/lib/features/search/search.types.ts type:SemanticProgress
## imported-by
imp src/lib/app/lifecycle/app-lifecycle.service.ts:26 -> src/lib/features/search/search.service.ts resetSearch,buildSearchIndex,registerSearchIndexHook,initSemanticSearch,buildSemanticIndex,startSemanticProgressListener,stopSemanticProgressListener
imp src/lib/features/search/SearchSection.svelte:10 -> src/lib/features/search/search.service.ts initSemanticSearch,buildSemanticIndex,startSemanticProgressListener,stopSemanticProgressListener
imp src/routes/(app)/+layout.svelte:8 -> src/lib/features/search/search.service.ts performSearch
## reach
in2 src/lib/features/search/search.service.ts 1 files in 1 modules: src/lib/app(1)
out2 src/lib/features/search/search.service.ts 11 files in 5 modules: src/lib/utils(4) src/lib/contracts(2) src/lib/core/filesystem(2) src/lib/core/settings(2) src/lib/core/vault(1)
## tests
test src/tests/lib/features/search/search.service.test.ts imports src/lib/features/search/search.service.ts mirror
test src/tests/lib/core/vault/vault.service.switch-save.test.ts imports src/lib/features/search/search.service.ts
test src/tests/lib/app/lifecycle/app-lifecycle.service.test.ts mocks src/lib/features/search/search.service.ts
## symbols
sym src/lib/features/search/search.service.ts:82 fn startSemanticProgressListener(): Promise<void> L23 | Starts listening for semantic-index-progress events from Rust.
by src/lib/features/search/search.service.ts:startSemanticProgressListener <- src/lib/app/lifecycle/app-lifecycle.service.ts:473 in initializeVault call
by src/lib/features/search/search.service.ts:startSemanticProgressListener <- src/lib/features/search/SearchSection.svelte:45 in handleRerankerDownload call +1
sym src/lib/features/search/search.service.ts:107 fn stopSemanticProgressListener(): void L14 | Stops listening for semantic progress events.
by src/lib/features/search/search.service.ts:stopSemanticProgressListener <- src/lib/app/lifecycle/app-lifecycle.service.ts:480 in initializeVault call +2
by src/lib/features/search/search.service.ts:stopSemanticProgressListener <- src/lib/features/search/SearchSection.svelte:93 in handleToggle call
sym src/lib/features/search/search.service.ts:127 fn performSearch(): Promise<void> L150 | Performs search based on current mode (text/semantic/hybrid).
by src/lib/features/search/search.service.ts:performSearch <- src/routes/(app)/+layout.svelte:176 in $effect@170 call
sym src/lib/features/search/search.service.ts:279 fn buildSearchIndex(): Promise<void> L17 | Builds the FTS5 search index.
by src/lib/features/search/search.service.ts:buildSearchIndex <- src/lib/app/lifecycle/app-lifecycle.service.ts:445 in initializeVault call
sym src/lib/features/search/search.service.ts:301 fn registerSearchIndexHook(): () => void L30 | Registers AfterSaveObserver for incremental FTS5 + semantic index updates.
by src/lib/features/search/search.service.ts:registerSearchIndexHook <- src/lib/app/lifecycle/app-lifecycle.service.ts:450 in initializeVault call
sym src/lib/features/search/search.service.ts:339 fn initSemanticSearch({ fetchStats = true }: { fetchStats?: boolean } = {}): Promise<void> L25 | Initializes semantic search — loads model if available.
by src/lib/features/search/search.service.ts:initSemanticSearch <- src/lib/app/lifecycle/app-lifecycle.service.ts:475 in initializeVault call
by src/lib/features/search/search.service.ts:initSemanticSearch <- src/lib/features/search/SearchSection.svelte:79 in handleToggle call
sym src/lib/features/search/search.service.ts:377 fn buildSemanticIndex(): Promise<void> L39 | Builds the semantic index — chunks and embeds all files.
by src/lib/features/search/search.service.ts:buildSemanticIndex <- src/lib/app/lifecycle/app-lifecycle.service.ts:489 in initializeVault call
by src/lib/features/search/search.service.ts:buildSemanticIndex <- src/lib/features/search/SearchSection.svelte:82 in handleToggle call
sym src/lib/features/search/search.service.ts:418 fn resetSearch() L8 | Resets search state.
by src/lib/features/search/search.service.ts:resetSearch <- src/lib/app/lifecycle/app-lifecycle.service.ts:666 in teardownVault call
## locals
local src/lib/features/search/search.service.ts:24 fn loadVaultContentMap(vaultPath: string): Promise<Map<string, string>> L13
local src/lib/features/search/search.service.ts:43 fn loadVaultTagMap(): Promise<Map<string, Set<string>>> L8
local src/lib/features/search/search.service.ts:66 fn flushSemanticProgress(): void L11
## calls
call src/lib/features/search/search.service.ts:25 in loadVaultContentMap -> src/lib/contracts/ipc.ts:call call +1
call src/lib/features/search/search.service.ts:26 in loadVaultContentMap -> src/lib/core/filesystem/fs.logic.ts:isViewFile call
call src/lib/features/search/search.service.ts:44 in loadVaultTagMap -> src/lib/contracts/ipc.ts:call call
call src/lib/features/search/search.service.ts:72 in flushSemanticProgress -> src/lib/features/search/search.store.svelte.ts:searchStore.setSemanticProgress mcall
call src/lib/features/search/search.service.ts:84 in startSemanticProgressListener -> src/lib/utils/debug.ts:debug call +1
call src/lib/features/search/search.service.ts:85 in startSemanticProgressListener -> src/lib/contracts/ipc.ts:on call
call src/lib/features/search/search.service.ts:96 in startSemanticProgressListener -> src/lib/features/search/search.service.ts:flushSemanticProgress call +1
call src/lib/features/search/search.service.ts:108 in stopSemanticProgressListener -> src/lib/utils/debug.ts:debug call
call src/lib/features/search/search.service.ts:119 in stopSemanticProgressListener -> src/lib/features/search/search.store.svelte.ts:searchStore.setSemanticProgress mcall
call src/lib/features/search/search.service.ts:131 in performSearch -> src/lib/features/search/search.store.svelte.ts:searchStore.setFtsResults mcall +5
call src/lib/features/search/search.service.ts:132 in performSearch -> src/lib/features/search/search.store.svelte.ts:searchStore.setSemanticResults mcall +3
call src/lib/features/search/search.service.ts:133 in performSearch -> src/lib/features/search/search.store.svelte.ts:searchStore.setHybridResults mcall +2
call src/lib/features/search/search.service.ts:134 in performSearch -> src/lib/features/search/search.store.svelte.ts:searchStore.setResults mcall +2
call src/lib/features/search/search.service.ts:138 in performSearch -> src/lib/features/search/search.store.svelte.ts:searchStore.setSearching mcall +1
call src/lib/features/search/search.service.ts:139 in performSearch -> src/lib/utils/debug.ts:debug call +13
call src/lib/features/search/search.service.ts:147 in performSearch -> src/lib/features/search/search.logic.ts:parseSearchQuery call +3
call src/lib/features/search/search.service.ts:150 in performSearch -> src/lib/contracts/ipc.ts:call call +3
call src/lib/features/search/search.service.ts:194 in performSearch -> src/lib/features/search/search.logic.ts:performOperatorOnlySearch call
call src/lib/features/search/search.service.ts:209 in performSearch -> src/lib/features/search/search.service.ts:loadVaultTagMap call
call src/lib/features/search/search.service.ts:218 in performSearch -> src/lib/features/search/search.logic.ts:matchesPathFilter call
call src/lib/features/search/search.service.ts:234 in performSearch -> src/lib/features/search/search.service.ts:loadVaultContentMap call
call src/lib/features/search/search.service.ts:236 in performSearch -> src/lib/features/search/search.logic.ts:performSearchOverFiles call
call src/lib/features/search/search.service.ts:265 in performSearch -> src/lib/features/search/search-hybrid.logic.ts:mergeResults call
call src/lib/features/search/search.service.ts:270 in performSearch -> src/lib/utils/debug.ts:error call
call src/lib/features/search/search.service.ts:282 in buildSearchIndex -> src/lib/utils/debug.ts:debug call +2
call src/lib/features/search/search.service.ts:283 in buildSearchIndex -> src/lib/features/search/search.store.svelte.ts:searchStore.setIsIndexing mcall +1
call src/lib/features/search/search.service.ts:286 in buildSearchIndex -> src/lib/contracts/ipc.ts:call call
call src/lib/features/search/search.service.ts:288 in buildSearchIndex -> src/lib/features/search/search.store.svelte.ts:searchStore.setIndexStats mcall
call src/lib/features/search/search.service.ts:291 in buildSearchIndex -> src/lib/utils/debug.ts:error call
call src/lib/features/search/search.service.ts:302 in registerSearchIndexHook -> src/lib/utils/debug.ts:debug call +4
call src/lib/features/search/search.service.ts:303 in registerSearchIndexHook -> src/lib/core/editor/editor.hooks.ts:addAfterSaveObserver call
call src/lib/features/search/search.service.ts:311 in registerSearchIndexHook -> src/lib/utils/path.ts:vaultRelativeKey call
call src/lib/features/search/search.service.ts:320 in registerSearchIndexHook -> src/lib/contracts/ipc.ts:call call +1
call src/lib/features/search/search.service.ts:322 in registerSearchIndexHook -> src/lib/utils/debug.ts:error call
call src/lib/features/search/search.service.ts:343 in initSemanticSearch -> src/lib/utils/debug.ts:debug call +5
call src/lib/features/search/search.service.ts:345 in initSemanticSearch -> src/lib/contracts/ipc.ts:call call +2
call src/lib/features/search/search.service.ts:347 in initSemanticSearch -> src/lib/features/search/search.store.svelte.ts:searchStore.setModelAvailable mcall
call src/lib/features/search/search.service.ts:356 in initSemanticSearch -> src/lib/features/search/search.store.svelte.ts:searchStore.setSemanticStats mcall
call src/lib/features/search/search.service.ts:361 in initSemanticSearch -> src/lib/utils/debug.ts:error call
call src/lib/features/search/search.service.ts:379 in buildSemanticIndex -> src/lib/utils/debug.ts:debug call +4
call src/lib/features/search/search.service.ts:388 in buildSemanticIndex -> src/lib/features/search/search.store.svelte.ts:searchStore.setIsSemanticIndexing mcall +1
call src/lib/features/search/search.service.ts:392 in buildSemanticIndex -> src/lib/contracts/ipc.ts:call call
call src/lib/features/search/search.service.ts:398 in buildSemanticIndex -> src/lib/features/search/search.store.svelte.ts:searchStore.setSemanticStats mcall
call src/lib/features/search/search.service.ts:402 in buildSemanticIndex -> src/lib/utils/debug.ts:error call
call src/lib/features/search/search.service.ts:408 in buildSemanticIndex -> src/lib/features/search/search.store.svelte.ts:searchStore.setSemanticProgress mcall
call src/lib/features/search/search.service.ts:419 in resetSearch -> src/lib/utils/debug.ts:debug call
call src/lib/features/search/search.service.ts:424 in resetSearch -> src/lib/features/search/search.store.svelte.ts:searchStore.reset mcall
## effects
ipc-call src/lib/features/search/search.service.ts:25 in loadVaultContentMap -> ipc:get_all_vault_entries_v2 -> src-tauri/src/commands/vault.rs:563
ipc-call src/lib/features/search/search.service.ts:27 in loadVaultContentMap -> ipc:read_files_batch -> src-tauri/src/commands/files.rs:24
ipc-call src/lib/features/search/search.service.ts:44 in loadVaultTagMap -> ipc:get_all_vault_entries_v2 -> src-tauri/src/commands/vault.rs:563
ev src-tauri/src/commands/semantic.rs:414 in emit_progress -> event:semantic-index-progress -> src/lib/features/search/search.service.ts:85 in startSemanticProgressListener
fx src/lib/features/search/search.service.ts:101 timer.setTimeout delay=PROGRESS_THROTTLE_MS in startSemanticProgressListener
ipc-call src/lib/features/search/search.service.ts:150 in performSearch -> ipc:search_hybrid -> src-tauri/src/commands/semantic.rs:986
ipc-call src/lib/features/search/search.service.ts:192 in performSearch -> ipc:get_all_vault_entries_v2 -> src-tauri/src/commands/vault.rs:563
ipc-call src/lib/features/search/search.service.ts:199 in performSearch -> ipc:search_fts -> src-tauri/src/commands/search_index.rs:153
ipc-call src/lib/features/search/search.service.ts:249 in performSearch -> ipc:search_semantic -> src-tauri/src/commands/semantic.rs:798
ipc-call src/lib/features/search/search.service.ts:286 in buildSearchIndex -> ipc:build_search_index -> src-tauri/src/commands/search_index.rs:39
reg src/lib/features/search/search.service.ts:303 src/lib/core/editor/editor.hooks.ts:addAfterSaveObserver in registerSearchIndexHook args=(filePath, content) => { if (!filePath.endsWith('.md') && !filePath.endsWith('.…
ipc-call src/lib/features/search/search.service.ts:320 in registerSearchIndexHook -> ipc:update_search_index_file -> src-tauri/src/commands/search_index.rs:203
ipc-call src/lib/features/search/search.service.ts:326 in registerSearchIndexHook -> ipc:update_semantic_file -> src-tauri/src/commands/semantic.rs:1305
ipc-call src/lib/features/search/search.service.ts:345 in initSemanticSearch -> ipc:is_semantic_model_available -> src-tauri/src/commands/semantic.rs:399
ipc-call src/lib/features/search/search.service.ts:351 in initSemanticSearch -> ipc:init_semantic_search -> src-tauri/src/commands/semantic.rs:371
ipc-call src/lib/features/search/search.service.ts:354 in initSemanticSearch -> ipc:get_semantic_stats -> src-tauri/src/commands/semantic.rs:1220
ipc-call src/lib/features/search/search.service.ts:392 in buildSemanticIndex -> ipc:build_semantic_index -> src-tauri/src/commands/semantic.rs:483
