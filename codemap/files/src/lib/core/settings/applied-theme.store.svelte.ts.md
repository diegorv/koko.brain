# file card src/lib/core/settings/applied-theme.store.svelte.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/core/settings/applied-theme.store.svelte.ts ' codemap/files
file src/lib/core/settings/applied-theme.store.svelte.ts store L45 module src/lib/core/settings in12 t13
## imported-by
imp src/lib/app/AppOverlays.svelte:4 -> src/lib/core/settings/applied-theme.store.svelte.ts appliedThemeStore
imp src/lib/core/markdown-editor/MarkdownEditor.svelte:25 -> src/lib/core/settings/applied-theme.store.svelte.ts appliedThemeStore
imp src/lib/core/settings/theme.service.ts:4 -> src/lib/core/settings/applied-theme.store.svelte.ts appliedThemeStore
imp src/lib/features/note-list/NoteRow.svelte:9 -> src/lib/core/settings/applied-theme.store.svelte.ts appliedThemeStore
imp src/lib/features/properties/PropertyField.svelte:13 -> src/lib/core/settings/applied-theme.store.svelte.ts appliedThemeStore
imp src/lib/features/quick-switcher/QuickSwitcher.svelte:12 -> src/lib/core/settings/applied-theme.store.svelte.ts appliedThemeStore
imp src/lib/features/rail-shell/FilesNavigator.svelte:27 -> src/lib/core/settings/applied-theme.store.svelte.ts appliedThemeStore
imp src/lib/features/rail-shell/Rail.svelte:20 -> src/lib/core/settings/applied-theme.store.svelte.ts appliedThemeStore
imp src/lib/features/rail-shell/TypesNavigator.svelte:25 -> src/lib/core/settings/applied-theme.store.svelte.ts appliedThemeStore
imp src/lib/features/tags/TagColorDot.svelte:3 -> src/lib/core/settings/applied-theme.store.svelte.ts appliedThemeStore
imp src/lib/plugins/graph-view/GraphView.svelte:22 -> src/lib/core/settings/applied-theme.store.svelte.ts appliedThemeStore
imp src/lib/plugins/mods/mod-theme.svelte.ts:3 -> src/lib/core/settings/applied-theme.store.svelte.ts appliedThemeStore
## reach
in2 src/lib/core/settings/applied-theme.store.svelte.ts 11 files in 7 modules: src/lib/core/settings(3) src/lib/app(2) src/routes(2) src/lib/features/properties(1) src/lib/features/rail-shell(1) +2 modules: q impact src/lib/core/settings/applied-theme.store.svelte.ts --depth 2
out2 src/lib/core/settings/applied-theme.store.svelte.ts 0 files in 0 modules: -
## tests
test src/tests/lib/core/settings/applied-theme.store.test.ts imports src/lib/core/settings/applied-theme.store.svelte.ts mirror
test src/tests/lib/app/AppOverlays.test.ts imports src/lib/core/settings/applied-theme.store.svelte.ts
test src/tests/lib/core/markdown-editor/MarkdownEditor.test.ts imports src/lib/core/settings/applied-theme.store.svelte.ts
test src/tests/lib/core/settings/theme.service.test.ts imports src/lib/core/settings/applied-theme.store.svelte.ts
test src/tests/lib/features/note-list/NoteRow.test.ts imports src/lib/core/settings/applied-theme.store.svelte.ts
test src/tests/lib/features/properties/PropertyField.test.ts imports src/lib/core/settings/applied-theme.store.svelte.ts
test src/tests/lib/features/quick-switcher/QuickSwitcher.test.ts imports src/lib/core/settings/applied-theme.store.svelte.ts
test src/tests/lib/features/rail-shell/FilesNavigator.test.ts imports src/lib/core/settings/applied-theme.store.svelte.ts
test src/tests/lib/features/rail-shell/Rail.test.ts imports src/lib/core/settings/applied-theme.store.svelte.ts
test src/tests/lib/features/rail-shell/TypesNavigator.test.ts imports src/lib/core/settings/applied-theme.store.svelte.ts
test src/tests/lib/features/tags/TagItem.test.ts imports src/lib/core/settings/applied-theme.store.svelte.ts
test src/tests/lib/plugins/mods/mod-theme.test.ts imports src/lib/core/settings/applied-theme.store.svelte.ts
test src/tests/lib/plugins/mods/mods-host.service.test.ts imports src/lib/core/settings/applied-theme.store.svelte.ts
## symbols
sym src/lib/core/settings/applied-theme.store.svelte.ts:17 store appliedThemeStore L29 | Reactive mode of the applied theme.
by src/lib/core/settings/applied-theme.store.svelte.ts:appliedThemeStore <- src/lib/app/AppOverlays.svelte:31 in (markup) markup
by src/lib/core/settings/applied-theme.store.svelte.ts:appliedThemeStore <- src/lib/core/markdown-editor/MarkdownEditor.svelte:119 in freshState member +2
by src/lib/core/settings/applied-theme.store.svelte.ts:appliedThemeStore <- src/lib/core/settings/theme.service.ts:36 in applyMode mcall +2
by src/lib/core/settings/applied-theme.store.svelte.ts:appliedThemeStore <- src/lib/features/note-list/NoteRow.svelte:51 in rowBgs=$derived ref +2
by src/lib/core/settings/applied-theme.store.svelte.ts:appliedThemeStore <- src/lib/features/properties/PropertyField.svelte:174 in (markup) markup +1
by src/lib/core/settings/applied-theme.store.svelte.ts:appliedThemeStore <- src/lib/features/quick-switcher/QuickSwitcher.svelte:34 in rowBgs=$derived ref +2
by src/lib/core/settings/applied-theme.store.svelte.ts:appliedThemeStore <- src/lib/features/rail-shell/FilesNavigator.svelte:347 in rowBgs=$derived ref +2
by src/lib/core/settings/applied-theme.store.svelte.ts:appliedThemeStore <- src/lib/features/rail-shell/Rail.svelte:169 in railBg=$derived ref +2
more by 4 not shown: src/lib/features/rail-shell(1) src/lib/features/tags(1) src/lib/plugins/graph-view(1) src/lib/plugins/mods(1): q importers src/lib/core/settings/applied-theme.store.svelte.ts:appliedThemeStore
## store
store src/lib/core/settings/applied-theme.store.svelte.ts:17 appliedThemeStore esc:7
mem src/lib/core/settings/applied-theme.store.svelte.ts:19 get appliedThemeStore.isDark r:8 w-via:setDark,_reset | True when the applied theme is dark (its editor background is dark or unreadable).
more r 8 not shown: src/lib/core/markdown-editor(3) src/lib/plugins/mods(3) src/lib/app(1) src/lib/features/rail-shell(1): q store src/lib/core/settings/applied-theme.store.svelte.ts:appliedThemeStore.isDark
mem src/lib/core/settings/applied-theme.store.svelte.ts:22 get appliedThemeStore.vars r:- w-via:setVars,_reset | The applied theme's CSS variables, for code that measures its colors (`theme-surfaces.logic.ts`).
mem src/lib/core/settings/applied-theme.store.svelte.ts:25 get appliedThemeStore.revision r:src/lib/plugins/graph-view/GraphView.svelte:475,src/lib/plugins/mods/mod-theme.svelte.ts:51,src/lib/plugins/mods/mod-theme.svelte.ts:55 w-via:bumpRevision,_reset | Grows by one on every theme application; read it to re-run when the theme's colors change.
mem src/lib/core/settings/applied-theme.store.svelte.ts:28 do appliedThemeStore.setDark w:src/lib/core/settings/theme.service.ts:36 | Records the mode of the theme just applied.
mem src/lib/core/settings/applied-theme.store.svelte.ts:31 do appliedThemeStore.setVars w:src/lib/core/settings/theme.service.ts:37 | Records the CSS variables of the theme just applied.
mem src/lib/core/settings/applied-theme.store.svelte.ts:37 do appliedThemeStore.bumpRevision w:src/lib/core/settings/theme.service.ts:38 | Records that a theme was just applied.
mem src/lib/core/settings/applied-theme.store.svelte.ts:40 do appliedThemeStore._reset w:-
