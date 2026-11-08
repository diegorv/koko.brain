# 09: An FTS build from the previous vault does not write its stats into the new vault's search store

**What to build:** buildSearchIndex (src/lib/features/search/search.service.ts:278-294) gets the same generation guard buildSemanticIndex uses (:376-414, buildGeneration reset in resetSearch). When the vault changed while build_search_index was in flight, the result and the finally block do not touch searchStore.indexStats or isIndexing for the new vault.

**Blocked by:** none

**Status:** wontfix

**Gate:** frontend only: `pnpm check` + `pnpm vitest run` + `pnpm build`.

- [ ] Failing test first in src/tests/lib/features/search (search.service test, real searchStore, only call()/invoke mocked): start buildSearchIndex for vault A with a pending call, run resetSearch and start B's build, resolve A's call with A's stats, then assert searchStore.indexStats is not A's stats and isIndexing still reflects B's in-flight build. Fails today.
- [ ] Normal single-vault build still sets indexStats and clears isIndexing.
- [ ] pnpm check, pnpm vitest run and pnpm build pass.

## Notes

- **Source:** audit 2026-11-04 (`.scratch/audit-2026-11-04/findings.md`), deep dive by an opus verifier the same day. Wave 1 of the parallel plan.
- **Finding `semantic-vault-switch`:** real, medium. Root cause: The DB and FTS_DB globals carry no vault identity, and every writer uses whichever connection is open at call time. Builds run detached for minutes. Teardown neither cancels nor awaits them (shutdown_semantic and close_vault_db are fire-and-forget), and BUILD_LOCK has no cancel path. A build for vault A that outlives a switch therefore writes into, and orphan-cleans, vault B's kokobrain.db. The data is derived, so a rebuild recovers it. Until then B serves A's chunk text or has lost its own, and B's own semantic build that session is skipped because A still holds BUILD_LOCK.
  Evidence: src-tauri/src/db/mod.rs:17,27 (global connections), :36-88 (open_database overwrites both with no identity), :110-186 (with_db*/with_fts_db* read the global at call time). src-tauri/src/commands/semantic.rs:499-506: try_lock on BUILD_LOCK, so a concurrent call for another vault returns early. :515-526 Phase 1 writes the model hash and may clear_all_chunks. :599-603 Phase 2.5. :724-757 Phase 3 batch transactions. :565 and :777: cleanup_orphaned_chunks(&A paths), which at :1522-1548 deletes every source in the open DB that is not in A's list, so it wipes B. Teardown at src/lib/app/lifecycle/app-lifecycle.service.ts:602-608 does not await shutdown_semantic/close_vault_db, and shutdown_semantic (semantic.rs:1248-1259) only nulls EMBEDDER/RERANKER/cache: no cancel flag, and it never touches BUILD_LOCK. Phase 3 needs EMBEDDER (:660-663), so pollution needs B to reload the embedder (semantic on). The Phase 4 wipe and the no-change cleanup need no embedder. FTS: src-tauri/src/commands/search_index.rs:71 snapshots whichever FTS_DB is open, :75-76 reads A's files, and :92-121 commits into the then-current FTS_DB. That runs clear_index on B (:97) when the snapshot was empty, or deletes B's rows as 'removed' (:101). Frontend sibling: src/lib/features/search/search.service.ts:278-294 buildSearchIndex has no generation check, so A's stats and isIndexing=false land in B's store.
- This is cosmetic and separate from the Rust data race fixed in Issue 19. The two tickets do not block each other.
- **Size:** S.

## Comments

- 2026-11-04: closed as wontfix by the owner. The owner opens one vault and stays in it; switching vaults within a session is not a real scenario, so a build outliving its vault cannot happen in practice.
