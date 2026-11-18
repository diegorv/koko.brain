# module card src/lib/features/search
cols: module <path> <layer> files <n> in-modules <n> out-modules <n> pub <public>/<exports> ipc <called>/<served> card ~<k>k · dep <from> -> <to> <file pairs> · in2/out2 <module> <n> modules: <module>(<via>) · entry <file> ext-in<n> <importers> · file … · sym … · grep: grep -rF -- '-> src/lib/features/search ' codemap/modules
module src/lib/features/search features files 12 in-modules 4 out-modules 9 pub 14/52 ipc 16/0 card ~2.1k
## neighbors
dep src/lib/app -> src/lib/features/search 10
dep src/lib/features/deep-link -> src/lib/features/search 1
dep src/lib/features/tags -> src/lib/features/search 1
dep src/routes -> src/lib/features/search 2
dep src/lib/features/search -> src/lib/components 4
dep src/lib/features/search -> src/lib/contracts 6
dep src/lib/features/search -> src/lib/core/editor 6
dep src/lib/features/search -> src/lib/core/filesystem 2
dep src/lib/features/search -> src/lib/core/settings 7
dep src/lib/features/search -> src/lib/core/vault 4
dep src/lib/features/search -> src/lib/features/event-calendar 1
dep src/lib/features/search -> src/lib/features/rail-shell 1
dep src/lib/features/search -> src/lib/utils 9
in2 src/lib/features/search 1 modules: src/lib/plugins/quick-capture(1)
out2 src/lib/features/search 4 modules: src/lib/features/collection(5) src/lib/features/type-definitions(4) src/lib/core/markdown-editor(1) src/lib/types(1)
## entry files
entry src/lib/features/search/open-search.service.ts ext-in6 src/lib/app/commands.ts src/lib/app/editor-host.ts src/lib/app/global-keybindings.ts src/lib/app/rail-navigation.ts src/lib/features/deep-link/deep-link.service.ts more importers 1 not shown: src/lib/features/tags(1): q importers src/lib/features/search/open-search.service.ts
entry src/lib/features/search/search.service.ts ext-in2 src/lib/app/lifecycle/app-lifecycle.service.ts src/routes/(app)/+layout.svelte
entry src/lib/features/search/search.store.svelte.ts ext-in2 src/lib/app/lifecycle/app-lifecycle.service.ts src/routes/(app)/+layout.svelte
entry src/lib/features/search/SearchPanel.svelte ext-in1 src/lib/app/AppShell.svelte
entry src/lib/features/search/SearchSection.svelte ext-in1 src/lib/app/SettingsPanel.svelte
entry src/lib/features/search/SearchStatus.svelte ext-in1 src/lib/app/AppShell.svelte
entry src/lib/features/search/SemanticIndexStatus.svelte ext-in1 src/lib/app/AppShell.svelte
## files
file src/lib/features/search/SearchPanel.svelte component L356 module src/lib/features/search in1 t1
file src/lib/features/search/SearchResult.svelte component L183 module src/lib/features/search in1 t1
file src/lib/features/search/SearchSection.svelte component L159 module src/lib/features/search in1 t1
file src/lib/features/search/SearchStatus.svelte component L29 module src/lib/features/search in1 t1
file src/lib/features/search/SemanticIndexStatus.svelte component L69 module src/lib/features/search in1 t1
file src/lib/features/search/open-search.service.ts service L15 module src/lib/features/search in6 t1
file src/lib/features/search/search-hybrid.logic.ts logic L73 module src/lib/features/search in1 t1
file src/lib/features/search/search.logic.ts logic L299 module src/lib/features/search in3 t2
file src/lib/features/search/search.service.ts service L489 module src/lib/features/search in4 t4
file src/lib/features/search/search.store.svelte.ts store L110 module src/lib/features/search in8 t13
file src/lib/features/search/search.types.ts types L51 module src/lib/features/search in6 t0
file src/lib/features/search/semantic-index-status.logic.ts logic L52 module src/lib/features/search in1 t1
## public
sym src/lib/features/search/SearchPanel.svelte:1 component SearchPanel props:firstPane= L356
sym src/lib/features/search/SearchSection.svelte:1 component SearchSection L159
sym src/lib/features/search/SearchStatus.svelte:1 component SearchStatus L29
sym src/lib/features/search/SemanticIndexStatus.svelte:1 component SemanticIndexStatus L69
sym src/lib/features/search/open-search.service.ts:11 fn openSearch(query?: string): void L5 | Shows Search with `query` (the current query stays when it is left out): picks the Search rail item, shows the panels Cmd+1 may have hidden and focuses the inp…
sym src/lib/features/search/search.service.ts:95 fn startSemanticProgressListener(): Promise<void> L23 | Starts listening for semantic-index-progress events from Rust.
sym src/lib/features/search/search.service.ts:120 fn stopSemanticProgressListener(): void L14 | Stops listening for semantic progress events.
sym src/lib/features/search/search.service.ts:143 fn performSearch(): Promise<void> L198 | Performs search based on current mode (text/semantic/hybrid).
sym src/lib/features/search/search.service.ts:343 fn buildSearchIndex(): Promise<void> L17 | Builds the FTS5 search index.
sym src/lib/features/search/search.service.ts:365 fn registerSearchIndexHook(): () => void L30 | Registers AfterSaveObserver for incremental FTS5 + semantic index updates.
sym src/lib/features/search/search.service.ts:403 fn initSemanticSearch({ fetchStats = true }: { fetchStats?: boolean } = {}): Promise<void> L25 | Initializes semantic search — loads model if available.
sym src/lib/features/search/search.service.ts:441 fn buildSemanticIndex(): Promise<void> L39 | Builds the semantic index — chunks and embeds all files.
sym src/lib/features/search/search.service.ts:482 fn resetSearch() L8 | Resets search state.
sym src/lib/features/search/search.store.svelte.ts:41 store searchStore L70
## stores
store src/lib/features/search/search.store.svelte.ts:41 searchStore esc:0
## effects
fx-count svelte.$effect 5
fx-count timer.setTimeout 2
ipc-count ipc:build_search_index 1
ipc-count ipc:build_semantic_index 1
ipc-count ipc:download_reranker_model 1
ipc-count ipc:download_semantic_model 1
ipc-count ipc:get_all_vault_entries_v2 3
ipc-count ipc:get_semantic_file_status 1
ipc-count ipc:get_semantic_stats 1
ipc-count ipc:init_semantic_search 1
ipc-count ipc:is_reranker_model_available 1
ipc-count ipc:is_semantic_model_available 2
ipc-count ipc:read_files_batch 1
ipc-count ipc:search_fts 1
ipc-count ipc:search_hybrid 1
ipc-count ipc:search_semantic 1
ipc-count ipc:update_search_index_file 1
ipc-count ipc:update_semantic_file 1
## debt
-
