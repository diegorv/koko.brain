# 19: Semantic and FTS builds cannot write into a vault opened after they started

**What to build:** build_semantic_index_inner (semantic.rs:495) and build_search_index_inner (search_index.rs:57) capture the open vault root at entry. Every DB access they make goes through a root-pinned variant of with_db / with_db_transaction / with_fts_db / with_fts_db_transaction, which checks under the same lock acquisition that the open root still equals the captured one and returns a 'vault changed' error otherwise. That covers Phase 1 model hash and clear_all_chunks, get_stored_mtimes, Phase 2.5, the Phase 3 batches, Phase 4 cleanup_orphaned_chunks and the no-change cleanup at :565, plus the FTS snapshot at :71 and the transaction at :92. Checking under the lock leaves no gap between the check and the write. A stale build aborts at its next DB touch and releases BUILD_LOCK. A build call for a different root arriving while a stale build holds BUILD_LOCK must not be silently skipped: it waits for the lock or retries once the stale build aborts.

**Blocked by:** 05, 18

**Status:** wontfix

**Gate:** Rust only: `cargo test --manifest-path src-tauri/Cargo.toml`.

- [ ] Failing test first in src-tauri/tests/semantic_commands_test.rs (TEST_LOCK pattern): open vault A, record A's root as the build's root, close, open vault B, insert a chunk for b-note.md in B, run the Phase 4 cleanup pinned to A's root with ['a-note.md'], and assert it returns Err and B's chunk remains. Today cleanup_orphaned_chunks deletes it.
- [ ] FTS counterpart in src-tauri/tests/search_fts_test.rs: with B's DB open and B rows indexed, an FTS reconcile write pinned to A's root is refused, and B's notes_content rows are unchanged, including when A's snapshot was empty (the clear_index branch).
- [ ] Single-vault builds behave as before. Existing semantic_commands_test and search_fts_test cases pass.
- [ ] A build for vault B requested while a stale build for A holds BUILD_LOCK ends up building B, not returning early. Add a test seam if needed.
- [ ] cargo test passes.

## Notes

- **Source:** audit 2026-11-04 (`.scratch/audit-2026-11-04/findings.md`), deep dive by an opus verifier the same day. Wave 4 of the parallel plan.
- **Finding `semantic-vault-switch`:** real, medium. Root cause: The DB and FTS_DB globals carry no vault identity, and every writer uses whichever connection is open at call time. Builds run detached for minutes. Teardown neither cancels nor awaits them (shutdown_semantic and close_vault_db are fire-and-forget), and BUILD_LOCK has no cancel path. A build for vault A that outlives a switch therefore writes into, and orphan-cleans, vault B's kokobrain.db. The data is derived, so a rebuild recovers it. Until then B serves A's chunk text or has lost its own, and B's own semantic build that session is skipped because A still holds BUILD_LOCK.
  Evidence: src-tauri/src/db/mod.rs:17,27 (global connections), :36-88 (open_database overwrites both with no identity), :110-186 (with_db*/with_fts_db* read the global at call time). src-tauri/src/commands/semantic.rs:499-506: try_lock on BUILD_LOCK, so a concurrent call for another vault returns early. :515-526 Phase 1 writes the model hash and may clear_all_chunks. :599-603 Phase 2.5. :724-757 Phase 3 batch transactions. :565 and :777: cleanup_orphaned_chunks(&A paths), which at :1522-1548 deletes every source in the open DB that is not in A's list, so it wipes B. Teardown at src/lib/app/lifecycle/app-lifecycle.service.ts:602-608 does not await shutdown_semantic/close_vault_db, and shutdown_semantic (semantic.rs:1248-1259) only nulls EMBEDDER/RERANKER/cache: no cancel flag, and it never touches BUILD_LOCK. Phase 3 needs EMBEDDER (:660-663), so pollution needs B to reload the embedder (semantic on). The Phase 4 wipe and the no-change cleanup need no embedder. FTS: src-tauri/src/commands/search_index.rs:71 snapshots whichever FTS_DB is open, :75-76 reads A's files, and :92-121 commits into the then-current FTS_DB. That runs clear_index on B (:97) when the snapshot was empty, or deletes B's rows as 'removed' (:101). Frontend sibling: src/lib/features/search/search.service.ts:278-294 buildSearchIndex has no generation check, so A's stats and isIndexing=false land in B's store.
- **Blocking edge:** Needs the open-root accessor (Issue 05) and edits semantic.rs / search_index.rs right after Issue 18 touches them.
- Do not rely on shutdown_semantic nulling EMBEDDER. That is the only thing stopping Phase 3 today, and init_semantic_search for B reloads it (semantic.rs:341-352 comment). update_semantic_file / remove_semantic_file / update_search_index_file take a vault_path and can take the same pinning if it is cheap. Teardown awaiting builds on the TS side is an alternative, but the Rust check is the robust boundary. The model-hash read/write (semantic.rs:1618-1630) must use the pinned path too.
- **Size:** M.

## Comments

- 2026-11-04: closed as wontfix by the owner. The owner opens one vault and stays in it; switching vaults within a session is not a real scenario, so a build outliving its vault cannot happen in practice.
