# 39: An in-flight semantic update for vault A commits into vault B after a switch

**Status:** wontfix

**Blocked by:** none
Priority: P2
Severity: stale-state
Source: file I/O audit, deep-dive group(s) h09-queryjs-semantic (raw reports in .scratch/file-io-audit/deep/raw/), verified at c4bfee07

## Details

- Verdict: CONFIRMED_BY_TRACE (deep dive priority P2, severity stale-state)
- Claims covered: vault-lifecycle-7

**How a user hits it.** Narrow race. Needs a save followed by a vault switch while the embed is still running (about hundreds of ms, longer if the embedder reloads). Realistic trigger: type in a dirty tab then switch vault or follow a deep link within the embed time; switchVault's saveAllDirtyTabs fires the save just before the switch. Self-heals on the next open when semanticSearchEnabled is on (build runs 3 s after open). If semantic is off, rows persist invisibly until a build runs. No note file bytes are touched.

**Recoverable from.** Fully recoverable: the derived semantic index is rebuilt by build_semantic_index on the next open (or when semantic is enabled). Source notes are untouched.

**Root cause.** src-tauri/src/commands/semantic.rs:1211-1340 (update_semantic_file: with_db reads and with_db_transaction at ~1300 use the global DB slot at lock time, no vault identity check; update_stored_mtime at 1351-1373 writes via with_db). Trigger chain: src/lib/features/search/search.service.ts:327 (fire-and-forget call), src/lib/core/vault/vault.service.ts:18-21 (switchVault awaits only saveAllDirtyTabs and drainPendingWrites), src/lib/app/lifecycle/app-lifecycle.service.ts:601 (close_vault_db not awaited) and :233 (open_vault_db(B) awaited).

**Evidence.** Trace of the save and switch sequence, verified by reading the files. The Rust commit goes to whichever DB is open at lock time (db/mod.rs global slots). Self-heal path: app-lifecycle.service.ts:92 SEMANTIC_INIT_DEFER_MS=3000 and :450-464 call buildSemanticIndex on open when semantic is enabled; semantic.rs:517-523 re-reads files whose mtime differs; cleanup_orphaned_chunks (semantic.rs:1394) drops paths absent from B. If close_vault_db runs first, with_db returns 'Database not open' and nothing is written. Sibling not claimed: update_search_index_file (src-tauri/src/commands/search_index.rs:195-220) uses with_fts_db_transaction on the same pattern. No cargo run, no test written.

**Fix sketch.** Have switchVault (or initializeVault step 2) await in-flight update_semantic_file and update_search_index_file calls before close_vault_db / open_vault_db, or tag each Rust write with the vault generation and drop writes whose vault no longer matches. Keep the Rust side as the owner of the check.

## Comments

- 2026-11-06: closed by audit 2026-11-05 at `5f8003d67` (wontfix): Against the owner decision 'one vault per session; vault switching within a session is not a real scenario'. The bug needs an in-flight update for vault A while switching to vault B.
