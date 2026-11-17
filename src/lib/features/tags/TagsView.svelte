<script lang="ts">
	import { untrack } from 'svelte';
	import ArrowDownAZ from '@lucide/svelte/icons/arrow-down-az';
	import ArrowDown01 from '@lucide/svelte/icons/arrow-down-01';
	import Filter from '@lucide/svelte/icons/filter';
	import { tagsStore } from './tags.store.svelte';
	import { scheduleTagIndexRebuild, updateTagSort } from './tags.service';
	import { countVisibleTags, filterTagTree, filterTagTreeByQuery } from './tags.logic';
	import { Button } from '#lib/components/ui/button/index.js';
	import { Input } from '#lib/components/ui/input/index.js';
	import { openSearch } from '#lib/features/search/open-search.service.js';
	import { settingsStore } from '#lib/core/settings/settings.store.svelte.js';
	import { vaultStore } from '#lib/core/vault/vault.store.svelte.js';
	import { setTagColor } from '#lib/utils/tag-colors.js';
	import TagItem from './TagItem.svelte';

	const MIN_COUNT_THRESHOLD = 10;

	function handleTagClick(tag: string) {
		openSearch(`tag:${tag}`);
	}

	function handleColorChange(tag: string, color: string | undefined) {
		const updated = setTagColor(settingsStore.tagColors.colors, tag, color);
		settingsStore.updateTagColors({ colors: updated });
	}

	function toggleSort() {
		const newMode = tagsStore.sortMode === 'name' ? 'count' : 'name';
		updateTagSort(newMode);
	}

	function toggleFilter() {
		tagsStore.setHideRareTags(!tagsStore.hideRareTags);
	}

	/** Filter box text. Local: the view remounts on each tab open, so it starts empty. */
	let query = $state('');

	// The query runs over the whole tree, not the rare-filtered one, so a rare tag
	// that exists is found instead of reported as missing.
	let queryResult = $derived(filterTagTreeByQuery(tagsStore.tagTree, query));
	// An empty query (blank or a bare `#`) hands back the same tree.
	let isQuerying = $derived(queryResult.nodes !== tagsStore.tagTree);

	let displayedTree = $derived(
		isQuerying
			? queryResult.nodes
			: tagsStore.hideRareTags
				? filterTagTree(tagsStore.tagTree, MIN_COUNT_THRESHOLD)
				: tagsStore.tagTree,
	);

	let visibleTagCount = $derived(countVisibleTags(displayedTree));

	// With every tag hidden the body carries the Show all button, so the header
	// keeps the plain total instead of a second control.
	let isPartial = $derived(
		!isQuerying && tagsStore.hideRareTags && visibleTagCount > 0 && visibleTagCount < tagsStore.totalTagCount,
	);

	let isFilteredEmpty = $derived(
		!isQuerying && tagsStore.hideRareTags && tagsStore.tagTree.length > 0 && displayedTree.length === 0,
	);

	// Only the first build replaces the list with the loading line. A refresh over a
	// loaded tree keeps the keyed rows mounted, so expanded tags and scroll survive.
	let isFirstLoad = $derived(tagsStore.isLoading && !tagsStore.hasLoaded);

	$effect(() => {
		void vaultStore.vaultIndexVersion;
		untrack(() => {
			scheduleTagIndexRebuild();
		});
	});
</script>

<div class="flex h-full flex-col overflow-hidden">
	<div class="pane-toolbar">
		<h2 class="font-semibold text-sm text-primary">Tags</h2>
		{#if !isFirstLoad}
			<span class="ml-1 text-xs text-muted-foreground">
				{#if isQuerying}
					{visibleTagCount} matching {visibleTagCount === 1 ? 'tag' : 'tags'}
				{:else if isPartial}
					Showing {visibleTagCount} of {tagsStore.totalTagCount} tags
					<button class="ml-1 text-primary hover:underline cursor-pointer" onclick={toggleFilter}>Show all</button>
				{:else}
					{tagsStore.totalTagCount} {tagsStore.totalTagCount === 1 ? 'tag' : 'tags'}
				{/if}
			</span>
		{/if}
		<div class="ml-auto flex items-center gap-1">
			<Input
				type="text"
				class="h-7 w-32 text-xs"
				placeholder="Filter tags"
				aria-label="Filter tags"
				autocomplete="off"
				spellcheck="false"
				bind:value={query}
			/>
			<button
				class="p-1.5 rounded-md hover:bg-accent transition-colors cursor-pointer"
				onclick={toggleFilter}
				title="{tagsStore.hideRareTags ? 'Turn off rare-tag filter' : 'Hide rare tags'}"
			>
				<Filter class="size-4 {tagsStore.hideRareTags ? 'text-primary' : 'text-muted-foreground'}" />
			</button>
			<button
				class="p-1.5 rounded-md hover:bg-accent transition-colors cursor-pointer"
				onclick={toggleSort}
				title="Sort by {tagsStore.sortMode === 'name' ? 'frequency' : 'name'}"
			>
				{#if tagsStore.sortMode === 'name'}
					<ArrowDownAZ class="size-4 text-muted-foreground" />
				{:else}
					<ArrowDown01 class="size-4 text-muted-foreground" />
				{/if}
			</button>
		</div>
	</div>
	<div class="flex-1 overflow-y-auto p-3">
		{#if isFirstLoad}
			<p class="text-muted-foreground px-2 py-8 text-center">Indexing tags...</p>
		{:else if isFilteredEmpty}
			<div class="flex flex-col items-center gap-3 px-2 py-8 text-center">
				<p class="text-muted-foreground">
					{tagsStore.totalTagCount === 1 ? 'The only tag is' : `All ${tagsStore.totalTagCount} tags are`} used fewer than {MIN_COUNT_THRESHOLD} times.
				</p>
				<Button size="sm" variant="outline" onclick={toggleFilter}>Show all tags</Button>
			</div>
		{:else if isQuerying && displayedTree.length === 0}
			<p class="text-muted-foreground px-2 py-8 text-center">No tags match {query.trim()}</p>
		{:else if displayedTree.length === 0}
			<p class="text-muted-foreground px-2 py-8 text-center">No tags found</p>
		{:else}
			<div class="space-y-0.5">
				{#each displayedTree as node (node.fullPath)}
					<TagItem {node} forceOpen={queryResult.forceOpen} onTagClick={handleTagClick} onColorChange={handleColorChange} />
				{/each}
			</div>
		{/if}
	</div>
</div>
