# file card src/lib/features/tags/TagColorPicker.svelte
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/features/tags/TagColorPicker.svelte ' codemap/files
file src/lib/features/tags/TagColorPicker.svelte component L110 module src/lib/features/tags in1 t0
## imports
imp src/lib/features/tags/TagColorPicker.svelte:3 -> src/lib/components/ui/popover/index.ts *
imp src/lib/features/tags/TagColorPicker.svelte:5 -> src/lib/utils/tag-colors.ts TAG_COLOR_PRESET_ENTRIES
imp src/lib/features/tags/TagColorPicker.svelte:6 -> src/lib/core/settings/theme-editor.logic.ts hexToColorInputValue
## imported-by
imp src/lib/features/tags/TagItem.svelte:8 -> src/lib/features/tags/TagColorPicker.svelte default
## reach
in2 src/lib/features/tags/TagColorPicker.svelte 1 files in 1 modules: src/lib/features/tags(1)
out2 src/lib/features/tags/TagColorPicker.svelte 4 files in 2 modules: src/lib/core/settings(3) src/lib/components(1)
## symbols
sym src/lib/features/tags/TagColorPicker.svelte:1 component TagColorPicker props:currentColor,onSelect,children L110
by src/lib/features/tags/TagColorPicker.svelte:default <- src/lib/features/tags/TagItem.svelte:33 in (markup) mount +1
## locals
local src/lib/features/tags/TagColorPicker.svelte:20 fn handlePresetSelect(color: string | undefined) L4
local src/lib/features/tags/TagColorPicker.svelte:25 fn handleCustomColorInput(e: Event) L4
## mounted-at
mount src/lib/features/tags/TagItem.svelte:33 TagColorPicker -> src/lib/features/tags/TagColorPicker.svelte
mount src/lib/features/tags/TagItem.svelte:57 TagColorPicker -> src/lib/features/tags/TagColorPicker.svelte
## calls
call src/lib/features/tags/TagColorPicker.svelte:41 in (markup) -> src/lib/features/tags/TagColorPicker.svelte:handlePresetSelect markup +1
call src/lib/features/tags/TagColorPicker.svelte:64 in (markup) -> src/lib/core/settings/theme-editor.logic.ts:hexToColorInputValue markup
call src/lib/features/tags/TagColorPicker.svelte:65 in (markup) -> src/lib/features/tags/TagColorPicker.svelte:handleCustomColorInput markup
