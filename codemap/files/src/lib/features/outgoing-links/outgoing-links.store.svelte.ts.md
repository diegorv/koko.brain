# file card src/lib/features/outgoing-links/outgoing-links.store.svelte.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/features/outgoing-links/outgoing-links.store.svelte.ts ' codemap/files
file src/lib/features/outgoing-links/outgoing-links.store.svelte.ts store L17 module src/lib/features/outgoing-links in3 t3
## imports
imp src/lib/features/outgoing-links/outgoing-links.store.svelte.ts:1 -> src/lib/features/outgoing-links/outgoing-links.types.ts type:OutgoingLink,type:OutgoingUnlinkedMention
## imported-by
imp src/lib/features/outgoing-links/OutgoingLinksPanel.svelte:11 -> src/lib/features/outgoing-links/outgoing-links.store.svelte.ts outgoingLinksStore
imp src/lib/features/outgoing-links/outgoing-links.service.ts:6 -> src/lib/features/outgoing-links/outgoing-links.store.svelte.ts outgoingLinksStore
imp src/routes/(app)/+layout.svelte:18 -> src/lib/features/outgoing-links/outgoing-links.store.svelte.ts outgoingLinksStore
## reach
in2 src/lib/features/outgoing-links/outgoing-links.store.svelte.ts 2 files in 1 modules: src/lib/app(2)
out2 src/lib/features/outgoing-links/outgoing-links.store.svelte.ts 1 files in 1 modules: src/lib/contracts(1)
## tests
test src/tests/lib/features/outgoing-links/outgoing-links.store.test.ts imports src/lib/features/outgoing-links/outgoing-links.store.svelte.ts mirror
test src/tests/lib/features/outgoing-links/OutgoingLinksPanel.test.ts imports src/lib/features/outgoing-links/outgoing-links.store.svelte.ts
test src/tests/lib/features/outgoing-links/outgoing-links.service.test.ts imports src/lib/features/outgoing-links/outgoing-links.store.svelte.ts
## symbols
sym src/lib/features/outgoing-links/outgoing-links.store.svelte.ts:6 store outgoingLinksStore L12
by src/lib/features/outgoing-links/outgoing-links.store.svelte.ts:outgoingLinksStore <- src/lib/features/outgoing-links/OutgoingLinksPanel.svelte:33 in $effect@29 mcall +2
by src/lib/features/outgoing-links/outgoing-links.store.svelte.ts:outgoingLinksStore <- src/lib/features/outgoing-links/outgoing-links.service.ts:83 in fetchOutgoingLinksV2Inner mcall +2
by src/lib/features/outgoing-links/outgoing-links.store.svelte.ts:outgoingLinksStore <- src/routes/(app)/+layout.svelte:124 in $effect@105 mcall
## store
store src/lib/features/outgoing-links/outgoing-links.store.svelte.ts:6 outgoingLinksStore esc:0
mem src/lib/features/outgoing-links/outgoing-links.store.svelte.ts:7 get outgoingLinksStore.outgoingLinks r:src/lib/features/outgoing-links/OutgoingLinksPanel.svelte:55,src/lib/features/outgoing-links/OutgoingLinksPanel.svelte:59 w-via:setOutgoingLinks,reset
mem src/lib/features/outgoing-links/outgoing-links.store.svelte.ts:8 get outgoingLinksStore.unlinkedMentions r:- w-via:setUnlinkedMentions,reset
mem src/lib/features/outgoing-links/outgoing-links.store.svelte.ts:10 do outgoingLinksStore.setOutgoingLinks w:src/lib/features/outgoing-links/outgoing-links.service.ts:83
mem src/lib/features/outgoing-links/outgoing-links.store.svelte.ts:11 do outgoingLinksStore.setUnlinkedMentions w:src/lib/features/outgoing-links/outgoing-links.service.ts:84
mem src/lib/features/outgoing-links/outgoing-links.store.svelte.ts:13 do outgoingLinksStore.reset w:src/lib/features/outgoing-links/OutgoingLinksPanel.svelte:33,src/lib/features/outgoing-links/outgoing-links.service.ts:98,src/routes/(app)/+layout.svelte:124
