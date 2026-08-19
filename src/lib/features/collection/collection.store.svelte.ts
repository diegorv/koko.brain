import type { NoteRecord } from './collection.types';

/** Index of all notes with their properties, keyed by file path */
let propertyIndex = $state<Map<string, NoteRecord>>(new Map());
/** Whether the property index has been built at least once */
let isIndexReady = $state(false);
/**
 * Monotonic counter bumped on every index mutation. Consumers that snapshot
 * the index into an immutable value (the live-preview collection widget caches
 * a query result per block) compare it to detect staleness: the index size
 * alone misses same-size content swaps. Never reset: a rewind would let a
 * surviving snapshot from the previous vault read as a fresh cache hit, same
 * rationale as `vaultStore.vaultIndexVersion`.
 */
let version = $state(0);

/** Reactive store for the collection property index */
export const collectionStore = {
	get propertyIndex() { return propertyIndex; },
	get isIndexReady() { return isIndexReady; },
	get version() { return version; },

	/** Replaces the entire property index and marks it as ready */
	setPropertyIndex(index: Map<string, NoteRecord>) {
		propertyIndex = index;
		isIndexReady = true;
		version++;
	},

	/** Updates a single note record in the index */
	updateRecord(path: string, record: NoteRecord) {
		const next = new Map(propertyIndex);
		next.set(path, record);
		propertyIndex = next;
		version++;
	},

	/** Removes a note record from the index */
	removeRecord(path: string) {
		const next = new Map(propertyIndex);
		next.delete(path);
		propertyIndex = next;
		version++;
	},

	/** Resets the store to its initial state. `version` is deliberately left
	 *  alone: it must stay monotonic across vault switches. */
	reset() {
		propertyIndex = new Map();
		isIndexReady = false;
	},
};
