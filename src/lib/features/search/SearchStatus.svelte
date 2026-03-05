<script lang="ts">
	import { searchStore } from './search.store.svelte';
	import { settingsStore } from '$lib/core/settings/settings.store.svelte';
	import BrainIcon from '@lucide/svelte/icons/brain';
	import LoaderIcon from '@lucide/svelte/icons/loader';
	import SearchIcon from '@lucide/svelte/icons/search';
</script>

{#if searchStore.isIndexing}
	<span class="flex items-center gap-1 text-muted-foreground">
		<LoaderIcon class="size-3 animate-spin" />
		Indexing...
	</span>
{:else if searchStore.isSemanticIndexing}
	<span class="flex items-center gap-1 text-muted-foreground">
		<LoaderIcon class="size-3 animate-spin" />
		{searchStore.semanticProgress?.message ?? 'Building embeddings...'}
	</span>
{:else if settingsStore.search.semanticSearchEnabled && searchStore.semanticStats}
	<span class="flex items-center gap-1 text-muted-foreground">
		<BrainIcon class="size-3" />
		{searchStore.indexStats?.totalDocuments ?? 0} notes · {searchStore.semanticStats.totalChunks} chunks
	</span>
{:else if searchStore.indexStats}
	<span class="flex items-center gap-1 text-muted-foreground">
		<SearchIcon class="size-3" />
		{searchStore.indexStats.totalDocuments} notes indexed
	</span>
{/if}
