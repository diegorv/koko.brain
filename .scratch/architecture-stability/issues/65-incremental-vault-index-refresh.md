# 65: A single-note change re-reads and re-parses the whole vault twice on the main thread

**What to build:** `refresh()` in `src/lib/app/tauri-listeners.service.ts` (~:145) runs on every `vault-index-updated` (at once after a lifecycle click that calls `vaultStore.requestPromptIndexRefresh()`, throttled otherwise). It calls `buildPropertyIndex()` (`invoke('get_all_property_records')`, every note) and `getVaultEntries()` (`get_all_vault_entries_v2`, every note), even when the event came from one note's save. The webview deserializes both payloads on the main thread and the consumers rebuild their whole snapshots.

Make the refresh incremental for the common case: the `vault-index-updated` payload carries the paths that changed (upserted and removed), and the TS side patches the property index, the entries snapshot (and the version-keyed memo in `core/vault/vault-entries.service.ts`), the type-definition entries and the content order for those paths only. A full re-read stays the path for a full rescan (`scan_vault_v2*`) or a batch above a threshold.

**Blocked by:** none

**Status:** resolved

**Gate:** Both: `cargo test --manifest-path src-tauri/Cargo.toml` + `pnpm check` + `pnpm vitest run` + `pnpm build` (the event payload is an IPC DTO, so the ts-rs bindings regenerate).

**Files:** src-tauri/src/vault/,src/lib/contracts/generated/,src/lib/app/tauri-listeners.service.ts,src/lib/features/collection/collection.service.ts,src/lib/core/vault/vault-entries.service.ts,src/lib/features/type-definitions/,src/tests/lib/app/

**Source:** `/diagnosing-bugs` session on UI sluggishness, 2026-11-01, branch `perf/nav-stall-probe` (measured with the `[HB] stall` / `[NAV]` heartbeat probe from commit `10290ab6`).

- [x] A failing test first: a `vault-index-updated` event for one upserted path triggers no `get_all_property_records` / `get_all_vault_entries_v2` call, and the property index and entries snapshot reflect that note's new record
- [x] A removed path drops the note from the property index, the entries snapshot and the content order
- [x] A full rescan event still re-reads the whole vault, as today
- [ ] Measured in the app with Heartbeat on: a favorite toggle on a 10k-note vault produces no `[HB] stall` line

## Notes

- **Size:** L. Touches the Rust event payload (IPC DTO), so it needs owner design input before it is `ready-for-agent`.
- **Measurements (10,628 notes, after commits `8a77ecaf` and `283a49ad`):** Rust answers each whole-vault command in 53-93 ms, but the payload reaches JS 0.65-1.1 s later; one favorite toggle still costs one main-thread stall of 308-369 ms, which starts before the first refresh step runs (payload deserialization). Per-step costs with a forced `flushSync`: `buildMap` 5-16 ms, `setPropertyIndex` 1-2 ms, `refreshArchivedPaths` 0-1 ms, `refreshTypeDefinitions` 0 ms, `typeDefinitionsStore.setEntries` 23-28 ms.
- CLAUDE.md § Indexing 12 documents the version-keyed snapshot memo as deliberate (one IPC per version shared by all readers); this Issue keeps the memo and changes what a version bump costs, so that section needs an amendment.
- Related open work in the same area: check Issues 37 (invoke-site migration) and 62 (event registry) for overlap before design.

## Comments

- 2026-11-01, branch `issue/65-incremental-vault-index-refresh`: a single-path `vault-index-updated` event now patches the property index and the entries snapshot from the changed records instead of re-reading the whole vault; a full rescan still re-reads everything. Round 1 fixes: late whole property reads replay the deltas logged after their start, a failed whole read forces a whole read on the next window, store comments name `patchEntries`, listener JSDoc trimmed. Tests: full suite at e7b11d4f exit=0 (415 files, 9797 passed, 1 skipped, 1 todo), build ok; `pnpm check` 0 errors. Reviews: round 1 APPROVED (fix round ran), round 2 APPROVED (two nits, no change; Heartbeat 10k-note measurement left to the owner).
