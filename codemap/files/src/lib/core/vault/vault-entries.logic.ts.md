# file card src/lib/core/vault/vault-entries.logic.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/core/vault/vault-entries.logic.ts ' codemap/files
file src/lib/core/vault/vault-entries.logic.ts logic L32 module src/lib/core/vault in1 t1
## imports
imp src/lib/core/vault/vault-entries.logic.ts:1 -> src/lib/types/vault-v2.types.ts type:NoteEntryV2
## imported-by
imp src/lib/core/vault/vault-entries.service.ts:4 -> src/lib/core/vault/vault-entries.logic.ts patchEntriesSnapshot
## reach
in2 src/lib/core/vault/vault-entries.logic.ts 8 files in 6 modules: src/lib/app(3) src/lib/features/event-calendar(1) src/lib/features/properties(1) src/lib/features/tasks(1) src/lib/plugins/mods(1) +1 modules: q impact src/lib/core/vault/vault-entries.logic.ts --depth 2
out2 src/lib/core/vault/vault-entries.logic.ts 1 files in 1 modules: src/lib/contracts(1)
## tests
test src/tests/lib/core/vault/vault-entries.logic.test.ts imports src/lib/core/vault/vault-entries.logic.ts mirror
## symbols
sym src/lib/core/vault/vault-entries.logic.ts:9 fn patchEntriesSnapshot(base: NoteEntryV2[], upserted: NoteEntryV2[], removed: Iterable<string>): NoteEntryV2[] L19 | Returns a new entries array: `base` (sorted by path, as `get_all_vault_entries_v2` returns it) without `removed` paths, with each `upserted` entry replacing th…
by src/lib/core/vault/vault-entries.logic.ts:patchEntriesSnapshot <- src/lib/core/vault/vault-entries.service.ts:78 in patchVaultEntries call
## locals
local src/lib/core/vault/vault-entries.logic.ts:30 fn byPath(a: NoteEntryV2, b: NoteEntryV2): number L3
## calls
call src/lib/core/vault/vault-entries.logic.ts:17 in patchEntriesSnapshot -> src/lib/core/vault/vault-entries.logic.ts:byPath ref +1
