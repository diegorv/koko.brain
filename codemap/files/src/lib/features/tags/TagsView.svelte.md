# file card src/lib/features/tags/TagsView.svelte
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/features/tags/TagsView.svelte ' codemap/files
file src/lib/features/tags/TagsView.svelte component L120 module src/lib/features/tags in1 t2
## imports
imp src/lib/features/tags/TagsView.svelte:6 -> src/lib/features/tags/tags.store.svelte.ts tagsStore
imp src/lib/features/tags/TagsView.svelte:7 -> src/lib/features/tags/tags.service.ts scheduleTagIndexRebuild,updateTagSort
imp src/lib/features/tags/TagsView.svelte:8 -> src/lib/features/tags/tags.logic.ts countVisibleTags,filterTagTree
imp src/lib/features/tags/TagsView.svelte:9 -> src/lib/components/ui/button/index.ts Button
imp src/lib/features/tags/TagsView.svelte:10 -> src/lib/features/search/open-search.service.ts openSearch
imp src/lib/features/tags/TagsView.svelte:11 -> src/lib/core/settings/settings.store.svelte.ts settingsStore
imp src/lib/features/tags/TagsView.svelte:12 -> src/lib/core/vault/vault.store.svelte.ts vaultStore
imp src/lib/features/tags/TagsView.svelte:13 -> src/lib/utils/tag-colors.ts setTagColor
imp src/lib/features/tags/TagsView.svelte:14 -> src/lib/features/tags/TagItem.svelte default
## imported-by
imp src/lib/app/EditorView.svelte:17 -> src/lib/features/tags/TagsView.svelte default
## reach
in2 src/lib/features/tags/TagsView.svelte 1 files in 1 modules: src/lib/app(1)
out2 src/lib/features/tags/TagsView.svelte 16 files in 9 modules: src/lib/core/settings(3) src/lib/features/tags(3) src/lib/components(2) src/lib/core/editor(2) src/lib/utils(2) +4 modules
## tests
test src/tests/lib/features/tags/TagsView.refresh.test.ts imports src/lib/features/tags/TagsView.svelte mirror
test src/tests/lib/features/tags/TagsView.test.ts imports src/lib/features/tags/TagsView.svelte mirror
## symbols
sym src/lib/features/tags/TagsView.svelte:1 component TagsView L120
by src/lib/features/tags/TagsView.svelte:default <- src/lib/app/EditorView.svelte:75 in (markup) mount
## locals
local src/lib/features/tags/TagsView.svelte:18 fn handleTagClick(tag: string) L3
local src/lib/features/tags/TagsView.svelte:22 fn handleColorChange(tag: string, color: string | undefined) L4
local src/lib/features/tags/TagsView.svelte:27 fn toggleSort() L4
local src/lib/features/tags/TagsView.svelte:32 fn toggleFilter() L3
## mounts
mount src/lib/features/tags/TagsView.svelte:108 Button -> src/lib/components/ui/button/button.svelte
mount src/lib/features/tags/TagsView.svelte:115 TagItem -> src/lib/features/tags/TagItem.svelte
## mounted-at
mount src/lib/app/EditorView.svelte:75 TagsView -> src/lib/features/tags/TagsView.svelte
## calls
call src/lib/features/tags/TagsView.svelte:19 in handleTagClick -> src/lib/features/search/open-search.service.ts:openSearch call
call src/lib/features/tags/TagsView.svelte:23 in handleColorChange -> src/lib/utils/tag-colors.ts:setTagColor call
call src/lib/features/tags/TagsView.svelte:24 in handleColorChange -> src/lib/core/settings/settings.store.svelte.ts:settingsStore.updateTagColors mcall
call src/lib/features/tags/TagsView.svelte:29 in toggleSort -> src/lib/features/tags/tags.service.ts:updateTagSort call
call src/lib/features/tags/TagsView.svelte:33 in toggleFilter -> src/lib/features/tags/tags.store.svelte.ts:tagsStore.setHideRareTags mcall
call src/lib/features/tags/TagsView.svelte:38 in displayedTree=$derived -> src/lib/features/tags/tags.logic.ts:filterTagTree call
call src/lib/features/tags/TagsView.svelte:42 in visibleTagCount=$derived -> src/lib/features/tags/tags.logic.ts:countVisibleTags call
call src/lib/features/tags/TagsView.svelte:61 in $effect@58 -> src/lib/features/tags/tags.service.ts:scheduleTagIndexRebuild call
call src/lib/features/tags/TagsView.svelte:73 in (markup) -> src/lib/features/tags/TagsView.svelte:toggleFilter markup +2
call src/lib/features/tags/TagsView.svelte:89 in (markup) -> src/lib/features/tags/TagsView.svelte:toggleSort markup
call src/lib/features/tags/TagsView.svelte:115 in (markup) -> src/lib/features/tags/TagsView.svelte:handleColorChange markup
call src/lib/features/tags/TagsView.svelte:115 in (markup) -> src/lib/features/tags/TagsView.svelte:handleTagClick markup
## effects
fx src/lib/features/tags/TagsView.svelte:58 svelte.$effect in (script)
