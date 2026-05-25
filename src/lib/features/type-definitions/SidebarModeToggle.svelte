<script lang="ts">
	import FolderTree from 'lucide-svelte/icons/folder-tree';
	import LayoutGrid from 'lucide-svelte/icons/layout-grid';
	import { settingsStore } from '$lib/core/settings/settings.store.svelte';
	import { saveSettings } from '$lib/core/settings/settings.service';
	import { vaultStore } from '$lib/core/vault/vault.store.svelte';

	function toggleMode() {
		const next = settingsStore.layout.sidebarMode === 'files' ? 'types' : 'files';
		settingsStore.updateLayout({ sidebarMode: next });
		if (vaultStore.path) saveSettings(vaultStore.path).catch(() => {});
	}

	let isTypesMode = $derived(settingsStore.layout.sidebarMode === 'types');
</script>

<button
	class="p-1 rounded-md hover:bg-accent transition-colors cursor-pointer"
	onclick={toggleMode}
	title={isTypesMode ? 'Switch to file explorer' : 'Switch to type view'}
>
	{#if isTypesMode}
		<FolderTree class="size-3.5 text-muted-foreground" />
	{:else}
		<LayoutGrid class="size-3.5 text-muted-foreground" />
	{/if}
</button>
