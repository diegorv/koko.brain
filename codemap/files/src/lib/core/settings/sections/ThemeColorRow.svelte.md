# file card src/lib/core/settings/sections/ThemeColorRow.svelte
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/core/settings/sections/ThemeColorRow.svelte ' codemap/files
file src/lib/core/settings/sections/ThemeColorRow.svelte component L73 module src/lib/core/settings in1 t0
## imports
imp src/lib/core/settings/sections/ThemeColorRow.svelte:2 -> src/lib/components/ui/input/index.ts Input
imp src/lib/core/settings/sections/ThemeColorRow.svelte:3 -> src/lib/core/settings/theme-editor.logic.ts isValidHex,normalizeHex,hexToColorInputValue
## imported-by
imp src/lib/core/settings/sections/ThemeEditor.svelte:23 -> src/lib/core/settings/sections/ThemeColorRow.svelte default
## reach
in2 src/lib/core/settings/sections/ThemeColorRow.svelte 1 files in 1 modules: src/lib/core/settings(1)
out2 src/lib/core/settings/sections/ThemeColorRow.svelte 4 files in 2 modules: src/lib/core/settings(3) src/lib/components(1)
## symbols
sym src/lib/core/settings/sections/ThemeColorRow.svelte:1 component ThemeColorRow props:label,value,onchange L73
by src/lib/core/settings/sections/ThemeColorRow.svelte:default <- src/lib/core/settings/sections/ThemeEditor.svelte:194 in (markup) mount
## locals
local src/lib/core/settings/sections/ThemeColorRow.svelte:17 fn handleColorPickerInput(e: Event) L5
local src/lib/core/settings/sections/ThemeColorRow.svelte:23 fn handleTextInput(e: Event) L4
local src/lib/core/settings/sections/ThemeColorRow.svelte:28 fn handleTextBlur() L11
local src/lib/core/settings/sections/ThemeColorRow.svelte:40 fn handleTextKeydown(e: KeyboardEvent) L5
## mounts
mount src/lib/core/settings/sections/ThemeColorRow.svelte:63 Input -> src/lib/components/ui/input/input.svelte
## mounted-at
mount src/lib/core/settings/sections/ThemeEditor.svelte:194 ThemeColorRow -> src/lib/core/settings/sections/ThemeColorRow.svelte
## calls
call src/lib/core/settings/sections/ThemeColorRow.svelte:30 in handleTextBlur -> src/lib/core/settings/theme-editor.logic.ts:isValidHex call
call src/lib/core/settings/sections/ThemeColorRow.svelte:31 in handleTextBlur -> src/lib/core/settings/theme-editor.logic.ts:normalizeHex call
call src/lib/core/settings/sections/ThemeColorRow.svelte:58 in (markup) -> src/lib/core/settings/theme-editor.logic.ts:hexToColorInputValue markup
call src/lib/core/settings/sections/ThemeColorRow.svelte:59 in (markup) -> src/lib/core/settings/sections/ThemeColorRow.svelte:handleColorPickerInput markup
call src/lib/core/settings/sections/ThemeColorRow.svelte:67 in (markup) -> src/lib/core/settings/sections/ThemeColorRow.svelte:handleTextInput markup
call src/lib/core/settings/sections/ThemeColorRow.svelte:68 in (markup) -> src/lib/core/settings/sections/ThemeColorRow.svelte:handleTextBlur markup
call src/lib/core/settings/sections/ThemeColorRow.svelte:69 in (markup) -> src/lib/core/settings/sections/ThemeColorRow.svelte:handleTextKeydown markup
## effects
fx src/lib/core/settings/sections/ThemeColorRow.svelte:11 svelte.$effect in (script)
