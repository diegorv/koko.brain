# file card src/lib/features/rail-shell/list-toolbar.types.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/features/rail-shell/list-toolbar.types.ts ' codemap/files
file src/lib/features/rail-shell/list-toolbar.types.ts types L21 module src/lib/features/rail-shell in7 t0
## imported-by
imp src/lib/features/rail-shell/RailNoteList.svelte:86 -> src/lib/features/rail-shell/list-toolbar.types.ts type:ListSortConfig
imp src/lib/features/rail-shell/RailSortMenu.svelte:13 -> src/lib/features/rail-shell/list-toolbar.types.ts type:ListSortConfig,type:ListSortDirection,type:ListSortOption
imp src/lib/features/rail-shell/list-prefs.logic.ts:3 -> src/lib/features/rail-shell/list-toolbar.types.ts type:ListPrefs,type:ListSortConfig
imp src/lib/features/rail-shell/list-prefs.service.ts:5 -> src/lib/features/rail-shell/list-toolbar.types.ts type:ListSortConfig
imp src/lib/features/rail-shell/list-sort-compare.logic.ts:2 -> src/lib/features/rail-shell/list-toolbar.types.ts type:ListSortConfig,type:ListSortOption
imp src/lib/features/rail-shell/list-sort.logic.ts:1 -> src/lib/features/rail-shell/list-toolbar.types.ts type:ListSortConfig,type:ListSortDirection,type:ListSortOption
imp src/lib/features/rail-shell/list-view-sort.logic.ts:2 -> src/lib/features/rail-shell/list-toolbar.types.ts type:ListSortConfig,type:ListSortOption
## reach
in2 src/lib/features/rail-shell/list-toolbar.types.ts 1 files in 1 modules: src/lib/app(1)
out2 src/lib/features/rail-shell/list-toolbar.types.ts 0 files in 0 modules: -
## tests
test src/tests/lib/features/rail-shell/RailSortMenu.test.ts imports-type src/lib/features/rail-shell/list-toolbar.types.ts
test src/tests/lib/features/rail-shell/list-sort-compare.logic.test.ts imports-type src/lib/features/rail-shell/list-toolbar.types.ts
test src/tests/lib/features/rail-shell/list-view-sort.logic.test.ts imports-type src/lib/features/rail-shell/list-toolbar.types.ts
## symbols
sym src/lib/features/rail-shell/list-toolbar.types.ts:2 type ListSortOption L1 | What a note list can order by: a built-in field or a frontmatter key (`property:<key>`).
by src/lib/features/rail-shell/list-toolbar.types.ts:ListSortOption <- src/lib/features/rail-shell/RailSortMenu.svelte:13 in (script) import
by src/lib/features/rail-shell/list-toolbar.types.ts:ListSortOption <- src/lib/features/rail-shell/list-sort-compare.logic.ts:2 in (module) import
by src/lib/features/rail-shell/list-toolbar.types.ts:ListSortOption <- src/lib/features/rail-shell/list-sort.logic.ts:4 in (module) import
by src/lib/features/rail-shell/list-toolbar.types.ts:ListSortOption <- src/lib/features/rail-shell/list-view-sort.logic.ts:2 in (module) import
sym src/lib/features/rail-shell/list-toolbar.types.ts:5 type ListSortDirection L1 | The direction of a note list's order.
by src/lib/features/rail-shell/list-toolbar.types.ts:ListSortDirection <- src/lib/features/rail-shell/RailSortMenu.svelte:13 in (script) import
by src/lib/features/rail-shell/list-toolbar.types.ts:ListSortDirection <- src/lib/features/rail-shell/list-sort.logic.ts:3 in (module) import
sym src/lib/features/rail-shell/list-toolbar.types.ts:8 interface ListSortConfig L6 | One note list order, as the Sort dropdown shows and saves it.
by src/lib/features/rail-shell/list-toolbar.types.ts:ListSortConfig <- src/lib/features/rail-shell/RailNoteList.svelte:86 in (script) import
by src/lib/features/rail-shell/list-toolbar.types.ts:ListSortConfig <- src/lib/features/rail-shell/RailSortMenu.svelte:13 in (script) import
by src/lib/features/rail-shell/list-toolbar.types.ts:ListSortConfig <- src/lib/features/rail-shell/list-prefs.logic.ts:3 in (module) import
by src/lib/features/rail-shell/list-toolbar.types.ts:ListSortConfig <- src/lib/features/rail-shell/list-prefs.service.ts:5 in (module) import
by src/lib/features/rail-shell/list-toolbar.types.ts:ListSortConfig <- src/lib/features/rail-shell/list-sort-compare.logic.ts:2 in (module) import
by src/lib/features/rail-shell/list-toolbar.types.ts:ListSortConfig <- src/lib/features/rail-shell/list-sort.logic.ts:2 in (module) import
by src/lib/features/rail-shell/list-toolbar.types.ts:ListSortConfig <- src/lib/features/rail-shell/list-view-sort.logic.ts:2 in (module) import
sym src/lib/features/rail-shell/list-toolbar.types.ts:16 interface ListPrefs L6 | A list's saved toolbar choices.
by src/lib/features/rail-shell/list-toolbar.types.ts:ListPrefs <- src/lib/features/rail-shell/list-prefs.logic.ts:3 in (module) import
