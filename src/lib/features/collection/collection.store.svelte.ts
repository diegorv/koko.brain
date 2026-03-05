import type { NoteRecord } from './collection.types';

/** Index of all notes with their properties, keyed by file path */
let propertyIndex = $state<Map<string, NoteRecord>>(new Map());
/** Whether the property index has been built at least once */
let isIndexReady = $state(false);

/** Reactive store for the collection property index */
export const collectionStore = {
	get propertyIndex() { return propertyIndex; },
	get isIndexReady() { return isIndexReady; },

	/** Replaces the entire property index and marks it as ready */
	setPropertyIndex(index: Map<string, NoteRecord>) {
		propertyIndex = index;
		isIndexReady = true;
	},

	/** Updates a single note record in the index */
	updateRecord(path: string, record: NoteRecord) {
		const next = new Map(propertyIndex);
		next.set(path, record);
		propertyIndex = next;
	},

	/** Removes a note record from the index */
	removeRecord(path: string) {
		const next = new Map(propertyIndex);
		next.delete(path);
		propertyIndex = next;
	},

	/** Resets the store to its initial state */
	reset() {
		propertyIndex = new Map();
		isIndexReady = false;
	},
};
