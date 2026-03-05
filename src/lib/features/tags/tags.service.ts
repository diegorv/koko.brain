import { noteIndexStore } from '$lib/features/backlinks/note-index.store.svelte';
import { debug, timeSync } from '$lib/utils/debug';
import { tagsStore } from './tags.store.svelte';
import {
	extractAllTags,
	addFileToTagMap,
	removeFileFromTagMap,
	tagMapToEntries,
	tagsEqual,
	buildTagTree,
	sortTagTree,
	type TagAggregateMap,
} from './tags.logic';

/** Persistent aggregate of all tags across the vault, keyed by lowercase tag */
let tagMap: TagAggregateMap = new Map();
/** Reverse index: which tags each file contributes (original case) */
let fileTagsIndex = new Map<string, string[]>();

/**
 * Builds the full tag index from all indexed note contents.
 * Populates the persistent tagMap and fileTagsIndex for incremental updates.
 */
export function buildTagIndex() {
	timeSync('TAGS', 'buildTagIndex', () => {
		tagsStore.setLoading(true);

		const noteContents = noteIndexStore.noteContents;

		tagMap = new Map();
		fileTagsIndex = new Map();

		for (const [filePath, content] of noteContents) {
			const tags = extractAllTags(content);
			fileTagsIndex.set(filePath, tags);
			addFileToTagMap(tagMap, filePath, tags);
		}

		const entries = tagMapToEntries(tagMap);
		const tree = buildTagTree(entries);
		const sorted = sortTagTree(tree, tagsStore.sortMode);

		tagsStore.setTagTree(sorted);
		tagsStore.setTotalTagCount(entries.length);
		tagsStore.setLoading(false);
		debug('TAGS', `Tags: ${entries.length} unique tags`);
	});
}

/**
 * Incrementally updates the tag index for a single file's content change.
 * Skips the update entirely if the file's tags haven't changed.
 */
export function updateTagIndexForFile(filePath: string, content: string) {
	const oldTags = fileTagsIndex.get(filePath) ?? [];
	const newTags = extractAllTags(content);

	if (tagsEqual(oldTags, newTags)) return;

	removeFileFromTagMap(tagMap, filePath, oldTags);
	addFileToTagMap(tagMap, filePath, newTags);
	fileTagsIndex.set(filePath, newTags);

	const entries = tagMapToEntries(tagMap);
	const tree = buildTagTree(entries);
	const sorted = sortTagTree(tree, tagsStore.sortMode);

	tagsStore.setTagTree(sorted);
	tagsStore.setTotalTagCount(entries.length);
}

/**
 * Updates the sort mode and rebuilds the tag tree from the existing aggregate map.
 */
export function updateTagSort(mode: 'name' | 'count') {
	tagsStore.setSortMode(mode);

	const entries = tagMapToEntries(tagMap);
	const tree = buildTagTree(entries);
	const sorted = sortTagTree(tree, mode);

	tagsStore.setTagTree(sorted);
}

/**
 * Removes a file from the tag index when it is deleted or renamed.
 * Updates tagMap, fileTagsIndex, and rebuilds the tag tree.
 */
export function removeFileFromTagIndex(filePath: string) {
	const oldTags = fileTagsIndex.get(filePath);
	if (!oldTags) return;

	removeFileFromTagMap(tagMap, filePath, oldTags);
	fileTagsIndex.delete(filePath);

	const entries = tagMapToEntries(tagMap);
	const tree = buildTagTree(entries);
	const sorted = sortTagTree(tree, tagsStore.sortMode);

	tagsStore.setTagTree(sorted);
	tagsStore.setTotalTagCount(entries.length);
	debug('TAGS', `Removed file from tag index: ${filePath}`);
}

/** Resets all tag state including the persistent aggregate maps. */
export function resetTags() {
	tagMap = new Map();
	fileTagsIndex = new Map();
	tagsStore.reset();
}
