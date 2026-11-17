# file card src/lib/features/search/SearchPanel.svelte
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/features/search/SearchPanel.svelte ' codemap/files
file src/lib/features/search/SearchPanel.svelte component L276 module src/lib/features/search in1 t1
## imports
imp src/lib/features/search/SearchPanel.svelte:5 -> src/lib/components/ui/button/index.ts Button
imp src/lib/features/search/SearchPanel.svelte:6 -> src/lib/components/ui/scroll-area/index.ts ScrollArea
imp src/lib/features/search/SearchPanel.svelte:7 -> src/lib/core/settings/settings.store.svelte.ts settingsStore
imp src/lib/features/search/SearchPanel.svelte:8 -> src/lib/core/settings/settings-panel.store.svelte.ts settingsPanelStore
imp src/lib/features/search/SearchPanel.svelte:9 -> src/lib/features/search/search.store.svelte.ts searchStore
imp src/lib/features/search/SearchPanel.svelte:10 -> src/lib/features/search/search.logic.ts isBelowSemanticMinimum,SEMANTIC_MIN_QUERY_CHARS
imp src/lib/features/search/SearchPanel.svelte:11 -> src/lib/features/search/search.service.ts performSearch
imp src/lib/features/search/SearchPanel.svelte:12 -> src/lib/features/search/SearchResult.svelte default
imp src/lib/features/search/SearchPanel.svelte:13 -> src/lib/features/search/search.types.ts type:SearchMode
## imported-by
imp src/lib/app/AppShell.svelte:46 -> src/lib/features/search/SearchPanel.svelte default
## reach
in2 src/lib/features/search/SearchPanel.svelte 1 files in 1 modules: src/routes(1)
out2 src/lib/features/search/SearchPanel.svelte 21 files in 9 modules: src/lib/utils(5) src/lib/components(3) src/lib/contracts(3) src/lib/core/editor(3) src/lib/core/settings(3) +4 modules
## tests
test src/tests/lib/features/search/SearchPanel.test.ts imports src/lib/features/search/SearchPanel.svelte mirror
## symbols
sym src/lib/features/search/SearchPanel.svelte:1 component SearchPanel props:firstPane= L276
by src/lib/features/search/SearchPanel.svelte:default <- src/lib/app/AppShell.svelte:246 in (markup) mount
## locals
local src/lib/features/search/SearchPanel.svelte:36 fn handleInput(e: Event) L4
local src/lib/features/search/SearchPanel.svelte:41 fn handleKeydown(e: KeyboardEvent) L4
local src/lib/features/search/SearchPanel.svelte:74 fn activateMode(m: SearchMode) L8
local src/lib/features/search/SearchPanel.svelte:83 fn toggleFuzzy() L3
## mounts
mount src/lib/features/search/SearchPanel.svelte:195 ScrollArea -> src/lib/components/ui/scroll-area/scroll-area.svelte
mount src/lib/features/search/SearchPanel.svelte:210 Button -> src/lib/components/ui/button/button.svelte
mount src/lib/features/search/SearchPanel.svelte:221 SearchResultItem -> src/lib/features/search/SearchResult.svelte
mount src/lib/features/search/SearchPanel.svelte:225 SearchResultItem -> src/lib/features/search/SearchResult.svelte
mount src/lib/features/search/SearchPanel.svelte:230 SearchResultItem -> src/lib/features/search/SearchResult.svelte
mount src/lib/features/search/SearchPanel.svelte:234 SearchResultItem -> src/lib/features/search/SearchResult.svelte
## mounted-at
mount src/lib/app/AppShell.svelte:246 SearchPanel -> src/lib/features/search/SearchPanel.svelte
## calls
call src/lib/features/search/SearchPanel.svelte:32 in $effect@27 -> src/lib/features/search/search.store.svelte.ts:searchStore.markFocusHandled mcall
call src/lib/features/search/SearchPanel.svelte:38 in handleInput -> src/lib/features/search/search.store.svelte.ts:searchStore.setQuery mcall
call src/lib/features/search/SearchPanel.svelte:68 in $effect@61 -> src/lib/features/search/search.store.svelte.ts:searchStore.setMode mcall
call src/lib/features/search/SearchPanel.svelte:80 in activateMode -> src/lib/features/search/search.store.svelte.ts:searchStore.setMode mcall
call src/lib/features/search/SearchPanel.svelte:84 in toggleFuzzy -> src/lib/features/search/search.store.svelte.ts:searchStore.setFuzzyEnabled mcall
call src/lib/features/search/SearchPanel.svelte:112 in isShortQuery=$derived -> src/lib/features/search/search.logic.ts:isBelowSemanticMinimum call
call src/lib/features/search/SearchPanel.svelte:178 in (markup) -> src/lib/features/search/SearchPanel.svelte:activateMode markup
call src/lib/features/search/SearchPanel.svelte:190 in (markup) -> src/lib/core/settings/settings-panel.store.svelte.ts:settingsPanelStore.open markup
call src/lib/features/search/SearchPanel.svelte:210 in (markup) -> src/lib/features/search/search.service.ts:performSearch markup
call src/lib/features/search/SearchPanel.svelte:252 in (markup) -> src/lib/features/search/SearchPanel.svelte:handleInput markup
call src/lib/features/search/SearchPanel.svelte:253 in (markup) -> src/lib/features/search/SearchPanel.svelte:handleKeydown markup
call src/lib/features/search/SearchPanel.svelte:269 in (markup) -> src/lib/features/search/SearchPanel.svelte:toggleFuzzy markup
## effects
fx src/lib/features/search/SearchPanel.svelte:27 svelte.$effect in (script)
fx src/lib/features/search/SearchPanel.svelte:61 svelte.$effect in (script)
fx src/lib/features/search/SearchPanel.svelte:125 svelte.$effect in (script)
fx src/lib/features/search/SearchPanel.svelte:127 timer.setTimeout delay=SLOW_SEARCH_MS in $effect@125
