import { invoke } from '@tauri-apps/api/core';
import type { NoteEntryV2 } from '$lib/types/vault-v2.types';
import { buildArchivedPathSet } from './lifecycle-filter.logic';
import { lifecycleFilterStore } from './lifecycle-filter.store.svelte';

/** Rebuilds the archived path set. Fetches entries if not provided. */
export async function refreshArchivedPaths(entries?: NoteEntryV2[]): Promise<void> {
	const data = entries ?? await invoke<NoteEntryV2[]>('get_all_vault_entries_v2');
	const paths = buildArchivedPathSet(data);
	lifecycleFilterStore.setArchivedPaths(paths);
}
