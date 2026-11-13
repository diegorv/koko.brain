# file card src/lib/features/search/search.types.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/features/search/search.types.ts ' codemap/files
file src/lib/features/search/search.types.ts types L47 module src/lib/features/search in6 t0
## imports
imp src/lib/features/search/search.types.ts:1 -> src/lib/contracts/index.ts type:FtsSearchResult,type:SemanticResult,type:IndexStats,type:SemanticStats,type:SemanticProgress
## imported-by
imp src/lib/features/search/SearchPanel.svelte:8 -> src/lib/features/search/search.types.ts type:SearchMode
imp src/lib/features/search/SearchResult.svelte:9 -> src/lib/features/search/search.types.ts type:SearchResult,type:FtsSearchResult,type:SemanticSearchResult,type:HybridSearchResult
imp src/lib/features/search/search-hybrid.logic.ts:1 -> src/lib/features/search/search.types.ts type:FtsSearchResult,type:SemanticSearchResult,type:HybridSearchResult
imp src/lib/features/search/search.logic.ts:1 -> src/lib/features/search/search.types.ts type:SearchQuery,type:SearchMatch,type:SearchContextSnippet,type:SearchResult
imp src/lib/features/search/search.service.ts:12 -> src/lib/features/search/search.types.ts type:SemanticProgress
imp src/lib/features/search/search.store.svelte.ts:1 -> src/lib/features/search/search.types.ts type:SearchResult,type:SearchMode,type:FtsSearchResult,type:SemanticSearchResult,type:HybridSearchResult,type:SearchIndexStats,type:SemanticStats,type:SemanticProgress
## reach
in2 src/lib/features/search/search.types.ts 7 files in 3 modules: src/lib/features/search(4) src/lib/app(2) src/routes(1)
out2 src/lib/features/search/search.types.ts 52 files in 1 modules: src/lib/contracts(52)
## tests
test src/tests/lib/contracts/contracts.types.test.ts imports-type src/lib/features/search/search.types.ts
test src/tests/lib/features/search/SearchPanel.test.ts imports-type src/lib/features/search/search.types.ts
test src/tests/lib/features/search/SearchResult.test.ts imports-type src/lib/features/search/search.types.ts
test src/tests/lib/features/search/search-hybrid.logic.test.ts imports-type src/lib/features/search/search.types.ts
test src/tests/lib/features/search/search.service.test.ts imports-type src/lib/features/search/search.types.ts
## symbols
sym src/lib/features/search/search.types.ts:2 reexport FtsSearchResult = dto:FtsSearchResult L1
sym src/lib/features/search/search.types.ts:3 reexport SemanticSearchResult = dto:SemanticResult L1
sym src/lib/features/search/search.types.ts:4 reexport SearchIndexStats = dto:IndexStats L1
sym src/lib/features/search/search.types.ts:5 reexport SemanticStats = dto:SemanticStats L1
sym src/lib/features/search/search.types.ts:6 reexport SemanticProgress = dto:SemanticProgress L1
sym src/lib/features/search/search.types.ts:9 interface SearchQuery L5
by src/lib/features/search/search.types.ts:SearchQuery <- src/lib/features/search/search.logic.ts:1 in (module) import
sym src/lib/features/search/search.types.ts:15 interface SearchMatch L4
by src/lib/features/search/search.types.ts:SearchMatch <- src/lib/features/search/search.logic.ts:1 in (module) import
sym src/lib/features/search/search.types.ts:20 interface SearchContextSnippet L5
by src/lib/features/search/search.types.ts:SearchContextSnippet <- src/lib/features/search/search.logic.ts:1 in (module) import
sym src/lib/features/search/search.types.ts:26 interface SearchResult L6
by src/lib/features/search/search.types.ts:SearchResult <- src/lib/features/search/SearchResult.svelte:10 in (script) import
by src/lib/features/search/search.types.ts:SearchResult <- src/lib/features/search/search.logic.ts:1 in (module) import
by src/lib/features/search/search.types.ts:SearchResult <- src/lib/features/search/search.store.svelte.ts:2 in (module) import
sym src/lib/features/search/search.types.ts:34 type SearchMode L1 | Search mode selection
by src/lib/features/search/search.types.ts:SearchMode <- src/lib/features/search/SearchPanel.svelte:8 in (script) import
by src/lib/features/search/search.types.ts:SearchMode <- src/lib/features/search/search.store.svelte.ts:3 in (module) import
sym src/lib/features/search/search.types.ts:37 interface HybridSearchResult L11 | Combined result for hybrid mode
by src/lib/features/search/search.types.ts:HybridSearchResult <- src/lib/features/search/SearchResult.svelte:13 in (script) import
by src/lib/features/search/search.types.ts:HybridSearchResult <- src/lib/features/search/search-hybrid.logic.ts:1 in (module) import
by src/lib/features/search/search.types.ts:HybridSearchResult <- src/lib/features/search/search.store.svelte.ts:6 in (module) import
