# file card src/lib/features/backlinks/backlinks.service.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/features/backlinks/backlinks.service.ts ' codemap/files
file src/lib/features/backlinks/backlinks.service.ts service L263 module src/lib/features/backlinks in4 t5
## imports
imp src/lib/features/backlinks/backlinks.service.ts:1 -> src/lib/contracts/ipc.ts call
imp src/lib/features/backlinks/backlinks.service.ts:2 -> src/lib/utils/debug.ts debug,error,perfStart,perfEnd
imp src/lib/features/backlinks/backlinks.service.ts:3 -> src/lib/utils/inflight.ts dedupeInflight,isStillCurrentPath
imp src/lib/features/backlinks/backlinks.service.ts:4 -> src/lib/core/editor/editor.store.svelte.ts editorStore
imp src/lib/features/backlinks/backlinks.service.ts:5 -> src/lib/core/vault/vault.store.svelte.ts vaultStore
imp src/lib/features/backlinks/backlinks.service.ts:6 -> src/lib/features/backlinks/backlinks.store.svelte.ts backlinksStore
imp src/lib/features/backlinks/backlinks.service.ts:7 -> src/lib/features/backlinks/backlinks.logic.ts noteEntryV2ToBacklinkEntry
## imported-by
imp src/lib/app/lifecycle/app-lifecycle.service.ts:16 -> src/lib/features/backlinks/backlinks.service.ts buildIndex,resetBacklinks
imp src/lib/app/lifecycle/watcher-handler.service.ts:2 -> src/lib/features/backlinks/backlinks.service.ts rebuildIndex
imp src/lib/features/backlinks/BacklinksPanel.svelte:12 -> src/lib/features/backlinks/backlinks.service.ts fetchBacklinksV2,fetchRelationshipBacklinks
imp src/routes/(app)/+layout.svelte:16 -> src/lib/features/backlinks/backlinks.service.ts fetchBacklinksV2
## reach
in2 src/lib/features/backlinks/backlinks.service.ts 1 files in 1 modules: src/lib/app(1)
out2 src/lib/features/backlinks/backlinks.service.ts 10 files in 7 modules: src/lib/contracts(2) src/lib/core/editor(2) src/lib/core/settings(2) src/lib/core/vault(1) src/lib/features/backlinks(1) +2 modules
## tests
test src/tests/lib/features/backlinks/backlinks.service.test.ts imports src/lib/features/backlinks/backlinks.service.ts mirror
test src/tests/lib/app/lifecycle/watcher-handler.mixed-batch.test.ts imports src/lib/features/backlinks/backlinks.service.ts
test src/tests/lib/app/lifecycle/app-lifecycle.service.test.ts mocks src/lib/features/backlinks/backlinks.service.ts
test src/tests/lib/app/lifecycle/watcher-handler.service.test.ts mocks src/lib/features/backlinks/backlinks.service.ts
test src/tests/lib/features/backlinks/BacklinksPanel.test.ts mocks src/lib/features/backlinks/backlinks.service.ts
## symbols
sym src/lib/features/backlinks/backlinks.service.ts:56 fn buildIndex(path: string): Promise<boolean> L12 | Bootstraps the Rust `VaultIndex` for the given vault path.
by src/lib/features/backlinks/backlinks.service.ts:buildIndex <- src/lib/app/lifecycle/app-lifecycle.service.ts:337 in initializeVault call
sym src/lib/features/backlinks/backlinks.service.ts:112 fn rebuildIndex() L6
by src/lib/features/backlinks/backlinks.service.ts:rebuildIndex <- src/lib/app/lifecycle/watcher-handler.service.ts:76 in rebuildAllIndexes call
sym src/lib/features/backlinks/backlinks.service.ts:170 const fetchBacklinksV2 = dedupeInflight(…) L1
by src/lib/features/backlinks/backlinks.service.ts:fetchBacklinksV2 <- src/lib/features/backlinks/BacklinksPanel.svelte:29 in fetchData call
by src/lib/features/backlinks/backlinks.service.ts:fetchBacklinksV2 <- src/routes/(app)/+layout.svelte:129 in $effect@105 call
sym src/lib/features/backlinks/backlinks.service.ts:186 const fetchRelationshipBacklinks = dedupeInflight(…) L1
by src/lib/features/backlinks/backlinks.service.ts:fetchRelationshipBacklinks <- src/lib/features/backlinks/BacklinksPanel.svelte:30 in fetchData call
sym src/lib/features/backlinks/backlinks.service.ts:228 const computeUnlinkedMentionsForFile = dedupeInflight(…) L4
sym src/lib/features/backlinks/backlinks.service.ts:257 fn resetBacklinks() L7 | Clears the per-vault path, the queued-rebuild flag, the per-path version caches and the store.
by src/lib/features/backlinks/backlinks.service.ts:resetBacklinks <- src/lib/app/lifecycle/app-lifecycle.service.ts:662 in teardownVault call
## locals
local src/lib/features/backlinks/backlinks.service.ts:85 fn runBuildIndex(path: string): Promise<boolean> L26
local src/lib/features/backlinks/backlinks.service.ts:141 fn fetchBacklinksV2Inner(path: string): Promise<void> L29
local src/lib/features/backlinks/backlinks.service.ts:177 fn fetchRelationshipBacklinksInner(path: string): Promise<void> L9
local src/lib/features/backlinks/backlinks.service.ts:205 fn computeUnlinkedMentionsForFileInner(filePath: string): Promise<void> L23
## calls
call src/lib/features/backlinks/backlinks.service.ts:65 in buildIndex -> src/lib/features/backlinks/backlinks.service.ts:runBuildIndex call
call src/lib/features/backlinks/backlinks.service.ts:92 in runBuildIndex -> src/lib/utils/debug.ts:perfStart call
call src/lib/features/backlinks/backlinks.service.ts:93 in runBuildIndex -> src/lib/contracts/ipc.ts:call call
call src/lib/features/backlinks/backlinks.service.ts:95 in runBuildIndex -> src/lib/utils/debug.ts:perfEnd call
call src/lib/features/backlinks/backlinks.service.ts:96 in runBuildIndex -> src/lib/utils/debug.ts:debug call
call src/lib/features/backlinks/backlinks.service.ts:101 in runBuildIndex -> src/lib/utils/debug.ts:error call
call src/lib/features/backlinks/backlinks.service.ts:107 in runBuildIndex -> src/lib/features/backlinks/backlinks.service.ts:buildIndex call
call src/lib/features/backlinks/backlinks.service.ts:113 in rebuildIndex -> src/lib/utils/debug.ts:debug call
call src/lib/features/backlinks/backlinks.service.ts:115 in rebuildIndex -> src/lib/features/backlinks/backlinks.service.ts:buildIndex call
call src/lib/features/backlinks/backlinks.service.ts:151 in fetchBacklinksV2Inner -> src/lib/utils/debug.ts:perfStart call
call src/lib/features/backlinks/backlinks.service.ts:153 in fetchBacklinksV2Inner -> src/lib/contracts/ipc.ts:call call
call src/lib/features/backlinks/backlinks.service.ts:158 in fetchBacklinksV2Inner -> src/lib/utils/inflight.ts:isStillCurrentPath call
call src/lib/features/backlinks/backlinks.service.ts:159 in fetchBacklinksV2Inner -> src/lib/utils/debug.ts:perfEnd call +1
call src/lib/features/backlinks/backlinks.service.ts:162 in fetchBacklinksV2Inner -> src/lib/features/backlinks/backlinks.logic.ts:noteEntryV2ToBacklinkEntry ref
call src/lib/features/backlinks/backlinks.service.ts:163 in fetchBacklinksV2Inner -> src/lib/features/backlinks/backlinks.store.svelte.ts:backlinksStore.setLinkedMentions mcall
call src/lib/features/backlinks/backlinks.service.ts:167 in fetchBacklinksV2Inner -> src/lib/utils/debug.ts:error call
call src/lib/features/backlinks/backlinks.service.ts:170 in fetchBacklinksV2 -> src/lib/features/backlinks/backlinks.service.ts:fetchBacklinksV2Inner ref
call src/lib/features/backlinks/backlinks.service.ts:170 in fetchBacklinksV2 -> src/lib/utils/inflight.ts:dedupeInflight call
call src/lib/features/backlinks/backlinks.service.ts:179 in fetchRelationshipBacklinksInner -> src/lib/contracts/ipc.ts:call call
call src/lib/features/backlinks/backlinks.service.ts:180 in fetchRelationshipBacklinksInner -> src/lib/utils/inflight.ts:isStillCurrentPath call
call src/lib/features/backlinks/backlinks.service.ts:181 in fetchRelationshipBacklinksInner -> src/lib/features/backlinks/backlinks.store.svelte.ts:backlinksStore.setRelationshipBacklinks mcall
call src/lib/features/backlinks/backlinks.service.ts:183 in fetchRelationshipBacklinksInner -> src/lib/utils/debug.ts:error call
call src/lib/features/backlinks/backlinks.service.ts:186 in fetchRelationshipBacklinks -> src/lib/features/backlinks/backlinks.service.ts:fetchRelationshipBacklinksInner ref
call src/lib/features/backlinks/backlinks.service.ts:186 in fetchRelationshipBacklinks -> src/lib/utils/inflight.ts:dedupeInflight call
call src/lib/features/backlinks/backlinks.service.ts:210 in computeUnlinkedMentionsForFileInner -> src/lib/utils/debug.ts:perfStart call
call src/lib/features/backlinks/backlinks.service.ts:212 in computeUnlinkedMentionsForFileInner -> src/lib/contracts/ipc.ts:call call
call src/lib/features/backlinks/backlinks.service.ts:216 in computeUnlinkedMentionsForFileInner -> src/lib/utils/inflight.ts:isStillCurrentPath call
call src/lib/features/backlinks/backlinks.service.ts:217 in computeUnlinkedMentionsForFileInner -> src/lib/utils/debug.ts:perfEnd call +1
call src/lib/features/backlinks/backlinks.service.ts:220 in computeUnlinkedMentionsForFileInner -> src/lib/features/backlinks/backlinks.logic.ts:noteEntryV2ToBacklinkEntry ref
call src/lib/features/backlinks/backlinks.service.ts:221 in computeUnlinkedMentionsForFileInner -> src/lib/features/backlinks/backlinks.store.svelte.ts:backlinksStore.setUnlinkedMentions mcall
call src/lib/features/backlinks/backlinks.service.ts:225 in computeUnlinkedMentionsForFileInner -> src/lib/utils/debug.ts:error call
call src/lib/features/backlinks/backlinks.service.ts:228 in computeUnlinkedMentionsForFile -> src/lib/utils/inflight.ts:dedupeInflight call
call src/lib/features/backlinks/backlinks.service.ts:229 in computeUnlinkedMentionsForFile -> src/lib/features/backlinks/backlinks.service.ts:computeUnlinkedMentionsForFileInner ref
call src/lib/features/backlinks/backlinks.service.ts:262 in resetBacklinks -> src/lib/features/backlinks/backlinks.store.svelte.ts:backlinksStore.reset mcall
## effects
ipc-call src/lib/features/backlinks/backlinks.service.ts:93 in runBuildIndex -> ipc:scan_vault_v2_cached -> src-tauri/src/commands/vault.rs:1528
ipc-call src/lib/features/backlinks/backlinks.service.ts:153 in fetchBacklinksV2Inner -> ipc:get_backlinks_v2 -> src-tauri/src/commands/vault.rs:486
ipc-call src/lib/features/backlinks/backlinks.service.ts:179 in fetchRelationshipBacklinksInner -> ipc:get_relationship_backlinks_v2 -> src-tauri/src/commands/vault.rs:500
ipc-call src/lib/features/backlinks/backlinks.service.ts:212 in computeUnlinkedMentionsForFileInner -> ipc:get_unlinked_mentions_v2 -> src-tauri/src/commands/vault.rs:599
