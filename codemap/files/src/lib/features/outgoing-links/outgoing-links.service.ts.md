# file card src/lib/features/outgoing-links/outgoing-links.service.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/features/outgoing-links/outgoing-links.service.ts ' codemap/files
file src/lib/features/outgoing-links/outgoing-links.service.ts service L99 module src/lib/features/outgoing-links in2 t3
## imports
imp src/lib/features/outgoing-links/outgoing-links.service.ts:1 -> src/lib/contracts/ipc.ts call
imp src/lib/features/outgoing-links/outgoing-links.service.ts:2 -> src/lib/utils/debug.ts error,perfStart,perfEnd
imp src/lib/features/outgoing-links/outgoing-links.service.ts:3 -> src/lib/utils/inflight.ts dedupeInflight,isStillCurrentPath
imp src/lib/features/outgoing-links/outgoing-links.service.ts:4 -> src/lib/core/editor/editor.store.svelte.ts editorStore
imp src/lib/features/outgoing-links/outgoing-links.service.ts:5 -> src/lib/core/vault/vault.store.svelte.ts vaultStore
imp src/lib/features/outgoing-links/outgoing-links.service.ts:6 -> src/lib/features/outgoing-links/outgoing-links.store.svelte.ts outgoingLinksStore
imp src/lib/features/outgoing-links/outgoing-links.service.ts:7 -> src/lib/features/outgoing-links/outgoing-links.types.ts type:OutgoingLink,type:OutgoingUnlinkedMention
imp src/lib/features/outgoing-links/outgoing-links.service.ts:8 -> src/lib/types/vault-v2.types.ts type:OutgoingLinkV2
## imported-by
imp src/lib/app/lifecycle/app-lifecycle.service.ts:21 -> src/lib/features/outgoing-links/outgoing-links.service.ts resetOutgoingLinks
imp src/lib/features/outgoing-links/OutgoingLinksPanel.svelte:12 -> src/lib/features/outgoing-links/outgoing-links.service.ts fetchOutgoingLinksV2
## reach
in2 src/lib/features/outgoing-links/outgoing-links.service.ts 2 files in 2 modules: src/lib/app(1) src/routes(1)
out2 src/lib/features/outgoing-links/outgoing-links.service.ts 9 files in 5 modules: src/lib/contracts(3) src/lib/core/editor(2) src/lib/core/settings(2) src/lib/core/vault(1) src/lib/utils(1)
## tests
test src/tests/lib/features/outgoing-links/outgoing-links.service.test.ts imports src/lib/features/outgoing-links/outgoing-links.service.ts mirror
test src/tests/lib/app/lifecycle/app-lifecycle.service.test.ts mocks src/lib/features/outgoing-links/outgoing-links.service.ts
test src/tests/lib/features/outgoing-links/OutgoingLinksPanel.test.ts mocks src/lib/features/outgoing-links/outgoing-links.service.ts
## symbols
sym src/lib/features/outgoing-links/outgoing-links.service.ts:91 const fetchOutgoingLinksV2 = dedupeInflight(…) L4
by src/lib/features/outgoing-links/outgoing-links.service.ts:fetchOutgoingLinksV2 <- src/lib/features/outgoing-links/OutgoingLinksPanel.svelte:26 in fetchData call
sym src/lib/features/outgoing-links/outgoing-links.service.ts:96 fn resetOutgoingLinks() L4
by src/lib/features/outgoing-links/outgoing-links.service.ts:resetOutgoingLinks <- src/lib/app/lifecycle/app-lifecycle.service.ts:663 in teardownVault call
## locals
local src/lib/features/outgoing-links/outgoing-links.service.ts:25 fn deduplicateByTarget(links: OutgoingLinkV2[]): OutgoingLink[] L11
local src/lib/features/outgoing-links/outgoing-links.service.ts:65 fn fetchOutgoingLinksV2Inner(path: string, content: string): Promise<void> L26
## calls
call src/lib/features/outgoing-links/outgoing-links.service.ts:71 in fetchOutgoingLinksV2Inner -> src/lib/utils/debug.ts:perfStart call
call src/lib/features/outgoing-links/outgoing-links.service.ts:74 in fetchOutgoingLinksV2Inner -> src/lib/contracts/ipc.ts:call call +1
call src/lib/features/outgoing-links/outgoing-links.service.ts:79 in fetchOutgoingLinksV2Inner -> src/lib/utils/inflight.ts:isStillCurrentPath call
call src/lib/features/outgoing-links/outgoing-links.service.ts:80 in fetchOutgoingLinksV2Inner -> src/lib/utils/debug.ts:perfEnd call +1
call src/lib/features/outgoing-links/outgoing-links.service.ts:83 in fetchOutgoingLinksV2Inner -> src/lib/features/outgoing-links/outgoing-links.service.ts:deduplicateByTarget call
call src/lib/features/outgoing-links/outgoing-links.service.ts:83 in fetchOutgoingLinksV2Inner -> src/lib/features/outgoing-links/outgoing-links.store.svelte.ts:outgoingLinksStore.setOutgoingLinks mcall
call src/lib/features/outgoing-links/outgoing-links.service.ts:84 in fetchOutgoingLinksV2Inner -> src/lib/features/outgoing-links/outgoing-links.store.svelte.ts:outgoingLinksStore.setUnlinkedMentions mcall
call src/lib/features/outgoing-links/outgoing-links.service.ts:88 in fetchOutgoingLinksV2Inner -> src/lib/utils/debug.ts:error call
call src/lib/features/outgoing-links/outgoing-links.service.ts:91 in fetchOutgoingLinksV2 -> src/lib/utils/inflight.ts:dedupeInflight call
call src/lib/features/outgoing-links/outgoing-links.service.ts:92 in fetchOutgoingLinksV2 -> src/lib/features/outgoing-links/outgoing-links.service.ts:fetchOutgoingLinksV2Inner ref
call src/lib/features/outgoing-links/outgoing-links.service.ts:98 in resetOutgoingLinks -> src/lib/features/outgoing-links/outgoing-links.store.svelte.ts:outgoingLinksStore.reset mcall
## effects
ipc-call src/lib/features/outgoing-links/outgoing-links.service.ts:74 in fetchOutgoingLinksV2Inner -> ipc:get_outgoing_links_v2 -> src-tauri/src/commands/vault.rs:519
ipc-call src/lib/features/outgoing-links/outgoing-links.service.ts:75 in fetchOutgoingLinksV2Inner -> ipc:get_outgoing_unlinked_mentions_v2 -> src-tauri/src/commands/vault.rs:541
