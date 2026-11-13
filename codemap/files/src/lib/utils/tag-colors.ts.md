# file card src/lib/utils/tag-colors.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/utils/tag-colors.ts ' codemap/files
file src/lib/utils/tag-colors.ts other L44 module src/lib/utils in4 t1
## imported-by
imp src/lib/features/properties/PropertyField.svelte:13 -> src/lib/utils/tag-colors.ts getTagColor
imp src/lib/features/tags/TagColorPicker.svelte:5 -> src/lib/utils/tag-colors.ts TAG_COLOR_PRESET_ENTRIES
imp src/lib/features/tags/TagItem.svelte:6 -> src/lib/utils/tag-colors.ts getTagColor
imp src/lib/features/tags/TagsView.svelte:12 -> src/lib/utils/tag-colors.ts setTagColor
## reach
in2 src/lib/utils/tag-colors.ts 2 files in 2 modules: src/lib/app(1) src/lib/features/properties(1)
out2 src/lib/utils/tag-colors.ts 0 files in 0 modules: -
## tests
test src/tests/lib/utils/tag-colors.test.ts imports src/lib/utils/tag-colors.ts mirror
## symbols
sym src/lib/utils/tag-colors.ts:2 const TAG_COLOR_PRESETS: Record<string, string> L8 | Preset tag colors (same palette as canvas)
sym src/lib/utils/tag-colors.ts:12 const TAG_COLOR_PRESET_ENTRIES L1 | All preset color entries as [name, hex] tuples for iteration
by src/lib/utils/tag-colors.ts:TAG_COLOR_PRESET_ENTRIES <- src/lib/features/tags/TagColorPicker.svelte:46 in (markup) markup +1
sym src/lib/utils/tag-colors.ts:19 fn getTagColor(tagPath: string, colorMap: Record<string, string>): string | undefined L6 | Looks up the color for a tag from the color map.
by src/lib/utils/tag-colors.ts:getTagColor <- src/lib/features/properties/PropertyField.svelte:171 in (markup) markup
by src/lib/utils/tag-colors.ts:getTagColor <- src/lib/features/tags/TagItem.svelte:23 in getColor call
sym src/lib/utils/tag-colors.ts:31 fn setTagColor(colorMap: Record<string, string>, tagPath: string, color: string | undefined): Record<string, string> L14 | Returns an updated color map with the given tag color set or removed.
by src/lib/utils/tag-colors.ts:setTagColor <- src/lib/features/tags/TagsView.svelte:22 in handleColorChange call
