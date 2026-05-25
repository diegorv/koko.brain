<script lang="ts">
	import * as Tooltip from '$lib/components/ui/tooltip';
	import { Button } from '$lib/components/ui/button';
	import FolderTree from 'lucide-svelte/icons/folder-tree';
	import LayoutGrid from 'lucide-svelte/icons/layout-grid';
	import { settingsStore } from '$lib/core/settings/settings.store.svelte';
	import { saveSettings } from '$lib/core/settings/settings.service';
	import { vaultStore } from '$lib/core/vault/vault.store.svelte';

	function toggleMode() {
		const next = settingsStore.layout.sidebarMode === 'files' ? 'types' : 'files';
		settingsStore.updateLayout({ sidebarMode: next });
		if (vaultStore.path) saveSettings(vaultStore.path).catch((err) => { console.error('saveSettings failed:', err); });
	}

	let isTypesMode = $derived(settingsStore.layout.sidebarMode === 'types');
</script>

<Tooltip.Root>
	<Tooltip.Trigger>
		{#snippet child({ props })}
			<Button
				{...props}
				variant="ghost"
				size="icon-sm"
				class="size-6"
				onclick={toggleMode}
			>
				{#if isTypesMode}
					<FolderTree class="size-3.5" />
				{:else}
					<LayoutGrid class="size-3.5" />
				{/if}
			</Button>
		{/snippet}
	</Tooltip.Trigger>
	<Tooltip.Content>{isTypesMode ? 'File explorer' : 'Type view'}</Tooltip.Content>
</Tooltip.Root>
