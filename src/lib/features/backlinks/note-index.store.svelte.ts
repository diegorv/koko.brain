import type { WikiLink } from './backlinks.types';
import { buildResolutionCache, resolveWikilinkCached, type WikilinkResolutionCache } from './backlinks.logic';

/** Central note index shared across features (backlinks, outgoing-links, tags, search, etc.) */

let noteIndex = $state<Map<string, WikiLink[]>>(new Map());
let noteContents = $state<Map<string, string>>(new Map());
let isLoading = $state(false);

/**
 * Reverse backlinks index: maps resolvedTargetPath -> Set<sourcePath>.
 * Enables O(K) lookups in findLinkedMentions instead of O(N) full scan.
 */
let reverseIndex = $state<Map<string, Set<string>>>(new Map());

/** Builds the full reverse index from scratch using the current noteIndex */
function rebuildReverseIndex(): void {
	const allPaths = Array.from(noteContents.keys());
	const cache = buildResolutionCache(allPaths);
	const newReverse = new Map<string, Set<string>>();

	for (const [sourcePath, links] of noteIndex) {
		for (const link of links) {
			const resolved = resolveWikilinkCached(link.target, cache);
			if (resolved) {
				let set = newReverse.get(resolved);
				if (!set) {
					set = new Set();
					newReverse.set(resolved, set);
				}
				set.add(sourcePath);
			}
		}
	}

	reverseIndex = newReverse;
}

/** Incrementally updates the reverse index when a single file's links change */
function updateReverseIndexForFile(sourcePath: string, oldLinks: WikiLink[], newLinks: WikiLink[], cache: WikilinkResolutionCache): void {
	// Remove old reverse entries for this source
	for (const link of oldLinks) {
		const resolved = resolveWikilinkCached(link.target, cache);
		if (resolved) {
			const set = reverseIndex.get(resolved);
			if (set) {
				set.delete(sourcePath);
				if (set.size === 0) reverseIndex.delete(resolved);
			}
		}
	}

	// Add new reverse entries for this source
	for (const link of newLinks) {
		const resolved = resolveWikilinkCached(link.target, cache);
		if (resolved) {
			let set = reverseIndex.get(resolved);
			if (!set) {
				set = new Set();
				reverseIndex.set(resolved, set);
			}
			set.add(sourcePath);
		}
	}

	// Trigger reactivity
	reverseIndex = reverseIndex;
}

export const noteIndexStore = {
	/** Parsed wikilinks per file path */
	get noteIndex() { return noteIndex; },
	/** Raw content per file path */
	get noteContents() { return noteContents; },
	/** Whether the index is currently being built */
	get isLoading() { return isLoading; },
	/** Reverse index: resolvedTargetPath -> Set of source paths that link to it */
	get reverseIndex() { return reverseIndex; },

	/**
	 * Replaces the full note index and rebuilds the reverse index.
	 * IMPORTANT: call `setNoteContents` first on bulk loads — `rebuildReverseIndex`
	 * resolves wikilinks against `noteContents.keys()`, so an out-of-date contents
	 * map leaves `reverseIndex` empty.
	 */
	setNoteIndex(index: Map<string, WikiLink[]>) {
		noteIndex = index;
		rebuildReverseIndex();
	},
	setNoteContents(contents: Map<string, string>) { noteContents = contents; },
	setLoading(loading: boolean) { isLoading = loading; },

	/** Updates a single entry in both noteContents and noteIndex atomically */
	updateNoteEntry(path: string, content: string, links: WikiLink[]) {
		const oldLinks = noteIndex.get(path) ?? [];
		noteContents.set(path, content);
		noteContents = noteContents;
		noteIndex.set(path, links);
		noteIndex = noteIndex;

		// Incrementally update the reverse index
		const allPaths = Array.from(noteContents.keys());
		const cache = buildResolutionCache(allPaths);
		updateReverseIndexForFile(path, oldLinks, links, cache);
	},

	reset() {
		noteIndex = new Map();
		noteContents = new Map();
		reverseIndex = new Map();
		isLoading = false;
	},
};
