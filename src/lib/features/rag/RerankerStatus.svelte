<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { invoke } from '@tauri-apps/api/core';
	import { listen, type UnlistenFn } from '@tauri-apps/api/event';
	import DownloadIcon from '@lucide/svelte/icons/download';
	import SparklesIcon from '@lucide/svelte/icons/sparkles';
	import LoaderIcon from '@lucide/svelte/icons/loader-2';
	import { vaultStore } from '$lib/core/vault/vault.store.svelte';
	import { settingsStore } from '$lib/core/settings/settings.store.svelte';
	import type { RerankerProgress } from '$lib/features/rag/rag.types';

	let available = $state<boolean | null>(null);
	let downloading = $state(false);
	let progress = $state<number>(0);
	let unlisten: UnlistenFn | null = null;

	async function refresh() {
		const path = vaultStore.path;
		if (!path) {
			available = null;
			return;
		}
		try {
			available = await invoke<boolean>('is_reranker_model_available', { vaultPath: path });
		} catch {
			available = null;
		}
	}

	onMount(async () => {
		await refresh();
		unlisten = await listen<RerankerProgress>('rag-reranker-progress', (event) => {
			downloading = true;
			progress = event.payload.current;
		});
	});

	onDestroy(() => {
		if (unlisten) {
			unlisten();
			unlisten = null;
		}
	});

	// Re-check availability whenever the chat panel toggles on. Cheap (one
	// `fs::exists`) and avoids stale state after a download finishes mid-session.
	$effect(() => {
		const visible = settingsStore.layout.ragChatVisible;
		if (visible) {
			refresh();
		}
	});

	async function handleDownload() {
		const path = vaultStore.path;
		if (!path || downloading) return;
		downloading = true;
		progress = 0;
		try {
			await invoke('rag_download_reranker', { vaultPath: path });
			await refresh();
		} catch {
			// Errors are visible to the user via the lack of a "ready" state;
			// the toast/error surface lives in the chat panel.
		} finally {
			downloading = false;
			progress = 0;
		}
	}
</script>

{#if settingsStore.layout.ragChatVisible && vaultStore.isOpen}
	{#if downloading}
		<span class="flex items-center gap-1 text-muted-foreground" title="Downloading reranker model">
			<LoaderIcon class="size-3 animate-spin" />
			Reranker {progress}%
		</span>
	{:else if available === false}
		<button
			type="button"
			class="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
			title="Download the reranker model to enable RAG chat"
			onclick={handleDownload}
		>
			<DownloadIcon class="size-3" />
			Reranker
		</button>
	{:else if available === true}
		<span class="flex items-center gap-1 text-muted-foreground" title="Reranker model ready">
			<SparklesIcon class="size-3" />
		</span>
	{/if}
{/if}
