# file card src/lib/features/tags/tags.store.svelte.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/features/tags/tags.store.svelte.ts ' codemap/files
file src/lib/features/tags/tags.store.svelte.ts store L29 module src/lib/features/tags in2 t3
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
test src/tests/lib/features/tags/TagsView.test.ts imports src/lib/features/tags/tags.store.svelte.ts
test src/tests/lib/features/tags/tags.service.test.ts imports src/lib/features/tags/tags.store.svelte.ts
## symbols
sym src/lib/features/tags/tags.store.svelte.ts:9 store tagsStore L21
by src/lib/features/tags/tags.store.svelte.ts:tagsStore <- src/lib/features/tags/TagsView.svelte:27 in toggleSort member +13
by src/lib/features/tags/tags.store.svelte.ts:tagsStore <- src/lib/features/tags/tags.service.ts:27 in buildTagIndex mcall +8
## store
store src/lib/features/tags/tags.store.svelte.ts:9 tagsStore esc:0
mem src/lib/features/tags/tags.store.svelte.ts:10 get tagsStore.tagTree r:src/lib/features/tags/TagsView.svelte:37,src/lib/features/tags/TagsView.svelte:38,src/lib/features/tags/tags.service.ts:65 w-via:setTagTree,reset
mem src/lib/features/tags/tags.store.svelte.ts:11 get tagsStore.sortMode r:src/lib/features/tags/TagsView.svelte:27,src/lib/features/tags/TagsView.svelte:68,src/lib/features/tags/TagsView.svelte:70,src/lib/features/tags/tags.service.ts:41 w-via:setSortMode,reset
mem src/lib/features/tags/tags.store.svelte.ts:12 get tagsStore.hideRareTags r:src/lib/features/tags/TagsView.svelte:32,src/lib/features/tags/TagsView.svelte:36,src/lib/features/tags/TagsView.svelte:61,src/lib/features/tags/TagsView.svelte:63 w-via:setHideRareTags,reset
mem src/lib/features/tags/tags.store.svelte.ts:13 get tagsStore.isLoading r:src/lib/features/tags/TagsView.svelte:52,src/lib/features/tags/TagsView.svelte:79 w-via:setLoading,reset
mem src/lib/features/tags/tags.store.svelte.ts:14 get tagsStore.totalTagCount r:src/lib/features/tags/TagsView.svelte:54 w-via:setTotalTagCount,reset
mem src/lib/features/tags/tags.store.svelte.ts:16 do tagsStore.setTagTree w:src/lib/features/tags/tags.service.ts:44,src/lib/features/tags/tags.service.ts:65
mem src/lib/features/tags/tags.store.svelte.ts:17 do tagsStore.setSortMode w:src/lib/features/tags/tags.service.ts:64
mem src/lib/features/tags/tags.store.svelte.ts:18 do tagsStore.setHideRareTags w:src/lib/features/tags/TagsView.svelte:32
mem src/lib/features/tags/tags.store.svelte.ts:19 do tagsStore.setLoading w:src/lib/features/tags/tags.service.ts:27,src/lib/features/tags/tags.service.ts:55
mem src/lib/features/tags/tags.store.svelte.ts:20 do tagsStore.setTotalTagCount w:src/lib/features/tags/tags.service.ts:45
mem src/lib/features/tags/tags.store.svelte.ts:22 do tagsStore.reset w:src/lib/features/tags/tags.service.ts:165
