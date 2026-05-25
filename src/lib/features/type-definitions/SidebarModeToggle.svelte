<script lang="ts">
	import * as Tooltip from '$lib/components/ui/tooltip';
	import { Button } from '$lib/components/ui/button';
	import FolderTree from 'lucide-svelte/icons/folder-tree';
	import LayoutGrid from 'lucide-svelte/icons/layout-grid';
	import Calendar from 'lucide-svelte/icons/calendar';
	import { settingsStore } from '$lib/core/settings/settings.store.svelte';
	import { saveSettings } from '$lib/core/settings/settings.service';
	import { vaultStore } from '$lib/core/vault/vault.store.svelte';
	import type { SidebarMode } from '$lib/core/settings/settings.types';

	const MODES: SidebarMode[] = ['files', 'types', 'calendar'];

	function toggleMode() {
		const current = settingsStore.layout.sidebarMode;
		const idx = MODES.indexOf(current);
		const next = MODES[(idx + 1) % MODES.length];
		settingsStore.updateLayout({ sidebarMode: next });
		if (vaultStore.path) saveSettings(vaultStore.path).catch((err) => { console.error('saveSettings failed:', err); });
	}

	let mode = $derived(settingsStore.layout.sidebarMode);
	let tooltipLabel = $derived(
		mode === 'files' ? 'Type view' : mode === 'types' ? 'Calendar' : 'File explorer'
	);
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
				{#if mode === 'types'}
					<FolderTree class="size-3.5" />
				{:else if mode === 'calendar'}
					<Calendar class="size-3.5" />
				{:else}
					<LayoutGrid class="size-3.5" />
				{/if}
			</Button>
		{/snippet}
	</Tooltip.Trigger>
	<Tooltip.Content>{tooltipLabel}</Tooltip.Content>
</Tooltip.Root>
