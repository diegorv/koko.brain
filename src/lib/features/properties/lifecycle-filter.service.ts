import { invoke } from '@tauri-apps/api/core';
import type { NoteEntryV2 } from '$lib/types/vault-v2.types';
import { buildArchivedPathSet } from './lifecycle-filter.logic';
import { lifecycleFilterStore } from './lifecycle-filter.store.svelte';

/** Fetches all entries and rebuilds the archived path set. */
export async function refreshArchivedPaths(): Promise<void> {
	const entries = await invoke<NoteEntryV2[]>('get_all_vault_entries_v2');
	const paths = buildArchivedPathSet(entries);
	lifecycleFilterStore.setArchivedPaths(paths);
}
