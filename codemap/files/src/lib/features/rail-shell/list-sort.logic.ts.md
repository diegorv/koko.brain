# file card src/lib/features/rail-shell/list-sort.logic.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/features/rail-shell/list-sort.logic.ts ' codemap/files
file src/lib/features/rail-shell/list-sort.logic.ts logic L64 module src/lib/features/rail-shell in4 t2
## imports
imp src/lib/features/rail-shell/list-sort.logic.ts:1 -> src/lib/features/rail-shell/list-toolbar.types.ts type:ListSortConfig,type:ListSortDirection,type:ListSortOption
## imported-by
imp src/lib/features/rail-shell/RailNoteList.svelte:85 -> src/lib/features/rail-shell/list-sort.logic.ts formatListSort,parseListSort
imp src/lib/features/rail-shell/RailSortMenu.svelte:7 -> src/lib/features/rail-shell/list-sort.logic.ts BUILT_IN_SORT_OPTIONS,defaultSortDirection,propertySortOption,sortOptionLabel
imp src/lib/features/rail-shell/list-prefs.logic.ts:2 -> src/lib/features/rail-shell/list-sort.logic.ts formatListSort,parseListSort
imp src/lib/features/rail-shell/list-prefs.service.ts:6 -> src/lib/features/rail-shell/list-sort.logic.ts formatListSort
## reach
in2 src/lib/features/rail-shell/list-sort.logic.ts 1 files in 1 modules: src/lib/app(1)
out2 src/lib/features/rail-shell/list-sort.logic.ts 0 files in 0 modules: -
## tests
test src/tests/lib/features/rail-shell/list-sort.logic.test.ts imports src/lib/features/rail-shell/list-sort.logic.ts mirror
test src/tests/lib/features/rail-shell/list-prefs.service.test.ts imports src/lib/features/rail-shell/list-sort.logic.ts
## symbols
sym src/lib/features/rail-shell/list-sort.logic.ts:10 const BUILT_IN_SORT_OPTIONS: readonly { value: ListSortOption; label: string }[] L6 | The built-in orders the Sort dropdown offers, in menu order.
by src/lib/features/rail-shell/list-sort.logic.ts:BUILT_IN_SORT_OPTIONS <- src/lib/features/rail-shell/RailSortMenu.svelte:43 in builtInOptions mcall
sym src/lib/features/rail-shell/list-sort.logic.ts:18 fn defaultSortDirection(option: ListSortOption): ListSortDirection L3 | Times read newest first by default; text and status read A to Z.
by src/lib/features/rail-shell/list-sort.logic.ts:defaultSortDirection <- src/lib/features/rail-shell/RailSortMenu.svelte:57 in pick call
sym src/lib/features/rail-shell/list-sort.logic.ts:26 fn sortOptionLabel(option: ListSortOption): string L6 | The label the Sort dropdown shows for an option.
by src/lib/features/rail-shell/list-sort.logic.ts:sortOptionLabel <- src/lib/features/rail-shell/RailSortMenu.svelte:51 in triggerTitle=$derived call +4
sym src/lib/features/rail-shell/list-sort.logic.ts:34 fn propertySortOption(key: string): ListSortOption L3 | The sort option for a frontmatter key.
by src/lib/features/rail-shell/list-sort.logic.ts:propertySortOption <- src/lib/features/rail-shell/RailSortMenu.svelte:46 in propertyOptions=$derived call
sym src/lib/features/rail-shell/list-sort.logic.ts:39 fn formatListSort(config: ListSortConfig): string L3 | Serializes a sort as `<option>:<direction>`, the form stored in `_list_sort` and settings.
by src/lib/features/rail-shell/list-sort.logic.ts:formatListSort <- src/lib/features/rail-shell/RailNoteList.svelte:423 in sameSort call +1
by src/lib/features/rail-shell/list-sort.logic.ts:formatListSort <- src/lib/features/rail-shell/list-prefs.logic.ts:86 in withListPrefs call
by src/lib/features/rail-shell/list-sort.logic.ts:formatListSort <- src/lib/features/rail-shell/list-prefs.service.ts:68 in saveTypeListSort call
sym src/lib/features/rail-shell/list-sort.logic.ts:47 fn parseListSort(raw: unknown): ListSortConfig | null L18 | Inverse of formatListSort.
by src/lib/features/rail-shell/list-sort.logic.ts:parseListSort <- src/lib/features/rail-shell/RailNoteList.svelte:382 in savedSort=$derived call
by src/lib/features/rail-shell/list-sort.logic.ts:parseListSort <- src/lib/features/rail-shell/list-prefs.logic.ts:30 in parseEntry call
