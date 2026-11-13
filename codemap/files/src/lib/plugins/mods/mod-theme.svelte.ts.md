# file card src/lib/plugins/mods/mod-theme.svelte.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/plugins/mods/mod-theme.svelte.ts ' codemap/files
file src/lib/plugins/mods/mod-theme.svelte.ts other L63 module src/lib/plugins/mods in1 t1
## imports
imp src/lib/plugins/mods/mod-theme.svelte.ts:3 -> src/lib/core/settings/applied-theme.store.svelte.ts appliedThemeStore
imp src/lib/plugins/mods/mod-theme.svelte.ts:5 -> src/lib/plugins/mods/contract/mod-api.v1.ts type:ModThemeColorsV1,type:ModThemeStateV1
## imported-by
imp src/lib/plugins/mods/mods-host.service.ts:25 -> src/lib/plugins/mods/mod-theme.svelte.ts readModTheme,watchModTheme
## reach
in2 src/lib/plugins/mods/mod-theme.svelte.ts 3 files in 2 modules: src/lib/app(2) src/lib/plugins/mods(1)
out2 src/lib/plugins/mods/mod-theme.svelte.ts 0 files in 0 modules: -
## tests
test src/tests/lib/plugins/mods/mod-theme.test.ts imports src/lib/plugins/mods/mod-theme.svelte.ts mirror
## symbols
sym src/lib/plugins/mods/mod-theme.svelte.ts:12 const MOD_THEME_TOKENS L22 | The mod color contract: each `ctx.theme` color and the CSS variable it reads.
sym src/lib/plugins/mods/mod-theme.svelte.ts:36 fn readModTheme(): ModThemeStateV1 L7 | Reads the applied theme's mode and its contract colors from the document root, now
by src/lib/plugins/mods/mod-theme.svelte.ts:readModTheme <- src/lib/plugins/mods/mods-host.service.ts:363 in createModContext call +1
sym src/lib/plugins/mods/mod-theme.svelte.ts:50 fn watchModTheme(onChange: () => void): () => void L14 | Calls `onChange` after every theme application (`appliedThemeStore.revision`) and mode switch, not at subscription.
by src/lib/plugins/mods/mod-theme.svelte.ts:watchModTheme <- src/lib/plugins/mods/mods-host.service.ts:369 in createModContext call
## effects
fx src/lib/plugins/mods/mod-theme.svelte.ts:53 svelte.$effect in watchModTheme
fx src/lib/plugins/mods/mod-theme.svelte.ts:54 svelte.$effect in $effect@53
