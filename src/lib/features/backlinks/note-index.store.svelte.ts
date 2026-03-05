import type { WikiLink } from './backlinks.types';

/** Central note index shared across features (backlinks, outgoing-links, tags, search, etc.) */

let noteIndex = $state<Map<string, WikiLink[]>>(new Map());
let noteContents = $state<Map<string, string>>(new Map());
let isLoading = $state(false);

export const noteIndexStore = {
	/** Parsed wikilinks per file path */
	get noteIndex() { return noteIndex; },
	/** Raw content per file path */
	get noteContents() { return noteContents; },
	/** Whether the index is currently being built */
	get isLoading() { return isLoading; },

	setNoteIndex(index: Map<string, WikiLink[]>) { noteIndex = index; },
	setNoteContents(contents: Map<string, string>) { noteContents = contents; },
	setLoading(loading: boolean) { isLoading = loading; },

	/** Updates a single entry in both noteContents and noteIndex atomically */
	updateNoteEntry(path: string, content: string, links: WikiLink[]) {
		noteContents.set(path, content);
		noteContents = noteContents;
		noteIndex.set(path, links);
		noteIndex = noteIndex;
	},

	reset() {
		noteIndex = new Map();
		noteContents = new Map();
		isLoading = false;
	},
};
