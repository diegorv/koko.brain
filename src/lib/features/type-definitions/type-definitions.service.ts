import { invoke } from '@tauri-apps/api/core';
import type { NoteEntryV2 } from '$lib/types/vault-v2.types';
import { buildTypeMetadataMap } from './type-definitions.logic';
import { typeDefinitionsStore } from './type-definitions.store.svelte';

/** Fetches all vault entries and rebuilds the type metadata map. */
export async function refreshTypeDefinitions(): Promise<void> {
	const entries = await invoke<NoteEntryV2[]>('get_all_vault_entries_v2');
	const map = buildTypeMetadataMap(entries);
	typeDefinitionsStore.setTypeMetadataMap(map);
}
