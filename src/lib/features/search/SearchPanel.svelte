<script lang="ts">
	import { untrack } from 'svelte';
	import Search from '@lucide/svelte/icons/search';
	import X from '@lucide/svelte/icons/x';
	import Loader2 from '@lucide/svelte/icons/loader-2';
	import { Separator } from '#lib/components/ui/separator/index.js';
	import { ScrollArea } from '#lib/components/ui/scroll-area/index.js';
	import { searchStore } from './search.store.svelte';
	import SearchResultItem from './SearchResult.svelte';
	import type { SearchMode } from './search.types';

	interface Props {
		/** Fill the rail shell's note list: the input sits in the header strip, Escape only leaves the input */
		rail?: boolean;
	}

	let { rail = false }: Props = $props();

	let inputEl: HTMLInputElement | undefined = $state();

	// Focus on each `requestFocus` ("/" while Search is already shown). Classic
	// also focuses on every mount, since it mounts only when opened. The rail
	// panel also mounts on Cmd+2, at start with a saved Search rail item and on a
	// layout switch: there it focuses on mount only for a request not yet handled.
	$effect(() => {
		const request = searchStore.focusRequest;
		untrack(() => {
			if (rail && request === searchStore.handledFocusRequest) return;
			inputEl?.focus();
			searchStore.markFocusHandled();
		});
	});

	function handleInput(e: Event) {
		const target = e.target as HTMLInputElement;
		searchStore.setQuery(target.value);
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key !== 'Escape') return;
		if (rail) inputEl?.blur();
		else searchStore.setOpen(false);
	}

	function handleClose() {
		searchStore.setOpen(false);
	}

	function setMode(m: SearchMode) {
		searchStore.setMode(m);
	}

	function toggleFuzzy() {
		searchStore.setFuzzyEnabled(!searchStore.fuzzyEnabled);
	}

	const modes: { value: SearchMode; label: string }[] = [
		{ value: 'text', label: 'Text' },
		{ value: 'semantic', label: 'Semantic' },
		{ value: 'hybrid', label: 'Hybrid' },
	];

	const hasResults = $derived(
		searchStore.mode === 'text'
			? searchStore.ftsResults.length > 0 || searchStore.results.length > 0
			: searchStore.mode === 'semantic'
				? searchStore.semanticResults.length > 0
				: searchStore.hybridResults.length > 0,
	);

	const resultCount = $derived(
		searchStore.mode === 'text'
			? searchStore.ftsResults.length || searchStore.results.length
			: searchStore.mode === 'semantic'
				? searchStore.semanticResults.length
				: searchStore.hybridResults.length,
	);
</script>

<div class="flex h-full flex-col bg-file-explorer-bg {rail ? 'text-file-explorer-fg' : ''}" data-rail-search={rail ? '' : undefined}>
	{#if rail}
		<!-- The note list header strip; pl-6 clears the macOS traffic lights, which overflow the 48 px rail. -->
		<div
			class="flex h-10 shrink-0 items-center bg-tab-bar pl-6 pr-3"
			style="box-shadow: inset 0 -1px 0 var(--divider)"
			data-tauri-drag-region
			data-rail-search-header
		>
			{@render searchInput()}
		</div>
	{:else}
		<div class="flex items-center justify-end h-10 px-3 bg-tab-bar shrink-0" data-tauri-drag-region>
			<button
				class="p-1 rounded-md hover:bg-file-explorer-accent transition-colors cursor-pointer"
				onclick={handleClose}
				aria-label="Close search"
			>
				<X class="size-3.5 text-file-explorer-muted-fg" />
			</button>
		</div>
		<Separator />
	{/if}
	<div class="px-2 py-1.5 space-y-1.5 shrink-0">
		{#if !rail}
			<div class="flex items-center">
				<h2 class="text-xs font-semibold uppercase tracking-wide text-file-explorer-primary">Search</h2>
			</div>
			{@render searchInput()}
		{/if}

		<!-- Mode toggle -->
		<div class="flex gap-0.5 rounded-md bg-muted p-0.5">
			{#each modes as m}
				<button
					class="flex-1 rounded px-2 py-0.5 text-[10px] font-medium transition-colors cursor-pointer
						{searchStore.mode === m.value ? 'bg-background text-file-explorer-fg shadow-sm' : 'text-file-explorer-muted-fg hover:text-file-explorer-fg'}
						{m.value !== 'text' && !searchStore.modelAvailable ? 'opacity-40 cursor-not-allowed' : ''}"
					disabled={m.value !== 'text' && !searchStore.modelAvailable}
					onclick={() => setMode(m.value)}
				>
					{m.label}
				</button>
			{/each}
		</div>

		<!-- Index stats + progress -->
		<div class="flex items-center gap-2 text-[10px] text-file-explorer-muted-fg">
			{#if searchStore.isIndexing || searchStore.isSemanticIndexing}
				<Loader2 class="size-3 animate-spin" />
				<span>
					{searchStore.semanticProgress?.message ?? 'Building index...'}
				</span>
			{:else if searchStore.indexStats}
				<span>Indexed: {searchStore.indexStats.totalDocuments} notes</span>
				{#if searchStore.semanticStats}
					<span>· {searchStore.semanticStats.totalChunks} chunks</span>
				{/if}
			{/if}
		</div>
	</div>
	<ScrollArea class="flex-1 min-h-0">
		<div class="px-2 pb-2">
			{#if searchStore.isSearching}
				<p class="text-xs text-file-explorer-muted-fg text-center py-4">Searching...</p>
			{:else if !searchStore.query.trim()}
				<p class="text-xs text-file-explorer-muted-fg text-center py-4">Type to search across all files</p>
			{:else if !hasResults}
				<p class="text-xs text-file-explorer-muted-fg text-center py-4">No results found</p>
			{:else}
				<p class="text-[10px] text-file-explorer-muted-fg mb-1">
					{resultCount} {resultCount === 1 ? 'result' : 'results'}
				</p>
				<div class="divide-y divide-divider/20">
					{#if searchStore.mode === 'text'}
						{#if searchStore.ftsResults.length > 0}
							{#each searchStore.ftsResults as ftsResult (ftsResult.path)}
								<SearchResultItem {ftsResult} />
							{/each}
						{:else}
							{#each searchStore.results as result (result.filePath)}
								<SearchResultItem legacyResult={result} />
							{/each}
						{/if}
					{:else if searchStore.mode === 'semantic'}
						{#each searchStore.semanticResults as semanticResult (semanticResult.key)}
							<SearchResultItem {semanticResult} />
						{/each}
					{:else}
						{#each searchStore.hybridResults as hybridResult (hybridResult.path)}
							<SearchResultItem {hybridResult} />
						{/each}
					{/if}
				</div>
			{/if}
		</div>
	</ScrollArea>
</div>

{#snippet searchInput()}
	<div class="relative {rail ? 'flex-1' : ''}">
		<Search class="absolute left-2 top-1/2 -translate-y-1/2 size-3.5 text-file-explorer-muted-fg" />
		<input
			bind:this={inputEl}
			type="text"
			placeholder="Search vault..."
			value={searchStore.query}
			oninput={handleInput}
			onkeydown={handleKeydown}
			class="w-full rounded-md border border-file-explorer-border bg-background px-2 py-1.5 pl-7 pr-8 text-xs text-file-explorer-fg placeholder:text-file-explorer-muted-fg focus:outline-none focus:ring-1 focus:ring-ring"
		/>
		{#if searchStore.mode === 'text'}
			<button
				class="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-mono px-1 rounded cursor-pointer transition-colors {searchStore.fuzzyEnabled ? 'bg-file-explorer-primary/20 text-file-explorer-primary' : 'text-file-explorer-muted-fg hover:text-file-explorer-fg'}"
				onclick={toggleFuzzy}
				title={searchStore.fuzzyEnabled ? 'Fuzzy matching enabled' : 'Fuzzy matching disabled'}
			>~</button>
		{/if}
	</div>
{/snippet}
