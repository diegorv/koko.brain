import type { PropertyIndexRecord } from './collection.types';

/**
 * Index of all notes and `.view` files with their properties, keyed by file
 * path. Views stay so `kb.page("x.view")` keeps working: a reader that treats
 * the records as notes must skip them with `isViewFile`.
 */
let propertyIndex = $state<Map<string, PropertyIndexRecord>>(new Map());
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
/**
 * Active view index last used in each `.collection` file this session, keyed
 * by absolute path. Plain Map, not `$state`: `CollectionView` reads it once at
 * mount and nothing renders from it.
 */
const viewIndexByPath = new Map<string, number>();

/** Reactive store for the collection property index */
export const collectionStore = {
	get propertyIndex() { return propertyIndex; },
	get isIndexReady() { return isIndexReady; },
	get version() { return version; },

	/** Replaces the entire property index and marks it as ready */
	setPropertyIndex(index: Map<string, PropertyIndexRecord>) {
		propertyIndex = index;
		isIndexReady = true;
		version++;
	},

	/** Updates a single note record in the index */
	updateRecord(path: string, record: PropertyIndexRecord) {
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

	/** Returns the view index last used in the collection at `path`, if any */
	getViewIndex(path: string): number | undefined {
		return viewIndexByPath.get(path);
	},

	/** Remembers `index` as the view last used in the collection at `path` */
	setViewIndex(path: string, index: number) {
		viewIndexByPath.set(path, index);
	},

	/** Forgets the view index remembered for `path` */
	deleteViewIndex(path: string) {
		viewIndexByPath.delete(path);
	},

	/** Paths that currently have a remembered view index */
	viewIndexPaths(): string[] {
		return [...viewIndexByPath.keys()];
	},

	/** Resets the store to its initial state. `version` is deliberately left
	 *  alone: it must stay monotonic across vault switches. */
	reset() {
		propertyIndex = new Map();
		isIndexReady = false;
		viewIndexByPath.clear();
	},
};
