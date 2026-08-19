import { invoke } from '@tauri-apps/api/core';
import { versionGated } from '$lib/utils/inflight';
import type { NoteEntryV2 } from '$lib/types/vault-v2.types';
import { vaultStore } from './vault.store.svelte';

/**
 * The one holder of the `get_all_vault_entries_v2` snapshot for the repeat
 * readers (wikilink completion, the queryjs widget, the
 * `vault-index-updated` fan-out). Keyed on `vaultStore.vaultIndexVersion`:
 * one IPC per index version, however many consumers ask for it.
 *
 * This is a CACHE, not a mirror: the Rust `VaultIndex` stays the source of
 * truth (ADR 0025). The cached snapshot is only as fresh as the last version
 * bump, and that bump is debounced by 300 ms in
 * `tauri-listeners.service.ts::registerVaultIndexUpdatedListener`.
 *
 * The version counter is process-global and never rewound (see
 * `vault.store.svelte.ts::resetIndexReady`), so it cannot scope the snapshot
 * to a vault on its own. `invalidateVaultEntries()` is what does that, and
 * `app-lifecycle.service.ts` calls it on vault open and vault close.
 */
const vaultEntriesMemo = versionGated<NoteEntryV2[]>(
	() => invoke<NoteEntryV2[]>('get_all_vault_entries_v2'),
	() => vaultStore.vaultIndexVersion,
);

/**
 * Returns the full vault entries snapshot for the current index version.
 * Repeat calls at the same version share one IPC; a rejection is propagated
 * to the caller and never cached.
 */
export function getVaultEntries(): Promise<NoteEntryV2[]> {
	return vaultEntriesMemo.get();
}

/**
 * Drops the cached snapshot. Called at every vault-lifecycle point where the
 * version counter keeps running but the vault behind it changed, so the next
 * read cannot serve the previous vault's notes.
 */
export function invalidateVaultEntries(): void {
	vaultEntriesMemo.invalidate();
}
