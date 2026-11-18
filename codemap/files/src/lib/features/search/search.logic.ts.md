# file card src/lib/features/search/search.logic.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/features/search/search.logic.ts ' codemap/files
file src/lib/features/search/search.logic.ts logic L299 module src/lib/features/search in3 t2
## imports
imp src/lib/features/search/search.logic.ts:1 -> src/lib/features/search/search.types.ts type:SearchQuery,type:SearchMatch,type:SearchContextSnippet,type:SearchResult
imp src/lib/features/search/search.logic.ts:2 -> src/lib/core/filesystem/fs.logic.ts isViewFile
imp src/lib/features/search/search.logic.ts:3 -> src/lib/utils/tag-extraction.ts extractFrontmatterTags
imp src/lib/features/search/search.logic.ts:4 -> src/lib/utils/path.ts relativePath,stem
imp src/lib/features/search/search.logic.ts:78 -> src/lib/utils/sanitize.ts sanitizeSnippetHtml
## imported-by
imp src/lib/features/search/SearchPanel.svelte:11 -> src/lib/features/search/search.logic.ts isBelowSemanticMinimum,SEMANTIC_MIN_QUERY_CHARS
imp src/lib/features/search/SearchResult.svelte:9 -> src/lib/features/search/search.logic.ts sanitizeSnippetHtml
imp src/lib/features/search/search.service.ts:9 -> src/lib/features/search/search.logic.ts parseSearchQuery,performSearchOverFiles,performOperatorOnlySearch,matchesPathFilter,matchesIndexTag,FTS_MAX_RESULTS,FTS_OPERATOR_CANDIDATE_LIMIT,SEMANTIC_MAX_RESULTS,HYBRID_MAX_RESULTS,OPERATOR_ONLY_MAX_RESULTS,FALLBACK_MAX_RESULTS
## reach
in2 src/lib/features/search/search.logic.ts 4 files in 3 modules: src/lib/app(2) src/lib/features/search(1) src/routes(1)
out2 src/lib/features/search/search.logic.ts 2 files in 2 modules: src/lib/contracts(1) src/lib/core/filesystem(1)
## tests
test src/tests/lib/features/search/search.logic.test.ts imports src/lib/features/search/search.logic.ts mirror
test src/tests/lib/features/search/search.service.test.ts imports src/lib/features/search/search.logic.ts
## symbols
sym src/lib/features/search/search.logic.ts:17 const FTS_MAX_RESULTS L1 | Rows a Text search shows: the rows `search_fts` returns for plain words, or the `tag:` / `path:` matches kept from its candidate list when the words carry oper…
by src/lib/features/search/search.logic.ts:FTS_MAX_RESULTS <- src/lib/features/search/search.service.ts:240 in performSearch ref +3
sym src/lib/features/search/search.logic.ts:25 const FTS_OPERATOR_CANDIDATE_LIMIT L1 | `maxResults` sent to `search_fts` when the words carry `tag:` / `path:` operators.
by src/lib/features/search/search.logic.ts:FTS_OPERATOR_CANDIDATE_LIMIT <- src/lib/features/search/search.service.ts:239 in performSearch ref +1
sym src/lib/features/search/search.logic.ts:31 const SEMANTIC_MAX_RESULTS L1 | Chunks `search_semantic` returns.
by src/lib/features/search/search.logic.ts:SEMANTIC_MAX_RESULTS <- src/lib/features/search/search.service.ts:294 in performSearch ref +1
sym src/lib/features/search/search.logic.ts:33 const HYBRID_MAX_RESULTS L1 | Chunks `search_hybrid` returns
by src/lib/features/search/search.logic.ts:HYBRID_MAX_RESULTS <- src/lib/features/search/search.service.ts:178 in performSearch ref +1
sym src/lib/features/search/search.logic.ts:35 const OPERATOR_ONLY_MAX_RESULTS L1 | Notes an operator-only query (`tag:` / `path:`, no text) returns
by src/lib/features/search/search.logic.ts:OPERATOR_ONLY_MAX_RESULTS <- src/lib/features/search/search.service.ts:228 in performSearch ref +1
sym src/lib/features/search/search.logic.ts:37 const FALLBACK_MAX_RESULTS L1 | Notes the in-memory fallback returns when the FTS index fails
by src/lib/features/search/search.logic.ts:FALLBACK_MAX_RESULTS <- src/lib/features/search/search.service.ts:278 in performSearch ref +1
sym src/lib/features/search/search.logic.ts:39 fn parseSearchQuery(raw: string): SearchQuery L18
by src/lib/features/search/search.logic.ts:parseSearchQuery <- src/lib/features/search/search.service.ts:173 in performSearch call +3
sym src/lib/features/search/search.logic.ts:63 const SEMANTIC_MIN_QUERY_CHARS L1 | Shortest query, in code points, that Semantic and Hybrid search answer.
by src/lib/features/search/search.logic.ts:SEMANTIC_MIN_QUERY_CHARS <- src/lib/features/search/SearchPanel.svelte:215 in statusText=$derived ref
sym src/lib/features/search/search.logic.ts:71 fn isBelowSemanticMinimum(raw: string): boolean L4 | True when Semantic or Hybrid search would return nothing because the query is too short.
by src/lib/features/search/search.logic.ts:isBelowSemanticMinimum <- src/lib/features/search/SearchPanel.svelte:188 in isShortQuery=$derived call
sym src/lib/features/search/search.logic.ts:78 reexport sanitizeSnippetHtml = src/lib/utils/sanitize.ts:sanitizeSnippetHtml L1
sym src/lib/features/search/search.logic.ts:80 fn searchFileContent(content: string, query: string): SearchMatch[] L19
sym src/lib/features/search/search.logic.ts:100 fn searchFileName(fileName: string, query: string): boolean L4
sym src/lib/features/search/search.logic.ts:105 fn getSearchContextSnippet(content: string, position: number, queryLength: number, radius: number = 60): SearchContextSnippet L44
sym src/lib/features/search/search.logic.ts:150 fn matchesTagFilter(content: string, tag: string): boolean L41
sym src/lib/features/search/search.logic.ts:197 fn matchesIndexTag(tags: string[], tag: string): boolean L7 | Tests a note's `VaultIndex` tags (`entry.tags`, no `#`) against one `tag:` operator.
by src/lib/features/search/search.logic.ts:matchesIndexTag <- src/lib/features/search/search.service.ts:252 in performSearch call
sym src/lib/features/search/search.logic.ts:212 fn performOperatorOnlySearch(entries: { path: string; tags: string[] }[], query: SearchQuery, vaultPath: string, maxResults: number = OPERATOR_ONLY… L24 | Answers an operator-only query (`tag:` / `path:`, no text) from index entries, with no content read: tags come from `entry.tags`, so the result is the set the …
by src/lib/features/search/search.logic.ts:performOperatorOnlySearch <- src/lib/features/search/search.service.ts:228 in performSearch call
sym src/lib/features/search/search.logic.ts:237 fn matchesPathFilter(filePath: string, pathFilter: string): boolean L3
by src/lib/features/search/search.logic.ts:matchesPathFilter <- src/lib/features/search/search.service.ts:255 in performSearch call
sym src/lib/features/search/search.logic.ts:241 fn getFileName(filePath: string): string L3
sym src/lib/features/search/search.logic.ts:245 fn performSearchOverFiles(noteContents: Map<string, string>, query: SearchQuery, vaultPath: string, maxResults: number = FALLBACK_MAX_RESULTS): … L55
by src/lib/features/search/search.logic.ts:performSearchOverFiles <- src/lib/features/search/search.service.ts:278 in performSearch call
## calls
call src/lib/features/search/search.logic.ts:72 in isBelowSemanticMinimum -> src/lib/features/search/search.logic.ts:parseSearchQuery call
call src/lib/features/search/search.logic.ts:154 in matchesTagFilter -> src/lib/utils/tag-extraction.ts:extractFrontmatterTags call
call src/lib/features/search/search.logic.ts:222 in performOperatorOnlySearch -> src/lib/core/filesystem/fs.logic.ts:isViewFile call
call src/lib/features/search/search.logic.ts:224 in performOperatorOnlySearch -> src/lib/utils/path.ts:relativePath call
call src/lib/features/search/search.logic.ts:225 in performOperatorOnlySearch -> src/lib/features/search/search.logic.ts:matchesPathFilter call
call src/lib/features/search/search.logic.ts:227 in performOperatorOnlySearch -> src/lib/features/search/search.logic.ts:matchesIndexTag call
call src/lib/features/search/search.logic.ts:229 in performOperatorOnlySearch -> src/lib/features/search/search.logic.ts:getFileName call
call src/lib/features/search/search.logic.ts:242 in getFileName -> src/lib/utils/path.ts:stem call
call src/lib/features/search/search.logic.ts:256 in performSearchOverFiles -> src/lib/utils/path.ts:relativePath call
call src/lib/features/search/search.logic.ts:257 in performSearchOverFiles -> src/lib/features/search/search.logic.ts:matchesPathFilter call
call src/lib/features/search/search.logic.ts:263 in performSearchOverFiles -> src/lib/features/search/search.logic.ts:matchesTagFilter call
call src/lib/features/search/search.logic.ts:268 in performSearchOverFiles -> src/lib/features/search/search.logic.ts:getFileName call
call src/lib/features/search/search.logic.ts:269 in performSearchOverFiles -> src/lib/features/search/search.logic.ts:searchFileContent call
call src/lib/features/search/search.logic.ts:270 in performSearchOverFiles -> src/lib/features/search/search.logic.ts:searchFileName call
call src/lib/features/search/search.logic.ts:280 in performSearchOverFiles -> src/lib/features/search/search.logic.ts:getSearchContextSnippet call
