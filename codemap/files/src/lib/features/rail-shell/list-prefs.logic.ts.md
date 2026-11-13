# file card src/lib/features/rail-shell/list-prefs.logic.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/features/rail-shell/list-prefs.logic.ts ' codemap/files
file src/lib/features/rail-shell/list-prefs.logic.ts logic L107 module src/lib/features/rail-shell in1 t1
## imports
imp src/lib/features/rail-shell/list-prefs.logic.ts:1 -> src/lib/features/rail-shell/rail-shell.types.ts type:Lens
imp src/lib/features/rail-shell/list-prefs.logic.ts:2 -> src/lib/features/rail-shell/list-sort.logic.ts formatListSort,parseListSort
imp src/lib/features/rail-shell/list-prefs.logic.ts:3 -> src/lib/features/rail-shell/list-toolbar.types.ts type:ListPrefs,type:ListSortConfig
## imported-by
imp src/lib/features/rail-shell/RailNoteList.svelte:80 -> src/lib/features/rail-shell/list-prefs.logic.ts defaultLensSort,listPrefsKey,parseRailListPrefs,withListPrefs
## reach
in2 src/lib/features/rail-shell/list-prefs.logic.ts 1 files in 1 modules: src/lib/app(1)
out2 src/lib/features/rail-shell/list-prefs.logic.ts 5 files in 5 modules: src/lib/core/filesystem(1) src/lib/features/note-list(1) src/lib/features/type-definitions(1) src/lib/types(1) src/lib/utils(1)
## tests
test src/tests/lib/features/rail-shell/list-prefs.logic.test.ts imports src/lib/features/rail-shell/list-prefs.logic.ts mirror
## symbols
sym src/lib/features/rail-shell/list-prefs.logic.ts:9 interface StoredListPrefs L6 | One stored entry of `layout.railListPrefs`, as `settings.json` keeps it: the sort is its `<option>:<direction>` string.
sym src/lib/features/rail-shell/list-prefs.logic.ts:46 fn parseRailListPrefs(raw: unknown): Record<string, ListPrefs> L10 | The saved list preferences of a `layout.railListPrefs` value.
by src/lib/features/rail-shell/list-prefs.logic.ts:parseRailListPrefs <- src/lib/features/rail-shell/RailNoteList.svelte:378 in settingsPrefs=$derived call
sym src/lib/features/rail-shell/list-prefs.logic.ts:63 fn withListPrefs(raw: unknown, key: string, patch: { sort?: ListSortConfig | null; properties?: string[] | null }): Record<string, Stor… L29 | The next `layout.railListPrefs` record after changing one list's preferences.
by src/lib/features/rail-shell/list-prefs.logic.ts:withListPrefs <- src/lib/features/rail-shell/RailNoteList.svelte:462 in saveListSort call +1
sym src/lib/features/rail-shell/list-prefs.logic.ts:94 fn defaultLensSort(kind: string): ListSortConfig | null L3 | The order a list uses when no sort is saved for it, or null when it keeps the lens's native order.
by src/lib/features/rail-shell/list-prefs.logic.ts:defaultLensSort <- src/lib/features/rail-shell/RailNoteList.svelte:561 in sortMenuConfig=$derived call
sym src/lib/features/rail-shell/list-prefs.logic.ts:103 fn listPrefsKey(lens: Lens): string L5 | The `layout.railListPrefs` key a lens reads its preferences from: one shared key for every folder, `type:<name>` for a type, and the kind for the rest.
by src/lib/features/rail-shell/list-prefs.logic.ts:listPrefsKey <- src/lib/features/rail-shell/RailNoteList.svelte:378 in settingsPrefs=$derived call +2
## locals
local src/lib/features/rail-shell/list-prefs.logic.ts:22 fn isPlainObject(value: unknown): value is Record<string, unknown> L3
local src/lib/features/rail-shell/list-prefs.logic.ts:26 fn parseEntry(raw: unknown): ListPrefs | null L13
## calls
call src/lib/features/rail-shell/list-prefs.logic.ts:27 in parseEntry -> src/lib/features/rail-shell/list-prefs.logic.ts:isPlainObject call
call src/lib/features/rail-shell/list-prefs.logic.ts:30 in parseEntry -> src/lib/features/rail-shell/list-sort.logic.ts:parseListSort call
call src/lib/features/rail-shell/list-prefs.logic.ts:48 in parseRailListPrefs -> src/lib/features/rail-shell/list-prefs.logic.ts:isPlainObject call
call src/lib/features/rail-shell/list-prefs.logic.ts:51 in parseRailListPrefs -> src/lib/features/rail-shell/list-prefs.logic.ts:parseEntry call
call src/lib/features/rail-shell/list-prefs.logic.ts:68 in withListPrefs -> src/lib/features/rail-shell/list-prefs.logic.ts:parseRailListPrefs call
call src/lib/features/rail-shell/list-prefs.logic.ts:86 in withListPrefs -> src/lib/features/rail-shell/list-sort.logic.ts:formatListSort call
