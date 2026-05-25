import type { Property } from './properties.types';

/** Lifecycle state derived from frontmatter flags. */
export type LifecycleState = 'inbox' | 'organized' | 'archived';

/** Returns the lifecycle state of a note from its properties. */
export function getLifecycleState(properties: Property[]): LifecycleState {
	const archived = properties.find((p) => p.key === '_archived');
	if (archived?.value === true) return 'archived';
	const organized = properties.find((p) => p.key === '_organized');
	if (organized?.value === true) return 'organized';
	return 'inbox';
}

/** Returns whether the note is a favorite. */
export function isFavorite(properties: Property[]): boolean {
	const fav = properties.find((p) => p.key === '_favorite');
	return fav?.value === true;
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
 * Removes a boolean flag from properties (when setting to default/false
 * and we prefer to not clutter frontmatter).
 */
export function removeBooleanFlag(properties: Property[], key: string): Property[] {
	return properties.filter((p) => p.key !== key);
}

/**
 * Toggles the organized state. When marking organized, also removes
 * archived flag if present.
 */
export function toggleOrganized(properties: Property[], organized: boolean): Property[] {
	let result = setBooleanFlag(properties, '_organized', organized);
	if (organized) {
		result = removeBooleanFlag(result, '_archived');
	}
	return result;
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
