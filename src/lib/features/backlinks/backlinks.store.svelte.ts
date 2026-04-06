import type { BacklinkEntry } from './backlinks.types';
import { noteIndexStore } from './note-index.store.svelte';

let linkedMentions = $state<BacklinkEntry[]>([]);
let unlinkedMentions = $state<BacklinkEntry[]>([]);
/** When true, unlinked mentions are stale and need recomputation */
let unlinkedDirty = $state(false);

export const backlinksStore = {
	get linkedMentions() { return linkedMentions; },
	get unlinkedMentions() { return unlinkedMentions; },
	get unlinkedDirty() { return unlinkedDirty; },

	setLinkedMentions(entries: BacklinkEntry[]) { linkedMentions = entries; },
	setUnlinkedMentions(entries: BacklinkEntry[]) {
		unlinkedMentions = entries;
		unlinkedDirty = false;
	},
	/** Marks unlinked mentions as stale without recomputing them */
	markUnlinkedDirty() { unlinkedDirty = true; },

	reset() {
		linkedMentions = [];
		unlinkedMentions = [];
		unlinkedDirty = false;
		noteIndexStore.reset();
	},
};
