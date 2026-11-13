# file card src/lib/features/outgoing-links/outgoing-links.types.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/features/outgoing-links/outgoing-links.types.ts ' codemap/files
file src/lib/features/outgoing-links/outgoing-links.types.ts types L1 module src/lib/features/outgoing-links in2 t0
## imports
imp src/lib/features/outgoing-links/outgoing-links.types.ts:1 -> src/lib/contracts/index.ts type:OutgoingLink,type:OutgoingUnlinkedMention
## imported-by
imp src/lib/features/outgoing-links/outgoing-links.service.ts:7 -> src/lib/features/outgoing-links/outgoing-links.types.ts type:OutgoingLink,type:OutgoingUnlinkedMention
imp src/lib/features/outgoing-links/outgoing-links.store.svelte.ts:1 -> src/lib/features/outgoing-links/outgoing-links.types.ts type:OutgoingLink,type:OutgoingUnlinkedMention
## reach
in2 src/lib/features/outgoing-links/outgoing-links.types.ts 3 files in 3 modules: src/lib/app(1) src/lib/features/outgoing-links(1) src/routes(1)
out2 src/lib/features/outgoing-links/outgoing-links.types.ts 52 files in 1 modules: src/lib/contracts(52)
## symbols
sym src/lib/features/outgoing-links/outgoing-links.types.ts:1 reexport OutgoingLink = dto:OutgoingLink L1
sym src/lib/features/outgoing-links/outgoing-links.types.ts:1 reexport OutgoingUnlinkedMention = dto:OutgoingUnlinkedMention L1
