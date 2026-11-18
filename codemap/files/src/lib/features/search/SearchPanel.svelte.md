# file card src/lib/features/search/SearchPanel.svelte
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/features/search/SearchPanel.svelte ' codemap/files
file src/lib/features/search/SearchPanel.svelte component L356 module src/lib/features/search in1 t1
## imports
imp src/lib/features/search/SearchPanel.svelte:5 -> src/lib/components/ui/button/index.ts Button
imp src/lib/features/search/SearchPanel.svelte:6 -> src/lib/components/ui/scroll-area/index.ts ScrollArea
imp src/lib/features/search/SearchPanel.svelte:7 -> src/lib/core/settings/settings.store.svelte.ts settingsStore
imp src/lib/features/search/SearchPanel.svelte:8 -> src/lib/core/settings/settings-panel.store.svelte.ts settingsPanelStore
imp src/lib/features/search/SearchPanel.svelte:9 -> src/lib/utils/roving-list.ts resolveRovingFocus,tabStopRow
imp src/lib/features/search/SearchPanel.svelte:10 -> src/lib/features/search/search.store.svelte.ts searchStore
imp src/lib/features/search/SearchPanel.svelte:11 -> src/lib/features/search/search.logic.ts isBelowSemanticMinimum,SEMANTIC_MIN_QUERY_CHARS
imp src/lib/features/search/SearchPanel.svelte:12 -> src/lib/features/search/search.service.ts performSearch
imp src/lib/features/search/SearchPanel.svelte:13 -> src/lib/features/search/SearchResult.svelte default
imp src/lib/features/search/SearchPanel.svelte:14 -> src/lib/features/search/search.types.ts type:SearchMode
## imported-by
imp src/lib/app/AppShell.svelte:46 -> src/lib/features/search/SearchPanel.svelte default
## reach
in2 src/lib/features/search/SearchPanel.svelte 1 files in 1 modules: src/routes(1)
out2 src/lib/features/search/SearchPanel.svelte 21 files in 9 modules: src/lib/utils(5) src/lib/components(3) src/lib/contracts(3) src/lib/core/editor(3) src/lib/core/settings(3) +4 modules
## tests
test src/tests/lib/features/search/SearchPanel.test.ts imports src/lib/features/search/SearchPanel.svelte mirror
## symbols
sym src/lib/features/search/SearchPanel.svelte:1 component SearchPanel props:firstPane= L356
by src/lib/features/search/SearchPanel.svelte:default <- src/lib/app/AppShell.svelte:246 in (markup) mount
## locals
local src/lib/features/search/SearchPanel.svelte:37 fn handleInput(e: Event) L4
local src/lib/features/search/SearchPanel.svelte:43 fn hasModifier(e: KeyboardEvent): boolean L3
local src/lib/features/search/SearchPanel.svelte:49 fn handleKeydown(e: KeyboardEvent) L12
local src/lib/features/search/SearchPanel.svelte:65 fn resultButtons(): HTMLElement[] L3
local src/lib/features/search/SearchPanel.svelte:86 fn handleListFocusin(e: FocusEvent) L4
local src/lib/features/search/SearchPanel.svelte:93 fn handleListKeydown(e: KeyboardEvent) L28
local src/lib/features/search/SearchPanel.svelte:150 fn activateMode(m: SearchMode) L8
local src/lib/features/search/SearchPanel.svelte:159 fn toggleFuzzy() L3
## mounts
mount src/lib/features/search/SearchPanel.svelte:271 ScrollArea -> src/lib/components/ui/scroll-area/scroll-area.svelte
mount src/lib/features/search/SearchPanel.svelte:286 Button -> src/lib/components/ui/button/button.svelte
mount src/lib/features/search/SearchPanel.svelte:301 SearchResultItem -> src/lib/features/search/SearchResult.svelte
mount src/lib/features/search/SearchPanel.svelte:305 SearchResultItem -> src/lib/features/search/SearchResult.svelte
mount src/lib/features/search/SearchPanel.svelte:310 SearchResultItem -> src/lib/features/search/SearchResult.svelte
mount src/lib/features/search/SearchPanel.svelte:314 SearchResultItem -> src/lib/features/search/SearchResult.svelte
## mounted-at
mount src/lib/app/AppShell.svelte:246 SearchPanel -> src/lib/features/search/SearchPanel.svelte
## calls
call src/lib/features/search/SearchPanel.svelte:33 in $effect@28 -> src/lib/features/search/search.store.svelte.ts:searchStore.markFocusHandled mcall
call src/lib/features/search/SearchPanel.svelte:39 in handleInput -> src/lib/features/search/search.store.svelte.ts:searchStore.setQuery mcall
call src/lib/features/search/SearchPanel.svelte:51 in handleKeydown -> src/lib/features/search/search.store.svelte.ts:searchStore.setQuery mcall
call src/lib/features/search/SearchPanel.svelte:55 in handleKeydown -> src/lib/features/search/SearchPanel.svelte:hasModifier call
call src/lib/features/search/SearchPanel.svelte:56 in handleKeydown -> src/lib/features/search/SearchPanel.svelte:resultButtons call
call src/lib/features/search/SearchPanel.svelte:84 in tabStopKey=$derived -> src/lib/utils/roving-list.ts:tabStopRow call
call src/lib/features/search/SearchPanel.svelte:87 in handleListFocusin -> src/lib/features/search/SearchPanel.svelte:resultButtons call
call src/lib/features/search/SearchPanel.svelte:94 in handleListKeydown -> src/lib/features/search/SearchPanel.svelte:resultButtons call
call src/lib/features/search/SearchPanel.svelte:97 in handleListKeydown -> src/lib/features/search/SearchPanel.svelte:hasModifier call +1
call src/lib/features/search/SearchPanel.svelte:107 in handleListKeydown -> src/lib/utils/roving-list.ts:resolveRovingFocus call
call src/lib/features/search/SearchPanel.svelte:144 in $effect@137 -> src/lib/features/search/search.store.svelte.ts:searchStore.setMode mcall
call src/lib/features/search/SearchPanel.svelte:156 in activateMode -> src/lib/features/search/search.store.svelte.ts:searchStore.setMode mcall
call src/lib/features/search/SearchPanel.svelte:160 in toggleFuzzy -> src/lib/features/search/search.store.svelte.ts:searchStore.setFuzzyEnabled mcall
call src/lib/features/search/SearchPanel.svelte:188 in isShortQuery=$derived -> src/lib/features/search/search.logic.ts:isBelowSemanticMinimum call
call src/lib/features/search/SearchPanel.svelte:254 in (markup) -> src/lib/features/search/SearchPanel.svelte:activateMode markup
call src/lib/features/search/SearchPanel.svelte:266 in (markup) -> src/lib/core/settings/settings-panel.store.svelte.ts:settingsPanelStore.open markup
call src/lib/features/search/SearchPanel.svelte:286 in (markup) -> src/lib/features/search/search.service.ts:performSearch markup
call src/lib/features/search/SearchPanel.svelte:295 in (markup) -> src/lib/features/search/SearchPanel.svelte:handleListKeydown markup
call src/lib/features/search/SearchPanel.svelte:296 in (markup) -> src/lib/features/search/SearchPanel.svelte:handleListFocusin markup
call src/lib/features/search/SearchPanel.svelte:332 in (markup) -> src/lib/features/search/SearchPanel.svelte:handleInput markup
call src/lib/features/search/SearchPanel.svelte:333 in (markup) -> src/lib/features/search/SearchPanel.svelte:handleKeydown markup
call src/lib/features/search/SearchPanel.svelte:349 in (markup) -> src/lib/features/search/SearchPanel.svelte:toggleFuzzy markup
## effects
fx src/lib/features/search/SearchPanel.svelte:28 svelte.$effect in (script)
fx src/lib/features/search/SearchPanel.svelte:137 svelte.$effect in (script)
fx src/lib/features/search/SearchPanel.svelte:201 svelte.$effect in (script)
fx src/lib/features/search/SearchPanel.svelte:203 timer.setTimeout delay=SLOW_SEARCH_MS in $effect@201
