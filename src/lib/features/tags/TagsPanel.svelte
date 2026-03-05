<script lang="ts">
	import { ArrowDownAZ, ArrowDown01, Filter } from 'lucide-svelte';
	import { Separator } from '$lib/components/ui/separator';
	import { tagsStore } from './tags.store.svelte';
	import { updateTagSort } from './tags.service';
	import { filterTagTree } from './tags.logic';
	import { searchStore } from '$lib/features/search/search.store.svelte';
	import { settingsStore } from '$lib/core/settings/settings.store.svelte';
	import { saveSettings } from '$lib/core/settings/settings.service';
	import { vaultStore } from '$lib/core/vault/vault.store.svelte';
	import { debounce } from '$lib/utils/debounce';
	import { setTagColor } from './tag-colors.logic';
	import { error } from '$lib/utils/debug';
	import TagItem from './TagItem.svelte';

	const MIN_COUNT_THRESHOLD = 1;

	const debouncedSave = debounce(() => {
		if (vaultStore.path) {
			saveSettings(vaultStore.path).catch((err) =>
				error('TAGS', 'Failed to save tag colors:', err)
			);
		}
	}, 300);

	function handleTagClick(tag: string) {
		searchStore.setQuery(`tag:${tag}`);
		searchStore.setOpen(true);
	}

	function handleColorChange(tag: string, color: string | undefined) {
		const updated = setTagColor(settingsStore.tagColors.colors, tag, color);
		settingsStore.updateTagColors({ colors: updated });
		debouncedSave();
	}

	function toggleSort() {
		const newMode = tagsStore.sortMode === 'name' ? 'count' : 'name';
		updateTagSort(newMode);
	}

	function toggleFilter() {
		tagsStore.setHideRareTags(!tagsStore.hideRareTags);
	}

	let displayedTree = $derived(
		tagsStore.hideRareTags
			? filterTagTree(tagsStore.tagTree, MIN_COUNT_THRESHOLD)
			: tagsStore.tagTree,
	);
</script>

<div class="flex flex-col">
	<div class="flex items-center h-10 px-3 shrink-0">
		<h2 class="font-semibold uppercase tracking-wide text-primary">Tags</h2>
		<div class="ml-auto flex items-center gap-0.5">
			<button
				class="p-1 rounded-md hover:bg-accent transition-colors cursor-pointer"
				onclick={toggleFilter}
				title="{tagsStore.hideRareTags ? 'Show all tags' : 'Hide rare tags'}"
			>
				<Filter class="size-3.5 {tagsStore.hideRareTags ? 'text-primary' : 'text-muted-foreground'}" />
			</button>
			<button
				class="p-1 rounded-md hover:bg-accent transition-colors cursor-pointer"
				onclick={toggleSort}
				title="Sort by {tagsStore.sortMode === 'name' ? 'frequency' : 'name'}"
			>
				{#if tagsStore.sortMode === 'name'}
					<ArrowDownAZ class="size-3.5 text-muted-foreground" />
				{:else}
					<ArrowDown01 class="size-3.5 text-muted-foreground" />
				{/if}
			</button>
		</div>
	</div>
	<Separator />
	<div class="max-h-[50vh] overflow-y-auto p-2">
		{#if tagsStore.isLoading}
			<p class="text-muted-foreground px-2 py-4 text-center">Indexing tags...</p>
		{:else if displayedTree.length === 0}
			<p class="text-muted-foreground px-2 py-4 text-center">No tags found</p>
		{:else}
			<p class="text-xs text-foreground/50 px-2 mb-2">
				{tagsStore.totalTagCount} {tagsStore.totalTagCount === 1 ? 'tag' : 'tags'}
			</p>
			<div class="space-y-0.5">
				{#each displayedTree as node (node.fullPath)}
					<TagItem {node} onTagClick={handleTagClick} onColorChange={handleColorChange} />
				{/each}
			</div>
		{/if}
	</div>
</div>
