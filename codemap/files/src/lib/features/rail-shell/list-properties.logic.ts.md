# file card src/lib/features/rail-shell/list-properties.logic.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/features/rail-shell/list-properties.logic.ts ' codemap/files
file src/lib/features/rail-shell/list-properties.logic.ts logic L116 module src/lib/features/rail-shell in2 t1
## imports
imp src/lib/features/rail-shell/list-properties.logic.ts:1 -> src/lib/core/filesystem/fs.logic.ts naturalCompare
imp src/lib/features/rail-shell/list-properties.logic.ts:2 -> src/lib/features/rail-shell/rail-shell.types.ts type:LensNote
## imported-by
imp src/lib/features/rail-shell/RailNoteList.svelte:82 -> src/lib/features/rail-shell/list-properties.logic.ts availableListProperties
imp src/lib/features/rail-shell/RailPropertiesPicker.svelte:7 -> src/lib/features/rail-shell/list-properties.logic.ts filterPropertyItems,moveListProperty,orderedPropertyItems,toggleListProperty
## reach
in2 src/lib/features/rail-shell/list-properties.logic.ts 1 files in 1 modules: src/lib/app(1)
out2 src/lib/features/rail-shell/list-properties.logic.ts 6 files in 5 modules: src/lib/utils(2) src/lib/core/filesystem(1) src/lib/features/note-list(1) src/lib/features/type-definitions(1) src/lib/types(1)
## tests
test src/tests/lib/features/rail-shell/list-properties.logic.test.ts imports src/lib/features/rail-shell/list-properties.logic.ts mirror
## symbols
sym src/lib/features/rail-shell/list-properties.logic.ts:11 interface ListPropertyItem L8 | One row of the "Show in note list" picker.
sym src/lib/features/rail-shell/list-properties.logic.ts:29 fn availableListProperties(notes: readonly LensNote[], selected: readonly string[]): string[] L10 | The keys the picker offers: every visible key any listed note carries, the relation keys present in those notes, and every selected key (a key may be selected …
by src/lib/features/rail-shell/list-properties.logic.ts:availableListProperties <- src/lib/features/rail-shell/RailNoteList.svelte:565 in sortProperties=$derived call +1
sym src/lib/features/rail-shell/list-properties.logic.ts:46 fn propertyDisplayLabel(key: string): string L3 | The name a property shows under in the picker and in the note list.
sym src/lib/features/rail-shell/list-properties.logic.ts:59 fn orderedPropertyItems(selected: readonly string[], available: readonly string[]): ListPropertyItem[] L16 | Lists the selected keys first, in their saved order, then the other available keys.
by src/lib/features/rail-shell/list-properties.logic.ts:orderedPropertyItems <- src/lib/features/rail-shell/RailPropertiesPicker.svelte:39 in items=$derived call
sym src/lib/features/rail-shell/list-properties.logic.ts:83 fn filterPropertyItems(items: readonly ListPropertyItem[], query: string): ListPropertyItem[] L5 | Keeps the items whose display label contains the query, ignoring case.
by src/lib/features/rail-shell/list-properties.logic.ts:filterPropertyItems <- src/lib/features/rail-shell/RailPropertiesPicker.svelte:39 in items=$derived call
sym src/lib/features/rail-shell/list-properties.logic.ts:96 fn toggleListProperty(current: readonly string[], key: string): string[] L3 | Adds the key to the list when absent, removes it when present.
by src/lib/features/rail-shell/list-properties.logic.ts:toggleListProperty <- src/lib/features/rail-shell/RailPropertiesPicker.svelte:58 in handleToggle call
sym src/lib/features/rail-shell/list-properties.logic.ts:108 fn moveListProperty(current: string[], fromKey: string, toKey: string): string[] L9 | Moves `fromKey` to the index `toKey` holds, the way a drag onto a row does.
by src/lib/features/rail-shell/list-properties.logic.ts:moveListProperty <- src/lib/features/rail-shell/RailPropertiesPicker.svelte:53 in moveBy call +1
## calls
call src/lib/features/rail-shell/list-properties.logic.ts:37 in availableListProperties -> src/lib/core/filesystem/fs.logic.ts:naturalCompare ref
call src/lib/features/rail-shell/list-properties.logic.ts:66 in orderedPropertyItems -> src/lib/features/rail-shell/list-properties.logic.ts:propertyDisplayLabel call +1
