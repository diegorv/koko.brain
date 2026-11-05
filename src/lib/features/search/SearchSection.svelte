<script lang="ts">
	import { untrack } from 'svelte';
	import { call } from '#lib/contracts/ipc.js';
	import { Button } from '#lib/components/ui/button/index.js';
	import { Switch } from '#lib/components/ui/switch/index.js';
	import Loader2Icon from '@lucide/svelte/icons/loader-circle';
	import { settingsStore } from '#lib/core/settings/settings.store.svelte.js';
	import { vaultStore } from '#lib/core/vault/vault.store.svelte.js';
	import { searchStore } from '#lib/features/search/search.store.svelte.js';
	import {
		initSemanticSearch,
		buildSemanticIndex,
		startSemanticProgressListener,
		stopSemanticProgressListener,
	} from '#lib/features/search/search.service.js';
	import { debug } from '#lib/utils/debug.js';
	import SettingItem from '#lib/core/settings/sections/SettingItem.svelte';

	let isDownloading = $state(false);
	let downloadError = $state('');
	let isDownloadingReranker = $state(false);
	let rerankerError = $state('');
	let rerankerAvailable = $state(false);

	async function refreshRerankerStatus() {
		const vaultPath = vaultStore.path;
		if (!vaultPath) return;
		try {
			rerankerAvailable = await call('is_reranker_model_available', { vaultPath });
		} catch (err) {
			debug('SEARCH', 'is_reranker_model_available failed:', err);
		}
	}

	$effect(() => {
		untrack(() => refreshRerankerStatus());
	});

	async function handleRerankerDownload() {
		const vaultPath = vaultStore.path;
		if (!vaultPath) return;
		isDownloadingReranker = true;
		rerankerError = '';
		try {
			await startSemanticProgressListener();
			await call('download_reranker_model', { vaultPath });
			rerankerAvailable = true;
		} catch (err) {
			debug('SEARCH', 'Reranker download failed:', err);
			rerankerError = String(err);
		} finally {
			isDownloadingReranker = false;
		}
	}

	async function handleToggle(enabled: boolean) {
		debug('SEARCH', `Semantic search toggle: ${enabled}`);
		settingsStore.updateSearch({ semanticSearchEnabled: enabled });

		if (enabled) {
			// Check if model exists, if not download it
			const vaultPath = vaultStore.path;
			if (!vaultPath) return;

			try {
				await startSemanticProgressListener();
				debug('SEARCH', 'Checking if model is available...');
				const available = await call('is_semantic_model_available', { vaultPath });
				debug('SEARCH', 'Model available:', available);
				if (!available) {
					isDownloading = true;
					downloadError = '';
					debug('SEARCH', 'Downloading model from HuggingFace...');
					await call('download_semantic_model', { vaultPath });
					debug('SEARCH', 'Model download complete');
				}
				// Initialize semantic search after download/check
				debug('SEARCH', 'Initializing semantic search...');
				await initSemanticSearch();
				if (searchStore.modelAvailable) {
					debug('SEARCH', 'Model loaded, starting semantic index build...');
					buildSemanticIndex();
				}
			} catch (err) {
				debug('SEARCH', 'Semantic search setup failed:', err);
				downloadError = String(err);
				settingsStore.updateSearch({ semanticSearchEnabled: false });
			} finally {
				isDownloading = false;
			}
		} else {
			debug('SEARCH', 'Semantic search disabled, stopping listener');
			stopSemanticProgressListener();
		}
	}
</script>

<div class="flex flex-col gap-2">
	<h2 class="mb-4 text-lg font-semibold">Search</h2>

	<SettingItem
		label="Semantic search"
		description="Enable AI-powered semantic search using BGE-M3 (~542MB download)"
	>
		<Switch
			checked={settingsStore.search.semanticSearchEnabled}
			disabled={isDownloading}
			onCheckedChange={handleToggle}
		/>
	</SettingItem>

	{#if isDownloading}
		<div class="flex items-center gap-2 px-4 text-meta text-muted-foreground">
			<Loader2Icon class="size-3 animate-spin" />
			<span>
				{searchStore.semanticProgress?.message ?? 'Downloading model...'}
			</span>
		</div>
	{/if}

	{#if downloadError}
		<p class="px-4 text-meta text-destructive">{downloadError}</p>
	{/if}

	{#if settingsStore.search.semanticSearchEnabled && searchStore.semanticStats}
		<div class="px-4 text-meta text-muted-foreground">
			Model loaded · {searchStore.semanticStats.totalChunks} chunks indexed
			from {searchStore.semanticStats.totalSources} files
		</div>
	{/if}

	{#if settingsStore.search.semanticSearchEnabled}
		<SettingItem
			label="Reranker (jina-reranker-v2-base-multilingual)"
			description="Cross-encoder rerank for higher top-K precision (~280MB extra download, roughly 2 to 3 s per query on CPU, CC-BY-NC-4.0 license). Auto-used by semantic search once downloaded."
		>
			{#if rerankerAvailable}
				<span class="text-meta text-muted-foreground">Installed</span>
			{:else}
				<Button variant="outline" size="sm" disabled={isDownloadingReranker} onclick={handleRerankerDownload}>
					{isDownloadingReranker ? 'Downloading…' : 'Download'}
				</Button>
			{/if}
		</SettingItem>

		{#if isDownloadingReranker}
			<div class="flex items-center gap-2 px-4 text-meta text-muted-foreground">
				<Loader2Icon class="size-3 animate-spin" />
				<span>
					{searchStore.semanticProgress?.message ?? 'Downloading reranker...'}
				</span>
			</div>
		{/if}

		{#if rerankerError}
			<p class="px-4 text-meta text-destructive">{rerankerError}</p>
		{/if}
	{/if}
</div>
