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

	function switchTo(target: SidebarMode) {
		settingsStore.updateLayout({ sidebarMode: target });
		if (vaultStore.path) saveSettings(vaultStore.path).catch((err) => { console.error('saveSettings failed:', err); });
	}

	let mode = $derived(settingsStore.layout.sidebarMode);
</script>

<div class="flex items-center gap-0.5">
	<Tooltip.Root>
		<Tooltip.Trigger>
			{#snippet child({ props })}
				<Button
					{...props}
					variant="ghost"
					size="icon-sm"
					class="size-6"
					onclick={() => switchTo('files')}
				>
					<FolderTree class="size-3.5 {mode === 'files' ? 'text-primary' : ''}" />
				</Button>
			{/snippet}
		</Tooltip.Trigger>
		<Tooltip.Content>File explorer</Tooltip.Content>
	</Tooltip.Root>

	<Tooltip.Root>
		<Tooltip.Trigger>
			{#snippet child({ props })}
				<Button
					{...props}
					variant="ghost"
					size="icon-sm"
					class="size-6"
					onclick={() => switchTo('types')}
				>
					<LayoutGrid class="size-3.5 {mode === 'types' ? 'text-primary' : ''}" />
				</Button>
			{/snippet}
		</Tooltip.Trigger>
		<Tooltip.Content>Type view</Tooltip.Content>
	</Tooltip.Root>

	<Tooltip.Root>
		<Tooltip.Trigger>
			{#snippet child({ props })}
				<Button
					{...props}
					variant="ghost"
					size="icon-sm"
					class="size-6"
					onclick={() => switchTo('calendar')}
				>
					<Calendar class="size-3.5 {mode === 'calendar' ? 'text-primary' : ''}" />
				</Button>
			{/snippet}
		</Tooltip.Trigger>
		<Tooltip.Content>Calendar</Tooltip.Content>
	</Tooltip.Root>
</div>
