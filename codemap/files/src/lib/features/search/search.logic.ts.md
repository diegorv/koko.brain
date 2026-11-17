# file card src/lib/features/search/search.logic.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/features/search/search.logic.ts ' codemap/files
file src/lib/features/search/search.logic.ts logic L269 module src/lib/features/search in3 t1
## imports
imp src/lib/features/search/search.logic.ts:1 -> src/lib/features/search/search.types.ts type:SearchQuery,type:SearchMatch,type:SearchContextSnippet,type:SearchResult
imp src/lib/features/search/search.logic.ts:2 -> src/lib/core/filesystem/fs.logic.ts isViewFile
imp src/lib/features/search/search.logic.ts:3 -> src/lib/utils/tag-extraction.ts extractFrontmatterTags
imp src/lib/features/search/search.logic.ts:4 -> src/lib/utils/path.ts relativePath,stem
imp src/lib/features/search/search.logic.ts:48 -> src/lib/utils/sanitize.ts sanitizeSnippetHtml
## imported-by
imp src/lib/features/search/SearchPanel.svelte:9 -> src/lib/features/search/search.logic.ts isBelowSemanticMinimum,SEMANTIC_MIN_QUERY_CHARS
imp src/lib/features/search/SearchResult.svelte:9 -> src/lib/features/search/search.logic.ts sanitizeSnippetHtml
imp src/lib/features/search/search.service.ts:9 -> src/lib/features/search/search.logic.ts parseSearchQuery,performSearchOverFiles,performOperatorOnlySearch,matchesPathFilter
## reach
in2 src/lib/features/search/search.logic.ts 4 files in 3 modules: src/lib/app(2) src/lib/features/search(1) src/routes(1)
out2 src/lib/features/search/search.logic.ts 2 files in 2 modules: src/lib/contracts(1) src/lib/core/filesystem(1)
## tests
test src/tests/lib/features/search/search.logic.test.ts imports src/lib/features/search/search.logic.ts mirror
## symbols
sym src/lib/features/search/search.logic.ts:9 fn parseSearchQuery(raw: string): SearchQuery L18
by src/lib/features/search/search.logic.ts:parseSearchQuery <- src/lib/features/search/search.service.ts:151 in performSearch call +3
sym src/lib/features/search/search.logic.ts:33 const SEMANTIC_MIN_QUERY_CHARS L1 | Shortest query, in code points, that Semantic and Hybrid search answer.
by src/lib/features/search/search.logic.ts:SEMANTIC_MIN_QUERY_CHARS <- src/lib/features/search/SearchPanel.svelte:120 in statusText=$derived ref
sym src/lib/features/search/search.logic.ts:41 fn isBelowSemanticMinimum(raw: string): boolean L4 | True when Semantic or Hybrid search would return nothing because the query is too short.
by src/lib/features/search/search.logic.ts:isBelowSemanticMinimum <- src/lib/features/search/SearchPanel.svelte:111 in isShortQuery=$derived call
sym src/lib/features/search/search.logic.ts:48 reexport sanitizeSnippetHtml = src/lib/utils/sanitize.ts:sanitizeSnippetHtml L1
sym src/lib/features/search/search.logic.ts:50 fn searchFileContent(content: string, query: string): SearchMatch[] L19
sym src/lib/features/search/search.logic.ts:70 fn searchFileName(fileName: string, query: string): boolean L4
sym src/lib/features/search/search.logic.ts:75 fn getSearchContextSnippet(content: string, position: number, queryLength: number, radius: number = 60): SearchContextSnippet L44
sym src/lib/features/search/search.logic.ts:120 fn matchesTagFilter(content: string, tag: string): boolean L41
sym src/lib/features/search/search.logic.ts:167 fn matchesIndexTag(tags: string[], tag: string): boolean L7 | Tests a note's `VaultIndex` tags (`entry.tags`, no `#`) against one `tag:` operator.
sym src/lib/features/search/search.logic.ts:182 fn performOperatorOnlySearch(entries: { path: string; tags: string[] }[], query: SearchQuery, vaultPath: string, maxResults: number = 100): SearchR… L24 | Answers an operator-only query (`tag:` / `path:`, no text) from index entries, with no content read: tags come from `entry.tags`, so the result is the set the …
by src/lib/features/search/search.logic.ts:performOperatorOnlySearch <- src/lib/features/search/search.service.ts:198 in performSearch call
sym src/lib/features/search/search.logic.ts:207 fn matchesPathFilter(filePath: string, pathFilter: string): boolean L3
by src/lib/features/search/search.logic.ts:matchesPathFilter <- src/lib/features/search/search.service.ts:222 in performSearch call
sym src/lib/features/search/search.logic.ts:211 fn getFileName(filePath: string): string L3
sym src/lib/features/search/search.logic.ts:215 fn performSearchOverFiles(noteContents: Map<string, string>, query: SearchQuery, vaultPath: string, maxResults: number = 100): SearchResult[] L55
by src/lib/features/search/search.logic.ts:performSearchOverFiles <- src/lib/features/search/search.service.ts:240 in performSearch call
## calls
call src/lib/features/search/search.logic.ts:42 in isBelowSemanticMinimum -> src/lib/features/search/search.logic.ts:parseSearchQuery call
call src/lib/features/search/search.logic.ts:124 in matchesTagFilter -> src/lib/utils/tag-extraction.ts:extractFrontmatterTags call
call src/lib/features/search/search.logic.ts:192 in performOperatorOnlySearch -> src/lib/core/filesystem/fs.logic.ts:isViewFile call
call src/lib/features/search/search.logic.ts:194 in performOperatorOnlySearch -> src/lib/utils/path.ts:relativePath call
call src/lib/features/search/search.logic.ts:195 in performOperatorOnlySearch -> src/lib/features/search/search.logic.ts:matchesPathFilter call
call src/lib/features/search/search.logic.ts:197 in performOperatorOnlySearch -> src/lib/features/search/search.logic.ts:matchesIndexTag call
call src/lib/features/search/search.logic.ts:199 in performOperatorOnlySearch -> src/lib/features/search/search.logic.ts:getFileName call
call src/lib/features/search/search.logic.ts:212 in getFileName -> src/lib/utils/path.ts:stem call
call src/lib/features/search/search.logic.ts:226 in performSearchOverFiles -> src/lib/utils/path.ts:relativePath call
call src/lib/features/search/search.logic.ts:227 in performSearchOverFiles -> src/lib/features/search/search.logic.ts:matchesPathFilter call
call src/lib/features/search/search.logic.ts:233 in performSearchOverFiles -> src/lib/features/search/search.logic.ts:matchesTagFilter call
call src/lib/features/search/search.logic.ts:238 in performSearchOverFiles -> src/lib/features/search/search.logic.ts:getFileName call
call src/lib/features/search/search.logic.ts:239 in performSearchOverFiles -> src/lib/features/search/search.logic.ts:searchFileContent call
call src/lib/features/search/search.logic.ts:240 in performSearchOverFiles -> src/lib/features/search/search.logic.ts:searchFileName call
call src/lib/features/search/search.logic.ts:250 in performSearchOverFiles -> src/lib/features/search/search.logic.ts:getSearchContextSnippet call
