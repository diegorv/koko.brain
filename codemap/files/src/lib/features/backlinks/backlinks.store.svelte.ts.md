# file card src/lib/features/backlinks/backlinks.store.svelte.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/features/backlinks/backlinks.store.svelte.ts ' codemap/files
file src/lib/features/backlinks/backlinks.store.svelte.ts store L31 module src/lib/features/backlinks in4 t7
## imports
imp src/lib/features/backlinks/backlinks.store.svelte.ts:1 -> src/lib/features/backlinks/backlinks.types.ts type:BacklinkEntry
imp src/lib/features/backlinks/backlinks.store.svelte.ts:2 -> src/lib/types/vault-v2.types.ts type:RelationshipBacklinkV2
## imported-by
imp src/lib/app/boot.ts:7 -> src/lib/features/backlinks/backlinks.store.svelte.ts backlinksStore
imp src/lib/features/backlinks/BacklinksPanel.svelte:11 -> src/lib/features/backlinks/backlinks.store.svelte.ts backlinksStore
imp src/lib/features/backlinks/backlinks.service.ts:6 -> src/lib/features/backlinks/backlinks.store.svelte.ts backlinksStore
imp src/routes/(app)/+layout.svelte:17 -> src/lib/features/backlinks/backlinks.store.svelte.ts backlinksStore
## reach
in2 src/lib/features/backlinks/backlinks.store.svelte.ts 3 files in 1 modules: src/lib/app(3)
out2 src/lib/features/backlinks/backlinks.store.svelte.ts 1 files in 1 modules: src/lib/contracts(1)
## tests
test src/tests/lib/features/backlinks/backlinks.store.test.ts imports src/lib/features/backlinks/backlinks.store.svelte.ts mirror
test src/tests/lib/app/boot.test.ts imports src/lib/features/backlinks/backlinks.store.svelte.ts
test src/tests/lib/app/lifecycle/app-lifecycle.service.test.ts imports src/lib/features/backlinks/backlinks.store.svelte.ts
test src/tests/lib/core/trash/trash.service.test.ts imports src/lib/features/backlinks/backlinks.store.svelte.ts
test src/tests/lib/features/backlinks/BacklinksPanel.test.ts imports src/lib/features/backlinks/backlinks.store.svelte.ts
test src/tests/lib/features/backlinks/backlinks.service.test.ts imports src/lib/features/backlinks/backlinks.store.svelte.ts
test src/tests/lib/lib-subpath-import.test.ts imports src/lib/features/backlinks/backlinks.store.svelte.ts
## symbols
sym src/lib/features/backlinks/backlinks.store.svelte.ts:10 store backlinksStore L22
by src/lib/features/backlinks/backlinks.store.svelte.ts:backlinksStore <- src/lib/app/boot.ts:39 in registerAppPorts mcall
by src/lib/features/backlinks/backlinks.store.svelte.ts:backlinksStore <- src/lib/features/backlinks/BacklinksPanel.svelte:37 in $effect@33 mcall +6
by src/lib/features/backlinks/backlinks.store.svelte.ts:backlinksStore <- src/lib/features/backlinks/backlinks.service.ts:163 in fetchBacklinksV2Inner mcall +3
by src/lib/features/backlinks/backlinks.store.svelte.ts:backlinksStore <- src/routes/(app)/+layout.svelte:122 in $effect@105 mcall +2
## store
store src/lib/features/backlinks/backlinks.store.svelte.ts:10 backlinksStore esc:0
mem src/lib/features/backlinks/backlinks.store.svelte.ts:11 get backlinksStore.linkedMentions r:src/lib/features/backlinks/BacklinksPanel.svelte:61,src/lib/features/backlinks/BacklinksPanel.svelte:69,src/lib/features/backlinks/BacklinksPanel.svelte:73 w-via:setLinkedMentions,reset
mem src/lib/features/backlinks/backlinks.store.svelte.ts:12 get backlinksStore.unlinkedMentions r:- w-via:setUnlinkedMentions,reset
mem src/lib/features/backlinks/backlinks.store.svelte.ts:13 get backlinksStore.relationshipBacklinks r:src/lib/features/backlinks/BacklinksPanel.svelte:80,src/lib/features/backlinks/BacklinksPanel.svelte:86,src/lib/features/backlinks/BacklinksPanel.svelte:90 w-via:setRelationshipBacklinks,reset
mem src/lib/features/backlinks/backlinks.store.svelte.ts:14 get backlinksStore.unlinkedDirty r:- w-via:setUnlinkedMentions,markUnlinkedDirty,reset
mem src/lib/features/backlinks/backlinks.store.svelte.ts:16 do backlinksStore.setLinkedMentions w:src/lib/features/backlinks/backlinks.service.ts:163,src/routes/(app)/+layout.svelte:122
mem src/lib/features/backlinks/backlinks.store.svelte.ts:17 do backlinksStore.setUnlinkedMentions w:src/lib/features/backlinks/backlinks.service.ts:221,src/routes/(app)/+layout.svelte:123
mem src/lib/features/backlinks/backlinks.store.svelte.ts:21 do backlinksStore.setRelationshipBacklinks w:src/lib/features/backlinks/backlinks.service.ts:181
mem src/lib/features/backlinks/backlinks.store.svelte.ts:23 do backlinksStore.markUnlinkedDirty w:src/lib/app/boot.ts:39,src/routes/(app)/+layout.svelte:132 | Marks unlinked mentions as stale without recomputing them
mem src/lib/features/backlinks/backlinks.store.svelte.ts:25 do backlinksStore.reset w:src/lib/features/backlinks/BacklinksPanel.svelte:37,src/lib/features/backlinks/backlinks.service.ts:262
