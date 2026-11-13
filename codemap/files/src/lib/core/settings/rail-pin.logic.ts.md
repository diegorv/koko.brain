# file card src/lib/core/settings/rail-pin.logic.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/core/settings/rail-pin.logic.ts ' codemap/files
file src/lib/core/settings/rail-pin.logic.ts logic L22 module src/lib/core/settings in2 t1 | Keys of the rail items pinned with `_rail: true`, saved in `layout.railItem`.
## imported-by
imp src/lib/features/rail-shell/lens.logic.ts:3 -> src/lib/core/settings/rail-pin.logic.ts TYPE_PIN_PREFIX,VIEW_PIN_PREFIX,typePinKey,viewPinKey
imp src/lib/features/type-definitions/type-definitions.service.ts:16 -> src/lib/core/settings/rail-pin.logic.ts typePinKey
## reach
in2 src/lib/core/settings/rail-pin.logic.ts 25 files in 9 modules: src/lib/features/rail-shell(11) src/lib/app(6) src/lib/features/event-calendar(2) src/lib/features/note-list(1) src/lib/features/search(1) +4 modules: q impact src/lib/core/settings/rail-pin.logic.ts --depth 2
out2 src/lib/core/settings/rail-pin.logic.ts 0 files in 0 modules: -
## tests
test src/tests/lib/core/settings/rail-pin.logic.test.ts imports src/lib/core/settings/rail-pin.logic.ts mirror
## symbols
sym src/lib/core/settings/rail-pin.logic.ts:9 const VIEW_PIN_PREFIX L1 | The rail item key prefix of a pinned `.view`; the rest is its absolute path.
by src/lib/core/settings/rail-pin.logic.ts:VIEW_PIN_PREFIX <- src/lib/features/rail-shell/lens.logic.ts:160 in isPinKey ref +5
sym src/lib/core/settings/rail-pin.logic.ts:12 const TYPE_PIN_PREFIX L1 | The rail item key prefix of a pinned type; the rest is its `TypeMetadata.name`.
by src/lib/core/settings/rail-pin.logic.ts:TYPE_PIN_PREFIX <- src/lib/features/rail-shell/lens.logic.ts:160 in isPinKey ref +3
sym src/lib/core/settings/rail-pin.logic.ts:15 fn viewPinKey(path: string): string L3 | The rail item key of the `.view` at `path` pinned to the rail.
by src/lib/core/settings/rail-pin.logic.ts:viewPinKey <- src/lib/features/rail-shell/lens.logic.ts:225 in pinnedRailItems call +1
sym src/lib/core/settings/rail-pin.logic.ts:20 fn typePinKey(name: string): string L3 | The rail item key of the type `name` pinned to the rail.
by src/lib/core/settings/rail-pin.logic.ts:typePinKey <- src/lib/features/rail-shell/lens.logic.ts:235 in pinnedRailItems call
by src/lib/core/settings/rail-pin.logic.ts:typePinKey <- src/lib/features/type-definitions/type-definitions.service.ts:257 in renameType call +1
