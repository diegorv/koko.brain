# file card src/lib/features/tags/tags.store.svelte.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/features/tags/tags.store.svelte.ts ' codemap/files
file src/lib/features/tags/tags.store.svelte.ts store L35 module src/lib/features/tags in2 t4
## imports
imp src/lib/features/tags/tags.store.svelte.ts:1 -> src/lib/features/tags/tags.types.ts type:TagTreeNode,type:TagSortMode
## imported-by
imp src/lib/features/tags/TagsView.svelte:6 -> src/lib/features/tags/tags.store.svelte.ts tagsStore
imp src/lib/features/tags/tags.service.ts:6 -> src/lib/features/tags/tags.store.svelte.ts tagsStore
## reach
in2 src/lib/features/tags/tags.store.svelte.ts 3 files in 1 modules: src/lib/app(3)
out2 src/lib/features/tags/tags.store.svelte.ts 0 files in 0 modules: -
## tests
test src/tests/lib/features/tags/tags.store.test.ts imports src/lib/features/tags/tags.store.svelte.ts mirror
test src/tests/lib/features/tags/TagsView.refresh.test.ts imports src/lib/features/tags/tags.store.svelte.ts
test src/tests/lib/features/tags/TagsView.test.ts imports src/lib/features/tags/tags.store.svelte.ts
test src/tests/lib/features/tags/tags.service.test.ts imports src/lib/features/tags/tags.store.svelte.ts
## symbols
sym src/lib/features/tags/tags.store.svelte.ts:11 store tagsStore L25
by src/lib/features/tags/tags.store.svelte.ts:tagsStore <- src/lib/features/tags/TagsView.svelte:29 in toggleSort member +22
by src/lib/features/tags/tags.store.svelte.ts:tagsStore <- src/lib/features/tags/tags.service.ts:27 in buildTagIndex mcall +9
## store
store src/lib/features/tags/tags.store.svelte.ts:11 tagsStore esc:0
mem src/lib/features/tags/tags.store.svelte.ts:12 get tagsStore.tagTree r:src/lib/features/tags/TagsView.svelte:42,src/lib/features/tags/TagsView.svelte:44,src/lib/features/tags/TagsView.svelte:50,src/lib/features/tags/TagsView.svelte:51,src/lib/features/tags/TagsView.svelte:63,src/lib/features/tags/tags.service.ts:66 w-via:setTagTree,reset
mem src/lib/features/tags/tags.store.svelte.ts:13 get tagsStore.sortMode r:src/lib/features/tags/TagsView.svelte:29,src/lib/features/tags/TagsView.svelte:113,src/lib/features/tags/TagsView.svelte:115,src/lib/features/tags/tags.service.ts:41 w-via:setSortMode,reset
mem src/lib/features/tags/tags.store.svelte.ts:14 get tagsStore.hideRareTags r:src/lib/features/tags/TagsView.svelte:34,src/lib/features/tags/TagsView.svelte:49,src/lib/features/tags/TagsView.svelte:59,src/lib/features/tags/TagsView.svelte:63,src/lib/features/tags/TagsView.svelte:106,src/lib/features/tags/TagsView.svelte:108 w-via:setHideRareTags,reset
mem src/lib/features/tags/tags.store.svelte.ts:15 get tagsStore.isLoading r:src/lib/features/tags/TagsView.svelte:68 w-via:setLoading,reset
mem src/lib/features/tags/tags.store.svelte.ts:17 get tagsStore.hasLoaded r:src/lib/features/tags/TagsView.svelte:68 w-via:setHasLoaded,reset | Whether a tag tree has been built, so a refresh can keep the current list on screen.
mem src/lib/features/tags/tags.store.svelte.ts:18 get tagsStore.totalTagCount r:src/lib/features/tags/TagsView.svelte:59,src/lib/features/tags/TagsView.svelte:86,src/lib/features/tags/TagsView.svelte:89,src/lib/features/tags/TagsView.svelte:129 w-via:setTotalTagCount,reset
mem src/lib/features/tags/tags.store.svelte.ts:20 do tagsStore.setTagTree w:src/lib/features/tags/tags.service.ts:44,src/lib/features/tags/tags.service.ts:66
mem src/lib/features/tags/tags.store.svelte.ts:21 do tagsStore.setSortMode w:src/lib/features/tags/tags.service.ts:65
mem src/lib/features/tags/tags.store.svelte.ts:22 do tagsStore.setHideRareTags w:src/lib/features/tags/TagsView.svelte:34
mem src/lib/features/tags/tags.store.svelte.ts:23 do tagsStore.setLoading w:src/lib/features/tags/tags.service.ts:27,src/lib/features/tags/tags.service.ts:56
mem src/lib/features/tags/tags.store.svelte.ts:24 do tagsStore.setHasLoaded w:src/lib/features/tags/tags.service.ts:46
mem src/lib/features/tags/tags.store.svelte.ts:25 do tagsStore.setTotalTagCount w:src/lib/features/tags/tags.service.ts:45
mem src/lib/features/tags/tags.store.svelte.ts:27 do tagsStore.reset w:src/lib/features/tags/tags.service.ts:166
