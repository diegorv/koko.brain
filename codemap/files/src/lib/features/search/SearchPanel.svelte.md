# file card src/lib/features/search/SearchPanel.svelte
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/features/search/SearchPanel.svelte ' codemap/files
file src/lib/features/search/SearchPanel.svelte component L171 module src/lib/features/search in1 t1
## imports
imp src/lib/features/search/SearchPanel.svelte:5 -> src/lib/components/ui/scroll-area/index.ts ScrollArea
imp src/lib/features/search/SearchPanel.svelte:6 -> src/lib/features/search/search.store.svelte.ts searchStore
imp src/lib/features/search/SearchPanel.svelte:7 -> src/lib/features/search/SearchResult.svelte default
imp src/lib/features/search/SearchPanel.svelte:8 -> src/lib/features/search/search.types.ts type:SearchMode
## imported-by
imp src/lib/app/AppShell.svelte:46 -> src/lib/features/search/SearchPanel.svelte default
## reach
in2 src/lib/features/search/SearchPanel.svelte 1 files in 1 modules: src/routes(1)
out2 src/lib/features/search/SearchPanel.svelte 9 files in 7 modules: src/lib/components(2) src/lib/core/editor(2) src/lib/contracts(1) src/lib/core/vault(1) src/lib/features/event-calendar(1) +2 modules
## tests
test src/tests/lib/features/search/SearchPanel.test.ts imports src/lib/features/search/SearchPanel.svelte mirror
## symbols
sym src/lib/features/search/SearchPanel.svelte:1 component SearchPanel props:firstPane= L171
by src/lib/features/search/SearchPanel.svelte:default <- src/lib/app/AppShell.svelte:246 in (markup) mount
## locals
local src/lib/features/search/SearchPanel.svelte:31 fn handleInput(e: Event) L4
local src/lib/features/search/SearchPanel.svelte:36 fn handleKeydown(e: KeyboardEvent) L4
local src/lib/features/search/SearchPanel.svelte:41 fn setMode(m: SearchMode) L3
local src/lib/features/search/SearchPanel.svelte:45 fn toggleFuzzy() L3
## mounts
mount src/lib/features/search/SearchPanel.svelte:113 ScrollArea -> src/lib/components/ui/scroll-area/scroll-area.svelte
mount src/lib/features/search/SearchPanel.svelte:129 SearchResultItem -> src/lib/features/search/SearchResult.svelte
mount src/lib/features/search/SearchPanel.svelte:133 SearchResultItem -> src/lib/features/search/SearchResult.svelte
mount src/lib/features/search/SearchPanel.svelte:138 SearchResultItem -> src/lib/features/search/SearchResult.svelte
mount src/lib/features/search/SearchPanel.svelte:142 SearchResultItem -> src/lib/features/search/SearchResult.svelte
## mounted-at
mount src/lib/app/AppShell.svelte:246 SearchPanel -> src/lib/features/search/SearchPanel.svelte
## calls
call src/lib/features/search/SearchPanel.svelte:27 in $effect@22 -> src/lib/features/search/search.store.svelte.ts:searchStore.markFocusHandled mcall
call src/lib/features/search/SearchPanel.svelte:33 in handleInput -> src/lib/features/search/search.store.svelte.ts:searchStore.setQuery mcall
call src/lib/features/search/SearchPanel.svelte:42 in setMode -> src/lib/features/search/search.store.svelte.ts:searchStore.setMode mcall
call src/lib/features/search/SearchPanel.svelte:46 in toggleFuzzy -> src/lib/features/search/search.store.svelte.ts:searchStore.setFuzzyEnabled mcall
call src/lib/features/search/SearchPanel.svelte:91 in (markup) -> src/lib/features/search/SearchPanel.svelte:setMode markup
call src/lib/features/search/SearchPanel.svelte:159 in (markup) -> src/lib/features/search/SearchPanel.svelte:handleInput markup
call src/lib/features/search/SearchPanel.svelte:160 in (markup) -> src/lib/features/search/SearchPanel.svelte:handleKeydown markup
call src/lib/features/search/SearchPanel.svelte:166 in (markup) -> src/lib/features/search/SearchPanel.svelte:toggleFuzzy markup
## effects
fx src/lib/features/search/SearchPanel.svelte:22 svelte.$effect in (script)
