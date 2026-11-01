# 34: Save dirty tabs before the vault switches, so the last save keeps its history snapshot and search row

**What to build:** On a vault switch from A to B with a dirty tab, the last save of A's tabs loses its file-history snapshot and its FTS5/semantic update. Confirmed by reading the code:
1. `switchVault` (vault.service.ts:16-17) opens B.
2. The layout `$effect` (`+layout.svelte:61`) calls `initializeVault(B)`.
3. `initializeVault` drops the history and search after-save observers (app-lifecycle.service.ts:164-171) before it saves the dirty tabs (:177).
4. `saveFileByPath` (editor.service.ts:139-141) calls `notifyAfterSave`, which no longer has either observer.

Reordering the unsubscribe is not a fix: both observers read `vaultStore.path`, which is already B by then (file-history.service.ts:112, search.service.ts:315). Search would skip the file (`vaultRelativeKey` returns null), and history would store the snapshot under an absolute-path key (file-history.logic.ts:110-111).

Fix: in `switchVault`, call `saveAllDirtyTabs()`, then the existing `drainEventCalendarWrites()`, then `vaultStore.open`. That matches the order in `initializeVault` (:177 save, :183 drain), and the path is still A with the observers live. Deep links go through `switchVault` too (deep-link.service.ts:138). Keep the save at :177 as a no-op safety net, or remove it only with the CLAUDE.md removal proof.

**Blocked by:** none

**Status:** needs-triage

**Gate:** `pnpm check` + `pnpm vitest run` + `pnpm build`

**Source:** src/lib/core/vault/vault.service.ts:16-17, src/lib/core/app-lifecycle/app-lifecycle.service.ts:162-183, src/lib/core/editor/editor.service.ts:139-141, src/lib/features/file-history/file-history.service.ts:112, src/lib/features/search/search.service.ts:315, src/lib/features/deep-link/deep-link.service.ts:138; commit b1db2329 (since then the snapshot is missing; before it, it was stored under the wrong key)

- [ ] A failing test comes first, with real stores and only Tauri APIs mocked: open vault A, make a tab dirty, call `switchVault(B)`. Assert that a file-history snapshot was written for the A file under A's vault-relative key, and that the FTS update was invoked with A's vault-relative key
- [ ] After the fix the test passes, and also passes for the deep-link entry point
- [ ] No save happens after `vaultStore.path` becomes B for a file of A
- [ ] The event-calendar drain (:183) still runs; whether the path-change consumer dropped at :162-163 matters is recorded in the commit message

## Notes

- **Impact:** the FTS row heals on the next open, because `build_search_index` reconciles against disk (fts_repo.rs:37). The history snapshot is lost for good. Not verified: whether the semantic index heals.
- **Found by** the issue-21 verification on 2026-11-01. Not run in the app.
- **Size:** S.
