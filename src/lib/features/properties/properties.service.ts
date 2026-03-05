import { editorStore } from '$lib/core/editor/editor.store.svelte';
import { propertiesStore } from './properties.store.svelte';
import {
	parseFrontmatterProperties,
	extractBody,
	rebuildContent,
	addProperty,
	removeProperty,
	updatePropertyValue,
	renamePropertyKey,
} from './properties.logic';
import type { Property, PropertyType } from './properties.types';

/**
 * Whether to skip the next property parse.
 * Set to true after programmatic edits to prevent the $effect feedback loop.
 */
let skipNextParse = false;

/**
 * Checks and consumes the skip flag.
 * Called by PropertiesView's $effect before re-parsing properties from content.
 * @returns true if the parse should be skipped (flag is reset to false)
 */
export function consumeSkipNextParse(): boolean {
	if (skipNextParse) {
		skipNextParse = false;
		return true;
	}
	return false;
}

/**
 * Pushes updated properties into the store and editor content.
 * Sets skipNextParse to avoid the $effect re-parsing what we just serialized.
 */
function commitChanges(updated: Property[]): void {
	propertiesStore.setProperties(updated);
	const body = extractBody(editorStore.activeTab?.content ?? '');
	const newContent = rebuildContent(updated, body);
	skipNextParse = true;
	editorStore.updateContent(newContent);
}

/** Updates a property's value (and optionally its type) in the active note */
export function updateProperty(
	key: string,
	value: string | number | boolean | string[],
	type?: PropertyType,
): void {
	const updated = updatePropertyValue(propertiesStore.properties, key, value, type);
	commitChanges(updated);
}

/**
 * Renames a property key in the active note.
 * @returns false if the new key already exists (prevents data loss on serialization)
 */
export function renameProperty(oldKey: string, newKey: string): boolean {
	if (propertiesStore.properties.some((p) => p.key === newKey && p.key !== oldKey)) return false;
	const updated = renamePropertyKey(propertiesStore.properties, oldKey, newKey);
	commitChanges(updated);
	return true;
}

/** Removes a property by key from the active note */
export function removePropertyByKey(key: string): void {
	const updated = removeProperty(propertiesStore.properties, key);
	commitChanges(updated);
}

/**
 * Adds a new empty text property to the active note.
 * @returns false if the key is empty or already exists
 */
export function addNewProperty(key: string): boolean {
	const trimmed = key.trim();
	if (!trimmed) return false;
	if (propertiesStore.properties.some((p) => p.key === trimmed)) return false;
	const updated = addProperty(propertiesStore.properties, trimmed);
	commitChanges(updated);
	return true;
}

/** Parses frontmatter properties from content and updates the store */
export function parseAndSetProperties(content: string): void {
	propertiesStore.setProperties(parseFrontmatterProperties(content));
}

/** Resets the properties store to its initial state. Used during vault teardown. */
export function resetProperties(): void {
	skipNextParse = false;
	propertiesStore.reset();
}
