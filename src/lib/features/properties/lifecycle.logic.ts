import type { Property } from '#lib/core/frontmatter/properties.types.js';

/** Lifecycle state derived from frontmatter flags. */
export type LifecycleState = 'inbox' | 'organized' | 'archived';

/** Returns the lifecycle state of a note from its properties. */
export function getLifecycleState(properties: Property[]): LifecycleState {
	const archived = properties.find((p) => p.key === '_archived');
	if (archived?.value === true) return 'archived';
	return isOrganized(properties) ? 'organized' : 'inbox';
}

/** Returns whether the note is a favorite. */
export function isFavorite(properties: Property[]): boolean {
	const fav = properties.find((p) => p.key === '_favorite');
	return fav?.value === true;
}

/**
 * Returns whether the note is organized, whatever its archive state. Only a
 * boolean `_organized: false` is not organized; a missing key or a non-boolean
 * value reads as organized, as in the Rust index (`NoteEntry.organized`).
 */
export function isOrganized(properties: Property[]): boolean {
	return properties.find((p) => p.key === '_organized')?.value !== false;
}

/**
 * Sets a boolean flag in properties, creating it if absent.
 * Returns a new array without mutating the original.
 */
export function setBooleanFlag(
	properties: Property[],
	key: string,
	value: boolean,
): Property[] {
	const existing = properties.find((p) => p.key === key);
	if (existing) {
		return properties.map((p) => (p.key === key ? { ...p, value, type: 'boolean' as const } : p));
	}
	return [...properties, { key, value, type: 'boolean' as const }];
}

/**
 * Sets the organized flag. `_archived` is left as-is: restoring an archived
 * note is its own action, so a Cmd+E slip cannot unarchive a note (and fire
 * its type's unarchive auto-organize).
 */
export function toggleOrganized(properties: Property[], organized: boolean): Property[] {
	return setBooleanFlag(properties, '_organized', organized);
}

/**
 * Toggles the archived state. When archiving, leaves organized as-is.
 * When unarchiving, returns to previous organized state.
 */
export function toggleArchived(properties: Property[], archived: boolean): Property[] {
	return setBooleanFlag(properties, '_archived', archived);
}

/** Toggles the favorite flag. */
export function toggleFavorite(properties: Property[], favorite: boolean): Property[] {
	return setBooleanFlag(properties, '_favorite', favorite);
}
