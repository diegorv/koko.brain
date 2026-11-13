# file card src/lib/features/tags/TagsView.svelte
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/features/tags/TagsView.svelte ' codemap/files
file src/lib/features/tags/TagsView.svelte component L91 module src/lib/features/tags in1 t1
## imports
imp src/lib/features/tags/TagsView.svelte:6 -> src/lib/features/tags/tags.store.svelte.ts tagsStore
imp src/lib/features/tags/TagsView.svelte:7 -> src/lib/features/tags/tags.service.ts scheduleTagIndexRebuild,updateTagSort
imp src/lib/features/tags/TagsView.svelte:8 -> src/lib/features/tags/tags.logic.ts filterTagTree
imp src/lib/features/tags/TagsView.svelte:9 -> src/lib/features/search/open-search.service.ts openSearch
imp src/lib/features/tags/TagsView.svelte:10 -> src/lib/core/settings/settings.store.svelte.ts settingsStore
imp src/lib/features/tags/TagsView.svelte:11 -> src/lib/core/vault/vault.store.svelte.ts vaultStore
imp src/lib/features/tags/TagsView.svelte:12 -> src/lib/utils/tag-colors.ts setTagColor
imp src/lib/features/tags/TagsView.svelte:13 -> src/lib/features/tags/TagItem.svelte default
## imported-by
imp src/lib/app/EditorView.svelte:17 -> src/lib/features/tags/TagsView.svelte default
## reach
in2 src/lib/features/tags/TagsView.svelte 1 files in 1 modules: src/lib/app(1)
out2 src/lib/features/tags/TagsView.svelte 15 files in 9 modules: src/lib/core/settings(3) src/lib/features/tags(3) src/lib/core/editor(2) src/lib/utils(2) src/lib/components(1) +4 modules
## tests
test src/tests/lib/features/tags/TagsView.test.ts imports src/lib/features/tags/TagsView.svelte mirror
## symbols
sym src/lib/features/tags/TagsView.svelte:1 component TagsView L91
by src/lib/features/tags/TagsView.svelte:default <- src/lib/app/EditorView.svelte:75 in (markup) mount
## locals
local src/lib/features/tags/TagsView.svelte:17 fn handleTagClick(tag: string) L3
local src/lib/features/tags/TagsView.svelte:21 fn handleColorChange(tag: string, color: string | undefined) L4
local src/lib/features/tags/TagsView.svelte:26 fn toggleSort() L4
local src/lib/features/tags/TagsView.svelte:31 fn toggleFilter() L3
## mounts
mount src/lib/features/tags/TagsView.svelte:86 TagItem -> src/lib/features/tags/TagItem.svelte
## mounted-at
mount src/lib/app/EditorView.svelte:75 TagsView -> src/lib/features/tags/TagsView.svelte
## calls
call src/lib/features/tags/TagsView.svelte:18 in handleTagClick -> src/lib/features/search/open-search.service.ts:openSearch call
call src/lib/features/tags/TagsView.svelte:22 in handleColorChange -> src/lib/utils/tag-colors.ts:setTagColor call
call src/lib/features/tags/TagsView.svelte:23 in handleColorChange -> src/lib/core/settings/settings.store.svelte.ts:settingsStore.updateTagColors mcall
call src/lib/features/tags/TagsView.svelte:28 in toggleSort -> src/lib/features/tags/tags.service.ts:updateTagSort call
call src/lib/features/tags/TagsView.svelte:32 in toggleFilter -> src/lib/features/tags/tags.store.svelte.ts:tagsStore.setHideRareTags mcall
call src/lib/features/tags/TagsView.svelte:37 in displayedTree=$derived -> src/lib/features/tags/tags.logic.ts:filterTagTree call
call src/lib/features/tags/TagsView.svelte:44 in $effect@41 -> src/lib/features/tags/tags.service.ts:scheduleTagIndexRebuild call
call src/lib/features/tags/TagsView.svelte:60 in (markup) -> src/lib/features/tags/TagsView.svelte:toggleFilter markup
call src/lib/features/tags/TagsView.svelte:67 in (markup) -> src/lib/features/tags/TagsView.svelte:toggleSort markup
call src/lib/features/tags/TagsView.svelte:86 in (markup) -> src/lib/features/tags/TagsView.svelte:handleColorChange markup
call src/lib/features/tags/TagsView.svelte:86 in (markup) -> src/lib/features/tags/TagsView.svelte:handleTagClick markup
## effects
fx src/lib/features/tags/TagsView.svelte:41 svelte.$effect in (script)
