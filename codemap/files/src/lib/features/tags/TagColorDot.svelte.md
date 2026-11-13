# file card src/lib/features/tags/TagColorDot.svelte
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/features/tags/TagColorDot.svelte ' codemap/files
file src/lib/features/tags/TagColorDot.svelte component L19 module src/lib/features/tags in1 t0
## imported-by
imp src/lib/features/tags/TagItem.svelte:7 -> src/lib/features/tags/TagColorDot.svelte default
## reach
in2 src/lib/features/tags/TagColorDot.svelte 1 files in 1 modules: src/lib/features/tags(1)
out2 src/lib/features/tags/TagColorDot.svelte 0 files in 0 modules: -
## symbols
sym src/lib/features/tags/TagColorDot.svelte:1 component TagColorDot props:color L19
by src/lib/features/tags/TagColorDot.svelte:default <- src/lib/features/tags/TagItem.svelte:37 in (markup) mount +1
## mounted-at
mount src/lib/features/tags/TagItem.svelte:37 TagColorDot -> src/lib/features/tags/TagColorDot.svelte
mount src/lib/features/tags/TagItem.svelte:61 TagColorDot -> src/lib/features/tags/TagColorDot.svelte
