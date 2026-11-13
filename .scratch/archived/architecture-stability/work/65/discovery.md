# 65 discovery: incremental vault-index refresh

No `spec.md` for architecture-stability; ADR 0025 (Rust VaultIndex) and CLAUDE.md § Indexing 12 are the vocabulary.

## Files that change
- `src-tauri/src/vault/index.rs:27` `UpdateResult`: add `upserted`, `removed`, `full_rescan` (IPC DTO, ts-rs regenerates `UpdateResult.ts`); `update_entry` (:531) fills `upserted`, `remove_entry` (:1015) fills `removed`; new `absorb()` folds the per-step results of one command.
- `src-tauri/src/commands/vault.rs`: `rename_note_inner` (:954) and `propagate_type_rename_inner` (:342) absorb every step instead of keeping the last one; `emit_index_updated` (:1345) sets `full_rescan: true`; new `get_index_delta(paths)` command + `IndexDelta { entries, records }` DTO (only paths still in the index). Register in `lib.rs:~319`, `contracts/commands.ts`, `contracts/index.ts`.
- `src/lib/utils/inflight.ts:117` `versionGated`: add `advance(fn)` that installs `fn(cachedPromise)` at the current version (null when nothing is cached).
- `src/lib/core/vault/vault-entries.service.ts`: `patchVaultEntries(delta)` over `advance`; new `vault-entries.logic.ts::patchEntriesSnapshot` (sorted merge, Rust byte order).
- `src/lib/features/collection/collection.service.ts`: `applyPropertyDelta(records, removed)` (one Map copy).
- `src/lib/features/type-definitions/type-definitions.store.svelte.ts:56`: `patchEntries(next, touched, upserted)`; rebuilds `typeDefinitionPaths` only when a touched entry was or is a Type.
- `src/lib/core/filesystem/folder-notes.logic.ts:19`: `patchContentOrderMap(current, touched, upserted)`.
- `src/lib/app/tauri-listeners.service.ts:137`: accumulate a path -> present map + a full-rescan flag across the throttle window; refresh picks full (rescan, > threshold, property index not ready, no cached snapshot) or incremental.
- CLAUDE.md § Indexing 12 amendment.

## Plan
1. Rust DTO + `absorb` + `get_index_delta`, test-first in `src-tauri/tests/vault_index_test.rs` / `vault_file_ops_test.rs` / `commands/vault_test.rs`; run cargo test, commit with regenerated bindings.
2. TS pure logic (`patchEntriesSnapshot`, `patchContentOrderMap`) + `versionGated.advance`, tests first.
3. Listener: failing tests in `src/tests/lib/app/tauri-listeners.service.test.ts` (one upsert: no whole-vault IPC, stores reflect record; removal drops from property index / snapshot / content order; full rescan re-reads), then the implementation.

Prior art: `tauri-listeners.service.test.ts` "entries fan-out" block (invoke routed per command, real stores, fake timers).

## Risks
- Base snapshot drift: incremental patching carries a stale base forward. Deltas are fetched fresh from Rust and are idempotent; the vault-switch invalidations (`invalidateVaultEntries`) empty the memo so the next refresh is full. Type-def store patches only when its `entries` is the identical base array, else full `setEntries`.
- `fetchSeq` latest-wins guard kept on the entries fan-out.
- JS `<` (UTF-16) vs Rust byte order differ only for astral vs U+E000-U+FFFF chars; only affects snapshot order.
- Delta IPC failure: logged, then a full refresh runs as the fallback.

## Defaults taken
- Threshold: more than 200 changed paths in one window -> full re-read.
- A path whose delta record is missing is treated as removed (covers upsert-then-delete inside a window and stale old-vault tails).
- Archived paths and type metadata still recompute from the patched array (measured 0-1 ms); only the payload and the snapshot stores are patched.
- The HB stall criterion is a manual in-app measurement; not runnable here.
