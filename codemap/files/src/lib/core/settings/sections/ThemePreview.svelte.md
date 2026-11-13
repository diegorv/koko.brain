# file card src/lib/core/settings/sections/ThemePreview.svelte
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/core/settings/sections/ThemePreview.svelte ' codemap/files
file src/lib/core/settings/sections/ThemePreview.svelte component L53 module src/lib/core/settings in1 t1
## imports
imp src/lib/core/settings/sections/ThemePreview.svelte:2 -> src/lib/utils/color.ts isDarkColor
imp src/lib/core/settings/sections/ThemePreview.svelte:3 -> src/lib/core/settings/theme.types.ts type:ThemeColors
## imported-by
imp src/lib/core/settings/sections/AppearanceSection.svelte:24 -> src/lib/core/settings/sections/ThemePreview.svelte default
## reach
in2 src/lib/core/settings/sections/ThemePreview.svelte 1 files in 1 modules: src/lib/app(1)
out2 src/lib/core/settings/sections/ThemePreview.svelte 1 files in 1 modules: src/lib/core/settings(1)
## tests
test src/tests/lib/core/settings/ThemePreview.test.ts imports src/lib/core/settings/sections/ThemePreview.svelte
## symbols
sym src/lib/core/settings/sections/ThemePreview.svelte:1 component ThemePreview props:colors L53
by src/lib/core/settings/sections/ThemePreview.svelte:default <- src/lib/core/settings/sections/AppearanceSection.svelte:179 in (markup) mount +1
## mounted-at
mount src/lib/core/settings/sections/AppearanceSection.svelte:179 ThemePreview -> src/lib/core/settings/sections/ThemePreview.svelte
mount src/lib/core/settings/sections/AppearanceSection.svelte:276 ThemePreview -> src/lib/core/settings/sections/ThemePreview.svelte
## calls
call src/lib/core/settings/sections/ThemePreview.svelte:15 in dark=$derived -> src/lib/utils/color.ts:isDarkColor call
