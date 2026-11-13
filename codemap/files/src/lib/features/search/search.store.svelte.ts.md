# file card src/lib/features/search/search.store.svelte.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/features/search/search.store.svelte.ts ' codemap/files
file src/lib/features/search/search.store.svelte.ts store L90 module src/lib/features/search in8 t12
## imports
imp src/lib/features/search/search.store.svelte.ts:1 -> src/lib/features/search/search.types.ts type:SearchResult,type:SearchMode,type:FtsSearchResult,type:SemanticSearchResult,type:HybridSearchResult,type:SearchIndexStats,type:SemanticStats,type:SemanticProgress
## imported-by
imp src/lib/app/lifecycle/app-lifecycle.service.ts:35 -> src/lib/features/search/search.store.svelte.ts searchStore
imp src/lib/features/search/SearchPanel.svelte:6 -> src/lib/features/search/search.store.svelte.ts searchStore
imp src/lib/features/search/SearchSection.svelte:9 -> src/lib/features/search/search.store.svelte.ts searchStore
imp src/lib/features/search/SearchStatus.svelte:2 -> src/lib/features/search/search.store.svelte.ts searchStore
imp src/lib/features/search/SemanticIndexStatus.svelte:11 -> src/lib/features/search/search.store.svelte.ts searchStore
imp src/lib/features/search/open-search.service.ts:3 -> src/lib/features/search/search.store.svelte.ts searchStore
imp src/lib/features/search/search.service.ts:4 -> src/lib/features/search/search.store.svelte.ts searchStore
imp src/routes/(app)/+layout.svelte:7 -> src/lib/features/search/search.store.svelte.ts searchStore
## reach
in2 src/lib/features/search/search.store.svelte.ts 8 files in 3 modules: src/lib/app(6) src/lib/features/deep-link(1) src/lib/features/tags(1)
out2 src/lib/features/search/search.store.svelte.ts 1 files in 1 modules: src/lib/contracts(1)
## tests
test src/tests/lib/features/search/search.store.test.ts imports src/lib/features/search/search.store.svelte.ts mirror
test src/tests/lib/app/commands.test.ts imports src/lib/features/search/search.store.svelte.ts
test src/tests/lib/app/editor-host.test.ts imports src/lib/features/search/search.store.svelte.ts
test src/tests/lib/app/global-keybindings.test.ts imports src/lib/features/search/search.store.svelte.ts
test src/tests/lib/app/lifecycle/app-lifecycle.service.test.ts imports src/lib/features/search/search.store.svelte.ts
test src/tests/lib/app/rail-navigation.test.ts imports src/lib/features/search/search.store.svelte.ts
test src/tests/lib/features/deep-link/deep-link.service.test.ts imports src/lib/features/search/search.store.svelte.ts
test src/tests/lib/features/search/SearchPanel.test.ts imports src/lib/features/search/search.store.svelte.ts
test src/tests/lib/features/search/SemanticIndexStatus.test.ts imports src/lib/features/search/search.store.svelte.ts
test src/tests/lib/features/search/open-search.service.test.ts imports src/lib/features/search/search.store.svelte.ts
test src/tests/lib/features/search/search.service.test.ts imports src/lib/features/search/search.store.svelte.ts
test src/tests/lib/features/tags/TagsView.test.ts imports src/lib/features/search/search.store.svelte.ts
## symbols
sym src/lib/features/search/search.store.svelte.ts:33 store searchStore L58
by src/lib/features/search/search.store.svelte.ts:searchStore <- src/lib/app/lifecycle/app-lifecycle.service.ts:477 in initializeVault member +1
by src/lib/features/search/search.store.svelte.ts:searchStore <- src/lib/features/search/SearchPanel.svelte:23 in $effect@22 member +41
by src/lib/features/search/search.store.svelte.ts:searchStore <- src/lib/features/search/SearchSection.svelte:80 in handleToggle member +5
by src/lib/features/search/search.store.svelte.ts:searchStore <- src/lib/features/search/SearchStatus.svelte:9 in (markup) markup +7
by src/lib/features/search/search.store.svelte.ts:searchStore <- src/lib/features/search/SemanticIndexStatus.svelte:36 in $effect@29 member
by src/lib/features/search/search.store.svelte.ts:searchStore <- src/lib/features/search/open-search.service.ts:12 in openSearch mcall +1
by src/lib/features/search/search.store.svelte.ts:searchStore <- src/lib/features/search/search.service.ts:72 in flushSemanticProgress mcall +38
by src/lib/features/search/search.store.svelte.ts:searchStore <- src/routes/(app)/+layout.svelte:171 in $effect@170 member +2
## store
store src/lib/features/search/search.store.svelte.ts:33 searchStore esc:0
mem src/lib/features/search/search.store.svelte.ts:34 get searchStore.query r:src/lib/features/search/SearchPanel.svelte:117,src/lib/features/search/SearchPanel.svelte:158,src/lib/features/search/search.service.ts:129,src/routes/(app)/+layout.svelte:171 w-via:setQuery,reset
mem src/lib/features/search/search.store.svelte.ts:35 get searchStore.results r:src/lib/features/search/SearchPanel.svelte:57,src/lib/features/search/SearchPanel.svelte:65,src/lib/features/search/SearchPanel.svelte:132 w-via:setResults,reset
mem src/lib/features/search/search.store.svelte.ts:36 get searchStore.isSearching r:src/lib/features/search/SearchPanel.svelte:115 w-via:setSearching,reset
mem src/lib/features/search/search.store.svelte.ts:38 get searchStore.focusRequest r:src/lib/features/search/SearchPanel.svelte:23 w-via:requestFocus,reset | Bumped by `requestFocus`; the search input focuses itself when it changes
mem src/lib/features/search/search.store.svelte.ts:40 get searchStore.handledFocusRequest r:src/lib/features/search/SearchPanel.svelte:25 w-via:markFocusHandled,reset | The last `focusRequest` the search input handled; equal to `focusRequest` when none is pending
mem src/lib/features/search/search.store.svelte.ts:41 get searchStore.mode r:11 w-via:setMode,reset
more r 11 not shown: src/lib/features/search(10) src/routes(1): q store src/lib/features/search/search.store.svelte.ts:searchStore.mode
mem src/lib/features/search/search.store.svelte.ts:42 get searchStore.fuzzyEnabled r:src/lib/features/search/SearchPanel.svelte:46,src/lib/features/search/SearchPanel.svelte:165,src/lib/features/search/SearchPanel.svelte:167,src/lib/features/search/search.service.ts:139,src/lib/features/search/search.service.ts:202,src/routes/(app)/+layout.svelte:173 w-via:setFuzzyEnabled,reset
mem src/lib/features/search/search.store.svelte.ts:43 get searchStore.ftsResults r:src/lib/features/search/SearchPanel.svelte:57,src/lib/features/search/SearchPanel.svelte:65,src/lib/features/search/SearchPanel.svelte:127,src/lib/features/search/SearchPanel.svelte:128,src/lib/features/search/search.service.ts:265,src/lib/features/search/search.service.ts:266 w-via:setFtsResults,reset
mem src/lib/features/search/search.store.svelte.ts:44 get searchStore.semanticResults r:src/lib/features/search/SearchPanel.svelte:59,src/lib/features/search/SearchPanel.svelte:67,src/lib/features/search/SearchPanel.svelte:137,src/lib/features/search/search.service.ts:265,src/lib/features/search/search.service.ts:266 w-via:setSemanticResults,reset
mem src/lib/features/search/search.store.svelte.ts:45 get searchStore.hybridResults r:src/lib/features/search/SearchPanel.svelte:60,src/lib/features/search/SearchPanel.svelte:68,src/lib/features/search/SearchPanel.svelte:141 w-via:setHybridResults,reset
mem src/lib/features/search/search.store.svelte.ts:46 get searchStore.indexStats r:src/lib/features/search/SearchPanel.svelte:105,src/lib/features/search/SearchPanel.svelte:106,src/lib/features/search/SearchStatus.svelte:22,src/lib/features/search/SearchStatus.svelte:24,src/lib/features/search/SearchStatus.svelte:27 w-via:setIndexStats,reset
mem src/lib/features/search/search.store.svelte.ts:47 get searchStore.isIndexing r:src/lib/features/search/SearchPanel.svelte:100,src/lib/features/search/SearchStatus.svelte:9 w-via:setIsIndexing,reset
mem src/lib/features/search/search.store.svelte.ts:48 get searchStore.semanticStats r:8 w-via:setSemanticStats,reset
more r 8 not shown: src/lib/features/search(8): q store src/lib/features/search/search.store.svelte.ts:searchStore.semanticStats
mem src/lib/features/search/search.store.svelte.ts:49 get searchStore.isSemanticIndexing r:src/lib/features/search/SearchPanel.svelte:100,src/lib/features/search/SearchStatus.svelte:14 w-via:setIsSemanticIndexing,reset
mem src/lib/features/search/search.store.svelte.ts:50 get searchStore.semanticProgress r:src/lib/features/search/SearchPanel.svelte:103,src/lib/features/search/SearchSection.svelte:116,src/lib/features/search/SearchSection.svelte:150,src/lib/features/search/SearchStatus.svelte:17 w-via:setSemanticProgress,reset
mem src/lib/features/search/search.store.svelte.ts:51 get searchStore.modelAvailable r:src/lib/app/lifecycle/app-lifecycle.service.ts:477,src/lib/app/lifecycle/app-lifecycle.service.ts:484,src/lib/features/search/SearchPanel.svelte:89,src/lib/features/search/SearchPanel.svelte:90,src/lib/features/search/SearchSection.svelte:80 w-via:setModelAvailable,reset
mem src/lib/features/search/search.store.svelte.ts:53 do searchStore.setQuery w:src/lib/features/search/SearchPanel.svelte:33,src/lib/features/search/open-search.service.ts:12
mem src/lib/features/search/search.store.svelte.ts:54 do searchStore.setResults w:src/lib/features/search/search.service.ts:134,src/lib/features/search/search.service.ts:196,src/lib/features/search/search.service.ts:238
mem src/lib/features/search/search.store.svelte.ts:55 do searchStore.setSearching w:src/lib/features/search/search.service.ts:138,src/lib/features/search/search.service.ts:273
mem src/lib/features/search/search.store.svelte.ts:57 do searchStore.requestFocus w:src/lib/features/search/open-search.service.ts:14 | Asks the mounted search input to take focus, even when Search is already shown
mem src/lib/features/search/search.store.svelte.ts:59 do searchStore.markFocusHandled w:src/lib/features/search/SearchPanel.svelte:27 | Records that the input took focus for every request so far
mem src/lib/features/search/search.store.svelte.ts:60 do searchStore.setMode w:src/lib/features/search/SearchPanel.svelte:42
mem src/lib/features/search/search.store.svelte.ts:61 do searchStore.setFuzzyEnabled w:src/lib/features/search/SearchPanel.svelte:46
mem src/lib/features/search/search.store.svelte.ts:62 do searchStore.setFtsResults w:src/lib/features/search/search.service.ts:131,src/lib/features/search/search.service.ts:172,src/lib/features/search/search.service.ts:197,src/lib/features/search/search.service.ts:223,src/lib/features/search/search.service.ts:226,src/lib/features/search/search.service.ts:239
mem src/lib/features/search/search.store.svelte.ts:63 do searchStore.setSemanticResults w:src/lib/features/search/search.service.ts:132,src/lib/features/search/search.service.ts:160,src/lib/features/search/search.service.ts:256,src/lib/features/search/search.service.ts:260
mem src/lib/features/search/search.store.svelte.ts:64 do searchStore.setHybridResults w:src/lib/features/search/search.service.ts:133,src/lib/features/search/search.service.ts:171,src/lib/features/search/search.service.ts:267
mem src/lib/features/search/search.store.svelte.ts:65 do searchStore.setIndexStats w:src/lib/features/search/search.service.ts:288
mem src/lib/features/search/search.store.svelte.ts:66 do searchStore.setIsIndexing w:src/lib/features/search/search.service.ts:283,src/lib/features/search/search.service.ts:293
mem src/lib/features/search/search.store.svelte.ts:67 do searchStore.setSemanticStats w:src/lib/features/search/search.service.ts:356,src/lib/features/search/search.service.ts:398
mem src/lib/features/search/search.store.svelte.ts:68 do searchStore.setIsSemanticIndexing w:src/lib/features/search/search.service.ts:388,src/lib/features/search/search.service.ts:407
mem src/lib/features/search/search.store.svelte.ts:69 do searchStore.setSemanticProgress w:src/lib/features/search/search.service.ts:72,src/lib/features/search/search.service.ts:119,src/lib/features/search/search.service.ts:408
mem src/lib/features/search/search.store.svelte.ts:70 do searchStore.setModelAvailable w:src/lib/features/search/search.service.ts:347
mem src/lib/features/search/search.store.svelte.ts:72 do searchStore.reset w:src/lib/features/search/search.service.ts:424
