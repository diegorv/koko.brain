import type { TrashItem } from './trash.types';

// --- Reactive state ---

/** List of items currently in the trash, sorted newest first */
let items = $state<TrashItem[]>([]);
/** True while trash operations (load, move, restore) are in progress */
let loading = $state(false);

/**
 * Central store for the trash system state.
 * Exposes getters for reactive reads and methods for mutations.
 */
export const trashStore = {
	/** All trashed items */
	get items() { return items; },
	/** Whether a trash operation is in progress */
	get loading() { return loading; },
	/** Number of items currently in the trash */
	get count() { return items.length; },
	/** Whether the trash is empty */
	get isEmpty() { return items.length === 0; },

	/** Replaces the entire items list (used on load) */
	setItems(value: TrashItem[]) { items = value; },
	/** Updates the loading flag */
	setLoading(value: boolean) { loading = value; },
	/** Prepends a single item to the list (newest first) */
	addItem(item: TrashItem) { items = [item, ...items]; },
	/** Removes an item by ID */
	removeItem(id: string) { items = items.filter(i => i.id !== id); },
	/** Clears all items from the store */
	clear() { items = []; loading = false; },
};
