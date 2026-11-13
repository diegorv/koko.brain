---
summary: "Open-vault state, safe vault switch and exit sequences, write barriers and the cached vault entries snapshot."
---

## Responsibility

Owns the frontend view of the open vault: its path and name, the persisted recent-vaults list, and the index readiness flag and version counter that mirror the Rust VaultIndex (vaultStore). It owns the orderly switch and exit sequences: save dirty tabs, ask before discarding failed saves, drain registered write barriers, and for exit flush settings (vault.service.ts, exit.service.ts, write-barrier.service.ts). It also holds the version-gated cache of the get_all_vault_entries_v2 snapshot. It does not build the index (src/lib/app and Rust), watch the filesystem (core/filesystem and Rust) or own note content (core/editor).

## Key files

- `src/lib/core/vault/vault.store.svelte.ts`: vaultStore: path, name, isOpen, recent vaults, index version, index readiness and the prompt-refresh flag.
- `src/lib/core/vault/vault.service.ts`: switchVault, openVaultDialog and openRecentVault.
- `src/lib/core/vault/exit.service.ts`: prepareForExit and confirmDiscardFailedSaves.
- `src/lib/core/vault/write-barrier.service.ts`: registerWriteBarrier and drainPendingWrites.
- `src/lib/core/vault/vault-entries.service.ts`: Version-gated memo over get_all_vault_entries_v2 with getVaultEntries, invalidateVaultEntries and patchVaultEntries.
- `src/lib/core/vault/vault-entries.logic.ts`: patchEntriesSnapshot, the pure merge of a per-path delta into a path-sorted entries array.
- `src/lib/core/vault/vault.logic.ts`: RecentVault type, updateRecentVaults and extractVaultName.

## State

- vaultStore module state: vault path and name, recent vaults, index version, index readiness, readiness suppression flag, prompt refresh flag
- localStorage key kokobrain:recent-vaults holding the recent vaults list
- Write-barrier registry: module-level array in write-barrier.service.ts
- Entries snapshot memo in vault-entries.service.ts keyed on the index version

## Collaborators

- `IPC:get_all_vault_entries_v2`: The only IPC invoked from this folder, in vault-entries.service.ts.
- `event:vault-index-updated`: Emitted by Rust. tauri-listeners.service.ts listens and calls bumpVaultIndexVersion, patchVaultEntries and invalidateVaultEntries.
- `src/lib/app`: app-lifecycle.service.ts resets index readiness and invalidates the entries memo on vault open and close; boot.ts registers the event-calendar write barrier; tauri-listeners.service.ts calls prepareForExit on window close and quit; editor-host.ts reads getVaultEntries.
- `src/routes`: (app)/+page.svelte calls openVaultDialog and openRecentVault.
- `src/lib/core/editor`: saveAllDirtyTabs is called first by switchVault and prepareForExit.
- `src/lib/core/settings`: prepareForExit calls flushSettingsPersistence after the barriers drain; UpdateSection.svelte calls prepareForExit.
- `src/lib/core/filesystem`: Reads vaultStore.path throughout the tree, watcher and change services.
- `src/lib/features`: deep-link calls switchVault. Event-calendar and properties read getVaultEntries, and many features read vaultStore.
- `src/lib/plugins`: The mods app service and the queryjs block widget read getVaultEntries, and plugins read vaultStore.

## Gotchas

- vaultIndexVersion is process-global and never rewound, and the entries memo keys on it. Vault open and close must call invalidateVaultEntries(), which app-lifecycle.service.ts does, or the next vault could read the previous vault's snapshot.
- resetIndexReady() suppresses readiness, so bumpVaultIndexVersion() does not set indexReady until markIndexReady() runs. The throttled vault-index-updated listener outlives teardown, and tail events from the old vault must not clear the Indexing placeholder.
- switchVault saves dirty tabs and drains write barriers before vaultStore.open(). The file-history and search after-save observers and the calendar writes behind the barrier key on vaultStore.path, so the path must not change first.
- Write barriers registered with registerWriteBarrier are app-lifetime and currently registered only by app/boot.ts. initializeVault unregisters its vault-lifetime registrations before draining, so a barrier in that list would be missing when needed.
- prepareForExit flushes the debounced settings write only after the discard prompt, so a cancelled exit does not flush.
- openRecentVault logs and continues when exists() throws. A missing path is removed from the recent list and a toast is shown.
- patchEntriesSnapshot assumes its base array is sorted by path in code-unit order, the same order as Rust's get_all_vault_entries_v2.
- The recent-vaults list is read from localStorage inside try/catch but written without one. vaultStore._reset exists only for tests.
