import { readTextFile } from '@tauri-apps/plugin-fs';
import { editorStore } from '#lib/core/editor/editor.store.svelte.js';
import {
	FrontmatterWriteError,
	toastFrontmatterWriteError,
	updateNoteFrontmatter,
} from '#lib/core/frontmatter/frontmatter-write.service.js';
import {
	parseFrontmatterProperties,
	updatePropertyValue,
	addProperty,
	removeProperty,
} from '#lib/core/frontmatter/properties.logic.js';
import type { Property } from '#lib/core/frontmatter/properties.types.js';
import type { IconPackId } from './file-icons.types';

/** The frontmatter keys an icon owns. */
const ICON_KEYS = ['_icon', '_color', '_title_color'];

function upsertProperty(properties: Property[], key: string, value: string): Property[] {
	const exists = properties.some((p) => p.key === key);
	if (exists) return updatePropertyValue(properties, key, value, 'text');
	return updatePropertyValue(addProperty(properties, key), key, value, 'text');
}

function withIconColors(props: Property[], color?: string, titleColor?: string): Property[] {
	const properties = color ? upsertProperty(props, '_color', color) : removeProperty(props, '_color');
	return titleColor
		? upsertProperty(properties, '_title_color', titleColor)
		: removeProperty(properties, '_title_color');
}

/**
 * Runs `updateNoteFrontmatter` and reports a refusal or write failure in a
 * toast. Read errors and anything that is not a `FrontmatterWriteError` propagate.
 * @returns true when the write went through (or changed nothing), false when it failed
 */
async function writeIconFrontmatter(
	filePath: string,
	mutate: (props: Property[]) => Property[],
): Promise<boolean> {
	try {
		await updateNoteFrontmatter(filePath, mutate);
		return true;
	} catch (err) {
		if (!(err instanceof FrontmatterWriteError)) throw err;
		toastFrontmatterWriteError(err);
		return false;
	}
}

/**
 * Writes _icon, _color, and _title_color to a markdown file's frontmatter,
 * keeping unsaved edits of an open tab.
 * @returns false when the write was refused or failed (already toasted)
 */
export async function setFrontmatterIcon(
	filePath: string,
	iconPack: IconPackId,
	iconName: string,
	color?: string,
	titleColor?: string,
): Promise<boolean> {
	return writeIconFrontmatter(filePath, (props) => {
		return withIconColors(upsertProperty(props, '_icon', `${iconPack}:${iconName}`), color, titleColor);
	});
}

/**
 * Writes _color and _title_color to a markdown file's frontmatter, leaving
 * _icon as it is. An absent color removes its key.
 * @returns false when the write was refused or failed (already toasted)
 */
export async function setFrontmatterIconColors(filePath: string, color?: string, titleColor?: string): Promise<boolean> {
	return writeIconFrontmatter(filePath, (props) => withIconColors(props, color, titleColor));
}

/**
 * Removes _icon, _color, and _title_color from a markdown file's frontmatter,
 * keeping unsaved edits of an open tab. A note without any of them is left
 * alone, so a no-op removal never rewrites or refuses.
 * @returns false when the write was refused or failed (already toasted)
 */
export async function removeFrontmatterIcon(filePath: string): Promise<boolean> {
	const tab = editorStore.tabs.find((t) => t.path === filePath);
	const current = tab ? tab.content : await readTextFile(filePath);
	if (!parseFrontmatterProperties(current).some((p) => ICON_KEYS.includes(p.key))) return true;

	return writeIconFrontmatter(filePath, (props) => props.filter((p) => !ICON_KEYS.includes(p.key)));
}
