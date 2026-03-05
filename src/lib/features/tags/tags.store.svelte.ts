import type { TagTreeNode, TagSortMode } from './tags.types';

let tagTree = $state<TagTreeNode[]>([]);
let sortMode = $state<TagSortMode>('count');
let hideRareTags = $state(true);
let isLoading = $state(false);
let totalTagCount = $state(0);

export const tagsStore = {
	get tagTree() { return tagTree; },
	get sortMode() { return sortMode; },
	get hideRareTags() { return hideRareTags; },
	get isLoading() { return isLoading; },
	get totalTagCount() { return totalTagCount; },

	setTagTree(tree: TagTreeNode[]) { tagTree = tree; },
	setSortMode(mode: TagSortMode) { sortMode = mode; },
	setHideRareTags(hide: boolean) { hideRareTags = hide; },
	setLoading(loading: boolean) { isLoading = loading; },
	setTotalTagCount(count: number) { totalTagCount = count; },

	reset() {
		tagTree = [];
		sortMode = 'count';
		hideRareTags = true;
		isLoading = false;
		totalTagCount = 0;
	},
};
