import { naturalCompare } from '#lib/core/filesystem/fs.logic.js';
import type { LensNote } from '#lib/features/rail-shell/rail-shell.types.js';

/**
 * The underscore keys the picker may offer. The other `_` keys are the
 * app's own bookkeeping (`_type`, `_organized`, ...), not user properties.
 */
const RELATION_KEYS = ['_belongs_to', '_related_to', '_has_many'];

/** One row of the "Show in note list" picker. */
export interface ListPropertyItem {
	/** The frontmatter key, with its underscores */
	key: string;
	/** The key without its leading underscores, shown to the user */
	label: string;
	/** Whether the key is shown in the note list */
	selected: boolean;
}

/**
 * The keys the picker offers: every visible key any listed note carries,
 * the relation keys present in those notes, and every selected key (a key
 * may be selected before any note in the lens carries it).
 *
 * @param notes - The notes of the lens being configured
 * @param selected - The keys currently shown in the note list
 * @returns The keys, sorted by natural name order
 */
export function availableListProperties(notes: readonly LensNote[], selected: readonly string[]): string[] {
	const keys = new Set<string>();
	for (const note of notes) {
		for (const key of Object.keys(note.frontmatter)) {
			if (!key.startsWith('_') || RELATION_KEYS.includes(key)) keys.add(key);
		}
	}
	for (const key of selected) keys.add(key);
	return [...keys].sort(naturalCompare);
}

/**
 * The name a property shows under in the picker and in the note list.
 *
 * @param key - The frontmatter key
 * @returns The key without its leading underscores
 */
export function propertyDisplayLabel(key: string): string {
	return key.replace(/^_+/, '');
}

/**
 * Lists the selected keys first, in their saved order, then the other
 * available keys. A selected key that no note offers is dropped, so a stale
 * pick does not show as an empty row.
 *
 * @param selected - The keys shown in the note list, in display order
 * @param available - The keys the picker offers
 * @returns One item per key, selected items first
 */
export function orderedPropertyItems(selected: readonly string[], available: readonly string[]): ListPropertyItem[] {
	const availableSet = new Set(available);
	const items: ListPropertyItem[] = [];
	const seen = new Set<string>();
	for (const key of selected) {
		if (!availableSet.has(key) || seen.has(key)) continue;
		seen.add(key);
		items.push({ key, label: propertyDisplayLabel(key), selected: true });
	}
	for (const key of available) {
		if (seen.has(key)) continue;
		seen.add(key);
		items.push({ key, label: propertyDisplayLabel(key), selected: false });
	}
	return items;
}

/**
 * Keeps the items whose display label contains the query, ignoring case.
 *
 * @param items - The picker rows
 * @param query - What the user typed; blank keeps every item
 * @returns The matching items, in their input order
 */
export function filterPropertyItems(items: readonly ListPropertyItem[], query: string): ListPropertyItem[] {
	const needle = query.trim().toLowerCase();
	if (needle === '') return [...items];
	return items.filter((item) => item.label.toLowerCase().includes(needle));
}

/**
 * Adds the key to the list when absent, removes it when present.
 *
 * @param current - The keys shown in the note list
 * @param key - The key the user clicked
 * @returns A new array
 */
export function toggleListProperty(current: readonly string[], key: string): string[] {
	return current.includes(key) ? current.filter((k) => k !== key) : [...current, key];
}

/**
 * Moves `fromKey` to the index `toKey` holds, the way a drag onto a row does.
 *
 * @param current - The keys shown in the note list, in display order
 * @param fromKey - The key being dragged
 * @param toKey - The key it is dropped on
 * @returns A new array, or `current` itself when nothing moves
 */
export function moveListProperty(current: string[], fromKey: string, toKey: string): string[] {
	const fromIndex = current.indexOf(fromKey);
	const toIndex = current.indexOf(toKey);
	if (fromKey === toKey || fromIndex === -1 || toIndex === -1) return current;
	const next = [...current];
	next.splice(fromIndex, 1);
	next.splice(toIndex, 0, fromKey);
	return next;
}
