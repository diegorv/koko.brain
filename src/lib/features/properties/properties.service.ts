import { editorStore } from '$lib/core/editor/editor.store.svelte';
import { syncExternalContentToEditor } from '$lib/core/editor/editor.service';
import { canonicalizeKey } from '$lib/utils/frontmatter-aliases';
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
	const activePath = editorStore.activeTabPath;
	if (activePath) {
		// Dirty-aware: only `content` is updated (preserves savedContent so the
		// dirty flag stays true until the user saves). `'frontmatter'`: this
		// rewrites the frontmatter block only, so it takes the 500 ms timer
		// even when the note had no frontmatter before.
		syncExternalContentToEditor(activePath, newContent, false, 'frontmatter');
	}
}

/**
 * Finds the stored property matching `key` canonically (alias-aware).
 * `color` matches a stored `_color`, mirroring renameProperty/addNewProperty.
 */
function findCanonicalTwin(key: string): Property | undefined {
	const canonical = canonicalizeKey(key);
	return propertiesStore.properties.find((p) => canonicalizeKey(p.key) === canonical);
}

/** Updates a property's value (and optionally its type) in the active note */
export function updateProperty(
	key: string,
	value: string | number | boolean | string[],
	type?: PropertyType,
): void {
	// Resolve aliases to the stored key so the update lands on the canonical twin.
	const targetKey = findCanonicalTwin(key)?.key ?? key;
	const updated = updatePropertyValue(propertiesStore.properties, targetKey, value, type);
	commitChanges(updated);
}

/** Creates or updates a property in one commit */
export function upsertProperty(
	key: string,
	value: string | number | boolean | string[],
	type?: PropertyType,
): void {
	// Compare canonically: appending `color` when `_color` exists would create
	// a duplicate that dedupeCanonicalKeys silently drops on the next parse.
	const existing = findCanonicalTwin(key);
	if (existing) {
		const updated = updatePropertyValue(propertiesStore.properties, existing.key, value, type);
		commitChanges(updated);
	} else {
		const t = type ?? (Array.isArray(value) ? 'list' : 'text');
		const updated = [...propertiesStore.properties, { key, value, type: t } as Property];
		commitChanges(updated);
	}
}

/**
 * Renames a property key in the active note.
 * @returns false if the new key already exists (prevents data loss on serialization)
 */
export function renameProperty(oldKey: string, newKey: string): boolean {
	// Compare canonically: renaming to an alias whose canonical twin already
	// exists (e.g. -> `color` while `_color` is present) would collide on
	// serialize and lose data. Reject it, honoring this function's contract.
	const canonicalNew = canonicalizeKey(newKey);
	if (
		propertiesStore.properties.some(
			(p) => p.key !== oldKey && canonicalizeKey(p.key) === canonicalNew,
		)
	)
		return false;
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
	// Compare canonically: adding an alias (`color`) when its canonical twin
	// (`_color`) already exists would collide on serialize and destroy the
	// existing value. Reject the duplicate up front.
	const canonical = canonicalizeKey(trimmed);
	if (propertiesStore.properties.some((p) => canonicalizeKey(p.key) === canonical)) return false;
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
