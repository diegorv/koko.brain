<script lang="ts">
	import { onMount, untrack } from 'svelte';
	import { invoke } from '@tauri-apps/api/core';
	import BrainIcon from '@lucide/svelte/icons/brain';
	import LoaderIcon from '@lucide/svelte/icons/loader';
	import BrainCircuitIcon from '@lucide/svelte/icons/brain-circuit';
	import { editorStore } from '$lib/core/editor/editor.store.svelte';
	import { isVirtualTab } from '$lib/core/editor/editor.logic';
	import { addAfterSaveObserver } from '$lib/core/editor/editor.hooks';
	import { vaultStore } from '$lib/core/vault/vault.store.svelte';
	import { searchStore } from '$lib/features/search/search.store.svelte';
	import { settingsStore } from '$lib/core/settings/settings.store.svelte';
	import {
		toVaultRelativePath,
		isMarkdownPath,
		resolveStatusLabel,
		type SemanticFileStatus
	} from './semantic-index-status.logic';

	let status = $state<SemanticFileStatus | null>(null);
	let saveBump = $state(0);

	onMount(() => addAfterSaveObserver((filePath) => {
		if (filePath === editorStore.activeTab?.path) {
			saveBump++;
		}
	}));

	$effect(() => {
		const tab = editorStore.activeTab;
		const path = tab && !isVirtualTab(tab) ? tab.path : null;
		const relative = toVaultRelativePath(path, vaultStore.path);
		// Track saveBump + semanticStats so the status refreshes after a save or
		// a full rebuild without watching the per-tab content on every keystroke.
		void saveBump;
		void searchStore.semanticStats;

		if (!relative || !isMarkdownPath(relative)) {
			untrack(() => { status = null; });
			return;
		}

		let cancelled = false;
		invoke<SemanticFileStatus>('get_semantic_file_status', { filePath: relative })
			.then((next) => {
				if (!cancelled) untrack(() => { status = next; });
			})
			.catch(() => {
				if (!cancelled) untrack(() => { status = null; });
			});

		return () => { cancelled = true; };
	});

	let label = $derived(resolveStatusLabel(status));
</script>

{#if settingsStore.search.semanticSearchEnabled && label}
	<span class="flex items-center gap-1 text-muted-foreground" title={label.text}>
		{#if label.kind === 'indexed'}
			<BrainIcon class="size-3" />
		{:else if label.kind === 'loading'}
			<LoaderIcon class="size-3 animate-spin opacity-60" />
		{:else}
			<BrainCircuitIcon class="size-3 opacity-60" />
		{/if}
		{label.text}
	</span>
{/if}
