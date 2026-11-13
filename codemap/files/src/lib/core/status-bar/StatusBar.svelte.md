# file card src/lib/core/status-bar/StatusBar.svelte
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/core/status-bar/StatusBar.svelte ' codemap/files
file src/lib/core/status-bar/StatusBar.svelte component L34 module src/lib/core/status-bar in1 t0
## imported-by
imp src/lib/app/AppShell.svelte:48 -> src/lib/core/status-bar/StatusBar.svelte default
## reach
in2 src/lib/core/status-bar/StatusBar.svelte 1 files in 1 modules: src/routes(1)
out2 src/lib/core/status-bar/StatusBar.svelte 0 files in 0 modules: -
## symbols
sym src/lib/core/status-bar/StatusBar.svelte:1 component StatusBar props:left,right L34
by src/lib/core/status-bar/StatusBar.svelte:default <- src/lib/app/AppShell.svelte:302 in (markup) mount
## mounted-at
mount src/lib/app/AppShell.svelte:302 StatusBar -> src/lib/core/status-bar/StatusBar.svelte
