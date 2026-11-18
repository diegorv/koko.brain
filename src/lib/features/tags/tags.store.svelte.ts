import type { TagTreeNode, TagSortMode } from './tags.types';

let tagTree = $state<TagTreeNode[]>([]);
let sortMode = $state<TagSortMode>('count');
let hideRareTags = $state(true);
let isLoading = $state(false);
/** True once a tag build has succeeded since the last reset; a failed build leaves it unchanged. */
let hasLoaded = $state(false);
let totalTagCount = $state(0);

export const tagsStore = {
	get tagTree() { return tagTree; },
	get sortMode() { return sortMode; },
	get hideRareTags() { return hideRareTags; },
	get isLoading() { return isLoading; },
	/** Whether a tag tree has been built, so a refresh can keep the current list on screen. */
	get hasLoaded() { return hasLoaded; },
	get totalTagCount() { return totalTagCount; },

	setTagTree(tree: TagTreeNode[]) { tagTree = tree; },
	setSortMode(mode: TagSortMode) { sortMode = mode; },
	setHideRareTags(hide: boolean) { hideRareTags = hide; },
	setLoading(loading: boolean) { isLoading = loading; },
	setHasLoaded(loaded: boolean) { hasLoaded = loaded; },
	setTotalTagCount(count: number) { totalTagCount = count; },

	reset() {
		tagTree = [];
		sortMode = 'count';
		hideRareTags = true;
		isLoading = false;
		hasLoaded = false;
		totalTagCount = 0;
	},
};
