# file card src/lib/plugins/mods/mod-watch.svelte.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/plugins/mods/mod-watch.svelte.ts ' codemap/files
file src/lib/plugins/mods/mod-watch.svelte.ts other L38 module src/lib/plugins/mods in1 t0
## imports
imp src/lib/plugins/mods/mod-watch.svelte.ts:3 -> src/lib/utils/debug.ts debug
imp src/lib/plugins/mods/mod-watch.svelte.ts:5 -> src/lib/plugins/mods/mods.logic.ts errorText
## imported-by
imp src/lib/plugins/mods/mods-host.service.ts:28 -> src/lib/plugins/mods/mod-watch.svelte.ts watchModValue
## reach
in2 src/lib/plugins/mods/mod-watch.svelte.ts 3 files in 2 modules: src/lib/app(2) src/lib/plugins/mods(1)
out2 src/lib/plugins/mods/mod-watch.svelte.ts 6 files in 4 modules: src/lib/contracts(2) src/lib/core/settings(2) src/lib/plugins/mods(1) src/lib/utils(1)
## symbols
sym src/lib/plugins/mods/mod-watch.svelte.ts:13 fn watchModValue<T>(tag: string, read: () => T, onChange: (value: T) => void): () => void L26 | Watches a tracked read, comparing with its untracked subscription baseline.
by src/lib/plugins/mods/mod-watch.svelte.ts:watchModValue <- src/lib/plugins/mods/mods-host.service.ts:617 in createModContext call
## calls
call src/lib/plugins/mods/mod-watch.svelte.ts:20 in watchModValue -> src/lib/plugins/mods/mods.logic.ts:errorText call
call src/lib/plugins/mods/mod-watch.svelte.ts:20 in watchModValue -> src/lib/utils/debug.ts:debug call
call src/lib/plugins/mods/mod-watch.svelte.ts:28 in $effect@23 -> src/lib/plugins/mods/mods.logic.ts:errorText call
call src/lib/plugins/mods/mod-watch.svelte.ts:28 in $effect@23 -> src/lib/utils/debug.ts:debug call
## effects
fx src/lib/plugins/mods/mod-watch.svelte.ts:22 svelte.$effect in watchModValue
fx src/lib/plugins/mods/mod-watch.svelte.ts:23 svelte.$effect in $effect@22
