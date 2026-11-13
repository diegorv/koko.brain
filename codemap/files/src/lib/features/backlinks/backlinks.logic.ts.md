# file card src/lib/features/backlinks/backlinks.logic.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/features/backlinks/backlinks.logic.ts ' codemap/files
file src/lib/features/backlinks/backlinks.logic.ts logic L23 module src/lib/features/backlinks in1 t2
## imports
imp src/lib/features/backlinks/backlinks.logic.ts:1 -> src/lib/features/backlinks/backlinks.types.ts type:BacklinkEntry
imp src/lib/features/backlinks/backlinks.logic.ts:2 -> src/lib/types/vault-v2.types.ts type:NoteEntryV2
## imported-by
imp src/lib/features/backlinks/backlinks.service.ts:7 -> src/lib/features/backlinks/backlinks.logic.ts noteEntryV2ToBacklinkEntry
## reach
in2 src/lib/features/backlinks/backlinks.logic.ts 4 files in 3 modules: src/lib/app(2) src/lib/features/backlinks(1) src/routes(1)
out2 src/lib/features/backlinks/backlinks.logic.ts 1 files in 1 modules: src/lib/contracts(1)
## tests
test src/tests/lib/features/backlinks/backlinks.logic.test.ts imports src/lib/features/backlinks/backlinks.logic.ts mirror
test src/tests/lib/features/event-calendar/event-calendar.model.test.ts imports src/lib/features/backlinks/backlinks.logic.ts
## symbols
sym src/lib/features/backlinks/backlinks.logic.ts:17 fn noteEntryV2ToBacklinkEntry(entry: NoteEntryV2): BacklinkEntry L7 | Converts a Rust-side `NoteEntryV2` (returned by `get_backlinks_v2`) into the legacy `BacklinkEntry` shape consumed by `BacklinksPanel.svelte` and `LinkItem.sve…
by src/lib/features/backlinks/backlinks.logic.ts:noteEntryV2ToBacklinkEntry <- src/lib/features/backlinks/backlinks.service.ts:162 in fetchBacklinksV2Inner ref +1
