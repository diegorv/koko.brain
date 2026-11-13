# file card src/lib/features/search/search-hybrid.logic.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/features/search/search-hybrid.logic.ts ' codemap/files
file src/lib/features/search/search-hybrid.logic.ts logic L73 module src/lib/features/search in1 t1
## imports
imp src/lib/features/search/search-hybrid.logic.ts:1 -> src/lib/features/search/search.types.ts type:FtsSearchResult,type:SemanticSearchResult,type:HybridSearchResult
## imported-by
imp src/lib/features/search/search.service.ts:8 -> src/lib/features/search/search-hybrid.logic.ts mergeResults
## reach
in2 src/lib/features/search/search-hybrid.logic.ts 3 files in 3 modules: src/lib/app(1) src/lib/features/search(1) src/routes(1)
out2 src/lib/features/search/search-hybrid.logic.ts 1 files in 1 modules: src/lib/contracts(1)
## tests
test src/tests/lib/features/search/search-hybrid.logic.test.ts imports src/lib/features/search/search-hybrid.logic.ts mirror
## symbols
sym src/lib/features/search/search-hybrid.logic.ts:17 fn mergeResults(textResults: FtsSearchResult[], semanticResults: SemanticSearchResult[]): HybridSearchResult[] L57 | Merges FTS5 text results and semantic results using Reciprocal Rank Fusion (RRF).
by src/lib/features/search/search-hybrid.logic.ts:mergeResults <- src/lib/features/search/search.service.ts:265 in performSearch call
