<script lang="ts">
	import { untrack } from 'svelte';
	import LoaderCircle from '@lucide/svelte/icons/loader-circle';
	import Search from '@lucide/svelte/icons/search';
	import { Button } from '#lib/components/ui/button/index.js';
	import { ScrollArea } from '#lib/components/ui/scroll-area/index.js';
	import { settingsStore } from '#lib/core/settings/settings.store.svelte.js';
	import { settingsPanelStore } from '#lib/core/settings/settings-panel.store.svelte.js';
	import { resolveRovingFocus, tabStopRow } from '#lib/utils/roving-list.js';
	import { searchStore } from './search.store.svelte';
	import { isBelowSemanticMinimum, SEMANTIC_MIN_QUERY_CHARS } from './search.logic';
	import { performSearch } from './search.service';
	import SearchResultItem from './SearchResult.svelte';
	import type { SearchMode } from './search.types';

	interface Props {
		/** True when no navigator sits between the panel and the rail, so its header must clear the macOS traffic lights */
		firstPane?: boolean;
	}

	let { firstPane = false }: Props = $props();

	let inputEl: HTMLInputElement | undefined = $state();

	// Focus on each `requestFocus` ("/" while Search is already shown). The panel
	// also mounts on Cmd+2 and at start with a saved Search rail item: it focuses
	// on mount only for a request not yet handled.
	$effect(() => {
		const request = searchStore.focusRequest;
		untrack(() => {
			if (request === searchStore.handledFocusRequest) return;
			inputEl?.focus();
			searchStore.markFocusHandled();
		});
	});

	function handleInput(e: Event) {
		const target = e.target as HTMLInputElement;
		searchStore.setQuery(target.value);
	}

	/** True when Meta, Ctrl, Alt or Shift is held */
	function hasModifier(e: KeyboardEvent): boolean {
		return e.metaKey || e.ctrlKey || e.altKey || e.shiftKey;
	}

	// The first Escape clears the query, the next one leaves the input; the
	// rail list search closes in one press, this panel stays shown.
	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			if (searchStore.query !== '') searchStore.setQuery('');
			else inputEl?.blur();
			return;
		}
		if (e.key !== 'ArrowDown' || hasModifier(e)) return;
		const first = resultButtons()[0];
		if (!first) return;
		e.preventDefault();
		first.focus();
	}

	let listEl: HTMLElement | undefined = $state();

	/** The rendered results' card buttons, in display order. The Show in Calendar button beside a card is not a row. */
	function resultButtons(): HTMLElement[] {
		return Array.from(listEl?.querySelectorAll<HTMLElement>('[data-search-result] > button:first-child') ?? []);
	}

	/** The current mode's row keys, in the order the `{#each}` blocks below render them */
	const rowKeys = $derived(
		searchStore.mode === 'text'
			? searchStore.ftsResults.length > 0
				? searchStore.ftsResults.map((r) => r.path)
				: searchStore.results.map((r) => r.filePath)
			: searchStore.mode === 'semantic'
				? searchStore.semanticResults.map((r) => r.key)
				: searchStore.hybridResults.map((r) => r.path),
	);

	/** The row that last took focus; a key no longer listed hands the Tab stop to the first row */
	let currentKey: string | null = $state(null);

	/** The one result in the Tab order */
	const tabStopKey = $derived(tabStopRow(rowKeys, rowKeys, currentKey));

	function handleListFocusin(e: FocusEvent) {
		const index = resultButtons().indexOf(e.target as HTMLElement);
		if (index >= 0) currentKey = rowKeys[index] ?? null;
	}

	// Enter is handled here, not left to the button's native activation, so a
	// held Enter opens the note once.
	function handleListKeydown(e: KeyboardEvent) {
		const rows = resultButtons();
		const index = rows.indexOf(e.target as HTMLElement);
		if (index < 0) return;
		if (!hasModifier(e) && e.key === 'Enter') {
			e.preventDefault();
			if (!e.repeat) rows[index].click();
			return;
		}
		if (!hasModifier(e) && e.key === 'ArrowUp' && index === 0) {
			e.preventDefault();
			inputEl?.focus();
			return;
		}
		const next = resolveRovingFocus({
			key: e.key,
			onRow: true,
			meta: e.metaKey,
			ctrl: e.ctrlKey,
			alt: e.altKey,
			shift: e.shiftKey,
			index,
			count: rows.length,
		});
		if (next === null) return;
		e.preventDefault();
		rows[next].focus();
	}

	/** Semantic and Hybrid need the setting on and the model loaded; turning the setting off does not reset `modelAvailable` */
	const semanticAvailable = $derived(settingsStore.search.semanticSearchEnabled && searchStore.modelAvailable);

	/** Why Semantic and Hybrid are unavailable; the buttons' tooltip and the inline note */
	const unavailableReason = $derived(
		settingsStore.search.semanticSearchEnabled
			? 'Semantic search is starting...'
			: 'Semantic search is off. Turn it on in Settings > Search.',
	);

	/** The inline note under the mode toggle, kept in the panel so its Settings link is keyboard-reachable */
	let showUnavailableNote = $state(false);

	// A semantic mode that becomes unavailable (the setting turned off) falls
	// back to Text and says why.
	$effect(() => {
		const available = semanticAvailable;
		const mode = searchStore.mode;
		untrack(() => {
			if (available) {
				showUnavailableNote = false;
			} else if (mode !== 'text') {
				searchStore.setMode('text');
				showUnavailableNote = true;
			}
		});
	});

	function activateMode(m: SearchMode) {
		if (m !== 'text' && !semanticAvailable) {
			showUnavailableNote = true;
			return;
		}
		if (m === 'text') showUnavailableNote = false;
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

	const hasQuery = $derived(searchStore.query.trim() !== '');

	/** Semantic and Hybrid return nothing under the Rust minimum, so say why instead of "No results found" */
	const isShortQuery = $derived(hasQuery && searchStore.mode !== 'text' && isBelowSemanticMinimum(searchStore.query));

	const showError = $derived(hasQuery && !isShortQuery && !searchStore.isSearching && searchStore.searchError !== null);

	/** A running search keeps the current mode's list (it may be an older query's) on screen */
	const showResults = $derived(hasResults && !isShortQuery && !showError);

	/** How long a search runs before the list dims and the spinner shows; sooner would blink on every keystroke past the 200 ms debounce */
	const SLOW_SEARCH_MS = 300;

	/** True once the running search has taken `SLOW_SEARCH_MS` */
	let searchSlow = $state(false);

	$effect(() => {
		if (!searchStore.isSearching) return;
		const timer = setTimeout(() => {
			searchSlow = true;
		}, SLOW_SEARCH_MS);
		return () => {
			clearTimeout(timer);
			searchSlow = false;
		};
	});

	/** Text of the one persistent status region; empty while there is nothing to announce */
	const statusText = $derived.by(() => {
		if (!hasQuery || showError) return '';
		if (isShortQuery) return `Type at least ${SEMANTIC_MIN_QUERY_CHARS} characters`;
		if (!hasResults) return searchStore.isSearching ? 'Searching...' : 'No results found';
		// "+" when a cap cut the list: more matches may exist
		return `${resultCount}${searchStore.resultsCapped ? '+' : ''} ${resultCount === 1 ? 'result' : 'results'}`;
	});

	const statusClass = $derived(
		!statusText
			? ''
			: showResults
				? 'text-meta text-file-explorer-muted-fg mb-1'
				: 'text-xs text-file-explorer-muted-fg text-center py-4',
	);
</script>

<div class="flex h-full flex-col bg-list-bg text-file-explorer-fg" data-rail-search>
	<!-- The note list header strip; as the first pane, the pad clears the macOS traffic lights and the rail toggle. -->
	<div
		class="flex h-10 shrink-0 items-center bg-tab-bar pr-3 {firstPane ? 'pl-[var(--rail-header-pad)]' : 'pl-3'}"
		style="box-shadow: inset 0 -1px 0 var(--divider)"
		data-tauri-drag-region
		data-rail-search-header
	>
		{@render searchInput()}
	</div>
	<div class="px-2 py-1.5 space-y-1.5 shrink-0">
		<!-- Mode toggle -->
		<div class="flex gap-0.5 rounded-md bg-muted p-0.5" role="group" aria-label="Search mode">
			{#each modes as m}
				{@const unavailable = m.value !== 'text' && !semanticAvailable}
				<!-- aria-disabled, not disabled: the button stays focusable and activating it shows the note -->
				<button
					type="button"
					aria-pressed={searchStore.mode === m.value}
					aria-disabled={unavailable ? 'true' : undefined}
					title={unavailable ? unavailableReason : undefined}
					class="flex-1 rounded-xs px-2 py-0.5 text-label font-medium transition-colors cursor-pointer
						{searchStore.mode === m.value ? 'bg-background text-file-explorer-fg shadow-sm' : 'text-file-explorer-muted-fg hover:text-file-explorer-fg'}
						{unavailable ? 'opacity-40 cursor-not-allowed' : ''}"
					onclick={() => activateMode(m.value)}
				>
					{m.label}
				</button>
			{/each}
		</div>
		{#if showUnavailableNote}
			<p class="text-meta text-file-explorer-muted-fg" data-search-mode-note>
				{unavailableReason}
				<button
					type="button"
					class="cursor-pointer text-file-explorer-primary underline underline-offset-2 hover:text-file-explorer-fg"
					onclick={() => settingsPanelStore.open('search')}
				>Open Settings &gt; Search</button>
			</p>
		{/if}
	</div>
	<ScrollArea class="flex-1 min-h-0">
		<div class="px-2 pb-2">
			<!-- One live region, kept across states so assistive tech announces each change -->
			<p role="status" class={statusClass}>{statusText}</p>
			{#if !hasQuery}
				<div class="text-xs text-file-explorer-muted-fg text-center py-4 space-y-1">
					<p>Type to search across all files</p>
					{#if searchStore.mode === 'text'}
						<!-- Semantic and Hybrid ignore the operators -->
						<p>Try tag:work or path:Projects</p>
					{/if}
				</div>
			{:else if showError}
				<div role="alert" class="flex flex-col items-center gap-2 py-4">
					<p class="text-xs text-file-explorer-muted-fg text-center">Search failed</p>
					<Button variant="outline" size="sm" onclick={() => performSearch()}>Retry</Button>
				</div>
			{:else if showResults}
				<!-- svelte-ignore a11y_no_static_element_interactions (roving-focus list: the result buttons take the keys) -->
				<div
					bind:this={listEl}
					class="divide-y divide-divider/20 transition-opacity {searchSlow ? 'opacity-50' : ''}"
					aria-busy={searchSlow ? 'true' : undefined}
					data-search-result-list
					onkeydown={handleListKeydown}
					onfocusin={handleListFocusin}
				>
					{#if searchStore.mode === 'text'}
						{#if searchStore.ftsResults.length > 0}
							{#each searchStore.ftsResults as ftsResult (ftsResult.path)}
								<SearchResultItem {ftsResult} tabindex={ftsResult.path === tabStopKey ? 0 : -1} />
							{/each}
						{:else}
							{#each searchStore.results as result (result.filePath)}
								<SearchResultItem legacyResult={result} tabindex={result.filePath === tabStopKey ? 0 : -1} />
							{/each}
						{/if}
					{:else if searchStore.mode === 'semantic'}
						{#each searchStore.semanticResults as semanticResult (semanticResult.key)}
							<SearchResultItem {semanticResult} tabindex={semanticResult.key === tabStopKey ? 0 : -1} />
						{/each}
					{:else}
						{#each searchStore.hybridResults as hybridResult (hybridResult.path)}
							<SearchResultItem {hybridResult} tabindex={hybridResult.path === tabStopKey ? 0 : -1} />
						{/each}
					{/if}
				</div>
			{/if}
		</div>
	</ScrollArea>
</div>

{#snippet searchInput()}
	<div class="relative flex-1">
		<Search class="absolute left-2 top-1/2 -translate-y-1/2 size-3.5 text-file-explorer-muted-fg" />
		<input
			bind:this={inputEl}
			type="text"
			placeholder="Search vault..."
			aria-label="Search vault"
			value={searchStore.query}
			oninput={handleInput}
			onkeydown={handleKeydown}
			class="w-full rounded-md border border-file-explorer-border bg-background px-2 py-1.5 pl-7 {searchStore.mode === 'text' ? 'pr-12' : 'pr-8'} text-xs text-file-explorer-fg placeholder:text-file-explorer-muted-fg focus:outline-none focus:ring-1 focus:ring-ring"
		/>
		{#if searchSlow}
			<!-- Decorative: the role="status" region carries the Searching text -->
			<span
				data-search-spinner
				class="text-file-explorer-muted-fg pointer-events-none absolute top-1/2 -translate-y-1/2 {searchStore.mode === 'text' ? 'right-7' : 'right-2'}"
				aria-hidden="true"
			>
				<LoaderCircle class="size-3.5 animate-spin" />
			</span>
		{/if}
		{#if searchStore.mode === 'text'}
			<button
				class="absolute right-2 top-1/2 -translate-y-1/2 text-label font-mono px-1 rounded-xs cursor-pointer transition-colors {searchStore.fuzzyEnabled ? 'bg-file-explorer-primary/20 text-file-explorer-primary' : 'text-file-explorer-muted-fg hover:text-file-explorer-fg'}"
				onclick={toggleFuzzy}
				aria-label="Fuzzy matching"
				aria-pressed={searchStore.fuzzyEnabled}
				title={searchStore.fuzzyEnabled ? 'Fuzzy matching enabled' : 'Fuzzy matching disabled'}
			>~</button>
		{/if}
	</div>
{/snippet}
