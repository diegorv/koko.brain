import { invoke } from '@tauri-apps/api/core';
import type { NoteEntryV2 } from '$lib/types/vault-v2.types';
import { buildTypeMetadataMap } from './type-definitions.logic';
import { typeDefinitionsStore } from './type-definitions.store.svelte';

/** Rebuilds the type metadata map. Fetches entries if not provided. */
export async function refreshTypeDefinitions(entries?: NoteEntryV2[]): Promise<void> {
	const data = entries ?? await invoke<NoteEntryV2[]>('get_all_vault_entries_v2');
	const map = buildTypeMetadataMap(data);
	typeDefinitionsStore.setTypeMetadataMap(map);
}
