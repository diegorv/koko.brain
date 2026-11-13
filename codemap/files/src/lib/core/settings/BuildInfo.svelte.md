# file card src/lib/core/settings/BuildInfo.svelte
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/core/settings/BuildInfo.svelte ' codemap/files
file src/lib/core/settings/BuildInfo.svelte component L51 module src/lib/core/settings in2 t1
## imports
imp src/lib/core/settings/BuildInfo.svelte:2 -> src/lib/utils/build-info.js channelLabel
## imported-by
imp src/lib/core/settings/sections/UpdateSection.svelte:14 -> src/lib/core/settings/BuildInfo.svelte default
imp src/routes/(app)/+page.svelte:5 -> src/lib/core/settings/BuildInfo.svelte default
## reach
in2 src/lib/core/settings/BuildInfo.svelte 1 files in 1 modules: src/lib/app(1)
out2 src/lib/core/settings/BuildInfo.svelte 0 files in 0 modules: -
## tests
test src/tests/lib/core/settings/BuildInfo.test.ts imports src/lib/core/settings/BuildInfo.svelte mirror
## symbols
sym src/lib/core/settings/BuildInfo.svelte:1 component BuildInfo props:variant= L51
by src/lib/core/settings/BuildInfo.svelte:default <- src/lib/core/settings/sections/UpdateSection.svelte:232 in (markup) mount
by src/lib/core/settings/BuildInfo.svelte:default <- src/routes/(app)/+page.svelte:70 in (markup) mount
## mounted-at
mount src/lib/core/settings/sections/UpdateSection.svelte:232 BuildInfo -> src/lib/core/settings/BuildInfo.svelte
mount src/routes/(app)/+page.svelte:70 BuildInfo -> src/lib/core/settings/BuildInfo.svelte
