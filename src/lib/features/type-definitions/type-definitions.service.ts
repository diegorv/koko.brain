import { invoke } from '@tauri-apps/api/core';
import { readTextFile, writeTextFile } from '@tauri-apps/plugin-fs';
import type { NoteEntryV2 } from '$lib/types/vault-v2.types';
import { parseFrontmatterProperties, extractBody, rebuildContent, updatePropertyValue, addProperty } from '$lib/features/properties/properties.logic';
import { buildTypeMetadataMap } from './type-definitions.logic';
import { typeDefinitionsStore } from './type-definitions.store.svelte';

/** Rebuilds the type metadata map. Fetches entries if not provided. */
export async function refreshTypeDefinitions(entries?: NoteEntryV2[]): Promise<void> {
	const data = entries ?? await invoke<NoteEntryV2[]>('get_all_vault_entries_v2');
	const map = buildTypeMetadataMap(data);
	typeDefinitionsStore.setTypeMetadataMap(map);
}

function upsertProperty(properties: ReturnType<typeof parseFrontmatterProperties>, key: string, value: string) {
	const exists = properties.some((p) => p.key === key);
	if (exists) return updatePropertyValue(properties, key, value, 'text');
	return updatePropertyValue(addProperty(properties, key), key, value, 'text');
}

/** Updates _icon and _color in a type definition note's frontmatter. */
export async function updateTypeDefinitionIcon(
	path: string,
	iconName: string | null,
	color: string | null,
): Promise<void> {
	const content = await readTextFile(path);
	let properties = parseFrontmatterProperties(content);
	const body = extractBody(content);

	if (iconName) properties = upsertProperty(properties, '_icon', iconName);
	if (color) properties = upsertProperty(properties, '_color', color);

	const newContent = rebuildContent(properties, body);
	await writeTextFile(path, newContent);
}
