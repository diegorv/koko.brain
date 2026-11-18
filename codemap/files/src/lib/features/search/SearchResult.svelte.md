# file card src/lib/features/search/SearchResult.svelte
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/features/search/SearchResult.svelte ' codemap/files
file src/lib/features/search/SearchResult.svelte component L183 module src/lib/features/search in1 t1
## imports
imp src/lib/features/search/SearchResult.svelte:3 -> src/lib/core/editor/editor.service.ts openFileInEditor
imp src/lib/features/search/SearchResult.svelte:4 -> src/lib/core/editor/open-note-at.service.ts openNoteAt
imp src/lib/features/search/SearchResult.svelte:5 -> src/lib/core/vault/vault.store.svelte.ts vaultStore
imp src/lib/features/search/SearchResult.svelte:6 -> src/lib/features/event-calendar/ShowInCalendarButton.svelte default
imp src/lib/features/search/SearchResult.svelte:7 -> src/lib/utils/markdown-plain-text.ts markdownToPlainText
imp src/lib/features/search/SearchResult.svelte:8 -> src/lib/utils/path.ts relativePath
imp src/lib/features/search/SearchResult.svelte:9 -> src/lib/features/search/search.logic.ts sanitizeSnippetHtml
imp src/lib/features/search/SearchResult.svelte:10 -> src/lib/features/search/search.types.ts type:SearchResult,type:FtsSearchResult,type:SemanticSearchResult,type:HybridSearchResult
## imported-by
imp src/lib/features/search/SearchPanel.svelte:13 -> src/lib/features/search/SearchResult.svelte default
## reach
in2 src/lib/features/search/SearchResult.svelte 1 files in 1 modules: src/lib/app(1)
out2 src/lib/features/search/SearchResult.svelte 17 files in 8 modules: src/lib/utils(6) src/lib/core/editor(4) src/lib/features/event-calendar(2) src/lib/contracts(1) src/lib/core/filesystem(1) +3 modules
## tests
test src/tests/lib/features/search/SearchResult.test.ts imports src/lib/features/search/SearchResult.svelte mirror
## symbols
sym src/lib/features/search/SearchResult.svelte:1 component SearchResult props:ftsResult,semanticResult,hybridResult,legacyResult,tabindex L183
by src/lib/features/search/SearchResult.svelte:default <- src/lib/features/search/SearchPanel.svelte:301 in (markup) mount +3
## locals
local src/lib/features/search/SearchResult.svelte:33 fn toAbsolutePath(relativePath: string): string L5
local src/lib/features/search/SearchResult.svelte:40 fn titleFromPath(path: string): string L3
local src/lib/features/search/SearchResult.svelte:45 fn pct(score: number): string L3
local src/lib/features/search/SearchResult.svelte:109 fn handleClick() L26
## mounts
mount src/lib/features/search/SearchResult.svelte:181 ShowInCalendarButton -> src/lib/features/event-calendar/ShowInCalendarButton.svelte
## mounted-at
mount src/lib/features/search/SearchPanel.svelte:301 SearchResultItem -> src/lib/features/search/SearchResult.svelte
mount src/lib/features/search/SearchPanel.svelte:305 SearchResultItem -> src/lib/features/search/SearchResult.svelte
mount src/lib/features/search/SearchPanel.svelte:310 SearchResultItem -> src/lib/features/search/SearchResult.svelte
mount src/lib/features/search/SearchPanel.svelte:314 SearchResultItem -> src/lib/features/search/SearchResult.svelte
## calls
call src/lib/features/search/SearchResult.svelte:53 in title=$derived -> src/lib/features/search/SearchResult.svelte:titleFromPath call
call src/lib/features/search/SearchResult.svelte:63 in vaultRelPath=$derived -> src/lib/utils/path.ts:relativePath call
call src/lib/features/search/SearchResult.svelte:87 in snippet=$derived -> src/lib/utils/markdown-plain-text.ts:markdownToPlainText call
call src/lib/features/search/SearchResult.svelte:92 in rightLabel=$derived -> src/lib/features/search/SearchResult.svelte:pct call
call src/lib/features/search/SearchResult.svelte:102 in notePath=$derived -> src/lib/features/search/SearchResult.svelte:toAbsolutePath call +2
call src/lib/features/search/SearchResult.svelte:111 in handleClick -> src/lib/core/editor/editor.service.ts:openFileInEditor call +3
call src/lib/features/search/SearchResult.svelte:111 in handleClick -> src/lib/features/search/SearchResult.svelte:toAbsolutePath call +2
call src/lib/features/search/SearchResult.svelte:115 in handleClick -> src/lib/core/editor/open-note-at.service.ts:openNoteAt call +2
call src/lib/features/search/SearchResult.svelte:142 in (markup) -> src/lib/features/search/SearchResult.svelte:handleClick markup
call src/lib/features/search/SearchResult.svelte:173 in (markup) -> src/lib/utils/sanitize.ts:sanitizeSnippetHtml markup
