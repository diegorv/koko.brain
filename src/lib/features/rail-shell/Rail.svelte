<script lang="ts">
	import type { Component } from 'svelte';
	import Archive from '@lucide/svelte/icons/archive';
	import Folder from '@lucide/svelte/icons/folder';
	import Inbox from '@lucide/svelte/icons/inbox';
	import Layers from '@lucide/svelte/icons/layers';
	import Search from '@lucide/svelte/icons/search';
	import Star from '@lucide/svelte/icons/star';
	import Sun from '@lucide/svelte/icons/sun';
	import { vaultStore } from '#lib/core/vault/vault.store.svelte.js';
	import { settingsStore } from '#lib/core/settings/settings.store.svelte.js';
	import { typeDefinitionsStore } from '#lib/features/type-definitions/type-definitions.store.svelte.js';
	import { excludeSystemFolder } from '#lib/features/type-definitions/type-sidebar.logic.js';
	import { getInboxCount } from '#lib/features/type-definitions/inbox-workflow.logic.js';
	import { railRegistryStore } from './rail-registry.store.svelte';

	interface Props {
		/** Key of the highlighted rail item */
		activeItem: string;
		/** Called with the picked item's key; `restoreRailItem` in lens.logic.ts maps it to its lens */
		onSelect: (item: string) => void;
	}

	let { activeItem, onSelect }: Props = $props();

	// Same input as the dock badge in AppShell, so both show the same number.
	let inboxCount = $derived.by(() => {
		void typeDefinitionsStore.entriesVersion;
		return getInboxCount(
			excludeSystemFolder(typeDefinitionsStore.entries, vaultStore.path, settingsStore.templates.systemFolder),
		);
	});

	interface RailItem {
		key: string;
		label: string;
		icon: Component;
	}

	const items: RailItem[] = [
		{ key: 'search', label: 'Search', icon: Search },
		{ key: 'inbox', label: 'Inbox', icon: Inbox },
		{ key: 'today', label: 'Today', icon: Sun },
		{ key: 'favorites', label: 'Favorites', icon: Star },
	];
	/** The items that open a navigator, below the divider: Types, the navigators plugins registered (Calendar), Files. */
	let navigatorItems = $derived<RailItem[]>([
		{ key: 'types', label: 'Types', icon: Layers },
		...railRegistryStore.navigators.map((n) => ({ key: n.id, label: n.label, icon: n.icon })),
		{ key: 'files', label: 'Files', icon: Folder },
	]);
	/** Pinned to the bottom of the rail, below the flexible gap. */
	const bottomItems: RailItem[] = [{ key: 'archive', label: 'Archive', icon: Archive }];
</script>

<nav
	aria-label="Rail"
	class="flex w-12 shrink-0 flex-col items-center gap-1 border-r border-file-explorer-border bg-background"
	data-rail
>
	<!-- Room for the macOS traffic lights (titleBarStyle Overlay), and a handle to drag the window. -->
	<div class="h-10 w-full shrink-0" data-tauri-drag-region></div>
	{#each items as item (item.key)}
		{@render railButton(item)}
	{/each}
	<div class="my-1 h-px w-6 bg-file-explorer-border" data-rail-divider></div>
	{#each navigatorItems as item (item.key)}
		{@render railButton(item)}
	{/each}
	<div class="mt-auto flex flex-col items-center gap-1 pb-2" data-rail-bottom>
		{#each bottomItems as item (item.key)}
			{@render railButton(item)}
		{/each}
	</div>
</nav>

{#snippet railButton(item: RailItem)}
	{@const active = item.key === activeItem}
	<button
		class="relative rounded-md p-2 cursor-default {active
			? 'bg-file-explorer-primary/25 text-file-explorer-primary'
			: 'text-file-explorer-fg/70 hover:bg-file-explorer-accent/60 hover:text-file-explorer-fg'}"
		title={item.label}
		aria-label={item.label}
		aria-current={active ? 'page' : undefined}
		data-rail-item={item.key}
		onclick={() => onSelect(item.key)}
	>
		<item.icon class="size-4" />
		{#if item.key === 'inbox' && inboxCount > 0}
			<span
				class="absolute -top-0.5 -right-0.5 rounded-full bg-primary px-1 text-[10px] leading-[14px] tabular-nums text-primary-foreground"
				data-rail-badge
			>{inboxCount}</span>
		{/if}
	</button>
{/snippet}
