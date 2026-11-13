# file card src/lib/features/search/SearchStatus.svelte
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/features/search/SearchStatus.svelte ' codemap/files
file src/lib/features/search/SearchStatus.svelte component L29 module src/lib/features/search in1 t0
## imports
imp src/lib/features/search/SearchStatus.svelte:2 -> src/lib/features/search/search.store.svelte.ts searchStore
imp src/lib/features/search/SearchStatus.svelte:3 -> src/lib/core/settings/settings.store.svelte.ts settingsStore
## imported-by
imp src/lib/app/AppShell.svelte:50 -> src/lib/features/search/SearchStatus.svelte default
## reach
in2 src/lib/features/search/SearchStatus.svelte 1 files in 1 modules: src/routes(1)
out2 src/lib/features/search/SearchStatus.svelte 4 files in 2 modules: src/lib/core/settings(3) src/lib/features/search(1)
## symbols
sym src/lib/features/search/SearchStatus.svelte:1 component SearchStatus L29
by src/lib/features/search/SearchStatus.svelte:default <- src/lib/app/AppShell.svelte:304 in (markup) mount
## mounted-at
mount src/lib/app/AppShell.svelte:304 SearchStatus -> src/lib/features/search/SearchStatus.svelte
