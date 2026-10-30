import { editorStore } from '#lib/core/editor/editor.store.svelte.js';
import { syncExternalContentToEditor } from '#lib/core/editor/editor.service.js';
import { canonicalizeKey } from '#lib/utils/frontmatter-aliases.js';
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
 * Path of the note whose next property parse should be skipped, or null.
 * Set after programmatic edits to prevent the $effect feedback loop. It names
 * the note the commit wrote, so a tab switch before the debounced parse fires
 * does not skip the parse of the newly active note.
 */
let skipNextParseFor: string | null = null;

/**
 * Checks and consumes the skip flag.
 * Called by PropertiesView's $effect before re-parsing properties from content.
 * The flag is cleared on every call, whichever path it names.
 * @param path - the active note about to be parsed
 * @returns true if the last commit wrote `path` and the parse should be skipped
 */
export function consumeSkipNextParse(path: string | null): boolean {
	const skip = skipNextParseFor !== null && skipNextParseFor === path;
	skipNextParseFor = null;
	return skip;
}

/**
 * Whether the store's properties were parsed from the active note. When they
 * were not (a tab switch inside the panel's re-parse debounce), re-parses the
 * active note so the panel shows its own properties, and returns false: the
 * caller must drop its commit, which was computed from another note's
 * properties and would write them into the active note.
 */
export function propertiesMatchActiveNote(): boolean {
	const activePath = editorStore.activeTabPath;
	if (propertiesStore.sourcePath === activePath) return true;
	parseAndSetProperties(editorStore.activeTab?.content ?? '', activePath);
	return false;
}

/**
 * Pushes updated properties into the store and editor content.
 * Arms the skip flag to avoid the $effect re-parsing what we just serialized.
 * @returns false when the commit was refused (see propertiesMatchActiveNote)
 */
function commitChanges(updated: Property[]): boolean {
	if (!propertiesMatchActiveNote()) return false;
	const activePath = editorStore.activeTabPath;
	propertiesStore.setProperties(updated, activePath);
	const body = extractBody(editorStore.activeTab?.content ?? '');
	const newContent = rebuildContent(updated, body);
	skipNextParseFor = activePath;
	if (activePath) {
		// Dirty-aware: only `content` is updated (preserves savedContent so the
		// dirty flag stays true until the user saves). `'frontmatter'`: this
		// rewrites the frontmatter block only, so it takes the 500 ms timer
		// even when the note had no frontmatter before.
		syncExternalContentToEditor(activePath, newContent, false, 'frontmatter');
	}
	return true;
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
 *   or the commit was refused (properties belong to another note)
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
	return commitChanges(updated);
}

/** Removes a property by key from the active note */
export function removePropertyByKey(key: string): void {
	const updated = removeProperty(propertiesStore.properties, key);
	commitChanges(updated);
}

/**
 * Adds a new empty text property to the active note.
 * @returns false if the key is empty or already exists, or the commit was refused
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
	return commitChanges(updated);
}

/**
 * Parses frontmatter properties from content and updates the store.
 * @param path - the note `content` belongs to
 */
export function parseAndSetProperties(content: string, path: string | null): void {
	propertiesStore.setProperties(parseFrontmatterProperties(content), path);
}

/** Resets the properties store to its initial state. Used during vault teardown. */
export function resetProperties(): void {
	skipNextParseFor = null;
	propertiesStore.reset();
}
