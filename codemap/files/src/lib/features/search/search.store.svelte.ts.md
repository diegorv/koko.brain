# file card src/lib/features/search/search.store.svelte.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/features/search/search.store.svelte.ts ' codemap/files
file src/lib/features/search/search.store.svelte.ts store L110 module src/lib/features/search in8 t13
## imports
imp src/lib/features/search/search.store.svelte.ts:1 -> src/lib/features/search/search.types.ts type:SearchResult,type:SearchMode,type:FtsSearchResult,type:SemanticSearchResult,type:HybridSearchResult,type:SearchIndexStats,type:SemanticStats,type:SemanticProgress
## imported-by
imp src/lib/app/lifecycle/app-lifecycle.service.ts:35 -> src/lib/features/search/search.store.svelte.ts searchStore
imp src/lib/features/search/SearchPanel.svelte:10 -> src/lib/features/search/search.store.svelte.ts searchStore
imp src/lib/features/search/SearchSection.svelte:9 -> src/lib/features/search/search.store.svelte.ts searchStore
imp src/lib/features/search/SearchStatus.svelte:2 -> src/lib/features/search/search.store.svelte.ts searchStore
imp src/lib/features/search/SemanticIndexStatus.svelte:11 -> src/lib/features/search/search.store.svelte.ts searchStore
imp src/lib/features/search/open-search.service.ts:3 -> src/lib/features/search/search.store.svelte.ts searchStore
imp src/lib/features/search/search.service.ts:4 -> src/lib/features/search/search.store.svelte.ts searchStore
imp src/routes/(app)/+layout.svelte:8 -> src/lib/features/search/search.store.svelte.ts searchStore
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
by src/lib/features/search/search.store.svelte.ts:searchStore <- src/lib/features/search/SearchPanel.svelte:29 in $effect@28 member +55
by src/lib/features/search/search.store.svelte.ts:searchStore <- src/lib/features/search/SearchSection.svelte:80 in handleToggle member +5
by src/lib/features/search/search.store.svelte.ts:searchStore <- src/lib/features/search/SearchStatus.svelte:9 in (markup) markup +7
by src/lib/features/search/search.store.svelte.ts:searchStore <- src/lib/features/search/SemanticIndexStatus.svelte:36 in $effect@29 member
by src/lib/features/search/search.store.svelte.ts:searchStore <- src/lib/features/search/open-search.service.ts:12 in openSearch mcall +1
by src/lib/features/search/search.store.svelte.ts:searchStore <- src/lib/features/search/search.service.ts:85 in flushSemanticProgress mcall +56
by src/lib/features/search/search.store.svelte.ts:searchStore <- src/routes/(app)/+layout.svelte:176 in $effect@175 member +2
## store
store src/lib/features/search/search.store.svelte.ts:41 searchStore esc:0
mem src/lib/features/search/search.store.svelte.ts:42 get searchStore.query r:src/lib/features/search/SearchPanel.svelte:51,src/lib/features/search/SearchPanel.svelte:185,src/lib/features/search/SearchPanel.svelte:188,src/lib/features/search/SearchPanel.svelte:331,src/lib/features/search/search.service.ts:145,src/routes/(app)/+layout.svelte:176 w-via:setQuery,reset
mem src/lib/features/search/search.store.svelte.ts:43 get searchStore.results r:src/lib/features/search/SearchPanel.svelte:74,src/lib/features/search/SearchPanel.svelte:171,src/lib/features/search/SearchPanel.svelte:179,src/lib/features/search/SearchPanel.svelte:304 w-via:setResults,reset
mem src/lib/features/search/search.store.svelte.ts:44 get searchStore.isSearching r:src/lib/features/search/SearchPanel.svelte:190,src/lib/features/search/SearchPanel.svelte:202,src/lib/features/search/SearchPanel.svelte:216 w-via:setSearching,reset
mem src/lib/features/search/search.store.svelte.ts:46 get searchStore.searchError r:src/lib/features/search/SearchPanel.svelte:190 w-via:setSearchError,reset | Message of the last failed search, or null when the last search did not fail
mem src/lib/features/search/search.store.svelte.ts:48 get searchStore.resultsCapped r:src/lib/features/search/SearchPanel.svelte:218 w-via:setResultsCapped,clearResultsCapped,setMode,reset | True when the current mode's list reached a result cap; the panel then reads "N+ results"
mem src/lib/features/search/search.store.svelte.ts:50 get searchStore.focusRequest r:src/lib/features/search/SearchPanel.svelte:29 w-via:requestFocus,reset | Bumped by `requestFocus`; the search input focuses itself when it changes
mem src/lib/features/search/search.store.svelte.ts:52 get searchStore.handledFocusRequest r:src/lib/features/search/SearchPanel.svelte:31 w-via:markFocusHandled,reset | The last `focusRequest` the search input handled; equal to `focusRequest` when none is pending
mem src/lib/features/search/search.store.svelte.ts:53 get searchStore.mode r:19 w-via:setMode,reset
more r 19 not shown: src/lib/features/search(18) src/routes(1): q store src/lib/features/search/search.store.svelte.ts:searchStore.mode
mem src/lib/features/search/search.store.svelte.ts:54 get searchStore.fuzzyEnabled r:7 w-via:setFuzzyEnabled,reset
more r 7 not shown: src/lib/features/search(6) src/routes(1): q store src/lib/features/search/search.store.svelte.ts:searchStore.fuzzyEnabled
mem src/lib/features/search/search.store.svelte.ts:55 get searchStore.ftsResults r:8 w-via:setFtsResults,reset
more r 8 not shown: src/lib/features/search(8): q store src/lib/features/search/search.store.svelte.ts:searchStore.ftsResults
mem src/lib/features/search/search.store.svelte.ts:56 get searchStore.semanticResults r:src/lib/features/search/SearchPanel.svelte:76,src/lib/features/search/SearchPanel.svelte:173,src/lib/features/search/SearchPanel.svelte:181,src/lib/features/search/SearchPanel.svelte:309,src/lib/features/search/search.service.ts:316,src/lib/features/search/search.service.ts:317 w-via:setSemanticResults,reset
mem src/lib/features/search/search.store.svelte.ts:57 get searchStore.hybridResults r:src/lib/features/search/SearchPanel.svelte:77,src/lib/features/search/SearchPanel.svelte:174,src/lib/features/search/SearchPanel.svelte:182,src/lib/features/search/SearchPanel.svelte:313 w-via:setHybridResults,reset
mem src/lib/features/search/search.store.svelte.ts:58 get searchStore.indexStats r:src/lib/features/search/SearchStatus.svelte:22,src/lib/features/search/SearchStatus.svelte:24,src/lib/features/search/SearchStatus.svelte:27 w-via:setIndexStats,reset
mem src/lib/features/search/search.store.svelte.ts:59 get searchStore.isIndexing r:src/lib/features/search/SearchStatus.svelte:9 w-via:setIsIndexing,reset
mem src/lib/features/search/search.store.svelte.ts:60 get searchStore.semanticStats r:src/lib/features/search/SearchSection.svelte:125,src/lib/features/search/SearchSection.svelte:127,src/lib/features/search/SearchSection.svelte:128,src/lib/features/search/SearchStatus.svelte:19,src/lib/features/search/SearchStatus.svelte:22,src/lib/features/search/SemanticIndexStatus.svelte:36 w-via:setSemanticStats,reset
mem src/lib/features/search/search.store.svelte.ts:61 get searchStore.isSemanticIndexing r:src/lib/features/search/SearchStatus.svelte:14 w-via:setIsSemanticIndexing,reset
mem src/lib/features/search/search.store.svelte.ts:62 get searchStore.semanticProgress r:src/lib/features/search/SearchSection.svelte:116,src/lib/features/search/SearchSection.svelte:150,src/lib/features/search/SearchStatus.svelte:17 w-via:setSemanticProgress,reset
mem src/lib/features/search/search.store.svelte.ts:63 get searchStore.modelAvailable r:src/lib/app/lifecycle/app-lifecycle.service.ts:477,src/lib/app/lifecycle/app-lifecycle.service.ts:484,src/lib/features/search/SearchPanel.svelte:123,src/lib/features/search/SearchSection.svelte:80 w-via:setModelAvailable,reset
mem src/lib/features/search/search.store.svelte.ts:65 do searchStore.setQuery w:src/lib/features/search/SearchPanel.svelte:39,src/lib/features/search/SearchPanel.svelte:51,src/lib/features/search/open-search.service.ts:12
mem src/lib/features/search/search.store.svelte.ts:66 do searchStore.setResults w:src/lib/features/search/search.service.ts:151,src/lib/features/search/search.service.ts:201,src/lib/features/search/search.service.ts:231,src/lib/features/search/search.service.ts:269,src/lib/features/search/search.service.ts:281,src/lib/features/search/search.service.ts:331
mem src/lib/features/search/search.store.svelte.ts:67 do searchStore.setSearching w:src/lib/features/search/search.service.ts:155,src/lib/features/search/search.service.ts:159,src/lib/features/search/search.service.ts:337
mem src/lib/features/search/search.store.svelte.ts:69 do searchStore.setSearchError w:src/lib/features/search/search.service.ts:146,src/lib/features/search/search.service.ts:308,src/lib/features/search/search.service.ts:333 | Records a failed search (a message) or clears it (null)
mem src/lib/features/search/search.store.svelte.ts:71 do searchStore.setResultsCapped w:src/lib/features/search/search.service.ts:202,src/lib/features/search/search.service.ts:204,src/lib/features/search/search.service.ts:206,src/lib/features/search/search.service.ts:320,src/lib/features/search/search.service.ts:322,src/lib/features/search/search.service.ts:323 | Records whether the search that wrote `forMode`'s list reached a result cap
mem src/lib/features/search/search.store.svelte.ts:73 do searchStore.clearResultsCapped w:src/lib/features/search/search.service.ts:152,src/lib/features/search/search.service.ts:332 | Clears the cap flag of every mode, for a search that empties every list
mem src/lib/features/search/search.store.svelte.ts:75 do searchStore.requestFocus w:src/lib/features/search/open-search.service.ts:14 | Asks the mounted search input to take focus, even when Search is already shown
mem src/lib/features/search/search.store.svelte.ts:77 do searchStore.markFocusHandled w:src/lib/features/search/SearchPanel.svelte:33 | Records that the input took focus for every request so far
mem src/lib/features/search/search.store.svelte.ts:78 do searchStore.setMode w:src/lib/features/search/SearchPanel.svelte:144,src/lib/features/search/SearchPanel.svelte:156
mem src/lib/features/search/search.store.svelte.ts:79 do searchStore.setFuzzyEnabled w:src/lib/features/search/SearchPanel.svelte:160
mem src/lib/features/search/search.store.svelte.ts:80 do searchStore.setFtsResults w:7
more w 7 not shown: src/lib/features/search(7): q store src/lib/features/search/search.store.svelte.ts:searchStore.setFtsResults
mem src/lib/features/search/search.store.svelte.ts:81 do searchStore.setSemanticResults w:src/lib/features/search/search.service.ts:149,src/lib/features/search/search.service.ts:187,src/lib/features/search/search.service.ts:299,src/lib/features/search/search.service.ts:303,src/lib/features/search/search.service.ts:329
mem src/lib/features/search/search.store.svelte.ts:82 do searchStore.setHybridResults w:src/lib/features/search/search.service.ts:150,src/lib/features/search/search.service.ts:197,src/lib/features/search/search.service.ts:318,src/lib/features/search/search.service.ts:330
mem src/lib/features/search/search.store.svelte.ts:83 do searchStore.setIndexStats w:src/lib/features/search/search.service.ts:352
mem src/lib/features/search/search.store.svelte.ts:84 do searchStore.setIsIndexing w:src/lib/features/search/search.service.ts:347,src/lib/features/search/search.service.ts:357
mem src/lib/features/search/search.store.svelte.ts:85 do searchStore.setSemanticStats w:src/lib/features/search/search.service.ts:420,src/lib/features/search/search.service.ts:462
mem src/lib/features/search/search.store.svelte.ts:86 do searchStore.setIsSemanticIndexing w:src/lib/features/search/search.service.ts:452,src/lib/features/search/search.service.ts:471
mem src/lib/features/search/search.store.svelte.ts:87 do searchStore.setSemanticProgress w:src/lib/features/search/search.service.ts:85,src/lib/features/search/search.service.ts:132,src/lib/features/search/search.service.ts:472
mem src/lib/features/search/search.store.svelte.ts:88 do searchStore.setModelAvailable w:src/lib/features/search/search.service.ts:411
mem src/lib/features/search/search.store.svelte.ts:90 do searchStore.reset w:src/lib/features/search/search.service.ts:488
