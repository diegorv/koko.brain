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

/**
 * Updates _icon and _color in a type definition note's frontmatter.
 * Delegates to the unified frontmatter icon service. Icon names without
 * a pack prefix are stored as `lucide:name`.
 */
export async function updateTypeDefinitionIcon(
	path: string,
	iconName: string | null,
	color: string | null,
): Promise<void> {
	if (!iconName && !color) return;
	const { setFrontmatterIcon, setFrontmatterIconColor } = await import('$lib/features/file-icons/frontmatter-icon.service');
	if (iconName) {
		await setFrontmatterIcon(path, 'lucide', iconName, color ?? undefined);
	} else if (color) {
		await setFrontmatterIconColor(path, color);
	}
}
