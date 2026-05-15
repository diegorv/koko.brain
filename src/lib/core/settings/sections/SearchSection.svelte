<script lang="ts">
	import { invoke } from '$lib/api';
	import { Switch } from '$lib/components/ui/switch';
	import Loader2Icon from '@lucide/svelte/icons/loader-circle';
	import { settingsStore } from '../settings.store.svelte';
	import { vaultStore } from '$lib/core/vault/vault.store.svelte';
	import { searchStore } from '$lib/features/search/search.store.svelte';
	import {
		initSemanticSearch,
		buildSemanticIndex,
		startSemanticProgressListener,
		stopSemanticProgressListener,
	} from '$lib/features/search/search.service';
	import { debug } from '$lib/utils/debug';
	import SettingItem from './SettingItem.svelte';

	let { onchange }: { onchange: () => void } = $props();

	let isDownloading = $state(false);
	let downloadError = $state('');
	let isDownloadingReranker = $state(false);
	let rerankerError = $state('');
	let rerankerAvailable = $state(false);

	async function refreshRerankerStatus() {
		const vaultPath = vaultStore.path;
		if (!vaultPath) return;
		try {
			rerankerAvailable = await invoke<boolean>('is_reranker_model_available', { vaultPath });
		} catch (err) {
			debug('SEARCH', 'is_reranker_model_available failed:', err);
		}
	}

	$effect(() => {
		refreshRerankerStatus();
	});

	async function handleRerankerDownload() {
		const vaultPath = vaultStore.path;
		if (!vaultPath) return;
		isDownloadingReranker = true;
		rerankerError = '';
		try {
			await startSemanticProgressListener();
			await invoke('download_reranker_model', { vaultPath });
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
		onchange();

		if (enabled) {
			// Check if model exists, if not download it
			const vaultPath = vaultStore.path;
			if (!vaultPath) return;

			try {
				await startSemanticProgressListener();
				debug('SEARCH', 'Checking if model is available...');
				const available = await invoke<boolean>('is_semantic_model_available', { vaultPath });
				debug('SEARCH', 'Model available:', available);
				if (!available) {
					isDownloading = true;
					downloadError = '';
					debug('SEARCH', 'Downloading model from HuggingFace...');
					await invoke('download_semantic_model', { vaultPath });
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
				onchange();
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
		<div class="flex items-center gap-2 px-4 text-xs text-muted-foreground">
			<Loader2Icon class="size-3 animate-spin" />
			<span>
				{searchStore.semanticProgress?.message ?? 'Downloading model...'}
			</span>
		</div>
	{/if}

	{#if downloadError}
		<p class="px-4 text-xs text-destructive">{downloadError}</p>
	{/if}

	{#if settingsStore.search.semanticSearchEnabled && searchStore.semanticStats}
		<div class="px-4 text-xs text-muted-foreground">
			Model loaded · {searchStore.semanticStats.totalChunks} chunks indexed
			from {searchStore.semanticStats.totalSources} files
		</div>
	{/if}

	{#if settingsStore.search.semanticSearchEnabled}
		<SettingItem
			label="Reranker (BGE-reranker-v2-m3)"
			description="Cross-encoder rerank for higher top-K precision (~571MB extra download, ~500ms per query on CPU). Auto-used by semantic search once downloaded."
		>
			{#if rerankerAvailable}
				<span class="text-xs text-muted-foreground">Installed</span>
			{:else}
				<button
					type="button"
					class="rounded border px-3 py-1 text-xs disabled:opacity-50"
					disabled={isDownloadingReranker}
					onclick={handleRerankerDownload}
				>
					{isDownloadingReranker ? 'Downloading…' : 'Download'}
				</button>
			{/if}
		</SettingItem>

		{#if isDownloadingReranker}
			<div class="flex items-center gap-2 px-4 text-xs text-muted-foreground">
				<Loader2Icon class="size-3 animate-spin" />
				<span>
					{searchStore.semanticProgress?.message ?? 'Downloading reranker...'}
				</span>
			</div>
		{/if}

		{#if rerankerError}
			<p class="px-4 text-xs text-destructive">{rerankerError}</p>
		{/if}
	{/if}
</div>
