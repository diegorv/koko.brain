import { invoke } from '@tauri-apps/api/core';
import { debug, error as errorLog, timeAsync } from '$lib/utils/debug';
import { debounce } from '$lib/utils/debounce';
import { tagsStore } from './tags.store.svelte';
import { buildTagTree, sortTagTree } from './tags.logic';
import type { TagAggregateV2 } from '$lib/types/vault-v2.types';

/**
 * Builds the tag tree from the Rust `VaultIndex`. Phase 7.5 — replaces
 * the previous TS-side `extractAllTags` per-file scan with a single
 * `invoke('get_all_tags_v2')` call that returns the pre-aggregated tag
 * info. The TS pure helpers `buildTagTree` and `sortTagTree` still build
 * the hierarchical UI shape from the flat aggregates.
 *
 * Use this directly only for the initial vault-open build, where we want
 * the tree populated as fast as possible. Reactive rebuilds (panel
 * `$effect` listening to `vaultIndexVersion`) MUST go through
 * `scheduleTagIndexRebuild` so a burst of saves does not produce
 * overlapping concurrent rebuilds of all 3948 unique tags.
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

// --- Debounced reactive rebuild path ---

let isBuilding = false;
let pendingRebuild = false;

async function runScheduledRebuild(): Promise<void> {
	if (isBuilding) {
		pendingRebuild = true;
		return;
	}
	isBuilding = true;
	try {
		await buildTagIndex();
	} finally {
		isBuilding = false;
		if (pendingRebuild) {
			pendingRebuild = false;
			await runScheduledRebuild();
		}
	}
}

const debouncedTrigger = debounce(() => {
	void runScheduledRebuild();
}, 300);

/**
 * Schedules a tag-index rebuild with a 300 ms trailing debounce and
 * single-flight semantics. Multiple calls within the debounce window
 * coalesce into one rebuild; calls that land while a rebuild is
 * in-flight mark a pending re-run that fires once the current rebuild
 * settles. Use this from any reactive consumer of `vaultIndexVersion`.
 *
 * Background: 2026-05-11 log analysis at vault size 4527 notes / 3948
 * tags showed `TagsPanel.svelte`'s `$effect` calling `buildTagIndex`
 * directly with no debounce. A burst of 5 saves produced 4 concurrent
 * rebuilds completing in the same second (705 / 975 / 1241 ms wall) —
 * each scanned all 3948 tags. This wrapper collapses the burst into a
 * single rebuild and serializes any straggler triggers behind it.
 */
export function scheduleTagIndexRebuild(): void {
	debouncedTrigger();
}

/**
 * Flushes any pending debounced trigger and waits for the current
 * rebuild (and any pending re-run) to settle. Test-only convenience —
 * production callers should not depend on synchronous completion.
 */
export async function flushScheduledTagIndexRebuild(): Promise<void> {
	debouncedTrigger.flush();
	while (isBuilding || pendingRebuild) {
		await new Promise((resolve) => setTimeout(resolve, 0));
	}
}

/** Resets all tag state and cancels any pending scheduled rebuild. */
export function resetTags(): void {
	debouncedTrigger.cancel();
	isBuilding = false;
	pendingRebuild = false;
	tagsStore.reset();
}
