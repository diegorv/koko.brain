import { readTextFile, writeTextFile } from '@tauri-apps/plugin-fs';
import { syncExternalContentToEditor } from '$lib/core/editor/editor.service';
import {
	parseFrontmatterProperties,
	extractBody,
	rebuildContent,
	updatePropertyValue,
	addProperty,
	removeProperty,
} from '$lib/features/properties/properties.logic';
import type { Property } from '$lib/features/properties/properties.types';
import type { IconPackId } from './file-icons.types';

function upsertProperty(properties: Property[], key: string, value: string): Property[] {
	const exists = properties.some((p) => p.key === key);
	if (exists) return updatePropertyValue(properties, key, value, 'text');
	return updatePropertyValue(addProperty(properties, key), key, value, 'text');
}

/** Writes _icon, _color, and _title_color to a markdown file's frontmatter. */
export async function setFrontmatterIcon(
	filePath: string,
	iconPack: IconPackId,
	iconName: string,
	color?: string,
	titleColor?: string,
): Promise<void> {
	const content = await readTextFile(filePath);
	let properties = parseFrontmatterProperties(content);
	const body = extractBody(content);

	properties = upsertProperty(properties, '_icon', `${iconPack}:${iconName}`);

	if (color) {
		properties = upsertProperty(properties, '_color', color);
	} else {
		properties = removeProperty(properties, '_color');
	}

	if (titleColor) {
		properties = upsertProperty(properties, '_title_color', titleColor);
	} else {
		properties = removeProperty(properties, '_title_color');
	}

	const newContent = rebuildContent(properties, body);
	await writeTextFile(filePath, newContent);
	// `'none'`: the frontmatter was just written to disk above.
	syncExternalContentToEditor(filePath, newContent, true, 'none');
}

/** Removes _icon, _color, and _title_color from a markdown file's frontmatter. */
export async function removeFrontmatterIcon(filePath: string): Promise<void> {
	const content = await readTextFile(filePath);
	let properties = parseFrontmatterProperties(content);
	const body = extractBody(content);

	const before = properties.length;
	properties = removeProperty(properties, '_icon');
	properties = removeProperty(properties, '_color');
	properties = removeProperty(properties, '_title_color');

	if (properties.length === before) return;

	const newContent = rebuildContent(properties, body);
	await writeTextFile(filePath, newContent);
	// `'none'`: the frontmatter was just written to disk above.
	syncExternalContentToEditor(filePath, newContent, true, 'none');
}
