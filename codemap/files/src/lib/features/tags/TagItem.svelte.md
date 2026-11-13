# file card src/lib/features/tags/TagItem.svelte
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/features/tags/TagItem.svelte ' codemap/files
file src/lib/features/tags/TagItem.svelte component L71 module src/lib/features/tags in1 t0
## imports
imp src/lib/features/tags/TagItem.svelte:3 -> src/lib/components/ui/collapsible/index.ts *
imp src/lib/features/tags/TagItem.svelte:4 -> src/lib/features/tags/tags.types.ts type:TagTreeNode
imp src/lib/features/tags/TagItem.svelte:5 -> src/lib/core/settings/settings.store.svelte.ts settingsStore
imp src/lib/features/tags/TagItem.svelte:6 -> src/lib/utils/tag-colors.ts getTagColor
imp src/lib/features/tags/TagItem.svelte:7 -> src/lib/features/tags/TagColorDot.svelte default
imp src/lib/features/tags/TagItem.svelte:8 -> src/lib/features/tags/TagColorPicker.svelte default
## imported-by
imp src/lib/features/tags/TagsView.svelte:13 -> src/lib/features/tags/TagItem.svelte default
## reach
in2 src/lib/features/tags/TagItem.svelte 1 files in 1 modules: src/lib/app(1)
out2 src/lib/features/tags/TagItem.svelte 8 files in 2 modules: src/lib/components(4) src/lib/core/settings(4)
## symbols
sym src/lib/features/tags/TagItem.svelte:1 component TagItem props:node,onTagClick,onColorChange L71
by src/lib/features/tags/TagItem.svelte:default <- src/lib/features/tags/TagsView.svelte:86 in (markup) mount
## locals
local src/lib/features/tags/TagItem.svelte:22 fn getColor() L3
## mounts
mount src/lib/features/tags/TagItem.svelte:33 TagColorPicker -> src/lib/features/tags/TagColorPicker.svelte
mount src/lib/features/tags/TagItem.svelte:37 TagColorDot -> src/lib/features/tags/TagColorDot.svelte
mount src/lib/features/tags/TagItem.svelte:50 Self -> src/lib/features/tags/TagItem.svelte
mount src/lib/features/tags/TagItem.svelte:57 TagColorPicker -> src/lib/features/tags/TagColorPicker.svelte
mount src/lib/features/tags/TagItem.svelte:61 TagColorDot -> src/lib/features/tags/TagColorDot.svelte
## mounted-at
mount src/lib/features/tags/TagItem.svelte:50 Self -> src/lib/features/tags/TagItem.svelte
mount src/lib/features/tags/TagsView.svelte:86 TagItem -> src/lib/features/tags/TagItem.svelte
## calls
call src/lib/features/tags/TagItem.svelte:23 in getColor -> src/lib/utils/tag-colors.ts:getTagColor call
call src/lib/features/tags/TagItem.svelte:34 in (markup) -> src/lib/features/tags/TagItem.svelte:getColor markup +3
