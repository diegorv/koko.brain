# file card src/lib/features/search/search.store.svelte.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/features/search/search.store.svelte.ts ' codemap/files
file src/lib/features/search/search.store.svelte.ts store L110 module src/lib/features/search in8 t13
## imports
imp src/lib/features/search/search.store.svelte.ts:1 -> src/lib/features/search/search.types.ts type:SearchResult,type:SearchMode,type:FtsSearchResult,type:SemanticSearchResult,type:HybridSearchResult,type:SearchIndexStats,type:SemanticStats,type:SemanticProgress
## imported-by
imp src/lib/app/lifecycle/app-lifecycle.service.ts:35 -> src/lib/features/search/search.store.svelte.ts searchStore
imp src/lib/features/search/SearchPanel.svelte:9 -> src/lib/features/search/search.store.svelte.ts searchStore
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
test src/tests/lib/features/search/SearchStatus.test.ts imports src/lib/features/search/search.store.svelte.ts
test src/tests/lib/features/search/SemanticIndexStatus.test.ts imports src/lib/features/search/search.store.svelte.ts
test src/tests/lib/features/search/open-search.service.test.ts imports src/lib/features/search/search.store.svelte.ts
test src/tests/lib/features/search/search.service.test.ts imports src/lib/features/search/search.store.svelte.ts
test src/tests/lib/features/tags/TagsView.test.ts imports src/lib/features/search/search.store.svelte.ts
## symbols
sym src/lib/features/search/search.store.svelte.ts:41 store searchStore L70
by src/lib/features/search/search.store.svelte.ts:searchStore <- src/lib/app/lifecycle/app-lifecycle.service.ts:477 in initializeVault member +1
by src/lib/features/search/search.store.svelte.ts:searchStore <- src/lib/features/search/SearchPanel.svelte:28 in $effect@27 member +46
by src/lib/features/search/search.store.svelte.ts:searchStore <- src/lib/features/search/SearchSection.svelte:80 in handleToggle member +5
by src/lib/features/search/search.store.svelte.ts:searchStore <- src/lib/features/search/SearchStatus.svelte:9 in (markup) markup +7
by src/lib/features/search/search.store.svelte.ts:searchStore <- src/lib/features/search/SemanticIndexStatus.svelte:36 in $effect@29 member
by src/lib/features/search/search.store.svelte.ts:searchStore <- src/lib/features/search/open-search.service.ts:12 in openSearch mcall +1
by src/lib/features/search/search.store.svelte.ts:searchStore <- src/lib/features/search/search.service.ts:82 in flushSemanticProgress mcall +53
by src/lib/features/search/search.store.svelte.ts:searchStore <- src/routes/(app)/+layout.svelte:171 in $effect@170 member +2
## store
store src/lib/features/search/search.store.svelte.ts:41 searchStore esc:0
mem src/lib/features/search/search.store.svelte.ts:42 get searchStore.query r:src/lib/features/search/SearchPanel.svelte:109,src/lib/features/search/SearchPanel.svelte:112,src/lib/features/search/SearchPanel.svelte:251,src/lib/features/search/search.service.ts:142,src/routes/(app)/+layout.svelte:171 w-via:setQuery,reset
mem src/lib/features/search/search.store.svelte.ts:43 get searchStore.results r:src/lib/features/search/SearchPanel.svelte:95,src/lib/features/search/SearchPanel.svelte:103,src/lib/features/search/SearchPanel.svelte:224 w-via:setResults,reset
mem src/lib/features/search/search.store.svelte.ts:44 get searchStore.isSearching r:src/lib/features/search/SearchPanel.svelte:114,src/lib/features/search/SearchPanel.svelte:126,src/lib/features/search/SearchPanel.svelte:140 w-via:setSearching,reset
mem src/lib/features/search/search.store.svelte.ts:46 get searchStore.searchError r:src/lib/features/search/SearchPanel.svelte:114 w-via:setSearchError,reset | Message of the last failed search, or null when the last search did not fail
mem src/lib/features/search/search.store.svelte.ts:48 get searchStore.resultsCapped r:src/lib/features/search/SearchPanel.svelte:142 w-via:setResultsCapped,clearResultsCapped,setMode,reset | True when the current mode's list reached a result cap; the panel then reads "N+ results"
mem src/lib/features/search/search.store.svelte.ts:50 get searchStore.focusRequest r:src/lib/features/search/SearchPanel.svelte:28 w-via:requestFocus,reset | Bumped by `requestFocus`; the search input focuses itself when it changes
mem src/lib/features/search/search.store.svelte.ts:52 get searchStore.handledFocusRequest r:src/lib/features/search/SearchPanel.svelte:30 w-via:markFocusHandled,reset | The last `focusRequest` the search input handled; equal to `focusRequest` when none is pending
mem src/lib/features/search/search.store.svelte.ts:53 get searchStore.mode r:17 w-via:setMode,reset
more r 17 not shown: src/lib/features/search(16) src/routes(1): q store src/lib/features/search/search.store.svelte.ts:searchStore.mode
mem src/lib/features/search/search.store.svelte.ts:54 get searchStore.fuzzyEnabled r:7 w-via:setFuzzyEnabled,reset
more r 7 not shown: src/lib/features/search(6) src/routes(1): q store src/lib/features/search/search.store.svelte.ts:searchStore.fuzzyEnabled
mem src/lib/features/search/search.store.svelte.ts:55 get searchStore.ftsResults r:src/lib/features/search/SearchPanel.svelte:95,src/lib/features/search/SearchPanel.svelte:103,src/lib/features/search/SearchPanel.svelte:219,src/lib/features/search/SearchPanel.svelte:220,src/lib/features/search/search.service.ts:305,src/lib/features/search/search.service.ts:306 w-via:setFtsResults,reset
mem src/lib/features/search/search.store.svelte.ts:56 get searchStore.semanticResults r:src/lib/features/search/SearchPanel.svelte:97,src/lib/features/search/SearchPanel.svelte:105,src/lib/features/search/SearchPanel.svelte:229,src/lib/features/search/search.service.ts:305,src/lib/features/search/search.service.ts:306 w-via:setSemanticResults,reset
mem src/lib/features/search/search.store.svelte.ts:57 get searchStore.hybridResults r:src/lib/features/search/SearchPanel.svelte:98,src/lib/features/search/SearchPanel.svelte:106,src/lib/features/search/SearchPanel.svelte:233 w-via:setHybridResults,reset
mem src/lib/features/search/search.store.svelte.ts:58 get searchStore.indexStats r:src/lib/features/search/SearchStatus.svelte:22,src/lib/features/search/SearchStatus.svelte:24,src/lib/features/search/SearchStatus.svelte:27 w-via:setIndexStats,reset
mem src/lib/features/search/search.store.svelte.ts:59 get searchStore.isIndexing r:src/lib/features/search/SearchStatus.svelte:9 w-via:setIsIndexing,reset
mem src/lib/features/search/search.store.svelte.ts:60 get searchStore.semanticStats r:src/lib/features/search/SearchSection.svelte:125,src/lib/features/search/SearchSection.svelte:127,src/lib/features/search/SearchSection.svelte:128,src/lib/features/search/SearchStatus.svelte:19,src/lib/features/search/SearchStatus.svelte:22,src/lib/features/search/SemanticIndexStatus.svelte:36 w-via:setSemanticStats,reset
mem src/lib/features/search/search.store.svelte.ts:61 get searchStore.isSemanticIndexing r:src/lib/features/search/SearchStatus.svelte:14 w-via:setIsSemanticIndexing,reset
mem src/lib/features/search/search.store.svelte.ts:62 get searchStore.semanticProgress r:src/lib/features/search/SearchSection.svelte:116,src/lib/features/search/SearchSection.svelte:150,src/lib/features/search/SearchStatus.svelte:17 w-via:setSemanticProgress,reset
mem src/lib/features/search/search.store.svelte.ts:63 get searchStore.modelAvailable r:src/lib/app/lifecycle/app-lifecycle.service.ts:477,src/lib/app/lifecycle/app-lifecycle.service.ts:484,src/lib/features/search/SearchPanel.svelte:47,src/lib/features/search/SearchSection.svelte:80 w-via:setModelAvailable,reset
mem src/lib/features/search/search.store.svelte.ts:65 do searchStore.setQuery w:src/lib/features/search/SearchPanel.svelte:38,src/lib/features/search/open-search.service.ts:12
mem src/lib/features/search/search.store.svelte.ts:66 do searchStore.setResults w:src/lib/features/search/search.service.ts:148,src/lib/features/search/search.service.ts:224,src/lib/features/search/search.service.ts:270,src/lib/features/search/search.service.ts:320
mem src/lib/features/search/search.store.svelte.ts:67 do searchStore.setSearching w:src/lib/features/search/search.service.ts:152,src/lib/features/search/search.service.ts:156,src/lib/features/search/search.service.ts:326
mem src/lib/features/search/search.store.svelte.ts:69 do searchStore.setSearchError w:src/lib/features/search/search.service.ts:143,src/lib/features/search/search.service.ts:297,src/lib/features/search/search.service.ts:322 | Records a failed search (a message) or clears it (null)
mem src/lib/features/search/search.store.svelte.ts:71 do searchStore.setResultsCapped w:src/lib/features/search/search.service.ts:197,src/lib/features/search/search.service.ts:199,src/lib/features/search/search.service.ts:309,src/lib/features/search/search.service.ts:311,src/lib/features/search/search.service.ts:312 | Records whether the search that wrote `forMode`'s list reached a result cap
mem src/lib/features/search/search.store.svelte.ts:73 do searchStore.clearResultsCapped w:src/lib/features/search/search.service.ts:149,src/lib/features/search/search.service.ts:321 | Clears the cap flag of every mode, for a search that empties every list
mem src/lib/features/search/search.store.svelte.ts:75 do searchStore.requestFocus w:src/lib/features/search/open-search.service.ts:14 | Asks the mounted search input to take focus, even when Search is already shown
mem src/lib/features/search/search.store.svelte.ts:77 do searchStore.markFocusHandled w:src/lib/features/search/SearchPanel.svelte:32 | Records that the input took focus for every request so far
mem src/lib/features/search/search.store.svelte.ts:78 do searchStore.setMode w:src/lib/features/search/SearchPanel.svelte:68,src/lib/features/search/SearchPanel.svelte:80
mem src/lib/features/search/search.store.svelte.ts:79 do searchStore.setFuzzyEnabled w:src/lib/features/search/SearchPanel.svelte:84
mem src/lib/features/search/search.store.svelte.ts:80 do searchStore.setFtsResults w:7
more w 7 not shown: src/lib/features/search(7): q store src/lib/features/search/search.store.svelte.ts:searchStore.setFtsResults
mem src/lib/features/search/search.store.svelte.ts:81 do searchStore.setSemanticResults w:src/lib/features/search/search.service.ts:146,src/lib/features/search/search.service.ts:184,src/lib/features/search/search.service.ts:288,src/lib/features/search/search.service.ts:292,src/lib/features/search/search.service.ts:318
mem src/lib/features/search/search.store.svelte.ts:82 do searchStore.setHybridResults w:src/lib/features/search/search.service.ts:147,src/lib/features/search/search.service.ts:194,src/lib/features/search/search.service.ts:307,src/lib/features/search/search.service.ts:319
mem src/lib/features/search/search.store.svelte.ts:83 do searchStore.setIndexStats w:src/lib/features/search/search.service.ts:341
mem src/lib/features/search/search.store.svelte.ts:84 do searchStore.setIsIndexing w:src/lib/features/search/search.service.ts:336,src/lib/features/search/search.service.ts:346
mem src/lib/features/search/search.store.svelte.ts:85 do searchStore.setSemanticStats w:src/lib/features/search/search.service.ts:409,src/lib/features/search/search.service.ts:451
mem src/lib/features/search/search.store.svelte.ts:86 do searchStore.setIsSemanticIndexing w:src/lib/features/search/search.service.ts:441,src/lib/features/search/search.service.ts:460
mem src/lib/features/search/search.store.svelte.ts:87 do searchStore.setSemanticProgress w:src/lib/features/search/search.service.ts:82,src/lib/features/search/search.service.ts:129,src/lib/features/search/search.service.ts:461
mem src/lib/features/search/search.store.svelte.ts:88 do searchStore.setModelAvailable w:src/lib/features/search/search.service.ts:400
mem src/lib/features/search/search.store.svelte.ts:90 do searchStore.reset w:src/lib/features/search/search.service.ts:477
