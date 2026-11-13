# file card src/lib/core/trash/trash.types.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/core/trash/trash.types.ts ' codemap/files
file src/lib/core/trash/trash.types.ts types L13 module src/lib/core/trash in5 t0
## imported-by
imp src/lib/core/settings/sections/TrashSection.svelte:9 -> src/lib/core/trash/trash.types.ts type:TrashItem
imp src/lib/core/trash/trash.logic.ts:1 -> src/lib/core/trash/trash.types.ts type:TrashItem
imp src/lib/core/trash/trash.service.ts:2 -> src/lib/core/trash/trash.types.ts type:TrashItem
imp src/lib/core/trash/trash.store.svelte.ts:1 -> src/lib/core/trash/trash.types.ts type:TrashItem
imp src/lib/features/event-calendar/event-calendar.service.ts:26 -> src/lib/core/trash/trash.types.ts type:TrashItem
## reach
in2 src/lib/core/trash/trash.types.ts 15 files in 5 modules: src/lib/features/event-calendar(7) src/lib/app(5) src/lib/core/filesystem(1) src/lib/features/rail-shell(1) src/lib/plugins/calendar(1)
out2 src/lib/core/trash/trash.types.ts 0 files in 0 modules: -
## tests
test src/tests/lib/core/settings/TrashSection.test.ts imports-type src/lib/core/trash/trash.types.ts
test src/tests/lib/core/trash/trash.logic.test.ts imports-type src/lib/core/trash/trash.types.ts
test src/tests/lib/core/trash/trash.restore-tree.test.ts imports-type src/lib/core/trash/trash.types.ts
test src/tests/lib/core/trash/trash.service.test.ts imports-type src/lib/core/trash/trash.types.ts
test src/tests/lib/core/trash/trash.store.test.ts imports-type src/lib/core/trash/trash.types.ts
## symbols
sym src/lib/core/trash/trash.types.ts:2 interface TrashItem L12 | A single item in the trash, representing a deleted file or folder
by src/lib/core/trash/trash.types.ts:TrashItem <- src/lib/core/settings/sections/TrashSection.svelte:9 in (script) import
by src/lib/core/trash/trash.types.ts:TrashItem <- src/lib/core/trash/trash.logic.ts:1 in (module) import
by src/lib/core/trash/trash.types.ts:TrashItem <- src/lib/core/trash/trash.service.ts:2 in (module) import
by src/lib/core/trash/trash.types.ts:TrashItem <- src/lib/core/trash/trash.store.svelte.ts:1 in (module) import
by src/lib/core/trash/trash.types.ts:TrashItem <- src/lib/features/event-calendar/event-calendar.service.ts:26 in (module) import
