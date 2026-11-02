import { call } from '#lib/contracts/ipc.js';
import { versionGated } from '#lib/utils/inflight.js';
import type { NoteEntryV2 } from '#lib/types/vault-v2.types.js';
import { patchEntriesSnapshot } from './vault-entries.logic';
import { vaultStore } from './vault.store.svelte';

/**
 * The one holder of the `get_all_vault_entries_v2` snapshot for the repeat
 * readers (wikilink completion, the queryjs widget, the
 * `vault-index-updated` fan-out). Keyed on `vaultStore.vaultIndexVersion`:
 * one IPC per index version, however many consumers ask for it.
 *
 * This is a CACHE, not a mirror: the Rust `VaultIndex` stays the source of
 * truth (ADR 0025). The cached snapshot is only as fresh as the last version
 * bump, and that bump is throttled (2 s after an isolated event, at most one
 * per 10 s during a burst; at once after `vaultStore.requestPromptIndexRefresh()`)
 * in `tauri-listeners.service.ts::registerVaultIndexUpdatedListener`. That
 * listener advances the memo with `patchVaultEntries` for an incremental
 * change, so a version bump usually costs a per-path delta, not this IPC.
 *
 * The version counter is process-global and never rewound (see
 * `vault.store.svelte.ts::resetIndexReady`), so it cannot scope the snapshot
 * to a vault on its own. `invalidateVaultEntries()` is what does that, and
 * `app-lifecycle.service.ts` calls it on vault open and vault close.
 */
const vaultEntriesMemo = versionGated<NoteEntryV2[]>(
	() => call('get_all_vault_entries_v2'),
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

/** The changes a refresh window made to the index, as `patchVaultEntries` applies them. */
export interface EntriesDelta {
	/** Current entries of the changed paths still in the index. */
	upserted: NoteEntryV2[];
	/** Changed paths no longer in the index. */
	removed: string[];
}

/** The snapshot a patch started from and the one it produced. */
export interface EntriesPatch {
	/** The cached snapshot the delta was applied to. */
	previous: NoteEntryV2[];
	/** `previous` with the delta applied; now cached for the current version. */
	entries: NoteEntryV2[];
}

/**
 * Advances the snapshot to the current index version by applying the delta
 * from `readDelta` to the cached snapshot (whatever version it was read
 * at), so readers at the new version share the patched array instead of a
 * fresh `get_all_vault_entries_v2`. Returns null without calling
 * `readDelta` when no snapshot is cached (the caller does a whole-vault
 * read). A delta failure rejects the result and drops the cached entry.
 */
export function patchVaultEntries(readDelta: () => Promise<EntriesDelta>): Promise<EntriesPatch> | null {
	const out: { patch?: Promise<EntriesPatch> } = {};
	const installed = vaultEntriesMemo.advance((cached) => {
		const patch = Promise.all([cached, readDelta()]).then(([previous, delta]) => ({
			previous,
			entries: patchEntriesSnapshot(previous, delta.upserted, delta.removed),
		}));
		out.patch = patch;
		return patch.then((p) => p.entries);
	});
	return installed && out.patch ? out.patch : null;
}
