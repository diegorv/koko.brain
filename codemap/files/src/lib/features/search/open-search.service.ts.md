# file card src/lib/features/search/open-search.service.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/features/search/open-search.service.ts ' codemap/files
file src/lib/features/search/open-search.service.ts service L15 module src/lib/features/search in6 t1
## imports
imp src/lib/features/search/open-search.service.ts:1 -> src/lib/core/settings/settings.store.svelte.ts settingsStore
imp src/lib/features/search/open-search.service.ts:2 -> src/lib/features/rail-shell/lens.logic.ts SEARCH_RAIL_ITEM
imp src/lib/features/search/open-search.service.ts:3 -> src/lib/features/search/search.store.svelte.ts searchStore
## imported-by
imp src/lib/app/commands.ts:16 -> src/lib/features/search/open-search.service.ts openSearch
imp src/lib/app/editor-host.ts:30 -> src/lib/features/search/open-search.service.ts openSearch
imp src/lib/app/global-keybindings.ts:10 -> src/lib/features/search/open-search.service.ts openSearch
imp src/lib/app/rail-navigation.ts:3 -> src/lib/features/search/open-search.service.ts openSearch
imp src/lib/features/deep-link/deep-link.service.ts:7 -> src/lib/features/search/open-search.service.ts openSearch
imp src/lib/features/tags/TagsView.svelte:9 -> src/lib/features/search/open-search.service.ts openSearch
## reach
in2 src/lib/features/search/open-search.service.ts 7 files in 3 modules: src/lib/app(5) src/lib/plugins/quick-capture(1) src/routes(1)
out2 src/lib/features/search/open-search.service.ts 21 files in 8 modules: src/lib/features/collection(5) src/lib/core/settings(4) src/lib/features/type-definitions(4) src/lib/core/filesystem(3) src/lib/utils(2) +3 modules
## tests
test src/tests/lib/features/search/open-search.service.test.ts imports src/lib/features/search/open-search.service.ts mirror
## symbols
sym src/lib/features/search/open-search.service.ts:11 fn openSearch(query?: string): void L5 | Shows Search with `query` (the current query stays when it is left out): picks the Search rail item, shows the panels Cmd+1 may have hidden and focuses the inp…
by src/lib/features/search/open-search.service.ts:openSearch <- src/lib/app/commands.ts:205 in getBuiltInCommands call
by src/lib/features/search/open-search.service.ts:openSearch <- src/lib/app/editor-host.ts:192 in appEditorHost.openTagSearch call
by src/lib/features/search/open-search.service.ts:openSearch <- src/lib/app/global-keybindings.ts:46 in registerSlashSearchKeybinding call +1
by src/lib/features/search/open-search.service.ts:openSearch <- src/lib/app/rail-navigation.ts:16 in selectRailItem call
by src/lib/features/search/open-search.service.ts:openSearch <- src/lib/features/deep-link/deep-link.service.ts:202 in executeAction call
by src/lib/features/search/open-search.service.ts:openSearch <- src/lib/features/tags/TagsView.svelte:18 in handleTagClick call
## calls
call src/lib/features/search/open-search.service.ts:12 in openSearch -> src/lib/features/search/search.store.svelte.ts:searchStore.setQuery mcall
call src/lib/features/search/open-search.service.ts:13 in openSearch -> src/lib/core/settings/settings.store.svelte.ts:settingsStore.updateLayout mcall
call src/lib/features/search/open-search.service.ts:14 in openSearch -> src/lib/features/search/search.store.svelte.ts:searchStore.requestFocus mcall
