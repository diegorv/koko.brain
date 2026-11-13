# file card src/lib/features/search/search.logic.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/features/search/search.logic.ts ' codemap/files
file src/lib/features/search/search.logic.ts logic L251 module src/lib/features/search in2 t1
## imports
imp src/lib/features/search/search.logic.ts:1 -> src/lib/features/search/search.types.ts type:SearchQuery,type:SearchMatch,type:SearchContextSnippet,type:SearchResult
imp src/lib/features/search/search.logic.ts:2 -> src/lib/core/filesystem/fs.logic.ts isViewFile
imp src/lib/features/search/search.logic.ts:3 -> src/lib/utils/tag-extraction.ts extractFrontmatterTags
imp src/lib/features/search/search.logic.ts:4 -> src/lib/utils/path.ts relativePath,stem
imp src/lib/features/search/search.logic.ts:30 -> src/lib/utils/sanitize.ts sanitizeSnippetHtml
## imported-by
imp src/lib/features/search/SearchResult.svelte:8 -> src/lib/features/search/search.logic.ts sanitizeSnippetHtml
imp src/lib/features/search/search.service.ts:9 -> src/lib/features/search/search.logic.ts parseSearchQuery,performSearchOverFiles,performOperatorOnlySearch,matchesPathFilter
## reach
in2 src/lib/features/search/search.logic.ts 4 files in 3 modules: src/lib/features/search(2) src/lib/app(1) src/routes(1)
out2 src/lib/features/search/search.logic.ts 2 files in 2 modules: src/lib/contracts(1) src/lib/core/filesystem(1)
## tests
test src/tests/lib/features/search/search.logic.test.ts imports src/lib/features/search/search.logic.ts mirror
## symbols
sym src/lib/features/search/search.logic.ts:9 fn parseSearchQuery(raw: string): SearchQuery L18
by src/lib/features/search/search.logic.ts:parseSearchQuery <- src/lib/features/search/search.service.ts:147 in performSearch call +3
sym src/lib/features/search/search.logic.ts:30 reexport sanitizeSnippetHtml = src/lib/utils/sanitize.ts:sanitizeSnippetHtml L1
sym src/lib/features/search/search.logic.ts:32 fn searchFileContent(content: string, query: string): SearchMatch[] L19
sym src/lib/features/search/search.logic.ts:52 fn searchFileName(fileName: string, query: string): boolean L4
sym src/lib/features/search/search.logic.ts:57 fn getSearchContextSnippet(content: string, position: number, queryLength: number, radius: number = 60): SearchContextSnippet L44
sym src/lib/features/search/search.logic.ts:102 fn matchesTagFilter(content: string, tag: string): boolean L41
sym src/lib/features/search/search.logic.ts:149 fn matchesIndexTag(tags: string[], tag: string): boolean L7 | Tests a note's `VaultIndex` tags (`entry.tags`, no `#`) against one `tag:` operator.
sym src/lib/features/search/search.logic.ts:164 fn performOperatorOnlySearch(entries: { path: string; tags: string[] }[], query: SearchQuery, vaultPath: string, maxResults: number = 100): SearchR… L24 | Answers an operator-only query (`tag:` / `path:`, no text) from index entries, with no content read: tags come from `entry.tags`, so the result is the set the …
by src/lib/features/search/search.logic.ts:performOperatorOnlySearch <- src/lib/features/search/search.service.ts:194 in performSearch call
sym src/lib/features/search/search.logic.ts:189 fn matchesPathFilter(filePath: string, pathFilter: string): boolean L3
by src/lib/features/search/search.logic.ts:matchesPathFilter <- src/lib/features/search/search.service.ts:218 in performSearch call
sym src/lib/features/search/search.logic.ts:193 fn getFileName(filePath: string): string L3
sym src/lib/features/search/search.logic.ts:197 fn performSearchOverFiles(noteContents: Map<string, string>, query: SearchQuery, vaultPath: string, maxResults: number = 100): SearchResult[] L55
by src/lib/features/search/search.logic.ts:performSearchOverFiles <- src/lib/features/search/search.service.ts:236 in performSearch call
## calls
call src/lib/features/search/search.logic.ts:106 in matchesTagFilter -> src/lib/utils/tag-extraction.ts:extractFrontmatterTags call
call src/lib/features/search/search.logic.ts:174 in performOperatorOnlySearch -> src/lib/core/filesystem/fs.logic.ts:isViewFile call
call src/lib/features/search/search.logic.ts:176 in performOperatorOnlySearch -> src/lib/utils/path.ts:relativePath call
call src/lib/features/search/search.logic.ts:177 in performOperatorOnlySearch -> src/lib/features/search/search.logic.ts:matchesPathFilter call
call src/lib/features/search/search.logic.ts:179 in performOperatorOnlySearch -> src/lib/features/search/search.logic.ts:matchesIndexTag call
call src/lib/features/search/search.logic.ts:181 in performOperatorOnlySearch -> src/lib/features/search/search.logic.ts:getFileName call
call src/lib/features/search/search.logic.ts:194 in getFileName -> src/lib/utils/path.ts:stem call
call src/lib/features/search/search.logic.ts:208 in performSearchOverFiles -> src/lib/utils/path.ts:relativePath call
call src/lib/features/search/search.logic.ts:209 in performSearchOverFiles -> src/lib/features/search/search.logic.ts:matchesPathFilter call
call src/lib/features/search/search.logic.ts:215 in performSearchOverFiles -> src/lib/features/search/search.logic.ts:matchesTagFilter call
call src/lib/features/search/search.logic.ts:220 in performSearchOverFiles -> src/lib/features/search/search.logic.ts:getFileName call
call src/lib/features/search/search.logic.ts:221 in performSearchOverFiles -> src/lib/features/search/search.logic.ts:searchFileContent call
call src/lib/features/search/search.logic.ts:222 in performSearchOverFiles -> src/lib/features/search/search.logic.ts:searchFileName call
call src/lib/features/search/search.logic.ts:232 in performSearchOverFiles -> src/lib/features/search/search.logic.ts:getSearchContextSnippet call
