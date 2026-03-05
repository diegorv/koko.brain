import type { BacklinkEntry } from './backlinks.types';
import { noteIndexStore } from './note-index.store.svelte';

let linkedMentions = $state<BacklinkEntry[]>([]);
let unlinkedMentions = $state<BacklinkEntry[]>([]);

export const backlinksStore = {
	get linkedMentions() { return linkedMentions; },
	get unlinkedMentions() { return unlinkedMentions; },

	setLinkedMentions(entries: BacklinkEntry[]) { linkedMentions = entries; },
	setUnlinkedMentions(entries: BacklinkEntry[]) { unlinkedMentions = entries; },

	reset() {
		linkedMentions = [];
		unlinkedMentions = [];
		noteIndexStore.reset();
	},
};
