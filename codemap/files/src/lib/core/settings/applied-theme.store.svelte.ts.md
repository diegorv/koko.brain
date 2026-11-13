# file card src/lib/core/settings/applied-theme.store.svelte.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/core/settings/applied-theme.store.svelte.ts ' codemap/files
file src/lib/core/settings/applied-theme.store.svelte.ts store L35 module src/lib/core/settings in6 t7
## imported-by
imp src/lib/app/AppOverlays.svelte:4 -> src/lib/core/settings/applied-theme.store.svelte.ts appliedThemeStore
imp src/lib/core/markdown-editor/MarkdownEditor.svelte:25 -> src/lib/core/settings/applied-theme.store.svelte.ts appliedThemeStore
imp src/lib/core/settings/theme.service.ts:4 -> src/lib/core/settings/applied-theme.store.svelte.ts appliedThemeStore
imp src/lib/features/rail-shell/Rail.svelte:17 -> src/lib/core/settings/applied-theme.store.svelte.ts appliedThemeStore
imp src/lib/plugins/graph-view/GraphView.svelte:21 -> src/lib/core/settings/applied-theme.store.svelte.ts appliedThemeStore
imp src/lib/plugins/mods/mod-theme.svelte.ts:3 -> src/lib/core/settings/applied-theme.store.svelte.ts appliedThemeStore
## reach
in2 src/lib/core/settings/applied-theme.store.svelte.ts 8 files in 4 modules: src/lib/core/settings(3) src/lib/app(2) src/routes(2) src/lib/plugins/mods(1)
out2 src/lib/core/settings/applied-theme.store.svelte.ts 0 files in 0 modules: -
## tests
test src/tests/lib/core/settings/applied-theme.store.test.ts imports src/lib/core/settings/applied-theme.store.svelte.ts mirror
test src/tests/lib/app/AppOverlays.test.ts imports src/lib/core/settings/applied-theme.store.svelte.ts
test src/tests/lib/core/markdown-editor/MarkdownEditor.test.ts imports src/lib/core/settings/applied-theme.store.svelte.ts
test src/tests/lib/core/settings/theme.service.test.ts imports src/lib/core/settings/applied-theme.store.svelte.ts
test src/tests/lib/features/rail-shell/Rail.test.ts imports src/lib/core/settings/applied-theme.store.svelte.ts
test src/tests/lib/plugins/mods/mod-theme.test.ts imports src/lib/core/settings/applied-theme.store.svelte.ts
test src/tests/lib/plugins/mods/mods-host.service.test.ts imports src/lib/core/settings/applied-theme.store.svelte.ts
## symbols
sym src/lib/core/settings/applied-theme.store.svelte.ts:14 store appliedThemeStore L22 | Reactive mode of the applied theme.
by src/lib/core/settings/applied-theme.store.svelte.ts:appliedThemeStore <- src/lib/app/AppOverlays.svelte:16 in (markup) markup
by src/lib/core/settings/applied-theme.store.svelte.ts:appliedThemeStore <- src/lib/core/markdown-editor/MarkdownEditor.svelte:119 in freshState member +2
by src/lib/core/settings/applied-theme.store.svelte.ts:appliedThemeStore <- src/lib/core/settings/theme.service.ts:35 in applyMode mcall +1
by src/lib/core/settings/applied-theme.store.svelte.ts:appliedThemeStore <- src/lib/features/rail-shell/Rail.svelte:181 in actionRow member
by src/lib/core/settings/applied-theme.store.svelte.ts:appliedThemeStore <- src/lib/plugins/graph-view/GraphView.svelte:401 in $effect@400 member
by src/lib/core/settings/applied-theme.store.svelte.ts:appliedThemeStore <- src/lib/plugins/mods/mod-theme.svelte.ts:41 in readModTheme member +4
## store
store src/lib/core/settings/applied-theme.store.svelte.ts:14 appliedThemeStore esc:0
mem src/lib/core/settings/applied-theme.store.svelte.ts:16 get appliedThemeStore.isDark r:8 w-via:setDark,_reset | True when the applied theme is dark (its editor background is dark or unreadable).
more r 8 not shown: src/lib/core/markdown-editor(3) src/lib/plugins/mods(3) src/lib/app(1) src/lib/features/rail-shell(1): q store src/lib/core/settings/applied-theme.store.svelte.ts:appliedThemeStore.isDark
mem src/lib/core/settings/applied-theme.store.svelte.ts:19 get appliedThemeStore.revision r:src/lib/plugins/graph-view/GraphView.svelte:401,src/lib/plugins/mods/mod-theme.svelte.ts:51,src/lib/plugins/mods/mod-theme.svelte.ts:55 w-via:bumpRevision,_reset | Grows by one on every theme application; read it to re-run when the theme's colors change.
mem src/lib/core/settings/applied-theme.store.svelte.ts:22 do appliedThemeStore.setDark w:src/lib/core/settings/theme.service.ts:35 | Records the mode of the theme just applied.
mem src/lib/core/settings/applied-theme.store.svelte.ts:28 do appliedThemeStore.bumpRevision w:src/lib/core/settings/theme.service.ts:36 | Records that a theme was just applied.
mem src/lib/core/settings/applied-theme.store.svelte.ts:31 do appliedThemeStore._reset w:-
