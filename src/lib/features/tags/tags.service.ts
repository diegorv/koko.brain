import { invoke } from '@tauri-apps/api/core';
import { debug, error as errorLog, timeAsync } from '$lib/utils/debug';
import { tagsStore } from './tags.store.svelte';
import { buildTagTree, sortTagTree } from './tags.logic';
import type { TagAggregateV2 } from '$lib/types/vault-v2.types';

/**
 * Builds the tag tree from the Rust `VaultIndex`. Phase 7.5 — replaces
 * the previous TS-side `extractAllTags` per-file scan with a single
 * `invoke('get_all_tags_v2')` call that returns the pre-aggregated tag
 * info. The TS pure helpers `buildTagTree` and `sortTagTree` still build
 * the hierarchical UI shape from the flat aggregates.
 */
export async function buildTagIndex(): Promise<void> {
	tagsStore.setLoading(true);
	try {
		await timeAsync('TAGS', 'buildTagIndex', async () => {
			const aggregates = await invoke<TagAggregateV2[]>('get_all_tags_v2');
			const entries = aggregates.map((a) => ({
				name: a.name,
				count: a.count,
				filePaths: a.filePaths,
			}));
			const tree = sortTagTree(buildTagTree(entries), tagsStore.sortMode);
			tagsStore.setTagTree(tree);
			tagsStore.setTotalTagCount(entries.length);
			debug('TAGS', `Tags: ${entries.length} unique tags`);
		});
	} catch (err) {
		errorLog('TAGS', 'buildTagIndex failed:', err);
	} finally {
		tagsStore.setLoading(false);
	}
}

/**
 * Updates the sort mode and re-sorts the existing tree. No IPC — the
 * sort is a pure transformation of the in-memory tree.
 */
export function updateTagSort(mode: 'name' | 'count'): void {
	tagsStore.setSortMode(mode);
	tagsStore.setTagTree(sortTagTree(tagsStore.tagTree, mode));
}

/** Resets all tag state. */
export function resetTags(): void {
	tagsStore.reset();
}
