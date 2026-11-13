import { updateNoteFrontmatter } from '#lib/core/frontmatter/frontmatter-write.service.js';
import { removeProperty } from '#lib/core/frontmatter/properties.logic.js';
import type { Property } from '#lib/core/frontmatter/properties.types.js';
import { vaultStore } from '#lib/core/vault/vault.store.svelte.js';
import type { ListSortConfig } from './list-toolbar.types';
import { formatListSort } from './list-sort.logic';

/**
 * Sets `key` to `value` in place, or appends it. An empty list is removed
 * rather than written as `[]`, so a type with no pills has no key at all.
 */
function withProperty(props: Property[], property: Property | null, key: string): Property[] {
	if (!property) return removeProperty(props, key);
	if (!props.some((p) => p.key === key)) return [...props, property];
	return props.map((p) => (p.key === key ? property : p));
}

/** The last queued write of each path. */
const queuedWrites = new Map<string, Promise<unknown>>();

/**
 * Runs `write` after the writes already queued for `path`, whether they failed
 * or not. `updateNoteFrontmatter` and the `.view` writers read, then write, so
 * two overlapping saves on one file would lose the first one's field.
 * @param path - absolute path of the file being written
 * @param write - the read-then-write to run
 */
export function serializeListWrite<T>(path: string, write: () => Promise<T>): Promise<T> {
	const previous = queuedWrites.get(path) ?? Promise.resolve();
	const next = previous.then(write, write);
	queuedWrites.set(path, next);
	const forget = () => {
		if (queuedWrites.get(path) === next) queuedWrites.delete(path);
	};
	next.then(forget, forget);
	return next;
}

/** Writes one key of a definition note in the queue of its path. */
function saveDefinitionProperty(definitionPath: string, key: string, property: Property | null): Promise<void> {
	return serializeListWrite(definitionPath, async () => {
		// The rail reads this key from the index snapshot: skip the refresh throttle.
		vaultStore.requestPromptIndexRefresh();
		await updateNoteFrontmatter(definitionPath, (props) => withProperty(props, property, key));
	});
}

/**
 * Saves the pill keys a type's list shows, as `_list_properties_display` on its
 * definition note. An empty list removes the key. Errors propagate to the caller.
 * @param definitionPath - absolute path of the type's definition note
 * @param properties - frontmatter keys in display order
 */
export function saveTypeListProperties(definitionPath: string, properties: readonly string[]): Promise<void> {
	const key = '_list_properties_display';
	return saveDefinitionProperty(definitionPath, key, properties.length === 0 ? null : { key, value: [...properties], type: 'list' });
}

/**
 * Saves a type's list order as `_list_sort` (`<option>:<direction>`) on its
 * definition note; null removes the key, back to the lens's own order. Errors
 * propagate to the caller.
 * @param definitionPath - absolute path of the type's definition note
 * @param config - the order to save, or null to reset
 */
export function saveTypeListSort(definitionPath: string, config: ListSortConfig | null): Promise<void> {
	const key = '_list_sort';
	return saveDefinitionProperty(definitionPath, key, config ? { key, value: formatListSort(config), type: 'text' } : null);
}
