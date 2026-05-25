import { invoke } from '@tauri-apps/api/core';
import { readDir, writeTextFile } from '@tauri-apps/plugin-fs';
import type { NoteEntryV2 } from '$lib/types/vault-v2.types';
import { vaultStore } from '$lib/core/vault/vault.store.svelte';
import { openFileInEditor } from '$lib/core/editor/editor.service';
import { openOrCreateNote } from '$lib/core/note-creator/note-creator.service';
import { createFile } from '$lib/core/filesystem/fs.service';
import { generateUniqueName } from '$lib/core/filesystem/fs.logic';
import { buildTypeMetadataMap } from './type-definitions.logic';
import { typeDefinitionsStore } from './type-definitions.store.svelte';

/** Rebuilds the type metadata map. Fetches entries if not provided. */
export async function refreshTypeDefinitions(entries?: NoteEntryV2[]): Promise<void> {
	const data = entries ?? await invoke<NoteEntryV2[]>('get_all_vault_entries_v2');
	const map = buildTypeMetadataMap(data);
	typeDefinitionsStore.setTypeMetadataMap(map);
}

/** Creates a new note of a given type, applying the type's template if configured. */
export async function createNoteOfType(typeName: string): Promise<void> {
	if (!vaultStore.path) return;
	const entries = await readDir(vaultStore.path);
	const siblingNames = entries.map((e) => e.name);
	const uniqueName = generateUniqueName(`Untitled ${typeName}.md`, false, siblingNames);
	const filePath = `${vaultStore.path}/${uniqueName}`;
	const title = uniqueName.replace(/\.md$/, '');
	const metadata = typeDefinitionsStore.typeMetadataMap.get(typeName);
	const templatePath = metadata?.template
		? `${vaultStore.path}/${metadata.template}`
		: undefined;
	const inlineTemplate = `---\ntype: ${typeName}\n---\n`;
	await openOrCreateNote({ filePath, templatePath, inlineTemplate, title });
}

/** Creates a type definition note with default frontmatter and opens it. */
export async function createTypeDefinition(typeName: string): Promise<void> {
	if (!vaultStore.path) return;
	const content = `---\ntype: Type\n_visible: true\n---\n\n# ${typeName}\n`;
	const filePath = await createFile(vaultStore.path, `${typeName}.md`);
	if (!filePath) return;
	await writeTextFile(filePath, content);
	openFileInEditor(filePath);
}
